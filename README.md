# Studio

Studio is a new asset- and lineage-driven application for managing creative universes (Spaces), story-specific Projects, and their generated media. It is a clean reimplementation based on the architecture in `agents/architecture/`, separate from the existing Graphics app, but reusing its best patterns.

This repo currently contains only the initial infrastructure scaffold: database, backend, frontend, and Nginx config. The core domain model (Spaces, Projects, Definitions, RenderedAssets) will be implemented in subsequent plans.

## Prerequisites

- Node.js 20+
- npm 10+
- MySQL 8+
- Nginx (for production deployment)

## Environment

Copy `.env.example` to `.env` and fill in values as appropriate:

```bash
cp .env.example .env
```

At minimum, set:

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` for the `studio` database.
- `PORT` for the backend server (default 6000).

## Database

The Studio database is named `studio`.

To create the database and initial schema:

```sql
CREATE DATABASE IF NOT EXISTS studio CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Apply migrations:

```bash
sudo mysql -D studio -e "SOURCE /home/ubuntu/studio/db/migrations.sql; SHOW TABLES;"
```

The initial migration creates a `schema_version` table. Future migrations will add tables for Spaces, Projects, Definitions, and RenderedAssets.

## Backend (server)

The backend is a Node.js + Express + TypeScript app under `server/`.

### Install dependencies

```bash
cd server
npm install
```

### Build

```bash
npm run build
```

### Run in development

```bash
npm run dev
```

This starts the server (by default) on the port specified in `PORT` (6000 in the current `.env`).

### Health checks

- `GET /health` → `{ "status": "ok" }`
- `GET /health/db` → verifies DB connectivity via `SELECT 1` against the `studio` database.

## Frontend (client)

The frontend is a Vite + React + TypeScript SPA under `client/`.

### Install dependencies

```bash
cd client
npm install
```

### Run in development

```bash
npm run dev
```

By default Vite will serve on port 5173. The app currently renders a simple Studio dashboard and calls `/api/spaces`, which returns an empty list from the backend.

### Build for production

```bash
npm run build
```

The built assets will be written to `client/dist/`.

## Nginx (production)

An example Nginx config for `studio.bawebtech.com` lives at:

- `agents/ngnix/009_studio.bawebtech.com`

Key points:

- Port 80: redirects HTTP to HTTPS and exposes `/.well-known/acme-challenge/` via `/var/www/certbot` for certbot webroot mode.
- Port 443: serves the built SPA from `/home/ubuntu/studio/client/dist` and proxies:
  - `/api/` → `http://127.0.0.1:6000`
  - `/health` → `http://127.0.0.1:6000/health`
  - `/health/db` → `http://127.0.0.1:6000/health/db`
- SSL certs are expected at:
  - `/etc/letsencrypt/live/studio.bawebtech.com/fullchain.pem`
  - `/etc/letsencrypt/live/studio.bawebtech.com/privkey.pem`

To deploy, copy or link this config into your Nginx `sites-available`/`sites-enabled`, run `nginx -t`, and reload Nginx.

## Next Steps

Implementation plans under `agents/implementation/` (starting with `plan_01.md`) will introduce:

- Spaces and Projects.
- Shared Definitions (characters, scenes, styles) and RenderedAssets.
- Lineage-aware APIs and UI for import, cloning, and variant generation.

