# Implementation Plan 19_1: Space Assets — Storage, API, Minimal UI

## 1. Overview

Goal: Introduce **space-scoped assets** (reference images) that can be uploaded once per Space and reused across Characters, Scenes, Styles, and Tasks, without yet wiring them into definition metadata or prompt rendering (that work will follow in `plan_19_2` and `plan_19_3`).

In this plan we will:
- Add a `space_assets` table for storing asset metadata and S3 keys/URLs.
- Define a stable S3 key layout for space assets under `spaces/<spaceId>/assets/...`.
- Implement authenticated REST endpoints to **list**, **upload**, and **delete** assets for a Space.
- Add a basic **Space Assets** UI: a dedicated view reachable from the Space page with filtering by asset type and an upload form.

Out of scope for this plan (deferred to `plan_19_2` / `plan_19_3`):
- Allowing Character/Scene/Style definitions to link to assets.
- Using assets in the Prompt Renderer / `IMAGE REFERENCES` section.
- Multi-select reference wiring in the definition forms.

Anchors:
- DB schema: `db/migrations.sql`.
- S3 wiring: `server/src/s3_client.ts`.
- Auth / ownership patterns:
  - `server/src/spaces_routes.ts`
  - `server/src/tasks_routes.ts` (space-scoped tasks and rendered assets).
- Server routing entry point: `server/src/index.ts`.
- Client routing and state: `client/src/App.tsx`.
- Space-level UI: `client/src/views/SpaceView.tsx`.

---

## 2. Step-by-Step Plan

### Step 1 — Add `space_assets` table and basic schema
**Status: Pending**

Implementation:
- In `db/migrations.sql`, append a new section for **Plan 19_1: Space assets** with:
  - Table: `space_assets`:
    - `id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY`
    - `space_id INT UNSIGNED NOT NULL`
    - `name VARCHAR(255) NOT NULL`
    - `type ENUM(...) NOT NULL` where the initial enum set (reference types) is:
      - `'character_face'`
      - `'character_body'`
      - `'character_hair'`
      - `'character_full'`
      - `'character_prop'`
      - `'character_clothing'`
      - `'scene_reference'`
      - `'style_reference'`
    - `file_key VARCHAR(512) NOT NULL` (S3 key, e.g. `spaces/12/assets/12345/face_ref.png`)
    - `file_url TEXT NOT NULL` (public or CloudFront URL at time of upload)
    - `metadata JSON NULL` (for mime type, original filename, dimensions, etc.)
    - `created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`
    - (Optional) `updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`
  - Constraints:
    - `FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE ON UPDATE CASCADE`
  - Indexes:
    - `INDEX idx_space_assets_space (space_id)`
    - `INDEX idx_space_assets_space_type (space_id, type)`
- This schema should mirror the patterns used in `definitions`, `tasks`, and `rendered_assets` (space ownership + helpful composite index).

Testing:
- Apply migrations to a local/dev DB and verify:
  - `DESCRIBE space_assets;` shows the expected columns.
  - Foreign key to `spaces` is present.

Checkpoint:
- Database can store space-owned assets with typed reference categories and S3 location metadata.

---

### Step 2 — Define S3 key layout and server-side asset model
**Status: Pending**

Implementation:
- S3 key strategy:
  - Use a consistent layout: `spaces/<spaceId>/assets/<assetIdOrTimestamp>/<originalFileNameOrSlug>`.
  - For the initial implementation (before the DB row exists), we can:
    - Generate a unique key based on space id + timestamp + a sanitized filename, e.g.:
      - `spaces/${spaceId}/assets/${Date.now()}_${slugifiedOriginalName}`
  - This keeps all assets clearly grouped under their owning space and separate from task render outputs (`spaces/<spaceId>/tasks/...`).
- Server model:
  - In a new file `server/src/space_assets_types.ts` (or inside `space_assets_routes.ts`), define:
    - `type SpaceAssetRecord = { id: number; space_id: number; name: string; type: string; file_key: string; file_url: string; metadata: any; created_at: Date; }`
  - Add a small mapper to shape DB rows for the client, e.g.:
    - `{ id, spaceId, name, type, fileKey, fileUrl, metadata, createdAt }`.
