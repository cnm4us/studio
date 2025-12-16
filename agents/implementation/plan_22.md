# Implementation Plan 22: Migrate Gemini SDK to `@google/genai` and Enable ImageConfig

## 1. Overview

Goal: Migrate the server’s Gemini integration from `@google/generative-ai` to the newer `@google/genai` SDK and start sending image generation settings via `config.imageConfig` so that task-level aspect ratio (from Plan 21) becomes a real model-level parameter, while preserving the existing `renderImageWithGemini` API and debug tooling.

In scope:
- Server-side dependency and configuration changes to use `@google/genai`.
- Refactors in `server/src/gemini_client.ts` to:
  - Initialize the new client.
  - Construct `models.generateContent` requests with `config.imageConfig.aspectRatio` and `imageSize`.
  - Parse image responses into the existing `{ mimeType, data: Buffer }` shape.
- Adjusting Gemini debug logging/stubs to mirror the new request envelope.
- Validating that existing call sites (primarily `taskRenderRouter`) continue to work unchanged.

Out of scope:
- Any UI changes beyond what Plan 21 already covers.
- New Gemini features (streaming, tools, multi-turn chat).
- Introducing additional task-level knobs (e.g., separate resolution control) beyond a simple mapping from aspect ratio to `imageSize`.

Anchors:
- Gemini client and debug logging:
  - `server/src/gemini_client.ts`
- Task render flow and aspect ratio wiring:
  - `server/src/tasks_routes.ts`
  - `agents/implementation/plan_21.md`
- Server build and dependencies:
  - `server/package.json`

---

## 2. Step-by-Step Plan

### Step 1 — Add `@google/genai` dependency and verify basic build
Status: Completed  

Implementation:
- In `server/package.json`:
  - Add `@google/genai` to `dependencies` (keeping `@google/generative-ai` temporarily).
- Install dependencies in the `server` package.
- Run a TypeScript build to ensure the project still compiles cleanly before any code changes to the Gemini client.

Testing:
- `npm run build` in `server` completes successfully.
- `npm run dev` still starts and serves existing APIs (Gemini calls still use the legacy SDK at this point).

Checkpoint:
- The new SDK is available in the project without changing runtime behavior yet.

---

### Step 2 — Switch Gemini client initialization to use `@google/genai`
Status: Completed  

Implementation:
- In `server/src/gemini_client.ts`:
  - Replace the import of `GoogleGenerativeAI` from `@google/generative-ai` with the appropriate client from `@google/genai` (e.g., `GoogleGenAI`).
  - Update `geminiClient` and `getGeminiClient` to construct the new client, following the official `@google/genai` Node examples, e.g.:

    ```ts
    const client = new GoogleGenAI({ apiKey: cfg.apiKey });
    ```

  - Update `renderImageWithGemini` to call the new client’s `models.generateContent` entry point instead of `client.getGenerativeModel(...).generateContent(...)`, while:
    - Keeping the `GeminiRenderOptions` type and function signature unchanged.
    - Building `contents` with the same `{ role, parts }` structure currently used.
    - Extracting the first inline image from the response into `{ mimeType, data: Buffer }` using the shapes documented for `@google/genai`.
- Keep all callers (notably `taskRenderRouter`) unchanged so that only the internal implementation of `renderImageWithGemini` switches SDKs.

Testing:
- With a valid Gemini API key configured, run `npm run dev` and trigger a simple render from the UI.
- Confirm:
  - An image is returned successfully.
  - The MIME type and binary data still match expectations.
  - No regressions in error handling (e.g., `GEMINI_NOT_CONFIGURED`, `GEMINI_NO_IMAGE_RETURNED`).

Checkpoint:
- The server now uses `@google/genai` for image generation, but behavior is still functionally equivalent to the previous SDK (no `config.imageConfig` yet).

---

### Step 3 — Attach `config.imageConfig.aspectRatio`/`imageSize` to `generateContent` calls
Status: Completed  

Implementation:
- In `server/src/gemini_client.ts`, within `renderImageWithGemini`:
  - Continue accepting `aspectRatio?: string | null` via `GeminiRenderOptions`.
  - Introduce a small helper to validate and normalize aspect ratios for the API:

    ```ts
    const normalizeAspectRatioForGemini = (
      aspectRatio: string | null | undefined,
    ): string | null => {
      const allowed = new Set(['1:1', '3:4', '4:3', '9:16', '16:9']);
      return aspectRatio && allowed.has(aspectRatio) ? aspectRatio : null;
    };
    ```

  - Add a helper to choose an `imageSize` for each supported aspect ratio using values recommended by the `@google/genai` docs (e.g., square vs. portrait vs. landscape presets):

    ```ts
    const pickImageSizeForAspectRatio = (aspectRatio: string | null): string | undefined => {
      switch (aspectRatio) {
        case '1:1':
          return '1024x1024';
        case '3:4':
          return '896x1152';
        case '4:3':
          return '1152x896';
        case '9:16':
          return '768x1344';
        case '16:9':
          return '1344x768';
        default:
          return undefined;
      }
    };
    ```

  - Before calling `models.generateContent`, compute:

    ```ts
    const normalizedAspectRatio = normalizeAspectRatioForGemini(aspectRatio);
    const imageSize = pickImageSizeForAspectRatio(normalizedAspectRatio);
    ```

  - Build the `config` object passed to `models.generateContent` so that:
    - `responseModalities` always requests `IMAGE` (and `TEXT` if desired).
    - When `normalizedAspectRatio` is non-null, include:

      ```ts
      config.imageConfig = {
        aspectRatio: normalizedAspectRatio,
        ...(imageSize ? { imageSize } : {}),
      };
      ```

