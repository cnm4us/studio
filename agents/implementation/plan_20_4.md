# Implementation Plan 20_4: Prompt Budgeting & Automatic Reference Image Resizing

## 1. Overview

Goal: Make the image-augmented render pipeline **size-aware and robust** by:
- Tracking the approximate total payload size for each Gemini request (text + inline images).
- Automatically **downscaling reference images** to a safe resolution and quality before encoding/base64.
- Enforcing a small set of clear limits so we don’t accidentally send enormous prompts or images.

This plan does **not** change user-visible workflows (Spaces, tasks, etc). Instead it makes the existing inline-image mode (Plan 20_1) safer and more predictable, especially for non-expert users who upload large reference images.

Anchors:
- Inline image pipeline:
  - `server/src/image_inline_helpers.ts`
  - `server/src/gemini_client.ts`
  - `server/src/tasks_routes.ts`
- Space assets & S3:
  - `server/src/s3_client.ts`
  - `server/src/space_assets_service.ts`
  - `server/src/space_assets_routes.ts`
- Prompt engine & logging:
  - `server/src/prompt_renderer.ts`
  - `server/src/gemini_client.ts` (DEBUG_PROMPT)
  - `agents/tests/` (prompt snapshots)

---

## 2. Step-by-Step Plan

### Step 1 — Add payload size instrumentation (text + inline images)
**Status: Pending**

Implementation:
- In `server/src/tasks_routes.ts`, near the final render call:
  - Compute approximate byte lengths:

    ```ts
    const textBytes = Buffer.byteLength(finalPrompt, 'utf8');
    const imageBase64Bytes = inlineImages.reduce(
      (sum, img) => sum + Buffer.byteLength(img.data, 'utf8'),
      0,
    );
    const totalBytes = textBytes + imageBase64Bytes;
    ```

  - This is an *approximation* of request size, but good enough to guard against obviously large requests.
- Logging:
  - When `DEBUG_PROMPT` is enabled (checked via `isPromptDebugEnabled()`), log a concise line:

    ```ts
    console.log(
      `[ai] Gemini payload size for task ${task.id}: ` +
        `text=${textBytes} bytes, inlineImages=${imageBase64Bytes} bytes, total=${totalBytes}`,
    );
    ```

  - This is debug-only and does not affect behavior.

Testing:
- Trigger renders with and without inline images:
  - Confirm that when `DEBUG_PROMPT=1`, the size log appears alongside the prompt.
  - Validate that numbers look reasonable (text-only vs. text + one small image).

Checkpoint:
- We can see real-world payload sizes in logs without changing request behavior.

---

### Step 2 — Define and enforce conservative payload size limits
**Status: Pending**

Implementation:
- Establish conservative thresholds as constants in `tasks_routes.ts`:

  ```ts
  const MAX_GEMINI_PAYLOAD_BYTES_SOFT = 200_000; // ~200 KB
  const MAX_GEMINI_PAYLOAD_BYTES_HARD = 500_000; // ~500 KB
  ```

  (Exact numbers can be tuned, but we want “obviously safe” well below model limits.)
- After computing `textBytes`, `imageBase64Bytes`, `totalBytes`:
  - If `totalBytes <= MAX_GEMINI_PAYLOAD_BYTES_SOFT`:
    - Proceed as normal.
  - If `totalBytes > MAX_GEMINI_PAYLOAD_BYTES_SOFT` but `< MAX_GEMINI_PAYLOAD_BYTES_HARD`:
    - Log a warning:

      ```ts
      console.warn(
        `[ai] Gemini payload for task ${task.id} exceeds soft budget: total=${totalBytes} bytes`,
      );
      ```

    - Optionally mark this in in-memory metrics (future).
  - If `totalBytes >= MAX_GEMINI_PAYLOAD_BYTES_HARD`:
    - Apply mitigation *before* calling Gemini:
      - First, try to reduce inline images (Step 3).
      - If after reduction we still exceed the hard limit:
        - Fall back to **text-only** mode:
          - Log a clear message:

            ```ts
            console.warn(
              `[ai] Gemini payload for task ${task.id} exceeds hard budget; ` +
                `falling back to text-only (total=${totalBytes} bytes).`,
            );
            ```

          - Call `renderImageWithGemini({ prompt: finalPrompt })` with no images.

Testing:
- Simulate large payloads by:
  - Using multiple large reference images.
  - Confirm that the logs reflect whether we’re within soft/hard limits.
  - Confirm fallback to text-only happens when over the hard limit.

Checkpoint:
- There is a clear, bounded envelope for request sizes and a safe fallback path.

---

### Step 3 — Integrate automatic image resizing with `sharp`
**Status: Pending**

Implementation:
- Choose library: use `sharp` for efficient, in-process image processing.
  - Add to `server/package.json`:

    ```json
    "dependencies": {
      "sharp": "^0.33.0",
      ...
    }
    ```

  - `npm install` in `server/`.
