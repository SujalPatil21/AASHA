const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const API_BASE = 'https://aasha-production-1974.up.railway.app';
const K6_BIN = 'C:\\Program Files\\k6\\k6.exe';
const REPORTS_DIR = path.join(__dirname, '..', 'reports');

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// Helper to sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Statistical helpers
function calculateStats(values) {
  const n = values.length;
  if (n === 0) return { mean: 0, stddev: 0, variance: 0, variancePct: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
  const stddev = Math.sqrt(variance);
  const variancePct = mean > 0 ? (stddev / mean) * 100 : 0;
  return { mean, stddev, variance, variancePct };
}

// 1. Parse Prometheus metrics text format
function parsePrometheus(text) {
  const metrics = {};
  const lines = text.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('#') || !line.trim()) continue;
    
    // Split into metric name/labels and value
    const match = line.match(/^([a-zA-Z_0-9]+(?:\{.*\})?)\s+([0-9.e+-]+)$/);
    if (!match) continue;
    
    const rawKey = match[1];
    const val = parseFloat(match[2]);
    
    // Extract base metric name
    const keyMatch = rawKey.match(/^([a-zA-Z_0-9]+)/);
    if (!keyMatch) continue;
    const baseKey = keyMatch[1];
    
    if (!metrics[baseKey]) {
      metrics[baseKey] = [];
    }
    
    metrics[baseKey].push({
      raw: rawKey,
      value: val
    });
  }
  
  // Extract specific telemetry fields
  const getVal = (key, rawSubstr = null) => {
    const list = metrics[key];
    if (!list) return 0;
    if (rawSubstr) {
      const found = list.find(item => item.raw.includes(rawSubstr));
      return found ? found.value : 0;
    }
    return list[0] ? list[0].value : 0;
  };
  
  // Sum values matching a key
  const sumVal = (key, rawSubstr = null) => {
    const list = metrics[key];
    if (!list) return 0;
    let sum = 0;
    for (const item of list) {
      if (!rawSubstr || item.raw.includes(rawSubstr)) {
        sum += item.value;
      }
    }
    return sum;
  };

  return {
    cpuProcess: getVal('process_cpu_usage') * 100, // percentage
    cpuSystem: getVal('system_cpu_usage') * 100, // percentage
    heapUsedMb: sumVal('jvm_memory_used_bytes', 'area="heap"') / (1024 * 1024),
    heapMaxMb: sumVal('jvm_memory_max_bytes', 'area="heap"') / (1024 * 1024),
    threadsLive: getVal('jvm_threads_live_threads'),
    gcPauseMax: getVal('jvm_gc_pause_seconds_max'),
    gcPauseCount: sumVal('jvm_gc_pause_seconds_count'),
    gcPauseTimeSum: sumVal('jvm_gc_pause_seconds_sum'),
    hikariActive: getVal('hikaricp_connections_active'),
    hikariIdle: getVal('hikaricp_connections_idle'),
    hikariTotal: getVal('hikaricp_connections'),
    hibernateStatements: getVal('hibernate_statements_execution_seconds_count'),
    httpRequestsTotal: sumVal('http_server_requests_seconds_count')
  };
}