- Consider CloudFront signing:
  - For this plan, **use the stored `file_url` as-is** and do not sign asset URLs on every list call (we can add optional signing later if needed, similar to `maybeSignAssetUrl` in `tasks_routes.ts`).

Testing:
- No runtime tests yet; just ensure the types and key-format description are clear and consistent with `uploadImageToS3`.

Checkpoint:
- We have a clear S3 layout for assets and a server-side record shape that matches the DB schema.

---

### Step 3 — Implement `space_assets` REST API (list, upload, delete)
**Status: Pending**

Implementation:
- Create `server/src/space_assets_routes.ts`:
  - Use an Express router with `mergeParams: true`, similar to `spaceTasksRouter` in `tasks_routes.ts`.
  - Middleware:
    - `attachUserFromToken` and `requireAuth` (consistent with other routers).
  - Helper: `loadOwnedSpaceOr404(req, res)`:
    - Validate `spaceId` param.
    - `SELECT * FROM spaces WHERE id = ? AND user_id = ? LIMIT 1`.
    - 401/404 responses on failure.
  - Endpoints (all under `/api/spaces/:spaceId/assets`):
    1. `GET /` — list assets for a space:
       - Optional `type` query param to filter by one reference type.
       - Query:
         - `SELECT * FROM space_assets WHERE space_id = ? [AND type = ?] ORDER BY created_at DESC`.
       - Response: `{ assets: AssetDto[] }`.
    2. `POST /` — upload a new asset:
       - Request:
         - Authenticated user who owns the space.
         - Accept `multipart/form-data` with:
           - `file` (binary image).
           - `name` (string).
           - `type` (one of the allowed enum values).
       - Implementation details:
         - Add `multer` (or equivalent) to `server` dependencies for parsing `multipart/form-data`.
         - Validate:
           - `name` non-empty.
           - `type` in the configured enum list.
           - `file` present and not empty.
         - Build S3 key using Step 2’s convention.
         - Use `uploadImageToS3(key, buffer, mimeType)` to upload.
         - Insert into `space_assets` table with:
           - `space_id`, `name`, `type`, `file_key`, `file_url` (from `uploadImageToS3`), `metadata` containing at least `{ mimeType, originalFileName }`.
         - Read back the inserted row and return it mapped as an asset DTO with HTTP 201.
    3. `DELETE /:assetId` — delete an asset:
       - Confirm the asset belongs to the given `spaceId` and that the space belongs to the authenticated user.
       - `DELETE` the DB row.
       - For this plan we may **skip deleting from S3** (or note as a TODO) to keep the path simple; if we do delete from S3, use `DeleteObjectCommand` in `s3_client.ts`.
       - Response: `{ success: true }` or 204.
- Error handling:
  - Use clear error codes (`ASSET_UPLOAD_FAILED`, `ASSET_DELETE_FAILED`, etc.) following patterns from other routers.

Testing:
- Manual calls via curl or a REST client:
  - `GET /api/spaces/:spaceId/assets` with and without `type`.
  - `POST /api/spaces/:spaceId/assets` with a small PNG/JPEG.
  - `DELETE /api/spaces/:spaceId/assets/:assetId`.

Checkpoint:
- The backend can manage space-scoped assets end-to-end: creation (upload), listing, and deletion.

---

### Step 4 — Wire `space_assets_routes` into the server entrypoint
**Status: Pending**

Implementation:
- In `server/src/index.ts`:
  - Import the router:
    - `import { spaceAssetsRouter } from './space_assets_routes.js';`
  - Mount it after the existing space routers:
    - `app.use('/api/spaces/:spaceId/assets', spaceAssetsRouter);`
- Ensure the `spaceAssetsRouter` is created with `mergeParams: true` so `spaceId` is available inside route handlers.

Testing:
- Start the dev server and hit:
  - `GET /api/spaces/:spaceId/assets` to ensure routing and auth work.

Checkpoint:
- Assets API is reachable through the same `/api/spaces/:spaceId/...` hierarchy as tasks and definitions.

---

### Step 5 — Client: space assets API helpers and route wiring
**Status: Pending**

