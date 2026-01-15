/**
 * Property-based tests for StrataExtractor
 * Feature: strata-chart-extraction
 */

const fc = require('fast-check');
const { StrataExtractor } = require('../StrataExtractor');

describe('StrataExtractor', () => {
  let extractor;

  beforeEach(() => {
    extractor = new StrataExtractor();
  });

  describe('Layer Boundary Detection', () => {
    /**
     * Feature: strata-chart-extraction, Property 2: Layer boundary precision
     * Validates: Requirements 1.2, 3.2
     * 
     * For any strata chart with defined material transitions, extracted layer 
     * boundaries should match the original depth intervals exactly
     */
    test('Property 2: Layer boundary precision - boundaries match depth intervals', () => {
      fc.assert(
        fc.property(
          // Generate sorted depths
          fc.array(fc.float({ min: 0, max: 500, noNaN: true }), { minLength: 5, maxLength: 20 })
            .map(arr => [...new Set(arr)].sort((a, b) => a - b))
            .filter(arr => arr.length >= 3),
          // Generate materials with some transitions
          fc.array(fc.constantFrom('Clay', 'Sand', 'Gravel', 'Silt', 'Rock'), { minLength: 5, maxLength: 20 }),
          (depths, materials) => {
            const len = Math.min(depths.length, materials.length);
            const trimmedDepths = depths.slice(0, len);
            const trimmedMaterials = materials.slice(0, len);
            
            const rawData = {
              depths: trimmedDepths,
              materials: trimmedMaterials,
              colors: new Array(len).fill(null)
            };
            
            const layers = extractor.detectMaterialLayers(rawData);
            
            if (layers.length === 0) return true; // Skip if no layers detected
            
            // First layer should start at first depth
            expect(layers[0].start_depth).toBe(trimmedDepths[0]);
            
            // Last layer should end at last depth
            expect(layers[layers.length - 1].end_depth).toBe(trimmedDepths[len - 1]);
            
            // Each layer's boundaries should be actual depth values from input
            layers.forEach(layer => {
              expect(trimmedDepths).toContain(layer.start_depth);
              expect(trimmedDepths).toContain(layer.end_depth);
              expect(layer.start_depth).toBeLessThanOrEqual(layer.end_depth);
            });
            
            // Adjacent layers should have matching boundaries (no gaps)
            for (let i = 1; i < layers.length; i++) {
              const prevEnd = layers[i - 1].end_depth;
              const currStart = layers[i].start_depth;
              // Current layer starts at or after previous layer ends
              expect(currStart).toBeGreaterThanOrEqual(prevEnd);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: strata-chart-extraction, Property 4: Continuous layer detection
     * Validates: Requirements 3.1
     * 
     * For any sequence of contiguous cells with identical material, the system 
     * should create a single layer spanning the entire sequence
     */
    test('Property 4: Continuous layer detection - same material creates single layer', () => {
      fc.assert(
        fc.property(
          fc.array(fc.float({ min: 0, max: 500, noNaN: true }), { minLength: 5, maxLength: 20 })
            .map(arr => [...new Set(arr)].sort((a, b) => a - b))
            .filter(arr => arr.length >= 5),
          fc.constantFrom('Clay', 'Sand', 'Gravel', 'Silt', 'Rock'),
          (depths, singleMaterial) => {
            // All same material
            const materials = new Array(depths.length).fill(singleMaterial);
            
            const rawData = {
              depths,
              materials,
              colors: new Array(depths.length).fill(null)
            };
            
            const layers = extractor.detectMaterialLayers(rawData);
            
            // Should create exactly one layer
            expect(layers.length).toBe(1);
            
            // Layer should span entire depth range
            expect(layers[0].start_depth).toBe(depths[0]);
            expect(layers[0].end_depth).toBe(depths[depths.length - 1]);
            expect(layers[0].material).toBe(singleMaterial);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: strata-chart-extraction, Property 5: Discontinuous layer separation
     * Validates: Requirements 3.3
     * 
     * For any material appearing in multiple non-contiguous sections, the system 
     * should create separate layer records for each continuous section
     */
    test('Property 5: Discontinuous layer separation - same material in non-contiguous sections creates separate layers', () => {
      fc.assert(
        fc.property(
          fc.array(fc.float({ min: 0, max: 500, noNaN: true }), { minLength: 9, maxLength: 20 })
            .map(arr => [...new Set(arr)].sort((a, b) => a - b))
            .filter(arr => arr.length >= 9),
          (depths) => {
            // Create pattern: Clay, Clay, Clay, Sand, Sand, Sand, Clay, Clay, Clay
            // This should create 3 layers: Clay, Sand, Clay
            const len = depths.length;
            const third = Math.floor(len / 3);
            
            const materials = [
              ...new Array(third).fill('Clay'),
              ...new Array(third).fill('Sand'),
              ...new Array(len - 2 * third).fill('Clay')
            ];
            
            const rawData = {
              depths,
              materials,
              colors: new Array(len).fill(null)
            };
            
            const layers = extractor.detectMaterialLayers(rawData);
            
            // Should create exactly 3 layers
            expect(layers.length).toBe(3);
            
            // First and third layers should both be Clay (separate records)
            expect(layers[0].material).toBe('Clay');
            expect(layers[1].material).toBe('Sand');
            expect(layers[2].material).toBe('Clay');
            
            // They should be separate layer objects
            expect(layers[0]).not.toBe(layers[2]);
            
            // Boundaries should be correct
            expect(layers[0].end_depth).toBeLessThan(layers[1].start_depth);
            expect(layers[1].end_depth).toBeLessThan(layers[2].start_depth);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property 5: Multiple discontinuous sections create correct number of layers', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 5 }), // Number of alternations
          fc.array(fc.float({ min: 0, max: 500, noNaN: true }), { minLength: 10, maxLength: 30 })
            .map(arr => [...new Set(arr)].sort((a, b) => a - b))
            .filter(arr => arr.length >= 10),
          (alternations, depths) => {
            // Create alternating pattern
            const segmentSize = Math.floor(depths.length / (alternations * 2));
            if (segmentSize < 1) return true; // Skip if not enough depths
            
            const materials = [];
            for (let i = 0; i < depths.length; i++) {
              const segment = Math.floor(i / segmentSize);
              materials.push(segment % 2 === 0 ? 'Clay' : 'Sand');
            }
            
            const rawData = {
              depths,
              materials,
              colors: new Array(depths.length).fill(null)
            };
            
            const layers = extractor.detectMaterialLayers(rawData);
            
            // Count actual transitions in materials
            let expectedLayers = 1;
            for (let i = 1; i < materials.length; i++) {
              if (materials[i] !== materials[i - 1]) {
                expectedLayers++;
              }
            }
            
            expect(layers.length).toBe(expectedLayers);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Confidence Assignment', () => {
    test('Layers with text get high confidence', () => {
      const layers = [
        { material: 'Clay', start_depth: 0, end_depth: 10, has_text: true, has_color: false },
        { material: 'Sand', start_depth: 10, end_depth: 20, has_text: true, has_color: true }
      ];
      
      const result = extractor.assignConfidenceLevels(layers, {});
      
      expect(result[0].confidence).toBe('high');
      expect(result[1].confidence).toBe('high');
    });

    test('Layers with only color get medium confidence', () => {
      const layers = [
        { material: 'color:#FF0000', start_depth: 0, end_depth: 10, has_text: false, has_color: true }
      ];
      
      const result = extractor.assignConfidenceLevels(layers, {});
      
      expect(result[0].confidence).toBe('medium');
    });
  });
});


describe('Format Consistency', () => {
  /**
   * Feature: strata-chart-extraction, Property 9: Format consistency
   * Validates: Requirements 2.3
   * 
   * For any successfully processed file (Excel or PDF), the output structure 
   * should be identical regardless of input format
   */
  test('Property 9: Format consistency - output structure is consistent', () => {
    const extractor = new StrataExtractor();
    
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: 0, max: 500, noNaN: true }), { minLength: 3, maxLength: 15 })
          .map(arr => [...new Set(arr)].sort((a, b) => a - b))
          .filter(arr => arr.length >= 3),
        fc.array(fc.constantFrom('Clay', 'Sand', 'Gravel', 'Silt', 'Rock'), { minLength: 3, maxLength: 15 }),
        fc.constantFrom('excel', 'pdf'),
        (depths, materials, fileType) => {
          const len = Math.min(depths.length, materials.length);
          const trimmedDepths = depths.slice(0, len);
          const trimmedMaterials = materials.slice(0, len);
          
          // Simulate raw data from either format
          const rawData = {
            depths: trimmedDepths,
            materials: trimmedMaterials,
            colors: new Array(len).fill(null),
            depthUnit: 'feet'
          };
          
          const layers = extractor.detectMaterialLayers(rawData);
          const layersWithConfidence = extractor.assignConfidenceLevels(layers, rawData);
          
          // Generate draft record with different source types
          const result = extractor.generateDraftRecord(layersWithConfidence, {
            filename: `test.${fileType === 'excel' ? 'xlsx' : 'pdf'}`,
            fileType,
            depth_unit: 'feet',
            depth_resolution: 5,
            total_depth: Math.max(...trimmedDepths),
            extraction_timestamp: new Date().toISOString(),
            processing_time_ms: 100
          });
          
          // Verify consistent output structure
          expect(result).toHaveProperty('success');
          expect(result).toHaveProperty('layers');
          expect(result).toHaveProperty('metadata');
          expect(result).toHaveProperty('errors');
          expect(result).toHaveProperty('warnings');
          
          // Each layer should have consistent structure
          result.layers.forEach(layer => {
            expect(layer).toHaveProperty('id');
            expect(layer).toHaveProperty('material');
            expect(layer).toHaveProperty('start_depth');
            expect(layer).toHaveProperty('end_depth');
            expect(layer).toHaveProperty('confidence');
            expect(layer).toHaveProperty('source');
            expect(layer).toHaveProperty('user_edited');
            
            // Source should match file type
            if (fileType === 'excel') {
              expect(layer.source).toBe('excel-import');
            } else {
              expect(layer.source).toBe('pdf-import');
            }
          });
          
          // Metadata should have consistent structure
          expect(result.metadata).toHaveProperty('filename');
          expect(result.metadata).toHaveProperty('depth_unit');
          expect(result.metadata).toHaveProperty('extraction_timestamp');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 9: Same data produces same layers regardless of source format', () => {
    const extractor = new StrataExtractor();
    
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: 0, max: 500, noNaN: true }), { minLength: 5, maxLength: 15 })
          .map(arr => [...new Set(arr)].sort((a, b) => a - b))
          .filter(arr => arr.length >= 5),
        fc.array(fc.constantFrom('Clay', 'Sand', 'Gravel'), { minLength: 5, maxLength: 15 }),
        (depths, materials) => {
          const len = Math.min(depths.length, materials.length);
          const trimmedDepths = depths.slice(0, len);
          const trimmedMaterials = materials.slice(0, len);
          
          // Same raw data, different "sources"
          const rawData = {
            depths: trimmedDepths,
            materials: trimmedMaterials,
            colors: new Array(len).fill(null)
          };
          
          const layers = extractor.detectMaterialLayers(rawData);
          
          // Generate results for both formats
          const excelResult = extractor.generateDraftRecord(
            extractor.assignConfidenceLevels(layers, rawData),
            { filename: 'test.xlsx', fileType: 'excel', depth_unit: 'feet', depth_resolution: 5, total_depth: 100, extraction_timestamp: '2024-01-01', processing_time_ms: 50 }
          );
          
          const pdfResult = extractor.generateDraftRecord(
            extractor.assignConfidenceLevels(layers, rawData),
            { filename: 'test.pdf', fileType: 'pdf', depth_unit: 'feet', depth_resolution: 5, total_depth: 100, extraction_timestamp: '2024-01-01', processing_time_ms: 50 }
          );
          
          // Same number of layers
          expect(excelResult.layers.length).toBe(pdfResult.layers.length);
          
          // Same layer boundaries and materials (ignoring source field)
          for (let i = 0; i < excelResult.layers.length; i++) {
            expect(excelResult.layers[i].material).toBe(pdfResult.layers[i].material);
            expect(excelResult.layers[i].start_depth).toBe(pdfResult.layers[i].start_depth);
            expect(excelResult.layers[i].end_depth).toBe(pdfResult.layers[i].end_depth);
            expect(excelResult.layers[i].confidence).toBe(pdfResult.layers[i].confidence);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});


describe('Confidence Assignment Properties', () => {
  /**
   * Feature: strata-chart-extraction, Property 7: Confidence assignment logic
   * Validates: Requirements 3.5
   * 
   * For any extracted layer, confidence level should be "high" when both text 
   * and color are present, "medium" when only one signal is available
   */
  test('Property 7: Confidence assignment logic - text and color = high', () => {
    const extractor = new StrataExtractor();
    
    fc.assert(
      fc.property(
        fc.constantFrom('Clay', 'Sand', 'Gravel', 'Silt', 'Rock'),
        fc.constantFrom('#FF0000', '#00FF00', '#0000FF'),
        fc.float({ min: 0, max: 100, noNaN: true }),
        fc.float({ min: 100, max: 200, noNaN: true }),
        (material, color, startDepth, endDepth) => {
          const layers = [{
            material,
            start_depth: startDepth,
            end_depth: endDepth,
            has_text: true,
            has_color: true,
            original_color: color
          }];
          
          const result = extractor.assignConfidenceLevels(layers, {});
          
          expect(result[0].confidence).toBe('high');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 7: Confidence assignment logic - text only = high', () => {
    const extractor = new StrataExtractor();
    
    fc.assert(
      fc.property(
        fc.constantFrom('Clay', 'Sand', 'Gravel', 'Silt', 'Rock'),
        fc.float({ min: 0, max: 100, noNaN: true }),
        fc.float({ min: 100, max: 200, noNaN: true }),
        (material, startDepth, endDepth) => {
          const layers = [{
            material,
            start_depth: startDepth,
            end_depth: endDepth,
            has_text: true,
            has_color: false
          }];
          
          const result = extractor.assignConfidenceLevels(layers, {});
          
          expect(result[0].confidence).toBe('high');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 7: Confidence assignment logic - color only = medium', () => {
    const extractor = new StrataExtractor();
    
    fc.assert(
      fc.property(
        fc.constantFrom('#FF0000', '#00FF00', '#0000FF', '#FFFF00'),
        fc.float({ min: 0, max: 100, noNaN: true }),
        fc.float({ min: 100, max: 200, noNaN: true }),
        (color, startDepth, endDepth) => {
          const layers = [{
            material: `color:${color}`,
            start_depth: startDepth,
            end_depth: endDepth,
            has_text: false,
            has_color: true,
            original_color: color
          }];
          
          const result = extractor.assignConfidenceLevels(layers, {});
          
          expect(result[0].confidence).toBe('medium');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: strata-chart-extraction, Property 10: User edit confidence update
   * Validates: Requirements 4.4
   * 
   * For any layer modified during review, the confidence level should be 
   * updated to "high" after user confirmation
   */
  test('Property 10: User edit confidence update - edited layers become high confidence', () => {
    const extractor = new StrataExtractor();
    
    fc.assert(
      fc.property(
        fc.constantFrom('Clay', 'Sand', 'Gravel', 'Silt', 'Rock'),
        fc.constantFrom('medium', 'high'),
        fc.float({ min: 0, max: 100, noNaN: true }),
        fc.float({ min: 100, max: 200, noNaN: true }),
        (material, originalConfidence, startDepth, endDepth) => {
          const layer = {
            material,
            start_depth: startDepth,
            end_depth: endDepth,
            confidence: originalConfidence,
            user_edited: false
          };
          
          const updatedLayer = extractor.updateConfidenceForEdit(layer);
          
          // After edit, confidence should be high
          expect(updatedLayer.confidence).toBe('high');
          // user_edited flag should be true
          expect(updatedLayer.user_edited).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 10: User edits preserve other layer properties', () => {
    const extractor = new StrataExtractor();
    
    fc.assert(
      fc.property(
        fc.constantFrom('Clay', 'Sand', 'Gravel'),
        fc.float({ min: 0, max: 100, noNaN: true }),
        fc.float({ min: 100, max: 200, noNaN: true }),
        fc.constantFrom('#FF0000', '#00FF00', null),
        (material, startDepth, endDepth, color) => {
          const layer = {
            material,
            start_depth: startDepth,
            end_depth: endDepth,
            confidence: 'medium',
            user_edited: false,
            original_color: color,
            source: 'excel-import'
          };
          
          const updatedLayer = extractor.updateConfidenceForEdit(layer);
          
          // Original properties should be preserved
          expect(updatedLayer.material).toBe(material);
          expect(updatedLayer.start_depth).toBe(startDepth);
          expect(updatedLayer.end_depth).toBe(endDepth);
          expect(updatedLayer.original_color).toBe(color);
          expect(updatedLayer.source).toBe('excel-import');
        }
      ),
      { numRuns: 100 }
    );
  });
});
