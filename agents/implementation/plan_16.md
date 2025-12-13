# Implementation Plan 16: Shared Config-Driven Labels for Prompt Rendering

## 1. Overview

Goal: Make the prompt renderer **fully config‑driven** for labels, so that:
- The database continues to store stable **value** tokens (e.g., `"cocktail_dress"`).
- The **labels** shown in prompts (e.g., `"Black spaghetti strap cocktail dress"`) always come from the config files under `src/config/*`.
- Adding/editing/removing categories, properties, or options in config automatically updates prompt wording after a rebuild, with **no changes to renderer code**.
- All temporary hardcoded value→label mappings and generic “token humanizers” are removed or reduced to minimal, safe fallbacks.

Scope for this plan:
- Introduce a **shared config layer** that both client and server can import from.
- Teach the server‑side prompt renderer to resolve `value` → `label` using that shared config for:
  - Character appearance metadata.
  - Style definition metadata.
  - Scene definition metadata.
- Preserve verbatim free‑text fields and custom entries.

Out of scope (future plans):
- Per‑user or per‑space overrideable config packs.
- Config editing UI.
- Advanced prompt phrasing beyond label substitution (e.g., sentence templates).

Anchors:
- Prompt renderer:
  - `server/src/prompt_renderer.ts`
  - `server/src/definition_metadata.ts`
- Task render flow:
  - `server/src/tasks_routes.ts`
- Client config (current source of truth for categories/options):
  - `client/src/config/characterAppearance/*`
  - `client/src/config/sceneDefinitions/*`
  - `client/src/config/styleDefinitions/*`
- Prompt spec:
  - `agents/prompt_rendering/README.md`

---

## 2. Step-by-Step Plan

### Step 1 — Introduce shared definition config modules
Status: Pending  

Implementation:
- Create a `shared/definition_config` (or similar) directory at the repo root that is buildable by both client and server TypeScript projects.
- Move the **type definitions** for config categories/options into shared modules, e.g.:
  - `shared/definition_config/characterAppearanceTypes.ts`
  - `shared/definition_config/sceneDefinitionTypes.ts`
  - `shared/definition_config/styleDefinitionTypes.ts`
- Move or factor the **actual config objects** (categories + properties + options) into shared modules, e.g.:
  - `shared/definition_config/characterAppearanceConfig.ts`
  - `shared/definition_config/sceneDefinitionConfig.ts`
  - `shared/definition_config/styleDefinitionConfig.ts`
- Update the client files under `client/src/config/*` to **re‑export** from the shared modules so existing imports keep working:
  - For example, `client/src/config/characterAppearance/index.ts` becomes a thin wrapper that re‑exports `characterAppearanceConfig` and related types from `shared/definition_config/characterAppearanceConfig`.
- Update `tsconfig` / build settings for both client and server so they can import from `shared/definition_config/*` without bundler or path issues.

Testing:
- `npm run build` in both `client` and `server`.
- Confirm the Studio UI still renders character/scene/style forms correctly after the move.

Checkpoint:
- There is a **single source of truth** for all definition configs, and both client and server can import it.

---

### Step 2 — Add server helpers for config-based label lookup
Status: Pending  

Implementation:
- In `server/src` (or a small helper module like `server/src/definition_config_helpers.ts`), import the shared config modules.
- Implement generic lookup helpers, for example:
  - `findCharacterProperty(categoryKey, propKey)` → returns the corresponding category + property descriptor (including `options`).
  - `findStyleProperty(categoryKey, propKey)` and `findSceneProperty(categoryKey, propKey)` with similar behavior.
  - `resolveOptionLabel(options, value)` →:
    - If an option exists where `option.value === value`, return `option.label`.
    - Otherwise return `null` (caller decides fallback).
- Ensure helpers are **order‑preserving** by using the config’s `categories` and `properties` arrays directly, so future changes in ordering are respected automatically.

Testing:
- Write a tiny dev harness (or inline test) that:
  - Looks up a few known tokens (`early_30s`, `she_her`, `cocktail_dress`, etc.).
  - Verifies the helpers find the correct labels from the shared config.

Checkpoint:
- The server has a clean, tested way to map `(categoryKey, propKey, value)` → `label` based solely on the shared config.

---

### Step 3 — Refactor prompt renderer to use config-driven labels
Status: Pending  

