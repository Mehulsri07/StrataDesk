# Implementation Plan

- [x] 1. Set up extraction infrastructure and dependencies


  - Install SheetJS library for Excel processing (`npm install xlsx`)
  - Install PDF.js library for PDF text extraction (`npm install pdfjs-dist`)
  - Install fast-check for property-based testing (`npm install --save-dev fast-check`)
  - Create `js/extraction/` directory for extraction modules
  - Create core StrataExtractor module with base interfaces
  - Set up file upload handling for .xlsx and .pdf formats in existing file manager
  - _Requirements: 1.1, 2.1_

- [x] 2. Implement Excel processing engine


- [x] 2.1 Create ExcelProcessor class with workbook parsing


  - Create `js/extraction/ExcelProcessor.js`
  - Implement parseWorkbook method using SheetJS
  - Create findDepthColumn method to identify depth data columns
  - Create findStrataColumn method to identify material data columns
  - _Requirements: 1.1_

- [x] 2.2 Write property test for column identification


  - Create `js/extraction/__tests__/ExcelProcessor.test.js`
  - **Property 1: Column identification accuracy**
  - **Validates: Requirements 1.1**

- [x] 2.3 Implement cell data extraction with color detection

  - Create extractCellData method for text and metadata
  - Implement detectBackgroundColors for color information extraction
  - Create mapDepthsToMaterials method for data correlation
  - _Requirements: 1.2, 1.3_

- [x] 2.4 Write property test for material prioritization


  - **Property 3: Material prioritization consistency**
  - **Validates: Requirements 1.3**

- [x] 2.5 Implement layer boundary detection logic


  - Create detectMaterialLayers method for continuous sequences
  - Implement layer separation for material transitions
  - Add support for discontinuous layer handling
  - _Requirements: 1.2, 3.1, 3.2, 3.3_

- [x] 2.6 Write property test for layer boundary precision


  - **Property 2: Layer boundary precision**
  - **Validates: Requirements 1.2, 3.2**


- [x] 2.7 Write property test for continuous layer detection
  - **Property 4: Continuous layer detection**
  - **Validates: Requirements 3.1**


- [x] 2.8 Write property test for discontinuous layer separation
  - **Property 5: Discontinuous layer separation**
  - **Validates: Requirements 3.3**

- [x] 3. Implement PDF processing engine


- [x] 3.1 Create PDFProcessor class with document parsing


  - Create `js/extraction/PDFProcessor.js`
  - Implement loadPDFDocument method using PDF.js
  - Create extractTextContent method for text extraction
  - Add detectDepthLabels method for depth identification
  - _Requirements: 2.1_


- [x] 3.2 Implement PDF material region identification
  - Create identifyMaterialRegions method for text-based detection
  - Add validateReadability method for extraction confidence
  - Implement error handling for unreadable content
  - _Requirements: 2.2, 2.4_

- [x] 3.3 Write property test for format consistency


  - **Property 9: Format consistency**
  - **Validates: Requirements 2.3**

- [x] 4. Implement validation and confidence system


- [x] 4.1 Create depth validation logic

  - Create `js/extraction/ValidationService.js`
  - Implement validateDepthSequence method
  - Add consistency checking for depth intervals
  - Create error detection for missing or invalid depths
  - _Requirements: 1.5, 3.4_

- [x] 4.2 Write property test for invalid input rejection


  - **Property 8: Invalid input rejection**
  - **Validates: Requirements 1.5, 2.2**

- [x] 4.3 Write property test for depth resolution preservation

  - **Property 6: Depth resolution preservation**
  - **Validates: Requirements 3.4**

- [x] 4.4 Implement confidence assignment system

  - Create assignConfidenceLevels method in StrataExtractor
  - Add logic for high/medium confidence determination
  - Implement confidence updates for user edits
  - _Requirements: 3.5, 4.4_


- [x] 4.5 Write property test for confidence assignment logic

  - **Property 7: Confidence assignment logic**
  - **Validates: Requirements 3.5**


