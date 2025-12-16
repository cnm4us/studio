# Implementation Plan 23: Configurable Safety Settings for Gemini Image Renders

## 1. Overview

Goal: Add explicit, configurable safety settings to all Gemini image renders so we can centrally control how aggressively the API blocks unsafe content, using `.env` knobs for each harm category while keeping the existing `renderImageWithGemini` API and task flow unchanged.

In scope:
- Reading safety-related thresholds from environment variables.
- Building a `safetySettings: SafetySetting[]` array and passing it into `config.safetySettings` on all `@google/genai` `models.generateContent` calls used for image rendering.
- Sensible defaults when no environment variables are set (e.g., use Google’s recommended thresholds, or a conservative-but-not-overly-restrictive profile).
- Minimal documentation of the new knobs in the project README and/or `.env` examples.

Out of scope:
- Per-space or per-user safety profiles.
- UI for tweaking safety levels from the frontend.
- Changing safety behavior for non-image (pure text) models.

Anchors:
- Gemini client and config:
  - `server/src/gemini_client.ts`
  - `@google/genai` types: `GenerateContentConfig`, `SafetySetting`, `HarmCategory`, `HarmBlockThreshold`
- Existing render flow:
  - `server/src/tasks_routes.ts`
- Environment and docs:
  - `.env` / `.env.example` (if present)
  - `README.md` Gemini section

---

## 2. Step-by-Step Plan

### Step 1 — Decide safety knobs and environment variable schema  
Status: Pending  

Implementation:
- Define which harm categories we want to control explicitly for image renders, mapping directly to `HarmCategory`:
  - `HARM_CATEGORY_HARASSMENT`
  - `HARM_CATEGORY_HATE_SPEECH`
  - `HARM_CATEGORY_SEXUALLY_EXPLICIT`
  - `HARM_CATEGORY_DANGEROUS_CONTENT`
  - (Optionally) `HARM_CATEGORY_CIVIC_INTEGRITY` and image-specific categories if supported by the model.
- For each category, decide:
  - A corresponding `.env` variable name, e.g.:
    - `GEMINI_SAFETY_HARASSMENT`
    - `GEMINI_SAFETY_HATE_SPEECH`
    - `GEMINI_SAFETY_SEXUAL`
    - `GEMINI_SAFETY_DANGEROUS`
  - Supported values, tied to `HarmBlockThreshold`:
    - `BLOCK_LOW_AND_ABOVE`
    - `BLOCK_MEDIUM_AND_ABOVE`
    - `BLOCK_ONLY_HIGH`
    - `BLOCK_NONE`
    - `OFF`
  - A default if the variable is unset (e.g., `BLOCK_MEDIUM_AND_ABOVE` for most categories, `BLOCK_ONLY_HIGH` for some if you want looser behavior).
- Document these decisions in comments at the top of the new helper code and in this plan step.

Testing:
- No code yet; this is a design checkpoint.

Checkpoint:
- Agreed list of safety categories, environment variable names, allowed values, and defaults.

---

### Step 2 — Implement a helper to read env and build `SafetySetting[]`  
Status: Pending  

Implementation:
- In `server/src/gemini_client.ts` (or a small adjacent helper module if it gets large), add:
  - A function to map an env string (e.g., `'BLOCK_MEDIUM_AND_ABOVE'`) to a `HarmBlockThreshold` enum value, with fallback to a safe default when invalid/unknown.
  - A function `getDefaultSafetySettingsFromEnv(): SafetySetting[]` that:
    - Reads the configured set of env vars (from Step 1).
    - Applies defaults when env vars are missing.
    - Returns an array of `SafetySetting` objects, one per category, with:

      ```ts
      {
        category: HarmCategory.HARM_CATEGORY_...,
        threshold: HarmBlockThreshold.BLOCK_...,
      }
      ```

    - Returns an empty array if you decide to “do nothing” when all env vars are blank (but note: this likely disables additional safety beyond defaults, so we should document it clearly).
- Ensure the helper is pure and does not mutate shared state; reading from `process.env` on each call is fine for now given low frequency of render requests.

Testing:
- Add a small, local dev harness or inline debug log (temporarily) to print out the generated `SafetySetting[]` when `DEBUG_PROMPT=1`.
- Manually set different combinations of env vars and confirm that the resulting thresholds match expectations.

