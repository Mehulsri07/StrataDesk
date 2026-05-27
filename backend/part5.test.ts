import * as fs from 'fs';
import * as path from 'path';
import * as assert from 'assert';

console.log('--- RUNNING OBSERVABILITY METRICS & NORMALIZATION TESTS ---');

const serverJsPath = path.join(__dirname, 'server.js');
const serverJsContent = fs.readFileSync(serverJsPath, 'utf8');

// 1. Extract and test normalizeRoute
const normalizeRouteRegex = /function normalizeRoute\s*\(\s*path\s*\)\s*\{([\s\S]*?return\s+normalized\.join\('\/'\);\s*\n*\})/m;
const normalizeRouteMatch = serverJsContent.match(normalizeRouteRegex);

if (!normalizeRouteMatch) {
  console.error('Error: Could not extract normalizeRoute function from server.js');
  process.exit(1);
}

// Re-create the function dynamically for testing
const normalizeRouteFnCode = normalizeRouteMatch[0];
const normalizeRoute = new Function('path', `
  ${normalizeRouteFnCode}
  return normalizeRoute(path);
`) as (path: string) => string;

// Run Route Normalization Tests
console.log('Testing Route Normalization...');
try {
  // Test case 1: exact matching for borewells list
  assert.strictEqual(normalizeRoute('/api/borewells'), '/api/borewells');

  // Test case 2: exact matching for specific borewell ID
  assert.strictEqual(normalizeRoute('/api/borewells/123'), '/api/borewells/:id');
  assert.strictEqual(normalizeRoute('/api/borewells/abc-def-123'), '/api/borewells/:id');

  // Test case 3: query/suffix parameters or child subpaths
  assert.strictEqual(normalizeRoute('/api/borewells/123/layers'), '/api/borewells/:id/layers');

  // Test case 4: paths that should not be touched
  assert.strictEqual(normalizeRoute('/api/health'), '/api/health');
  assert.strictEqual(normalizeRoute('/api/metrics'), '/api/metrics');

  console.log('✅ Route Normalization Tests Passed!');
} catch (error) {
  console.error('❌ Route Normalization Tests Failed:', error);
  process.exit(1);
}

// 2. Extract and test /api/metrics endpoint format
const metricsEndpointRegex = /app\.get\(\s*['"]\/api\/metrics['"]\s*,\s*(?:\(\s*req\s*,\s*res\s*\)|_?req\s*,\s*res)\s*=>\s*\{([\s\S]*?res\.end\(\s*body\s*\);)/m;
const metricsEndpointMatch = serverJsContent.match(metricsEndpointRegex);

if (!metricsEndpointMatch) {
  console.error('Error: Could not extract /api/metrics route handler from server.js');
  process.exit(1);
}

const metricsBodyCode = metricsEndpointMatch[1];

// Re-create the metrics endpoint logic
// Mock res and metrics object
const mockMetrics = {
  requestsTotal: {
    'GET:/api/borewells:200': 10,
    'POST:/api/borewells:201': 2,
    'GET:/api/borewells/:id:200': 5,
    'GET:/api/health:200': 100,
  },
  activeRequests: 1,
  requestDurationSum: 1543.21,
  requestDurationCount: 17,
  errorRequestsTotal: 0,
};

const runMetricsHandler = (metrics: any) => {
  let contentType = '';
  let responseBody = '';

  const mockRes = {
    set: (name: string, value: string) => {
      if (name.toLowerCase() === 'content-type') {
        contentType = value;
      }
    },
    end: (body: string) => {
      responseBody = body;
    }
  };

  // Create a function that executes the endpoint code
  const fn = new Function('req', 'res', 'metrics', 'process', `
    ${metricsBodyCode}
  `);

  fn({}, mockRes, metrics, process);
  return { contentType, responseBody };
};

console.log('Testing Metrics Endpoint Formatting...');
try {
  const { contentType, responseBody } = runMetricsHandler(mockMetrics);

  // Assert correct Content-Type header
  assert.ok(contentType.includes('text/plain'), `Content-Type should be text/plain, got: ${contentType}`);
  assert.ok(contentType.includes('version=0.0.4'), `Content-Type should contain version=0.0.4, got: ${contentType}`);

  // Assert expected Prometheus metric blocks are in body
  assert.ok(responseBody.includes('# HELP stratadesk_requests_total'), 'Should contain HELP for stratadesk_requests_total');
  assert.ok(responseBody.includes('# TYPE stratadesk_requests_total counter'), 'Should contain TYPE for stratadesk_requests_total');
  assert.ok(responseBody.includes('stratadesk_requests_total{method="GET",route="/api/borewells",status="200"} 10'), 'Should contain total requests metric lines');
  assert.ok(responseBody.includes('stratadesk_requests_total{method="GET",route="/api/borewells/:id",status="200"} 5'), 'Should contain normalized route metrics');

  assert.ok(responseBody.includes('# HELP stratadesk_active_requests'), 'Should contain HELP for stratadesk_active_requests');
  assert.ok(responseBody.includes('stratadesk_active_requests 1'), 'Should contain current active requests count');

  assert.ok(responseBody.includes('# HELP stratadesk_request_duration_ms_sum'), 'Should contain HELP for stratadesk_request_duration_ms_sum');
  assert.ok(responseBody.includes('stratadesk_request_duration_ms_sum 1543.21'), 'Should contain request duration sum');

  assert.ok(responseBody.includes('# HELP stratadesk_request_duration_ms_count'), 'Should contain HELP for stratadesk_request_duration_ms_count');
  assert.ok(responseBody.includes('stratadesk_request_duration_ms_count 17'), 'Should contain request duration count');

  assert.ok(responseBody.includes('# HELP stratadesk_request_errors_total'), 'Should contain HELP for stratadesk_request_errors_total');
  assert.ok(responseBody.includes('stratadesk_request_errors_total 0'), 'Should contain error requests count');

  assert.ok(responseBody.includes('# HELP stratadesk_memory_usage_bytes'), 'Should contain HELP for stratadesk_memory_usage_bytes');
  assert.ok(responseBody.includes('type="rss"'), 'Should contain memory label rss');
  assert.ok(responseBody.includes('type="heapTotal"'), 'Should contain memory label heapTotal');
  assert.ok(responseBody.includes('type="heapUsed"'), 'Should contain memory label heapUsed');
  assert.ok(responseBody.includes('type="external"'), 'Should contain memory label external');

  assert.ok(responseBody.includes('# HELP stratadesk_uptime_seconds'), 'Should contain HELP for stratadesk_uptime_seconds');

  console.log('✅ Metrics Endpoint Tests Passed!');
} catch (error) {
  console.error('❌ Metrics Endpoint Tests Failed:', error);
  process.exit(1);
}

console.log('--- ALL TESTS PASSED SUCCESSFULLY! ---');
