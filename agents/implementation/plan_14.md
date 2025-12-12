# Implementation Plan 14: JSON Metadata Flow for Character, Scene, and Style Definitions

## 1. Overview

Goal: Exercise and verify the end-to-end JSON metadata flow for **Character**, **Scene**, and **Style** definitions, ensuring that:
- The new rich forms in Studio correctly serialize metadata into the appropriate JSON columns.
- The server reads from those JSON columns when resolving definitions for Tasks and renders.
- We have a clear picture of any remaining legacy columns that are no longer part of the primary data path.

This plan is intentionally scoped to *verification and wiring* of JSON metadata. Schema cleanup and broader task/shot architecture changes will be handled in a follow‑up plan.

In scope:
- Add a JSON metadata column for scene definitions in the legacy DB (`scene_versions`).
- Confirm how Studio’s current `definitions.metadata` fields map back to:
  - `character_versions.appearance_json`
  - `style_versions.style_definition_json`
  - `scene_versions.<new_json_column>`
- Exercise the **Character**, **Scene**, and **Style** create flows in Studio:
  - Verify the UI is writing the intended JSON shapes.
  - Verify the server is storing and returning these shapes intact.
  - Verify renders see and snapshot this metadata.

Out of scope (for this plan):
- Dropping or renaming legacy scalar columns on `*_versions` tables.
- Designing or implementing the long‑term Task/shot schema (cast tables, negative prompts, etc.).
- Importing legacy Graphics data directly into Studio.

Anchors:
- Legacy DB:
  - `character_versions.appearance_json`
  - `style_versions.style_definition_json`
  - `scene_versions` (to be extended with `scene_definition_json` or similar).
- Studio DB:
  - `db/migrations.sql` — `definitions.metadata` and `rendered_assets.metadata`.
- Studio server:
  - `server/src/definition_metadata.ts` — `CharacterAppearanceMetadata`, `StyleDefinitionMetadata`, `SceneDefinitionMetadata`.
  - `server/src/space_definitions_routes.ts` — creation of Space-level definitions.
  - `server/src/tasks_routes.ts` — how metadata is used when composing prompts and storing rendered asset metadata.
- Studio client:
  - `client/src/config/characterAppearance/*`
  - `client/src/config/styleDefinitions/*`
  - `client/src/config/sceneDefinitions/*`
  - `client/src/App.tsx` — create-character/scene/style flows and metadata wiring.

---

## 2. Step-by-Step Plan

### Step 1 — Extend legacy schema for scenes with JSON metadata  
Status: Pending  
Implementation:
- Add a new JSON column to `scene_versions`, e.g.:
  - `scene_definition_json JSON NULL` (or `scene_metadata_json` for clarity).
- Keep existing scalar columns on `scene_versions` for now:
  - Do **not** drop or repurpose them in this plan.
  - This preserves existing queries while we transition to JSON as the primary source of truth.
- Document the new column in the schema docs / README used by the legacy app, noting that Studio and future flows should treat it as the authoritative scene configuration.

Testing:
- Apply the migration to a dev DB.
- Manually write a small JSON payload into `scene_definition_json` for a test row and confirm:
  - It round-trips correctly.
  - No existing queries break.

Checkpoint:
- `scene_versions` now matches `character_versions` and `style_versions` in having a dedicated JSON metadata column.

---

### Step 2 — Confirm Studio server types and JSON plumbing  
Status: Pending  
Implementation:
- Review `server/src/definition_metadata.ts`:
  - Confirm `CharacterAppearanceMetadata` and `StyleDefinitionMetadata` match the shapes being written by the client configs.
  - Confirm `SceneDefinitionMetadata` is present and aligned with `client/src/config/sceneDefinitions/types.ts`.
- Verify `space_definitions_routes` (or equivalent) already:
  - Accepts `metadata` on character, scene, and style creation.
  - Writes that `metadata` to `definitions.metadata` unchanged.
  - Returns `metadata` in Space-level and Project-level definition lists.
- If any gaps are found:
  - Add missing type imports and `metadata` plumbing so that:
    - Characters: `metadata` is treated as `CharacterAppearanceMetadata`.
    - Styles: `metadata` is treated as `StyleDefinitionMetadata`.
    - Scenes: `metadata` is treated as `SceneDefinitionMetadata` (or `unknown` with a clear cast).

Testing:
- `npm run build` on the server to ensure types are consistent.
- Optionally log a sample `definition.metadata` when creating each type to confirm the server sees the full JSON structure.

Checkpoint:
- The server accepts, stores, and returns JSON metadata for all three definition types.

---

### Step 3 — Exercise Character form and verify JSON writes/reads  
Status: Pending  
Implementation:
- Using the Studio UI:
  - Navigate to a Space and open the “Create character” flow.
  - Populate several sections:
    - At least one ENUM field (e.g., `age_range`, `gender_identity`).
    - At least one TAGS field (e.g., `personality_keywords`, `strengths`, `flaws`).
    - A couple of free-text fields (e.g., lore snippets).
- On save:
  - Confirm the creation succeeds and the character appears in the Space definitions list.
- On the server/DB side:
  - Fetch the created definition via the Studio API (Space-level characters endpoint).
  - Inspect `definition.metadata`:
    - Verify keys and values line up with `client/src/config/characterAppearance`.
    - Verify TAGS fields come through as arrays, with both option-picked and custom-entered values present.
  - In the legacy DB (where available):
    - For any synchronization that writes to `character_versions.appearance_json`, confirm the JSON structure is compatible with the legacy schema (or document any divergence).

