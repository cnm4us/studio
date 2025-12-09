# Implementation Plan 01: Studio App Bootstrap (DB, Node Stack, Nginx)

## 1. Overview

Goal: Stand up a clean “Studio” application skeleton aligned with the new architecture docs, with its own `studio` database, Node.js app stack, and Nginx/site configuration, while keeping the existing Graphics app available as a reference. This plan focuses on infrastructure and scaffolding, not yet on full Spaces/Projects/Tasks domain modeling.

In scope:
- Initialize Git in `/home/ubuntu/studio` and connect to `https://github.com/cnm4us/studio.git`.
- Create and configure a new MySQL database `studio` with an initial, minimal schema suitable for incremental evolution.
- Scaffold a Node.js backend (Express/TypeScript) and frontend (React/Vite or similar), including shared env/config, basic health/auth endpoints, and build scripts.
- Add local configuration for the Studio app (env files, package scripts, basic directory layout).
- Create an Nginx site configuration for Studio and document how it proxies to the new app (reusing patterns from the existing Graphics deployment).

Out of scope:
- Full implementation of the Space/Project/Task/Definitions model (will be covered in subsequent plans).
- Migration of existing data from the Graphics app.
- Detailed design of rendering flows, lineage service, or advanced asset lifecycle logic.

---

## 2. Step-by-Step Plan

1. Initialize Git repo and local project structure  
Status: Completed  
Testing: Run `git status` to confirm a clean repo with `agents/` plus minimal scaffolding files; verify remote origin points to `https://github.com/cnm4us/studio.git`.  
Checkpoint: Wait for developer approval before proceeding.

2. Create `studio` MySQL database and baseline schema file  
Status: Completed  
Testing:  
- Add `db/migrations.sql` (or similar) with an initial empty migration and a simple `schema_version` table.  
- Use `mysql` to create the `studio` database and apply the migration.  
- Run `SHOW DATABASES;` and `USE studio; SHOW TABLES;` to verify.  
Checkpoint: Wait for developer approval before proceeding.

3. Scaffold backend (Node.js + Express + TypeScript)  
Status: Completed  
Testing:  
- Add a `server/` directory with `package.json`, `tsconfig.json`, and a minimal Express app exposing:  
  - `GET /health` returning `{ status: 'ok' }`.  
  - A placeholder `/api/spaces` route returning an empty list.  
- Run `npm install` in `server/` and `npm run dev` or `npm run build && npm start` to confirm the server starts without errors.  
Checkpoint: Wait for developer approval before proceeding.

4. Scaffold frontend (React + Vite) and basic layout  
Status: Completed  
Testing:  
- Add a `client/` directory bootstrapped with Vite + React + TypeScript.  
- Implement a minimal shell: a landing page with a placeholder “Studio” dashboard and a health check call to `/api/spaces` (showing “no spaces yet”).  
- Run `npm install` in `client/` and `npm run dev` / `npm run build` to confirm the frontend builds and can talk to the backend in dev mode.  
Checkpoint: Wait for developer approval before proceeding.

5. Shared configuration and environment files  
Status: Completed  
Testing:  
- Add a top-level `.env.example` (and `.env` for local dev) covering: DB connection (`STUDIO_DB_*`), server port, client origin, and any auth secrets placeholders.  
- Configure the backend to read from env and connect to the `studio` DB (using a simple `SELECT 1` on startup or via a `/health/db` endpoint).  
- Verify that starting the server does not crash when env vars are present and that DB connectivity is confirmed.  
Checkpoint: Wait for developer approval before proceeding.

6. Nginx site configuration for Studio  
Status: Completed  
Testing:  
- Add `deploy/nginx/studio.conf` (or similar) describing a server block for the Studio app (host, SSL placeholders if needed), static asset serving for the built client, and proxy_pass rules to the Node backend.  
- Validate syntax with `nginx -t` (in this environment, at least ensure the config file is syntactically correct via `nginx -t -c ...` if available).  
- Document in `agents/handoff/handoff_01.md` how Studio should be wired into the existing Nginx setup (paths, ports, and any conflicts).  
Checkpoint: Wait for developer approval before proceeding.

7. Basic README and developer setup notes  
Status: Completed  
Testing:  
- Create a minimal `README.md` at the repo root documenting:  
  - Project purpose (Studio app for asset/lineage‑driven workflows).  
  - How to set up the `studio` DB locally.  
  - How to run `server` and `client` in dev mode.  
  - How to build for production.  
- Confirm README reflects the actual commands and env variables used in steps 2–5.  
Checkpoint: Wait for developer approval before proceeding.

---

## 3. Progress Tracking Notes

- Step 1 — Status: Completed — Git initialized in `/home/ubuntu/studio` with `origin` set to `https://github.com/cnm4us/studio.git`; `agents/` is currently the only tracked content.  
- Step 2 — Status: Completed — MySQL database `studio` created, `schema_version` table applied via `db/migrations.sql`, and `studio` user provisioned with privileges on `studio.*` for both local CLI and SSH-tunneled connections (127.0.0.1).  
- Step 3 — Status: Completed — `server/` scaffolded with a minimal Express + TypeScript app (`GET /health` and `GET /api/spaces` returning an empty list), using `tsx` for dev and `tsc` for builds; `npm run build` completes successfully.  
- Step 4 — Status: Completed — `client/` scaffolded via Vite + React + TypeScript; `App.tsx` now renders a simple Studio dashboard that calls `/api/spaces` and displays “No spaces yet.” when the list is empty; `npm run build` succeeds.  
- Step 5 — Status: Completed — Added a root `.env.example` describing DB, port, and cloud/API settings; backend now loads env from the repo root and uses it to configure a MySQL connection pool in `server/src/db.ts`, with `GET /health/db` exercising `SELECT 1` against the `studio` database; `npm run build` still succeeds.  
- Step 6 — Status: Completed — `agents/ngnix/009_studio.bawebtech.com` updated for Studio: HTTP→HTTPS redirect with ACME challenge location, HTTPS server pointing root to `/home/ubuntu/studio/client/dist`, proxying `/api`, `/health`, and `/health/db` to `http://127.0.0.1:6000`, and SSL directives ready to use Let’s Encrypt certs at `/etc/letsencrypt/live/studio.bawebtech.com/...`; actual deployment will require copying this file into Nginx’s sites-available/enabled and running `nginx -t` on the host.  
- Step 7 — Status: Completed — Root `README.md` added describing project purpose, DB setup for the `studio` schema, how to run `server` and `client` in dev mode, how to build for production, and how the Nginx config for Studio is wired.  
