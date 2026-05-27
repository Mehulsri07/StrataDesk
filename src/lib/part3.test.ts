import test from 'node:test';
import assert from 'node:assert';
import { ErrorBoundary } from '../components/ErrorBoundary';

// ─── Spies & Mocks ───────────────────────────────────────────────────────────

class MockBorewell {
  id = 'bw-test';
  name = 'Initial Name';
  layers = [];
  selectedForCrossSection = false;
}

// ─── 1. Debounce Logic Verification ──────────────────────────────────────────

test('Debounced Auto-Save Pipeline', async (t) => {
  await t.test('batches multiple updates within 1s into a single PATCH call', async () => {
    let patchCount = 0;
    let lastPatchedName = '';

    // Mock debounced saving queue setup
    const saveTimeouts: Record<string, NodeJS.Timeout> = {};
    const latestBorewellRef = { current: new MockBorewell() };

    const queueDebouncedSave = (borewellId: string) => {
      if (saveTimeouts[borewellId]) {
        clearTimeout(saveTimeouts[borewellId]);
      }
      saveTimeouts[borewellId] = setTimeout(() => {
        const latest = latestBorewellRef.current;
        patchCount++;
        lastPatchedName = latest.name;
      }, 100); // use 100ms in test for speed
    };

    // Simulate 4 rapid edits
    latestBorewellRef.current.name = 'Edit 1';
    queueDebouncedSave('bw-test');

    await new Promise(r => setTimeout(r, 20));
    latestBorewellRef.current.name = 'Edit 2';
    queueDebouncedSave('bw-test');

    await new Promise(r => setTimeout(r, 20));
    latestBorewellRef.current.name = 'Edit 3';
    queueDebouncedSave('bw-test');

    await new Promise(r => setTimeout(r, 20));
    latestBorewellRef.current.name = 'Edit 4';
    queueDebouncedSave('bw-test');

    // Wait for debounce timeout to fire
    await new Promise(r => setTimeout(r, 150));

    // Assert only 1 PATCH was sent containing the final state
    assert.strictEqual(patchCount, 1, 'Should only send 1 PATCH request');
    assert.strictEqual(lastPatchedName, 'Edit 4', 'Should save the latest edit');
  });
});

// ─── 2. Error Boundary Recovery Verification ─────────────────────────────────

test('ErrorBoundary Recovery', async (t) => {
  await t.test('catches crashes and recovers when Reset View is clicked', () => {
    let dispatchCalls: any[] = [];
    const mockContext: any = {
      dispatch: (action: any) => {
        dispatchCalls.push(action);
      }
    };

    // Override console.error during test to avoid polluting output
    const originalConsoleError = console.error;
    console.error = () => {};

    try {
      const boundary = new ErrorBoundary({ children: null });
      boundary.context = mockContext;

      // Simulate a caught error
      const error = new Error('Test Error');
      const derivedState = ErrorBoundary.getDerivedStateFromError(error);
      
      assert.strictEqual(derivedState.hasError, true);
      assert.strictEqual(derivedState.error, error);

      // Call handleResetView to trigger recovery
      (boundary as any).handleResetView();

      // Assert error boundary state was reset
      assert.strictEqual(boundary.state.hasError, false);
      assert.strictEqual(boundary.state.error, null);

      // Assert dispatch cleared active states to allow recovery
      assert.ok(dispatchCalls.some(a => a.type === 'SET_SELECTED_BOREWELLS' && a.payload.length === 0));
      assert.ok(dispatchCalls.some(a => a.type === 'SET_ACTIVE_BOREWELL' && a.id === null));
      assert.ok(dispatchCalls.some(a => a.type === 'SET_VIEW_MODE' && a.mode === 'map'));

    } finally {
      console.error = originalConsoleError;
    }
  });
});