Testing:
- Create at least two characters with different combinations of fields.
- Confirm that re-fetching the same definition from the API produces identical metadata (no lossy transforms).

Checkpoint:
- Character forms are reliably populating `definitions.metadata` with the intended JSON; any mapping to `appearance_json` is understood.

---

### Step 4 — Exercise Style form and verify JSON writes/reads  
Status: Pending  
Implementation:
- From a Space, open the “Create style” flow.
  - Set fields across:
    - `core_style` (render domain, genre tags, influences tags).
    - Line/Detail, Color/Lighting, Rendering Technique, Composition/Camera, Mood/Atmosphere categories.
  - Use both:
    - Predefined options in ENUM and TAG fields.
    - Custom tag entries to ensure `allowCustom` behavior is correct.
- On save:
  - Confirm the style is created and appears in the Space definitions list.
- Check the API response for that definition:
  - Inspect `definition.metadata` to verify:
    - `genre`, `influences`, and other TAGS are arrays of strings.
    - ENUM fields store the expected `value` string (not the label).
  - Where relevant, confirm how this aligns with the legacy `style_versions.style_definition_json` payload.

Testing:
- Create multiple styles with different render domains and mood/atmosphere combinations.
- Confirm metadata is stable across reads and matches the config definitions.

Checkpoint:
- Style forms correctly serialize to JSON metadata that matches expectations and can be round-tripped.

---

### Step 5 — Exercise Scene form and verify JSON writes/reads  
Status: Pending  
Implementation:
- In a Space, open the “Create scene” flow (rich form based on `sceneDefinitions`):
  - Fill out:
    - Core scene identity (type, role, time period).
    - Lighting, atmosphere, color environment.
    - Camera/composition, layout, props/set dressing, scene lore.
  - Use a mix of ENUM, TAGS, NUMBER, BOOLEAN, and LIST fields to confirm all property types behave correctly.
- On save:
  - Confirm the scene appears in the Space definitions list.
- From the API/DB:
  - Fetch the Space-level scenes and inspect `definition.metadata`:
    - Check that the structure matches `SceneDefinitionMetadata`.
    - Verify LIST fields are arrays of strings and NUMBER/BOOLEAN fields are correctly typed.
  - If there is a synchronization path to the legacy `scene_versions.scene_definition_json`:
    - Confirm it receives the same shape used by Studio, or document any necessary transform.

Testing:
- Create at least one “dense” scene with many properties set and verify all values appear in the stored metadata.
- Confirm that reloading the UI (for a read-only view) would be able to reconstruct the same choices from this metadata.

Checkpoint:
- Scene forms are also reliably writing and reading JSON metadata in line with the new config.

---

### Step 6 — Verify renders see and snapshot JSON metadata  
Status: Pending  
Implementation:
- For each definition type:
  - Import one or more Space-level characters, scenes, and styles into a Project.
  - Create a Task in that Project and:
    - Attach 1–2 characters.
    - Attach a scene.
    - Attach a style.
    - Provide a prompt that references these elements (for easier sanity checking).
  - Trigger a render.
- Inspect the render:
  - Check `rendered_assets.metadata` in the DB or via the API:
    - Confirm `characterMetadatas` reflects the full character JSON from `definitions.metadata`.
    - Confirm `styleMetadata` and `sceneMetadata` reflect their respective JSON.
  - Confirm `server/src/tasks_routes.ts` uses these JSON blobs directly in prompt composition without assuming an older/minimal schema.

Testing:
- Perform at least one render with a fully populated cast and verify that:
  - The prompt string contains a JSON serialization of the full metadata (even if it’s verbose).
  - The stored metadata on the asset is a faithful snapshot of the definitions at the time of rendering.

Checkpoint:
- The entire path from form → `definitions.metadata` → Task → Render → `rendered_assets.metadata` is proven to handle the richer JSON metadata for all three definition types.

---

### Step 7 — Capture findings and identify cleanup candidates  
Status: Pending  
Implementation:
- Based on the above verification, record:
  - Which `*_versions` scalar columns are clearly superseded by JSON for Characters, Scenes, Styles.
  - Any columns still actively used for search or display that we should keep around or replace with derived/indexed fields.
- Add a short section to the architecture notes or a future plan (e.g., `plan_15`) summarizing:
  - “JSON is now the authoritative representation” for each asset type.
  - A candidate list of legacy fields that can be:
    - Deprecated.
    - Backfilled from JSON (or vice versa).
    - Eventually dropped in a dedicated migration.

Testing:
- None in code; this is a documentation and planning step.

Checkpoint:
- We have a clear, up-to-date understanding of the JSON metadata flow and a concrete list of targets for future schema cleanup.

---

## 3. Progress Tracking Notes

- Step 1 — Scene JSON column: Pending.  
- Step 2 — Server type & `definitions.metadata` verification: Pending.  
- Step 3 — Character form JSON verification: Pending.  
- Step 4 — Style form JSON verification: Pending.  
- Step 5 — Scene form JSON verification: Pending.  
- Step 6 — Render-time JSON snapshot verification: Pending.  
- Step 7 — Findings + cleanup candidates: Pending.  

Once Plan 14 is complete, we’ll have high confidence that our new Character, Scene, and Style forms are correctly driving JSON metadata end-to-end, and we’ll be positioned to safely plan schema cleanup and the richer Task/shot model in a follow‑up plan.

