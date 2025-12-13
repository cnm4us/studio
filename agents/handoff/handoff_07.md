# Handoff 07 — Config-Driven Prompt Rendering & Shared Definition Config

## 7.1 Thread Summary
- Focus: Finish Plan 15 work on the prompt renderer and implement Plan 16 to make value→label rendering fully config-driven for Character, Scene, and Style definitions.
- Key idea: Use a shared TypeScript config module for definition categories/properties/options so both client (forms) and server (prompt renderer) share one source of truth.
- Context from previous handoffs: Character/Scene/Style forms already exist as dedicated views and are writing JSON metadata; prompt renderer existed but still relied on hardcoded mappings and token humanization.

## 7.2 Implementation Notes
- Shared definition config
  - Moved config modules from `client/src/config/{characterAppearance,sceneDefinitions,styleDefinitions}` into `shared/definition_config/*`.
  - Added thin re-export wrappers in:
    - `client/src/config/characterAppearance/index.ts`
    - `client/src/config/styleDefinitions/index.ts`
    - `client/src/config/sceneDefinitions/index.ts`
  - Added `shared/package.json` with `"type": "module"` so Node + TS treat shared modules as ESM.
  - Updated all imports inside `shared/definition_config/**` to use explicit `.js` extensions to satisfy `moduleResolution: "nodenext"`.

- Server build + entry adjustments
  - Updated `server/tsconfig.json`:
    - `"rootDir": ".."` and `"include": ["src", "../shared"]` so shared files are compiled alongside the server.
  - Updated `server/package.json` and README:
    - `main` + `start` now point to `dist/server/src/index.js`.
    - This matches the emitted structure from the updated TS config.

- Config helper layer
  - Added `server/src/definition_config_helpers.ts`:
    - `findCharacterCategory`, `findCharacterProperty`.
    - `findStyleCategory`, `findStyleProperty`.
    - `findSceneCategory`, `findSceneProperty`.
    - `resolveOptionLabel(options, value)` that reads labels from shared config options.

- Prompt renderer refactor
  - `server/src/prompt_renderer.ts`:
    - Now imports helper functions from `definition_config_helpers.ts`.
    - Removed all hardcoded clothing label maps and the generic `humanizeToken` logic.
    - Introduced `formatScalarValue` / `formatValue` that:
      - For strings with options: uses `resolveOptionLabel` to map stored value → label.
      - For strings without options: returns the raw text verbatim (no underscore munging).
      - For numbers/booleans: stringifies directly.
    - Character section:
      - Category headings now prefer `category.label` from shared config (`core_identity` → `Core Identity`, etc.).
      - Property bullets now use `prop.label` (e.g., "Body type", "Casual preference").
    - Style and Scene sections:
      - Same pattern: use config labels for category headings and property labels.
      - Values for enums/tags resolved via config; custom entries passed through unchanged.

- Builds / runtime
  - `npm run build` in `server` and `client` both succeed.
  - `npm run dev` in `server` now starts cleanly:
    - Confirms Node can import from `../../shared/definition_config/...` at runtime under ESM.
  - Existing prompt shape (sections for IMAGE REFERENCES, STYLE, CHARACTERS, SCENE, TASK, TEXT ELEMENTS) remains; only value labeling is now config-driven.

## 7.3 Open Questions / Deferred Tasks
- No negative prompt, text elements, or multi-style/scene blending yet — still future work per prompt-rendering spec.
- Scene and style sections currently enumerate all populated properties; there might be future UX adjustments to hide very low-signal fields or group them differently.
- We haven’t yet added automated tests for `prompt_renderer.ts` or `definition_config_helpers.ts`; behavior validated via builds + manual checks only.

## 7.4 Suggestions for Next Threadself
- Functional verification:
  - Edit a few labels in `shared/definition_config/characterAppearance/clothingDefaults.ts` (e.g., change `cocktail_dress` label) and confirm:
    - DB still stores the original value token.
    - Prompt output reflects the updated labels after rebuild/restart.
  - Repeat for style and scene options (e.g., camera/composition, mood/atmosphere).
- Prompt polish:
  - Revisit `agents/prompt_rendering/README.md` and align section headings/phrasing (capitalization, wording) with spec examples.
  - Consider special casing a few semantic groupings if needed (e.g., grouping personality tags onto separate lines) but keep it config-driven.
- Testing:
  - If the project starts to lean heavily on prompt rendering, consider adding a small suite of unit tests around `renderPrompt` with fixture metadata (especially after more plans land).
- Future config evolution:
  - When/if per-space or per-user config packs are introduced, reuse the shared-config pattern established here and keep `definition_config_helpers.ts` as the single lookup surface for the renderer.