Checkpoint:
- We can generate a consistent `SafetySetting[]` array from environment configuration.

---

### Step 3 — Wire safetySettings into `renderImageWithGemini` requests  
Status: Pending  

Implementation:
- In `server/src/gemini_client.ts`, inside `renderImageWithGemini`:
  - Call `getDefaultSafetySettingsFromEnv()` when constructing the `baseConfig` object that currently includes `imageConfig`.
  - If the returned array is non-empty, set `baseConfig.safetySettings = [...]`.
  - Ensure both code paths (text-only and image+text) pass `config: baseConfig` into `client.models.generateContent`:

    ```ts
    return client.models.generateContent({
      model: cfg.model,
      contents,
      config: Object.keys(baseConfig).length > 0 ? baseConfig : undefined,
    });
    ```

  - Keep safety settings independent of aspect ratio; the env knobs should apply uniformly to all renders.
- Confirm we don’t touch any other call sites (e.g., future text-only models) until we explicitly decide to; plan scope is image renders driven by `renderImageWithGemini`.

Testing:
- With `DEBUG_PROMPT=1`, trigger a render and inspect the `server/debug/gemini-request-*.json` stub to verify:
  - `config.safetySettings` is present with the expected categories and thresholds.
  - When env vars are unset, the stub reflects default thresholds as designed in Step 1.

Checkpoint:
- Every Gemini image render now includes deterministic, configurable safety settings in its request config.

---

### Step 4 — Add `.env` knobs and documentation  
Status: Pending  

Implementation:
- Update the server’s `.env.example` (or create one similar) to include commented entries such as:

  ```env
  # Gemini safety thresholds (optional; defaults applied when unset)
  # Allowed values: BLOCK_LOW_AND_ABOVE, BLOCK_MEDIUM_AND_ABOVE, BLOCK_ONLY_HIGH, BLOCK_NONE, OFF
  GEMINI_SAFETY_HARASSMENT=BLOCK_MEDIUM_AND_ABOVE
  GEMINI_SAFETY_HATE_SPEECH=BLOCK_MEDIUM_AND_ABOVE
  GEMINI_SAFETY_SEXUAL=BLOCK_MEDIUM_AND_ABOVE
  GEMINI_SAFETY_DANGEROUS=BLOCK_MEDIUM_AND_ABOVE
  ```

- In `README.md` (Gemini section), add a short subsection describing:
  - What these env vars do.
  - That they map directly to Google’s `HarmBlockThreshold` values.
  - That changing them requires a server restart to take effect.
- Optionally, mention the interaction with default model safety: these knobs layer on top of or override the API’s default thresholds.

Testing:
- After editing `.env`, restart the server and confirm via debug stub that changed env values produce updated `safetySettings` in requests.

Checkpoint:
- Operators can understand and configure safety behavior without reading code.

---

### Step 5 — Sanity test with real renders and adjust defaults if needed  
Status: Pending  

Implementation:
- With a valid API key and image model configured:
  - Set env vars to the planned defaults (Step 1) and restart the server.
  - Run through a few representative prompts (including ones that might hit borderline content) to ensure:
    - The model still returns useful images for normal use cases.
    - Obvious unsafe prompts are blocked or heavily constrained, as desired.
  - If behavior feels too strict or too lenient, adjust the default thresholds in the code and `.env` example, keeping the plan’s chosen env names intact.

Testing:
- Use `DEBUG_PROMPT=1` and logs to:
  - Confirm `config.safetySettings` matches your env configuration.
  - Watch for any API errors related to safety configuration.

Checkpoint:
- Safety defaults are tuned to a sensible baseline for your use case, with a straightforward path to further adjustments via `.env`.

---

## 3. Progress Tracking Notes

- Step 1 — Decide safety knobs and environment variable schema: Pending  
- Step 2 — Implement helper to read env and build `SafetySetting[]`: Pending  
- Step 3 — Wire safetySettings into `renderImageWithGemini` requests: Pending  
- Step 4 — Add `.env` knobs and documentation: Pending  
- Step 5 — Sanity test with real renders and adjust defaults if needed: Pending  

