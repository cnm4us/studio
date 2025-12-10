# Implementation Plan 05: Tasks, Rendered Assets & Basic Render Pipeline

## 1. Overview
Goal: Introduce Tasks and RenderedAssets so the Studio app can create simple render jobs for a Project, call an image model (Gemini) to generate images, store them in S3, and surface the results in a minimal Project-level UI, aligned with `agents/architecture/01_format_asset_lifecycle_specification.md` and `04_API_DB.md`.

Anchors:
- `01_format_asset_lifecycle_specification.md` — Task and RenderedAsset concepts (§2.4, §3.3, §5.5).
- `02_asset_inheritance_model.md` — lineage tracking for rendered outputs (§4–7).
- `04_API_DB.md` — suggested `tasks` and `rendered_assets` tables and render endpoints (§2.7, §3).

In scope:
- Database tables for `tasks` and `rendered_assets`, referencing Projects and (optionally) definitions.
- Backend services to:
  - Create Tasks for a Project.
  - Call Gemini (`gemini-3-pro-image-preview`) to generate images.
  - Store image files in S3 (using existing AWS-related env vars) and record them as RenderedAssets.
  - Expose simple REST endpoints to create Tasks, trigger renders, and list Task history / RenderedAssets for a Project.
- Minimal frontend wiring to:
  - Create a Task for a Project.
  - Trigger a render for that Task.
  - Display a simple gallery of RenderedAssets per Project.

Out of scope:
- Advanced render job management (queues, retries, parallelism).
- Sophisticated prompt builders or multi-step render workflows.
- Rich gallery UI (filters, paging, annotations) beyond a simple list/grid.

## 2. Step-by-Step Plan

1. Add `tasks` and `rendered_assets` tables to DB schema  
   Status: Completed  
   Implementation: Extend `db/migrations.sql` with tables based on `04_API_DB.md` but simplified for this phase:
   - `tasks`:
     - `id` (INT UNSIGNED PK, auto-increment)
     - `project_id` (INT UNSIGNED FK → `projects.id` `ON DELETE CASCADE`)
     - `name` (VARCHAR, required)
     - `description` (TEXT, nullable)
     - `status` (ENUM or VARCHAR; e.g. `pending`, `running`, `completed`, `failed`)
     - `created_at` (TIMESTAMP, default `CURRENT_TIMESTAMP`)  
   - `rendered_assets`:
     - `id` (INT UNSIGNED PK, auto-increment)
     - `project_id` (INT UNSIGNED FK → `projects.id` `ON DELETE CASCADE`)
     - `task_id` (INT UNSIGNED FK → `tasks.id` `ON DELETE CASCADE`)
     - `type` (VARCHAR; e.g. `image`)
     - `file_key` (VARCHAR; S3 key)
     - `file_url` (TEXT; public or signed URL, initially CloudFront or S3 URL)
     - `metadata` (JSON; prompt, model parameters, and any lineage hints such as related definition IDs)
     - `state` (ENUM or VARCHAR; e.g. `draft`, `approved`, `archived`)
     - `created_at` (TIMESTAMP, default `CURRENT_TIMESTAMP`)  
   Add appropriate indexes on `project_id`, `task_id`, and `state`.  
   Testing: Apply the migration to the `studio` DB and confirm with `SHOW TABLES; DESCRIBE tasks; DESCRIBE rendered_assets;`. Run simple insert/select tests to verify foreign keys and ensure basic integrity.  
   Checkpoint: Wait for developer approval before proceeding.

2. Implement backend Task & Render services (Gemini + S3 integration)  
   Status: Completed  
   Implementation: In the backend server, add:
   - A minimal S3 client module (e.g., `server/src/storage/s3.ts`) that:
     - Uses `AWS_REGION` and `ARGUS_S3_BUCKET` (or a new Studio-specific bucket env var if desired).
     - Provides a function to upload a Buffer or stream (e.g., `uploadImage({ keyPrefix, buffer, contentType })`) and returns `{ key, url }`.
   - A minimal Gemini-based render module (e.g., `server/src/ai/geminiRender.ts`) that:
     - Uses `GOOGLE_API_KEY` or `GEMINI_API_KEY` and `GEMINI_IMAGE_MODEL` (defaulting to `gemini-3-pro-image-preview`).
     - Exposes a function like `renderImageForTask(task, options)` that accepts a prompt and returns an image buffer (or base64) plus metadata (e.g., model name, parameters).  
   - Task service helpers (e.g., `server/src/tasks_service.ts`) to:
     - Create a new Task in `tasks`.
     - Update Task status (`pending` → `running` → `completed`/`failed`).
     - Create RenderedAssets rows for a completed Task, linking to uploaded S3 assets.  
   Testing: Add a temporary route or script to:
   - Create a dummy Task.
   - Call the Gemini render helper with a simple prompt.
   - Upload the result to S3.
   - Inspect `tasks` and `rendered_assets` rows to ensure they contain the expected S3 keys/URLs and metadata.  
   Checkpoint: Wait for developer approval before proceeding.

