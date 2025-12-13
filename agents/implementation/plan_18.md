# Implementation Plan 18: Clone Space Definitions (Characters, Scenes, Styles)

## 1. Overview

Goal: Enable fast iteration on Characters, Scenes, and Styles at the **Space** level by adding a **Clone** action that:
- Creates a brand-new, unlocked definition in the same Space.
- Prefills the create form from an existing definition’s name/description/metadata.
- Lets the user choose a new name and tweak properties before saving.
- Keeps the existing “Canonical / Locked” semantics (clones start as editable drafts).

Key behavior:
- Clone is only available for **space-scoped** definitions (not project copies).
- Cloning a locked definition is allowed; the clone itself is **not** locked until imported into a project.
- After saving a clone, the user returns to the Space view and sees the new definition in the lists and Space Task cast selectors.

Out of scope (future plans):
- Bulk cloning or template systems across spaces.
- Project-level clone (cloning a definition within project scope).
- UI for visualizing parent/child lineage beyond what’s needed here.

Anchors:
- Client:
  - `client/src/App.tsx` — route parsing, `navigateTo`, Space/Project view wiring.
  - `client/src/views/SpaceView.tsx` — Space-level definition lists (characters/scenes/styles, edit/delete).
  - `client/src/views/CharacterDefinitionFormView.tsx`
  - `client/src/views/SceneDefinitionFormView.tsx`
  - `client/src/views/StyleDefinitionFormView.tsx`
- Server:
  - `server/src/space_definitions_routes.ts` — Space-level CRUD for definitions.
  - `server/src/definition_metadata.ts` — metadata types.
  - `db/migrations.sql` — `definitions` table (already has `parent_id` / `root_id`).

---

## 2. Step-by-Step Plan

### Step 1 — Add “Clone” actions to Space definition lists
Status: Pending  

Implementation:
- In `SpaceView`:
  - For each of the three lists (Characters, Scenes, Styles), add a **Clone** button next to the existing `Edit` / `Delete` buttons.
  - Clone button rules:
    - Visible for all space-scoped definitions (including locked ones).
    - Disabled only if the definition is in a state where it no longer exists or can’t be loaded (e.g., extremely defensive, but generally keep Clone usable).
  - On click:
    - Call a callback prop (e.g., `onCloneDefinition(kind, definitionId)`).
- Update `App.tsx`:
  - Implement `handleCloneSpaceDefinition(kind, definitionId)` which:
    - Stores the `cloneFrom` id in state (e.g., separate `cloneCharacterFromId`, `cloneSceneFromId`, `cloneStyleFromId`) or a single route-state object.
    - Navigates to the appropriate “new” route for the type:
      - Character: `#/spaces/:spaceId/characters/new`
      - Scene: `#/spaces/:spaceId/scenes/new`
      - Style: `#/spaces/:spaceId/styles/new`
  - Pass this handler to `SpaceView` as `onCloneDefinition`.

Testing:
- From a Space:
  - Verify each definition row now has a Clone button.
  - Clicking Clone changes the hash to the correct `.../new` route and sets the internal `cloneFrom` state (no server call yet).

Checkpoint:
- UI wiring exists for initiating a clone for characters, scenes, and styles.

---

### Step 2 — Character clone prefill in CharacterDefinitionFormView
Status: Pending  

Implementation:
- In `CharacterDefinitionFormView`:
  - Accept new props for cloning context, e.g.:
    - `cloneFromId: number | null`
    - `onConsumeCloneFromId(): void` (to clear the one-shot intent after loading).
  - On mount:
    - If `cloneFromId` is set **and** we are on a **new** route (not edit):
      - Fetch the source character definition:
        - `GET /api/spaces/:spaceId/characters/:cloneFromId` (same endpoint used by the edit flow).
      - If successful:
        - Use `metadata` from the source as the initial `characterMetadata` form state.
        - Use `description` from the source as the initial description.
        - Name:
          - Prefill as something like `"<original name> (clone)"`, but keep it fully editable.
        - Do **not** copy `id`, `state`, `rootId`, or lock flags.
      - Call `onConsumeCloneFromId()` so the clone intent is one-shot (page refresh won’t re-trigger it unexpectedly).
  - When submitting:
    - Continue to use the existing **create** path (POST `/api/spaces/:spaceId/characters`).
    - Optionally, set `parent_id` to `cloneFromId`:
      - Implement by sending `parentId` as part of the request body and wiring through to the server (see Step 5).

Testing:
- Clone a canonical/locked Space character:
  - Confirm the new form is pre-filled with metadata, description, and a derived name.
  - Save the new character and confirm:
    - It appears in the Space definition list as a separate, unlocked row.
    - It’s available in Space Tasks cast selectors.

Checkpoint:
- Character cloning flow works end-to-end purely at the Space level.

---

