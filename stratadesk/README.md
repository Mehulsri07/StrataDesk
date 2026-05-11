# StrataDesk

A borewell strata visualization tool for geotechnical field work. Engineers log borewell sites on an interactive map, define soil/rock layers by depth, import data from Excel or PDF strata charts, and generate cross-section views across multiple borewells. All data is persisted in PostgreSQL via a REST API.

---

## Architecture

```
stratadesk/
├── frontend/          Vanilla HTML + CSS + JavaScript (no build step)
├── backend/           Express.js REST API (Node 20)
├── database/          PostgreSQL 16 init schema
├── nginx/             Reverse proxy config + two-stage Dockerfile
└── docker-compose.yml Wires all three services together
```

Three Docker services:

| Service | Role | Port |
|---------|------|------|
| `db`    | PostgreSQL 16 — persistent borewell data | internal |
| `api`   | Express REST API — full CRUD | internal :3001 |
| `web`   | nginx — serves frontend, proxies `/api/*` to `api` | **:3000** |

---

## Quick Start

```bash
cd stratadesk
docker compose up --build
```

Open **http://localhost:3000**

---

## Frontend

**Files:** `frontend/index.html`, `frontend/app.js`, `frontend/styles.css`

Pure HTML/CSS/JavaScript — no framework, no build step. Served as static files by nginx. During development, the files are volume-mounted into the container so edits are live on browser refresh without rebuilding.

### External libraries (loaded from CDN)

| Library | Version | Purpose |
|---------|---------|---------|
| Leaflet | 1.9.4 | Interactive map |
| SheetJS (xlsx) | 0.18.5 | Excel file parsing |
| jsPDF | 2.5.1 | PDF report export |
| html2canvas | 1.4.1 | Chart capture for PDF |
| Inter (Google Fonts) | — | UI typeface |

### UI layout

- **Topbar** — logo, app title, sidebar toggle, settings button
- **Sidebar** — borewell form, strata layers table, data import section
- **Main area** — tabbed between Map View and Cross-Section View
- **Chart panel** — SVG strata chart rendered alongside the map when a borewell is active
- **Import preview modal** — review and edit extracted layers before confirming

### Map (Leaflet + CARTO dark tiles)

- Centred on India (lat 20.59, lng 78.96) at zoom 5 on load
- Click anywhere on the map to start a new borewell at that location — reverse geocodes the address automatically via Nominatim
- Each saved borewell gets a pin marker; active borewell pin is highlighted in amber with a drop shadow
- Marker popup shows name, depth, last-edited time, and a cross-section checkbox
- **Location search bar** — floating over the map, queries Nominatim with 500 ms debounce, supports keyboard navigation (↑ ↓ Enter Esc), flies to selected result and auto-fills the form coordinates
- **Locate on Map button** — validates the lat/lng in the form, flies to that point, and shows a temporary pulsing marker for 3 seconds

### Borewell form (sidebar)

Fields:
- **Name** (required)
- **Location** — auto-filled from map click reverse geocode, or from location search
- **Latitude / Longitude** — editable directly; "Locate on Map" button validates and navigates
- **Diameter** — dropdown: 8", 10", 12", 14", 16", 18", 20", 24"
- **Total Depth (ft)** — required, must be > 0
- **Water Level (ft)** — optional; renders a dashed blue line on the strata chart
- **Notes** — free text
- **Depth mismatch warning** — shown when the deepest layer end depth doesn't match total depth
- **Save** — POST (new) or PUT (existing) to the API
- **Delete** — DELETE to the API with a confirmation prompt

### Strata layers table

Shown only when a borewell is active. Each row:
- Start depth (click to edit via prompt)
- End depth (click to edit via prompt)
- Material dropdown (Clay, Sand, Kankar, Sandy Kankar, Gravel, Rock, Hard Rock, Clay Kankar)
- Colour swatch
- Delete button

Buttons:
- **Add** — appends a new layer starting at the current deepest end depth
- **Auto-close** — sets the last layer's end depth to the borewell's total depth

Overlap detection: rows with overlapping depth ranges are highlighted in red and a warning banner is shown.

