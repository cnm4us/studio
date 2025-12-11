# Handoff 03 — Dashboard, Space & Project Views

## 4.1 Thread Summary
- Purpose: Implement Implementation Plan 08 to segment the Studio frontend into clearer Dashboard, Space, and Project views using a lightweight routing layer, without changing backend APIs.
- Context: Builds on prior work captured in `agents/handoff/handoff_02.md`, which established auth, Spaces, Projects, Definitions, Tasks, RenderedAssets, and S3/Gemini integration.
- Scope: Frontend-only changes in `client/src/App.tsx` plus a small README update describing the new routing and views.

## 4.2 Implementation Notes
- Routing:
  - Introduced a minimal hash-based router in `client/src/App.tsx`:
    - `type Route = { kind: 'dashboard' } | { kind: 'space'; spaceId: number } | { kind: 'project'; projectId: number };`
    - `parseHashRoute()` reads `window.location.hash` and returns a `Route`:
      - `#/dashboard` → `{ kind: 'dashboard' }` (also the default when the hash is empty).
      - `#/spaces/:spaceId` → `{ kind: 'space', spaceId }` when `spaceId` is a positive number.
      - `#/projects/:projectId` → `{ kind: 'project', projectId }` when `projectId` is a positive number.
    - `navigateTo(route)` mutates `window.location.hash` accordingly.
  - In `App`:
    - Added `const [route, setRoute] = useState<Route>(() => parseHashRoute());`.
    - Added a `useEffect` to:
      - Initialize the hash to `#/dashboard` when empty.
      - Register a `hashchange` listener that re-runs `parseHashRoute()` and updates `route`.
      - Clean up the listener on unmount.
    - Derived booleans:
      - `isDashboardRoute`, `isSpaceRoute`, `isProjectRoute` from `route.kind` for simpler JSX conditions.
- Header navigation:
  - Extended the main header (`client/src/App.tsx`) with a small nav on the left:
    - `Dashboard` button → `navigateTo({ kind: 'dashboard' })`.
    - `Current space` button (only when `selectedSpaceId` truthy) → `navigateTo({ kind: 'space', spaceId: selectedSpaceId })`.
    - `Current project` button (only when `selectedProjectId` truthy) → `navigateTo({ kind: 'project', projectId: selectedProjectId })`.
  - Buttons visually indicate the active view using the derived `isDashboardRoute`, `isSpaceRoute`, `isProjectRoute` flags.

- View segmentation (single file, route-driven):
  - Kept `client/src/App.tsx` as a single component for now, but used `route` to segment what is rendered where:
    - **Dashboard (`#/dashboard`)**
      - Account section is unchanged.
      - In the “Spaces, Projects & Assets” section:
        - The create-Space form and Spaces list remain always visible when authenticated.
        - The previously inlined “Projects in selected space” block is now wrapped with `selectedSpaceId && !isDashboardRoute`, so it does not render on the Dashboard.
        - Result: Dashboard shows only Space creation/list, matching the user’s desire for a simpler overview.
    - **Space view (`#/spaces/:spaceId`)**
      - When authenticated and Spaces are loaded:
        - The “Projects in selected space” block is shown when `selectedSpaceId && !isDashboardRoute`.
        - The “Space assets (characters, scenes & styles)” panel is further gated by `selectedSpaceId && isSpaceRoute`, so it only appears when the current hash is a Space route.
        - This panel still contains:
          - Forms to create characters, scenes, and styles (including structured metadata for characters and styles).
          - Lists of Space-level characters/scenes/styles, with canonical/draft labels and lock-aware delete buttons.
    - **Project view (`#/projects/:projectId`)**
      - In the selectedSpace context:
        - The Space assets panel is hidden because it is gated by `isSpaceRoute`.
        - The Project-specific block (import + project assets + tasks/renders) is gated by `selectedProjectId && isProjectRoute`.
          - Import form: `POST /api/projects/:projectId/import`.
          - Project assets section: lists imported project-level characters/scenes via `/api/projects/:projectId/definitions/characters|scenes`.
          - Tasks & renders section: unchanged behavior (create task, render via Gemini/S3, and show rendered assets gallery), now only visible in the Project view.
  - Within the Spaces list:
    - Each Space list item still calls `handleSelectSpace(space.id)` on row click (which loads projects/definitions).
    - Added a small “Open space” button per Space that:
      - `stopPropagation()` to avoid double-select.
      - Calls `handleSelectSpace(space.id)` and `navigateTo({ kind: 'space', spaceId })` to jump into the Space view explicitly.

- State alignment with routes:
  - Kept `selectedSpaceId` / `selectedProjectId` as existing state, but improved how `selectedSpaceId` is chosen now that routes exist:
    - Updated the “auto-select first space” effect to be route-aware:
      - If not authenticated → no-op (and other effects reset state).
      - If no spaces loaded yet → no-op.
      - Otherwise:
        - If `route.kind === 'space'`, prefer `route.spaceId` as `desiredSpaceId`.
        - Else, if `selectedSpaceId` is already set, keep it.
        - Else, fall back to the first space in `spaces`.
      - When `desiredSpaceId` is non-null and differs from `selectedSpaceId`, it:
        - Calls `setSelectedSpaceId(desiredSpaceId)`.
        - Loads projects and definitions for that Space via `loadProjects(desiredSpaceId)` and `loadDefinitions(desiredSpaceId)`.
      - Dependencies: `[isAuthenticated, selectedSpaceId, spaces, route]`.
    - `loadProjects` behavior is unchanged except for still auto-selecting the first project in a space when there is no `selectedProjectId`.
  - Note: Deep-linking directly to `#/spaces/:spaceId` now:
    - After auth and spaces load, the effect will select `spaceId` (if any spaces exist) and load its projects/definitions.
  - Project deep-linking (`#/projects/:projectId`) still relies on the current “selected Space”/“selected Project” state:
    - Navigation via the UI (Projects list + “Current project” button) remains the primary way to enter the Project view.
    - A future plan could add a small backend endpoint (e.g., `GET /api/projects/:id`) to support robust deep linking that also infers the owning Space.

## 4.3 README / Docs Updates
- Updated `README.md` (Frontend section) to describe the new routing and views:
  - Added bullets under “The app currently:” to explain:
    - The hash-based router with three main views:
      - `#/dashboard` → Spaces overview and create form.
      - `#/spaces/:spaceId` → projects + Space assets.
      - `#/projects/:projectId` → imported project assets + tasks/renders.
    - Where spaces, projects, definitions, and tasks/renders are available (Space view vs Project view).

## 4.4 How to Use the New UI
- Login/register as before on the Account panel.
- Once authenticated:
  - Go to `#/dashboard` (default) to see and create Spaces.
  - Use the “Open space” button on a Space row or the “Current space” header button to navigate to `#/spaces/:spaceId`:
    - Here you can create projects and manage Space assets (characters/scenes/styles).
  - From the Space view, select a project in the list and optionally click “Current project” in the header to navigate to `#/projects/:projectId`:
    - Here you can import Space definitions into the project, manage project-level assets, create tasks, and trigger renders.

## 4.5 Open Questions / Next Steps
- Consider extracting the inline route segments into dedicated components (e.g., `DashboardView`, `SpaceView`, `ProjectView`) for readability; current implementation keeps changes minimal in a single `App.tsx`.
- Add a small backend endpoint like `GET /api/projects/:id` to support fully robust, direct deep-linking into `#/projects/:projectId` without relying on prior Space selection.
- Continue iterating on UX (e.g., breadcrumbs or clearer navigation labels) as the feature set grows, while keeping the current hash-based routing structure stable.

