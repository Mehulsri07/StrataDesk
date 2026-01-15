# StrataDesk Quick Reference

## 🚀 Quick Commands

```bash
# Install dependencies
npm install

# Start application
npm start

# Development mode (with DevTools)
npm run dev

# Check application health
npm run health

# Run tests
npm test

# Build for Windows
npm run build-win

# Build for all platforms
npm run build-all
```

## 📁 Key Files

| File | Purpose |
|------|---------|
| `main.js` | Electron main process |
| `preload.js` | Security bridge |
| `index.html` | Main UI |
| `js/app.js` | App initialization |
| `js/core/config.js` | Configuration |
| `js/core/database.js` | IndexedDB wrapper |
| `js/modules/ui.js` | UI manager |
| `package.json` | Dependencies |

## 🔧 Common Tasks

### Add New Feature Module
1. Create file in `js/modules/your-feature.js`
2. Add script tag to `index.html`
3. Initialize in `js/app.js` if needed

### Modify UI
1. Edit `index.html` for structure
2. Edit `styles/*.css` for styling
3. Edit `js/modules/ui.js` for behavior

### Debug Issues
1. Open DevTools: F12 or Ctrl+Shift+I
2. Check Console tab for errors
3. Check Application → IndexedDB for data
4. Check Network tab for CDN issues

### Clear All Data
```javascript
// In browser console
await window.strataApp.reset()
```

### Export Debug Info
```javascript
// In browser console
await window.strataApp.getDebugInfo()
```

## 🗺️ Application Flow

```
1. main.js starts Electron
   ↓
2. Shows splash.html (2 seconds)
   ↓
3. Loads index.html
   ↓
4. Loads external libraries (bcrypt, JSZip, Leaflet)
   ↓
5. Loads core modules (config, database, auth)
   ↓
6. Loads feature modules (ui, projects, files, map)
   ↓
7. js/app.js initializes application
   ↓
8. Shows login screen OR main app (if logged in)
```

## 🎨 UI Components

### Main Sections
- **Navbar** - Top bar with user info and quick actions
- **Sidebar** - Search, projects, data entry
- **Main Area** - Map, extraction, files (tabs)
- **Preview** - File preview panel

### Key Elements
- `#loginPanel` - Login screen
- `#appPanel` - Main application
- `#map` - Leaflet map container
- `#projectList` - Project list
- `#fileList` - File list
- `#searchResults` - Search results

## 🔌 IPC Communication

### Renderer → Main
```javascript
// File operations
await window.electronAPI.showSaveDialog(options)
await window.electronAPI.writeFile(path, data)
await window.electronAPI.readFile(path)

// Window operations
await window.electronAPI.windowMinimize()
await window.electronAPI.windowMaximize()
await window.electronAPI.windowClose()

// Notifications
await window.electronAPI.showNotification({ title, body })
```

### Main → Renderer
```javascript
// Listen for menu actions
window.electronAPI.onMenuAction((action, data) => {
  // Handle action
})

// Listen for window state changes
window.electronAPI.onWindowStateChange((state) => {
  // Handle state change
})
```

## 💾 Database Schema

### Stores
1. **users** - User accounts
   - id, username, password, email, created

2. **projects** - Projects
   - id, name, description, created, updated

3. **files** - Boring data files
   - id, projectId, boreId, location, date, files, strata, etc.

### Operations
```javascript
// Add record
await db.add('projects', projectData)

// Get record
await db.get('projects', projectId)

// Get all records
await db.getAll('projects')

// Update record
await db.put('projects', projectData)

// Delete record
await db.delete('projects', projectId)

// Search
await db.search(query)
```

## 🗺️ Map Integration

### Initialize Map
```javascript
await mapManager.init()
```

### Add Marker
```javascript
mapManager.addMarker(lat, lng, data)
```

### Click Mode
```javascript
mapManager.enterClickMode((lat, lng) => {
  // Handle click
})
```

### Refresh Markers
```javascript
await mapManager.refreshMarkers()
```

## 📊 Strata Extraction

### Quick Extraction
```javascript
// From sidebar
quickExtraction()
```

### Advanced Extraction
```javascript
// Switch to extraction tab
switchMainTab('extraction')

// Start extraction
startMainExtraction()
```

### Review Results
```javascript
// Review extracted data
reviewExtraction()

// Accept results
acceptExtraction()

// Reject and manual entry
rejectExtraction()
```

## 🎯 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+N | New project |
| Ctrl+F | Search |
| Ctrl+E | Export project |
| Ctrl+M | View map |
| Ctrl+T | Toggle theme |
| F12 | DevTools |
| Ctrl+R | Reload |

## 🐛 Common Errors

### "Cannot find module"
```bash
npm install
```

### "Database error"
```javascript
// Clear IndexedDB
await window.strataApp.reset()
```

### "Map not loading"
- Check internet connection
- Check browser console for errors
- Verify Leaflet CDN is accessible

### "Extraction failed"
- Check file format (PDF or Excel)
- Check file size (<50MB)
- Check browser console for errors

## 📦 Build Configuration

### electron-builder Config
Located in `package.json` under `"build"` key:
- `appId` - Application ID
- `productName` - Display name
- `files` - Files to include
- `win`, `mac`, `linux` - Platform-specific settings

### Output Directory
- `dist/` - Built installers
- `dist/win-unpacked/` - Unpacked Windows build
- `dist/mac/` - Unpacked macOS build

## 🔐 Security Notes

- Passwords hashed with bcryptjs
- Context isolation enabled
- Node integration disabled
- Preload script for IPC
- File type validation
- Input sanitization

## 📈 Performance Tips

- Keep files under 50MB
- Export old projects regularly
- Clear search cache periodically
- Close unused projects
- Reduce map zoom for better performance

## 🆘 Emergency Commands

```bash
# Force reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Electron cache
rm -rf %APPDATA%/StrataDesk

# Reset to clean state
git clean -fdx
npm install
```

## 📞 Getting Help

1. Check `STATUS.md` for current status
2. Check `SETUP.md` for setup issues
3. Check `README.md` for general info
4. Check `docs/` for detailed documentation
5. Run `npm run health` to diagnose issues
6. Check browser console (F12) for errors

## 🎓 Learning Resources

- Electron Docs: https://electronjs.org/docs
- Leaflet Docs: https://leafletjs.com/reference.html
- IndexedDB Guide: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- PDF.js Docs: https://mozilla.github.io/pdf.js/
- SheetJS Docs: https://docs.sheetjs.com/

---

**Quick Start**: `npm install` → `npm start` → Create account → Start mapping! 🗺️