### Step 3 — Scene clone prefill in SceneDefinitionFormView
Status: Pending  

Implementation:
- Mirror Step 2 for scenes:
  - Add clone props to `SceneDefinitionFormView`:
    - `cloneFromId: number | null`
    - `onConsumeCloneFromId(): void`
  - On mount, if `cloneFromId` is set and we’re in “new” mode:
    - Fetch `GET /api/spaces/:spaceId/scenes/:cloneFromId`.
    - Prefill:
      - `sceneMetadata` from the source definition’s metadata.
      - `description` from the source.
      - Name as `"<original name> (clone)"` (editable).
    - Clear clone intent via `onConsumeCloneFromId()`.
  - Submit via existing create endpoint:
    - `POST /api/spaces/:spaceId/scenes`, optionally with `parentId` for lineage.

Testing:
- Clone a complex Scene:
  - Confirm all structured metadata (camera, lighting, atmosphere, etc.) comes across.
  - Confirm the new Scene is editable and usable in Space Tasks.

Checkpoint:
- Scene cloning behaves like character cloning, respecting the same UX patterns.

---

### Step 4 — Style clone prefill in StyleDefinitionFormView
Status: Pending  

Implementation:
- Mirror Steps 2–3 for styles:
  - Add clone props to `StyleDefinitionFormView`:
    - `cloneFromId: number | null`
    - `onConsumeCloneFromId(): void`
  - On mount in “new” mode with `cloneFromId` set:
    - Fetch `GET /api/spaces/:spaceId/styles/:cloneFromId`.
    - Prefill:
      - `styleMetadata` from the source.
      - `description` from the source.
      - Name as `"<original name> (clone)"` (editable).
    - Clear clone intent.
  - Submit via the existing create endpoint:
    - `POST /api/spaces/:spaceId/styles`, with optional `parentId`.

Testing:
- Clone a Style:
  - Confirm render domain, genres, line/lighting/mood settings all carry over.
  - Confirm the new Style is available in Space Tasks and project import flows.

Checkpoint:
- Styles can be cloned and iterated in the Space just like characters and scenes.

---

### Step 5 — Optional lineage tracking via parent_id/root_id
Status: Pending  

Implementation:
- If we want to track original vs clone:
  - On clone form submit, include `parentId: cloneFromId` in the POST body.
  - In `space_definitions_routes`:
    - When creating a new definition, if `parentId` is provided and valid for the same Space + type:
      - Set `parent_id` to that value.
      - For `root_id`, either:
        - Copy the parent’s `root_id` if set.
        - Else set `root_id` to `parentId`.
  - This uses fields that already exist on `definitions` (no schema change).
- UI:
  - Optionally show subtle lineage hints (e.g., “Clone of: Jennifer”) in SpaceView, but keep this minimal in this plan.

Testing:
- Clone a definition that already has a root/parent:
  - Confirm the new row’s `parent_id` and `root_id` are meaningful and consistent across multiple generations of clones.

Checkpoint:
- Lineage is stored in the DB where useful, without changing UX semantics.

---

### Step 6 — Validation and UX polish
Status: Pending  

Implementation:
- Verify flows:
  - Clone → edit name/metadata → save → Space view shows new row and Space Tasks can use it.
  - Cloning locked vs unlocked sources behaves the same; the new clone is always initially editable.
  - Deleted/archived originals do not break clones that already exist.
- Edge cases:
  - If the source definition can’t be fetched (e.g., deleted between list load and clone click), surface a clear error message and keep the user on the Space view.
  - Ensure that clone intent is one-shot and does not persist unexpectedly if the user navigates away mid-form.
- UI text:
  - Button label: “Clone” is concise; optionally add tooltip text like “Create a new copy of this definition.”
  - Consider adding “(clone)” suffix only as a default; user should be free to rename.

Testing:
- Exercise cloning for:
  - Characters only.
  - Scenes only.
  - Styles only.
  - Mixed Space that has clones of all three types.
- Confirm nothing changes for:
  - Project-level workflows (tasks/import).
  - Existing edit/delete/lock semantics.

Checkpoint:
- Space-level cloning UX is stable, intuitive, and does not regress existing behavior.

---

## 3. Progress Tracking

- Step 1 — Add “Clone” actions to Space definition lists: Pending  
- Step 2 — Character clone prefill in CharacterDefinitionFormView: Pending  
- Step 3 — Scene clone prefill in SceneDefinitionFormView: Pending  
- Step 4 — Style clone prefill in StyleDefinitionFormView: Pending  
- Step 5 — Optional lineage tracking via parent_id/root_id: Pending  
- Step 6 — Validation and UX polish: Pending  

Once Plan 18 is complete, you’ll be able to clone any Space-level Character, Scene, or Style into a new, editable definition, making it much easier to iterate on variants (e.g., “Jennifer — Business Attire”) without disturbing canonical, project-linked originals.

