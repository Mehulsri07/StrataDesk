# StrataDesk Setup Guide

## Initial Setup

### 1. Install Dependencies

```bash
npm install
```

This will install:
- Electron (desktop framework)
- electron-builder (for creating installers)
- electron-reload (hot reload during development)
- pdfjs-dist (PDF processing)
- xlsx (Excel processing)
- Development tools (Jest, fast-check)

### 2. Verify Installation

Check that everything installed correctly:

```bash
npm list --depth=0
```

You should see all dependencies listed without errors.

### 3. Run the Application

**Development mode** (with DevTools):
```bash
npm run dev
```

**Production mode**:
```bash
npm start
```

## First Run

1. The application will show a splash screen for 2 seconds
2. You'll see the login screen
3. Options:
   - **Create Account**: Register a new user (stored locally)
   - **Sign In**: Login with existing credentials
   - **Continue as Guest**: Use without authentication

## Common Issues & Solutions

### Issue: "Cannot find module 'electron-reload'"

**Solution**: This is optional for development. The app will run fine without it.

To install it:
```bash
npm install --save-dev electron-reload
```

### Issue: Application window is blank

**Possible causes**:
1. JavaScript errors in console
2. Missing dependencies
3. Browser compatibility

**Solutions**:
1. Open DevTools (F12 or Ctrl+Shift+I)
2. Check Console tab for errors
3. Try clearing cache: Delete `%APPDATA%/StrataDesk` folder
4. Reinstall: `rm -rf node_modules && npm install`

### Issue: Map not loading

**Cause**: Internet connection required for map tiles

**Solution**: 
- Check internet connection
- Map tiles load from OpenStreetMap CDN
- Offline mode: Map will show but tiles won't load

### Issue: PDF/Excel extraction not working

**Possible causes**:
1. CDN libraries not loaded
2. File format not supported
3. File corrupted

**Solutions**:
1. Check browser console for library load errors
2. Verify file format (PDF or .xlsx/.xls)
3. Try a different file

### Issue: Build fails

**Common causes**:
1. Missing electron-builder dependencies
2. Insufficient disk space
3. Antivirus blocking

**Solutions**:
```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build-win
```

## Development Workflow

### 1. Making Changes

Edit files in:
- `js/` - JavaScript modules
- `styles/` - CSS stylesheets
- `index.html` - Main UI
- `main.js` - Electron main process

### 2. Testing Changes

With `electron-reload` installed:
- Changes auto-reload
- No need to restart

Without `electron-reload`:
- Stop app (Ctrl+C)
- Run `npm start` again

### 3. Debugging

**Renderer Process** (UI):
- Open DevTools: F12 or Ctrl+Shift+I
- Console tab for logs
- Network tab for CDN issues
- Application tab for IndexedDB

**Main Process** (Electron):
- Check terminal output
- Add `console.log()` in main.js
- Restart app to see logs

## Building for Distribution

### Windows

```bash
npm run build-win
```

Creates:
- `dist/StrataDesk Setup 2.0.0.exe` - Installer
- `dist/StrataDesk 2.0.0.exe` - Portable version

### macOS

```bash
npm run build-mac
```

Creates:
- `dist/StrataDesk-2.0.0.dmg` - Disk image
- `dist/StrataDesk-2.0.0-arm64.dmg` - Apple Silicon
- `dist/StrataDesk-2.0.0-x64.dmg` - Intel

### Linux

```bash
npm run build-linux
```

Creates:
- `dist/StrataDesk-2.0.0.AppImage` - Universal Linux package

### All Platforms

```bash
npm run build-all
```

**Note**: Building for macOS requires macOS. Building for Windows works on any platform.

## Backend Server (Optional)

The backend server is optional. The app works fully offline without it.

### Setup Backend

```bash
cd backend
npm install
```

### Configure Backend

1. Copy `.env.example` to `.env`
2. Edit `.env` with your settings

### Run Backend

```bash
cd backend
npm start
```

Backend runs on `http://localhost:3000` by default.

## Project Structure

```
StrataDesk/
├── main.js              # Electron main process
├── preload.js          # Electron preload (security bridge)
├── index.html          # Main UI
├── package.json        # Dependencies
│
├── js/
│   ├── app.js         # App initialization
│   ├── core/          # Core modules (db, auth, config)
│   ├── modules/       # Feature modules (ui, map, files)
│   ├── extraction/    # Strata extraction engine
│   └── features/      # Enhanced features
│
├── styles/            # CSS files
├── icons/             # App icons
├── docs/              # Documentation
└── backend/           # Optional backend server
```

## Data Storage

### Local Storage
- **Location**: Browser IndexedDB
- **Database**: StrataDesk
- **Stores**: users, projects, files

### View Data
1. Open DevTools (F12)
2. Application tab
3. IndexedDB → StrataDesk

### Clear Data
```javascript
// In browser console
await window.strataApp.reset()
```

**Warning**: This deletes all data!

## Security Notes

1. **Passwords**: Hashed with bcryptjs (or fallback SHA-256)
2. **Files**: Stored as base64 in IndexedDB
3. **No external servers**: All data stays local
4. **Context isolation**: Enabled for security

## Performance Tips

1. **Large files**: Keep under 50MB
2. **Many projects**: Export old projects to free space
3. **Slow map**: Reduce zoom level
4. **Memory**: Close unused projects

## Getting Help

1. Check `docs/USER_GUIDE.md`
2. Check `docs/PROJECT_MASTER.md` for technical details
3. Open an issue on GitHub
4. Check browser console for errors

## Next Steps

1. ✅ Install dependencies
2. ✅ Run the app
3. ✅ Create an account or use guest mode
4. ✅ Create your first project
5. ✅ Add boring data
6. ✅ Try strata extraction feature

Happy mapping! 🗺️
