# StrataDesk - Groundwater Data Management

**Version**: 2.0 - Standalone Edition  
**Status**: Production Ready

## 🚀 Quick Start

1. **Open** `index.html` in any modern web browser
2. **Register** a new account (stored locally)
3. **Create** a project (e.g., "Village Survey 2024")
4. **Add boring data** by clicking on the map
5. **Upload files** and track water levels
6. **Export** your data regularly for backup

## 📚 Complete Documentation

**👉 See [`docs/COMPLETE_PROJECT_DOCUMENTATION.md`](docs/COMPLETE_PROJECT_DOCUMENTATION.md) for everything you need to know:**

- 📖 **User Guide** - Step-by-step instructions for field workers
- 🔧 **Installation** - Desktop app setup and building
- 🏗️ **Technical Architecture** - System design and APIs
- 💻 **Development Guide** - Adding features and debugging
- 🚀 **Enhanced Features** - Advanced system capabilities
- 🔍 **Troubleshooting** - Common issues and solutions

## ✨ Key Features

- **📍 Visual Location Entry** - Click on map to set boring locations
- **💧 Water Level Tracking** - Monitor water table changes over time
- **🗺️ Offline-First** - Works without internet after initial load
- **📱 Mobile Friendly** - Responsive design for all devices
- **🔒 Privacy First** - All data stored locally in your browser
- **📦 Export Ready** - Download projects as ZIP files
- **🌙 Dark Mode** - Easy on the eyes for night work

## 🎯 Project Structure

```
StrataDesk/
├── 📄 index.html                           # Main application
├── 📁 js/                                  # JavaScript modules
│   ├── 📁 core/                           # Core system (config, database, auth)
│   ├── 📁 modules/                        # Features (projects, files, map, search, UI)
│   ├── 📁 features/                       # Enhanced features (address search)
│   └── 📁 enhanced/                       # Advanced components (optional)
├── 📁 styles/                             # CSS modules
├── 📁 docs/                               # Complete documentation
├── 📁 tools/                              # Development utilities
├── 📁 scripts/                            # Build scripts
└── 📁 tests/                              # Test files
```

## 🛠️ For Developers

### Development Mode
```bash
# Open index.html in browser for development
# All modules load separately for easy debugging
```

### Desktop App
```bash
npm install
npm run build-win    # Windows
npm run build-mac    # macOS  
npm run build-linux  # Linux
```

## 📊 Technical Details

- **Frontend**: Pure HTML5, CSS3, JavaScript (ES6+)
- **Database**: IndexedDB (browser storage)
- **Maps**: Leaflet.js with multiple tile providers
- **Architecture**: Modular ES6 classes
- **Desktop**: Electron framework
- **Dependencies**: Only Leaflet.js (loaded from CDN)

## 🆘 Need Help?

1. **📖 Read the complete documentation**: [`docs/COMPLETE_PROJECT_DOCUMENTATION.md`](docs/COMPLETE_PROJECT_DOCUMENTATION.md)
2. **🔧 Use diagnostic tools**: Open `tools/diagnostic.html`
3. **🗑️ Reset if needed**: Open `tools/reset-database.html`
4. **🧪 Run tests**: Open files in `tests/` directory

---

**Ready to manage your groundwater data professionally!** 🎉

*For complete instructions, troubleshooting, and technical details, see the full documentation.*