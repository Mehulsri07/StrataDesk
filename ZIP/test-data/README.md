# Test Data for Strata Chart Extraction

This directory contains test files for validating the strata chart extraction system.

## File Types

### Excel Files (.xlsx)
- `sample-strata-basic.xlsx` - Basic strata chart with standard format
- `sample-strata-complex.xlsx` - Complex chart with multiple materials and depths
- `sample-strata-edge-cases.xlsx` - Edge cases (missing data, inconsistent formats)
- `sample-strata-different-columns.xlsx` - Various column arrangements and naming

### PDF Files (.pdf)
- `sample-strata-basic.pdf` - PDF export of basic Excel chart
- `sample-strata-complex.pdf` - PDF export of complex Excel chart
- `sample-strata-unclear.pdf` - PDF with poor readability for error testing

## Test Scenarios

### Valid Data Tests
- Standard depth and material columns
- Various material types (clay, sand, gravel, rock, etc.)
- Different depth units (feet, meters)
- Multiple layer configurations

### Edge Case Tests
- Missing depth values
- Inconsistent column naming
- Empty cells in material columns
- Overlapping depth ranges
- Non-numeric depth values

### Error Condition Tests
- Corrupted file formats
- Unreadable PDF text
- Missing required columns
- Invalid depth sequences