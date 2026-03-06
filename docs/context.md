# StrataDesk - Complete Project Context

**Version**: 2.0.0  
**Status**: Production Ready  
**Last Updated**: February 2, 2026  
**Type**: Professional Groundwater Boring Data Management Application

---

## 🎯 Project Overview

### What is StrataDesk?

StrataDesk is a **professional groundwater and tubewell data management system** designed for field workers, geologists, and water resource managers. It has evolved from a simple browser-based tool into a comprehensive full-stack Electron desktop application with optional backend server support.

### Key Features

✅ **Visual Location Entry** - Click on map to set boring locations  
✅ **Temporal Tracking** - Multiple borings over time at same location  
✅ **Water Level Monitoring** - Track water table changes  
✅ **Professional File Storage** - Unlimited server-side storage  
✅ **Multi-User Support** - Authentication and user management  
✅ **Offline-First Design** - Works without internet  
✅ **Smart Defaults** - Remembers user preferences  
✅ **Address Search** - Find locations by village/district name  
✅ **Export Capabilities** - ZIP and JSON exports  
✅ **Dark Mode** - Professional UI themes  
✅ **Mobile Responsive** - Works on all devices  
✅ **Strata Chart Extraction** - AI-powered geological layer extraction from PDFs/Excel  
✅ **Photo Geotag Location** - Extract GPS coordinates from geotagged photos  
✅ **Desktop Application** - Native Electron app with custom window controls

---

## 🏗️ Architecture & Technology Stack

### System Architecture

StrataDesk features a **hybrid architecture** supporting both standalone frontend operation and full-stack server deployment:

```
┌─────────────────────────────────────────────────────────────┐
│                    StrataDesk Full-Stack                    │
├─────────────────────────────────────────────────────────────┤
│  Frontend (Browser/Electron)                               │
│  ├── HTML5 Single Page Application                         │
│  ├── Modular JavaScript Architecture                       │
│  ├── Hybrid Storage Manager                                │
│  └── Responsive CSS Framework                              │
├─────────────────────────────────────────────────────────────┤
│  API Layer                                                  │
│  ├── REST API Client (js/core/api.js)                     │
│  ├── Authentication Management                             │
│  ├── Automatic Backend Detection                           │
│  └── Graceful Fallback to Local Storage                   │
├─────────────────────────────────────────────────────────────┤
│  Backend Server (Node.js/Express) - Optional               │
│  ├── Authentication & Authorization                        │
│  ├── File Upload & Management                              │
│  ├── RESTful API Endpoints (25+)                          │
│  ├── Request Validation & Security                         │
│  └── Logging & Monitoring                                  │
├─────────────────────────────────────────────────────────────┤
│  Data Layer                                                 │
│  ├── SQLite Database (Relational) - Backend                │
│  ├── IndexedDB (Browser Storage) - Frontend                │
│  ├── File System Storage (Organized)                       │
│  └── Backup & Recovery                                     │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend**:
- Pure HTML5, CSS3, JavaScript (ES6+)
- Leaflet.js for interactive mapping
- IndexedDB for local storage
- CSS Grid and Flexbox for responsive layout
- CSS Custom Properties for theming
- EXIF.js for photo GPS extraction
- PDF.js for PDF processing
- SheetJS (xlsx) for Excel processing

**Desktop Application**:
- Electron 28.0.0 framework
- Custom window controls and titlebar
- Native file system integration
- Desktop notifications
- Auto-updater ready

**Backend (Optional)**:
- Node.js 18+ runtime
- Express.js web framework
- SQLite database with spatial extensions
- JWT authentication
- bcrypt password hashing
- Multer for file uploads
- Sharp for image processing

---

## 📁 Project Structure

```
StrataDesk/
├── 📄 index.html                           # Main application
├── 📄 main.js                              # Electron main process
├── 📄 preload.js                           # Electron preload script
├── 📄 manifest.json                        # PWA manifest
├── 📄 splash.html                          # Splash screen
├── 📄 package.json                         # Frontend dependencies
├── 📄 jest.config.js                       # Test configuration
├── 📄 README.md                            # Quick start guide