Every layer mutation (add, delete, edit depth, change material, auto-close, import confirm) calls `PUT /api/borewells/:id` with the full updated borewell including all layers in a single transaction.

### Strata chart (SVG, rendered alongside the map)

Rendered whenever the active borewell has at least one layer:
- Vertical depth axis with tick marks; step size adapts to total depth (5 ft ≤50 ft, 10 ft ≤200 ft, 25 ft otherwise)
- Each layer rendered as a rectangle with a vertical linear gradient (lightened top → darkened bottom) and an SVG fractal noise filter for a geological texture
- Layer label centred in the rectangle (hidden if the rectangle is too short)
- Depth range label to the right of each rectangle
- Dashed blue horizontal line at water level if set
- Composition stats bar above the chart showing the top 3 materials by thickness as percentages
- Layers animate in sequentially on render (CSS clip-path animation, 80 ms stagger)

### Cross-section view

Activated from the "Cross-Section" tab. Requires 2 or more borewells to have their cross-section checkbox ticked (in the map popup).

- SVG rendered across all selected borewells sorted by creation order
- Depth axis on the left, borewell columns evenly spaced
- Each borewell column shows its layers as coloured rectangles with gradient fills and noise texture
- **Smooth Flow mode** — draws filled Bézier paths between matching layers on adjacent borewells (matched by material name or by depth proximity ±2 ft), giving a geological interpolation effect
- **Strict Layer mode** — shows only the individual columns with no interpolation

### Data import

Two tabs in the sidebar import section:

**Data Files tab** — accepts `.xlsx`, `.xls`, `.pdf`

Excel parsing:
- Reads all cells in the sheet looking for (depth number, material text) pairs in the same row
- Scores every possible (depth column, material column) combination and picks the one with the most matching rows
- Filters out noise: pipe types ("Plain pipe", "Ribbed Screen"), pump/bore/site/date/client/driller strings, pure numbers in the material position
- Merges consecutive rows with the same material into a single layer (e.g. 10 rows of "Clay" at 10 ft intervals → one 0–100 ft Clay layer)
- Works with headerless strata chart formats (e.g. a column of depths 10, 20, 30… and a column of material names)
- Confidence score: 0.9 for Excel

PDF parsing:
- Reads the PDF as binary, extracts printable ASCII characters
- Runs 5 regex patterns against the extracted text:
  1. `0-10 ft Clay` / `0 to 10 ft Clay` / `0-10 Clay`
  2. `Clay: 0-10 ft` / `Clay 0 to 10`
  3. Table format `0 | 10 | Clay` or `0  10  Clay`
  4. `From 0 to 10: Clay` / `0 to 10 m: Clay`
  5. `Clay (0-10 ft)`
- Deduplicates by proximity (start/end within 0.5 ft)
- Confidence score: 0.6–0.8 for PDF

**Chart Images tab** — accepts `.png`, `.jpg`, `.jpeg`

- Loads the image onto an HTML5 canvas
- Samples a vertical strip from the middle 10% of the image width
- Scans top to bottom every 2 pixels, averaging colours horizontally
- Detects colour band boundaries using Euclidean RGB distance (threshold 30)
- Filters out bands shorter than 2% of image height
- Maps detected colours to materials by finding the nearest match in a colour table (Clay, Sand, Kankar, Sandy Kankar, Gravel, Rock, Hard Rock, Clay Kankar)
- Estimates depths proportionally assuming 100 ft total depth
- Confidence score: 0.6 for image extraction

All three methods open the same **Import Preview modal** showing an editable table (start depth, end depth, material, colour swatch, confidence badge). The user can edit any field before clicking Confirm Import, which calls `PUT /api/borewells/:id`.

### PDF report export

Generates a jsPDF A4 report for the active borewell:
- Header with "StrataDesk" title and generation date
- Borewell metadata table (name, location, coordinates, diameter, total depth, notes)
- Strata layers table with alternating row shading and colour swatches
- Captured SVG chart image via html2canvas (appended if it fits on the page, otherwise on a new page)
- Footer with app name centred at the bottom

