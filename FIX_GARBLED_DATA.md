# 🔧 Fix Garbled Material Names

## 🐛 Problem

The import preview shows garbled material names like:
- QID
- K,,,ll
- zcQ
- IMN
- Tcfx
- QqGP-Ab

This means the parser is reading the **wrong columns** from your Excel file.

## 🔍 Diagnose the Issue

### Step 1: Use the Diagnostic Tool

1. Open `stratadesk-local/DIAGNOSE_EXCEL.html` in your browser
2. Upload "Study Hall school.xlsx"
3. Look at the table to see your data structure
4. Find which columns contain:
   - **From/Start depths** (should be numbers like 0, 3, 6, 9)
   - **To/End depths** (should be numbers like 1, 6, 7, 67)
   - **Material names** (should be text like "Clay", "Sand", "Gravel")

### Step 2: Check Console Output

1. Open the main app (`index.html`)
2. Press F12 to open console
3. Upload the Excel file
4. Look for these messages:
   ```
   Excel rows: [...]
   Found header at row: X
   Headers: [...]
   Initial detection - From: X To: Y Material: Z
   Row X: From="..." To="..." Material="..."
   ```

## 🎯 Common Issues

### Issue 1: Wrong Columns Detected

**Symptom**: Material column shows numbers or garbled text

**Cause**: Parser detected wrong column as "Material"

**Fix**: The headers might not match expected patterns

**Check**:
- Does your file have headers like "From", "To", "Material"?
- Or does it use different names like "Depth Start", "Depth End", "Soil Type"?
- Are headers in English or another language?

### Issue 2: Header Not Found

**Symptom**: Parser starts reading from wrong row

**Cause**: Headers are not in first 15 rows or don't match patterns

**Fix**: Headers should contain words like:
- From, Start, Top, Upper (for start depth)
- To, End, Bottom, Lower (for end depth)
- Material, Soil, Lithology, Description, Layer, Strata (for material)

### Issue 3: Data in Wrong Format

**Symptom**: Numbers where text should be, or vice versa

**Cause**: Columns are swapped or data is in unexpected format

**Fix**: Check if your file has:
- S.No column before depth columns
- Multiple header rows
- Merged cells
- Empty columns between data

## 🔧 Quick Fixes

### Fix 1: Check Your File Structure

Open "Study Hall school.xlsx" in Excel and verify:

1. **Headers are clear**:
   ```
   From (m) | To (m) | Soil Description
   ```

2. **Data starts immediately after headers**:
   ```
   0        | 3      | Clay
   3        | 6      | Sandy Clay
   ```

3. **No merged cells or empty rows**

### Fix 2: Simplify the File

Create a new Excel file with just 3 columns:

```
From | To | Material
0    | 3  | Clay
3    | 6  | Sandy Clay
6    | 9  | Gravel
```

Save and try importing again.

### Fix 3: Check Column Order

The parser expects columns in this order (or similar):
1. Optional: S.No / Serial Number
2. From / Start Depth
3. To / End Depth
4. Material / Soil Description

If your columns are in different order, the parser might get confused.

## 📊 What the Diagnostic Tool Shows

The diagnostic tool will show you:

1. **Table View**: See your data in a grid
   - Row numbers on the left
   - Column numbers (Col 0, Col 1, Col 2...) on top
   - Your actual data in cells

2. **Column Analysis**: Shows which columns were detected
   - "From column: Col X"
   - "To column: Col Y"
   - "Material column: Col Z"

3. **Sample Data**: Shows what data was read from each column

## 🎯 Expected Output

### Good Output (Diagnostic Tool)
```
✅ Possible header at Row 2: ["S.No", "From (m)", "To (m)", "Soil Description"]
   Keywords found: From (m), To (m), Soil Description
   From column: Col 1
   To column: Col 2
   Material column: Col 3
   Sample data from next row:
      From: "0"
      To: "3"
      Material: "Clay"
```

### Bad Output (Diagnostic Tool)
```
✅ Possible header at Row 2: ["S.No", "From (m)", "To (m)", "Soil Description"]
   Keywords found: From (m), To (m), Soil Description
   From column: Col 1
   To column: Col 2
   Material column: NOT FOUND  ← Problem!
```

## 🔄 Next Steps

1. **Run the diagnostic tool** to see your file structure
2. **Check the console output** when importing
3. **Share the diagnostic output** if you need help:
   - Take a screenshot of the table
   - Copy the "Column Analysis" section
   - Share the "Sample data" section

4. **Try simplifying the file** if detection fails

## 📝 Information Needed

To help fix this, I need to know:

1. **What does the diagnostic tool show?**
   - Which row is the header?
   - Which columns are detected?
   - What does the sample data show?

2. **What does the console show?**
   - "Headers: [...]"
   - "Initial detection - From: X To: Y Material: Z"
   - "Row X: From='...' To='...' Material='...'"

3. **What should the data be?**
   - What are the actual material names?
   - What are the depth ranges?

---

**Quick Action**: Open `DIAGNOSE_EXCEL.html` and upload your file to see what's wrong!
