/**
 * ExcelProcessor - Handles Excel file parsing and strata data extraction
 * Uses SheetJS (xlsx) library for workbook processing
 * 
 * Feature: strata-chart-extraction
 * Requirements: 1.1, 1.2, 1.3
 */

// For Node.js environment (testing)
let XLSX;
if (typeof require !== 'undefined') {
  try {
    XLSX = require('xlsx');
  } catch (e) {
    // Will use browser global
  }
}

class ExcelProcessor {
  constructor() {
    this.workbook = null;
    this.activeSheet = null;
    
    // Common depth column identifiers
    this.depthPatterns = [
      /^depth$/i,
      /^depth\s*\(?ft\)?$/i,
      /^depth\s*\(?m\)?$/i,
      /^depth\s*\(?feet\)?$/i,
      /^depth\s*\(?meters?\)?$/i,
      /^elevation$/i,
      /^elev$/i,
      /^from$/i,
      /^top$/i,
      /^start\s*depth$/i
    ];
    
    // Common strata/material column identifiers
    this.strataPatterns = [
      /^strata$/i,
      /^material$/i,
      /^soil\s*type$/i,
      /^soil$/i,
      /^lithology$/i,
      /^description$/i,
      /^layer$/i,
      /^formation$/i,
      /^geology$/i,
      /^rock\s*type$/i,
      /^unit$/i
    ];
  }

  /**
   * Process an Excel file and extract strata data
   * @param {File} file - The Excel file to process
   * @returns {Promise<Object>} Extracted data with depths, materials, and colors
   */
  async processFile(file) {
    const arrayBuffer = await file.arrayBuffer();
    return this.parseWorkbook(arrayBuffer);
  }

  /**
   * Parse workbook from ArrayBuffer
   * @param {ArrayBuffer} arrayBuffer - Excel file data
   * @returns {Object} Parsed strata data
   */
  /**
   * Parse workbook data directly (for testing purposes)
   * @param {Object} workbook - Pre-parsed workbook object
   * @param {Object} colors - Optional color data
   * @returns {Object} Parsed strata data
   */
  parseWorkbookData(workbook, colors = null) {
    this.workbook = workbook;

    if (!this.workbook.SheetNames || this.workbook.SheetNames.length === 0) {
      throw new Error('Workbook contains no sheets');
    }

    // Use first sheet by default
    const sheetName = this.workbook.SheetNames[0];
    this.activeSheet = this.workbook.Sheets[sheetName];

    if (!this.activeSheet) {
      throw new Error('Could not read worksheet');
    }

    // Find depth and strata columns
    const depthColumnInfo = this.findDepthColumn(this.activeSheet);
    const strataColumnInfo = this.findStrataColumn(this.activeSheet);

    if (!depthColumnInfo) {
      throw new Error('Could not identify depth column in spreadsheet');
    }

    if (!strataColumnInfo) {
      throw new Error('Could not identify strata/material column in spreadsheet');
    }

    const depthColumn = depthColumnInfo.index;
    const strataColumn = strataColumnInfo.index;

    // Get the data range
    let range = { s: { c: 0, r: 0 }, e: { c: 10, r: 100 } }; // Default range for mock data
    if (this.activeSheet['!ref']) {
      const xlsx = typeof window !== 'undefined' && window.XLSX ? window.XLSX : XLSX;
      range = xlsx.utils.decode_range(this.activeSheet['!ref']);
    }

    // Extract data from identified columns
    const depths = [];
    const materials = [];
    const extractedColors = [];
    let depthUnit = 'feet'; // Default unit

    // Try to detect unit from header
    if (depthColumnInfo.header) {
      if (/\(?m\)?|\(?meters?\)?/i.test(depthColumnInfo.header)) {
        depthUnit = 'meters';
      } else if (/\(?ft\)?|\(?feet\)?/i.test(depthColumnInfo.header)) {
        depthUnit = 'feet';
      }
    }

    // Extract data starting from row after header
    for (let row = depthColumnInfo.headerRow + 1; row <= range.e.r; row++) {
      const depthCell = this.activeSheet[this.encodeCellAddress({ r: row, c: depthColumn })];
      const strataCell = this.activeSheet[this.encodeCellAddress({ r: row, c: strataColumn })];

      // Get depth value
      let depthValue = null;
      if (depthCell) {
        if (typeof depthCell.v === 'number') {
          depthValue = depthCell.v;
        } else if (typeof depthCell.v === 'string') {
          const parsed = parseFloat(depthCell.v);
          if (!isNaN(parsed)) {
            depthValue = parsed;
          }
        }
      }

      // Get material value
      let materialValue = null;
      if (strataCell && strataCell.v) {
        materialValue = String(strataCell.v).trim();
        if (materialValue === '') {
          materialValue = null;
        }
      }

      // Get background color if available (use provided colors or try to extract)
      let colorValue = null;
      if (colors) {
        const cellRef = this.encodeCellAddress({ r: row, c: strataColumn });
        colorValue = colors[cellRef] || null;
      } else if (strataCell && strataCell.s && strataCell.s.fgColor) {
        colorValue = this.extractColorValue(strataCell.s.fgColor);
      }

      // Only add row if we have at least a depth value
      if (depthValue !== null) {
        depths.push(depthValue);
        materials.push(materialValue);
        extractedColors.push(colorValue);
      }
    }

    const extractedData = {
      depths,
      materials,
      colors: extractedColors
    };
    
    // Map depths to materials
    const mappedData = this.mapDepthsToMaterials(extractedData.depths, extractedData.materials);

    return {
      depths: extractedData.depths,
      materials: extractedData.materials,
      colors: extractedData.colors,
      mappedLayers: mappedData,
      depthUnit: depthUnit,
      metadata: {
        depthColumn,
        strataColumn,
        totalRows: extractedData.depths.length
      }
    };
  }

