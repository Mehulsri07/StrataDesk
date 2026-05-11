# StrataDesk

Borewell strata visualization — React + Express + PostgreSQL.

## Structure

```
app/        React frontend (Vite + TypeScript + Tailwind)
backend/    Express REST API (Node 20 + PostgreSQL)
database/   PostgreSQL init schema
nginx/      Reverse proxy config + Dockerfile
docker-compose.yml
```

## Run

```bash
docker compose up --build
# → http://localhost:3000
```

## Development

```bash
cd app
npm install
npm run dev   # → http://localhost:5173
```

See `backend/.env.example` for API environment variables.
