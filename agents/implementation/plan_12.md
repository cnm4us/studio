# Implementation Plan 12: Rendered Asset Modal & State Controls

## 1. Overview

Goal: Improve how rendered images are reviewed and managed at the **Task** level by:
- Showing each rendered asset in a **modal overlay** instead of a new browser tab.
- Allowing the user to change the asset’s `state` (`draft` / `approved`) directly from that modal.
- Supporting a **soft delete** (“archive”) that removes the render from the UI while keeping the database row/S3 object available for future cleanup if needed.

In scope:
- Backend API for updating the `state` of a `rendered_assets` row and soft-deleting (archiving) an asset.
- Frontend modal UI for viewing an asset inline and applying these state changes.
- Filtering out archived assets from the Project view’s rendered-asset lists so “Delete” behaves as an immediate removal in the UI.

Out of scope (for this plan):
- Hard deletion of S3 objects.
- Any changes to locking behavior for characters/scenes/styles or Assets; this plan only touches `rendered_assets`.
- Bulk actions (multi-select approve/delete) on renders.

Anchors:
- `db/migrations.sql` — `rendered_assets` table schema, including `state`.
- `server/src/tasks_service.ts` — listing and creating `rendered_assets`.
- `server/src/tasks_routes.ts` — project-level rendered asset listing, render endpoint, and CloudFront signing.
- `client/src/App.tsx` & `client/src/views/ProjectView.tsx` — Project view, per-task renders, and global rendered asset grid.

---

## 2. Step-by-Step Plan

### 1. Add backend helpers for updating and soft-deleting rendered assets  
Status: Pending  
Implementation:
- In `server/src/tasks_service.ts`:
  - Add a function to load a single `rendered_assets` row by id:
    - `getRenderedAssetById(assetId: number): Promise<RenderedAssetRecord | null>`.
  - Add a function to **update the state** of a rendered asset:
    - `updateRenderedAssetState(assetId: number, state: 'draft' | 'approved' | 'archived'): Promise<void>`.
    - Simple `UPDATE rendered_assets SET state = ? WHERE id = ?`.
- Ownership checks will be handled at the routing layer (see Step 2), so these helpers can focus on DB operations only.
Testing:
- From a temporary script or REPL, call `getRenderedAssetById` and `updateRenderedAssetState` to confirm updates persist.
Checkpoint:
- Service-layer functions exist and can update the `state` column safely.

### 2. Expose a secure API for asset state changes and soft delete  
Status: Pending  
Implementation:
- In `server/src/tasks_routes.ts`:
  - Introduce a small helper to load a rendered asset and ensure it belongs to a project owned by the current user:
    - For a given `assetId`, join `rendered_assets → projects → spaces` with `spaces.user_id`.
    - If not found or not owned, respond with `404` / `403` (`RENDERED_ASSET_NOT_FOUND` or `UNAUTHENTICATED` as appropriate).
  - Add a new router (or extend the existing `projectsRouter`) to handle asset updates, e.g.:
    - `PATCH /api/projects/rendered-assets/:assetId`
      - Body: `{ state: 'draft' | 'approved' | 'archived' }`.
      - After ownership validation, call `updateRenderedAssetState`.
      - Return the updated record, passed through `maybeSignAssetUrl`, so the client can refresh its local list.
  - Soft delete:
    - Treat “Delete” as `state = 'archived'`.
    - We do **not** remove the DB row or delete the S3 object in this plan; we simply mark it archived.
Testing:
- Manually hit `PATCH /api/projects/rendered-assets/:id` with different `state` values and confirm:
  - Unauthorized users cannot change assets.
  - Owned assets update `state` correctly and are returned with the signed `file_url`.
Checkpoint:
- We have a minimal, secure REST surface for updating render state and archiving assets.

### 3. Filter archived assets out of project render listings  
Status: Pending  
Implementation:
- Decide whether to filter at the DB or API response level:
  - Simplest: keep `listRenderedAssetsByProject` as-is and filter in the route:
    - In `projectsRouter.get('/rendered-assets', …)`:
      - After fetching and signing assets, filter to `asset.state !== 'archived'` before returning to the client.
  - Alternatively, add a `WHERE state != 'archived'` clause to the query; either approach is acceptable as long as it’s consistent.
