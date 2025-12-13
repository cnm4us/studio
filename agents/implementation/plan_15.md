# Implementation Plan 15: Prompt Rendering Engine (Characters, Style, Scene, Task)

## 1. Overview

Goal: Replace the current ad-hoc prompt construction with a **Prompt Rendering Engine** that:
- Follows the contract in `agents/prompt_rendering/README.md`.
- Renders Character, Style, Scene, and Task information as a structured director’s brief, not JSON dumps.
- Uses **section headers, category headings, and bullet lists**, with human-readable values.
- Is **config-driven**, so adding/editing/deleting categories and properties in the `config/*` files automatically flows into the rendered prompt after a rebuild (no renderer code changes required for new categories/properties).

Scope for this plan:
- Implement the renderer on the **server**.
- Wire it into the task render pipeline for single-style, single-scene, and one-or-more characters.
- Keep behavior compatible with the existing metadata schema (`CharacterAppearanceMetadata`, `StyleDefinitionMetadata`, `SceneDefinitionMetadata`).

Out of scope (future plans):
- Negative prompts.
- Speech/thought bubble text elements.
- Image reference sections.
- Multi-style or multi-scene blending.

Anchors:
- `agents/prompt_rendering/README.md` — normative renderer spec.
- `server/src/definition_metadata.ts` — metadata shapes.
- `server/src/tasks_routes.ts` — current prompt construction and render path.
- `client/src/config/*` — where enum/tag value→label mappings live.
- `client/src/config/characterAppearance/index.ts` — `characterAppearanceConfig`.
- `client/src/config/sceneDefinitions/index.ts` — `sceneDefinitionConfig`.
- `client/src/config/styleDefinitions/index.ts` — `styleDefinitionConfig`.

---

## 2. Step-by-Step Plan

### Step 1 — Introduce a dedicated Prompt Renderer module
**Status: Pending**

Implementation:
- Add `server/src/prompt_renderer.ts` exporting:
  - `renderPrompt(options: { taskPrompt: string; characters: Array<{ name: string; metadata: CharacterAppearanceMetadata | null }>; style: StyleDefinitionMetadata | null; scene: unknown | null; }): string;`
- Ensure `renderPrompt` enforces top-level section order from the spec:
  1. IMAGE REFERENCES (placeholder/empty for now)
  2. STYLE
  3. CHARACTERS
  4. SCENE
  5. TASK
  6. TEXT ELEMENTS (placeholder/empty for now)
- Start with simple, static section headers (e.g., `STYLE`, `CHARACTERS`, `SCENE`, `TASK`) and return a multi-line string.

Testing:
- Add a small local harness or unit-style function that calls `renderPrompt` with hard-coded in-memory metadata and logs the result to the console.

Checkpoint:
- We have a single entry point responsible for building the entire prompt string, independent of HTTP routing.

---

### Step 2 — Implement config-driven character block rendering with headings and bullets
**Status: Pending**

Implementation:
- In `prompt_renderer.ts`, add a helper:
  - `renderCharactersSection(characters: Array<{ name: string; metadata: CharacterAppearanceMetadata | null }>): string | ''`.
- Make the renderer **config-driven** by iterating over `characterAppearanceConfig.categories` in order (mirroring the UI form):
  - For each category in `characterAppearanceConfig.categories`:
    - Use `category.label` as the heading (e.g., “Core identity”, “Hair”).
    - Look up `characterMeta[category.key]`; if that category has no values, skip it.
    - For each `prop` in `category.properties`:
      - Read `categoryMeta[prop.key]`; if undefined, skip.
      - Use `prop.label` as the left side of the bullet (e.g., `- Body type: athletic`).
      - If `prop.options` is present, map stored `value` → `opt.label` (so `love_interest` renders as “Love interest”).
      - For `tags`/multi-select types, render comma-separated or bullet lists of labels.
- For each character:
  - Emit a header line like `CHARACTER — Jennifer`.
  - Use the config-driven loop above to render its categories and properties.
- Reuse/extend `collectStringValues` only for generic fallbacks; the primary path should be **field- and config-aware**, not generic flattening.

Testing:
- Feed a known `CharacterAppearanceMetadata` (like the one in `agents/tests/test_03.txt`) into `renderCharactersSection` and manually verify:
  - The name is only in the header, not repeated in core identity.
  - Categories appear in the expected order with sensible labels.
  - Values are rendered as readable phrases.

Checkpoint:
- Character prompts read like the “Sally” example in the user’s spec, not comma-separated value lists.

---

### Step 3 — Implement config-driven Style and Scene section renderers
**Status: Pending**

