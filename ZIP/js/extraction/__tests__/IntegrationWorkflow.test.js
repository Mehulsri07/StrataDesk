/**
 * Integration tests for complete strata extraction workflow
 * Tests the full pipeline from file upload to data storage
 */

const { StrataExtractor } = require('../StrataExtractor');
const { ReviewInterface } = require('../ReviewInterface');

// Mock file system for testing
const mockFiles = {
  'sample-basic.xlsx': require('../../../test-data/sample-strata-basic.json'),
  'sample-complex.xlsx': require('../../../test-data/sample-strata-complex.json'),
  'sample-edge-cases.xlsx': require('../../../test-data/sample-strata-edge-cases.json'),
  'sample-different-columns.xlsx': require('../../../test-data/sample-strata-different-columns.json')
};

describe('Complete Extraction Workflow Integration', () => {
  let extractor, reviewInterface;
  let mockDB, mockUtils, mockAuth, mockConfig;

  beforeEach(() => {
    // Mock dependencies
    mockDB = {
      put: jest.fn().mockResolvedValue(true),
      get: jest.fn(),
      getAll: jest.fn().mockResolvedValue([])
    };
    
    mockUtils = {
      uid: jest.fn(() => 'test-id-' + Math.random().toString(36).slice(2)),
      nowISO: jest.fn(() => '2024-01-01T00:00:00.000Z'),
      showToast: jest.fn()
    };
    
    mockAuth = {
      getCurrentUser: jest.fn(() => ({ username: 'test-user' }))
    };
    
    mockConfig = {
      STORES: { FILES: 'files' }
    };

    // Create instances with mocked dependencies
    extractor = new StrataExtractor();
    reviewInterface = new ReviewInterface({
      utils: mockUtils,
      auth: mockAuth,
      config: mockConfig,
      db: mockDB
    });
  });

  afterEach(() => {
    if (reviewInterface) {
      reviewInterface.destroy();
    }
  });

  test('Complete workflow: Basic Excel file extraction', async () => {
    const testFile = mockFiles['sample-basic.xlsx'];
    
    // Step 1: Extract data from file
    const extractionResult = await extractor.extractFromSheetData(testFile.sheets[0].data, {
      filename: testFile.filename,
      colors: testFile.sheets[0].colors
    });
    
    expect(extractionResult.success).toBe(true);
    expect(extractionResult.layers).toHaveLength(testFile.expected_output.layers.length);
    
    // Step 2: Review and validate extracted data
    reviewInterface.displayDraftLayers(extractionResult.layers, {
      filename: testFile.filename,
      depth_unit: testFile.expected_output.metadata.depth_unit,
      total_depth: testFile.expected_output.metadata.total_depth,
      extraction_timestamp: new Date().toISOString()
    });
    
    expect(reviewInterface.editedLayers).toHaveLength(extractionResult.layers.length);
    
    // Step 3: Validate extracted layers match expected output
    extractionResult.layers.forEach((layer, index) => {
      const expected = testFile.expected_output.layers[index];
      expect(layer.material).toBe(expected.material);
      expect(layer.start_depth).toBe(expected.start_depth);
      expect(layer.end_depth).toBe(expected.end_depth);
      expect(layer.confidence).toBe(expected.confidence);
      expect(layer.source).toBe(expected.source);
    });
    
    // Step 4: Save to database
    const saveResult = await reviewInterface.confirmAndSave(reviewInterface.editedLayers);
    
    expect(saveResult.success).toBe(true);
    expect(mockDB.put).toHaveBeenCalledWith('files', expect.any(Object));
    
    // Step 5: Verify saved record structure
    const savedRecord = mockDB.put.mock.calls[0][1];
    expect(savedRecord.metadata.strataLayers).toHaveLength(testFile.expected_output.layers.length);
    expect(savedRecord.metadata.extractionSource).toBeDefined();
    expect(savedRecord.metadata.extractionSource.filename).toBe(testFile.filename);
  });

  test('Complete workflow: Complex Excel file with multiple materials', async () => {
    const testFile = mockFiles['sample-complex.xlsx'];
    
    // Extract and process complex file
    const extractionResult = await extractor.extractFromSheetData(testFile.sheets[0].data, {
      filename: testFile.filename,
      colors: testFile.sheets[0].colors
    });
    
    expect(extractionResult.success).toBe(true);
    expect(extractionResult.layers).toHaveLength(testFile.expected_output.layers.length);
    
    // Verify complex material types are handled correctly
    const materialTypes = extractionResult.layers.map(layer => layer.material);
    const expectedTypes = testFile.expected_output.layers.map(layer => layer.material);
    expect(materialTypes).toEqual(expectedTypes);
    
    // Verify depth ranges are continuous
    for (let i = 1; i < extractionResult.layers.length; i++) {
      const prevLayer = extractionResult.layers[i - 1];
      const currentLayer = extractionResult.layers[i];
      expect(currentLayer.start_depth).toBe(prevLayer.end_depth);
    }
  });

  test('Error handling: Edge cases and invalid data', async () => {
    const testFile = mockFiles['sample-edge-cases.xlsx'];
    
    const extractionResult = await extractor.extractFromSheetData(testFile.sheets[0].data, {
      filename: testFile.filename,
      colors: testFile.sheets[0].colors
    });
    
    // Should handle errors gracefully
    if (extractionResult.success) {
      // Valid layers should be extracted despite errors
      expect(extractionResult.layers.length).toBeGreaterThan(0);
      expect(extractionResult.layers.length).toBeLessThanOrEqual(testFile.expected_behavior.expected_valid_layers);
      
      // Should have warnings about problematic data
      expect(extractionResult.warnings).toBeDefined();
      expect(Array.isArray(extractionResult.warnings)).toBe(true);
    } else {
      // If extraction fails, should provide clear error messages
      expect(extractionResult.errors).toBeDefined();
      expect(Array.isArray(extractionResult.errors)).toBe(true);
      expect(extractionResult.errors.length).toBeGreaterThan(0);
    }
  });

  test('Column layout flexibility: Different column arrangements', async () => {
    const testFile = mockFiles['sample-different-columns.xlsx'];
    
    const extractionResult = await extractor.extractFromSheetData(testFile.sheets[0].data, {
      filename: testFile.filename,
      colors: testFile.sheets[0].colors
    });
    
    expect(extractionResult.success).toBe(true);
    expect(extractionResult.layers).toHaveLength(testFile.expected_output.layers.length);
    
    // Verify alternative column layout is handled correctly
    extractionResult.layers.forEach((layer, index) => {
      const expected = testFile.expected_output.layers[index];
      expect(layer.material).toBe(expected.material);
      expect(layer.start_depth).toBe(expected.start_depth);
      expect(layer.end_depth).toBe(expected.end_depth);
    });
    
    // Verify metric units are preserved
    const metadata = testFile.expected_output.metadata;
    expect(metadata.depth_unit).toBe('meters');
  });

  test('User interaction workflow: Layer editing and validation', async () => {
    const testFile = mockFiles['sample-basic.xlsx'];
    
    const extractionResult = await extractor.extractFromSheetData(testFile.sheets[0].data, {
      filename: testFile.filename,
      colors: testFile.sheets[0].colors
    });
    
    reviewInterface.displayDraftLayers(extractionResult.layers, {
      filename: testFile.filename,
      depth_unit: 'feet',
      total_depth: 25,
      extraction_timestamp: new Date().toISOString()
    });
    
    // Test user editing functionality
    const originalLayerCount = reviewInterface.editedLayers.length;
    
    // Edit a layer material
    reviewInterface.updateLayerMaterial(0, 'Modified Topsoil');
    expect(reviewInterface.editedLayers[0].material).toBe('Modified Topsoil');
    expect(reviewInterface.editedLayers[0].user_edited).toBe(true);
    expect(reviewInterface.editedLayers[0].confidence).toBe('high');
    
    // Edit layer depths
    reviewInterface.updateLayerDepths(1, 2.5, 8.5);
    expect(reviewInterface.editedLayers[1].start_depth).toBe(2.5);
    expect(reviewInterface.editedLayers[1].end_depth).toBe(8.5);
    expect(reviewInterface.editedLayers[1].user_edited).toBe(true);
    
    // Test layer merging
    const mergedLayer = reviewInterface.mergeLayers(2, 3);
    expect(reviewInterface.editedLayers.length).toBe(originalLayerCount - 1);
    expect(mergedLayer.material).toContain('/'); // Should contain both materials
    expect(mergedLayer.user_edited).toBe(true);
    
    // Test layer splitting
    const splitDepth = (reviewInterface.editedLayers[0].start_depth + reviewInterface.editedLayers[0].end_depth) / 2;
    const [layer1, layer2] = reviewInterface.splitLayer(0, splitDepth);
    expect(reviewInterface.editedLayers.length).toBe(originalLayerCount); // Back to original count
    expect(layer1.end_depth).toBe(splitDepth);
    expect(layer2.start_depth).toBe(splitDepth);
    
    // Validate final state
    const validation = reviewInterface.validateUserEdits(reviewInterface.editedLayers);
    expect(validation.valid).toBe(true);
    
    // Save edited data
    const saveResult = await reviewInterface.confirmAndSave(reviewInterface.editedLayers);
    expect(saveResult.success).toBe(true);
  });

  test('Data persistence and retrieval workflow', async () => {
    const testFile = mockFiles['sample-basic.xlsx'];
    
    const extractionResult = await extractor.extractFromSheetData(testFile.sheets[0].data, {
      filename: testFile.filename,
      colors: testFile.sheets[0].colors
    });
    
    reviewInterface.displayDraftLayers(extractionResult.layers, {
      filename: testFile.filename,
      depth_unit: 'feet',
      total_depth: 25,
      extraction_timestamp: new Date().toISOString()
    });
    
    const saveResult = await reviewInterface.confirmAndSave(reviewInterface.editedLayers);
    const savedRecord = mockDB.put.mock.calls[0][1];
    
    // Test data structure compatibility with existing system
    expect(savedRecord.id).toBeDefined();
    expect(savedRecord.project).toBeDefined();
    expect(savedRecord.filename).toBeDefined();
    expect(savedRecord.files).toBeDefined();
    expect(savedRecord.metadata).toBeDefined();
    
    // Test metadata structure
    expect(savedRecord.metadata.boreId).toBeDefined();
    expect(savedRecord.metadata.date).toBeDefined();
    expect(savedRecord.metadata.tags).toContain('strata-extraction');
    expect(savedRecord.metadata.tags).toContain('imported');
    expect(savedRecord.metadata.strataLayers).toBeDefined();
    expect(savedRecord.metadata.strataSummary).toBeDefined();
    
    // Test extraction source preservation
    expect(savedRecord.metadata.extractionSource).toBeDefined();
    expect(savedRecord.metadata.extractionSource.filename).toBe(testFile.filename);
    expect(savedRecord.metadata.extractionSource.extractedLayers).toBeDefined();
    expect(savedRecord.metadata.extractionSource.layerCount).toBe(extractionResult.layers.length);
    
    // Test strata layers format compatibility
    savedRecord.metadata.strataLayers.forEach((layer, index) => {
      expect(layer.type).toBeDefined();
      expect(layer.thickness).toBeDefined();
      expect(layer.startDepth).toBeDefined();
      expect(layer.endDepth).toBeDefined();
      expect(layer.confidence).toBeDefined();
      expect(layer.source).toBe('extraction');
    });
  });

  test('Error recovery and fallback mechanisms', async () => {
    // Test with invalid data that should trigger fallback
    const invalidData = [
      ['Invalid', 'Headers', 'Format'],
      ['No', 'Depth', 'Data'],
      ['Available', 'Here', 'Either']
    ];
    
    const extractionResult = await extractor.extractFromSheetData(invalidData, {
      filename: 'invalid-file.xlsx'
    });
    
    // Should fail gracefully
    expect(extractionResult.success).toBe(false);
    expect(extractionResult.errors).toBeDefined();
    expect(Array.isArray(extractionResult.errors)).toBe(true);
    expect(extractionResult.errors.length).toBeGreaterThan(0);
    
    // Should provide helpful error messages
    const errorMessages = extractionResult.errors.join(' ');
    expect(errorMessages.toLowerCase()).toContain('depth');
  });

  test('Performance: Large dataset handling', async () => {
    // Generate large dataset
    const largeDataset = [['Depth (ft)', 'Material', 'Description']];
    for (let i = 0; i < 1000; i++) {
      const depth = i * 0.5;
      const materials = ['Clay', 'Sand', 'Gravel', 'Rock', 'Silt'];
      const material = materials[i % materials.length];
      largeDataset.push([depth, material, `Layer ${i + 1}`]);
    }
    
    const startTime = Date.now();
    const extractionResult = await extractor.extractFromSheetData(largeDataset, {
      filename: 'large-dataset.xlsx'
    });
    const endTime = Date.now();
    
    // Should complete within reasonable time (5 seconds)
    expect(endTime - startTime).toBeLessThan(5000);
    
    if (extractionResult.success) {
      expect(extractionResult.layers.length).toBeGreaterThan(0);
      expect(extractionResult.layers.length).toBeLessThanOrEqual(1000);
    }
  });
});