### Material colour palette

| Material | Hex |
|----------|-----|
| Clay | `#8D6E63` |
| Sand | `#E0C097` |
| Kankar | `#A1887F` |
| Sandy Kankar | `#BCAAA4` |
| Gravel | `#9E9E9E` |
| Rock | `#616161` |
| Hard Rock | `#424242` |
| Clay Kankar | `#6D4C41` |
| Silt | `#A0826D` |
| Loam | `#9C7A5C` |
| Top Soil / Soil | `#6B5D4F` |
| Fill | `#8B7355` |
| Murrum / Moorum | `#B8860B` |
| Weathered / Decomposed | `#CD853F` |
| Default | `#78909C` |

---

## Backend

**Files:** `backend/server.js`, `backend/package.json`, `backend/Dockerfile`, `backend/.env.example`

Express.js REST API on Node 20. Connects to PostgreSQL via the `pg` connection pool. Schema is bootstrapped automatically on startup with `CREATE TABLE IF NOT EXISTS` — no migration tool needed.

### Dependencies

| Package | Purpose |
|---------|---------|
| express 4.19 | HTTP server and routing |
| pg 8.12 | PostgreSQL client |
| cors 2.8 | Cross-origin headers |
| dotenv 16.4 | Environment variable loading |

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | `db` | PostgreSQL hostname |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `stratadesk` | Database name |
| `DB_USER` | `stratadesk` | Database user |
| `DB_PASSWORD` | `stratadesk` | Database password |
| `PORT` | `3001` | API listen port |

Copy `backend/.env.example` → `backend/.env` to override when running outside Docker.

### API endpoints

#### `GET /api/borewells`
Returns all borewells with their layers, ordered by `created_at`.

Response: array of borewell objects (see data model below).

#### `GET /api/borewells/:id`
Returns a single borewell with layers. 404 if not found.

#### `POST /api/borewells`
Creates a borewell and its layers in a single transaction.

Request body: borewell object including `layers` array.
Response: 201 with the created borewell.

#### `PUT /api/borewells/:id`
Full replace — updates all borewell fields and replaces all layers (DELETE + INSERT in one transaction). This is the primary mutation endpoint; every layer change from the frontend goes through here.

Response: updated borewell with layers.

#### `PATCH /api/borewells/:id`
Partial update for scalar fields only (no layer changes). Used for toggling `selectedForCrossSection` from the map popup checkbox.

Accepted fields: `selectedForCrossSection`, `name`, `location`, `latitude`, `longitude`, `totalDepth`, `waterLevel`, `notes`.

#### `DELETE /api/borewells/:id`
Deletes the borewell. Layers are deleted automatically via `ON DELETE CASCADE`.

Response: `{ deleted: "<id>" }`.

#### `GET /api/health`
Runs `SELECT 1` against the database. Returns `{ status: "ok" }` or 503 on failure. Used by Docker healthcheck.

### Borewell data model

```json
{
  "id": "lxk3a2b9f",
  "name": "BW-001",
  "location": "Study Hall School, Vipul Khand, Lucknow",
  "latitude": 26.8467,
  "longitude": 80.9462,
  "diameter": 15,
  "totalDepth": 400,
  "waterLevel": 95,
  "notes": "Pump: 12C/17 5HP KSB. Pump lowering: 200 ft.",
  "selectedForCrossSection": false,
  "createdAt": "2025-08-20T00:00:00.000Z",
  "updatedAt": "2025-08-20T00:00:00.000Z",
  "layers": [
    { "id": "abc", "startDepth": 0,   "endDepth": 20,  "material": "Clay", "color": "#8D6E63" },
    { "id": "def", "startDepth": 20,  "endDepth": 50,  "material": "Sand", "color": "#E0C097" },
    { "id": "ghi", "startDepth": 50,  "endDepth": 100, "material": "Clay", "color": "#8D6E63" }
  ]
}
```

---

## Database

**File:** `database/init.sql`

PostgreSQL 16. The init SQL is mounted into the container at `/docker-entrypoint-initdb.d/init.sql` and runs automatically on first container start. The API also runs the same `CREATE TABLE IF NOT EXISTS` statements on boot as a safety net.

