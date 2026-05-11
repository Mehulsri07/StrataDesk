# StrataDesk
## Intelligent Geotechnical Visualization and Borewell Documentation Platform

StrataDesk is a practical, visual tool for recording borewell data and understanding underground layers.
It helps field teams move from paper logs and scattered files to one clean system.

---

## What StrataDesk Does

- Mark borewells on an interactive map
- Save borewell details (depth, diameter, water level, notes)
- Add and edit strata layers by depth
- Import layers from Excel, PDF, and chart images
- Generate visual strata charts
- Build cross-sections between multiple borewells
- Export clear PDF reports for clients and records

---

## Built for Easy Use

This project has been tuned so it is easier for non-technical users:

- Step-by-step sidebar flow (`Step 1`, `Step 2`, `Step 3`)
- Plain-language labels and validation messages
- Quick guide inside the app
- Clear status indicator (`Ready`, `Connected`, `Offline`)
- One-click map location selection and borewell save

---

## Project Vision

StrataDesk is not meant to be a basic CRUD dashboard.

It is designed to be:

- visual-first
- geotechnical-focused
- map-centric
- scientific and practical
- scalable for future GIS and AI features

---

## Current Folder Architecture (Unchanged)

```text
stratadesk/
├── frontend/          Static UI (HTML, CSS, JavaScript)
├── backend/           Node.js + Express API
├── database/          PostgreSQL schema
├── nginx/             Reverse proxy + static serving
└── docker-compose.yml Local orchestration
```

All code remains in the same architecture:
- frontend files in `frontend/`
- backend files in `backend/`
- database schema in `database/`
- nginx config in `nginx/`

---

## Core Functional Modules

### 1) Interactive Borewell Mapping
- Click map to create or position borewells
- Search location and reverse geocoding
- Marker popup with metadata and cross-section selection

### 2) Borewell Management
- Name, address, coordinates
- Diameter, total depth, water level
- Notes and timestamps

### 3) Strata Layer Editor
- Add, edit, delete layers
- Material-based colors
- Overlap detection and depth mismatch warnings
- Auto-close last layer to total depth

### 4) Strata Visualization Engine
- SVG chart rendering
- Material labels and depth ticks
- Water level indicator
- Composition breakdown

### 5) Cross-Section Engine
- Smooth flow mode (visual interpolation)
- Strict mode (exact borewell columns)
- Multi-borewell comparison

### 6) Intelligent Data Import
- Excel (`.xlsx`, `.xls`)
- PDF (`.pdf`)
- Chart images (`.png`, `.jpg`, `.jpeg`)
- Preview and edit before final import

### 7) Report Generation
- PDF export with metadata, layer table, and chart snapshot

---

## Tech Stack (Current)

### Frontend
- HTML, CSS, JavaScript
- Leaflet
- SheetJS
- jsPDF
- html2canvas

### Backend
- Node.js
- Express
- PostgreSQL (`pg`)

### Infrastructure
- Docker
- Docker Compose
- nginx

---

## Local Run

```bash
docker compose up --build
```

Open: [http://localhost:3000](http://localhost:3000)

---

## Long-Term Roadmap (Aligned with Master Prompt)

### Phase 1 (Core Platform)
- Authentication
- Borewell CRUD
- Interactive maps
- Strata editor
- PostgreSQL integration

### Phase 2 (Advanced Geology Workflows)
- Cross-section improvements
- Import engine improvements
- Better report quality
- Cloud sync

### Phase 3 (Intelligence and Scale)
- AI-assisted extraction
- GIS analytics
- Team collaboration
- Offline mode
- 3D geological modeling (future-ready)

---

## Development Principles

- Keep modules separated and clean
- Avoid tightly coupled logic
- Maintain visual consistency
- Keep code maintainable and scalable
- Build for long-term geotechnical workflows

---

## License

MIT
