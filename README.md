# StrataDesk

Borewell strata visualization — React + Express + PostgreSQL.

## Structure

```
src/            React frontend (Vite + TypeScript + Tailwind)
backend/        Express REST API (Node 20 + PostgreSQL)
database/       PostgreSQL init schema
nginx/          Reverse proxy + frontend build (Docker only)
docker-compose.yml
```

---

## Option A — Docker (recommended, full stack in one command)

```bash
docker compose up --build
```

Open **http://localhost:3000**

All three services start automatically: PostgreSQL → API → nginx (frontend).

---

## Option B — Run locally without Docker

### 1. Start PostgreSQL

You need a local Postgres instance. The easiest way:

```bash
docker run -d \
  --name stratadesk-db \
  -e POSTGRES_DB=stratadesk \
  -e POSTGRES_USER=stratadesk \
  -e POSTGRES_PASSWORD=stratadesk \
  -p 5432:5432 \
  postgres:16-alpine
```

### 2. Start the API

```bash
cd backend
cp .env.example .env   # defaults already match the DB above
npm install
npm start
# API running at http://localhost:3001
```

### 3. Start the frontend

```bash
# from repo root
npm install
npm run dev
# App running at http://localhost:3000
# /api/* is proxied to http://localhost:3001 automatically
```

---

## Environment variables

### Backend (`backend/.env.example`)

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | — | Full Postgres URL (Railway sets this; takes priority over individual vars) |
| `DB_HOST` | `db` | Postgres host (Docker) or `localhost` (local) |
| `DB_PORT` | `5432` | Postgres port |
| `DB_NAME` | `stratadesk` | Database name |
| `DB_USER` | `stratadesk` | Database user |
| `DB_PASSWORD` | `stratadesk` | Database password |
| `PORT` | `3001` | API listen port |

---

## Deploy to Railway

See the Railway section in the previous docs — set `DATABASE_URL = ${{Postgres.DATABASE_URL}}` and `PORT = 3001` on the API service. The frontend/nginx service needs `API_UPSTREAM` set to the API's internal hostname.
