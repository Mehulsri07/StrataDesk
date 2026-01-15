/**
 * Property-based tests for ValidationService
 * Feature: strata-chart-extraction
 */

const fc = require('fast-check');
const { ValidationService } = require('../ValidationService');

describe('ValidationService', () => {
  let validator;

  beforeEach(() => {
    validator = new ValidationService();
  });

  describe('Depth Validation', () => {
    /**
     * Feature: strata-chart-extraction, Property 8: Invalid input rejection
     * Validates: Requirements 1.5, 2.2
     * 
     * For any file with missing or inconsistent depth values, the system should 
     * abort processing and provide specific error messages
     */
    test('Property 8: Invalid input rejection - empty depths rejected', () => {
      const result = validator.validateDepthSequence([]);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('Property 8: Invalid input rejection - null/undefined depths rejected', () => {
      const result1 = validator.validateDepthSequence(null);
      expect(result1.valid).toBe(false);
      
      const result2 = validator.validateDepthSequence(undefined);
      expect(result2.valid).toBe(false);
    });

    test('Property 8: Invalid input rejection - non-numeric values detected', () => {
      fc.assert(
        fc.property(
          fc.array(fc.oneof(
            fc.float({ min: 0, max: 500, noNaN: true }),
            fc.string(),
            fc.constant(null),
            fc.constant(undefined)
          ), { minLength: 5, maxLength: 20 }),
          (mixedValues) => {
            // Ensure at least one non-numeric value
            const hasNonNumeric = mixedValues.some(v => 
              typeof v !== 'number' || isNaN(v)
            );
            
            if (!hasNonNumeric) return true; // Skip if all numeric
            
            const result = validator.validateDepthSequence(mixedValues);
            
            // Should either be invalid or have errors/warnings about non-numeric values
            if (result.valid) {
              // If valid, should have filtered out non-numeric
              expect(result.stats.count).toBeLessThan(mixedValues.length);
            } else {
              expect(result.errors.length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property 8: Invalid input rejection - all non-numeric values rejected', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1 }), { minLength: 3, maxLength: 10 }),
          (stringValues) => {
            const result = validator.validateDepthSequence(stringValues);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('non-numeric') || e.includes('No valid'))).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Feature: strata-chart-extraction, Property 6: Depth resolution preservation
     * Validates: Requirements 3.4
     * 
     * For any file with variable depth increments, the system should maintain 
     * the original depth values without interpolation or modification
     */
    test('Property 6: Depth resolution preservation - original values preserved', () => {
      fc.assert(
        fc.property(
          fc.array(fc.float({ min: 0, max: 500, noNaN: true }), { minLength: 5, maxLength: 20 })
            .map(arr => [...new Set(arr)].sort((a, b) => a - b))
            .filter(arr => arr.length >= 5),
          (depths) => {
            const result = validator.validateDepthSequence(depths);
            
            // Validation should not modify the input
            expect(result.stats.count).toBe(depths.length);
            expect(result.stats.min).toBeCloseTo(Math.min(...depths), 5);
            expect(result.stats.max).toBeCloseTo(Math.max(...depths), 5);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property 6: Variable depth intervals are accepted', () => {
      fc.assert(
        fc.property(
          // Generate depths with variable intervals
          fc.array(fc.float({ min: 1, max: 50, noNaN: true }), { minLength: 5, maxLength: 15 }),
          (intervals) => {
            // Create depths from cumulative intervals
            const depths = [0];
            intervals.forEach(interval => {
              depths.push(depths[depths.length - 1] + interval);
            });
            
            const result = validator.validateDepthSequence(depths);
            
            // Should be valid even with variable intervals
            expect(result.valid).toBe(true);
            
            // Check interval consistency analysis
            const consistency = validator.checkDepthIntervalConsistency(depths);
            // Variable intervals should be detected
            expect(consistency.intervals.length).toBe(depths.length - 1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Layer Boundary Validation', () => {
    test('Valid layer boundaries pass validation', () => {
      fc.assert(
        fc.property(
          fc.array(fc.float({ min: 0, max: 500, noNaN: true }), { minLength: 4, maxLength: 10 })
            .map(arr => [...new Set(arr)].sort((a, b) => a - b))
            .filter(arr => arr.length >= 4),
          fc.array(fc.constantFrom('Clay', 'Sand', 'Gravel'), { minLength: 2, maxLength: 5 }),
          (depths, materials) => {
            // Create non-overlapping layers
            const layers = [];
            const layerCount = Math.min(materials.length, Math.floor(depths.length / 2));
            
            for (let i = 0; i < layerCount; i++) {
              const startIdx = i * 2;
              const endIdx = Math.min(startIdx + 1, depths.length - 1);
              layers.push({
                material: materials[i],
                start_depth: depths[startIdx],
                end_depth: depths[endIdx]
              });
            }
            
            const result = validator.validateLayerBoundaries(layers);
            expect(result.valid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Overlapping layers generate warnings', () => {
      const layers = [
        { material: 'Clay', start_depth: 0, end_depth: 15 },
        { material: 'Sand', start_depth: 10, end_depth: 25 } // Overlaps with Clay
      ];
      
      const result = validator.validateLayerBoundaries(layers);
      expect(result.warnings.some(w => w.includes('overlap'))).toBe(true);
    });

    test('Inverted boundaries (start > end) generate errors', () => {
      const layers = [
        { material: 'Clay', start_depth: 20, end_depth: 10 } // Invalid
      ];
      
      const result = validator.validateLayerBoundaries(layers);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('start depth') && e.includes('end depth'))).toBe(true);
    });
  });

  describe('Missing Depth Detection', () => {
    test('Detects missing depths in regular sequence', () => {
      // Depths with a gap: 0, 5, 10, 20, 25 (missing 15)
      const depths = [0, 5, 10, 20, 25];
      const expectedInterval = 5;
      
      const result = validator.detectMissingDepths(depths, expectedInterval);
      
      expect(result.missing).toContain(15);
    });

    test('No false positives for complete sequences', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }), // interval
          fc.integer({ min: 5, max: 20 }), // count
          (interval, count) => {
            // Create complete sequence
            const depths = Array.from({ length: count }, (_, i) => i * interval);
            
            const result = validator.detectMissingDepths(depths, interval);
            
            // Should find no missing depths
            expect(result.missing.length).toBe(0);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
