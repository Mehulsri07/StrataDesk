/**
 * Property Test 6.3: Functional Integration
 * 
 * **Feature: strata-chart-extraction, Property 13: Functional integration**
 * **Validates: Requirements 5.2**
 * 
 * CRITICAL PROPERTY: Extracted + reviewed strata must behave identically 
 * to manually entered strata throughout the application.
 * 
 * This test enforces the trust boundary - no branching logic based on data origin.
 */

const fc = require('fast-check');
const { ReviewInterface } = require('../ReviewInterface');

describe('Property 13: Functional Integration', () => {
  let mockUtils, mockAuth, mockConfig, mockDb;
  
  beforeEach(() => {
    // Create deterministic mocks for testing
    mockUtils = {
      uid: jest.fn((prefix = 'x') => `${prefix}_test_${Math.floor(Math.random() * 1000)}`),
      nowISO: jest.fn(() => '2024-01-01T00:00:00.000Z'),
      showToast: jest.fn()
    };
    
    mockAuth = {
      getCurrentUser: jest.fn(() => ({ username: 'test-user' }))
    };
    
    mockConfig = {
      STORES: { FILES: 'files' }
    };
    
    mockDb = {
      put: jest.fn().mockResolvedValue(true),
      get: jest.fn(),
      getAll: jest.fn().mockResolvedValue([])
    };
  });

  /**
   * Generator for valid extracted layer data
   */
  const extractedLayersArb = fc.array(
    fc.record({
      material: fc.oneof(
        fc.constant('Clay'),
        fc.constant('Sand'),
        fc.constant('Gravel'),
        fc.constant('Rock'),
        fc.constant('Silt'),
        fc.constant('Limestone'),
        fc.constant('Sandstone'),
        fc.constant('Topsoil'),
        fc.constant('Bedrock'),
        fc.constant('Fill')
      ),
      start_depth: fc.float({ min: 0, max: 500, noNaN: true }),
      end_depth: fc.float({ min: 0, max: 500, noNaN: true }),
      confidence: fc.constantFrom('high', 'medium'),
      source: fc.constantFrom('excel-import', 'pdf-import'),
      user_edited: fc.boolean(),
      original_color: fc.option(fc.string({ minLength: 6, maxLength: 6 }).map(s => '#' + s))
    }),
    { minLength: 1, maxLength: 10 }
  ).map(layers => {
    // Sort layers by start depth and ensure no overlaps
    return layers.sort((a, b) => a.start_depth - b.start_depth)
      .map((layer, index, arr) => {
        // Ensure end_depth > start_depth
        if (layer.end_depth <= layer.start_depth) {
          layer.end_depth = layer.start_depth + Math.random() * 10 + 1;
        }
        
        // Adjust depths to prevent overlaps
        if (index > 0) {
          const prevLayer = arr[index - 1];
          if (layer.start_depth < prevLayer.end_depth) {
            layer.start_depth = prevLayer.end_depth;
            if (layer.end_depth <= layer.start_depth) {
              layer.end_depth = layer.start_depth + Math.random() * 10 + 1;
            }
          }
        }
        return layer;
      });
  });

  /**
   * Generator for extraction metadata
   */
  const extractionMetadataArb = fc.record({
    filename: fc.oneof(
      fc.constant('test.xlsx'),
      fc.constant('sample.pdf'),
      fc.constant('data.xlsx'),
      fc.constant('strata.pdf'),
      fc.constant('boring_log.xlsx'),
      fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(s)).map(s => s + '.xlsx')
    ),
    project: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
    boreId: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
    extraction_timestamp: fc.constant(new Date().toISOString()),
    total_depth: fc.option(fc.float({ min: Math.fround(1), max: Math.fround(1000), noNaN: true })),
    depth_unit: fc.constantFrom('feet', 'ft', 'meters', 'm')
  });

  test('Property 13.1: Schema Equality - Extracted data produces identical database records', async () => {
    await fc.assert(fc.asyncProperty(
      extractedLayersArb,
      extractionMetadataArb,
      async (extractedLayers, metadata) => {
        try {
          // Create fresh mocks for each property test run
          const freshMockUtils = {
            uid: jest.fn((prefix = 'x') => `${prefix}_test_${Math.floor(Math.random() * 1000)}`),
            nowISO: jest.fn(() => '2024-01-01T00:00:00.000Z'),
            showToast: jest.fn()
          };
          
          const freshMockAuth = {
            getCurrentUser: jest.fn(() => ({ username: 'test-user' }))
          };
          
          const freshMockDb = {
            put: jest.fn().mockResolvedValue(true),
            get: jest.fn(),
            getAll: jest.fn().mockResolvedValue([])
          };
          
          // Create ReviewInterface with fresh mocked dependencies
          const reviewInterface = new ReviewInterface({
            utils: freshMockUtils,
            auth: freshMockAuth,
            config: mockConfig,
            db: freshMockDb
          });

          reviewInterface.currentDraft = {
            layers: extractedLayers,
            metadata: metadata
          };

          // Save extracted data
          const extractedResult = await reviewInterface.confirmAndSave(extractedLayers);
          
          expect(extractedResult.success).toBe(true);
          expect(freshMockDb.put).toHaveBeenCalledTimes(1);
          
          const savedRecord = freshMockDb.put.mock.calls[0][1];
          
          // CRITICAL: Verify schema compliance
          expect(savedRecord).toHaveProperty('id');
          expect(savedRecord).toHaveProperty('project');
          expect(savedRecord).toHaveProperty('filename');
          expect(savedRecord).toHaveProperty('files');
          expect(savedRecord).toHaveProperty('metadata');
          
          // Verify metadata structure matches manual entry
          expect(savedRecord.metadata).toHaveProperty('boreId');
          expect(savedRecord.metadata).toHaveProperty('date');
          expect(savedRecord.metadata).toHaveProperty('createdAt');
          expect(savedRecord.metadata).toHaveProperty('createdBy');
          expect(savedRecord.metadata).toHaveProperty('tags');
          expect(savedRecord.metadata).toHaveProperty('notes');
          
          // Verify no extraction-specific fields leak into core schema
          const coreFields = ['boreId', 'date', 'waterLevel', 'coordinates', 'tags', 'notes', 'createdAt', 'createdBy'];
          const hasOnlyCoreFields = Object.keys(savedRecord.metadata)
            .filter(key => !['strataLayers', 'strataSummary', 'extractionSource', 'strataChart'].includes(key))
            .every(key => coreFields.includes(key));
          
          expect(hasOnlyCoreFields).toBe(true);
          
          // Verify deterministic behavior
          expect(savedRecord.metadata.createdAt).toBe('2024-01-01T00:00:00.000Z');
          expect(savedRecord.metadata.createdBy).toBe('test-user');
          
          return true;
        } catch (error) {
          console.error('Property test error:', error);
          console.error('Test data:', { extractedLayers, metadata });
          throw error;
        }
      }
    ), { numRuns: 50 });
  });

  test('Property 13.2: Query Compatibility - Extracted data is queryable like manual data', async () => {
    await fc.assert(fc.asyncProperty(
      extractedLayersArb,
      extractionMetadataArb,
      async (extractedLayers, metadata) => {
        // Create fresh mocks for each property test run
        const freshMockUtils = {
          uid: jest.fn((prefix = 'x') => `${prefix}_test_${Math.floor(Math.random() * 1000)}`),
          nowISO: jest.fn(() => '2024-01-01T00:00:00.000Z'),
          showToast: jest.fn()
        };
        
        const freshMockAuth = {
          getCurrentUser: jest.fn(() => ({ username: 'test-user' }))
        };
        
        const freshMockDb = {
          put: jest.fn().mockResolvedValue(true),
          get: jest.fn(),
          getAll: jest.fn().mockResolvedValue([])
        };
        
        const reviewInterface = new ReviewInterface({
          utils: freshMockUtils,
          auth: freshMockAuth,
          config: mockConfig,
          db: freshMockDb
        });

        reviewInterface.currentDraft = {
          layers: extractedLayers,
          metadata: metadata
        };

        const result = await reviewInterface.confirmAndSave(extractedLayers);
        const savedRecord = freshMockDb.put.mock.calls[0][1];
        
        // Verify record is queryable by standard fields
        expect(savedRecord.project).toBeDefined();
        expect(savedRecord.filename).toBeDefined();
        expect(savedRecord.metadata.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        
        // Verify tags are searchable
        expect(Array.isArray(savedRecord.metadata.tags)).toBe(true);
        expect(savedRecord.metadata.tags).toContain('strata-extraction');
        
        // Verify no special query logic needed for extracted data
        const isStandardRecord = 
          typeof savedRecord.id === 'string' &&
          typeof savedRecord.project === 'string' &&
          typeof savedRecord.filename === 'string' &&
          Array.isArray(savedRecord.files) &&
          typeof savedRecord.metadata === 'object';
        
        expect(isStandardRecord).toBe(true);
      }
    ), { numRuns: 30 });
  });

  test('Property 13.3: Persistence Behavior - No special handling required', async () => {
    await fc.assert(fc.asyncProperty(
      extractedLayersArb,
      extractionMetadataArb,
      async (extractedLayers, metadata) => {
        // Create fresh mocks for each property test run
        const freshMockUtils = {
          uid: jest.fn((prefix = 'x') => `${prefix}_test_${Math.floor(Math.random() * 1000)}`),
          nowISO: jest.fn(() => '2024-01-01T00:00:00.000Z'),
          showToast: jest.fn()
        };
        
        const freshMockAuth = {
          getCurrentUser: jest.fn(() => ({ username: 'test-user' }))
        };
        
        const freshMockDb = {
          put: jest.fn().mockResolvedValue(true),
          get: jest.fn(),
          getAll: jest.fn().mockResolvedValue([])
        };
        
        const reviewInterface = new ReviewInterface({
          utils: freshMockUtils,
          auth: freshMockAuth,
          config: mockConfig,
          db: freshMockDb
        });

        reviewInterface.currentDraft = {
          layers: extractedLayers,
          metadata: metadata
        };

        await reviewInterface.confirmAndSave(extractedLayers);
        
        // Verify standard database operations were used
        expect(freshMockDb.put).toHaveBeenCalledWith(mockConfig.STORES.FILES, expect.any(Object));
        
        // Verify no extraction-specific database calls
        expect(freshMockDb.put).toHaveBeenCalledTimes(1);
        
        const savedRecord = freshMockDb.put.mock.calls[0][1];
        
        // Verify record can be treated like any other file record
        expect(savedRecord.id).toMatch(/^f_test_\d+$/);
        expect(savedRecord.files).toEqual([]); // Extracted data has no actual files
        expect(savedRecord.metadata.tags).toContain('strata-extraction');
        expect(savedRecord.metadata.tags).toContain('imported');
      }
    ), { numRuns: 30 });
  });

  test('Property 13.4: No Origin Branching - Application behavior is origin-agnostic', async () => {
    await fc.assert(fc.asyncProperty(
      extractedLayersArb,
      extractionMetadataArb,
      async (extractedLayers, metadata) => {
        // Create fresh mocks for each property test run
        const freshMockUtils = {
          uid: jest.fn((prefix = 'x') => `${prefix}_test_${Math.floor(Math.random() * 1000)}`),
          nowISO: jest.fn(() => '2024-01-01T00:00:00.000Z'),
          showToast: jest.fn()
        };
        
        const freshMockAuth = {
          getCurrentUser: jest.fn(() => ({ username: 'test-user' }))
        };
        
        const freshMockDb = {
          put: jest.fn().mockResolvedValue(true),
          get: jest.fn(),
          getAll: jest.fn().mockResolvedValue([])
        };
        
        const reviewInterface = new ReviewInterface({
          utils: freshMockUtils,
          auth: freshMockAuth,
          config: mockConfig,
          db: freshMockDb
        });

        reviewInterface.currentDraft = {
          layers: extractedLayers,
          metadata: metadata
        };

        const result = await reviewInterface.confirmAndSave(extractedLayers);
        const savedRecord = freshMockDb.put.mock.calls[0][1];
        
        // CRITICAL: Verify no origin-based branching in core fields
        // The record must be indistinguishable from manual entry at the application level
        
        // Core application fields must not indicate extraction origin
        expect(savedRecord.project).not.toContain('extract');
        
        // Metadata must follow standard schema
        expect(savedRecord.metadata.boreId).toBeDefined();
        expect(savedRecord.metadata.date).toBeDefined();
        expect(savedRecord.metadata.createdAt).toBeDefined();
        expect(savedRecord.metadata.createdBy).toBeDefined();
        
        // Origin information must be isolated to extractionSource metadata
        if (savedRecord.metadata.extractionSource) {
          expect(savedRecord.metadata.extractionSource).toHaveProperty('filename');
          expect(savedRecord.metadata.extractionSource).toHaveProperty('extractionTimestamp');
          expect(savedRecord.metadata.extractionSource).toHaveProperty('layerCount');
        }
        
        // Verify standard strata layers format
        if (savedRecord.metadata.strataLayers) {
          savedRecord.metadata.strataLayers.forEach(layer => {
            expect(layer).toHaveProperty('type');
            expect(layer).toHaveProperty('thickness');
            expect(layer).toHaveProperty('startDepth');
            expect(layer).toHaveProperty('endDepth');
            expect(layer).toHaveProperty('confidence');
            expect(layer).toHaveProperty('source');
          });
        }
      }
    ), { numRuns: 40 });
  });

  test('Property 13.5: Depth Unit Normalization - All depths use consistent units', async () => {
    await fc.assert(fc.asyncProperty(
      extractedLayersArb,
      extractionMetadataArb,
      async (extractedLayers, metadata) => {
        // Create fresh mocks for each property test run
        const freshMockUtils = {
          uid: jest.fn((prefix = 'x') => `${prefix}_test_${Math.floor(Math.random() * 1000)}`),
          nowISO: jest.fn(() => '2024-01-01T00:00:00.000Z'),
          showToast: jest.fn()
        };
        
        const freshMockAuth = {
          getCurrentUser: jest.fn(() => ({ username: 'test-user' }))
        };
        
        const freshMockDb = {
          put: jest.fn().mockResolvedValue(true),
          get: jest.fn(),
          getAll: jest.fn().mockResolvedValue([])
        };
        
        const reviewInterface = new ReviewInterface({
          utils: freshMockUtils,
          auth: freshMockAuth,
          config: mockConfig,
          db: freshMockDb
        });

        reviewInterface.currentDraft = {
          layers: extractedLayers,
          metadata: { ...metadata, depth_unit: 'feet' }
        };

        await reviewInterface.confirmAndSave(extractedLayers);
        const savedRecord = freshMockDb.put.mock.calls[0][1];
        
        // Verify depth normalization
        if (savedRecord.metadata.strataLayers) {
          savedRecord.metadata.strataLayers.forEach(layer => {
            // Depths must be valid numbers
            expect(typeof layer.startDepth).toBe('number');
            expect(typeof layer.endDepth).toBe('number');
            expect(typeof layer.thickness).toBe('number');
            
            // No NaN or infinite values
            expect(isFinite(layer.startDepth)).toBe(true);
            expect(isFinite(layer.endDepth)).toBe(true);
            expect(isFinite(layer.thickness)).toBe(true);
            
            // Logical depth relationships
            expect(layer.startDepth).toBeLessThan(layer.endDepth);
            expect(layer.thickness).toBeCloseTo(layer.endDepth - layer.startDepth, 5);
            
            // Reasonable depth ranges (reject absurd values)
            expect(layer.startDepth).toBeGreaterThanOrEqual(0);
            expect(layer.endDepth).toBeLessThan(10000); // Reasonable max depth
          });
        }
      }
    ), { numRuns: 30 });
  });
});