- Ensure the client’s per-task filtering (by `task_id`) operates on this already-filtered list so archived assets disappear from both the per-task and global grids.
Testing:
- Archive a render via the new API.
- Refresh the Project page and confirm the asset no longer appears anywhere in the UI.
Checkpoint:
- “Delete” (archive) effectively removes items from the visible rendered-asset lists.

### 4. Add a rendered-asset modal with state controls on the client  
Status: Pending  
Implementation:
- In `client/src/App.tsx`:
  - Add a handler that calls the new backend endpoint:
    - `async function handleUpdateRenderedAssetState(assetId: number, state: 'draft' | 'approved' | 'archived')`.
    - `PATCH /api/projects/rendered-assets/:assetId` with `{ state }`, using `credentials: 'include'`.
    - On success:
      - Update `renderedAssets` in state:
        - If `state === 'archived'`, remove the asset from the array.
        - Otherwise, replace the matching asset with the updated one.
    - On error:
      - Set an error message that can be surfaced near the rendered assets section (reuse `renderError` or add a dedicated `renderedAssetsError` if needed).
- In `client/src/views/ProjectView.tsx`:
  - Add state:
    - `const [selectedRenderedAsset, setSelectedRenderedAsset] = useState<RenderedAssetSummary | null>(null);`
  - Change thumbnail click behavior:
    - For per-task renders and the global grid:
      - Replace `<a href=… target="_blank">` wrappers with a `<button>`/`div` that calls `setSelectedRenderedAsset(asset)` to open the modal.
      - Optionally keep a small “open in new tab” link inside the modal for power users.
  - Modal UI:
    - Similar overlay to the existing definition-details modal:
      - Full-screen semi-transparent backdrop.
      - Centered card with:
        - Close “×” button in the top-right corner.
        - Large image (`img src={selectedRenderedAsset.file_url}`) or a link for non-image types.
        - A small “State: …” label for context.
        - Bottom-right buttons:
          - `[ Draft ]` → `handleUpdateRenderedAssetState(id, 'draft')`.
          - `[ Approve ]` → `handleUpdateRenderedAssetState(id, 'approved')`.
          - `[ Delete ]` → `handleUpdateRenderedAssetState(id, 'archived')`.
        - Style buttons in line with existing conventions:
          - Draft: neutral gray.
          - Approve: green.
          - Delete: red.
    - When the modal closes (backdrop click, close button, or after a successful state change), set `selectedRenderedAsset` back to `null`.
Testing:
- Open a per-task render image; verify it shows in the modal.
- Change state between Draft and Approved and confirm the state label updates and persists on reload.
- Click Delete and confirm the card disappears from both per-task and global lists after the update.
Checkpoint:
- Users can manage state and deletion of individual renders via a modal, without leaving the Project page.

### 5. Polish, error handling, and documentation  
Status: Pending  
Implementation:
- UX polish:
  - Disable state buttons while a state update is in-flight to avoid double-clicks.
  - Show a small inline error message in the modal if the API call fails.
  - Optionally add a brief confirmation step for Delete (e.g., `window.confirm` or a simple “Are you sure?” text in the modal) to avoid accidental archival.
- Docs / handoff:
  - Update the next handoff document to describe:
    - The new `PATCH /api/projects/rendered-assets/:id` endpoint.
    - The semantics of `draft` / `approved` / `archived`.
    - The behavior of the modal in the Project UI.
Testing:
- `npm run build` in both `server` and `client`.
- Manual click-through on the live Project view:
  - Create renders, approve some, leave others as draft, delete one, and confirm all behaviors match expectations.
Checkpoint:
- Rendered asset lifecycle (view, mark draft/approved, archive/delete) is fully supported and documented.

---

## 3. Progress Tracking Notes

- Step 1 — Backend helpers for rendered asset updates: Pending.  
- Step 2 — API endpoint for state/soft-delete: Pending.  
- Step 3 — Filtering archived assets from listings: Pending.  
- Step 4 — Modal UI and wiring on the client: Pending.  
- Step 5 — Polish, error handling, and docs: Pending.  

Once Plan 12 is complete, reviewers will be able to inspect each rendered image in context, mark it as draft or approved, and archive unwanted renders without leaving the Project page, all while keeping the underlying S3 objects and DB rows available for future workflows or maintenance scripts.

