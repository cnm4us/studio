# Implementation Plan 10: Per-Definition Imports & Project Styles on Project View

## 1. Overview

Goal: Make the Project page more precise and scalable by allowing users to import *individual* characters, scenes, and styles from a Space into a Project, and to manage those project-scoped definitions (including styles) directly on the Project view.

In scope:
- Add backend support for:
  - Listing project-scoped **styles** alongside characters/scenes.
  - Importing **styles** into a project using the existing `definitions` model.
  - Removing project-scoped definitions (characters/scenes/styles) from a project.
- Extend the Project UI to:
  - Provide per-item “add to project” controls (jump menus) for characters, scenes, and styles.
  - Show a third “Project styles” column alongside project characters and scenes.
  - Add “Remove” buttons for project-scoped definitions, respecting `isLocked` when we introduce locking.

Out of scope (for this plan):
- Changes to how tasks reference definitions (we’ll treat project definition removal as a simple unlink for now).
- Advanced locking semantics for project definitions (beyond a basic `isLocked` gate when we have the data).
- Any shift away from the current hash-based routing or the current `ProjectView` layout.

Anchors:
- `client/src/App.tsx` — owns routing and data loading.
- `client/src/views/ProjectView.tsx` — current Project view (import all + tasks/renders).
- `server/src/definitions_service.ts` — shared definitions logic (`DefinitionType`, `DefinitionScope`, clone logic).
- `server/src/project_import_routes.ts` — bulk import of characters/scenes into a project.
- `server/src/project_definitions_routes.ts` — list project-scoped characters/scenes.

## 2. Step-by-Step Plan

1. Extend project definitions API to include styles  
   Status: Completed  
   Implementation:
   - Update `server/src/project_definitions_routes.ts` to add:
     - `GET /api/projects/:projectId/definitions/styles`  
       - Uses `listProjectDefinitions(project.id, 'style')` from `definitions_service`.
       - Returns `{ styles: PublicDefinition[] }`.
   - Confirm that `DefinitionType` already includes `'style'` and that `listProjectDefinitions` covers it (it does).
   - Ensure error handling parallels the existing `/characters` and `/scenes` endpoints.  
   Testing:
   - With an existing project that has style definitions in `definitions` (or by temporarily inserting one), hit the new endpoint and verify the response shape and HTTP codes.  
   Checkpoint:
   - We can programmatically list project styles via the new endpoint.

2. Support importing styles into a project via the existing import endpoint  
   Status: Completed  
   Implementation:
   - Update `server/src/project_import_routes.ts` to accept styles:
     - Extend the request body type to `{ characters?: number[]; scenes?: number[]; styles?: number[] }`.
     - Add a `styles` loop alongside characters/scenes that calls `cloneDefinitionToProject` for each style id.
     - Extend the response payload to include `styles`:
       - `imported: { characters?: PublicDefinition[]; scenes?: PublicDefinition[]; styles?: PublicDefinition[] }`.
   - Keep the existing “bulk import” behavior intact; styles are simply another definition type that can be cloned.  
   Testing:
   - Manually POST to `/api/projects/:projectId/import` with a single style id in `styles` and confirm:
     - A project-scoped style definition is created.
     - The style appears when reading `/definitions/styles` for that project.  
   Checkpoint:
   - Backend supports importing styles, both singly and in batches, without schema changes.

3. Introduce delete endpoints for project-scoped definitions (characters/scenes/styles)  
   Status: Completed  
   Implementation:
   - In `server/src/project_definitions_routes.ts`, add delete routes:
     - `DELETE /api/projects/:projectId/definitions/characters/:definitionId`
     - `DELETE /api/projects/:projectId/definitions/scenes/:definitionId`
     - `DELETE /api/projects/:projectId/definitions/styles/:definitionId`
   - Behavior:
     - Validate auth and ownership via `loadOwnedProjectOr404`.
     - Validate `definitionId` as a positive integer.
     - Ensure the targeted definition:
       - Has `scope = 'project'`.
       - Matches the expected `type` and `project_id = project.id`.
     - If not found, return `404 { error: 'DEFINITION_NOT_FOUND_FOR_PROJECT' }`.
     - For this plan, allow deletion of any project-scoped definition (we’ll refine locking later):
       - Delete row from `definitions`.
       - Return `204 No Content`.
   - Error semantics:
     - `400 INVALID_DEFINITION_ID` for bad ids.
     - `401 UNAUTHENTICATED` / `404 PROJECT_NOT_FOUND` reused from existing helpers.  
   Testing:
   - Create/import a project character, scene, and style.
   - Delete each via the new endpoints and confirm:
     - They disappear from `/definitions/*` for that project.
     - Space-level definitions are unaffected.  
   Checkpoint:
   - API supports clean removal of project-level definitions without touching space-level canonicals.

