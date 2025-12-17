# Implementation Plan 25: Task-Level SFX / Speech / Thought Bubbles with Templates

## 1. Overview

Goal: Allow each Task to optionally carry structured instructions for SFX, speech bubbles, and thought bubbles (text + placement + style), editable per render via three toggleable buttons in the Task UI. When a button is enabled and has content, its text is incorporated into the prompt’s `TEXT ELEMENTS` section; when disabled/empty, the current “No speech or thought bubbles.” behavior is preserved. Default template text should be provided for each element so that clicking a button pre-populates a sensible style description that can be customized before saving.

In scope:
- Adding Task-level fields to store SFX / speech / thought bubble metadata (text + position + style description), with a simple on/off notion implied by emptiness.
- Updating server APIs and types so these fields can be read and updated from the client.
- Updating prompt rendering to translate these fields into the `TEXT ELEMENTS` section instead of always emitting “No speech or thought bubbles.”
- Adding three buttons (SFX, Thought, Speech) to the Task UI that:
  - Open a modal with a textarea when clicked.
  - Prefill the textarea from configurable templates on first use.
  - Change appearance (blue = off/empty, green = has content) based on whether the associated field is empty.
- Introducing a shared, configurable template source for default descriptions (especially for SFX style: background color, letter color, etc.), reused on both client and server where appropriate.

Out of scope:
- Supporting multiple SFX / speech / thought bubbles per Task (this plan assumes at most one of each type per Task).
- Any rendering of bubbles/SFX in the UI preview; this is prompt-level guidance only.
- Changing the render pipeline beyond how prompts are constructed.

Anchors:
- Prompt composition and the `TEXT ELEMENTS` section:
  - `server/src/prompt_renderer.ts`
- Task schema, API, and render flow:
  - `db/migrations.sql` (`tasks` table)
  - `server/src/tasks_routes.ts`
- Frontend Task view and API integration:
  - `client/src/App.tsx`
  - Any Task-related components under `client/src/views` (if present)
- Shared config / types:
  - `shared/` (definition config and shared TypeScript types)

---

## 2. Step-by-Step Plan

### Step 1 — Define Task-level data model for bubbles/SFX
Status: Pending  

Implementation:
- Extend the `tasks` table via a new migration in `db/migrations.sql` to add nullable JSON or TEXT columns for each element:
  - Option A (JSON per element, recommended for future flexibility):
    - `sfx_metadata JSON NULL`
    - `speech_metadata JSON NULL`
    - `thought_metadata JSON NULL`
    - With expected runtime shape like:

      ```ts
      type TaskBubbleMetadata = {
        text?: string;        // required to consider “on”
        position?: string;    // e.g., "top-right near Adam's head"
        style?: string;       // e.g., colors, line style, lettering
      };
      ```

  - Option B (simple TEXT fields) if needed:
    - `sfx_text`, `sfx_position`, `sfx_style`, etc.
- Update any Task TypeScript types in `server/src/tasks_service.ts` / `server/src/tasks_routes.ts` and the shared client Task types (`client/src/definitionMetadata.ts` or similar) to include these optional metadata fields.

Testing:
- Apply migrations to a dev DB and confirm:
  - `tasks` table now includes the new columns.
  - Existing tasks remain valid (new columns default to `NULL`).

Checkpoint:
- Schema and types support storing optional SFX/speech/thought metadata at the Task level; no behavior change yet.

---

### Step 2 — Wire Task APIs to read/write bubble/SFX metadata
Status: Pending  

Implementation:
- In `server/src/tasks_routes.ts`:
  - Update Task creation (`POST /api/projects/:projectId/tasks` and space-scoped equivalent) to optionally accept initial SFX/speech/thought metadata in the request body (or default them to `null` when omitted).
  - Add/extend a Task update endpoint (e.g., `PATCH /api/tasks/:taskId`) to allow updating just these metadata fields without altering other Task properties.
  - Ensure these fields are included in Task responses for both:
    - Task list endpoints (`GET /api/projects/:projectId/tasks`, `GET /api/spaces/:spaceId/tasks`).
    - Single Task fetch (if available).
- Normalize JSON shapes so the client always sees predictable structures, for example:

  ```ts
  type TaskBubbleMetadataWire = {
    text: string | null;
    position: string | null;
    style: string | null;
  } | null;
  ```

Testing:
- Hit Task APIs via curl / HTTP client:
  - Create a Task without bubble metadata → responses show `null`/empty values.
  - Update only SFX metadata → ensure DB reflects changes and responses round-trip correctly.

Checkpoint:
- Task APIs cleanly expose and accept bubble/SFX metadata, without impacting existing Task flows.

---

### Step 3 — Introduce shared templates for default SFX / speech / thought styles
Status: Pending  

Implementation:
- Add a shared config module under `shared/`, e.g. `shared/promptElementsConfig.ts`, exporting default templates for each element:

  ```ts
  export const sfxTemplate = `...`;
  export const speechBubbleTemplate = `...`;
  export const thoughtBubbleTemplate = `...`;
  ```

  - SFX template should include specific design guidance: background colors, letter colors, outline style, motion lines, etc.
  - Speech/thought templates should describe typical bubble style (tail shape, line style, fill color, placement guidance).