Implementation:
- Add helpers in `prompt_renderer.ts`:
  - `renderStyleSection(style: StyleDefinitionMetadata | null): string | ''`
  - `renderSceneSection(scene: unknown | null): string | ''` (use `SceneDefinitionMetadata` shape but keep typing flexible if needed).
- Style:
  - Iterate `styleDefinitionConfig.categories` in order.
  - For each category with values:
    - Use `category.label` as the heading.
    - For each property in `category.properties` with a value:
      - Use `prop.label` for the bullet label.
      - Map enum/tag values through `prop.options` to get human labels where available.
- Scene:
  - Iterate `sceneDefinitionConfig.categories` in order.
  - For each category with values:
    - Use `category.label` as the heading.
    - For each property in `category.properties` with a value:
      - Use `prop.label` for the bullet label.
      - Apply the same enum/tag humanization rules as for style.
- The renderer must **not** hardcode category/property keys for style or scene; adding a new category or property to the config should automatically appear in the rendered prompt once the app is rebuilt.

Testing:
- Use example metadata from `agents/tests/test_02.txt` / `test_03.txt` to verify that:
  - The style and scene sections contain headings + bullets.
  - The values correspond to the tokens in the DB, but presented in human-friendly form.

Checkpoint:
- Style and scene definitions render as structured sections consistent with the Prompt Rendering spec.

---

### Step 4 — Implement Task and placeholder Text/Image sections
**Status: Pending**

Implementation:
- In `renderPrompt`:
  - Implement a `renderTaskSection(taskPrompt: string): string` that:
    - Emits a `TASK` header.
    - Places the raw task prompt under it (optionally wrapped or prefixed with a bullet).
  - Add placeholder sections for:
    - `IMAGE REFERENCES` (empty for now).
    - `TEXT ELEMENTS` (speech/thought bubbles), with explicit wording like `No speech or thought bubbles.` if none are provided.
- Ensure the final prompt concatenates sections in the correct order with blank lines between major sections.

Testing:
- Render a prompt with all four: style, one character, one scene, and a task prompt.
- Confirm the layout matches the ordering and structure in `agents/prompt_rendering/example_no_images_no_dialogue.md` (modulo content differences).

Checkpoint:
- The renderer can produce a complete prompt with all major sections, even if some are empty/placeholders.

---

### Step 5 — Wire the Prompt Renderer into `tasks_routes.ts`
**Status: Pending**

Implementation:
- In `server/src/tasks_routes.ts` (render route):
  - Replace the current `promptParts` / `finalPrompt` construction with a call to `renderPrompt`.
  - Normalize `definitions.metadata` values using the existing `parseJsonIfString` helper so the renderer always receives objects, not strings.
  - Pass character, style, and scene metadata into `renderPrompt` in the correct shapes.
- Ensure we continue to store the full composed prompt into `rendered_assets.metadata.prompt` (or equivalent) for debugging.

Testing:
- Run through a full flow in Studio:
  - Create character, style, and scene definitions with rich metadata.
  - Attach them to a task and render.
  - Inspect the prompt logged to the terminal and in the DB metadata to confirm it matches the new structured format.

Checkpoint:
- All renders now use the Prompt Rendering Engine; the old ad-hoc prompt builder is fully removed.

---

### Step 6 — Validate against spec examples and refine phrasing
**Status: Pending**

Implementation:
- Compare renderer output with:
  - `agents/prompt_rendering/example_no_images_no_dialogue.md`
  - `agents/prompt_rendering/example_with_images_and_dialogue.md`
- Adjust:
  - Section headers and capitalization.
  - Category phrasing (e.g., `Core identity` vs `Identity`).
  - Bullet wording (e.g., `- Role in story: love interest` instead of `- Archetype: love_interest`).
- Ensure we do **not** reintroduce JSON/braces/brackets into the prompt body.

Testing:
- Capture 2–3 prompts from real tasks and sanity check that:
  - All key character/style/scene details are present.
  - There’s no leakage of internal schema keys or raw JSON.
  - The model outputs visually reflect core traits (e.g., age, gender, clothing, mood).

Checkpoint:
- The Prompt Rendering Engine produces prompts that clearly match the spec and user expectations.

---

## 3. Progress Tracking

- Step 1 — Prompt renderer module scaffold: Pending  
- Step 2 — Character block rendering (headings + bullets): Pending  
- Step 3 — Style & scene rendering sections: Pending  
- Step 4 — Task + placeholder sections (image refs, text elements): Pending  
- Step 5 — Wire into `tasks_routes` render endpoint: Pending  
- Step 6 — Validate against examples and refine phrasing: Pending  

Once Plan 15 is complete, the system will have a dedicated, spec-compliant Prompt Rendering Engine that converts JSON metadata into a rich, human-readable director’s brief, improving both model comprehension and debuggability.
