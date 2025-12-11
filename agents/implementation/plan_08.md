# Implementation Plan 08: Dashboard, Spaces View & Project View

## 1. Overview
Goal: Split the current single-page Studio UI into clearer segments (Dashboard, Space view, Project view) so humans can navigate Spaces, assets, projects, and tasks without everything living on one screen, while keeping backend APIs and data models unchanged.

In scope:
- Introduce a minimal client-side routing layer.
- Create separate views/routes for:
  - A high-level Dashboard.
  - A Space-focused view (assets + projects for a single Space).
  - A Project-focused view (imported assets + tasks/renders for a single Project).
- Move existing UI panels into these routes with minimal refactoring.

Out of scope:
- Deep visual redesign or new component library.
- Per-Task detail views, advanced filters, or breadcrumbs beyond the basics needed for navigation.
- Backend API changes (we reuse the existing endpoints).

Anchors:
- `agents/implementation/roadmap.md` — Phase 6 (Refinements & Studio-level UX).
- `agents/implementation/roadmap_v2.md` — for long-term structure, but this plan focuses strictly on layout/routing.

## 2. Step-by-Step Plan

1. Choose lightweight routing approach and scaffold route structure  
   Status: Pending  
   Implementation:
   - Introduce a minimal routing solution in the client (e.g., React Router or a simple hash-based router) consistent with the current toolchain.
   - Define top-level routes:
     - `/dashboard` — overview entry point (can be the default).
     - `/spaces/:spaceId` — primary Space view.
     - `/projects/:projectId` — primary Project view.
   - Ensure that direct navigation to these URLs works in dev and behind Nginx (single-page app behavior preserved).  
   Testing:
   - Verify that the app loads and renders the correct route when visiting each URL directly in the browser.  
   Checkpoint: Wait for developer approval before proceeding.

2. Extract and relocate existing panels into route-specific components  
   Status: Pending  
   Implementation:
   - Refactor `client/src/App.tsx` into smaller components without changing functionality:
     - A top-level shell (header + basic layout).
     - A `Dashboard` component that shows:
       - List of Spaces.
       - Quick link into a selected Space (e.g., “View Space” button).
     - A `SpaceView` that shows for one `spaceId`:
       - Space details.
       - Projects list and create form.
       - Space assets (characters/scenes/styles) and create/delete forms.
     - A `ProjectView` that shows for one `projectId`:
       - Project details.
       - Project assets (imported characters/scenes).
       - Tasks & renders section (Task create, render controls, gallery).
   - Keep the current data-fetching logic (`/api/spaces`, `/api/spaces/:spaceId/projects`, etc.) but colocate it with the new components where it makes sense.  
   Testing:
   - Confirm that navigating from Dashboard → Space → Project reproduces the same behaviors you have today on the single page (create space, create project, create assets, import, create task, render).  
   Checkpoint: Wait for developer approval before proceeding.

3. Wire navigation between views (links/buttons)  
   Status: Pending  
   Implementation:
   - In the Dashboard:
     - Add links/buttons to open a Space in `/spaces/:spaceId`.
   - In the Space view:
     - Link each Project to `/projects/:projectId`.
     - Provide a simple way to navigate back to the Dashboard (or a Space list).
   - In the Project view:
     - Provide a simple way to navigate back to the parent Space.  
   Testing:
   - Manually click through:
     - Dashboard → Space → Project → Space → Dashboard.
   - Ensure that auth and current user state are preserved across navigation.  
   Checkpoint: Wait for developer approval before proceeding.

4. Clean up state management to match the new layout  
   Status: Pending  
   Implementation:
   - Review state in `App.tsx` and the new components:
     - Ensure auth/user state remains global.
     - Scope Space-related state to Space view and Project-related state to Project view where possible.
   - Remove any now-unused “selected” state from the old single-page structure (e.g., `selectedSpaceId` in places where the route already encodes it).  
   Testing:
   - Verify that refreshing on `/spaces/:spaceId` or `/projects/:projectId` correctly reloads the necessary data and state.  
   Checkpoint: Wait for developer approval before proceeding.

5. Update docs and handoff notes for the new UI structure  
   Status: Pending  
   Implementation:
   - Update `README.md` (frontend section) to:
     - Mention the main routes (`/dashboard`, `/spaces/:spaceId`, `/projects/:projectId`).
     - Briefly describe what each view is for.
   - Update the latest handoff file with:
     - A short description of the new UI structure and where logic moved.
   - Optionally add a quick “how to navigate” summary for future agents.  
   Testing:
   - Confirm that a new developer can read `README.md`, run dev, and understand how to navigate to Spaces and Projects.  
   Checkpoint: Wait for developer approval before considering this plan complete.

## 3. Progress Tracking Notes

- Step 1 — Status: Pending.  
- Step 2 — Status: Pending.  
- Step 3 — Status: Pending.  
- Step 4 — Status: Pending.  
- Step 5 — Status: Pending.  