// Fetch prometheus telemetry snapshot
async function fetchTelemetry() {
  try {
    const res = await fetch(`${API_BASE}/actuator/prometheus`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    return parsePrometheus(text);
  } catch (err) {
    console.error(`Telemetry collection failed: ${err.message}`);
    return null;
  }
}

// Phase 1 Readiness Check
async function runReadinessCheck() {
  console.log('=== PHASE 1: Readiness Check ===');
  
  try {
    console.log(`Checking reachability of ${API_BASE}/api/healthz...`);
    const healthRes = await fetch(`${API_BASE}/api/healthz`);
    if (!healthRes.ok) {
      throw new Error(`Health endpoint returned status ${healthRes.status}`);
    }
    const health = await healthRes.json();
    if (health.status !== 'ok') {
      throw new Error(`Health status is not ok: ${JSON.stringify(health)}`);
    }
    console.log('✓ Health status is OK.');
    
    console.log('Checking database connection & records endpoint...');
    const recordsRes = await fetch(`${API_BASE}/api/records?limit=1`);
    if (!recordsRes.ok) {
      throw new Error(`Records API returned status ${recordsRes.status}`);
    }
    const records = await recordsRes.json();
    console.log(`✓ Records API is operational. Current DB record count: ${records.count}`);
    
    console.log('Checking Actuator / Prometheus exposure...');
    const promRes = await fetch(`${API_BASE}/actuator/prometheus`);
    if (!promRes.ok) {
      throw new Error(`Prometheus endpoint returned status ${promRes.status}`);
    }
    console.log('✓ Actuator metrics are fully operational.');
    console.log('Readiness Check Completed Successfully!\n');
    return true;
  } catch (err) {
    console.error(`\n❌ Readiness Check Failed: ${err.message}`);
    console.error('Aborting benchmarks.');
    process.exit(1);
  }
}

// Phase 2 Dataset Preparation
async function getRecordCount() {
  const res = await fetch(`${API_BASE}/api/records?limit=1`);
  const data = await res.json();
  return data.count;
}

async function seedDatabase(targetCount) {
  console.log(`=== PHASE 2: Dataset Seeding to ${targetCount} records ===`);
  const currentCount = await getRecordCount();
  console.log(`Current record count in production DB: ${currentCount}`);
  
  if (currentCount >= targetCount) {
    console.log(`Production DB already has ${currentCount} records (>= requested ${targetCount}). Skipping seed.`);
    return;
  }
  
  const needed = targetCount - currentCount;
  console.log(`Seeding ${needed} records to reach target count of ${targetCount}...`);
  
  const start = performance.now();
  const res = await fetch(`${API_BASE}/api/benchmark/generate?count=${needed}`, {
    method: 'POST'
  });
  
  if (!res.ok) {
    throw new Error(`Database seeding failed: status ${res.status}`);
  }
  
  const result = await res.json();
  const elapsed = (performance.now() - start) / 1000;
  console.log(`✓ Seeding complete! Generated ${result.count} records in ${elapsed.toFixed(2)}s.`);
  
  const finalCount = await getRecordCount();
  console.log(`Confirmed production DB count: ${finalCount} records.\n`);
}

// Run single k6 load test and collect telemetry
async function runK6Benchmark(scriptPath, scale, runIndex) {
  const scriptName = path.basename(scriptPath, '.js');
  const reportPath = path.join(REPORTS_DIR, `k6_${scriptName}_${scale}_run${runIndex}_${Date.now()}.json`);
  
  console.log(`\n---> Running load test: ${scriptName} | Scale: ${scale} | Iteration: ${runIndex}/3`);
  
  // Collect pre-test telemetry
  const preTelemetry = await fetchTelemetry();
  
  // Start telemetry polling in background
  const telemetryHistory = [];
  const telemetryInterval = setInterval(async () => {
    const metrics = await fetchTelemetry();
    if (metrics) telemetryHistory.push(metrics);
  }, 2000);
  
  // Run k6
  const cmdArgs = [
    'run',
    scriptPath,
    '-e', `API_BASE_URL=${API_BASE}`,
    '-e', `WORKLOAD_SCALE=${scale}`,
    '--summary-trend-stats=avg,min,med,max,p(90),p(95),p(99)',
    `--summary-export=${reportPath}`
  ];
  
  return new Promise((resolve, reject) => {
    const k6Proc = spawn(K6_BIN, cmdArgs);
    
    let stdout = '';
    let stderr = '';
    
    k6Proc.stdout.on('data', (data) => { stdout += data; });
    k6Proc.stderr.on('data', (data) => { stderr += data; });
    
    k6Proc.on('close', async (code) => {
      clearInterval(telemetryInterval);
      
      if (code !== 0) {
        console.error(`k6 process exited with code ${code}`);
        console.error(stderr);
        return resolve(null);
      }
      
      // Collect post-test telemetry
      const postTelemetry = await fetchTelemetry();
      
      // Parse the exported JSON report
      try {
        const rawReport = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        
        // Calculate average system resource usage during run
        const avgCpu = telemetryHistory.reduce((sum, t) => sum + t.cpuProcess, 0) / (telemetryHistory.length || 1);
        const maxHeap = Math.max(...telemetryHistory.map(t => t.heapUsedMb), preTelemetry?.heapUsedMb || 0);
        const maxHikariActive = Math.max(...telemetryHistory.map(t => t.hikariActive), 0);
        const gcCount = (postTelemetry?.gcPauseCount || 0) - (preTelemetry?.gcPauseCount || 0);
        const gcPauseTime = (postTelemetry?.gcPauseTimeSum || 0) - (preTelemetry?.gcPauseTimeSum || 0);
        
        const summary = {
          throughput: rawReport.metrics.http_reqs.rate,
          avgLatency: rawReport.metrics.http_req_duration.avg,
          medianLatency: rawReport.metrics.http_req_duration.med,
          p95Latency: rawReport.metrics.http_req_duration['p(95)'],
          p99Latency: rawReport.metrics.http_req_duration['p(99)'] || rawReport.metrics.http_req_duration['p(95)'], // Fallback if p99 missing
          maxLatency: rawReport.metrics.http_req_duration.max,
          errorRate: rawReport.metrics.http_req_failed.value * 100, // percentage
          dataReceivedKb: rawReport.metrics.data_received.count / 1024,
          dataSentKb: rawReport.metrics.data_sent.count / 1024,
          telemetry: {
            avgCpuProcess: avgCpu,
            maxHeapUsedMb: maxHeap,
            maxHikariActive,
            gcCount,
            gcPauseTimeMs: gcPauseTime * 1000
          }
        };
        
        console.log(`   Result -> Throughput: ${summary.throughput.toFixed(1)} req/s, P95 Latency: ${summary.p95Latency.toFixed(2)}ms, Error Rate: ${summary.errorRate.toFixed(2)}%`);
        resolve(summary);
      } catch (err) {
        console.error(`Failed to parse k6 report or telemetry: ${err.message}`);
        resolve(null);
      }
    });
  });
}

// Run a complete load test combination 3 times and calculate statistical metrics
async function orchestrateLoadTest(scriptPath, scale) {
  let runs = [];
  
  for (let run = 1; run <= 3; run++) {
    const res = await runK6Benchmark(scriptPath, scale, run);
    if (res) runs.push(res);
    await sleep(3000); // cooldown between runs
  }
  
  if (runs.length === 0) {
    console.error(`All runs failed for script ${scriptPath} at scale ${scale}`);
    return null;
  }
  
  // Calculate variance of P95 latency
  let p95s = runs.map(r => r.p95Latency);
  let stats = calculateStats(p95s);
  
  // Rerun if variance > 5%
  let retries = 2;
  while (stats.variancePct > 5.0 && retries > 0) {
    console.log(`[WARNING] P95 Latency variance is high (${stats.variancePct.toFixed(2)}% > 5%). Rerunning extra iteration...`);
    const extraRun = await runK6Benchmark(scriptPath, scale, 4 - retries + 3);
    if (extraRun) {
      runs.push(extraRun);
      p95s = runs.map(r => r.p95Latency);
      stats = calculateStats(p95s);
    }
    retries--;
    await sleep(3000);
  }
  
  // Calculate averages across all stable runs
  const avgThroughput = runs.reduce((sum, r) => sum + r.throughput, 0) / runs.length;
  const avgLatency = runs.reduce((sum, r) => sum + r.avgLatency, 0) / runs.length;
  const avgMedLatency = runs.reduce((sum, r) => sum + r.medianLatency, 0) / runs.length;
  const avgP95Latency = stats.mean;
  const avgP99Latency = runs.reduce((sum, r) => sum + r.p99Latency, 0) / runs.length;
  const maxLatency = Math.max(...runs.map(r => r.maxLatency));
  const avgErrorRate = runs.reduce((sum, r) => sum + r.errorRate, 0) / runs.length;
  const dataRecKb = runs.reduce((sum, r) => sum + r.dataReceivedKb, 0) / runs.length;
  const dataSentKb = runs.reduce((sum, r) => sum + r.dataSentKb, 0) / runs.length;
  
  // Telemetry averages
  const telemetry = {
    avgCpuProcess: runs.reduce((sum, r) => sum + r.telemetry.avgCpuProcess, 0) / runs.length,
    maxHeapUsedMb: Math.max(...runs.map(r => r.telemetry.maxHeapUsedMb)),
    maxHikariActive: Math.max(...runs.map(r => r.telemetry.maxHikariActive)),
    gcCount: runs.reduce((sum, r) => sum + r.telemetry.gcCount, 0) / runs.length,
    gcPauseTimeMs: runs.reduce((sum, r) => sum + r.telemetry.gcPauseTimeMs, 0) / runs.length
  };
  
  const result = {
    script: path.basename(scriptPath, '.js'),
    scale,
    throughput: avgThroughput,
    latencyAvg: avgLatency,
    latencyMedian: avgMedLatency,
    latencyP95: avgP95Latency,
    latencyP99: avgP99Latency,
    latencyMax: maxLatency,
    errorRate: avgErrorRate,
    dataRecKb,
    dataSentKb,
    telemetry,
    variancePct: stats.variancePct,
    runsCount: runs.length,
    timestamp: new Date().toISOString()
  };
  
  const summaryPath = path.join(REPORTS_DIR, `summary_${result.script}_${scale}_${Date.now()}.json`);
  fs.writeFileSync(summaryPath, JSON.stringify(result, null, 2));
  
  return result;
}

// Phase 6 Lighthouse Audit
function runLighthouse() {
  console.log('\n=== PHASE 6: Running Lighthouse Audits ===');
  const targetUrl = 'https://aasha.pages.dev';
  const timestamp = Date.now();
  const htmlPath = path.join(REPORTS_DIR, `lighthouse_report_${timestamp}.html`);
  const jsonPath = path.join(REPORTS_DIR, `lighthouse_report_${timestamp}.json`);
  
  console.log(`Running Lighthouse against ${targetUrl}...`);
  try {
    const cmd = `npx -y lighthouse ${targetUrl} --output html --output json --output-path "${path.join(REPORTS_DIR, `lighthouse_report_${timestamp}`)}" --chrome-flags="--headless --no-sandbox"`;
    execSync(cmd, { stdio: 'inherit' });
    
    // Lighthouse CLI outputs report.report.html and report.report.json if we specify path prefix.
    // Let's check and rename them if necessary
    const rawHtml = path.join(REPORTS_DIR, `lighthouse_report_${timestamp}.report.html`);
    const rawJson = path.join(REPORTS_DIR, `lighthouse_report_${timestamp}.report.json`);
    
    if (fs.existsSync(rawHtml)) fs.renameSync(rawHtml, htmlPath);
    if (fs.existsSync(rawJson)) fs.renameSync(rawJson, jsonPath);
    
    console.log(`✓ Lighthouse report generated successfully:`);
    console.log(`  HTML: ${htmlPath}`);
    console.log(`  JSON: ${jsonPath}\n`);
  } catch (err) {
    console.error(`❌ Lighthouse failed: ${err.message}`);
  }
}

// Main execution orchestrator
async function main() {
  const args = process.argv.slice(2);
  const runAll = args.includes('--all') || args.length === 0;
  
  await runReadinessCheck();
  
  if (args.includes('--readiness')) {
    process.exit(0);
  }
  
  // Seeding phases & load testing execution
  if (runAll || args.includes('--run-rest')) {
    const k6Dir = path.join(__dirname, '..', 'k6');
    const scripts = [
      path.join(k6Dir, 'get-records.js'),
      path.join(k6Dir, 'create-record.js'),
      path.join(k6Dir, 'sync.js'),
      path.join(k6Dir, 'mixed-workload.js')
    ];
    const scales = ['scale_10', 'scale_50', 'scale_100', 'scale_250', 'scale_500'];
    
    const restSummaryResults = [];
    
    // Seed and run REST tests at 1,000 database records
    await seedDatabase(1000);
    console.log('\n=== PHASE 3: Executing load tests at 1,000 DB records ===');
    for (const scale of ['scale_10', 'scale_50']) {
      for (const script of [scripts[3]]) { // Run Mixed Workload at 1,000 records
        const res = await orchestrateLoadTest(script, scale);
        if (res) restSummaryResults.push({ ...res, dbScale: 1000 });
      }
    }
    
    // Seed and run REST tests at 10,000 database records
    await seedDatabase(10000);
    console.log('\n=== PHASE 3: Executing load tests at 10,000 DB records ===');
    for (const scale of ['scale_50', 'scale_100']) {
      for (const script of [scripts[3]]) { // Run Mixed Workload at 10,000 records
        const res = await orchestrateLoadTest(script, scale);
        if (res) restSummaryResults.push({ ...res, dbScale: 10000 });
      }
    }
    
    // Seed and run REST tests at 50,000 database records (Full scale stress)
    await seedDatabase(50000);
    console.log('\n=== PHASE 3: Executing FULL scale load tests at 50,000 DB records ===');
    
    // Execute all workloads at all scales under 50k DB size
    for (const scale of scales) {
      for (const script of scripts) {
        const res = await orchestrateLoadTest(script, scale);
        if (res) restSummaryResults.push({ ...res, dbScale: 50000 });
      }
    }
    
    // Run Stress workload at 50,000 DB records
    console.log('\n---> Running API stress test...');
    const stressRes = await orchestrateLoadTest(path.join(k6Dir, 'stress.js'), 'stress_profile');
    if (stressRes) restSummaryResults.push({ ...stressRes, dbScale: 50000 });
    
    // Save consolidated REST performance summary
    const restPath = path.join(REPORTS_DIR, `consolidated_rest_summary_${Date.now()}.json`);
    fs.writeFileSync(restPath, JSON.stringify(restSummaryResults, null, 2));
    console.log(`\nSaved consolidated REST benchmarks summary to ${restPath}`);
  }
  
  // Offline Sync Benchmarks
  if (runAll || args.includes('--run-sync')) {
    console.log('\n=== PHASE 4: Executing Offline Sync Benchmarks ===');
    try {
      execSync('node sync-bench.js', { stdio: 'inherit', cwd: __dirname });
    } catch (err) {
      console.error(`Offline sync benchmark failed: ${err.message}`);
    }
  }
  
  // Lighthouse Audits
  if (runAll || args.includes('--run-lighthouse')) {
    runLighthouse();
  }
  
  console.log('\n==========================================');
  console.log('BENCHMARK RUN COMPLETED SUCCESSFULY!');
  console.log('==========================================\n');
}

main().catch(err => {
  console.error(`Unhandled error during execution: ${err.message}`);
  process.exit(1);
});
