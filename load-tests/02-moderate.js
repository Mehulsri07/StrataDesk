// ============================================================================
// Phase 3 — MODERATE LOAD TEST
// ============================================================================
// Goal:    Push beyond comfortable. Observe resource scaling.
// Load:    500 VUs × 5 minutes
// Target:  GET /api/borewells (70%), GET /api/borewells/:id (30%)
// ============================================================================

import http from 'k6/http';
import { sleep } from 'k6';
import { BASE_URL, BOREWELL_IDS, DEFAULT_THRESHOLDS } from './config.js';
import { authHeaders, checkResponse } from './helpers.js';

export const options = {
  stages: [
    { duration: '1m',  target: 500 },   // ramp up to 500 VUs
    { duration: '4m',  target: 500 },   // hold at 500 VUs
    { duration: '30s', target: 0 },     // ramp down
  ],
  thresholds: DEFAULT_THRESHOLDS,
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// Seed IDs — populated from first request if not provided
let knownIds = BOREWELL_IDS.length > 0 ? BOREWELL_IDS : [];

export function setup() {
  // Fetch real borewell IDs from the API if none provided
  if (knownIds.length === 0) {
    const res = http.get(`${BASE_URL}/api/borewells`, authHeaders());
    if (res.status === 200) {
      try {
        const data = JSON.parse(res.body);
        knownIds = data.map((b) => b.id).slice(0, 20); // take up to 20
        console.log(`Discovered ${knownIds.length} borewell IDs for testing`);
      } catch (e) {
        console.warn('Failed to parse borewell list for IDs');
      }
    }
  }
  return { ids: knownIds };
}

export default function (data) {
  const ids = data.ids || [];

  if (Math.random() < 0.7 || ids.length === 0) {
    // 70% — List all borewells
    const res = http.get(`${BASE_URL}/api/borewells`, authHeaders());
    checkResponse(res, 'borewells-list');
  } else {
    // 30% — Get specific borewell
    const id = ids[Math.floor(Math.random() * ids.length)];
    const res = http.get(`${BASE_URL}/api/borewells/${id}`, authHeaders());
    checkResponse(res, 'borewells-byid');
  }

  sleep(0.05); // shorter sleep = higher pressure per VU
}

export function handleSummary(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return {
    [`logs/02-moderate-${timestamp}.json`]: JSON.stringify(data, null, 2),
    'stdout': textSummary(data, { indent: '  ', enableColors: true }),
  };
}

import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.3/index.js';
