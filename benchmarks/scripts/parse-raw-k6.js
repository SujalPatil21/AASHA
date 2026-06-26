const fs = require('fs');
const path = require('path');

const REPORTS_DIR = path.resolve(__dirname, '..', 'reports');

function calculateStats(values) {
  const n = values.length;
  if (n === 0) return { mean: 0, stddev: 0, variance: 0, variancePct: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
  const stddev = Math.sqrt(variance);
  const variancePct = mean > 0 ? (stddev / mean) * 100 : 0;
  return { mean, stddev, variance, variancePct };
}

async function main() {
  const files = fs.readdirSync(REPORTS_DIR);
  const groups = {};

  // Group files by script and scale
  for (const file of files) {
    if (!file.startsWith('k6_') || !file.endsWith('.json')) continue;
    
    // Format: k6_script-name_scale_name_runX_timestamp.json
    const parts = file.split('_');
    if (parts.length < 5) continue;
    
    const script = parts[1];
    const scale = `${parts[2]}_${parts[3]}`;
    const run = parts[4];
    
    const groupKey = `${script}__${scale}`;
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    
    const filePath = path.join(REPORTS_DIR, file);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (data.metrics) {
        groups[groupKey].push(data);
      }
    } catch (err) {
      // Skip corrupt files
    }
  }

  const results = [];

  // Aggregate each group
  for (const [key, runs] of Object.entries(groups)) {
    const [script, scale] = key.split('__');
    
    const throughputs = runs.map(r => r.metrics.http_reqs.rate);
    const avgs = runs.map(r => r.metrics.http_req_duration.avg);
    const medians = runs.map(r => r.metrics.http_req_duration.med);
    const p95s = runs.map(r => r.metrics.http_req_duration['p(95)']);
    const p99s = runs.map(r => r.metrics.http_req_duration['p(99)'] || r.metrics.http_req_duration['p(95)']);
    const maxes = runs.map(r => r.metrics.http_req_duration.max);
    const errorRates = runs.map(r => r.metrics.http_req_failed.value * 100);
    const dataReceived = runs.map(r => r.metrics.data_received.count);
    const dataSent = runs.map(r => r.metrics.data_sent.count);

    const throughputStats = calculateStats(throughputs);
    const avgStats = calculateStats(avgs);
    const medianStats = calculateStats(medians);
    const p95Stats = calculateStats(p95s);
    const p99Stats = calculateStats(p99s);
    const errorStats = calculateStats(errorRates);

    results.push({
      script,
      scale,
      runsCount: runs.length,
      throughput: throughputStats.mean,
      latencyAvg: avgStats.mean,
      latencyMedian: medianStats.mean,
      latencyP95: p95Stats.mean,
      latencyP95StdDev: p95Stats.stddev,
      latencyP95VariancePct: p95Stats.variancePct,
      latencyP99: p99Stats.mean,
      latencyMax: Math.max(...maxes),
      errorRate: errorStats.mean,
      avgDataRecKb: (dataReceived.reduce((a, b) => a + b, 0) / dataReceived.length) / 1024,
      avgDataSentKb: (dataSent.reduce((a, b) => a + b, 0) / dataSent.length) / 1024
    });
  }

  // Sort by script and scale VUs
  const scaleVus = { 'scale_10': 10, 'scale_50': 50, 'scale_100': 100, 'scale_250': 250, 'scale_500': 500, 'stress_profile': 1000 };
  results.sort((a, b) => {
    if (a.script !== b.script) return a.script.localeCompare(b.script);
    return (scaleVus[a.scale] || 0) - (scaleVus[b.scale] || 0);
  });

  // Write consolidated file
  fs.writeFileSync(
    path.join(REPORTS_DIR, 'consolidated_k6_all_runs.json'),
    JSON.stringify(results, null, 2)
  );

  console.log('✓ Consolidated report saved to consolidated_k6_all_runs.json');
  console.log('\n### REST API BENCHMARK CONSOLIDATED RESULTS\n');
  console.log('| Script | Scale | Runs | Throughput (req/s) | Avg Latency (ms) | p95 Latency (ms) | p99 Latency (ms) | Error Rate (%) |');
  console.log('|---|---|---|---|---|---|---|---|');
  for (const r of results) {
    console.log(`| ${r.script} | ${r.scale} | ${r.runsCount} | ${r.throughput.toFixed(1)} | ${r.latencyAvg.toFixed(1)} | ${r.latencyP95.toFixed(1)} | ${r.latencyP99.toFixed(1)} | ${r.errorRate.toFixed(2)}% |`);
  }
}

main().catch(console.error);
