# Implementation Plan 04: Definitions & Lineage Foundations

## 1. Overview
Goal: Introduce a minimal Definitions model (for characters and scenes) with lineage-friendly fields (`root_id`, `parent_id`, `scope`, `state`) so Space-level assets can be created and later cloned into Projects, aligning with the architecture in `agents/architecture/01_format_asset_lifecycle_specification.md`, `02_asset_inheritance_model.md`, and `04_API_DB.md`.

Anchors:
- `01_format_asset_lifecycle_specification.md` — asset types and Space vs. Project scopes (§2–3, §5.2–5.3).
- `02_asset_inheritance_model.md` — identity and inheritance (`id`, `root_id`, `parent_id`, `scope`) (§1–4).
- `04_API_DB.md` — shared `definitions` table and basic endpoints for characters/scenes/styles (§2.2–2.4, §3).

In scope:
- Database schema for a minimal `definitions` table that can represent Space- and Project-scoped Character/Scene definitions with lineage and lifecycle state fields.
- Backend services and endpoints to create and list Space-level character/scene definitions.
- Backend helpers and an API endpoint to clone selected Space-level definitions into a Project (Space → Project import) using `root_id` and `parent_id`.
- Light frontend wiring to surface Space-level definitions and a basic “Import into Project” action.

Out of scope:
- Styles, Tasks, and RenderedAssets (Phase 5).
- Full lifecycle workflows (publish/version endpoints, advanced variant trees).
- Rich Project asset library UI (thumbnail grids, filters); this plan will keep UI changes minimal and focused on correctness.

## 2. Step-by-Step Plan

1. Design and add `definitions` table to DB schema  
   Status: Completed  
   Implementation: Extend `db/migrations.sql` with a `definitions` table that can represent both characters and scenes in Space and Project scopes. At minimum include:
   - `id` (INT UNSIGNED PK, auto-increment)
   - `type` (ENUM or VARCHAR; values at least `character`, `scene`)
   - `scope` (ENUM or VARCHAR; values `space`, `project`)
   - `space_id` (INT UNSIGNED, nullable FK → `spaces.id`)
   - `project_id` (INT UNSIGNED, nullable FK → `projects.id`)
   - `root_id` (INT UNSIGNED, FK → `definitions.id`) — identity root
   - `parent_id` (INT UNSIGNED, nullable FK → `definitions.id`) — lineage parent
   - `name` (VARCHAR, required)
   - `description` (TEXT, nullable)
   - `state` (ENUM or VARCHAR; at least `draft`, `canonical`, `deprecated`, `archived`)
   - `metadata` (JSON, nullable) for future attributes  
   Ensure constraints prevent mixing `space_id`/`project_id` in invalid combinations (e.g., either `space_id` or `project_id` set based on `scope`).  
   Testing: Apply the migration to the `studio` DB and confirm via `SHOW TABLES; DESCRIBE definitions;`. Run simple insert/select tests for Space-scoped and Project-scoped rows and confirm FK integrity.  
   Checkpoint: Wait for developer approval before proceeding.

2. Implement backend services for Space-level character/scene definitions  
   Status: Completed  
   Implementation: Add a small “Definitions” service in the backend (e.g., `server/src/definitions_service.ts`) with helpers to:
   - Create a new Space-scoped definition (`scope = 'space'`) for `type = 'character' | 'scene'`:
     - Set `root_id` to the definition’s `id` (after insert) when first created (no parent).
     - Default `state = 'draft'`.  
   - List Space-scoped definitions for a given Space and type.  
   Then add a router (e.g., `server/src/space_definitions_routes.ts`) mounted under `/api/spaces/:spaceId` that provides:
   - `GET /api/spaces/:spaceId/characters` and `GET /api/spaces/:spaceId/scenes` — list Space-level definitions by type.
   - `POST /api/spaces/:spaceId/characters` and `POST /api/spaces/:spaceId/scenes` — create new Space-level definitions with `{ name, description? }`, similar to how spaces/projects are validated.  
   All routes must:
   - Use `attachUserFromToken` + `requireAuth`.
   - Validate that the requested `spaceId` belongs to the authenticated user (reuse the space-ownership pattern from Plan 03).  
   Testing: With the server running, use curl or Postman to:
   - Create and list characters/scenes in a Space you own.
   - Confirm unauthenticated requests return `401` and non-owned spaces return `404`.  
   Checkpoint: Wait for developer approval before proceeding.

