// ============================================================================
// Phase 7 — RECOVERY TEST
// ============================================================================
// Goal:    After overload, measure time until full recovery.
// Method:  1 VU polling every 1 second for up to 5 minutes.
//
// Measures:
//   - Health endpoint recovery   (GET /api/health → 200)
//   - Functional recovery        (GET /api/borewells → valid JSON array)  (Change #6)
//   - Metrics recovery           (stratadesk_active_requests → 0)
//
// "Health endpoints lie sometimes. Applications do too."
// ============================================================================

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { BASE_URL } from './config.js';
import { authHeaders } from './helpers.js';

const recoveryAttempts = new Counter('recovery_attempts');
const recoveryLatency  = new Trend('recovery_check_latency');

export const options = {
  vus: 1,
  duration: '5m',  // max 5 minutes to recover
  thresholds: {
    // Recovery should happen within 5 minutes
    'recovery_attempts': ['count>0'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

let healthRecovered     = false;
let functionalRecovered = false;
let metricsRecovered    = false;
let allRecovered        = false;

let healthRecoveryTime     = null;
let functionalRecoveryTime = null;
let metricsRecoveryTime    = null;
let fullRecoveryTime       = null;

const startTime = Date.now();

export default function () {
  if (allRecovered) {
    sleep(1);
    return;
  }

  recoveryAttempts.add(1);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // ── Check 1: Health endpoint ──
  if (!healthRecovered) {
    try {
      const healthRes = http.get(`${BASE_URL}/api/health`, { timeout: '10s' });
      recoveryLatency.add(healthRes.timings.duration);

      if (healthRes.status === 200) {
        healthRecovered = true;
        healthRecoveryTime = elapsed;
        console.log(`✅ Health recovered at ${elapsed}s`);
      } else {
        console.log(`⏳ Health check: status ${healthRes.status} (${elapsed}s)`);
      }
    } catch (e) {
      console.log(`❌ Health check failed: ${e.message} (${elapsed}s)`);
    }
  }

  // ── Check 2: Functional recovery (Change #6) ──
  if (healthRecovered && !functionalRecovered) {
    try {
      const bwRes = http.get(`${BASE_URL}/api/borewells`, Object.assign(
        authHeaders(),
        { timeout: '15s' }
      ));
      recoveryLatency.add(bwRes.timings.duration);

      const isValid = check(bwRes, {
        'functional — status 200': (r) => r.status === 200,
        'functional — valid JSON array': (r) => {
          try {
            const data = JSON.parse(r.body);
            return Array.isArray(data);
          } catch {
            return false;
          }
        },
        'functional — latency < 5s': (r) => r.timings.duration < 5000,
      });

      if (isValid) {
        functionalRecovered = true;
        functionalRecoveryTime = elapsed;
        const data = JSON.parse(bwRes.body);
        console.log(`✅ Functional recovered at ${elapsed}s (${data.length} borewells returned)`);
      } else {
        console.log(`⏳ Functional check: status ${bwRes.status}, body length ${(bwRes.body || '').length} (${elapsed}s)`);
      }
    } catch (e) {
      console.log(`❌ Functional check failed: ${e.message} (${elapsed}s)`);
    }
  }

  // ── Check 3: Metrics recovery (active requests → 0) ──
  if (functionalRecovered && !metricsRecovered) {
    try {
      const metricsRes = http.get(`${BASE_URL}/api/metrics`, { timeout: '10s' });
      recoveryLatency.add(metricsRes.timings.duration);

      if (metricsRes.status === 200) {
        const body = metricsRes.body || '';
        const match = body.match(/stratadesk_active_requests\s+(\d+)/);
        const activeRequests = match ? parseInt(match[1]) : -1;

        // Also check DB pool
        const poolWaitMatch = body.match(/stratadesk_db_pool_waiting\s+(\d+)/);
        const poolWaiting = poolWaitMatch ? parseInt(poolWaitMatch[1]) : -1;

        if (activeRequests <= 1 && poolWaiting === 0) {
          metricsRecovered = true;
          metricsRecoveryTime = elapsed;
          console.log(`✅ Metrics recovered at ${elapsed}s (active=${activeRequests}, poolWaiting=${poolWaiting})`);
        } else {
          console.log(`⏳ Metrics: active_requests=${activeRequests}, pool_waiting=${poolWaiting} (${elapsed}s)`);
        }
      }
    } catch (e) {
      console.log(`❌ Metrics check failed: ${e.message} (${elapsed}s)`);
    }
  }

  // ── All recovered? ──
  if (healthRecovered && functionalRecovered && metricsRecovered && !allRecovered) {
    allRecovered = true;
    fullRecoveryTime = elapsed;
    console.log('\n========================================');
    console.log('  FULL RECOVERY ACHIEVED');
    console.log('========================================');
    console.log(`  Health Recovery:     ${healthRecoveryTime}s`);
    console.log(`  Functional Recovery: ${functionalRecoveryTime}s`);
    console.log(`  Metrics Recovery:    ${metricsRecoveryTime}s`);
    console.log(`  Total Recovery:      ${fullRecoveryTime}s`);
    console.log('========================================\n');
  }

  sleep(1);
}

export function handleSummary(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  const recoveryReport = {
    healthRecoveryTime,
    functionalRecoveryTime,
    metricsRecoveryTime,
    fullRecoveryTime,
    allRecovered,
    k6Summary: data,
  };

  return {
    [`logs/05-recovery-${timestamp}.json`]: JSON.stringify(recoveryReport, null, 2),
    'stdout': textSummary(data, { indent: '  ', enableColors: true }),
  };
}

import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.3/index.js';