### Schema

```sql
CREATE TABLE borewells (
  id                         TEXT PRIMARY KEY,
  name                       TEXT NOT NULL,
  location                   TEXT,
  latitude                   DOUBLE PRECISION DEFAULT 0,
  longitude                  DOUBLE PRECISION DEFAULT 0,
  diameter                   INTEGER DEFAULT 8,
  total_depth                DOUBLE PRECISION DEFAULT 0,
  water_level                DOUBLE PRECISION,          -- nullable
  notes                      TEXT,
  selected_for_cross_section BOOLEAN DEFAULT FALSE,
  created_at                 TIMESTAMPTZ DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE layers (
  id           TEXT PRIMARY KEY,
  borewell_id  TEXT NOT NULL REFERENCES borewells(id) ON DELETE CASCADE,
  start_depth  DOUBLE PRECISION NOT NULL,
  end_depth    DOUBLE PRECISION NOT NULL,
  material     TEXT NOT NULL,
  color        TEXT NOT NULL DEFAULT '#78909C',
  sort_order   INTEGER DEFAULT 0
);

CREATE INDEX idx_layers_borewell ON layers(borewell_id);
```

Data is persisted in a named Docker volume (`pgdata`) so it survives container restarts.

---

## nginx

**Files:** `nginx/nginx.conf`, `nginx/Dockerfile`

### Dockerfile (two-stage build)

**Stage 1 (`validate`)** — Node 20 Alpine: copies the three frontend files and runs `node --check app.js`. If there is a JavaScript syntax error the build fails here and the broken image never reaches production.

**Stage 2** — nginx 1.27 Alpine (~25 MB image): copies the validated files into `/usr/share/nginx/html/` and the nginx config. Includes a Docker HEALTHCHECK that polls `/health` every 15 seconds.

### nginx.conf

- **Gzip** compression for JS, CSS, JSON, SVG
- **Static assets** (`.js`, `.css`, images, fonts) — `Cache-Control: public, immutable`, 1-year expiry
- **HTML files** — `Cache-Control: no-store, no-cache, must-revalidate` so deployments are reflected immediately
- **`/api/`** — proxied to `http://api:3001` with HTTP/1.1, forwarded headers, 30 s read timeout
- **`/health`** — returns `200 ok` directly from nginx (no upstream call), used by the `web` service healthcheck
- **SPA fallback** — all unmatched paths serve `index.html`

---

## docker-compose.yml

Three services with explicit health-check dependency ordering: `db` must be healthy before `api` starts; `api` must be healthy before `web` starts.

```
db  ──healthy──▶  api  ──healthy──▶  web  ──:3000──▶  browser
```

| Service | Image / Build | Restart | Key config |
|---------|--------------|---------|------------|
| `db` | `postgres:16-alpine` | unless-stopped | `pgdata` volume, `init.sql` mounted |
| `api` | built from `backend/Dockerfile` | unless-stopped | env vars for DB connection |
| `web` | built from `nginx/Dockerfile` | unless-stopped | port 3000:80, frontend files volume-mounted |

The frontend volume mounts (`./frontend/*.{html,css,js}` → `/usr/share/nginx/html/`) mean you can edit any frontend file and see the change on the next browser refresh without rebuilding the container.

---

## Development workflow

```bash
# First run — builds all images and starts all services
docker compose up --build

# Subsequent runs
docker compose up

# Edit frontend/app.js, frontend/styles.css, or frontend/index.html
# → just refresh the browser, no rebuild needed

# After changing backend/server.js
docker compose up --build api

# After changing nginx/nginx.conf
docker compose up --build web

# View logs
docker compose logs -f api
docker compose logs -f web

# Stop everything
docker compose down

# Stop and wipe the database volume
docker compose down -v
```

---

## Running the API outside Docker

```bash
cd backend
cp .env.example .env
# edit .env with your local Postgres credentials
npm install
npm start          # production
npm run dev        # with nodemon (install nodemon separately)
```

Requires a running PostgreSQL instance. The schema is created automatically on first start.
