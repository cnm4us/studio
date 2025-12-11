# Implementation Plan 13: Full Character & Style Configuration (Port from Graphics)

## 1. Overview

Goal: Bring the **fully detailed Character and Style configuration** from the legacy Graphics app into Studio, using our existing `definitions` + Tasks/Renders pipeline. Characters and styles created in Studio should:
- Use the same category/option structures as Graphics.
- Persist their full configuration as JSON in `definitions.metadata`.
- Be directly usable as cast inputs for Tasks and renders.

In scope:
- Port the configuration schemas (categories + options) for:
  - Character appearance.
  - Style appearance.
- Add rich, multi-section forms in Studio to create/edit characters and styles within a Space, with:
  - Name + description.
  - Structured category fields mapped to the Graphics JSON shapes.
- Ensure newly created Studio definitions are compatible with our existing:
  - `rendered_assets.metadata` structures.
  - Prompt composition logic.

Out of scope (for this plan):
- The full clone/locking model from `roadmap_v2.md` (canonical/base/working clones, task-level clones).
- Importing legacy Graphics **data** directly into Studio DB.
- Any changes to Tasks, Renders, or S3/CloudFront behavior.

Anchors:
- Legacy shapes and config:
  - `/home/ubuntu/graphics/server/src/config/characterAppearance/index.ts`
  - `/home/ubuntu/graphics/server/src/config/styleDefinitions/index.ts`
  - `graphics.character_versions.appearance_json`
  - `graphics.style_versions.style_definition_json`
- Studio implementation:
  - `db/migrations.sql` — `definitions`, `tasks`, `rendered_assets`.
  - `server/src/definitions_routes.ts` / `space_definitions_routes.ts` — Space definition creation APIs.
  - `server/src/tasks_routes.ts` — usage of `CharacterAppearanceMetadata` and `StyleDefinitionMetadata` in prompt composition and `rendered_assets.metadata`.
  - `client/src/App.tsx` and `client/src/views/SpaceView` / `ProjectView.tsx` — current create-character/scene/style forms and cast UI.

---

## 2. Step-by-Step Plan

### Step 1 — Confirm legacy schemas and define shared types in Studio  
Status: Pending  
Implementation:
- Inspect legacy config:
  - Open `/home/ubuntu/graphics/server/src/config/characterAppearance/index.ts` and its imported category files to confirm:
    - Top-level keys (`core_identity`, `facial_structure`, `hair`, `skin`, `physique`, `distinctive_markers`, `clothing_defaults`, `character_lore`, etc.).
    - Option keys and value enumerations.
  - Open `/home/ubuntu/graphics/server/src/config/styleDefinitions/index.ts` to confirm:
    - Top-level keys (`core_style`, `line_and_detail`, `color_and_lighting`, `rendering_technique`, `composition_and_camera`, `mood_and_atmosphere`, etc.).
    - Option keys and value enumerations.
- Ensure Studio server has compatible TS types:
  - In `server/src/definition_metadata.ts` or equivalent:
    - Confirm existing `CharacterAppearanceMetadata` and `StyleDefinitionMetadata` types match the legacy JSON shapes (or extend them).
    - If missing fields, extend these types to fully represent the Graphics JSON schemas.
- No DB changes:
  - Confirm `definitions.metadata` remains a JSON column; we’ll store the full structures there.
Testing:
- Type-check `CharacterAppearanceMetadata` and `StyleDefinitionMetadata` against a few example JSON blobs from the Graphics DB (e.g., from `character_versions.appearance_json`, `style_versions.style_definition_json`) by pasting them into a temporary TS file and asserting they satisfy the types.
Checkpoint:
- We have accurate, shared TS types describing the full character and style config shapes in Studio.

### Step 2 — Server: Accept full character & style metadata on create/update  
Status: Pending  
Implementation:
- Space-level definitions:
  - Locate character/style creation handlers, likely in:
    - `server/src/space_definitions_routes.ts` (or similar).
  - Extend request body schemas to accept a `metadata` object conforming to:
    - `CharacterAppearanceMetadata` for `type='character'`.
    - `StyleDefinitionMetadata` for `type='style'`.
  - Validation:
    - For this plan, keep validation light:
      - Require `name`.
      - Accept `metadata` as optional but, when present, validate it is an object.
      - Optionally, perform shallow validation (check known top-level keys exist when provided).
  - Persistence:
    - Store the full metadata object in `definitions.metadata`.
- GET endpoints:
  - Ensure Space-level and Project-level `GET` endpoints already return `metadata` unchanged in each `DefinitionSummary`.
Testing:
- Create a Space-level character via API with a full `CharacterAppearanceMetadata` payload and confirm:
  - Row is written to `definitions`.
  - `metadata` JSON reflects the full structure.
  - `GET` endpoint returns the same structure.
Checkpoint:
- Backend can round-trip full character/style metadata on create/read.

