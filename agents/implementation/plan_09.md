# Implementation Plan 09: Split App.tsx into Route-Specific Views

## 1. Overview

Goal: Refactor the current monolithic `client/src/App.tsx` into smaller, route‑specific view components (Dashboard, Space, Project) while keeping behavior and the existing hash-based router unchanged. This is a structural/maintainability pass only: no new features, no route shape changes, just clearer separation of concerns.

In scope:
- Introduce separate React components for:
  - Dashboard view (Spaces overview and create form).
  - Space view (projects + space assets for a single Space).
  - Project view (project assets + tasks/renders for a single Project).
- Move JSX and minimal view-specific logic out of `App.tsx` into these components.
- Keep data loading, auth, and routing state in `App.tsx` for now, flowing data via props.

Out of scope (for this plan):
- Migrating from hash-based routing (`#/...`) to real path routing (`/spaces/:id/...`) or React Router (that can be a later plan).
- Changing backend APIs or adding new endpoints beyond what’s already in use.
- Significant visual redesign; styling changes will be minimal and only where necessary to adapt to the new component boundaries.

Anchors:
- `client/src/App.tsx` — the current monolithic UI.
- `agents/implementation/plan_08.md` — initial routing and Dashboard/Space/Project segmentation.

## 2. Step-by-Step Plan

1. Create view component scaffolds and route wiring  
   Status: Completed  
   Implementation:
   - Under `client/src/`, introduce a `views/` folder with three components:
     - `views/DashboardView.tsx`
     - `views/SpaceView.tsx`
     - `views/ProjectView.tsx`
   - In `App.tsx`, define a small “view props” interface for each (e.g., `DashboardViewProps`, `SpaceViewProps`, `ProjectViewProps`) so the shape of data passed from `App` is explicit.
   - Replace the current inline route branching in `App.tsx` with a simple `renderCurrentView()` helper that:
     - Switches on `route.kind`.
     - Renders the appropriate view component with props derived from existing state (`spaces`, `projects`, `tasks`, definitions, etc.).
   Testing:
   - Build the client and confirm that `#/dashboard`, `#/spaces/:spaceId`, and `#/projects/:projectId` still render something for each route (even if view bodies are initially stubbed).
   Checkpoint:
   - Confirm that `App.tsx` is no longer directly rendering large JSX blocks for each route.

2. Extract Dashboard layout and behavior into `DashboardView`  
   Status: Completed  
   Implementation:
   - Move the “Account” (when unauthenticated) plus “Spaces” area for `#/dashboard` out of `App.tsx` and into `DashboardView.tsx`.
   - Wire props for:
     - Auth mode/value/handlers as needed for the login/register block (or keep the account form in `App` if it’s simpler and only lift the Spaces portion).
     - `spaces`, `spacesLoading`, `spacesError`.
     - `onCreateSpace` handler.
     - `onSelectSpace` handler that uses `navigateTo({ kind: 'space', spaceId })` when clicked.
   - Ensure `DashboardView` does not reach into global state directly; it should be a pure presentational/interaction component driven by props.
   Testing:
   - From `#/dashboard`, verify:
     - You can create a Space.
     - You can click a Space row to navigate into that Space view (`#/spaces/:spaceId`).

3. Extract Space layout and behavior into `SpaceView`  
   Status: Completed  
   Implementation:
   - Move the Space‑focused parts of the current UI into `SpaceView.tsx`, specifically:
     - Projects list + create project form for the selected Space.
     - Space assets section (characters/scenes/styles) including:
       - The “Create character / scene / style” buttons that navigate to the corresponding `spaceNew*` routes.
       - The lists of characters/scenes/styles with canonical/locked labels and delete buttons.
   - Props should include:
     - `space` (or `spaceName` + IDs).
     - `projects`, `projectsLoading`, `projectsError`.
     - `spaceCharacters`, `spaceScenes`, `spaceStyles`, plus loading/error flags.
     - Handlers: `onCreateProject`, `onSelectProject`, `onDeleteDefinition`, etc.
   - Ensure any navigation (e.g., open project) uses `navigateTo` via a passed handler from `App`.
   Testing:
   - From a Space route (`#/spaces/:spaceId`):
     - You can create a project.
     - Click a project row and navigate into the Project view (`#/projects/:projectId`).
     - Space assets behave as before (create/delete).

4. Extract Project layout and behavior into `ProjectView`  
   Status: Completed  
   Implementation:
   - Move the Project‑specific section into `ProjectView.tsx`:
     - Import button: “Import all characters & scenes into selected project”.
     - “Project assets (imported characters & scenes)” block.
     - “Tasks & renders for selected project”:
       - Character/scene/style dropdowns.
       - Create task form.
       - Task list with Render buttons.
       - Rendered assets gallery.
   - Props should include:
     - `project` (at least `id`, `name`).
     - `projectCharacters`, `projectScenes`, related loading/error.
     - `tasks`, `renderedAssets`, and their loading/errors.
     - Handlers: `onImportDefinitions`, `onCreateTask`, `onRenderTask`.
   - Keep all API calls in `App.tsx` (for now); `ProjectView` should only call handler props and render UI based on its props.
   Testing:
   - From a Project route (`#/projects/:projectId`), verify:
     - You see the project name.
     - You can import definitions.
     - You can create tasks and see them listed.
     - You can render tasks and see rendered assets.

5. Clean up `App.tsx` and add lightweight docs  
   Status: Completed  
   Implementation:
   - Remove now-unused JSX fragments from `App.tsx` once their logic has been moved into the view components.
   - Keep `App.tsx` focused on:
     - State and data loading.
     - Route parsing and `navigateTo`.
     - Passing props into `DashboardView`, `SpaceView`, and `ProjectView`.
   - Add a short comment block in `App.tsx` (and/or `agents/handoff/handoff_03.md`) documenting:
     - The three main view components and what each is responsible for.
     - The fact that routing is still hash-based and centralized in `App.tsx`.
   Testing:
   - Run `npm run build` in `client/` and verify no TypeScript errors.
   - Manually click through: Dashboard → Space → Project → Space → Dashboard and ensure behavior matches pre-refactor behavior.

## 3. Progress Tracking Notes

- Step 1 — Status: Completed (views folder created; DashboardView, SpaceView, and ProjectView wired from `App.tsx` using route booleans instead of a separate helper).  
- Step 2 — Status: Completed (dashboard spaces list + create form now live in `DashboardView.tsx`).  
- Step 3 — Status: Completed (space-level projects/assets moved into `SpaceView.tsx`).  
- Step 4 — Status: Completed (project import/tasks/renders now live in `ProjectView.tsx`).  
- Step 5 — Status: Completed (obsolete JSX removed from `App.tsx`; this document updated; client build passing).  

Once this plan is complete, we can consider a follow-up plan (Plan 10) to move from hash-based routing to real path routing (React Router + Nginx fallback) using the now-clean separation between `App` and the view components.  
