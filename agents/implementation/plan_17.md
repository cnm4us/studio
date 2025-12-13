# Implementation Plan 17: Space-Level Tasks and Renders (Unified Tasks Table)

## 1. Overview

Goal: Allow creating and managing **Tasks at the Space level** (without a Project), reusing the same render pipeline and prompt renderer. Space-level tasks will:
- Belong directly to a `space` instead of a `project`.
- Use the same Character/Scene/Style definitions (space-scoped) and prompt rendering engine.
- Produce `rendered_assets` that are clearly associated with the owning Space.

Design choice (Option A, agreed): **Unify** Tasks and RenderedAssets in the existing tables by:
- Adding `space_id` to `tasks` and `rendered_assets`.
- Allowing `project_id` to be nullable.
- Enforcing “exactly one owner” (space OR project) at the application level.

Out of scope (for this plan):
- Import/reference of space-level renders into projects.
- Any new UI for marking renders as “importable” or linking them to project tasks.

Anchors:
- Schema: `db/migrations.sql` — `tasks`, `rendered_assets`, `definitions`.
- Server: `server/src/tasks_routes.ts`, `server/src/tasks_service.ts`, `server/src/spaces_routes.ts`.
- Client: Space view (tasks UI will mirror the existing Project task list), existing project task components.
- Prompt rendering: `server/src/prompt_renderer.ts`, `server/src/definition_config_helpers.ts`.

---

## 2. Step-by-Step Plan

### Step 1 — Extend schema for unified space/project tasks
Status: Pending  

Implementation:
- Update `tasks` table:
  - Add `space_id INT UNSIGNED NULL` with FK to `spaces(id)`:
    - `CONSTRAINT fk_tasks_space_id FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE ON UPDATE CASCADE`.
  - Backfill `space_id` for existing rows:
    - `UPDATE tasks t JOIN projects p ON p.id = t.project_id SET t.space_id = p.space_id WHERE t.space_id IS NULL;`
  - Relax `project_id` to allow NULL (required to support space-only tasks):
    - `ALTER TABLE tasks MODIFY project_id INT UNSIGNED NULL;`
  - Add indexes for space-scoped queries:
    - `INDEX idx_tasks_space_status (space_id, status)`.
- Update `rendered_assets` table:
  - Add `space_id INT UNSIGNED NULL` with FK to `spaces(id)`:
    - `CONSTRAINT fk_rendered_assets_space_id FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE ON UPDATE CASCADE`.
  - Backfill `space_id` for existing rows via `tasks` → `projects`:
    - `UPDATE rendered_assets ra JOIN tasks t ON t.id = ra.task_id JOIN projects p ON p.id = t.project_id SET ra.space_id = p.space_id WHERE ra.space_id IS NULL;`
  - Keep `project_id` for rendered assets as-is (always set for project tasks; later, space tasks may have `project_id` NULL).
  - Add index for space queries:
    - `INDEX idx_rendered_assets_space (space_id)`.
- Application invariant (documented, enforced in code later):
  - For any `tasks` row: **exactly one** of (`project_id`, `space_id`) must be non-null.
  - `rendered_assets` rows must reference a `task` and copy its owning `space_id`/`project_id`.

Testing:
- Apply migration on dev DB with existing data; verify:
  - No tasks or rendered assets lose ownership.
  - Existing project flows still see their tasks and renders unchanged.

Checkpoint:
- Schema supports both project and space tasks/renders; existing rows are safely backfilled.

---

### Step 2 — Update server data types and task services
Status: Pending  

Implementation:
- In `server/src/tasks_service.ts` (and any related types):
  - Extend Task/RenderedAsset record types to include `space_id` (number | null) and nullable `project_id`.
  - Update `createTask` to remain project-specific but:
    - Explicitly set both `project_id` and `space_id` based on the owning project’s space.
  - Add `createSpaceTask(spaceId, name, description, prompt)`:
    - Inserts into `tasks` with `space_id` set, `project_id = NULL`.
  - Add `listSpaceTasks(spaceId)`:
    - Mirroring `listProjectTasks` but filtering by `space_id`.
- Ensure any internal queries that assume `project_id` is non-null are updated to tolerate null and/or use the new helpers.

Testing:
- Use a small server-side harness or temporary route to call `createSpaceTask` and `listSpaceTasks` against a dev DB, confirm shapes.

Checkpoint:
- Service layer can create and list tasks for both scopes; existing project code paths are untouched so far.

---

### Step 3 — Add space-scoped task routes
Status: Pending  

Implementation:
- Add a `spaceTasksRouter` (or extend `spacesRouter`) in `server/src/tasks_routes.ts` (or `spaces_routes.ts`) with:
  - `POST /api/spaces/:spaceId/tasks`
    - Auth: same as other space routes (`attachUserFromToken`, `requireAuth`).
    - Ownership check: validate `spaceId` belongs to the current user.
    - Body: `{ name, description?, prompt? }` (mirrors project task creation).
    - Calls `createSpaceTask(spaceId, ...)`.
  - `GET /api/spaces/:spaceId/tasks`
    - Ownership check as above.
    - Calls `listSpaceTasks(spaceId)`.
    - Computes status exactly as project tasks do:
      - Query `rendered_assets` by `space_id` and `task_id` to compute approved vs draft counts.
      - Derive `pending/running/completed/failed` as in current `projectsRouter.get('/tasks')`.