Implementation:
- In `client/src/App.tsx`:
  - Extend the route model to include a Space Assets route:
    - New `Route` kind, e.g. `{ kind: 'spaceAssets', spaceId: number }` for hash `#/spaces/:spaceId/assets`.
    - Update the route parser and `navigateTo` helper to support this path.
  - Add state slices:
    - `spaceAssets: SpaceAssetSummary[]`
    - `spaceAssetsLoading: boolean`
    - `spaceAssetsError: string | null`
    - `uploadSpaceAssetLoading: boolean`
    - `uploadSpaceAssetError: string | null`
  - API helpers (using `fetch` like the rest of the client):
    - `async function loadSpaceAssets(spaceId: number, type?: string)`:
      - `GET /api/spaces/:spaceId/assets[?type=...]` → updates `spaceAssets*` state.
    - `async function uploadSpaceAsset(spaceId: number, form: { name: string; type: string; file: File })`:
      - Uses `FormData` with `name`, `type`, `file`.
      - `POST /api/spaces/:spaceId/assets`.
      - On success, prepend or append new asset into `spaceAssets`.
    - `async function deleteSpaceAsset(spaceId: number, assetId: number)`:
      - `DELETE /api/spaces/:spaceId/assets/:assetId`.
      - On success, remove from `spaceAssets`.
  - When the current route is `spaceAssets`:
    - Trigger `loadSpaceAssets(spaceId)` on mount/space change (similar to how we load tasks/definitions).

Testing:
- Temporarily render a basic JSON dump of `spaceAssets` in the new view to verify data flows correctly.

Checkpoint:
- The client can talk to the new Space Assets API, with state held in `App.tsx`.

---

### Step 6 — Space Assets UI: `SpaceAssetsView` and “Add Assets” navigation
**Status: Pending**

Implementation:
- Add a new view component, e.g. `client/src/views/SpaceAssetsView.tsx`:
  - Props:
    - `spaceAssets`, `spaceAssetsLoading`, `spaceAssetsError`.
    - `onUploadAsset` (handler that wraps `uploadSpaceAsset`).
    - `onDeleteAsset`.
  - Layout:
    - Header: `Space assets`.
    - Filter control:
      - A `<select>` for `type` with the enum values (plus an “All types” option).
      - Changes trigger a call to `loadSpaceAssets(spaceId, selectedType)` via a parent handler.
    - List:
      - Group assets by `type` visually (e.g., headings per type) or show a `Type` column.
      - Each row shows:
        - Name.
        - Type (humanized).
        - Thumbnail (optional for later; for this plan, we can show just name + type + a link).
        - “Delete” button.
    - Upload section:
      - Simple form with:
        - Text input for `Name` (required).
        - Select for `Type` (required).
        - File input for image.
        - Submit button that calls `onUploadAsset`.
      - Show `uploadSpaceAssetError` near the form if set.
- Hook into Space view:
  - In `SpaceView.tsx`, in the “Space assets (characters, scenes & styles)” header area:
    - Add an `Add assets` (or `Manage assets`) button on the same row as Create Character/Scene/Style.
    - Clicking it should call a new `onOpenAssets()` prop passed down from `App.tsx`.
  - In `App.tsx`, implement `onOpenAssets` as `navigateTo({ kind: 'spaceAssets', spaceId })`.

Testing:
- From the Space page:
  - Click “Add assets” → navigate to the Space Assets page.
  - Upload an image asset:
    - It appears in the list with the chosen name/type.
  - Refresh the page:
    - Assets are fetched and displayed via the `GET` API.
  - Delete an asset:
    - Row disappears and subsequent reload confirms it is gone.

Checkpoint:
- Users can navigate from a Space to a first-class Space Assets page, upload assets with a name and type, list them, filter them, and delete them. Definitions and prompts remain unchanged.

---

## 3. Progress Tracking

- Step 1 — Add `space_assets` table and basic schema: Pending  
- Step 2 — Define S3 key layout and server-side asset model: Pending  
- Step 3 — Implement `space_assets` REST API (list, upload, delete): Pending  
- Step 4 — Wire `space_assets_routes` into the server entrypoint: Pending  
- Step 5 — Client: space assets API helpers and route wiring: Pending  
- Step 6 — Space Assets UI: `SpaceAssetsView` and “Add Assets” navigation: Pending  

Once Plan 19_1 is complete, the Studio will have a robust, space-scoped asset system for uploading and managing reference images. `plan_19_2` will then focus on wiring these assets into Character/Scene/Style metadata, and `plan_19_3` will integrate them into the prompt rendering pipeline.

