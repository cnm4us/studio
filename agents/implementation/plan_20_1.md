# Implementation Plan 20_1: Inline Image Mode for Gemini (Using Space Assets)

## 1. Overview

Goal: Extend the render pipeline so that, whenever a task has one or more Space asset references (via `*_image_ids`), we send those images as **inline image parts** to Gemini alongside our existing text prompt. This will:
- Keep the current text-only behavior as the default when no references exist.
- Enable a new “image-augmented” mode where:
  - The **prompt text format remains exactly as today** (IMAGE REFERENCES, STYLE, CHARACTERS, SCENE, TASK, TEXT ELEMENTS).
  - The referenced images are also provided as `inlineData` parts (base64 encoded) so the model can actually “see” them.
- Add minimal, non-sensitive logging so we can trace which assets were inlined for each render, without logging base64.

Out of scope for this plan (deferred to later 20_x plans):
- Adding the new **Reference Constraint** definition type.
- Changing task UIs to explicitly distinguish “photo→illustration” workflows.
- Advanced policy/tuning for how strongly the model should obey constraints (that will be driven via text + Reference Constraint definitions).

Anchors:
- Current prompt engine:
  - `server/src/prompt_renderer.ts`
  - `agents/implementation/plan_15.md`
- Asset metadata and references:
  - `shared/definition_config/assetReferenceMapping.ts`
  - `server/src/asset_reference_helpers.ts`
  - `server/src/space_assets_service.ts`
  - `server/src/space_assets_routes.ts`
  - `db/` — `space_assets` table (from Plan 19_1)
- Task render path:
  - `server/src/tasks_routes.ts` (render handler)
  - `server/src/gemini_client.ts` (Gemini client + DEBUG_PROMPT logging)
- S3 access:
  - `server/src/s3_client.ts`

---

## 2. Step-by-Step Plan

### Step 1 — Confirm Gemini client path for inline images
**Status: Pending**

Implementation:
- Verify the version of `@google/generative-ai` we are using (`server/package.json`) supports `generateContent` with mixed text + inline image parts.
- Document the intended call shape in `gemini_client.ts`, e.g.:

  ```ts
  const parts = [
    { text: finalPrompt },
    { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
    // ...
  ];

  const result = await model.generateContent(parts);
  ```

- Decide on how we will expose this in code:
  - Either:
    - Add a new function `renderImageWithGeminiParts(parts: Array<{ text: string } | { inlineData: ... }>)`.
  - Or:
    - Extend `renderImageWithGemini(prompt)` into `renderImageWithGemini(options: { prompt: string; images?: InlineImage[] })`.
  - Prefer a **single entry point** with an options object to avoid duplicating logic and configuration.

Testing:
- Add a small internal sanity harness or comment in `gemini_client.ts` that clarifies intended usage, but don’t call Gemini yet until later steps wire this in.

Checkpoint:
- We have a clear, documented way to call Gemini with text + images using the existing client library.

---

### Step 2 — Add S3 image loading + base64 helper
**Status: Pending**

Implementation:
- Add a new helper module, e.g. `server/src/image_inline_helpers.ts`, that:
  - Imports `getS3Client` and S3 bucket config from `s3_client.ts`.
  - Exposes:

    ```ts
    export type InlineImageInput = {
      fileKey: string;
      mimeType: string;
    };

    export type InlineImagePart = {
      inlineData: { data: string; mimeType: string };
    };

    export async function loadInlineImageParts(
      inputs: InlineImageInput[],
    ): Promise<InlineImagePart[]> {
      // Fetch each object from S3, base64-encode, and wrap as inlineData
    }
    ```

  - For each `fileKey`:
    - Use S3 `GetObjectCommand` to fetch the image from the configured bucket.
    - Read the response stream into a `Buffer`.
    - Base64-encode: `buffer.toString('base64')`.
    - Return `{ inlineData: { data: base64String, mimeType } }`.
- Error handling:
  - If S3 is not configured (`getS3Client()` returns null), throw or return an empty list, and let the caller decide to fall back to text-only mode.
  - If a particular image fails to load, log it and skip that image, but allow others to proceed.

Performance considerations:
- For this plan, keep it simple:
  - Load all requested images sequentially or with a small concurrency limit.
  - A future plan can introduce caching or concurrency tuning if needed.

Testing:
- Manually test with 1–2 known `fileKey` values by calling `loadInlineImageParts` in a temporary script and logging the byte lengths and mime types (not the base64) to confirm correctness.

Checkpoint:
- We can reliably read space assets from S3 and turn them into `inlineData` parts ready for Gemini.

---

### Step 3 — Decide when to use image-augmented vs text-only mode
**Status: Pending**

Implementation:
- In `server/src/tasks_routes.ts` render handler (where we already compute `resolvedImageRefs` for the IMAGE REFERENCES section):
  - After building `resolvedImageRefs`, compute:

    ```ts
    const hasInlineImages = resolvedImageRefs.length > 0;
    ```

  - Define two code paths conceptually:
    - **Text-only mode**:
      - `hasInlineImages === false`.
      - Build `finalPrompt` exactly as today and call `renderImageWithGemini({ prompt: finalPrompt })`.
    - **Image-augmented mode**:
      - `hasInlineImages === true`.
      - Continue to build `finalPrompt` in the same way (including IMAGE REFERENCES and all sections).
      - Additionally derive the set of `InlineImageInput`s from `resolvedImageRefs` and `space_assets`:
        - Use `file_key` + mime type (from `space_assets.metadata.mimeType` or a default like `image/jpeg`).
      - This list will be passed to `loadInlineImageParts` in the next step.