  parseWorkbook(arrayBuffer) {
    // Get XLSX library (browser or Node.js)
    const xlsx = typeof window !== 'undefined' && window.XLSX ? window.XLSX : XLSX;
    
    if (!xlsx) {
      throw new Error('XLSX library not available');
    }

    // Parse workbook with cell styles for color detection
    this.workbook = xlsx.read(arrayBuffer, { 
      type: 'array',
      cellStyles: true,
      cellNF: true,
      cellDates: true
    });

    if (!this.workbook.SheetNames || this.workbook.SheetNames.length === 0) {
      throw new Error('Workbook contains no sheets');
    }

    // Use first sheet by default
    const sheetName = this.workbook.SheetNames[0];
    this.activeSheet = this.workbook.Sheets[sheetName];

    if (!this.activeSheet) {
      throw new Error('Could not read worksheet');
    }

    // Find depth and strata columns
    const depthColumn = this.findDepthColumn(this.activeSheet);
    const strataColumn = this.findStrataColumn(this.activeSheet);

    if (!depthColumn) {
      throw new Error('Could not identify depth column in the spreadsheet');
    }

    if (!strataColumn) {
      throw new Error('Could not identify strata/material column in the spreadsheet');
    }

    // Get the data range
    const range = xlsx.utils.decode_range(this.activeSheet['!ref'] || 'A1');
    
    // Extract data from identified columns
    const depths = [];
    const materials = [];
    const colors = [];
    let depthUnit = 'feet'; // Default unit

    // Try to detect unit from header
    if (depthColumn.header) {
      if (/\(?m\)?|\(?meters?\)?/i.test(depthColumn.header)) {
        depthUnit = 'meters';
      } else if (/\(?ft\)?|\(?feet\)?/i.test(depthColumn.header)) {
        depthUnit = 'feet';
      }
    }

    // Extract data starting from row after header
    for (let row = depthColumn.headerRow + 1; row <= range.e.r; row++) {
      const depthCell = this.activeSheet[xlsx.utils.encode_cell({ r: row, c: depthColumn.index })];
      const strataCell = this.activeSheet[xlsx.utils.encode_cell({ r: row, c: strataColumn.index })];

      // Get depth value
      let depthValue = null;
      if (depthCell) {
        if (typeof depthCell.v === 'number') {
          depthValue = depthCell.v;
        } else if (typeof depthCell.v === 'string') {
          const parsed = parseFloat(depthCell.v);
          if (!isNaN(parsed)) {
            depthValue = parsed;
          }
        }
      }

      // Get material value
      let materialValue = null;
      if (strataCell && strataCell.v !== undefined && strataCell.v !== null) {
        materialValue = String(strataCell.v).trim();
        if (materialValue === '') {
          materialValue = null;
        }
      }

      // Get background color if available
      let colorValue = null;
      if (strataCell && strataCell.s && strataCell.s.fgColor) {
        colorValue = this.extractColorValue(strataCell.s.fgColor);
      }

      // Only add row if we have at least a depth value
      if (depthValue !== null) {
        depths.push(depthValue);
        materials.push(materialValue);
        colors.push(colorValue);
      }
    }

    return {
      depths,
      materials,
      colors,
      depthUnit,
      depthColumn: depthColumn.header,
      strataColumn: strataColumn.header,
      sheetName,
      rowCount: depths.length
    };
  }

