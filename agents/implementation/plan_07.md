# Implementation Plan 07: Styles & Seed Real Character/Style Data

## 1. Overview
Goal: Introduce Style definitions alongside Characters/Scenes and seed a small set of real character/style JSON from the previous project so we can generate renders using actual characters + styles, and get comfortable with the JSON that Studio will persist for characters, styles, and (later) scenes.

In scope:
- Extend the `definitions` model to support Styles as first-class assets, sharing the same lineage and Space/Project scopes.
- Define and adopt minimal but realistic JSON shapes for `character.metadata` and `style.metadata`, grounded in the previous project’s data.
- Add Space-level Style APIs and a minimal UI panel to create/list Styles.
- Wire Styles into the render pipeline in a basic way (Task prompt composition and metadata snapshots).
- Implement a one-off seed/import path that pulls a curated subset of real characters/styles into a Space in Studio for testing.

Out of scope:
- Full Task-level clone model for character/style variants (that stays for a later plan).
- Complex Style editing tools or visual style builders in the UI (we will treat metadata as opaque JSON for now).
- Bulk migration of all legacy assets; we will seed only a small, representative set in this plan.

Anchors:
- `agents/implementation/roadmap.md` — Phase 4 (Definitions & lineage) and Phase 6 (Refinements & Studio-level UX).
- `agents/implementation/roadmap_v2.md` — especially sections on canonical asset types, mutability, and render lineage.
- Prior Graphics app data model (for character/style JSON) as the source of truth for metadata shapes.

## 2. Step-by-Step Plan

1. Define style/character metadata shape and extend Definition types  
   Status: Completed  
   Implementation:
   - Review a small sample of the previous project’s character and style JSON and extract:
     - Core fields for Characters (e.g., name, short description, traits, visual attributes) that should live in `definitions.metadata`.
     - Core fields for Styles (e.g., palette, line weight, rendering hints, camera/lighting preferences).
   - Update the conceptual model so `definitions.type` explicitly includes a `'style'` variant, alongside `'character'` and `'scene'`.
   - Document the agreed minimal JSON shape (keys, types, and any nested structures) in comments and/or a short Markdown note for reference during implementation.  
   Testing: Validate sample JSON against the proposed shape to ensure we can store it without lossy transformations.  
   Checkpoint: Wait for developer approval before proceeding.

2. Add Style support to DB schema and backend services  
   Status: Completed  
   Implementation:
   - Update `db/migrations.sql` so `definitions.type` supports `'style'` in addition to `'character'` and `'scene'` (no breaking changes for existing data).
   - Extend `server/src/definitions_service.ts` to:
     - Treat `'style'` as a valid `DefinitionType`.
     - Provide helpers to list/create Space-level Style definitions, mirroring the existing character/scene helpers (with metadata optional for now).
   - Add new routes in the backend (e.g., `server/src/space_styles_routes.ts` or extend `space_definitions_routes.ts`) to support:
     - `GET /api/spaces/:spaceId/styles` → list Space-level Styles.
     - `POST /api/spaces/:spaceId/styles` → create a new Space-level Style with `name`, `description?`, and optional `metadata`.  
   Testing:
   - Apply migrations to a dev DB and confirm that `definitions` accepts `type='style'`.
   - Use curl/Postman to hit the new Style endpoints: create a Style, fetch it back, and verify stored JSON in `metadata`.  
   Checkpoint: Wait for developer approval before proceeding.

3. Wire Styles into Tasks and render metadata (minimal integration)  
   Status: Completed  
   Implementation:
   - Decide the simplest UX flow for now:
     - Either let Tasks reference a chosen Character and Style by ID, or
     - Let Task renders infer the active Style from metadata on the Space/Project (for early tests).
   - Extend Task creation and/or render endpoints so that:
     - Requests may include optional `characterDefinitionId` and `styleDefinitionId` (or similar) in the body.
     - When present, the backend:
       - Loads the referenced definitions.
       - Incorporates key metadata fields into the prompt passed to Gemini (e.g., appending a concise style description).
       - Stores the IDs and a snapshot of the character/style metadata in the `rendered_assets.metadata` JSON for traceability.
   - Keep all new fields optional so existing Task flows continue to work.  
   Testing:
   - Create a Task that references a character + style, trigger a render, and confirm:
     - The render still succeeds.
     - `rendered_assets.metadata` includes the expected character/style IDs and snapshot data.  
   Checkpoint: Wait for developer approval before proceeding.

