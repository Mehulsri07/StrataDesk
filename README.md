# StrataDesk

Borewell strata visualization — React + Express + PostgreSQL.

## Structure

```
app/        React frontend (Vite + TypeScript + Tailwind)
backend/    Express REST API (Node 20 + PostgreSQL)
database/   PostgreSQL init schema
nginx/      Reverse proxy + frontend build
docker-compose.yml   Local full-stack
```

---

## Run locally (Docker)

```bash
git clone https://github.com/Mehulsri07/StrataDesk
cd StrataDesk
docker compose up --build
```

Open **http://localhost:3000**

---

## Deploy to Railway (public URL for everyone)

Railway gives you a live URL that anyone can open in a browser.

### 1. Create a Railway account
Go to [railway.app](https://railway.app) and sign up with GitHub.

### 2. New project → Deploy from GitHub repo
- Click **New Project → Deploy from GitHub repo**
- Select `Mehulsri07/StrataDesk`

### 3. Add a PostgreSQL database
- Inside the project, click **+ New → Database → PostgreSQL**
- Railway creates it automatically and gives you connection variables

### 4. Deploy the API service
- Click **+ New → GitHub Repo** again, same repo
- Set **Root Directory** to `backend`
- Railway auto-detects the Dockerfile
- Add these environment variables:
  ```
  DB_HOST     = ${{Postgres.PGHOST}}
  DB_PORT     = ${{Postgres.PGPORT}}
  DB_NAME     = ${{Postgres.PGDATABASE}}
  DB_USER     = ${{Postgres.PGUSER}}
  DB_PASSWORD = ${{Postgres.PGPASSWORD}}
  PORT        = 3001
  ```
- Click **Deploy**
- Once deployed, copy the **internal hostname** shown in the service settings
  (looks like `api.railway.internal`)

### 5. Deploy the web (frontend + nginx) service
- Click **+ New → GitHub Repo** again, same repo
- Leave **Root Directory** blank (builds from repo root)
- Set **Dockerfile Path** to `nginx/Dockerfile`
- Add this environment variable:
  ```
  API_UPSTREAM = <internal-hostname-from-step-4>:3001
  ```
  Example: `api.railway.internal:3001`
- Click **Deploy**

### 6. Open your app
- Click the web service → **Settings → Networking → Generate Domain**
- Railway gives you a public URL like `https://stratadesk-web.up.railway.app`
- Share that URL with anyone

---

## Development (no Docker)

```bash
# Frontend
cd app
npm install
npm run dev        # → http://localhost:5173

# Backend (needs a local Postgres instance)
cd backend
cp .env.example .env   # edit with your DB credentials
npm install
npm start
```

---

## Environment variables

### Backend (`backend/.env.example`)

| Variable | Description |
|----------|-------------|
| `DB_HOST` | PostgreSQL host |
| `DB_PORT` | PostgreSQL port (default 5432) |
| `DB_NAME` | Database name |
| `DB_USER` | Database user |
| `DB_PASSWORD` | Database password |
| `PORT` | API listen port (default 3001) |

### Web / nginx

| Variable | Description |
|----------|-------------|
| `API_UPSTREAM` | Host:port of the API service (default `api:3001`) |
| `PORT` | nginx listen port (default 80) |