- Ensure this module is consumable from both:
  - Frontend (`client`) via Vite/TypeScript.
  - Backend (`server`) if we later want server-side defaults or prompt enrichment.

Testing:
- Import the templates into a small dev harness (or log from server under `DEBUG_PROMPT`) to confirm:
  - Bundling works.
  - Strings look as intended for first-use defaults.

Checkpoint:
- A single shared source of default SFX/speech/thought descriptions exists and can be used to prefill UI textareas.

---

### Step 4 — Update prompt rendering to include bubbles/SFX in `TEXT ELEMENTS`
Status: Pending  

Implementation:
- In `server/src/prompt_renderer.ts`, update the `TEXT ELEMENTS` section logic (currently a static `- No speech or thought bubbles.`) to:
  - Accept SFX/speech/thought metadata as part of the render options (passed in from the Task render flow).
  - When **all** metadata fields are empty/null, produce the current default line:

    ```text
    TEXT ELEMENTS
    - No speech or thought bubbles.
    ```

  - When any element is present:
    - Render a structured list, for example:

      ```text
      TEXT ELEMENTS
      - SFX: "BAM!" — Position: top-left near Adam — Style: bright yellow letters with thick black outline...
      - Speech bubble: "I have an idea..." — Position: near Eve — Style: white bubble with black outline...
      - Thought bubble: "What if...?" — Position: above Adam's head — Style: cloud-like bubble with dotted tail...
      ```

    - Omit lines for elements whose `text` is empty; “on/off” is inferred from text presence.
- Update the Task render flow in `server/src/tasks_routes.ts` to pass these metadata fields into the prompt renderer when building the final prompt for a render.

Testing:
- With `DEBUG_PROMPT=1`, trigger renders with different combinations:
  - No bubbles set → prompt still shows “No speech or thought bubbles.”
  - Only SFX set → TEXT ELEMENTS lists SFX only.
  - SFX + speech + thought set → all three appear with text, position, and style descriptions.

Checkpoint:
- Bubbles/SFX metadata reliably translates into human-readable instructions under `TEXT ELEMENTS` in the prompt, with backward-compatible behavior when nothing is set.

---

### Step 5 — Add Task UI buttons and modals for SFX / speech / thought
Status: Pending  

Implementation:
- In `client/src/App.tsx` (and/or extracted Task view component under `client/src/views`):
  - Extend the Task detail UI to show three buttons:
    - `SFX`
    - `Thought`
    - `Speech`
  - Visual behavior:
    - Default state: off/blue when the corresponding `text` field is empty or null.
    - On state: green when the corresponding `text` field is non-empty (metadata present).
- On click for each button:
  - Open a modal overlay with:
    - A textarea bound to the relevant metadata `text` (or combined content) field.
    - Optional small helper text explaining what to include (especially for positions).
  - On first open when the metadata `text` is empty:
    - Prefill the textarea with the appropriate template (from `shared/promptElementsConfig`), giving initial style guidance (e.g., SFX colors, lettering style).
  - On save:
    - Persist the updated metadata via the Task update endpoint (Step 2).
    - Update local Task state so the button color reflects the new on/off status.
  - Closing behavior:
    - “Save” applies changes and closes the modal.
    - “Cancel” closes without persisting changes.
  - To disable/clear an element:
    - Users can delete all text before saving; the button should revert to off/blue after the save.

Testing:
- Manual UI tests:
  - Open each modal on a Task with no existing metadata:
    - Verify template text is inserted on first open.
    - Modify and save → verify button turns green and subsequent opens show saved text.
  - Clear text and save → button returns to blue and prompt falls back to “No speech or thought bubbles” when all are empty.
  - Confirm multiple renders of the same Task pick up changes without page reload.

Checkpoint:
- Users can toggle and edit SFX/speech/thought instructions per Task via intuitive buttons and modals; state persists across reloads and feeds into prompt rendering.

---

### Step 6 — End-to-end validation and refinements
Status: Pending  

Implementation:
- With the full flow wired (DB + API + prompt renderer + UI):
  - Create a Task, set SFX + speech + thought bubble text and style descriptions via the UI, and trigger multiple renders.
  - Examine:
    - Task JSON from the API to confirm metadata is stored as expected.
    - `DEBUG_PROMPT` logs and `server/debug/gemini-request-*.json` files to ensure:
      - The `TEXT ELEMENTS` section includes the right instructions.
      - No sensitive data or excessive verbosity is introduced.
  - Tweak template wording for SFX (background/letter colors, outline, motion lines, etc.) based on early results to produce clearer, more consistent outputs.
- Update any relevant docs:
  - `README.md` or a dedicated UX doc to explain the new buttons and how they affect renders.

Testing:
- Run backend build (`npm run build` in `server`) and frontend build (`npm run build` in `client`) to catch TypeScript or bundling issues.
- Perform a small set of cross-browser checks (where feasible) to ensure modals and button states behave consistently.

Checkpoint:
- The SFX / speech / thought bubble controls are fully integrated, well-documented, and stable across multiple renders and task edits.

