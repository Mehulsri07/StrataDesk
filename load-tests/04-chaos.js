// ============================================================================
// Phase 5 — CHAOS PHASE
// ============================================================================
// Goal:    Uncle Chaos Engineer™ attacks. No restrictions. Find the breaking point.
// Load:    Exponential ramp → 10000 VUs max OR 15 minutes (Change #3)
// Target:  Everything. Random. Concurrent.
//
// HARD STOP: 10000 VUs or 15 minutes, whichever comes first.
// ============================================================================

import http from 'k6/http';
import { sleep, check } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { BASE_URL, BOREWELL_IDS } from './config.js';
import { authHeaders, randomBorewell, randomPatch, uuid } from './helpers.js';

// Custom metrics for chaos tracking
const chaosErrors  = new Counter('chaos_errors');
const chaosLatency = new Trend('chaos_latency');

export const options = {
  // Change #3: Hard stop at 10000 VUs or 15 minutes
  stages: [
    { duration: '1m',  target: 100 },    // warm up
    { duration: '2m',  target: 500 },    // moderate
    { duration: '2m',  target: 1000 },   // heavy
    { duration: '2m',  target: 2000 },   // very heavy
    { duration: '2m',  target: 5000 },   // extreme
    { duration: '2m',  target: 10000 },  // maximum — hard ceiling
    { duration: '2m',  target: 10000 },  // hold max for observation
    { duration: '2m',  target: 0 },      // ramp down
  ],
  // Total: 15 minutes maximum
  thresholds: {
    // Intentionally loose — we WANT to observe failure, not prevent it
    http_req_duration: ['p(95)<30000'],  // 30s — just to keep k6 from aborting
    http_req_failed:   ['rate<0.99'],    // only abort if 99% fail
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  // Don't abort on errors — we're here to observe them
  noConnectionReuse: false,
  insecureSkipTLSVerify: true,
};

let knownIds = BOREWELL_IDS.length > 0 ? BOREWELL_IDS : [];

export function setup() {
  // Discover existing borewell IDs
  const res = http.get(`${BASE_URL}/api/borewells`, authHeaders());
  if (res.status === 200) {
    try {
      knownIds = JSON.parse(res.body).map((b) => b.id).slice(0, 50);
      console.log(`Chaos: discovered ${knownIds.length} borewell IDs`);
    } catch (e) { /* ignore */ }
  }
  return { ids: knownIds };
}

export default function (data) {
  const ids = data.ids || [];
  const dice = Math.random();
  const params = authHeaders();
  let res;

  try {
    if (dice < 0.30) {
      // 30% — GET list (heaviest read query)
      res = http.get(`${BASE_URL}/api/borewells`, params);

    } else if (dice < 0.45 && ids.length > 0) {
      // 15% — GET by ID
      const id = ids[Math.floor(Math.random() * ids.length)];
      res = http.get(`${BASE_URL}/api/borewells/${id}`, params);

    } else if (dice < 0.55) {
      // 10% — Health (smoke check)
      res = http.get(`${BASE_URL}/api/health`);

    } else if (dice < 0.70) {
      // 15% — Metrics (Prometheus endpoint, adds load to metrics computation)
      res = http.get(`${BASE_URL}/api/metrics`);

    } else if (dice < 0.85) {
      // 15% — CREATE + DELETE (write churn)
      const bw = randomBorewell();
      res = http.post(`${BASE_URL}/api/borewells`, JSON.stringify(bw), params);
      if (res.status === 201) {
        http.del(`${BASE_URL}/api/borewells/${bw.id}`, null, params);
      }

    } else if (dice < 0.95 && ids.length > 0) {
      // 10% — PATCH existing (partial write)
      const id = ids[Math.floor(Math.random() * ids.length)];
      res = http.patch(
        `${BASE_URL}/api/borewells/${id}`,
        JSON.stringify(randomPatch()),
        params
      );

    } else {
      // 5% — Full lifecycle: CREATE → PUT → PATCH → DELETE
      const bw = randomBorewell();
      res = http.post(`${BASE_URL}/api/borewells`, JSON.stringify(bw), params);
      if (res.status === 201) {
        bw.notes = 'Chaos updated';
        http.put(`${BASE_URL}/api/borewells/${bw.id}`, JSON.stringify(bw), params);
        http.patch(
          `${BASE_URL}/api/borewells/${bw.id}`,
          JSON.stringify(randomPatch()),
          params
        );
        http.del(`${BASE_URL}/api/borewells/${bw.id}`, null, params);
      }
    }

    // Track chaos-specific metrics
    if (res) {
      chaosLatency.add(res.timings.duration);
      if (res.status >= 400) {
        chaosErrors.add(1);
      }
    }

  } catch (e) {
    chaosErrors.add(1);
  }

  // Minimal sleep — maximum pressure
  sleep(0.01);
}

export function handleSummary(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  // Extract key failure metrics
  const metrics = data.metrics || {};
  const summary = {
    max_vus:        metrics.vus_max   ? metrics.vus_max.values.max   : 'N/A',
    total_requests: metrics.http_reqs ? metrics.http_reqs.values.count : 'N/A',
    rps:            metrics.http_reqs ? metrics.http_reqs.values.rate  : 'N/A',
    error_rate:     metrics.http_req_failed ? metrics.http_req_failed.values.rate : 'N/A',
    p95_latency:    metrics.http_req_duration ? metrics.http_req_duration.values['p(95)'] : 'N/A',
    p99_latency:    metrics.http_req_duration ? metrics.http_req_duration.values['p(99)'] : 'N/A',
    chaos_errors:   metrics.chaos_errors ? metrics.chaos_errors.values.count : 0,
  };

  console.log('\n========================================');
  console.log('  CHAOS PHASE RESULTS');
  console.log('========================================');
  console.log(`  Max VUs:        ${summary.max_vus}`);
  console.log(`  Total Requests: ${summary.total_requests}`);
  console.log(`  Requests/sec:   ${summary.rps}`);
  console.log(`  Error Rate:     ${(summary.error_rate * 100).toFixed(2)}%`);
  console.log(`  p95 Latency:    ${summary.p95_latency}ms`);
  console.log(`  p99 Latency:    ${summary.p99_latency}ms`);
  console.log(`  Chaos Errors:   ${summary.chaos_errors}`);
  console.log('========================================\n');

  return {
    [`logs/04-chaos-${timestamp}.json`]: JSON.stringify(data, null, 2),
    'stdout': textSummary(data, { indent: '  ', enableColors: true }),
  };
}

import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.3/index.js';
