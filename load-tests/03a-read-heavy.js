// ============================================================================
// Phase 4A — READ-HEAVY LOAD TEST
// ============================================================================
// Goal:    Isolate read bottlenecks from write bottlenecks. (Change #2)
// Load:    1000 VUs × 5 minutes — READS ONLY
// Target:  GET /api/borewells, GET /api/borewells/:id
// ============================================================================

import http from 'k6/http';
import { sleep } from 'k6';
import { BASE_URL, BOREWELL_IDS, DEFAULT_THRESHOLDS } from './config.js';
import { authHeaders, checkResponse } from './helpers.js';

export const options = {
  stages: [
    { duration: '1m',  target: 1000 },  // ramp to 1000 VUs
    { duration: '4m',  target: 1000 },  // hold
    { duration: '30s', target: 0 },     // ramp down
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
        console.log(`Discovered ${knownIds.length} borewell IDs`);
      } catch (e) {
        console.warn('Failed to discover borewell IDs');
      }
    }
  }
  return { ids: knownIds };
}

export default function (data) {
  const ids = data.ids || [];

  if (Math.random() < 0.6 || ids.length === 0) {
    // 60% — List borewells
    const res = http.get(`${BASE_URL}/api/borewells`, authHeaders());
    checkResponse(res, 'read-list');
  } else {
    // 40% — Get by ID
    const id = ids[Math.floor(Math.random() * ids.length)];
    const res = http.get(`${BASE_URL}/api/borewells/${id}`, authHeaders());
    checkResponse(res, 'read-byid');
  }

  sleep(0.02);
}

export function handleSummary(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return {
    [`logs/03a-read-heavy-${timestamp}.json`]: JSON.stringify(data, null, 2),
    'stdout': textSummary(data, { indent: '  ', enableColors: true }),
  };
}

import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.3/index.js';
