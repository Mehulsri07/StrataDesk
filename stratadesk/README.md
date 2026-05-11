# StrataDesk

Borewell strata visualization — three-tier architecture served via Docker.

## Structure

```
stratadesk/
├── frontend/          HTML, CSS, JavaScript (served by nginx)
├── backend/           Express REST API (Node 20)
├── database/          PostgreSQL init schema
├── nginx/             nginx config + Dockerfile
├── docker-compose.yml wires all three services
└── README.md
```

## Quick start

```bash
docker compose up --build
```

Open **http://localhost:3000**

## Services

| Service | Role | Exposed |
|---------|------|---------|
| `db`    | PostgreSQL 16 | internal only |
| `api`   | Express REST API | internal :3001 |
| `web`   | nginx — static files + `/api/` proxy | **:3000** |

## API

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/borewells` | List all borewells with layers |
| GET    | `/api/borewells/:id` | Single borewell |
| POST   | `/api/borewells` | Create |
| PUT    | `/api/borewells/:id` | Full update (borewell + layers) |
| PATCH  | `/api/borewells/:id` | Partial update |
| DELETE | `/api/borewells/:id` | Delete (cascades to layers) |
| GET    | `/api/health` | Health check |

## Development

Frontend files are volume-mounted — edit `frontend/` and refresh the browser, no rebuild needed.

To rebuild after backend changes:

```bash
docker compose up --build api
```

## Environment

Copy `backend/.env.example` → `backend/.env` to override defaults when running the API outside Docker.
