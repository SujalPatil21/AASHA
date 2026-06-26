const fs = require('fs');
const path = require('path');

const API_BASE = process.env.API_BASE_URL || 'https://aasha-production-1974.up.railway.app';

function generateRandomRecord(idNum) {
  return {
    id: `bench-sync-${idNum}-${Math.random().toString(36).slice(2, 9)}`,
    patientName: `Sync Patient ${idNum}`,
    age: 20 + (idNum % 60),
    phone: `9${Math.floor(Math.random() * 900000000) + 100000000}`,
    patientType: ['ADULT', 'CHILD', 'PREGNANT', 'ELDER'][idNum % 4],
    rawText: 'Fever and headache for 2 days',
    language: 'en',
    structured: { feverDays: 2, swelling: false, highBP: false, bleeding: false, breathingIssue: false },
    riskLevel: 'Low',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    sourceDevice: 'node-sync-bench'
  };
}

async function runSingleSyncAttempt(queueSize) {
  const queue = [];
  for (let i = 1; i <= queueSize; i++) {
    queue.push(generateRandomRecord(i));
  }

  const payloadString = JSON.stringify(queue);
  const payloadSize = Buffer.byteLength(payloadString);
  const start = performance.now();

  try {
    const response = await fetch(`${API_BASE}/api/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: payloadString
    });

    const duration = performance.now() - start;

    if (!response.ok) {
      throw new Error(`Sync POST failed: status ${response.status}`);
    }

    const data = await response.json();
    const recordsPerSec = Math.round((queueSize / (duration / 1000)));

    return {
      durationMs: parseFloat(duration.toFixed(2)),
      payloadSizeKb: parseFloat((payloadSize / 1024).toFixed(2)),
      recordsPerSec,
      synced: data.synced,
      duplicates: data.duplicates
    };
  } catch (error) {
    console.error(`Sync attempt failed for size ${queueSize}:`, error.message);
    return null;
  }
}

function calculateStats(values) {
  const n = values.length;
  if (n === 0) return { mean: 0, stddev: 0, variance: 0, variancePct: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
  const stddev = Math.sqrt(variance);
  const variancePct = mean > 0 ? (stddev / mean) * 100 : 0;
  return { mean, stddev, variance, variancePct };
}

async function runSyncBenchmark(queueSize) {
  console.log(`\n==========================================`);
  console.log(`Starting Offline Sync Benchmark for ${queueSize} records`);
  console.log(`==========================================`);
  
  let attempts = [];
  let iterations = 3;
  
  for (let i = 1; i <= iterations; i++) {
    console.log(`[Iteration ${i}/${iterations}] Simulating reconnect and batch sync...`);
    const res = await runSingleSyncAttempt(queueSize);
    if (res) {
      console.log(`  -> Duration: ${res.durationMs}ms, Throughput: ${res.recordsPerSec} rec/sec, Synced: ${res.synced}`);
      attempts.push(res);
    } else {
      console.log(`  -> Iteration failed.`);
    }
    // Pause between runs
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Calculate statistics for duration
  let durations = attempts.map(a => a.durationMs);
  let stats = calculateStats(durations);
  
  // If variance > 5%, rerun up to 2 more times to get stable numbers
  let maxRetries = 2;
  while (stats.variancePct > 5.0 && maxRetries > 0) {
    console.log(`\n[WARNING] Duration variance is high (${stats.variancePct.toFixed(2)}% > 5%). Rerunning extra iteration...`);
    const res = await runSingleSyncAttempt(queueSize);
    if (res) {
      console.log(`  -> Extra Run: ${res.durationMs}ms`);
      attempts.push(res);
      durations = attempts.map(a => a.durationMs);
      stats = calculateStats(durations);
    }
    maxRetries--;
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`\nStats for scale ${queueSize}:`);
  console.log(`- Average Latency: ${stats.mean.toFixed(2)} ms`);
  console.log(`- Std Dev: ${stats.stddev.toFixed(2)} ms`);
  console.log(`- Variance: ${stats.variance.toFixed(2)} ms^2 (${stats.variancePct.toFixed(2)}%)`);
  
  // Calculate records per second average
  const avgRecsPerSec = Math.round(queueSize / (stats.mean / 1000));
  const avgPayloadSizeKb = attempts[0] ? attempts[0].payloadSizeKb : 0;
  
  const result = {
    queueSize,
    payloadSizeKb: avgPayloadSizeKb,
    durationMsAvg: parseFloat(stats.mean.toFixed(2)),
    durationMsStdDev: parseFloat(stats.stddev.toFixed(2)),
    durationMsVariancePct: parseFloat(stats.variancePct.toFixed(2)),
    recordsPerSecAvg: avgRecsPerSec,
    runs: attempts,
    timestamp: new Date().toISOString()
  };

  const reportPath = path.join(__dirname, '..', 'reports', `sync_benchmark_${queueSize}_records_${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));
  console.log(`Saved consolidated report to ${reportPath}`);
  
  return result;
}

async function runAll() {
  console.log('=== STARTING OFFLINE SYNC BENCHMARK RUNNER ===');
  console.log(`Target backend: ${API_BASE}`);
  const sizes = [100, 500, 1000, 5000];
  const results = [];

  for (const size of sizes) {
    const res = await runSyncBenchmark(size);
    if (res) {
      results.push({
        'Queue Size': res.queueSize,
        'Avg Duration (ms)': res.durationMsAvg,
        'Std Dev (ms)': res.durationMsStdDev,
        'Variance (%)': res.durationMsVariancePct,
        'Avg Recs/sec': res.recordsPerSecAvg,
        'Payload (KB)': res.payloadSizeKb
      });
    }
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  console.log('\n=== SYNC BENCHMARKS COMPLETED ===');
  console.table(results);
}

// Allow importing or running directly
if (require.main === module) {
  runAll().catch(console.error);
} else {
  module.exports = { runSyncBenchmark };
}