- Ensure that when no valid aspect ratio is provided, `config.imageConfig` is omitted entirely to preserve current default behavior.

Testing:
- Enable `DEBUG_PROMPT=1` and trigger renders for each supported aspect ratio.
- Verify that:
  - Requests include `config.imageConfig.aspectRatio` with the task’s chosen value.
  - Requests include an `imageSize` that the API accepts (no 400 errors).
  - Renders still succeed when `aspectRatio` is unset or invalid (no `imageConfig` sent).

Checkpoint:
- `renderImageWithGemini` now sends a properly shaped `config.imageConfig` block to `@google/genai` whenever a valid task-level aspect ratio is present.

---

### Step 4 — Update Gemini debug stub to mirror the new request envelope
Status: Completed  

Implementation:
- In the `isPromptDebugEnabled()` block of `server/src/gemini_client.ts`:
  - Update the `stub` object that is written to `server/debug/gemini-request-*.json` to reflect the new `@google/genai` request shape:
    - Include `model`.
    - Include `contents` as built for the API call.
    - Include a `config` field with:
      - `responseModalities`.
      - `imageConfig.aspectRatio` and `imageConfig.imageSize` when applicable.
  - Remove the `debugAspectRatio` field; aspect ratio should now appear only under `config.imageConfig`.
- Ensure the stub file content exactly matches (or is a close representation of) the payload passed to `models.generateContent`.

Testing:
- With `DEBUG_PROMPT=1`, trigger:
  - A text-only render (no inline images).
  - A render with inline images and usage texts.
  - Renders with and without a task-level aspect ratio set.
- Inspect the generated debug JSON files to confirm that:
  - `config.imageConfig` is present only when a valid aspect ratio is set.
  - All parts and inlineData entries are represented correctly.

Checkpoint:
- Debug JSON accurately represents the real `@google/genai` request, making it easy to audit aspect ratio and image size behavior.

---

### Step 5 — Remove legacy `@google/generative-ai` dependency and update docs
Status: Completed  

Implementation:
- In `server/package.json` (and the lockfile), remove `@google/generative-ai` from dependencies after the new SDK path is fully validated.
- Search the repository for any remaining references to `@google/generative-ai`:
  - Update comments in `agents/implementation` plans (where appropriate) to refer to `@google/genai` and `config.imageConfig` rather than `generationConfig`.
  - Update `README.md` (Gemini section) to describe the integration as:
    - Using `@google/genai`.
    - Sending aspect ratio via `config.imageConfig.aspectRatio` (and an internal mapping to `imageSize`).

Testing:
- Run `npm run build` and `npm run dev` in `server`.
- Trigger a few renders to ensure functionality is unchanged after removing the legacy SDK.

Checkpoint:
- The project no longer depends on `@google/generative-ai`; documentation and comments reflect the new SDK and request configuration.

---

### Step 6 — Reconcile with Plan 21 and finalize aspect ratio behavior
Status: Completed  

Implementation:
- Revisit `agents/implementation/plan_21.md`:
  - Update any references that assumed `generationConfig.imageGenerationConfig.aspectRatio` so they match the actual `config.imageConfig.aspectRatio` behavior under `@google/genai`.
  - Confirm that task-level `aspect_ratio` (DB column) and the `aspectRatio` field in API payloads are still the single source of truth for the value passed into `config.imageConfig.aspectRatio`.
- Ensure `server/src/tasks_routes.ts`:
  - Continues to validate and normalize task aspect ratios using the same allowed set as `normalizeAspectRatioForGemini`.
  - Logs aspect ratio in a way that is consistent with the new debug stub and `@google/genai` request shape.

Testing:
- With `DEBUG_PROMPT=1`, perform an end-to-end test:
  - Create a task, set each supported aspect ratio in turn, and trigger renders.
  - Verify that:
    - The `tasks` table stores the chosen value in `aspect_ratio`.
    - The debug stub shows the same value under `config.imageConfig.aspectRatio`.
    - The model returns an image for each supported aspect ratio with no API validation errors.

Checkpoint:
- Plans 21 and 22 are aligned: task-level aspect ratio flows cleanly from DB → API → `renderImageWithGemini` → `config.imageConfig.aspectRatio` using the new `@google/genai` SDK.

---

## 3. Progress Tracking

- Step 1 — Add `@google/genai` dependency and verify basic build: Completed  
- Step 2 — Switch Gemini client initialization to use `@google/genai`: Completed  
- Step 3 — Attach `config.imageConfig.aspectRatio`/`imageSize` to `generateContent` calls: Completed  
- Step 4 — Update Gemini debug stub to mirror the new request envelope: Completed  
- Step 5 — Remove legacy `@google/generative-ai` dependency and update docs: Completed  
- Step 6 — Reconcile with Plan 21 and finalize aspect ratio behavior: Completed  