3. Implement Space → Project import/clone endpoint using `root_id` / `parent_id`  
   Status: Completed  
   Implementation: Add a backend helper to clone a Space-level definition into a Project:
   - New row in `definitions` with:
     - `scope = 'project'`
     - `project_id = targetProjectId`
     - `type` copied from Space definition
     - `root_id` copied from the original’s `root_id`
     - `parent_id` set to the original definition’s `id`
     - `name`, `description`, `metadata` copied as-is for now  
   Implement a new route (e.g., `server/src/project_import_routes.ts`) mounted under `/api/projects/:projectId/import` that:
   - Uses auth middleware and validates the Project belongs to a Space owned by the current user.
   - Accepts a request body with definition IDs to import, e.g.:
     - `{ "characters": [id1, id2], "scenes": [id3] }`
   - Clones each referenced Space-level definition into the Project using the helper above.
   - Returns a summary of created project-level definitions.  
   Testing: With the server running:
   - Create a Space and several Space-level characters/scenes, then create a Project in that Space.
   - Call the import endpoint with a subset of definition IDs and verify:
     - Project-scoped definitions are created with correct `scope`, `project_id`, `root_id`, and `parent_id`.
     - Re-importing the same Space asset creates a new project-level child with the same `root_id` and `parent_id` set to the Space-level definition (or last clone, depending on the chosen strategy; document whichever is chosen).  
   Checkpoint: Wait for developer approval before proceeding.

4. Wire definitions into a minimal frontend view for Space & Project assets  
   Status: Completed  
   Implementation: Extend the existing React UI (`client/src/App.tsx`) in a minimal, non-invasive way:
   - When a Space is selected:
     - Show a simple “Space assets” area listing Space-level characters and scenes via `/api/spaces/:spaceId/characters` and `/api/spaces/:spaceId/scenes`.
     - Provide a small form to add a Space-level character/scene (name + optional description).
   - When a Project is selected (e.g., reuse current selected Space + project selection, or show Project assets under the Project list):
     - Show a simple “Imported assets” area listing project-level characters/scenes (backed by a `GET` endpoint; if not yet implemented, keep UI scaffolded but stubbed).
     - Provide a minimal “Import from Space” action that calls the import endpoint for one or more selected Space-level assets.  
   Keep styling consistent with the existing Spaces/Projects UI and aim for clarity over richness.  
   Testing: From the browser:
   - Create Space-level characters/scenes and confirm they appear under the Space.
   - Create a Project and import selected assets; confirm they appear in the Project’s list and that refreshing the page still shows them correctly.  
   Checkpoint: Wait for developer approval before proceeding.

5. Update docs and handoff notes for Definitions & lineage  
   Status: Completed  
   Implementation:
   - Update `README.md` to:
     - Document the new `definitions` table at a high level.
     - List new API endpoints for Space-level characters/scenes and the Project import endpoint.
   - Update the latest handoff file (`agents/handoff/handoff_02.md` or `handoff_03.md` if created by then) with:
     - A summary of how definitions are stored (`scope`, `root_id`, `parent_id`, `state`).
     - Any important decisions (e.g., how `root_id` and `parent_id` are assigned on clone/import, what error codes are used).  
   - Ensure `agents/implementation/plan_04.md` statuses are updated to reflect actual progress when steps are executed.  
   Testing: Confirm the docs are sufficient for a new developer or threadself to understand Definitions, lineage fields, and basic import behavior without re-reading the entire architecture docs.  
   Checkpoint: Wait for developer approval before considering this plan complete.

## 3. Progress Tracking Notes

- Step 1 — Status: Completed.  
- Step 2 — Status: Completed.  
- Step 3 — Status: Completed.  
- Step 4 — Status: Completed.  
- Step 5 — Status: Completed.