4. Add a minimal Space-level Styles panel and selection UI  
   Status: Completed  
   Implementation:
   - In `client/src/App.tsx`, add a simple “Styles” column or subpanel under “Space assets (characters & scenes)” for the selected Space:
     - Form to create a Style (name + optional description; metadata remains implicit for now).
     - List of Styles for that Space, indicating canonical vs draft (mirroring character/scene states when applicable).
   - In the Project/Task UI:
     - Introduce a very basic way to choose a Style when preparing a render:
       - For example, a dropdown of available Space Styles (or Project-imported Styles once available) when creating a Task or when triggering `POST /api/tasks/:taskId/render`.
   - Keep the UX minimal and inline with current styling; no heavy editor or multi-page flows.  
   Testing:
   - From the browser, create some Styles, confirm they appear in the list, and that you can select one when creating or rendering a Task.  
   Checkpoint: Wait for developer approval before proceeding.

5. Implement a one-off seed/import path for legacy characters/styles  
   Status: Completed (optional for now; script exists but is not required in normal workflows)  
   Implementation:
   - Decide on the simplest source for legacy data (e.g., a JSON export file from the previous project committed under `seed/` or a local path).
   - Add a small Node script or backend admin-only endpoint (e.g., `scripts/seed_legacy_definitions.ts` or `/api/admin/seed-legacy`) that:
     - Reads a curated subset of legacy characters and styles.
     - Maps their fields into the agreed `metadata` shape.
     - Inserts them as Space-level canonical Character and Style definitions into a chosen Space (or creates a dedicated “Legacy Demo” Space if needed).
   - Make the seed idempotent where possible (e.g., skip duplicates based on a stable legacy ID).  
   Testing:
   - Run the seed once against a dev DB.
   - Inspect `definitions` to confirm that legacy characters/styles are present with sane metadata.
   - In the UI, verify that the seeded assets appear under Space assets and can be used to drive renders.  
   Checkpoint: Wait for developer approval before proceeding.

6. Update docs and handoff notes for Styles and seeded data  
   Status: Completed  
   Implementation:
   - Update `README.md` to:
     - Document the new `style` definition type and relevant endpoints.
     - Briefly describe how character/style metadata is structured and how it influences the render pipeline.
     - Describe how to run the seed/import script (or endpoint) and where seeded assets show up.
   - Update the latest handoff file with:
     - A summary of the Style model, metadata shapes, and the seed path.
     - Any caveats (e.g., styles are read-only metadata for now; editing tools are future work).  
   Testing:
   - Confirm that a new developer can follow `README.md` to:
     - Start the app.
     - Seed legacy data.
     - Create a render using a seeded character + style.  
   Checkpoint: Wait for developer approval before considering this plan complete.

## 3. Progress Tracking Notes

- Step 1 — Status: Completed (metadata shapes defined and types added in `server/src/definition_metadata.ts`; `definitions.type` extended).  
- Step 2 — Status: Completed (DB migration and backend Style routes added; `GET/POST /api/spaces/:spaceId/styles`).  
- Step 3 — Status: Completed (render endpoint accepts optional character/style/scene IDs and stores snapshot metadata).  
- Step 4 — Status: Completed (Space assets panel shows Styles; Project view has Style selector).  
- Step 5 — Status: Completed (seed script `npm run seed:legacy` exists; considered optional to run).  
- Step 6 — Status: Completed (README and handoff updated where needed as part of Plan 06/07 work).  