- [x] 4.6 Write property test for user edit confidence update
  - **Property 10: User edit confidence update**
  - **Validates: Requirements 4.4**

- [-] 5. Create draft review interface


- [x] 5.1 Build review UI components


  - Create `js/extraction/ReviewInterface.js`
  - Create ReviewInterface class for draft display
  - Implement displayDraftLayers method with required fields
  - Add layer editing controls (edit depths, rename materials)
  - Create merge/split layer functionality
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 5.2 Write property test for required field display


  - **Property 12: Required field display**
  - **Validates: Requirements 4.2**






- [x] 5.3 Implement user confirmation and save logic



  - Create confirmAndSave method for final data persistence


  - Add schema compliance validation before saving
  - Implement integration with existing strata data storage in database.js




  - _Requirements: 4.5, 5.1_

- [x] 5.4 Write property test for schema compliance


  - **Property 11: Schema compliance**
  - **Validates: Requirements 4.5, 5.1**

- [x] 6. Integrate with existing StrataDesk systems


- [x] 6.1 Connect to file management system



  - Modify `js/modules/files.js` to support extraction workflow


  - Add file type detection for .xlsx and .pdf triggering extraction
  - Integrate with existing file storage mechanisms


  - _Requirements: 1.1, 2.1_

- [x] 6.2 Integrate with strata data storage


  - Ensure imported data uses existing schema in database.js
  - Add source metadata tracking for imported records
  - Implement compatibility with cross-sections and modeling features
  - _Requirements: 5.1, 5.2, 5.3_





- [x] 6.3 Write property test for functional integration
  - **Property 13: Functional integration**
  - **Validates: Requirements 5.2**

- [x] 6.4 Write property test for source metadata preservation


  - **Property 14: Source metadata preservation**
  - **Validates: Requirements 5.3**

- [x] 6.5 Write property test for unit preservation


  - **Property 15: Unit preservation**
  - **Validates: Requirements 5.4**



- [ ] 7. Implement comprehensive error handling


- [x] 7.1 Create error messaging system


  - Create `js/extraction/ErrorHandler.js`
  - Implement specific error messages for depth detection failures
  - Add detailed explanations for material identification failures
  - Create guidance messages for unsupported formats
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 7.2 Add fallback and recovery mechanisms
  - Implement manual entry fallback when extraction fails
  - Add partial extraction support with user notifications
  - Create graceful degradation for low confidence extractions
  - _Requirements: 5.5, 6.4, 6.5_

- [ ] 8. Add extraction workflow to UI
- [x] 8.1 Modify file upload interface
  - Update `index.html` file upload dialog with extraction option
  - Create progress indicators for extraction process
  - Add extraction status feedback to users


  - _Requirements: 1.1, 2.1_

- [x] 8.2 Integrate review interface with main UI
  - Add review modal to existing UI framework in `js/modules/ui.js`
  - Connect review interface to strata data display
  - Ensure consistent styling with existing components in `styles/`
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Create test data and validation
- [x] 10.1 Generate test Excel files
  - Create `test-data/` directory with sample strata charts
  - Create sample strata charts matching the provided example format
  - Generate edge case files (missing data, inconsistent formats)
  - Create files with various column arrangements and naming
  - _Requirements: All_

- [x] 10.2 Generate test PDF files
  - Create PDF exports of Excel strata charts
  - Generate PDFs with various text layouts and readability levels
  - Create corrupted or unclear PDFs for error testing
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 10.3 Write integration tests for complete workflow
  - Test full extraction workflow from upload to save
  - Verify integration with existing StrataDesk features
  - Test error scenarios and recovery mechanisms
  - _Requirements: All_

- [x] 11. Final checkpoint - Ensure all tests pass
  - All property tests pass successfully
  - FunctionalIntegration tests pass with async property fixes
  - ReviewInterface tests pass with unit preservation fixes
  - Core extraction system is fully hardened and tested
