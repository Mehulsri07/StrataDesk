/**
 * Property-based tests for ExcelProcessor
 * Feature: strata-chart-extraction
 */

const fc = require('fast-check');
const XLSX = require('xlsx');
const { ExcelProcessor } = require('../ExcelProcessor');

describe('ExcelProcessor', () => {
  let processor;

  beforeEach(() => {
    processor = new ExcelProcessor();
  });

  describe('Column Identification', () => {
    /**
     * Feature: strata-chart-extraction, Property 1: Column identification accuracy
     * Validates: Requirements 1.1
     * 
     * For any Excel file containing depth and strata columns, the system should 
     * correctly identify both columns regardless of their position or naming variations
     */
    test('Property 1: Column identification accuracy - depth column patterns', () => {
      const depthHeaders = [
        'Depth', 'DEPTH', 'depth', 'Depth (ft)', 'Depth (m)', 
        'Depth (feet)', 'Depth (meters)', 'Elevation', 'ELEV',
        'From', 'Top', 'Start Depth'
      ];

      fc.assert(
        fc.property(
          fc.constantFrom(...depthHeaders),
          fc.integer({ min: 0, max: 5 }), // column position
          fc.array(fc.float({ min: 0, max: 500, noNaN: true }), { minLength: 3, maxLength: 20 }),
          (header, colPosition, depthValues) => {
            // Create a worksheet with the depth column at specified position
            const worksheet = createWorksheetWithDepthColumn(header, colPosition, depthValues);
            
            const result = processor.findDepthColumn(worksheet);
            
            // Should find the depth column
            expect(result).not.toBeNull();
            expect(result.index).toBe(colPosition);
            
            // Header should match one of the expected patterns
            const headerLower = result.header.toLowerCase();
            const matchesPattern = 
              headerLower.includes('depth') || 
              headerLower.includes('elev') ||
              headerLower.includes('from') ||
              headerLower.includes('top');
            expect(matchesPattern).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property 1: Column identification accuracy - strata column patterns', () => {
      const strataHeaders = [
        'Strata', 'STRATA', 'Material', 'MATERIAL', 'Soil Type',
        'Soil', 'Lithology', 'Description', 'Layer', 'Formation',
        'Geology', 'Rock Type', 'Unit'
      ];

      fc.assert(
        fc.property(
          fc.constantFrom(...strataHeaders),
          fc.integer({ min: 0, max: 5 }), // column position
          fc.array(fc.constantFrom('Clay', 'Sand', 'Gravel', 'Silt', 'Rock', 'Limestone'), { minLength: 3, maxLength: 20 }),
          (header, colPosition, materialValues) => {
            // Create a worksheet with the strata column at specified position
            const worksheet = createWorksheetWithStrataColumn(header, colPosition, materialValues);
            
            const result = processor.findStrataColumn(worksheet);
            
            // Should find the strata column
            expect(result).not.toBeNull();
            expect(result.index).toBe(colPosition);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property 1: Column identification works regardless of column order', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 3 }), // depth column position
          fc.integer({ min: 0, max: 3 }), // strata column position (will be adjusted if same)
          fc.array(fc.float({ min: 0, max: 500, noNaN: true }), { minLength: 5, maxLength: 15 }),
          fc.array(fc.constantFrom('Clay', 'Sand', 'Gravel', 'Silt', 'Rock'), { minLength: 5, maxLength: 15 }),
          (depthCol, strataCol, depths, materials) => {
            // Ensure columns are different
            if (depthCol === strataCol) {
              strataCol = (strataCol + 1) % 4;
            }
            
            // Ensure arrays are same length
            const len = Math.min(depths.length, materials.length);
            const trimmedDepths = depths.slice(0, len);
            const trimmedMaterials = materials.slice(0, len);
            
            const worksheet = createWorksheetWithBothColumns(
              'Depth (ft)', depthCol, trimmedDepths,
              'Material', strataCol, trimmedMaterials
            );
            
            const depthResult = processor.findDepthColumn(worksheet);
            const strataResult = processor.findStrataColumn(worksheet);
            
            // Both columns should be found at correct positions
            expect(depthResult).not.toBeNull();
            expect(strataResult).not.toBeNull();
            expect(depthResult.index).toBe(depthCol);
            expect(strataResult.index).toBe(strataCol);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Workbook Parsing', () => {
    test('parseWorkbook extracts depths and materials correctly', () => {
      fc.assert(
        fc.property(
          fc.array(fc.float({ min: 0, max: 500, noNaN: true }), { minLength: 3, maxLength: 20 }),
          fc.array(fc.constantFrom('Clay', 'Sand', 'Gravel', 'Silt', 'Rock', 'Limestone'), { minLength: 3, maxLength: 20 }),
          (depths, materials) => {
            // Ensure arrays are same length
            const len = Math.min(depths.length, materials.length);
            const trimmedDepths = depths.slice(0, len);
            const trimmedMaterials = materials.slice(0, len);
            
            // Create workbook
            const workbook = createTestWorkbook(trimmedDepths, trimmedMaterials);
            const arrayBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
            
            const result = processor.parseWorkbook(arrayBuffer);
            
            // Should extract correct number of rows
            expect(result.depths.length).toBe(len);
            expect(result.materials.length).toBe(len);
            
            // Depths should match (within floating point tolerance)
            for (let i = 0; i < len; i++) {
              expect(result.depths[i]).toBeCloseTo(trimmedDepths[i], 5);
            }
            
            // Materials should match
            for (let i = 0; i < len; i++) {
              expect(result.materials[i]).toBe(trimmedMaterials[i]);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});

// Helper functions to create test worksheets

function createWorksheetWithDepthColumn(header, colPosition, values) {
  const worksheet = {};
  const colLetter = XLSX.utils.encode_col(colPosition);
  
  // Set header
  worksheet[`${colLetter}1`] = { v: header, t: 's' };
  
  // Set values
  values.forEach((val, i) => {
    worksheet[`${colLetter}${i + 2}`] = { v: val, t: 'n' };
  });
  
  // Set range
  const maxCol = Math.max(colPosition, 2);
  worksheet['!ref'] = `A1:${XLSX.utils.encode_col(maxCol)}${values.length + 1}`;
  
  return worksheet;
}

function createWorksheetWithStrataColumn(header, colPosition, values) {
  const worksheet = {};
  const colLetter = XLSX.utils.encode_col(colPosition);
  
  // Set header
  worksheet[`${colLetter}1`] = { v: header, t: 's' };
  
  // Set values
  values.forEach((val, i) => {
    worksheet[`${colLetter}${i + 2}`] = { v: val, t: 's' };
  });
  
  // Set range
  const maxCol = Math.max(colPosition, 2);
  worksheet['!ref'] = `A1:${XLSX.utils.encode_col(maxCol)}${values.length + 1}`;
  
  return worksheet;
}

function createWorksheetWithBothColumns(depthHeader, depthCol, depths, strataHeader, strataCol, materials) {
  const worksheet = {};
  
  const depthColLetter = XLSX.utils.encode_col(depthCol);
  const strataColLetter = XLSX.utils.encode_col(strataCol);
  
  // Set headers
  worksheet[`${depthColLetter}1`] = { v: depthHeader, t: 's' };
  worksheet[`${strataColLetter}1`] = { v: strataHeader, t: 's' };
  
  // Set values
  const len = Math.min(depths.length, materials.length);
  for (let i = 0; i < len; i++) {
    worksheet[`${depthColLetter}${i + 2}`] = { v: depths[i], t: 'n' };
    worksheet[`${strataColLetter}${i + 2}`] = { v: materials[i], t: 's' };
  }
  
  // Set range
  const maxCol = Math.max(depthCol, strataCol, 2);
  worksheet['!ref'] = `A1:${XLSX.utils.encode_col(maxCol)}${len + 1}`;
  
  return worksheet;
}

function createTestWorkbook(depths, materials) {
  const workbook = XLSX.utils.book_new();
  
  // Create data array with headers
  const data = [['Depth (ft)', 'Material']];
  const len = Math.min(depths.length, materials.length);
  for (let i = 0; i < len; i++) {
    data.push([depths[i], materials[i]]);
  }
  
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Strata');
  
  return workbook;
}


describe('Material Prioritization', () => {
  /**
   * Feature: strata-chart-extraction, Property 3: Material prioritization consistency
   * Validates: Requirements 1.3
   * 
   * For any cell containing both text and background color, the system should 
   * use text as the material identifier and ignore color
   */
  test('Property 3: Material prioritization - text takes priority over color', () => {
    const processor = new ExcelProcessor();
    
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: 0, max: 500, noNaN: true }), { minLength: 3, maxLength: 20 }),
        fc.array(fc.constantFrom('Clay', 'Sand', 'Gravel', 'Silt', 'Rock', 'Limestone'), { minLength: 3, maxLength: 20 }),
        fc.array(fc.constantFrom('#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', null), { minLength: 3, maxLength: 20 }),
        (depths, materials, colors) => {
          // Ensure arrays are same length
          const len = Math.min(depths.length, materials.length, colors.length);
          const trimmedDepths = depths.slice(0, len);
          const trimmedMaterials = materials.slice(0, len);
          const trimmedColors = colors.slice(0, len);
          
          const result = processor.mapDepthsToMaterials(trimmedDepths, trimmedMaterials, trimmedColors);
          
          // For each entry where text is present, material should be the text, not color
          result.entries.forEach((entry, i) => {
            if (trimmedMaterials[i] && trimmedMaterials[i].trim()) {
              // Text is present - should use text
              expect(entry.material).toBe(trimmedMaterials[i]);
              expect(entry.source).toBe('text');
            } else if (trimmedColors[i]) {
              // Only color present - should use color
              expect(entry.material).toBe(`color:${trimmedColors[i]}`);
              expect(entry.source).toBe('color');
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 3: Text always overrides color when both present', () => {
    const processor = new ExcelProcessor();
    
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: 0, max: 500, noNaN: true }), { minLength: 5, maxLength: 15 }),
        fc.array(fc.constantFrom('Clay', 'Sand', 'Gravel'), { minLength: 5, maxLength: 15 }),
        fc.array(fc.constantFrom('#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'), { minLength: 5, maxLength: 15 }),
        (depths, materials, colors) => {
          const len = Math.min(depths.length, materials.length, colors.length);
          const trimmedDepths = depths.slice(0, len);
          const trimmedMaterials = materials.slice(0, len);
          const trimmedColors = colors.slice(0, len);
          
          const result = processor.mapDepthsToMaterials(trimmedDepths, trimmedMaterials, trimmedColors);
          
          // All entries should use text since all have text values
          const textBasedCount = result.entries.filter(e => e.source === 'text').length;
          expect(textBasedCount).toBe(result.entries.length);
          
          // No entry should have color-based material
          const colorBasedCount = result.entries.filter(e => e.source === 'color').length;
          expect(colorBasedCount).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
