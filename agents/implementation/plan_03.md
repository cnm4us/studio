# Implementation Plan 03: Projects & Basic Import from Spaces

## 1. Overview
Goal: Introduce Projects under Spaces and a minimal API/DB layer so the Studio app can create Projects and list them per Space, and prepare the groundwork for importing assets from Space into Project in later plans.

Anchors:
- `agents/architecture/01_format_asset_lifecycle_specification.md` — Space vs. Project scopes (§3, §5.2–5.3).
- `agents/architecture/02_asset_inheritance_model.md` — lineage concepts (`root_id`, `parent_id`) for future import flows.
- `agents/architecture/03_UIUX_Flow.md` — Project entry and “Project Asset Library” empty state (§1–3).
- `agents/architecture/04_API_DB.md` — Projects table and endpoints (§2.5, §3).

In scope (for this plan):
- Database table for `projects`, linked to `spaces`.
- Backend endpoints to create and list Projects within a given Space.
- Minimal validation and ownership checks tying Projects to the authenticated user via their Spaces.
- Frontend wiring for a simple Projects list and create form within a selected Space.

Out of scope (will be handled in later plans):
- Character/Scene/Style definitions and the unified `definitions` table.
- Actual import/clone mechanics (Space → Project) for Characters/Scenes/Styles.
- Tasks, RenderedAssets, and rendering pipeline.
- Rich Project views beyond a simple list and create flow.

## 2. Step-by-Step Plan

1. Add `projects` table to DB schema  
   Status: Completed  
   Implementation: Extend `db/migrations.sql` with a `projects` table that includes:
   - `id` (INT UNSIGNED PK, auto-increment)
   - `space_id` (INT UNSIGNED FK → `spaces.id`, `ON DELETE CASCADE`)
   - `name` (VARCHAR, required)
   - `description` (TEXT, nullable)
   - `created_at` (TIMESTAMP default `CURRENT_TIMESTAMP`)  
   Add a uniqueness constraint `(space_id, name)` to avoid duplicate project names per space.  
   Testing: Apply the migration to the `studio` DB and confirm via `SHOW TABLES; DESCRIBE projects;`. Perform simple insert/select tests to verify the FK and uniqueness constraint.
   Checkpoint: Wait for developer approval before proceeding.

2. Implement backend Projects service & routes (`/api/spaces/:spaceId/projects`)  
   Status: Completed  
   Implementation: In the backend server:
   - Add a new router (e.g., `server/src/projects_routes.ts`) that:
     - Uses the existing auth middleware (`attachUserFromToken`, `requireAuth`).
     - Validates that the `spaceId` in the route belongs to the authenticated user (by checking the `spaces` table with `user_id = currentUser.id`).
     - Exposes `GET /api/spaces/:spaceId/projects` to list Projects for that Space, ordered by `created_at DESC`.
     - Exposes `POST /api/spaces/:spaceId/projects` to create a new Project for that Space with `{ name, description? }`, handling validation and duplicate name errors (e.g., `PROJECT_NAME_TAKEN`).  
   Testing: With the server running, use curl or a REST client to:
   - Attempt to list/create projects when unauthenticated → expect `401 UNAUTHENTICATED`.
   - Attempt to list/create projects for a Space owned by another user → expect `404` or `403` (choose one and keep it consistent, e.g., `404` to avoid leaking IDs).
   - Create multiple projects for the authenticated user’s Space and confirm they are returned correctly and sorted as expected.
   Checkpoint: Wait for developer approval before proceeding.

3. Wire Projects router into the server entrypoint  
   Status: Completed  
   Implementation: Update `server/src/index.ts` to mount the new router:
   - `app.use('/api/spaces/:spaceId/projects', projectsRouter);` or a similar pattern where the router reads `req.params.spaceId`.  
   Ensure that the order of middleware keeps auth and JSON parsing intact and that the existing `/api/auth` and `/api/spaces` routes remain unchanged.  
   Testing: Rebuild the server (`npm run build`) and verify that:
   - The server starts without errors.
   - Existing endpoints (`/health`, `/api/auth/*`, `/api/spaces`) still behave as before.
   - The new projects endpoints are reachable via direct curl calls.
   Checkpoint: Wait for developer approval before proceeding.

4. Add frontend support for viewing and creating Projects within a Space  
   Status: Completed  
   Implementation: In `client/src/App.tsx` (or a small extracted component if the file grows too large):
   - After the user logs in and spaces are loaded, allow the user to select a current Space (e.g., a simple select dropdown or clickable list).
   - For the selected Space:
     - Call `GET /api/spaces/:spaceId/projects` (with `credentials: 'include'`) to load the list of Projects.
     - Provide a simple form to create a Project via `POST /api/spaces/:spaceId/projects` with `{ name, description? }`.
   - Show basic loading and error states for project fetch/create operations, and keep the UI minimal but consistent with the existing Spaces section.  
   Testing: From the browser:
   - Log in, create at least one Space, then create several Projects within that Space.
   - Verify that projects appear only within their Space and that unauthenticated visitors cannot see or create projects.
   Checkpoint: Wait for developer approval before proceeding.

5. Update docs and handoff notes for Projects  
   Status: Completed  
   Implementation:
   - Update `README.md` to mention Projects and the new endpoints:
     - `GET /api/spaces/:spaceId/projects`
     - `POST /api/spaces/:spaceId/projects`
   - Update the latest handoff file (`agents/handoff/handoff_02.md` or `handoff_03.md` if created by then) with:
     - A summary of how Projects are stored and related to Spaces/users.
     - Any caveats or decisions (e.g., how unauthorized access is signaled).  
   - Ensure `agents/implementation/plan_03.md` statuses are updated to reflect progress.  
   Testing: Confirm docs are consistent with the implementation and that another developer (or threadself) could follow them to understand Projects behavior.
   Checkpoint: Wait for developer approval before considering this plan complete.

## 3. Progress Tracking Notes

- Step 1 — Status: Completed.  
- Step 2 — Status: Completed.  
- Step 3 — Status: Completed.  
- Step 4 — Status: Completed.  
- Step 5 — Status: Completed.