  /**
   * Find the depth column in a worksheet
   * @param {Object} worksheet - SheetJS worksheet object
   * @returns {Object|null} Column info with index and header
   */
  findDepthColumn(worksheet) {
    const xlsx = typeof window !== 'undefined' && window.XLSX ? window.XLSX : XLSX;
    const range = xlsx.utils.decode_range(worksheet['!ref'] || 'A1');
    
    // Search first few rows for header
    for (let headerRow = 0; headerRow <= Math.min(5, range.e.r); headerRow++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = xlsx.utils.encode_cell({ r: headerRow, c: col });
        const cell = worksheet[cellAddress];
        
        if (cell && cell.v) {
          const cellValue = String(cell.v).trim();
          
          // Check against depth patterns
          for (const pattern of this.depthPatterns) {
            if (pattern.test(cellValue)) {
              return {
                index: col,
                header: cellValue,
                headerRow: headerRow
              };
            }
          }
        }
      }
    }

    // Fallback: look for column with numeric values that increase
    for (let col = range.s.c; col <= range.e.c; col++) {
      const values = [];
      for (let row = 1; row <= Math.min(10, range.e.r); row++) {
        const cell = worksheet[xlsx.utils.encode_cell({ r: row, c: col })];
        if (cell && typeof cell.v === 'number') {
          values.push(cell.v);
        }
      }
      
      // Check if values are mostly increasing (likely depth)
      if (values.length >= 3) {
        let increasing = 0;
        for (let i = 1; i < values.length; i++) {
          if (values[i] > values[i - 1]) increasing++;
        }
        if (increasing >= values.length * 0.7) {
          return {
            index: col,
            header: 'Depth (inferred)',
            headerRow: 0
          };
        }
      }
    }