3. Add REST endpoints for Tasks and renders  
   Status: Completed  
   Implementation: Add a router (e.g., `server/src/tasks_routes.ts`) and mount it under `/api/projects/:projectId/tasks` plus a render endpoint:
   - All routes use `attachUserFromToken` + `requireAuth` and ensure the Project belongs to a Space owned by the current user (reuse authorization pattern from `projects_routes` and `project_import_routes`):
     - `POST /api/projects/:projectId/tasks`:
       - Body: `{ name, description?, prompt? }` (prompt optional for now).
       - Creates a Task with `status='pending'`.
       - Returns the Task.  
     - `GET /api/projects/:projectId/tasks`:
       - Returns a list of Tasks for the Project ordered by `created_at DESC`.  
     - `POST /api/tasks/:taskId/render`:
       - Validates that the Task’s Project is owned by the current user.
       - Updates Task status to `running`, calls the Gemini render service, uploads the image to S3, creates a RenderedAsset row, then marks the Task `completed` (or `failed` on error).
       - Returns the updated Task and any new RenderedAssets.  
     - `GET /api/projects/:projectId/rendered-assets`:
       - Returns a list of RenderedAssets for the Project (optionally filtered by Task).  
   Testing: With the server running:
   - Create a Project, hit `POST /projects/:projectId/tasks` to create a Task.
   - Hit `POST /tasks/:taskId/render` to generate an image; confirm:
     - Task status transitions as expected.
     - One or more RenderedAssets rows are created with valid S3 URLs.
   - Hit `GET /projects/:projectId/rendered-assets` and confirm the new assets are returned and URLs are accessible (e.g., via curl or browser).  
   Checkpoint: Wait for developer approval before proceeding.

4. Wire a minimal UI for Task creation and RenderedAsset viewing  
   Status: Completed  
   Implementation: Extend the existing React UI (`client/src/App.tsx`), keeping changes incremental:
   - In the Projects section (when a Project is selected):
     - Add a simple panel for “Tasks & Renders”:
       - A form to create a Task with a name and optional prompt/description (calling `POST /api/projects/:projectId/tasks`).
       - A list of Tasks for the selected Project, including status.
       - For each Task, a “Render” button that calls `POST /api/tasks/:taskId/render`.
     - Below the Task list, add a lightweight gallery for RenderedAssets:
       - Use `GET /api/projects/:projectId/rendered-assets` to fetch assets.
       - Display thumbnails or links using the `file_url` field.
   - Ensure that the UI:
     - Shows minimal loading and error states for Task creation, render calls, and asset loading.
     - Does not block or significantly alter existing Spaces/Projects/Definitions flows.  
   Testing: From the browser:
   - Log in, create a Space and a Project, then:
     - Create a Task with a simple prompt.
     - Trigger a render and watch Task status change.
     - Verify that a RenderedAsset appears in the gallery and that clicking its URL opens the image.  
   Checkpoint: Wait for developer approval before proceeding.

5. Update docs and handoff notes for Tasks & RenderedAssets  
   Status: Completed  
   Implementation:
   - Update `README.md` to:
     - Document the new `tasks` and `rendered_assets` tables.
     - List the new Task/render endpoints and describe, at a high level, how the render pipeline works (Task → Gemini → S3 → RenderedAsset).
     - Note required env vars for Gemini and S3 (`GOOGLE_API_KEY`/`GEMINI_API_KEY`, `GEMINI_IMAGE_MODEL`, `AWS_REGION`, `ARGUS_S3_BUCKET` or equivalent).  
   - Update the latest handoff file (`agents/handoff/handoff_02.md` or `handoff_05.md` if created by then) with:
     - A concise description of Task/RenderedAsset behavior and where rendered images are stored.
     - Any caveats (e.g., this is a minimal, synchronous render path; future plans may introduce async queues).  
   - Ensure `agents/implementation/plan_05.md` statuses are updated as steps are executed.  
   Testing: Confirm the docs are sufficient for a new developer or threadself to understand how to create Tasks, trigger renders, and where to find images, without needing to read the entire architecture set.  
   Checkpoint: Wait for developer approval before considering this plan complete.

## 3. Progress Tracking Notes

- Step 1 — Status: Completed.  
- Step 2 — Status: Completed.  
- Step 3 — Status: Completed.  
- Step 4 — Status: Completed.  
- Step 5 — Status: Completed.