📁 js/                                     # JavaScript Architecture
├── 📄 app.js                              # Main application controller
├── 📁 core/                               # Core system files
│   ├── 📄 config.js                       # Application configuration
│   ├── 📄 database.js                     # IndexedDB database layer
│   ├── 📄 auth.js                         # Authentication system
│   └── 📄 api.js                          # Backend API client
├── 📁 modules/                            # Feature modules
│   ├── 📄 projects.js                     # Project management
│   ├── 📄 files.js                        # File handling
│   ├── 📄 map.js                          # Map integration
│   ├── 📄 search.js                       # Search functionality
│   ├── 📄 ui.js                           # UI management
│   ├── 📄 simplified-ui.js                # Simplified UI manager
│   ├── 📄 photo-geotag.js                 # Photo GPS extraction
│   ├── 📄 photo-geotag-demo.js            # Photo demo functionality
│   ├── 📄 extraction-tab.js               # Strata extraction tab
│   └── 📄 quick-extraction.js             # Quick extraction handler
├── 📁 extraction/                         # Strata extraction engine
│   ├── 📄 StrataExtractor.js              # Main extraction class
│   ├── 📄 ExtractionUI.js                 # Extraction UI components
│   ├── 📄 ReviewInterface.js              # Review and editing interface
│   ├── 📄 PDFExtractor.js                 # PDF processing
│   └── 📄 ExcelExtractor.js               # Excel processing
├── 📁 features/                           # Enhanced features
│   └── 📄 AddressSearchIntegration.js     # Address search
└── 📁 enhanced/                           # Advanced components (optional)

📁 styles/                                 # CSS Architecture
├── 📄 variables.css                       # CSS custom properties (dark theme default)
├── 📄 base.css                           # Base styles and resets
├── 📄 components.css                     # UI component styles
├── 📄 layout.css                         # Layout and grid system
└── 📄 responsive.css                     # Mobile responsiveness

📁 backend/                               # Backend System (Optional)
├── 📄 server.js                          # Express server
├── 📄 package.json                       # Backend dependencies
├── 📄 .env.example                       # Environment template
└── 📁 src/                               # Backend source code
    ├── 📁 routes/                        # API endpoints
    ├── 📁 middleware/                    # Express middleware
    ├── 📁 database/                      # Database layer
    ├── 📁 utils/                         # Utilities
    └── 📁 services/                      # Business logic

📁 docs/                                  # Documentation
├── 📄 context.md                         # This comprehensive context file
├── 📄 USER_GUIDE.md                      # User documentation
├── 📄 SETUP.md                           # Setup instructions
├── 📄 STATUS.md                          # Current status
├── 📄 PHOTO_GEOTAG_FEATURE.md           # Photo geotag documentation
├── 📄 STRATA_EXTRACTION_FEATURE.md      # Extraction feature docs
└── (other documentation files)

