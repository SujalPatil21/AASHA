const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BENCHMARK_HTML_PATH = `file:///${path.resolve(__dirname, '..', 'indexeddb', 'benchmark-auto.html').replace(/\\/g, '/')}`;
const REPORTS_DIR = path.resolve(__dirname, '..', 'reports');

async function run() {
  console.log('=== STARTING INDEXEDDB BROWSER BENCHMARKS ===');
  console.log(`Loading page: ${BENCHMARK_HTML_PATH}`);
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Expose console logs from browser to terminal
  page.on('console', msg => {
    console.log(`[Browser Console] ${msg.text()}`);
  });

  try {
    await page.goto(BENCHMARK_HTML_PATH);
    console.log('✓ Page loaded.');
    
    console.log('Clicking "Start Automated Suite" button...');
    await page.click('#start-btn');
    
    console.log('Benchmark running, polling status...');
    
    let isComplete = false;
    let attempts = 0;
    const maxAttempts = 300; // 5 minutes max
    
    while (!isComplete && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
      
      const status = await page.evaluate(() => window.benchmarkStatus);
      if (status === 'complete') {
        isComplete = true;
      }
    }
    
    if (!isComplete) {
      throw new Error('Benchmark run timed out or failed.');
    }
    
    console.log('✓ Benchmark complete!');
    const results = await page.evaluate(() => window.benchmarkResults);
    
    // Save JSON report
    const timestamp = Date.now();
    const jsonPath = path.join(REPORTS_DIR, `indexeddb_benchmark_results_${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
    console.log(`Saved JSON report to ${jsonPath}`);
    
    // Save CSV report
    const csvPath = path.join(REPORTS_DIR, `indexeddb_benchmark_results_${timestamp}.csv`);
    let csvContent = 'Scale,Operation,Mean Latency (ms),Std Dev (ms),p95 (ms),p99 (ms),Ops/sec,Memory (MB),Storage (KB)\n';
    results.forEach(r => {
      csvContent += `${r.scale},"${r.operation}",${r.meanMs.toFixed(3)},${r.stdDevMs.toFixed(3)},${r.p95Ms.toFixed(3)},${r.p99Ms.toFixed(3)},${r.opsSec.toFixed(1)},${r.memoryUsedMb.toFixed(2)},${r.storageUsageKb.toFixed(1)}\n`;
    });
    fs.writeFileSync(csvPath, csvContent);
    console.log(`Saved CSV report to ${csvPath}`);
    
    console.log('\n=== INDEXEDDB BENCHMARK RESULTS ===');
    console.table(results.map(r => ({
      'Scale': r.scale,
      'Operation': r.operation,
      'Mean (ms)': r.meanMs.toFixed(3),
      'Std Dev (ms)': r.stdDevMs.toFixed(3),
      'p95 (ms)': r.p95Ms.toFixed(3),
      'Ops/sec': Math.round(r.opsSec),
      'Memory (MB)': r.memoryUsedMb.toFixed(2),
      'Storage (KB)': r.storageUsageKb.toFixed(1)
    })));
    
  } catch (err) {
    console.error('❌ Failed to run IndexedDB benchmarks:', err.message);
  } finally {
    await browser.close();
    console.log('Browser closed. IndexedDB benchmark suite execution complete.');
  }
}

run().catch(console.error);
