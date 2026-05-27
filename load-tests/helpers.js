// ============================================================================
// StrataDesk Load Test — Shared Helpers
// ============================================================================

import { check } from 'k6';
import { AUTH_TOKEN } from './config.js';

// Standard auth headers for all API requests
export function authHeaders() {
  return {
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Type':  'application/json',
    },
  };
}

// Standard response checks
export function checkResponse(res, name) {
  check(res, {
    [`${name} — status 2xx`]: (r) => r.status >= 200 && r.status < 300,
    [`${name} — duration < 2s`]: (r) => r.timings.duration < 2000,
  });
}

// Check that a response contains valid JSON array (for functional recovery)
export function checkBorewellList(res) {
  check(res, {
    'borewells — status 200':     (r) => r.status === 200,
    'borewells — is array':       (r) => {
      try { return Array.isArray(JSON.parse(r.body)); }
      catch { return false; }
    },
    'borewells — duration < 5s':  (r) => r.timings.duration < 5000,
  });
}

// Generate a random UUID v4
export function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Generate a random borewell payload for POST/PUT tests
export function randomBorewell() {
  const id = uuid();
  const materials = ['Topsoil', 'Clay', 'Sand', 'Gravel', 'Sandstone', 'Limestone', 'Granite', 'Shale'];
  const colors    = ['#8D6E63', '#BCAAA4', '#FFE082', '#A1887F', '#90A4AE', '#80CBC4', '#78909C', '#B0BEC5'];
  const layerCount = Math.floor(Math.random() * 4) + 1;
  const layers = [];
  let depth = 0;

  for (let i = 0; i < layerCount; i++) {
    const thickness = Math.floor(Math.random() * 20) + 5;
    layers.push({
      id:         uuid(),
      startDepth: depth,
      endDepth:   depth + thickness,
      material:   materials[Math.floor(Math.random() * materials.length)],
      color:      colors[Math.floor(Math.random() * colors.length)],
    });
    depth += thickness;
  }

  return {
    id,
    name:                    `LoadTest-BW-${id.substring(0, 8)}`,
    location:                `Test Location ${Math.floor(Math.random() * 1000)}`,
    latitude:                12.9 + Math.random() * 0.2,
    longitude:               77.5 + Math.random() * 0.2,
    diameter:                8,
    totalDepth:              depth,
    waterLevel:              Math.random() * depth * 0.6,
    groundElevationMSL:      800 + Math.random() * 200,
    notes:                   'Created by k6 load test',
    selectedForCrossSection: false,
    layers,
  };
}

// Generate a random partial update payload for PATCH tests
export function randomPatch() {
  return {
    notes:      `Updated by k6 at ${new Date().toISOString()}`,
    waterLevel: Math.random() * 50,
  };
}