- Keep a simple rule:
  - If something fails in the image path (S3 not configured, image load fails, etc.), gracefully fall back to **text-only mode** and log a warning with enough context to debug.

Testing:
- Temporarily log a message like:

  ```ts
  console.log('[ai] Using image-augmented mode with', resolvedImageRefs.length, 'references');
  ```

  and verify it only appears when references exist.

Checkpoint:
- The render handler has a clear, explicit branch between text-only and image-augmented rendering, based solely on `resolvedImageRefs`.

---

### Step 4 — Wire inline images into the Gemini call and add audit logging
**Status: Pending**

Implementation:
- Extend `renderImageWithGemini` in `server/src/gemini_client.ts`:
  - Change signature to something like:

    ```ts
    export type GeminiRenderOptions = {
      prompt: string;
      inlineImages?: { data: string; mimeType: string }[];
    };

    export const renderImageWithGemini = async (
      options: GeminiRenderOptions | string,
    ) => { /* normalize and call generateContent */ }
    ```

  - Internally:
    - Normalize `options` to `{ prompt, inlineImages }`.
    - If `inlineImages` is empty or undefined:
      - Call `model.generateContent(prompt)` as today.
    - If `inlineImages` has entries:
      - Build `parts = [{ text: prompt }, ...inlineImages.map(...)]`.
      - Call `model.generateContent(parts)`.
  - Keep existing DEBUG_PROMPT logging, but do **not** log base64:
    - Log the prompt as today.
    - If `inlineImages` exist, log a short line:

      ```ts
      console.log(
        `[ai] Gemini inline images: count=${inlineImages.length}`,
      );
      ```

- In `tasks_routes.ts`:
  - For image-augmented mode:
    - Use `loadInlineImageParts` to turn `InlineImageInput[]` into `InlineImagePart[]`.
    - Pass the `inlineData` objects (without keys/names) to `renderImageWithGemini`.
  - Add **asset-level audit logging** (without base64), something like:

    ```ts
    if (resolvedImageRefs.length > 0) {
      console.log('[ai] Inline image refs for task', task.id);
      for (const ref of resolvedImageRefs) {
        console.log(
          `  - ${ref.scope}/${ref.assetType}: definition="${ref.definitionName}", assetName="${ref.assetName}"`,
        );
      }
    }
    ```

  - This satisfies the requirement to trace which assets were inlined into a render without exposing raw image data.

Testing:
- Trigger a render with:
  - No references → confirm we hit the text-only path and no `[ai] Inline image refs` log appears.
  - One or more references → confirm:
    - `[ai] Inline image refs for task ...` logs with asset names/types.
    - `[ai] Gemini inline images: count=...` logs.
    - DEBUG_PROMPT still prints the full text prompt (with the IMAGE REFERENCES section referencing those assets by name).

Checkpoint:
- Gemini is actually receiving both the text prompt and inline images for tasks with references, and we have audit logs showing which assets were used.

---

### Step 5 — Guardrails and graceful degradation
**Status: Pending**

Implementation:
- Introduce a simple global limit on the number of inline images per render, e.g.:
  - At most **N images total** (e.g., 6–8).
  - Optionally, per-scope caps (e.g., max 3 character, 3 scene/style).
  - Implement by truncating the `InlineImageInput[]` before calling `loadInlineImageParts`.
- Error handling:
  - If S3 client is not configured or any unexpected error happens during image loading:
    - Log a warning with the task id and asset ids.
    - Proceed with the **text-only path**, still including IMAGE REFERENCES in the text but without inline images.
  - If the Gemini call fails (existing behavior), do not change the error codes; this plan should not alter API error semantics.
- Avoid leaking sensitive info:
  - Ensure logs never include base64 strings.
  - Logs should only include asset ids, names, types, and file keys.

Testing:
- Create a task with many references across character/scene/style:
  - Confirm we cap the number of inline images as expected.
  - Confirm no crash occurs even if some assets cannot be read.

Checkpoint:
- The system behaves robustly in the presence or absence of S3, assets, or Gemini issues, and degrades cleanly back to the existing text-only behavior when needed.

---

## 3. Progress Tracking

- Step 1 — Confirm Gemini client path for inline images: Pending  
- Step 2 — Add S3 image loading + base64 helper: Pending  
- Step 3 — Decide when to use image-augmented vs text-only mode: Pending  
- Step 4 — Wire inline images into the Gemini call and add audit logging: Pending  
- Step 5 — Guardrails and graceful degradation: Pending  

Once Plan 20_1 is complete, any task that has attached reference images via Space assets will run in an **image-augmented** mode: Gemini will receive both the structured text prompt and actual inline image data, while tasks without references will continue to use the existing text-only mode without any behavioral change. Logging will make it clear, per task, which assets were inlined and how many images were sent, without exposing raw base64 blobs. 