- For render routes:
  - Ensure `taskRenderRouter` (`POST /api/tasks/:taskId/render`) works for both scopes by:
    - Updating `loadOwnedTaskOr404` to:
      - Join either via project or directly via space:
        - If `t.project_id IS NOT NULL`, join `projects p` and `spaces s` as today.
        - If `t.project_id IS NULL`, join `spaces s` directly on `t.space_id`.
      - Still enforce `s.user_id = currentUser.id`.
    - When constructing S3 keys:
      - If `task.project_id` is set: keep existing pattern `projects/<projectId>/tasks/<taskId>/...`.
      - Else: use `spaces/<spaceId>/tasks/<taskId>/...`.
    - When writing `rendered_assets`:
      - Always set `task_id`.
      - Copy `project_id` and `space_id` from the owning task.

Testing:
- Manually create:
  - A traditional project task and render → confirm no behavior change.
  - A new space-level task via the new API, attach definitions, trigger render → confirm:
    - Task status flow works.
    - Renders are created with `space_id` set, sensible S3 key, and visible via space-level listing (next step).

Checkpoint:
- Backend can manage and render space-level tasks; existing project endpoints still behave as before.

---

### Step 4 — Expose space-level renders and asset state updates
Status: Pending  

Implementation:
- Add endpoints for space-scoped rendered assets (parallel to project-scoped):
  - `GET /api/spaces/:spaceId/rendered-assets`
    - Lists non-archived `rendered_assets` where `space_id = :spaceId`.
    - Applies `maybeSignAssets` like the project route.
- Reuse existing `PATCH /api/rendered-assets/:assetId`:
  - `loadOwnedRenderedAssetOr404` should already be updated in Step 3 to authorize via space ownership as well as project ownership, once `space_id` is added.
  - No separate endpoint is needed if this function becomes scope-aware.

Testing:
- Confirm that:
  - Project-level assets only show up on the project endpoint.
  - Space-level assets only show up on the new space endpoint.
  - Toggling `state` between draft/approved/archived works for both scopes.

Checkpoint:
- Space-level renders are fully manageable via API, including approval status and archival.

---

### Step 5 — Add Space-level Task UI in the client
Status: Pending  

Implementation:
- Reuse the existing project Task UI components as much as possible:
  - Identify the component(s) used for the project’s task list and “New Task” form.
  - Extract scope-agnostic parts into a reusable `TaskList` / `TaskPanel` that accepts:
    - `scope: 'space' | 'project'`.
    - `ownerId: spaceId | projectId`.
    - API endpoint base URL (e.g., `/api/spaces/:spaceId` vs `/api/projects/:projectId`).
- In the Space view (`client/src/...Space...`):
  - Add a “Space Tasks” section with:
    - Task list (showing status and approved/draft counts like in projects).
    - New Task form wired to `POST /api/spaces/:spaceId/tasks`.
  - For definition selection when rendering:
    - Use existing selectors wired to `definitions` with `scope = 'space' AND space_id = :spaceId` (these are already present for Space-level definitions).
- Ensure the UX clearly distinguishes:
  - Space Tasks (for concept exploration / character- or scene-only work).
  - Project Tasks (for shots bound to a specific project context).

Testing:
- From the Space page:
  - Create a space task with a character-only setup, render, and see the resulting images and statuses.
  - Confirm project pages and project tasks continue to behave unchanged.

Checkpoint:
- Users can create and manage tasks directly at the Space level via the UI, with no regressions to project tasks.

---

### Step 6 — Validation, cleanup, and docs
Status: Pending  

Implementation:
- Validation:
  - Ensure the app enforces the invariant “exactly one of project_id/space_id is set” for all new tasks/renders.
  - Add minimal runtime checks in service functions to guard against invalid combinations.
  - Optionally add DB-level checks later if compatible with MySQL flavor in use.
- Cleanup:
  - Remove any now-dead code paths that assumed `project_id` was always non-null.
  - Ensure all joins on `tasks` and `rendered_assets` use the correct owner (space or project) depending on context.
- Documentation:
  - Update `agents/architecture` or `agents/project_overview.md` to describe:
    - The unified task model (space vs project ownership).
    - The new space-scoped task and rendered-asset endpoints.
  - Add a brief note for future plans about “import/reference space renders into projects” to avoid conflating that work with this plan.

Testing:
- Run through:
  - Space-only workflow: Space → Space Tasks → render → approve → archive.
  - Project workflow: Project → Tasks → render → approve → archive.
  - Mixed: Project task that references space-scoped definitions (ensuring step 3’s definition lookup remains valid).

Checkpoint:
- Unified task model is stable in both DB and code, with clear documentation and no changes in behavior for existing project features.

---

## 3. Progress Tracking

- Step 1 — Extend schema for unified space/project tasks: Pending  
- Step 2 — Update server data types and task services: Pending  
- Step 3 — Add space-scoped task routes: Pending  
- Step 4 — Expose space-level renders and asset state updates: Pending  
- Step 5 — Add Space-level Task UI in the client: Pending  
- Step 6 — Validation, cleanup, and docs: Pending  

Once Plan 17 is complete, you’ll be able to create and render tasks at the Space level using the same definition and prompt infrastructure as project tasks, setting up a clean foundation for later “import/reference into projects” behavior.

