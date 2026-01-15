# Design Document

## Overview

The strata chart extraction feature automates the conversion of visual strata charts (Excel and PDF formats) into structured geological layer data. The system uses file parsing libraries to extract depth and material information, applies confidence-based validation, and presents extracted data through a mandatory review interface before integration with the existing StrataDesk data model.

## Architecture

The extraction system follows a pipeline architecture with four main stages:

1. **File Processing Stage**: Parse uploaded files and extract raw data
2. **Data Analysis Stage**: Identify depth patterns and material layers  
3. **Validation Stage**: Assign confidence levels and detect extraction issues
4. **Review Stage**: Present draft data for user verification and editing

The system integrates with existing StrataDesk modules:
- File management system for upload handling
- Database layer for storing structured strata data
- UI components for the review interface

## Components and Interfaces

### StrataExtractor (Core Module)
```javascript
class StrataExtractor {
  async extractFromFile(file, fileType)
  async processExcelData(workbook)
  async processPDFData(pdfDocument)
  validateDepthSequence(depths)
  detectMaterialLayers(data)
  assignConfidenceLevels(layers)
  generateDraftRecord(layers, metadata)
}
```

### ExcelProcessor (Excel-specific)
```javascript
class ExcelProcessor {
  parseWorkbook(arrayBuffer)
  findDepthColumn(worksheet)
  findStrataColumn(worksheet)
  extractCellData(worksheet, range)
  detectBackgroundColors(worksheet, range)
  mapDepthsToMaterials(depths, materials, colors)
}
```

### PDFProcessor (PDF-specific)
```javascript
class PDFProcessor {
  async loadPDFDocument(arrayBuffer)
  async extractTextContent(page)
  detectDepthLabels(textContent)
  identifyMaterialRegions(textContent)
  validateReadability(extractedData)
}
```

### ReviewInterface (UI Component)
```javascript
class ReviewInterface {
  displayDraftLayers(layers)
  enableLayerEditing()
  validateUserEdits(editedLayers)
  confirmAndSave(finalLayers)
  showExtractionErrors(errors)
}
```

## Data Models

### Extracted Layer Structure
```javascript
{
  material: string,           // e.g., "Clay", "Sand"
  start_depth: number,        // in original units (feet)
  end_depth: number,          // in original units (feet)
  confidence: "high" | "medium",
  source: "excel-import" | "pdf-import",
  original_color?: string,    // hex color if available
  user_edited: boolean        // true if modified during review
}
```

### Extraction Result
```javascript
{
  success: boolean,
  layers: ExtractedLayer[],
  metadata: {
    filename: string,
    depth_unit: string,
    depth_resolution: number,
    total_depth: number,
    extraction_timestamp: string
  },
  errors: string[],
  warnings: string[]
}
```

### Draft Record (for Review)
```javascript
{
  id: string,
  status: "draft",
  extracted_layers: ExtractedLayer[],
  source_file: string,
  extraction_metadata: object,
  created_at: string,
  requires_review: true
}
```

Now I need to use the prework tool to analyze the acceptance criteria before writing the correctness properties:

<function_calls>
<invoke name="prework">
<parameter name="featureName">strata-chart-extraction## 
Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I identified several properties that can be consolidated to eliminate redundancy:

- Column detection properties (1.1) and layer extraction properties (1.2, 3.1, 3.2) can be combined into comprehensive extraction accuracy properties
- Error handling properties (1.5, 2.2, 6.1-6.5) share common patterns and can be grouped by error type
- Schema consistency properties (4.5, 5.1) are logically equivalent and can be merged
- PDF and Excel processing properties (2.1, 2.3, 2.4) can be unified under format-agnostic extraction properties

### Core Properties

**Property 1: Column identification accuracy**
*For any* Excel file containing depth and strata columns, the system should correctly identify both columns regardless of their position or naming variations
**Validates: Requirements 1.1**

**Property 2: Layer boundary precision**
*For any* strata chart with defined material transitions, extracted layer boundaries should match the original depth intervals exactly
**Validates: Requirements 1.2, 3.2**

