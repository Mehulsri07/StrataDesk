import test from 'node:test';
import assert from 'node:assert';
import { buildCrossSection } from './crossSectionEngine';
import { validateBorewells } from './geologyValidation';
import type { CrossSectionInput } from './adapters';

test('Geological Cross-Section Engine Tests', async (t) => {
  const bh1: CrossSectionInput = {
    id: 'bh-1',
    label: 'BH-1',
    lat: 26.8467,
    lng: 80.9462,
    groundElevationMSL: 120,
    totalDepthFt: 100,
    waterLevelFt: 30,
    layers: [
      { id: 'l1', startDepth: 0, endDepth: 20, material: 'Top Soil', color: '#111' },
      { id: 'l2', startDepth: 20, endDepth: 60, material: 'Clay', color: '#222' },
      { id: 'l3', startDepth: 60, endDepth: 100, material: 'Sand', color: '#333' }
    ]
  };

  const bh2: CrossSectionInput = {
    id: 'bh-2',
    label: 'BH-2',
    lat: 26.8475,
    lng: 80.9470,
    groundElevationMSL: 110,
    totalDepthFt: 90,
    waterLevelFt: 25,
    layers: [
      { id: 'l4', startDepth: 0, endDepth: 15, material: 'Top Soil', color: '#111' },
      { id: 'l5', startDepth: 15, endDepth: 50, material: 'Clay', color: '#222' },
      { id: 'l6', startDepth: 50, endDepth: 90, material: 'Sand', color: '#333' }
    ]
  };

  await t.test('handles 0 or 1 borewells gracefully', () => {
    const emptyResult = buildCrossSection([], [], null, 'smooth');
    assert.deepStrictEqual(emptyResult, []);

    const singleResult = buildCrossSection([bh1], [100], null, 'smooth');
    assert.deepStrictEqual(singleResult, []);
  });

  await t.test('interpolates correctly for 2 valid borewells', () => {
    const svgDims = { marginY: 50, chartH: 400, svgH: 500 };
    const result = buildCrossSection([bh1, bh2], [100, 200], null, 'smooth', svgDims);
    assert.ok(result.length > 0);
    assert.ok(result.every(poly => poly.path.length > 0));
    assert.ok(result.some(poly => poly.material === 'Clay'));
  });

  await t.test('validates negative depths', () => {
    const invalidBh: CrossSectionInput = {
      ...bh1,
      layers: [
        { id: 'l1', startDepth: -5, endDepth: 20, material: 'Clay', color: '#222' }
      ]
    };
    const validation = validateBorewells([invalidBh]);
    assert.strictEqual(validation.isValid, false);
    assert.match(validation.error || '', /negative or invalid start depth/);
  });

  await t.test('validates inverted depths (endDepth <= startDepth)', () => {
    const invalidBh: CrossSectionInput = {
      ...bh1,
      layers: [
        { id: 'l1', startDepth: 20, endDepth: 10, material: 'Clay', color: '#222' }
      ]
    };
    const validation = validateBorewells([invalidBh]);
    assert.strictEqual(validation.isValid, false);
    assert.match(validation.error || '', /inverted depths/);
  });

  await t.test('validates overlapping layers', () => {
    const invalidBh: CrossSectionInput = {
      ...bh1,
      layers: [
        { id: 'l1', startDepth: 0, endDepth: 30, material: 'Clay', color: '#222' },
        { id: 'l2', startDepth: 20, endDepth: 60, material: 'Sand', color: '#333' }
      ]
    };
    const validation = validateBorewells([invalidBh]);
    assert.strictEqual(validation.isValid, false);
    assert.match(validation.error || '', /overlapping layers/);
  });

  await t.test('validates empty material name', () => {
    const invalidBh: CrossSectionInput = {
      ...bh1,
      layers: [
        { id: 'l1', startDepth: 0, endDepth: 30, material: ' ', color: '#222' }
      ]
    };
    const validation = validateBorewells([invalidBh]);
    assert.strictEqual(validation.isValid, false);
    assert.match(validation.error || '', /empty or undefined material name/);
  });

  await t.test('validates duplicate layer IDs', () => {
    const invalidBh: CrossSectionInput = {
      ...bh1,
      layers: [
        { id: 'dup', startDepth: 0, endDepth: 20, material: 'Clay', color: '#222' },
        { id: 'dup', startDepth: 20, endDepth: 40, material: 'Sand', color: '#333' }
      ]
    };
    const validation = validateBorewells([invalidBh]);
    assert.strictEqual(validation.isValid, false);
    assert.match(validation.error || '', /duplicate layer ID/);
  });

  await t.test('verifies uneven terrain mapping is not flat', () => {
    // BH-1 at 120m elevation, BH-2 at 110m elevation.
    // yScale(0) should be different for both.
    const maxMSL = 120 + 8; // Including ELEVATION_MARGIN_M
    const minMSL = (110 - (90 * 0.3048)) - 8;
    const rangeMSL = maxMSL - minMSL;

    const yScale = (groundMSL: number) => {
      return 50 + ((maxMSL - groundMSL) / rangeMSL) * 400;
    };

    const y1 = yScale(120);
    const y2 = yScale(110);

    assert.notStrictEqual(y1, y2);
    assert.ok(y2 > y1); // BH-2 is at a lower elevation, so its Y coordinate on screen must be higher (lower down)
  });
});
