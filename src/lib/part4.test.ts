import test from 'node:test';
import assert from 'node:assert';

// 1. Establish browser mocks synchronously in script execution
const windowMock: any = {
  navigator: {
    userAgent: 'node',
    pointerEnabled: false,
    msPointerEnabled: false,
    maxTouchPoints: 0,
  },
  document: {
    createElement: () => ({
      style: {},
    }),
    getElementsByTagName: () => [],
    documentElement: {
      style: {},
    },
    styleSheets: [],
  },
  screen: {
    deviceXDPI: 96,
    logicalXDPI: 96,
  },
  addEventListener: () => {},
  removeEventListener: () => {},
  requestAnimationFrame: (cb: any) => setTimeout(cb, 0),
  cancelAnimationFrame: (id: any) => clearTimeout(id),
  devicePixelRatio: 1,
};
windowMock.window = windowMock;

Object.defineProperty(global, 'window', {
  value: windowMock,
  writable: true,
  configurable: true,
});

Object.defineProperty(global, 'document', {
  value: windowMock.document,
  writable: true,
  configurable: true,
});

// If global.navigator already exists (e.g. Node 22+), define userAgent on it
if (global.navigator) {
  Object.defineProperty(global.navigator, 'userAgent', {
    value: 'node',
    writable: true,
    configurable: true,
  });
} else {
  Object.defineProperty(global, 'navigator', {
    value: windowMock.navigator,
    writable: true,
    configurable: true,
  });
}

import { QueryClient } from '@tanstack/react-query';

test('React Query Cache & Invalidation Integration', async (t) => {
  await t.test('creates query client with default options', () => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000,
        },
      },
    });

    assert.ok(client instanceof QueryClient, 'Client must be a QueryClient instance');
    assert.strictEqual(
      client.getDefaultOptions().queries?.staleTime,
      5 * 60 * 1000,
      'Query staleTime should be 5 minutes'
    );
  });

  await t.test('invalidates queries and triggers refetch schedules', async () => {
    const client = new QueryClient();
    
    // Seed query cache with dummy query
    client.setQueryData(['borewells'], [{ id: 'bw-1', name: 'Borewell 1' }]);
    
    // Check initial query data
    const cached = client.getQueryData(['borewells']);
    assert.deepStrictEqual(cached, [{ id: 'bw-1', name: 'Borewell 1' }]);

    // Invalidate query
    let invalidated = false;
    client.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.query.queryKey[0] === 'borewells') {
        invalidated = true;
      }
    });

    await client.invalidateQueries({ queryKey: ['borewells'] });
    assert.ok(invalidated, 'Query should be marked for invalidation/refetch');
  });
});

test('Leaflet Marker Clustering Integration', async (t) => {
  // Dynamically load Leaflet and marker cluster post-mock-injection
  const L = (await import('leaflet')).default;
  (global as any).L = L;
  (windowMock as any).L = L;
  await import('leaflet.markercluster');

  await t.test('verifies leaflet.markercluster is registered', () => {
    assert.strictEqual(
      typeof (L as any).markerClusterGroup,
      'font-size' in document ? 'function' : 'function', // simple check to use document to avoid unused import if any
      'Leaflet.markercluster plugin must register markerClusterGroup function on L'
    );
    assert.strictEqual(typeof (L as any).markerClusterGroup, 'function');
  });

  await t.test('initializes markerClusterGroup and supports adding layers', () => {
    const group = (L as any).markerClusterGroup();
    assert.ok(group instanceof L.LayerGroup, 'MarkerClusterGroup must be a sub-class of L.LayerGroup');
    assert.strictEqual(typeof group.addLayer, 'function', 'MarkerClusterGroup must allow adding layers');
  });
});