**Property 3: Material prioritization consistency**
*For any* cell containing both text and background color, the system should use text as the material identifier and ignore color
**Validates: Requirements 1.3**

**Property 4: Continuous layer detection**
*For any* sequence of contiguous cells with identical material, the system should create a single layer spanning the entire sequence
**Validates: Requirements 3.1**

**Property 5: Discontinuous layer separation**
*For any* material appearing in multiple non-contiguous sections, the system should create separate layer records for each continuous section
**Validates: Requirements 3.3**

**Property 6: Depth resolution preservation**
*For any* file with variable depth increments, the system should maintain the original depth values without interpolation or modification
**Validates: Requirements 3.4**

**Property 7: Confidence assignment logic**
*For any* extracted layer, confidence level should be "high" when both text and color are present, "medium" when only one signal is available
**Validates: Requirements 3.5**

**Property 8: Invalid input rejection**
*For any* file with missing or inconsistent depth values, the system should abort processing and provide specific error messages
**Validates: Requirements 1.5, 2.2**

**Property 9: Format consistency**
*For any* successfully processed file (Excel or PDF), the output structure should be identical regardless of input format
**Validates: Requirements 2.3**

**Property 10: User edit confidence update**
*For any* layer modified during review, the confidence level should be updated to "high" after user confirmation
**Validates: Requirements 4.4**

**Property 11: Schema compliance**
*For any* imported strata data, the saved structure should be identical to manually entered strata data schema
**Validates: Requirements 4.5, 5.1**

**Property 12: Required field display**
*For any* draft review interface, all extracted layers should display material name, start depth, end depth, and confidence level
**Validates: Requirements 4.2**

**Property 13: Functional integration**
*For any* imported and saved strata data, it should be usable in all existing StrataDesk features (cross-sections, interpolation, modeling)
**Validates: Requirements 5.2**

**Property 14: Source metadata preservation**
*For any* imported strata record, the system should preserve and display the import method and original file information
**Validates: Requirements 5.3**

**Property 15: Unit preservation**
*For any* file with depth units, the system should preserve the original units throughout processing and storage
**Validates: Requirements 5.4**

## Error Handling

The system implements a fail-safe approach with multiple validation checkpoints:

### Input Validation
- File format verification (Excel .xlsx, PDF)
- File size limits (configurable, default 50MB)
- Structural validation (presence of depth and material data)

### Processing Validation
- Depth sequence consistency checks
- Material identification confidence thresholds
- Layer boundary validation

### Output Validation
- Schema compliance verification
- Data integrity checks before saving
- User confirmation requirements

### Error Recovery
- Graceful degradation to manual entry
- Partial extraction support with user notification
- Clear error messaging with actionable guidance

## Testing Strategy

The testing approach combines unit testing for specific functionality with property-based testing for universal correctness guarantees.

### Unit Testing
Unit tests will cover:
- File parsing edge cases (empty files, malformed data)
- Specific extraction scenarios (single layer, multiple layers, complex patterns)
- UI component behavior (review interface, error displays)
- Integration points with existing StrataDesk modules

### Property-Based Testing
Property-based tests will use **fast-check** library for JavaScript, configured to run a minimum of 100 iterations per property. Each property-based test will be tagged with comments explicitly referencing the correctness property from this design document using the format: **Feature: strata-chart-extraction, Property {number}: {property_text}**

Property tests will generate:
- Random Excel files with various column arrangements and data patterns
- Strata charts with different layer configurations and material types
- Files with edge cases (missing data, inconsistent formats, boundary conditions)
- User interaction scenarios (edits, confirmations, cancellations)

The property-based testing will validate that the extraction logic maintains correctness across the full input space, while unit tests ensure specific examples and integration points work correctly.

### Test Data Generation
Smart generators will be created to:
- Generate valid Excel workbooks with realistic strata data
- Create PDF documents with extractable text and layout patterns
- Produce edge cases that test error handling paths
- Generate user interaction sequences for UI testing

Both unit and property-based tests are essential for comprehensive coverage: unit tests catch concrete bugs in specific scenarios, while property tests verify general correctness across all possible inputs.