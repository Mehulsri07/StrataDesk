// ============================================================================
// Phase 2 — BASELINE LOAD TEST
// ============================================================================
// Goal:    Verify monitoring pipeline. Establish baseline metrics.
// Load:    100 VUs × 2 minutes
// Target:  GET /api/health, GET /api/borewells
// ============================================================================

import http from 'k6/http';
import { sleep } from 'k6';
import { BASE_URL, DEFAULT_THRESHOLDS } from './config.js';
import { authHeaders, checkResponse } from './helpers.js';

export const options = {
  stages: [
    { duration: '30s', target: 100 },   // ramp up to 100 VUs
    { duration: '90s', target: 100 },   // hold at 100 VUs
    { duration: '30s', target: 0 },     // ramp down
  ],
  thresholds: DEFAULT_THRESHOLDS,
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

export default function () {
  // 50/50 split between health and borewells
  if (Math.random() < 0.5) {
    // Health check — no auth required
    const healthRes = http.get(`${BASE_URL}/api/health`);
    checkResponse(healthRes, 'health');
  } else {
    // Borewells list — requires auth
    const bwRes = http.get(`${BASE_URL}/api/borewells`, authHeaders());
    checkResponse(bwRes, 'borewells');
  }

  sleep(0.1); // ~10 req/s per VU → 100 VUs ≈ 1000 req/s theoretical, throttled by sleep
}

export function handleSummary(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return {
    [`logs/01-baseline-${timestamp}.json`]: JSON.stringify(data, null, 2),
    'stdout': textSummary(data, { indent: '  ', enableColors: true }),
  };
}

// k6 built-in text summary
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.3/index.js';