📁 icons/                                 # Application icons
📁 scripts/                               # Build and utility scripts
📁 test-data/                             # Sample data for testing
📁 junk/                                  # Obsolete files (moved during cleanup)
```

---

## 🚀 Core Features & Functionality

### 1. Project Management
- **Create Projects**: Organize groundwater data by project
- **Switch Projects**: Easily switch between different projects
- **Project Files**: View all files associated with each project
- **Export Projects**: Download complete project data as ZIP files

### 2. Location Management
- **Interactive Map**: Click directly on the map to set locations (Leaflet.js)
- **Address Search**: Search for addresses with autocomplete
- **Coordinate Input**: Enter precise lat/lng coordinates
- **Photo Geotag**: Extract GPS coordinates from geotagged photos
- **Location History**: Reuse previous locations

### 3. Data Entry & File Management
- **Boring Information**: Bore ID, water level, date, surveyor details
- **File Attachments**: PDF, Excel, images, and more
- **Tags & Notes**: Organize with custom tags and detailed notes
- **Auto-save**: Form data automatically saved as you type
- **Drag & Drop**: Drag files directly onto forms

### 4. Strata Chart Extraction (AI-Powered)
- **PDF Processing**: Extract geological layers from PDF boring logs
- **Excel Processing**: Process Excel spreadsheets with strata data
- **Confidence Levels**: High/Medium/Low confidence scoring
- **Review Interface**: Edit and validate extracted data
- **Batch Processing**: Process multiple files simultaneously
- **Quick Extraction**: Fast extraction for single files
- **Advanced Extraction**: Full-featured extraction workflow

### 5. Photo Geotag Location Feature
- **GPS Extraction**: Automatically extract GPS coordinates from EXIF data
- **Supported Formats**: JPEG, TIFF with GPS metadata
- **Demo Mode**: Built-in demo with sample geotagged photos
- **Drag & Drop**: Drag photos directly onto upload zones
- **Coordinate Copying**: Click coordinates to copy to clipboard
- **Error Handling**: Clear messages for all failure scenarios

### 6. Map Integration
- **Interactive Map**: Powered by Leaflet with multiple tile layers
- **Location Markers**: Visual markers for all boring locations
- **Click to Set**: Click anywhere on the map to set location
- **Address Geocoding**: Convert addresses to coordinates
- **Marker Clustering**: Group nearby markers for better visualization

### 7. Search & Filtering
- **Real-time Search**: Search as you type
- **Filter Options**: Filter by projects, files, locations
- **Smart Results**: Relevant results with context
- **Keyboard Navigation**: Navigate results with arrow keys

### 8. Data Export & Import
- **Project Export**: Complete project as ZIP
- **Backup All**: Full database backup
- **Individual Files**: Download specific files
- **Metadata Export**: Export data structure
- **Import Options**: Restore from backups

---

## 🎨 User Interface & Experience

### Design Philosophy
- **Notion-inspired**: Clean backgrounds, strong visual hierarchy
- **Professional**: Suitable for academic and business presentations
- **Minimal but Meaningful**: Generous spacing, purposeful color usage
- **Mobile-First**: Responsive design for all devices

### Theme System
- **Dark Mode**: Professional dark theme (default)
- **Light Mode**: Clean light theme
- **Auto-switching**: Toggle with button or keyboard
- **Persistent**: Theme choice saved between sessions

### Navigation Structure
- **Clean Map-First Layout**: Primary focus on map visualization
- **Bottom Panel**: Recent borings with quick access
- **Modal Workflows**: Single "Add Boring" button with three options:
  - Upload/Manual Entry
  - File Attachment
  - Strata Chart Extraction
- **"View All" Modal**: Complete boring list management

### Key UI Components
- **Custom Titlebar**: Professional window controls (Electron)
- **Tabbed Interface**: Map View | Strata Extraction | Files
- **Sidebar**: Search, projects, data entry (collapsible on mobile)
- **Modals**: Clean, focused workflows
- **Notifications**: Toast notifications for user feedback

---

## 🔧 Technical Implementation Details

### Database Schema (IndexedDB - Frontend)

**Users Store**:
```javascript
{
  id: "uuid",
  username: "string",
  password: "hashed_string",
  email: "string",
  created: "timestamp",
  settings: {}
}
```

**Projects Store**:
```javascript
{
  id: "uuid",
  name: "string",
  description: "string",
  created: "timestamp",
  updated: "timestamp",
  settings: {}
}
```

**Files Store**:
```javascript
{
  id: "uuid",
  projectId: "uuid",
  boreId: "string",
  location: { lat: number, lng: number },
  date: "ISO_date",
  waterLevel: number,
  waterLevelUnit: "feet|meters",
  files: [{ name: "string", data: "base64", type: "string" }],
  strata: [{ material: "string", depth: number, thickness: number }],
  tags: ["string"],
  notes: "string",
  surveyor: "string",
  created: "timestamp",
  updated: "timestamp"
}
```

### Backend Database Schema (SQLite - Optional)

**Users Table**:
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  settings TEXT DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Projects Table**:
```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  user_id TEXT NOT NULL,
  settings TEXT DEFAULT '{}',
  file_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
