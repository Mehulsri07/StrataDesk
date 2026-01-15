# Requirements Document

## Introduction

This feature implements automatic extraction of strata layer data from Excel (.xlsx) and PDF files containing strata charts. The system must convert visual strata charts into structured depth-accurate data suitable for geological modeling, eliminating the need for manual layer-by-layer entry while maintaining data accuracy and user control.

## Glossary

- **Strata Chart**: A visual representation showing geological layers at different depths with material types and colors
- **Strata Layer**: A continuous geological formation with consistent material properties between specific depth ranges
- **Depth Resolution**: The increment between depth measurements (e.g., 10 feet, 5 feet)
- **Material Type**: The geological material classification (e.g., Clay, Sand, Rock)
- **Confidence Level**: A measure of extraction accuracy (high, medium) based on available data signals
- **Draft Record**: An extracted strata record pending user verification before saving
- **StrataDesk**: The geological boring data management system

## Requirements

### Requirement 1

**User Story:** As a geologist, I want to upload Excel strata charts and have the system automatically extract layer data, so that I don't have to manually enter each layer.

#### Acceptance Criteria

1. WHEN a user uploads an Excel file with strata chart data THEN StrataDesk SHALL automatically detect the depth column and strata material column
2. WHEN the system processes the Excel file THEN StrataDesk SHALL extract continuous material layers with accurate start and end depths
3. WHEN material text and background colors are both present THEN StrataDesk SHALL use text as the primary material identifier
4. WHEN only background colors are present without text THEN StrataDesk SHALL prompt the user to assign material names to detected colors
5. WHEN depth values are missing or inconsistent THEN StrataDesk SHALL abort the import process and notify the user

### Requirement 2

**User Story:** As a geologist, I want to upload PDF strata charts and have the system extract layer data, so that I can import data from various document formats.

#### Acceptance Criteria

1. WHEN a user uploads a PDF containing strata chart data THEN StrataDesk SHALL attempt to extract depth labels and material text
2. WHEN PDF depth scale or material text is unreadable THEN StrataDesk SHALL abort auto-import and request manual confirmation
3. WHEN PDF extraction succeeds THEN StrataDesk SHALL generate structured layers identical to Excel extraction format
4. WHEN PDF contains rectangular colored regions with readable text THEN StrataDesk SHALL map colors and text to material types
5. WHEN PDF processing fails THEN StrataDesk SHALL provide clear error messages explaining the failure reason

### Requirement 3

**User Story:** As a geologist, I want the system to detect strata layer boundaries accurately, so that the extracted data represents the true geological structure.

#### Acceptance Criteria

1. WHEN processing strata data THEN StrataDesk SHALL identify continuous vertical sequences where material remains consistent
2. WHEN material type changes between depth intervals THEN StrataDesk SHALL create separate layers with accurate boundary depths
3. WHEN the same material appears in multiple non-contiguous sections THEN StrataDesk SHALL create separate layer records for each section
4. WHEN depth resolution varies within the file THEN StrataDesk SHALL preserve the original depth increments
5. WHEN layer boundaries are ambiguous THEN StrataDesk SHALL assign medium confidence level to affected layers

### Requirement 4

**User Story:** As a geologist, I want to review and edit extracted strata data before saving, so that I can ensure accuracy and make necessary corrections.

#### Acceptance Criteria

1. WHEN strata extraction completes THEN StrataDesk SHALL display a draft review interface showing all extracted layers
2. WHEN displaying the draft THEN StrataDesk SHALL show material names, start depths, end depths, and confidence levels
3. WHEN reviewing extracted data THEN StrataDesk SHALL allow users to edit depths, rename materials, and merge or split layers
4. WHEN user makes edits to extracted data THEN StrataDesk SHALL update confidence level to high for modified layers
5. WHEN user confirms the draft THEN StrataDesk SHALL save the structured layers using the existing strata data schema

### Requirement 5

**User Story:** As a geologist, I want extracted strata data to integrate seamlessly with existing functionality, so that imported data works identically to manually entered data.

#### Acceptance Criteria

1. WHEN strata data is imported and saved THEN StrataDesk SHALL store it using the identical schema as manually entered strata
2. WHEN imported strata data is saved THEN StrataDesk SHALL make it available for cross-sections, interpolation, and modeling
3. WHEN displaying imported strata records THEN StrataDesk SHALL show source information indicating the import method
4. WHEN processing imported layers THEN StrataDesk SHALL preserve depth units from the original file
5. WHEN import fails for any reason THEN StrataDesk SHALL maintain existing manual entry capability as fallback

### Requirement 6

**User Story:** As a geologist, I want the system to handle extraction errors gracefully, so that I understand what went wrong and can take appropriate action.

#### Acceptance Criteria

1. WHEN depth values cannot be determined THEN StrataDesk SHALL display specific error messages about depth detection failure
2. WHEN material identification fails THEN StrataDesk SHALL explain which layers could not be processed and why
3. WHEN file format is unsupported THEN StrataDesk SHALL provide clear guidance on supported formats and requirements
4. WHEN extraction confidence is too low THEN StrataDesk SHALL offer manual entry as an alternative
5. WHEN partial extraction succeeds THEN StrataDesk SHALL allow user to proceed with successfully extracted layers while noting failed sections