4. Add per-item import controls and project styles column to ProjectView  
   Status: Completed  
   Implementation:
   - State & data loading in `App.tsx`:
     - Extend project assets state with `projectStyles`:
       - `const [projectStyles, setProjectStyles] = useState<DefinitionSummary[]>([]);`
     - Update `loadProjectDefinitions(projectId)` to:
       - Fetch `/definitions/characters`, `/definitions/scenes`, and `/definitions/styles` in parallel.
       - Populate `projectCharacters`, `projectScenes`, and `projectStyles`.
   - `ProjectView` props and UI:
     - Extend `ProjectViewProps` to include:
       - `projectStyles: DefinitionSummary[]` (or `any[]` initially, matching existing style).
     - In `ProjectView`, adjust the “Project assets” section:
       - Add a third column: **Project styles** (mirroring characters/scenes structure).
       - For each project definition (character/scene/style), show:
         - Name.
         - A `Remove` button that calls a new handler prop (`onRemoveProjectDefinition`) with type and id.
         - Button disabled when `definition.isLocked` is `true` (once we propagate that for project definitions; until then it will always be enabled).
   - Per-item import controls:
     - Add three select + button groups above the project assets grid:
       - “Add character to project” — uses `spaceCharacters` as the source list.
       - “Add scene to project” — uses `spaceScenes`.
       - “Add style to project” — uses `spaceStyles`.
     - Each import button will call a new handler prop (e.g. `onImportSingleDefinition(type, id)`), implemented in `App.tsx` as:
       - POST to `/api/projects/:projectId/import` with a single-element array in the appropriate field (`characters`, `scenes`, or `styles`).
       - On success, re-call `loadProjectDefinitions(projectId)` to refresh all project assets.  
   Testing:
   - On a project page:
     - Import a single character and single scene from the selects and verify they appear in the Project assets lists.
     - Import a single style and verify it appears in the new Project styles column.
     - Use the Remove button on each type and confirm UI + backend stay in sync.  
   Checkpoint:
   - Project view supports fine-grained imports and shows/manageable lists of characters, scenes, and styles.

5. Wire up delete handlers in App.tsx and update documentation  
   Status: Completed  
   Implementation:
   - In `App.tsx`:
     - Implement `handleDeleteProjectDefinition(kind, definitionId)`:
       - Resolve the current `projectId` from route/selection.
       - Call the appropriate `DELETE` endpoint.
       - On success, update `projectCharacters` / `projectScenes` / `projectStyles` in memory.
     - Pass this handler into `ProjectView` as `onRemoveProjectDefinition`.
   - Update handoff documentation:
     - Add a brief section to the latest `agents/handoff/handoff_*.md` describing:
       - The single-import UX on the Project view.
       - The new project definitions delete endpoints and how they relate to existing space-level locking.
   Testing:
   - Click through the full flow:
     - Space → Project → import one of each type → remove them → re-import.
     - Confirm no console errors and that the network calls match expectations.  
   Checkpoint:
   - Behavior is stable and documented; ready for a subsequent plan to refine locking and UX details.

## 3. Progress Tracking Notes

- Step 1 — Status: Completed (project definitions router now exposes `/styles`).  
- Step 2 — Status: Completed (import endpoint accepts `styles` and returns imported styles).  
- Step 3 — Status: Completed (project definitions router supports delete for project-scoped characters/scenes/styles).  
- Step 4 — Status: Completed (ProjectView shows per-item imports and a Project styles column; App.tsx loads and passes project styles).  
- Step 5 — Status: Completed (App.tsx delete/import handlers wired; this document updated; client build passing).  

Once Plan 10 is implemented, we’ll have a much more realistic “per-project asset curation” flow: you can choose exactly which characters, scenes, and styles belong to a project, and prune them without touching space-level canonicals. This will set us up for richer task configuration and, later, thumbnails and advanced locking.  