- Resizing strategy:
  - Define safe defaults:
    - `MAX_REF_IMAGE_SIZE_PX = 1024` (longest edge).
    - `REF_IMAGE_JPEG_QUALITY = 85`.
  - In `image_inline_helpers.ts`, before base64 encoding:
    - Use `sharp` to downscale as needed:

      ```ts
      import sharp from 'sharp';

      const processed = await sharp(buffer)
        .resize({
          width: MAX_REF_IMAGE_SIZE_PX,
          height: MAX_REF_IMAGE_SIZE_PX,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: REF_IMAGE_JPEG_QUALITY })
        .toBuffer();
      ```

    - Use `processed` instead of the raw `buffer` to produce base64.
    - For non-JPEG uploads (PNG, etc.), we still convert to JPEG for inline use; this keeps sizes consistent.
- Important: do **not** modify or overwrite the original S3 object in this plan:
  - This resizing is done *on the fly* for inline use.
  - The original asset (potentially higher-res) remains in S3 for other purposes (e.g., user download or future tooling).

Testing:
- Use a large reference image (e.g., 3000+ px).
  - Verify via logs that:
    - The original S3 object is fetched.
    - The base64 length is significantly smaller than encoding the raw full-size image.
  - Optionally dump a temporary size log inside `image_inline_helpers.ts` under DEBUG:

    ```ts
    console.log(
      `[s3] Inline image processed for key=${input.fileKey}: ` +
        `originalBytes=${buffer.length}, processedBytes=${processed.length}`,
    );
    ```

Checkpoint:
- Reference images are automatically downscaled to a safe resolution before being inlined, without mutating source assets.

---

### Step 4 — Use resizing to reduce payload when over budget
**Status: Pending**

Implementation:
- Adjust the order of operations in `tasks_routes.ts`:
  1. Collect `InlineImageInput[]` (as today).
  2. Cap the number of images (`MAX_INLINE_IMAGES` from Plan 20_1).
  3. Load and **resize** images via `loadInlineImageParts` (which now uses `sharp`).
  4. Build `inlineImages` from the resized parts.
  5. Compute `textBytes`, `imageBase64Bytes`, `totalBytes`.
  6. Apply the soft/hard payload limits (Step 2).
- If we cross the soft limit:
  - Prefer to reduce images *before* falling back to text-only:
    - e.g., keep the first `K` highest-priority images (character_face > scene_reference > style_reference).
    - Recompute `imageBase64Bytes` and `totalBytes` after truncation.
    - Only fall back to text-only if still above the hard cap.
- Priority ordering:
  - When truncating inline images, use a simple priority:
    1. `character_face`
    2. `scene_reference`
    3. `character_body` / `character_full`
    4. `style_reference`
    5. Others (props, clothing) last
  - Implement with a static priority map in `tasks_routes.ts`.
- Logging:
  - When dropping inline images due to payload size:

    ```ts
    console.warn(
      `[ai] Dropping ${droppedCount} inline images for task ${task.id} ` +
        `to respect payload budget.`,
    );
    ```

Testing:
- Construct a worst-case scenario: many large reference images across character/scene/style.
  - Confirm that:
    - Images are resized.
    - High-priority types are retained preferentially.
    - The system falls back to text-only only when necessary.

Checkpoint:
- Payload sizing and image resizing work together to stay within limits while preserving the most important references.

---

### Step 5 — Optional: UI and documentation hints about image sizes
**Status: Pending**

Implementation (optional but recommended):
- In `client/src/views/SpaceAssetsView.tsx`:
  - Add a short helper text near the upload form, e.g.:

    > Reference images are automatically resized for prompts. For best results, upload clear images with the subject centered; extreme resolutions are not required.

  - This sets expectations without requiring users to manage DPI/resolution themselves.
- Documentation:
  - In `agents/roadmap_v2.md` or a new `docs/` entry, briefly document:
    - That Studio auto-resizes reference images for prompt use.
    - Rough internal limits (e.g., “max 1024px on longest edge, JPEG quality ~85”).
    - The rationale (model limits, latency, consistency).

Testing:
- Visual check of Space Assets UI text.

Checkpoint:
- Users have a basic understanding of how Studio treats reference image sizes, and the system is robust even if they upload very large original images.

---

## 3. Progress Tracking

- Step 1 — Add payload size instrumentation (text + inline images): Pending  
- Step 2 — Define and enforce conservative payload size limits: Pending  
- Step 3 — Integrate automatic image resizing with `sharp`: Pending  
- Step 4 — Use resizing to reduce payload when over budget: Pending  
- Step 5 — Optional: UI and documentation hints about image sizes: Pending  

Once Plan 20_4 is complete, the inline-image pipeline will have clear budgets and automatic resizing: large user uploads will be normalized into prompt-friendly images, Gemini requests will stay within a safe size envelope, and logs will give you visibility into both payload size and any mitigations (image drops or text-only fallbacks) that were applied for a given render. 