    return null;
  }

  /**
   * Find the strata/material column in a worksheet
   * @param {Object} worksheet - SheetJS worksheet object
   * @returns {Object|null} Column info with index and header
   */
  findStrataColumn(worksheet) {
    const xlsx = typeof window !== 'undefined' && window.XLSX ? window.XLSX : XLSX;
    const range = xlsx.utils.decode_range(worksheet['!ref'] || 'A1');
    
    // Search first few rows for header
    for (let headerRow = 0; headerRow <= Math.min(5, range.e.r); headerRow++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = xlsx.utils.encode_cell({ r: headerRow, c: col });
        const cell = worksheet[cellAddress];
        
        if (cell && cell.v) {
          const cellValue = String(cell.v).trim();
          
          // Check against strata patterns
          for (const pattern of this.strataPatterns) {
            if (pattern.test(cellValue)) {
              return {
                index: col,
                header: cellValue,
                headerRow: headerRow
              };
            }
          }
        }
      }
    }

    // Fallback: look for column with text values (not numbers)
    for (let col = range.s.c; col <= range.e.c; col++) {
      let textCount = 0;
      let totalCount = 0;
      
      for (let row = 1; row <= Math.min(10, range.e.r); row++) {
        const cell = worksheet[xlsx.utils.encode_cell({ r: row, c: col })];
        if (cell && cell.v !== undefined && cell.v !== null) {
          totalCount++;
          if (typeof cell.v === 'string' && cell.v.trim().length > 0) {
            // Check if it's not just a number as string
            if (isNaN(parseFloat(cell.v))) {
              textCount++;
            }
          }
        }
      }
      
      // If mostly text values, likely material column
      if (totalCount >= 3 && textCount >= totalCount * 0.5) {
        return {
          index: col,
          header: 'Material (inferred)',
          headerRow: 0
        };
      }
    }

    return null;
  }

  /**
   * Extract color value from cell style
   * @param {Object} fgColor - Foreground color object from cell style
   * @returns {string|null} Hex color value or null
   */
  extractColorValue(fgColor) {
    if (!fgColor) return null;
    
    // RGB format
    if (fgColor.rgb) {
      return '#' + fgColor.rgb;
    }
    
    // ARGB format (skip alpha)
    if (fgColor.argb) {
      return '#' + fgColor.argb.substring(2);
    }
    
    // Theme color (would need theme parsing)
    if (fgColor.theme !== undefined) {
      // Return a placeholder - full theme support would require more work
      return `theme:${fgColor.theme}`;
    }
    
    // Indexed color
    if (fgColor.indexed !== undefined) {
      return `indexed:${fgColor.indexed}`;
    }
    
    return null;
  }

  /**
   * Extract cell data including text and metadata
   * @param {Object} worksheet - SheetJS worksheet object
   * @param {Object} range - Cell range to extract { startRow, endRow, col }
   * @returns {Array} Extracted cell data
   */
  extractCellData(worksheet, range) {
    const xlsx = typeof window !== 'undefined' && window.XLSX ? window.XLSX : XLSX;
    const data = [];
    
    for (let row = range.startRow; row <= range.endRow; row++) {
      const cellAddress = xlsx.utils.encode_cell({ r: row, c: range.col });
      const cell = worksheet[cellAddress];
      
      const cellData = {
        row,
        value: null,
        text: null,
        color: null,
        formula: null,
        type: null
      };
      
      if (cell) {
        cellData.value = cell.v;
        cellData.text = cell.w || (cell.v !== undefined ? String(cell.v) : null);
        cellData.type = cell.t; // s=string, n=number, b=boolean, etc.
        cellData.formula = cell.f || null;
        
        if (cell.s && cell.s.fgColor) {
          cellData.color = this.extractColorValue(cell.s.fgColor);
        }
      }
      
      data.push(cellData);
    }
    
    return data;
  }

  /**
   * Detect background colors from worksheet cells
   * @param {Object} worksheet - SheetJS worksheet object
   * @param {Object} range - Cell range to check { startRow, endRow, col }
   * @returns {Array} Array of color values
   */
  detectBackgroundColors(worksheet, range) {
    const xlsx = typeof window !== 'undefined' && window.XLSX ? window.XLSX : XLSX;
    const colors = [];
    
    for (let row = range.startRow; row <= range.endRow; row++) {
      const cellAddress = xlsx.utils.encode_cell({ r: row, c: range.col });
      const cell = worksheet[cellAddress];
      
      let color = null;
      if (cell && cell.s) {
        // Check fill pattern
        if (cell.s.fgColor) {
          color = this.extractColorValue(cell.s.fgColor);
        } else if (cell.s.bgColor) {
          color = this.extractColorValue(cell.s.bgColor);
        }
      }
      
      colors.push(color);
    }
    
    return colors;
  }

  /**
   * Map depths to materials creating correlated data
   * @param {Array} depths - Array of depth values
   * @param {Array} materials - Array of material names
   * @param {Array} colors - Array of background colors
   * @returns {Object} Correlated data object
   */
  mapDepthsToMaterials(depths, materials, colors) {
    if (!depths || depths.length === 0) {
      return { entries: [], valid: false, error: 'No depth data' };
    }

    const entries = [];
    const warnings = [];

    for (let i = 0; i < depths.length; i++) {
      const depth = depths[i];
      const material = materials ? materials[i] : null;
      const color = colors ? colors[i] : null;

      // Validate depth
      if (typeof depth !== 'number' || isNaN(depth)) {
        warnings.push(`Row ${i + 1}: Invalid depth value`);
        continue;
      }

      // Determine material identifier
      // Text takes priority over color (Requirement 1.3)
      let materialId = null;
      let source = null;

      if (material && material.trim()) {
        materialId = material.trim();
        source = 'text';
      } else if (color) {
        materialId = `color:${color}`;
        source = 'color';
      }

      entries.push({
        index: i,
        depth,
        material: materialId,
        originalText: material,
        originalColor: color,
        source
      });
    }

    return {
      entries,
      valid: entries.length > 0,
      warnings,
      stats: {
        totalRows: depths.length,
        validEntries: entries.length,
        textBased: entries.filter(e => e.source === 'text').length,
        colorBased: entries.filter(e => e.source === 'color').length,
        noMaterial: entries.filter(e => !e.material).length
      }
    };
  }

  /**
   * Detect depth unit from column header or data
   * @param {Object} sheet - XLSX sheet object
   * @param {number} depthColumn - Column index for depth data
   * @returns {string} Detected unit ('feet', 'meters', etc.)
   */
  detectDepthUnit(sheet, depthColumn) {
    // Try to detect from header
    const headerCell = sheet[this.encodeCellAddress({ c: depthColumn, r: 0 })];
    if (headerCell && headerCell.v) {
      const header = headerCell.v.toString().toLowerCase();
      if (header.includes('ft') || header.includes('feet')) {
        return 'feet';
      }
      if (header.includes('m') || header.includes('meter')) {
        return 'meters';
      }
    }

    // Default to feet if can't determine
    return 'feet';
  }

  /**
   * Encode cell address to Excel format (e.g., A1, B2)
   * @param {Object} cell - Cell address {c: column, r: row}
   * @returns {string} Excel cell reference
   */
  encodeCellAddress(cell) {
    let col = '';
    let c = cell.c;
    while (c >= 0) {
      col = String.fromCharCode(65 + (c % 26)) + col;
      c = Math.floor(c / 26) - 1;
    }
    return col + (cell.r + 1);
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.ExcelProcessor = ExcelProcessor;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ExcelProcessor };
}
