// ============================================================================
// Phase 4C — COMBINED HEAVY LOAD TEST
// ============================================================================
// Goal:    Find first bottleneck under realistic mixed CRUD workload.
// Load:    1000 VUs × 5 minutes — READS + WRITES
// Target:  All endpoints — weighted distribution
//
// Run this AFTER 03a and 03b to compare isolated vs combined behavior.
// ============================================================================

import http from 'k6/http';
import { sleep, check } from 'k6';
import { BASE_URL, BOREWELL_IDS, DEFAULT_THRESHOLDS } from './config.js';
import { authHeaders, checkResponse, randomBorewell } from './helpers.js';

export const options = {
  stages: [
    { duration: '1m',  target: 1000 },
    { duration: '4m',  target: 1000 },
    { duration: '30s', target: 0 },
  ],
  thresholds: DEFAULT_THRESHOLDS,
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

let knownIds = BOREWELL_IDS.length > 0 ? BOREWELL_IDS : [];

export function setup() {
  if (knownIds.length === 0) {
    const res = http.get(`${BASE_URL}/api/borewells`, authHeaders());
    if (res.status === 200) {
      try {
        knownIds = JSON.parse(res.body).map((b) => b.id).slice(0, 20);
      } catch (e) { /* ignore */ }
    }
  }
  return { ids: knownIds };
}

export default function (data) {
  const ids = data.ids || [];
  const action = Math.random();
  const params = authHeaders();

  if (action < 0.40) {
    // 40% — READ list
    const res = http.get(`${BASE_URL}/api/borewells`, params);
    checkResponse(res, 'mixed-list');

  } else if (action < 0.60 && ids.length > 0) {
    // 20% — READ by ID
    const id = ids[Math.floor(Math.random() * ids.length)];
    const res = http.get(`${BASE_URL}/api/borewells/${id}`, params);
    checkResponse(res, 'mixed-byid');

  } else if (action < 0.75) {
    // 15% — HEALTH (lightweight, simulates monitoring)
    const res = http.get(`${BASE_URL}/api/health`);
    checkResponse(res, 'mixed-health');

  } else if (action < 0.90) {
    // 15% — CREATE + cleanup
    const bw = randomBorewell();
    const res = http.post(`${BASE_URL}/api/borewells`, JSON.stringify(bw), params);
    check(res, { 'mixed-create 201': (r) => r.status === 201 });
    if (res.status === 201) {
      http.del(`${BASE_URL}/api/borewells/${bw.id}`, null, params);
    }

  } else {
    // 10% — CREATE + UPDATE + DELETE (full lifecycle)
    const bw = randomBorewell();
    const createRes = http.post(`${BASE_URL}/api/borewells`, JSON.stringify(bw), params);
    if (createRes.status === 201) {
      bw.notes = 'Updated by mixed heavy test';
      http.put(`${BASE_URL}/api/borewells/${bw.id}`, JSON.stringify(bw), params);
      http.del(`${BASE_URL}/api/borewells/${bw.id}`, null, params);
    }
  }

  sleep(0.02);
}

export function handleSummary(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return {
    [`logs/03-heavy-combined-${timestamp}.json`]: JSON.stringify(data, null, 2),
    'stdout': textSummary(data, { indent: '  ', enableColors: true }),
  };
}

import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.3/index.js';
