// Debug filename processing
const { ReviewInterface } = require('./js/extraction/ReviewInterface');

// Create a simple test
const mockUtils = {
  uid: (prefix = 'x') => `${prefix}_test_123`,
  nowISO: () => '2024-01-01T00:00:00.000Z',
  showToast: () => {}
};

const mockAuth = {
  getCurrentUser: () => ({ username: 'test-user' })
};

const mockConfig = {
  STORES: { FILES: 'files' }
};

let savedRecord = null;
const mockDb = {
  put: (store, record) => {
    savedRecord = record;
    return Promise.resolve(true);
  }
};

async function testFunctionalIntegration() {
  const reviewInterface = new ReviewInterface({
    utils: mockUtils,
    auth: mockAuth,
    config: mockConfig,
    db: mockDb
  });

  // Test with the same data as the failing test
  const testMetadata = {
    filename: 'test.xlsx',
    project: null,
    boreId: null,
    extraction_timestamp: '1970-01-01T00:00:00.000Z',
    total_depth: null,
    depth_unit: 'feet'
  };

  const testLayers = [{
    material: 'Clay',
    start_depth: 0,
    end_depth: 1.9816697283187081,
    confidence: 'high',
    source: 'excel-import',
    user_edited: false,
    original_color: null
  }];

  reviewInterface.currentDraft = {
    layers: testLayers,
    metadata: testMetadata
  };

  console.log('Testing with data:', { testLayers, testMetadata });
  
  const result = await reviewInterface.confirmAndSave(testLayers);
  
  console.log('Save result success:', result.success);
  if (savedRecord) {
    console.log('Saved record structure:');
    console.log('- id:', savedRecord.id);
    console.log('- project:', savedRecord.project);
    console.log('- filename:', savedRecord.filename);
    console.log('- files:', savedRecord.files);
    console.log('- metadata keys:', Object.keys(savedRecord.metadata));
    
    // Check the specific assertions from the test
    console.log('\nChecking test assertions:');
    console.log('1. Has id:', savedRecord.hasOwnProperty('id'));
    console.log('2. Has project:', savedRecord.hasOwnProperty('project'));
    console.log('3. Has filename:', savedRecord.hasOwnProperty('filename'));
    console.log('4. Has files:', savedRecord.hasOwnProperty('files'));
    console.log('5. Has metadata:', savedRecord.hasOwnProperty('metadata'));
    
    console.log('6. Metadata has boreId:', savedRecord.metadata.hasOwnProperty('boreId'));
    console.log('7. Metadata has date:', savedRecord.metadata.hasOwnProperty('date'));
    console.log('8. Metadata has createdAt:', savedRecord.metadata.hasOwnProperty('createdAt'));
    console.log('9. Metadata has createdBy:', savedRecord.metadata.hasOwnProperty('createdBy'));
    console.log('10. Metadata has tags:', savedRecord.metadata.hasOwnProperty('tags'));
    console.log('11. Metadata has notes:', savedRecord.metadata.hasOwnProperty('notes'));
    
    // Check core fields filtering
    const coreFields = ['boreId', 'date', 'waterLevel', 'coordinates', 'tags', 'notes', 'createdAt', 'createdBy'];
    const hasOnlyCoreFields = Object.keys(savedRecord.metadata)
      .filter(key => !['strataLayers', 'strataSummary', 'extractionSource', 'strataChart'].includes(key))
      .every(key => coreFields.includes(key));
    
    console.log('12. Has only core fields:', hasOnlyCoreFields);
    console.log('    - All metadata keys:', Object.keys(savedRecord.metadata));
    console.log('    - Filtered keys:', Object.keys(savedRecord.metadata).filter(key => !['strataLayers', 'strataSummary', 'extractionSource', 'strataChart'].includes(key)));
    
    console.log('13. CreatedAt matches:', savedRecord.metadata.createdAt === '2024-01-01T00:00:00.000Z');
    console.log('14. CreatedBy matches:', savedRecord.metadata.createdBy === 'test-user');
  }
}

testFunctionalIntegration().catch(console.error);