```

**Files Table**:
```sql
CREATE TABLE files (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  original_filename TEXT,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  
  -- Boring metadata
  bore_id TEXT,
  survey_date DATE,
  water_level REAL,
  water_level_unit TEXT DEFAULT 'feet',
  
  -- Location data
  latitude REAL,
  longitude REAL,
  location_accuracy REAL,
  location_source TEXT,
  elevation REAL,
  
  -- Additional metadata
  tags TEXT DEFAULT '[]',
  notes TEXT,
  surveyor TEXT,
  weather_conditions TEXT,
  measurement_method TEXT,
  
  -- File organization
  file_hash TEXT,
  thumbnail_path TEXT,
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
```

---

## 🔒 Security & Authentication

### Authentication System
- **JWT-Based Authentication**: Secure token-based authentication
- **Password Security**: bcrypt hashing with 12 rounds
- **Role-Based Access Control**: User/Admin roles
- **Guest Mode**: Local-only operation without authentication

### Security Features
- **Context Isolation**: Electron security best practices
- **Input Validation**: All inputs validated and sanitized
- **File Security**: File type validation, size limits
- **XSS Protection**: Content Security Policy headers
- **CORS Configuration**: Proper cross-origin request handling

---

## 📊 Development History & Status

### Evolution Timeline
**Phase 1**: Simple HTML prototype with IndexedDB storage  
**Phase 2**: Modular frontend architecture with enhanced features  
**Phase 3**: Full-stack implementation with Node.js backend  
**Phase 4**: Professional deployment with enterprise features  
**Phase 5**: UI simplification and mobile optimization  
**Phase 6**: Photo geotag and advanced extraction features

### Recent Major Updates

#### Task 1: Initial Application Stabilization ✅
- Fixed missing `electron-reload` dependency with graceful fallback
- Fixed icon handling with PNG fallback
- Created comprehensive documentation
- Added health check script
- Application now starts successfully without critical errors

#### Task 2: Phase 1 Strata Extraction UI Improvements ✅
- Visible pipeline progress with step-based visualization
- Two-column results layout with validation sidebar
- Confidence tooltips with explanations
- Inline review editing replacing modal prompts

#### Task 3: Complete UI Architecture Simplification ✅
- Removed complex sidebar with cramped data entry
- Eliminated confusing tab navigation
- Simplified navbar and created clean map-first layout
- Bottom panel with recent borings
- Single "Add Boring" button with modal workflows

#### Task 4: Photo Geotag Location Feature Implementation ✅
- Fully implemented comprehensive photo geotag extraction
- Created `PhotoGeotagExtractor` class with EXIF GPS data extraction
- Photo preview with location info and integration hooks
- Added EXIF.js library and integrated into all modal workflows
- Demo functionality with sample photos
- Comprehensive CSS styling and error handling

#### Task 5: Directory Cleanup & Documentation Consolidation ✅
- Moved obsolete files to `junk/` folder, then deleted after dependency analysis
- Consolidated all documentation into `docs/` folder with single context.md file
- Disabled PWA service worker registration (desktop app focused)
- Moved test-photo-geotag.html back to root as it's a valid testing resource
- **MAJOR**: Moved entire Electron implementation to `legacy-electron-context/` folder
- Organized project structure for Flutter migration with clear separation
- Updated README.md to reflect Flutter-first development approach

### Current Status: ✅ LEGACY PRESERVED, FLUTTER MIGRATION IN PROGRESS

**Application State**:
- ✅ **Legacy Preserved** - Complete Electron implementation in `legacy-electron-context/`
- 🔄 **Flutter Migration** - Active development in `stratadesk_flutter/`
- ✅ **Documentation Complete** - Comprehensive context and guides
- ✅ **Architecture Designed** - Dashboard-first UI specification frozen
- 🎯 **Ready for Implementation** - Flutter development can proceed

**Project Structure**:
- 📱 **stratadesk_flutter/** - Active Flutter development
- 📚 **docs/** - Project documentation and context
- 🗂️ **legacy-electron-context/** - Complete Electron implementation (reference only)
- 🎨 **icons/** - Application icons
- 📊 **test-data/** - Sample data for testing

**Known Issues (Non-Critical)**:
- ⚠️ Electron 28.0.0 security vulnerability (optional upgrade to 35+)
- ⚠️ xlsx library prototype pollution (mitigation in place)
- ⚠️ Missing platform-specific icons (PNG fallback works)

---

## 🚀 Quick Start Guide

### Installation & Setup

#### Option 1: Frontend-Only (Fastest - 30 seconds)
```bash
# No installation required
# Simply open index.html in any modern web browser
# All data stored locally in browser
```

#### Option 2: Desktop Application
```bash
# 1. Install Node.js 18+
# 2. Install dependencies
npm install

# 3. Start application
npm start

# 4. Build desktop app (optional)
npm run build-win    # Windows
npm run build-mac    # macOS
npm run build-linux  # Linux
```

#### Option 3: Full-Stack Development
```bash
# 1. Backend setup
cd backend
npm install
cp .env.example .env
# Edit .env with your settings
npm run dev

# 2. Frontend setup
# Open index.html in browser
# Frontend automatically detects backend
```

### First Run
1. The application shows a splash screen for 2 seconds
2. You'll see the login screen with options:
   - **Create Account**: Register a new user (stored locally)
   - **Sign In**: Login with existing credentials
   - **Continue as Guest**: Use without authentication
3. Create your first project
4. Set a location (click map, search address, or upload geotagged photo)
5. Enter boring data and attach files
6. Save and export your data

---

## 🎯 Key Workflows

### Workflow 1: Quick Boring Entry
```
1. Click "Add Boring" → "Manual Entry"
2. Fill location (click map/search address/upload photo)
3. Enter bore ID, date, water level
4. Upload files (drag & drop)
5. Add notes and tags
6. Click "Save Boring"
```
**Time: 2-3 minutes**

### Workflow 2: Strata Chart Extraction
```
1. Click "Add Boring" → "Upload Strata Chart"
2. Upload PDF/Excel strata chart
3. Review extracted geological layers
4. Edit if needed
5. Set location and boring details
6. Save to project
```
**Time: 3-5 minutes**

### Workflow 3: Photo Geotag Location
```
1. Click "Add Boring" → "Manual Entry"
2. In Location section, click "Photo Location" tab
3. Upload geotagged photo (drag & drop)
4. Review extracted GPS coordinates
5. Click "Use This Location"
6. Continue with boring data entry
```
**Time: 1-2 minutes**

### Workflow 4: Batch Processing
```
1. Click "Strata Extraction" tab
2. Upload multiple strata chart files
3. Configure extraction settings
4. Start batch extraction
5. Review combined results
6. Export or save to multiple borings
```
**Time: 5-10 minutes for 10 files**

---

## 🔧 Maintenance & Operations

### Health Check
```bash
npm run health
```
**Output**:
```
✅ All required files present!
🚀 Ready to run: npm start
```

### Common Commands
```bash
# Development
npm start         # Start application
npm run dev       # Development mode with DevTools
npm run health    # Check application health
npm test          # Run tests

# Building
npm run build-win    # Build for Windows
npm run build-mac    # Build for macOS
npm run build-linux  # Build for Linux
npm run build-all    # Build for all platforms
```

### Data Management
- **Local Storage**: Browser IndexedDB (50MB-5GB capacity)
- **Export Options**: JSON, ZIP, individual files
- **Backup**: Regular exports recommended
- **Reset**: `await window.strataApp.reset()` in browser console

### Performance Tips
- Keep files under 50MB
- Export old projects regularly
- Clear search cache periodically
- Close unused projects
- Use desktop app for better performance

---

## 🐛 Troubleshooting

### Common Issues

**Application Won't Start**
- Run `npm run health` to diagnose
- Check `npm install` completed successfully
- Verify Node.js 18+ is installed

**Map Not Loading**
- Check internet connection (map tiles from CDN)
- Verify browser supports WebGL
- Try refreshing the page

**Files Not Uploading**
- Check file size limits (50MB default)
- Verify file format support
- Ensure sufficient storage space

**Strata Extraction Failed**
- Ensure files are PDF or Excel format
- Check files contain tabular data with depth/material columns
- Try lowering confidence threshold
- Enable fallback processing

**Photo GPS Extraction Failed**
- Verify photo is JPEG/TIFF with GPS EXIF data
- Check file size under 10MB
- Ensure location services were enabled when photo was taken

### Browser Compatibility
- **Chrome**: Full support (recommended)
- **Firefox**: Full support
- **Safari**: Full support
- **Edge**: Full support
- **Mobile Browsers**: Responsive support

### Getting Help
1. Check `docs/` folder for detailed documentation
2. Run `npm run health` for diagnostics
3. Check browser console (F12) for errors
4. Review this context file for comprehensive information

---

## 🔮 Future Roadmap

### Planned Features
- **Cloud Sync**: Synchronization across devices
- **Advanced Reporting**: Charts and data visualization
- **Team Collaboration**: Multi-user project sharing
- **API Integrations**: Connect with external geological databases
- **Mobile App**: Native iOS/Android applications
- **Advanced Map Layers**: Geological overlays and custom tile sources

### Technical Improvements
- **WebAssembly**: Faster processing with WASM
- **Service Worker**: Enhanced offline capabilities
- **Progressive Enhancement**: Better fallbacks for older browsers
- **Accessibility**: Full WCAG compliance
- **Performance**: Lazy loading and optimization

---

## 📞 Support & Resources

### Documentation
- **context.md** - This comprehensive overview (you are here)
- **USER_GUIDE.md** - Complete user instructions
- **SETUP.md** - Installation and setup guide
- **STATUS.md** - Current status and known issues
- **PHOTO_GEOTAG_FEATURE.md** - Photo geotag documentation
- **STRATA_EXTRACTION_FEATURE.md** - Extraction feature details

### Testing & Validation
- **test-photo-geotag.html** - Photo geotag feature testing
- **test-data/** - Sample files for testing
- **jest.config.js** - Test configuration
- **scripts/check-health.js** - Health check utility
- **scripts/check-health.js** - Health check utility

### Development Resources
- **Electron Docs**: https://electronjs.org/docs
- **Leaflet Docs**: https://leafletjs.com/reference.html
- **IndexedDB Guide**: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- **PDF.js Docs**: https://mozilla.github.io/pdf.js/
- **SheetJS Docs**: https://docs.sheetjs.com/

---

## 📋 Summary

StrataDesk is a mature, production-ready groundwater boring data management application that combines modern web technologies with professional desktop application features. It offers both simple browser-based operation and advanced full-stack capabilities, making it suitable for individual field workers, research teams, and enterprise deployments.

The application has undergone significant development and refinement, with comprehensive documentation, robust error handling, and a user-friendly interface designed for professional use. All major features are implemented and tested, with clear upgrade paths for future enhancements.

**Ready to use immediately with `npm start` or by opening `index.html` in a browser.**

---

**StrataDesk v2.0.0** - Professional Groundwater Data Management  
*Built with modern web technologies for reliability and performance*

**Last Updated**: February 2, 2026  
**Status**: ✅ Production Ready  
**Documentation**: Complete and Comprehensive