# Strata Extraction Feature

## Overview

The Strata Extraction feature has been moved from the sidebar's "Additional Features" section to a dedicated main tab in the application. This provides a more professional and streamlined workflow for extracting geological layer data from PDF and Excel files.

## What Changed

### Before
- Extraction was embedded in the data entry panel sidebar
- Limited space for displaying results
- Mixed with other form fields
- Less intuitive workflow

### After
- Dedicated "Strata Extraction" tab in the main content area
- Full-screen workflow with clear steps
- Better visualization of results
- Quick extraction option still available in sidebar

## Features

### Main Extraction Tab

The new extraction tab provides a 4-step workflow:

#### Step 1: Upload Files
- Drag-and-drop interface for PDF and Excel files
- Support for multiple files
- Visual file list with file type indicators
- File size display

#### Step 2: Configure Extraction
- **Confidence Threshold**: Choose extraction accuracy level
  - Low (30%): Extract more data, may need review
  - Medium (50%): Balanced accuracy (default)
  - High (70%): Only high-confidence data
  - Very High (90%): Maximum accuracy
  
- **Depth Units**: Select feet, meters, or auto-detect
- **Processing Options**:
  - Enable fallback processing for unclear data
  - Automatically open review interface

#### Step 3: Processing
- Real-time progress indicator with circular progress bar
- Step-by-step status updates:
  - Reading Files
  - Parsing Data
  - Extracting Layers
  - Validating
- Cancel option available during processing

#### Step 4: Review Results
- Summary cards showing:
  - Total layers found
  - Files processed
  - Average confidence score
- Visual layer list with:
  - Material type
  - Depth range and thickness
  - Confidence level (color-coded)
  - Layer color preview
- Actions:
  - Review & Edit: Open detailed review interface
  - Save to Project: Add extracted data to current project
  - Start Over: Reset and extract new files

### Quick Extraction (Sidebar)

For users who want a faster workflow:
- Select files in the data entry panel
- Click "Quick Extract" button
- Automatically populates strata layers in the form
- Ideal for single-file, quick data entry

### Advanced Extraction (Main Tab)

For users who need more control:
- Click "Advanced Extraction" button in sidebar
- Opens the main Strata Extraction tab
- Full configuration options
- Better for batch processing multiple files

## User Interface

### Tab Navigation
- Three main tabs: Map View, Strata Extraction, Files
- Tab switching preserves state
- Keyboard navigation support

### Visual Design
- Clean, modern interface
- Color-coded confidence levels:
  - Green: High confidence
  - Yellow: Medium confidence
  - Red: Low confidence
- Responsive layout for different screen sizes

### Notifications
- Toast notifications for user feedback
- Success, warning, error, and info types
- Auto-dismiss after 3 seconds

## Technical Implementation

### New Files Created
1. `js/modules/tab-manager.js` - Main tab switching logic
2. `js/modules/extraction-tab.js` - Extraction tab workflow manager
3. `js/modules/quick-extraction.js` - Quick extraction handler
4. Updated `index.html` - New tab structure
5. Updated `styles/layout.css` - Tab and extraction UI styles
6. Updated `styles/components.css` - Notifications and modals

### Integration Points
- Works with existing `StrataExtractor` class
- Compatible with `ReviewInterface` for detailed editing
- Integrates with project management system
- Uses existing file upload infrastructure

### Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Progressive Web App (PWA) compatible
- Electron desktop app compatible

## Usage Examples

### Example 1: Quick Extraction
1. Go to "Add Boring Data" panel in sidebar
2. Upload a strata chart file (PDF or Excel)
3. Click "Quick Extract" button
4. Review auto-populated layers
5. Click "Save Boring"

### Example 2: Advanced Extraction
1. Click "Strata Extraction" tab in main area
2. Drag and drop multiple files
3. Configure confidence threshold and options
4. Click "Start Extraction"
5. Review results with visual preview
6. Edit if needed, then save to project

### Example 3: Batch Processing
1. Open Strata Extraction tab
2. Upload 5-10 strata chart files
3. Set confidence to "High" for accuracy
4. Start extraction
5. Review combined results
6. Export or save to multiple borings

## Future Enhancements

Potential improvements for future versions:
- Visual strata chart preview with colors
- Side-by-side comparison of original vs extracted
- Machine learning confidence improvements
- Custom material type definitions
- Batch export to multiple formats
- Integration with external geological databases
- OCR improvements for scanned PDFs
- Template-based extraction for common formats

## Troubleshooting

### Files Not Extracting
- Ensure files are PDF or Excel format (.pdf, .xlsx, .xls)
- Check that files contain tabular data with depth and material columns
- Try lowering confidence threshold
- Enable fallback processing

### Low Confidence Results
- Increase confidence threshold for more accurate results
- Review and manually edit extracted data
- Check source file quality and formatting

### Performance Issues
- Process fewer files at once
- Close other browser tabs
- Clear browser cache
- Use desktop app for better performance

## Support

For issues or questions:
1. Check the Help button (?) in the extraction tab
2. Review sample files in `test-data/` directory
3. Consult the main USER_GUIDE.md
4. Check browser console for error messages