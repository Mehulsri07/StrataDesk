// ============================================================================
// StrataDesk Load Test — Shared Configuration
// ============================================================================
//
// Usage:
//   k6 run -e BASE_URL=http://your-ec2-ip:3001 -e AUTH_TOKEN=dev-token script.js
//
// Or export them first:
//   $env:BASE_URL = "http://your-ec2-ip:3001"
//   $env:AUTH_TOKEN = "dev-token"
//   k6 run script.js
// ============================================================================

export const BASE_URL   = __ENV.BASE_URL   || 'http://localhost:3001';
export const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'dev-token';

// Known borewell IDs for GET-by-ID tests.
// Replace with real IDs from your staging DB, or the chaos script will seed them.
export const BOREWELL_IDS = (__ENV.BOREWELL_IDS || '').split(',').filter(Boolean);

// Default thresholds (informational — we WANT to see failures, not prevent them)
export const DEFAULT_THRESHOLDS = {
  http_req_duration: ['p(95)<2000'],   // warn if p95 > 2s
  http_req_failed:   ['rate<0.50'],    // warn if >50% fail
};
