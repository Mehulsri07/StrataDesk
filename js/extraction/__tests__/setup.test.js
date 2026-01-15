/**
 * Setup test to verify testing infrastructure is working
 */

const fc = require('fast-check');

describe('Testing Infrastructure', () => {
  test('Jest is working', () => {
    expect(1 + 1).toBe(2);
  });

  test('fast-check is working', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => {
        return a + b === b + a; // Commutative property
      }),
      { numRuns: 100 }
    );
  });
});

describe('Module Loading', () => {
  test('StrataExtractor module can be loaded', () => {
    const { StrataExtractor } = require('../StrataExtractor');
    expect(StrataExtractor).toBeDefined();
    
    const extractor = new StrataExtractor();
    expect(extractor).toBeInstanceOf(StrataExtractor);
  });

  test('ValidationService module can be loaded', () => {
    const { ValidationService } = require('../ValidationService');
    expect(ValidationService).toBeDefined();
    
    const service = new ValidationService();
    expect(service).toBeInstanceOf(ValidationService);
  });

  test('ExtractionErrorHandler module can be loaded', () => {
    const { ExtractionErrorHandler } = require('../ErrorHandler');
    expect(ExtractionErrorHandler).toBeDefined();
    
    const handler = new ExtractionErrorHandler();
    expect(handler).toBeInstanceOf(ExtractionErrorHandler);
  });
});