### Step 3 — Client: Character creation/edit form with full config  
Status: Pending  
Implementation:
- In the Space view (or dedicated Space “Create Character” view):
  - Replace the current minimal character form (name + freeform description + a few flat fields) with a multi-section form that mirrors Graphics categories:
    - Sections (aligned with `core_identity`, `facial_structure`, `hair`, `skin`, `physique`, `distinctive_markers`, `clothing_defaults`, `character_lore`).
    - For each section:
      - Use `<select>` or radio inputs for enumerated options (e.g., `age_range`, `gender_identity`, `hair_color`, etc.).
      - Use multi-select for fields like `personality_keywords`, `genre`, etc.
  - State management:
    - Keep a single `characterMetadata` object in component state, typed as `CharacterAppearanceMetadata`.
    - Update nested properties as form controls change.
  - Submission:
    - On submit, POST to the existing Space character creation endpoint with:
      - `name`, `description`.
      - `metadata: characterMetadata`.
    - On success:
      - Refresh Space definitions list (`spaceCharacters`).
      - Reset the form.
- Editing (optional for this plan):
  - Optionally implement an “Edit character” path that:
    - Prefills the same form from an existing definition’s `metadata`.
    - Sends an update request to a `PATCH /spaces/:spaceId/characters/:id` endpoint (if present), or we can defer editing to a later plan.
Testing:
- Create a new character via the UI selecting a variety of options across sections.
- Verify in the DB (or via `/api/spaces/:spaceId/characters` JSON) that:
  - All selected options are present in the stored `metadata`.
Checkpoint:
- Studio can create Space characters with a full, structured appearance configuration matching Graphics.

### Step 4 — Client: Style creation/edit form with full config  
Status: Pending  
Implementation:
- Similar to Step 3, for styles:
  - In the Space view (or dedicated “Create Style” view):
    - Replace the minimal style form with a multi-section form based on:
      - `core_style`, `line_and_detail`, `color_and_lighting`, `rendering_technique`, `composition_and_camera`, `mood_and_atmosphere`.
    - Use appropriate control types for each:
      - Single-select, multi-select, checkboxes as needed.
  - State:
    - Maintain `styleMetadata` in state, typed as `StyleDefinitionMetadata`.
  - Submission:
    - POST to style creation endpoint with `name`, `description`, and `metadata: styleMetadata`.
    - Refresh styles list on success.
- Editing (optional, similar to characters).
Testing:
- Create several styles with different section combinations and verify they’re stored correctly in `definitions.metadata` and returned by the Space styles API.
Checkpoint:
- Studio can create Space styles configured with the same richness as the legacy Graphics app.

### Step 5 — Verify renders use full metadata (no schema drift)  
Status: Pending  
Implementation:
- Backend:
  - Confirm `server/src/tasks_routes.ts` already uses:
    - `CharacterAppearanceMetadata` for characters (loop over all characters).
    - `StyleDefinitionMetadata` for style when present.
  - Ensure no assumptions about “partial metadata”; the new, richer `metadata` should still serialize cleanly into prompts and `rendered_assets.metadata`.
- End-to-end testing:
  - Create a Space.
  - Create a full character and full style via the new forms.
  - Import them into a Project.
  - Create a Task, assign the character/style in the Cast, set a prompt, and render.
  - Inspect:
    - Prompt details (via code or logs) to ensure the JSON appended for character/style matches the newly added fields.
    - `rendered_assets.metadata` to ensure full snapshots of `characterMetadatas` and `styleMetadata` are present.
Checkpoint:
- Full-fidelity metadata from the new forms flows into renders and their metadata without breaking the existing pipeline.

### Step 6 — Documentation & handoff updates  
Status: Pending  
Implementation:
- Update `agents/implementation/roadmap.md`:
  - Add `plan_13.md` under the appropriate phase (likely Phase 4 or 6).
  - Mark its status as “In progress” or “Completed” once done.
- Update `agents/handoff/handoff_04.md` (or create `handoff_05.md`):
  - Summarize:
    - That Studio now uses full Graphics-derived metadata for characters and styles.
    - How to find and extend the forms.
    - Any remaining gaps (e.g., editing or clone-aware behavior).
- Optional: add short notes in `agents/implementation/roadmap_v2.md` §7 to indicate that “full config forms” are implemented, while clone/locking semantics are still pending.
Testing:
- `npm run build` in both `server` and `client`.
- Quick manual pass through:
  - Creating a character/style.
  - Using them in a Task’s cast.
  - Rendering and viewing the resulting metadata via the modal.
Checkpoint:
- The next thread can clearly see that “full character/style configuration” is implemented, where it lives, and what remains for lineage/locking work.

---

## 3. Progress Tracking Notes

- Step 1 — Legacy schema review & TS types: Pending.  
- Step 2 — Server metadata acceptance: Pending.  
- Step 3 — Full character config form: Pending.  
- Step 4 — Full style config form: Pending.  
- Step 5 — Render verification with rich metadata: Pending.  
- Step 6 — Docs & handoff updates: Pending.  

Once Plan 13 is complete, Studio will match the previous Graphics site’s expressive power for defining characters and styles, while benefiting from the newer Spaces/Projects/Tasks/Renders pipeline and UI we’ve built here. Future plans can then focus on the deeper clone/locking rules described in `roadmap_v2.md` without revisiting basic configuration surfaces.