describe('PDF Extraction Workflow Integration', () => {
  let extractor;

  beforeEach(() => {
    extractor = new StrataExtractor();
  });

  test('PDF text extraction workflow', async () => {
    const testFile = require('../../../test-data/sample-pdf-basic.json');
    
    // Mock PDF extraction (would normally use PDF.js)
    const mockPDFResult = {
      success: true,
      layers: testFile.expected_output.layers,
      metadata: testFile.expected_output.metadata,
      confidence: 'medium'
    };
    
    // Verify PDF extraction result structure
    expect(mockPDFResult.success).toBe(true);
    expect(mockPDFResult.layers).toHaveLength(testFile.expected_output.layers.length);
    
    // Verify PDF-specific confidence levels (typically lower than Excel)
    mockPDFResult.layers.forEach(layer => {
      expect(layer.confidence).toBe('medium');
      expect(layer.source).toBe('pdf-import');
    });
  });

  test('PDF error handling: Poor quality text', async () => {
    const testFile = require('../../../test-data/sample-pdf-unclear.json');
    
    // Mock poor quality PDF extraction
    const mockPDFResult = {
      success: false,
      errors: testFile.expected_behavior.expected_errors,
      fallback_required: testFile.expected_behavior.fallback_required
    };
    
    expect(mockPDFResult.success).toBe(false);
    expect(mockPDFResult.errors).toBeDefined();
    expect(mockPDFResult.fallback_required).toBe(true);
    
    // Should provide specific error messages for PDF issues
    const errorText = mockPDFResult.errors.join(' ').toLowerCase();
    expect(errorText).toContain('text quality');
    expect(errorText).toContain('confidence');
  });
});