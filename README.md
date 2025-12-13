# Studio

Studio is a new asset- and lineage-driven application for managing creative universes (Spaces), story-specific Projects, and their generated media. It is a clean reimplementation based on the architecture in `agents/architecture/`, separate from the existing Graphics app, but reusing its best patterns.

The current implementation includes:

- Database schema for `users` and `spaces`.
- Minimal email/password authentication with HTTP-only cookies.
- A user-scoped Spaces API and a simple React dashboard for login/register and basic space management.
- Initial infrastructure scaffold: database, backend, frontend, and Nginx config. The core domain model (Projects, Definitions, RenderedAssets) will be implemented in subsequent plans.

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
- `JWT_SECRET` for signing auth tokens (use a strong random value in production).

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

The migrations currently create:

- `schema_version` — basic schema tracking.
- `users` — minimal auth users (email + password hash).
- `spaces` — user-owned Spaces (name, optional description, timestamps).
- `projects` — Projects belonging to a Space (name, optional description, timestamps).
- `definitions` — shared definitions for characters/scenes in Space and Project scopes, with lineage fields (`root_id`, `parent_id`) and lifecycle `state`.
- `tasks` — per-Project tasks with name, optional description/prompt, status, and timestamps.
- `rendered_assets` — per-Project rendered outputs linked to tasks, with file key/URL, metadata, and state.

## Backend (server)

The backend is a Node.js + Express + TypeScript app under `server/`.

### Install dependencies

```bash
cd server
npm install
```

### Type-check and build

```bash
# Type-check only (no emit)
npm run check

# Build (type-check + emit dist/)
npm run build
```

### Run in development (from TypeScript)

```bash
npm run dev
```

This runs `src/index.ts` through `tsx` on the port specified in `PORT` (6000 by default). Restart this command after editing backend TypeScript files.

### Run from build (production-style)

```bash
npm run start
```

This runs the compiled `dist/server/src/index.js` and is what you would place behind Nginx or a process manager in production.

### Gemini, S3 and render pipeline

The render pipeline uses:

- Gemini image model via `@google/generative-ai`.
- S3 for binary storage, fronted by CloudFront for public access.

Environment variables:

- `GOOGLE_API_KEY` or `GEMINI_API_KEY` — API key for Gemini.
- `GEMINI_IMAGE_MODEL` — image model name (defaults to `gemini-3-pro-image-preview`).
- `AWS_REGION` or `AWS_DEFAULT_REGION` — AWS region for S3.
- `AWS_S3_BUCKET` or `ARGUS_S3_BUCKET` — bucket name for storing media.
- `CF_DOMAIN` — optional CloudFront domain (e.g., `studio-media.bawebtech.com`); when set, rendered asset URLs use this domain.

Render flow (high level):

1. A Task is created for a Project (`POST /api/projects/:projectId/tasks`) with a name and optional description/prompt.
2. A render is triggered for that Task (`POST /api/tasks/:taskId/render`), which:
   - Updates Task status to `running`.
   - Calls Gemini with the prompt (request body, Task prompt, or a fallback).
   - Uploads the returned image to S3 under a key like `projects/<projectId>/tasks/<taskId>/<timestamp>.<ext>`.
   - Creates a RenderedAsset row with the S3 key and a public URL (CloudFront if `CF_DOMAIN` is set).
   - Marks the Task as `completed` (or `failed` on error).
3. RenderedAssets for a Project are listed via `GET /api/projects/:projectId/rendered-assets` and surfaced in the UI.

### Health checks and APIs

- `GET /health` → `{ "status": "ok" }`
- `GET /health/db` → verifies DB connectivity via `SELECT 1` against the `studio` database.
- `POST /api/auth/register` → register with `{ email, password }`, sets an HTTP-only `auth_token` cookie.
- `POST /api/auth/login` → log in with `{ email, password }`, sets/refreshes `auth_token`.
- `POST /api/auth/logout` → clears the auth cookie.
- `GET /api/auth/me` → returns `{ user }` when authenticated, `401` otherwise.
- `GET /api/spaces` → lists spaces for the authenticated user.
- `POST /api/spaces` → creates a new space for the authenticated user.
- `GET /api/spaces/:spaceId/projects` → lists projects for a given Space owned by the authenticated user.
- `POST /api/spaces/:spaceId/projects` → creates a new project in the given Space.
- `GET /api/spaces/:spaceId/characters` → lists Space-level character definitions for a Space owned by the user.
- `POST /api/spaces/:spaceId/characters` → creates a new Space-level character definition.
- `DELETE /api/spaces/:spaceId/characters/:definitionId` → deletes a Space-level character definition if it is not locked (returns `DEFINITION_LOCKED` when imported into projects).
- `GET /api/spaces/:spaceId/scenes` → lists Space-level scene definitions.
- `POST /api/spaces/:spaceId/scenes` → creates a new Space-level scene definition.
- `DELETE /api/spaces/:spaceId/scenes/:definitionId` → deletes a Space-level scene definition if it is not locked (returns `DEFINITION_LOCKED` when imported into projects).
- `POST /api/projects/:projectId/import` → imports Space-level characters/scenes into a Project as project-scoped definitions using lineage fields.
- `GET /api/projects/:projectId/definitions/characters` → lists project-scoped character definitions imported into the Project.
- `GET /api/projects/:projectId/definitions/scenes` → lists project-scoped scene definitions imported into the Project.
- `POST /api/projects/:projectId/tasks` → creates a new Task for the given Project with optional description and prompt.
- `GET /api/projects/:projectId/tasks` → lists Tasks for the given Project.
- `POST /api/tasks/:taskId/render` → synchronously renders an image for the Task using Gemini, uploads it to S3, creates a RenderedAsset, and updates Task status.
- `GET /api/projects/:projectId/rendered-assets` → lists RenderedAssets for the given Project.

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

By default Vite will serve on port 5173.

The app currently:

- Calls `/api/auth/me` on load to detect an existing session.
- Provides simple login/register forms wired to `/api/auth/login` and `/api/auth/register`.
- Uses a lightweight hash-based router with three main views:
  - `#/dashboard` — default entry point with a Spaces list and create form.
  - `#/spaces/:spaceId` — Space view showing projects in that Space and Space-level assets (characters, scenes, styles).
  - `#/projects/:projectId` — Project view showing imported project assets and tasks/renders for the selected project.
- Allows selecting and creating Spaces backed by `/api/spaces`.
- From a Space view, allows creating Projects backed by `/api/spaces/:spaceId/projects`.
- From a Space view, shows Space-level character/scene/style lists per Space, with forms to add new definitions.
- From a Project view, provides an “Import all characters & scenes into selected project” action that clones Space-level definitions into the selected Project using `/api/projects/:projectId/import`, and shows a Project-level view of imported characters/scenes along with Tasks and rendered assets.

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
