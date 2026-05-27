// ============================================================================
// Phase 4B — WRITE-HEAVY LOAD TEST
// ============================================================================
// Goal:    Isolate write bottlenecks from read bottlenecks. (Change #2)
// Load:    1000 VUs × 5 minutes — WRITES ONLY
// Target:  POST /api/borewells, PUT /api/borewells/:id, DELETE /api/borewells/:id
//
// WARNING: This creates and deletes many borewells. Run on test/staging only.
// ============================================================================

import http from 'k6/http';
import { sleep, check } from 'k6';
import { SharedArray } from 'k6/data';
import { BASE_URL, DEFAULT_THRESHOLDS } from './config.js';
import { authHeaders, randomBorewell } from './helpers.js';

export const options = {
  stages: [
    { duration: '1m',  target: 1000 },  // ramp to 1000 VUs
    { duration: '4m',  target: 1000 },  // hold
    { duration: '30s', target: 0 },     // ramp down
  ],
  thresholds: DEFAULT_THRESHOLDS,
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

export default function () {
  const action = Math.random();
  const params = authHeaders();

  if (action < 0.5) {
    // 50% — CREATE a borewell
    const bw = randomBorewell();
    const res = http.post(
      `${BASE_URL}/api/borewells`,
      JSON.stringify(bw),
      params
    );
    check(res, {
      'create — status 201': (r) => r.status === 201,
      'create — duration < 3s': (r) => r.timings.duration < 3000,
    });

    // Immediately clean up to avoid unbounded growth
    if (res.status === 201) {
      http.del(`${BASE_URL}/api/borewells/${bw.id}`, null, params);
    }

  } else if (action < 0.8) {
    // 30% — CREATE then UPDATE (PUT)
    const bw = randomBorewell();
    const createRes = http.post(
      `${BASE_URL}/api/borewells`,
      JSON.stringify(bw),
      params
    );

    if (createRes.status === 201) {
      bw.name = `Updated-${bw.name}`;
      bw.notes = 'Updated by k6 write-heavy test';
      const updateRes = http.put(
        `${BASE_URL}/api/borewells/${bw.id}`,
        JSON.stringify(bw),
        params
      );
      check(updateRes, {
        'update — status 200': (r) => r.status === 200,
        'update — duration < 3s': (r) => r.timings.duration < 3000,
      });

      // Clean up
      http.del(`${BASE_URL}/api/borewells/${bw.id}`, null, params);
    }

  } else {
    // 20% — CREATE then DELETE
    const bw = randomBorewell();
    const createRes = http.post(
      `${BASE_URL}/api/borewells`,
      JSON.stringify(bw),
      params
    );

    if (createRes.status === 201) {
      const delRes = http.del(`${BASE_URL}/api/borewells/${bw.id}`, null, params);
      check(delRes, {
        'delete — status 200': (r) => r.status === 200,
        'delete — duration < 2s': (r) => r.timings.duration < 2000,
      });
    }
  }

  sleep(0.02);
}

export function handleSummary(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return {
    [`logs/03b-write-heavy-${timestamp}.json`]: JSON.stringify(data, null, 2),
    'stdout': textSummary(data, { indent: '  ', enableColors: true }),
  };
}

import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.3/index.js';
