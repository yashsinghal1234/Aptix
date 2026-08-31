import http from "http";
import https from "https";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const CONCURRENCY = parseInt(process.env.CONCURRENCY || "50", 10);
const TOTAL_REQUESTS = parseInt(process.env.TOTAL_REQUESTS || "250", 10);

interface RequestResult {
  duration: number;
  status: number;
  error?: string;
}

async function makeRequest(url: string, options: any = {}): Promise<RequestResult> {
  const start = performance.now();
  const isHttps = url.startsWith("https");
  const client = isHttps ? https : http;

  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(url);
      const req = client.request({
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: options.method || "GET",
        headers: {
          "User-Agent": "AptixLoadTester/1.0",
          ...(options.headers || {})
        },
        timeout: 10000
      }, (res) => {
        res.on("data", () => {});
        res.on("end", () => {
          const duration = performance.now() - start;
          resolve({ duration, status: res.statusCode || 0 });
        });
      });

      req.on("error", (err) => {
        const duration = performance.now() - start;
        resolve({ duration, status: 0, error: err.message });
      });

      req.on("timeout", () => {
        req.destroy();
        const duration = performance.now() - start;
        resolve({ duration, status: 504, error: "TIMEOUT" });
      });

      if (options.body) {
        req.write(options.body);
      }
      req.end();
    } catch (e: any) {
      resolve({ duration: performance.now() - start, status: 0, error: e.message });
    }
  });
}

function computePercentile(numbers: number[], p: number): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

async function runConcurrentSpike(targetName: string, url: string, totalRequests: number, concurrency: number, options: any = {}) {
  // 1. Warm-up hit
  await makeRequest(url, options);

  console.log(`\n==================================================`);
  console.log(`⚡ STRESS BENCHMARK: ${targetName}`);
  console.log(`🎯 Target URL: ${url}`);
  console.log(`👥 Concurrent Virtual Users: ${concurrency} | Total Requests: ${totalRequests}`);
  console.log(`==================================================`);

  const results: RequestResult[] = [];
  let completed = 0;
  const startTime = performance.now();

  const worker = async () => {
    while (completed < totalRequests) {
      completed++;
      const res = await makeRequest(url, options);
      results.push(res);
    }
  };

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  const totalTimeSec = (performance.now() - startTime) / 1000;
  const durations = results.map(r => r.duration);
  const successCount = results.filter(r => r.status >= 200 && r.status < 400).length;
  const errorCount = results.length - successCount;
  const avgDuration = durations.reduce((a, b) => a + b, 0) / (durations.length || 1);
  const p50 = computePercentile(durations, 50);
  const p95 = computePercentile(durations, 95);
  const p99 = computePercentile(durations, 99);
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);
  const rps = (results.length / totalTimeSec).toFixed(1);

  console.log(`📊 BENCHMARK METRICS SUMMARY:`);
  console.log(`  • Completed Requests : ${results.length} requests in ${totalTimeSec.toFixed(2)}s`);
  console.log(`  • Throughput Rate    : ${rps} req/sec`);
  console.log(`  • Successful (2xx)   : ${successCount} (${((successCount / results.length) * 100).toFixed(1)}%)`);
  console.log(`  • Failed / Errors    : ${errorCount} (${((errorCount / results.length) * 100).toFixed(1)}%)`);
  console.log(`  • Average Latency    : ${avgDuration.toFixed(1)} ms`);
  console.log(`  • Median (p50)       : ${p50.toFixed(1)} ms`);
  console.log(`  • 95th Percentile p95: ${p95.toFixed(1)} ms ${p95 < 800 ? "✅ [SLA PASSED]" : "⚠️ [SLA EXCEEDED]"}`);
  console.log(`  • 99th Percentile p99: ${p99.toFixed(1)} ms`);
  console.log(`  • Min / Max Latency  : ${minDuration.toFixed(1)} ms / ${maxDuration.toFixed(1)} ms`);

  return { rps, p95, errorRate: errorCount / results.length };
}

async function runAllBenchmarks() {
  console.log(`🚀 Starting Aptix Concurrency & Load Stress Suite against ${BASE_URL}`);

  // Test 1: Candidate Assessment Entry & Question Cache Fetch (200 requests, 50 concurrent)
  await runConcurrentSpike(
    "Candidate Assessment Entry & Question Cache Fetch",
    `${BASE_URL}/`,
    TOTAL_REQUESTS,
    CONCURRENCY
  );

  // Test 2: Practice Arena Endpoint Load (150 requests, 50 concurrent)
  await runConcurrentSpike(
    "Zero-Stakes Practice Arena Discovery Endpoint",
    `${BASE_URL}/practice`,
    Math.min(TOTAL_REQUESTS, 150),
    CONCURRENCY
  );

  // Test 3: Examiner Login Security Gate (100 requests, 30 concurrent)
  await runConcurrentSpike(
    "Examiner Access Gate",
    `${BASE_URL}/admin/login`,
    Math.min(TOTAL_REQUESTS, 100),
    30
  );

  console.log(`\n==================================================`);
  console.log(`🎉 ALL CONCURRENT STRESS BENCHMARKS COMPLETED!`);
  console.log(`==================================================\n`);
}

runAllBenchmarks().catch(console.error);