Implementation:
- In `server/src/prompt_renderer.ts`:
  - Update `formatValue` (and related helpers) to accept an additional argument or context that includes the resolved property descriptor (and its `options`).
  - For **enum** and **tags** fields where a property descriptor with `options` exists:
    - For each stored token:
      - Look up the option by `value`.
      - If found, use `option.label` in the prompt.
      - If not found (custom or stale value), fall back to the raw string **without extra token‑style munging**.
  - For **free‑text** fields (no `options`, or property type `string`):
    - Use the string verbatim (no “humanizer”).
  - For **numbers/booleans** (especially in scene metadata):
    - Continue to render with straightforward stringification (e.g., `50` → `"50"`).
- Replace the current per‑category `humanizeToken` behavior for option‑backed fields with config‑driven label resolution.
- For fields that truly have no config options (e.g., unstructured arrays written directly in metadata), retain a minimal fallback:
  - Convert underscores to spaces and capitalize first letter.
  - Do not add special‑case mappings beyond pronouns, unless those pronouns are also modeled as options in config.

Testing:
- Use an existing character (e.g., Jennifer) and verify:
  - Clothing, body type, archetype, etc. all use the **labels** from config.
  - Personality keywords and other tag lists are rendered with labels for known options and raw text for custom entries.
- Repeat for Style and Scene metadata using samples from `agents/tests/test_02.txt` / `test_03.txt`.

Checkpoint:
- Prompts now display all option‑driven fields using config labels, while preserving verbatim text for free‑form fields.

---

### Step 4 — Remove temporary mappings and excess token humanization
Status: Pending  

Implementation:
- Remove the temporary clothing label maps from `prompt_renderer.ts`:
  - `CLOTHING_CASUAL_PREFERENCE_LABELS`
  - `CLOTHING_COLOR_PALETTE_LABELS`
  - `CLOTHING_ACCESSORIES_LABELS`
- Simplify or remove `humanizeToken`:
  - Keep only the minimal behavior necessary for values that **lack** config options entirely.
  - Avoid special‑case mappings that duplicate config semantics.
- Confirm that pronouns and similar values are represented as options in config where appropriate; otherwise, handle them through a small, clearly documented fallback that does not fight future config changes.

Testing:
- Rebuild and re‑run the same example prompts:
  - Confirm nothing regresses when hardcoded maps are gone.
  - Confirm that changing a label in config immediately changes the rendered prompt after rebuild/restart.

Checkpoint:
- Renderer no longer relies on bespoke value→label tables; config is the only authoritative source for labels.

---

### Step 5 — Validate config-driven behavior with live edits
Status: Pending  

Implementation:
- Perform a series of “config only” edits to verify end‑to‑end behavior:
  - Change an existing option label (e.g., `cocktail_dress` → `"Blue jeans and biker boots"` in the clothing defaults config).
  - Add a new option to a category (e.g., a new body type or mood keyword).
  - Remove or rename an option and confirm how existing stored tokens behave.
- For each change:
  - Rebuild and restart client + server.
  - Create or edit a character/style/scene that uses the edited options.
  - Trigger a render and inspect the prompt (via DEBUG_PROMPT logging and DB metadata).

Testing:
- Confirm:
  - DB continues to store `value` tokens (e.g., `"cocktail_dress"`).
  - Prompts always reflect **current** labels from config.
  - Custom values (not present in options) appear verbatim and are not mangled.

Checkpoint:
- We have empirical proof that prompts are driven entirely by config and respond correctly to config‑only changes.

---

### Step 6 — Document shared config and future extension points
Status: Pending  

Implementation:
- Update `agents/prompt_rendering/README.md` (or a nearby doc) to describe:
  - The shared config location and structure.
  - How labels are resolved for enums and tags.
  - How free‑text and custom values are handled.
  - The expectation that DB always stores `value` tokens.
- Add a short note to `agents/implementation_planning.md` or `agents/architecture` describing:
  - How a future plan could introduce per‑user/space config packs or a config‑editing UI without changing the renderer contract.

Testing:
- Ensure documentation matches actual behavior after Steps 1–5.

Checkpoint:
- The architecture around config‑driven labels is clearly explained, making it easy to safely evolve categories, properties, and options over time.

---

## 3. Progress Tracking

- Step 1 — Shared definition config modules: Pending  
- Step 2 — Server helpers for config-based label lookup: Pending  
- Step 3 — Refactor prompt renderer to use config-driven labels: Pending  
- Step 4 — Remove temporary mappings and excess token humanization: Pending  
- Step 5 — Validate behavior with live config edits: Pending  
- Step 6 — Document shared config and extension points: Pending  

Once Plan 16 is complete, any changes to Character, Scene, or Style config (categories, properties, or option labels) will automatically flow into the prompt text after a rebuild, without needing to touch prompt renderer code or database schema.

