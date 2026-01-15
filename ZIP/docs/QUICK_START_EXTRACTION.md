# Quick Start: Strata Extraction

## 🚀 Getting Started in 3 Minutes

### Option 1: Quick Extraction (Fastest)

Perfect for adding strata data to a single boring quickly.

1. **Go to sidebar** → "📤 Add Boring Data" panel
2. **Upload a file** → Click "📁 Files" and select your strata chart (PDF or Excel)
3. **Click "⚡ Quick Extract"** → Wait 2-3 seconds
4. **Review** → Strata layers automatically populate in the form
5. **Save** → Click "✅ Save Boring"

**Time: ~30 seconds**

---

### Option 2: Advanced Extraction (Most Powerful)

Perfect for processing multiple files or when you need more control.

1. **Click the "🔍 Strata Extraction" tab** at the top of the main area
2. **Upload files**:
   - Drag and drop files into the upload zone, OR
   - Click the upload zone to browse
3. **Configure settings** (optional):
   - Choose confidence threshold (default: Medium 50%)
   - Select depth units (default: Feet)
4. **Click "🔍 Start Extraction"**
5. **Review results**:
   - See summary cards (layers found, files processed, confidence)
   - View detailed layer list with colors and depths
6. **Take action**:
   - Click "✅ Save to Project" to add to your project
   - Click "👁️ Review & Edit" to make changes
   - Click "📤" to export results

**Time: ~2 minutes**

---

## 📋 Supported File Formats

| Format | Extension | Notes |
|--------|-----------|-------|
| PDF | `.pdf` | Boring logs, geological reports with tables |
| Excel | `.xlsx` | Modern Excel format (recommended) |
| Excel | `.xls` | Legacy Excel format |

---

## 💡 Tips for Best Results

### File Preparation
✅ **DO**: Use files with clear depth and material columns
✅ **DO**: Ensure consistent units (all feet or all meters)
✅ **DO**: Use standard material names (clay, sand, gravel, etc.)

❌ **DON'T**: Use scanned images without OCR
❌ **DON'T**: Mix units in the same file
❌ **DON'T**: Use heavily formatted or merged cells in Excel

### Confidence Settings
- **Low (30%)**: Extract more data, but may need manual review
- **Medium (50%)**: ⭐ Recommended - balanced accuracy
- **High (70%)**: Only high-confidence data, fewer results
- **Very High (90%)**: Maximum accuracy, minimal results

### When to Use Each Option

**Use Quick Extraction when:**
- Adding a single boring
- File format is standard
- You trust the data quality
- Speed is priority

**Use Advanced Extraction when:**
- Processing multiple files
- Need to review before saving
- Want to adjust confidence settings
- Batch processing data
- Need to export results

---

## 🎯 Example Workflows

### Workflow 1: Single Boring Entry
```
1. Open sidebar → Add Boring Data
2. Fill in location, date, bore ID
3. Upload strata chart file
4. Click "Quick Extract"
5. Review auto-populated layers
6. Add water level and notes
7. Click "Save Boring"
```
**Total time: 2-3 minutes**

### Workflow 2: Batch Processing
```
1. Click "Strata Extraction" tab
2. Upload 5-10 strata chart files
3. Set confidence to "High"
4. Click "Start Extraction"
5. Review combined results
6. Export to JSON or save to project
7. Create individual borings from results
```
**Total time: 5-10 minutes for 10 files**

### Workflow 3: Quality Control
```
1. Click "Strata Extraction" tab
2. Upload file
3. Set confidence to "Low" (30%)
4. Extract all possible data
5. Click "Review & Edit"
6. Manually verify each layer
7. Adjust depths and materials
8. Save verified data
```
**Total time: 5-7 minutes per file**

---

## 🔍 Understanding Results

### Confidence Levels
- 🟢 **High** (70%+): Data is reliable, safe to use
- 🟡 **Medium** (50-70%): Review recommended
- 🔴 **Low** (<50%): Manual verification required

### Layer Information
Each extracted layer shows:
- **Material type**: Clay, sand, gravel, etc.
- **Depth range**: Start and end depth
- **Thickness**: Calculated automatically
- **Confidence**: How certain the extraction is
- **Source file**: Which file it came from (batch mode)

---

## ❓ Troubleshooting

### "No files selected" error
**Solution**: Make sure you've uploaded PDF or Excel files

### "Extraction failed" error
**Solution**: 
1. Check file format is supported
2. Try lowering confidence threshold
3. Enable "fallback processing" option
4. Verify file isn't corrupted

### Low confidence results
**Solution**:
1. Check source file quality
2. Ensure clear column headers
3. Use standard material names
4. Try manual review and edit

### No layers extracted
**Solution**:
1. Lower confidence threshold to 30%
2. Enable fallback processing
3. Check file has depth and material columns
4. Try different file format

### Incorrect depths
**Solution**:
1. Verify depth units in source file
2. Check for merged cells in Excel
3. Use "Review & Edit" to correct
4. Ensure consistent formatting

---

## 🎓 Next Steps

After mastering basic extraction:

1. **Explore Review Interface**: Click "👁️ Review & Edit" to see detailed editing
2. **Try Batch Processing**: Upload multiple files at once
3. **Export Results**: Use the export button to save JSON
4. **Customize Settings**: Experiment with different confidence levels
5. **Read Full Documentation**: See `STRATA_EXTRACTION_FEATURE.md`

---

## 📞 Need Help?

- Click the **❓ Help** button in the extraction tab
- Check the **USER_GUIDE.md** for detailed instructions
- Review **sample files** in the `test-data/` folder
- Check browser console for error messages

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + 2` | Open Strata Extraction tab |
| `Ctrl/Cmd + U` | Upload files (in extraction tab) |
| `Ctrl/Cmd + Enter` | Start extraction |
| `Esc` | Cancel extraction |

---

## 🎉 Success!

You're now ready to use the strata extraction feature! Start with Quick Extraction for simple cases, then explore Advanced Extraction as you become more comfortable.

**Happy extracting! 🗺️**