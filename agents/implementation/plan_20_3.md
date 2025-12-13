# Implementation Plan 20_3: Inline Image Limits, Constraint Tuning, and Prompt Refinement

## 1. Overview

Goal: Refine the behavior of the new image-augmented mode (Plan 20_1) and Reference Constraints (Plan 20_2) so that:
- We apply **sensible limits** on how many images are sent per render.
- The prompt text and inline images work together to give the model clear, consistent guidance.
- Logs/diagnostics make it easy to understand how constraints and references were applied for any given render.

This plan is about **polish and guardrails**, not new user-facing features. It assumes:
- Inline images are already being sent to Gemini for tasks with reference assets (Plan 20_1).
- Reference Constraints are implemented and rendered as a `REFERENCE CONSTRAINTS` section (Plan 20_2).

Anchors:
- Inline image mode:
  - `server/src/gemini_client.ts`
  - `server/src/image_inline_helpers.ts` (from 20_1)
  - `server/src/tasks_routes.ts` (render handler and logging)
- Constraints + prompt:
  - `server/src/prompt_renderer.ts`
  - `shared/definition_config/assetReferenceMapping.ts`
  - `shared/definition_config/referenceConstraints/*` (from 20_2)
- Debugging:
  - `agents/tests/` (prompt snapshots)
  - `DEBUG_PROMPT` logging in `gemini_client.ts`

---

## 2. Step-by-Step Plan

### Step 1 — Enforce image count limits per render
**Status: Pending**

Implementation:
- Define conservative limits to avoid oversized requests and latency spikes:
  - `MAX_INLINE_IMAGES_TOTAL` (e.g., 8).
  - Optional per-scope limits:
    - `MAX_CHARACTER_INLINE_IMAGES` (e.g., 4).
    - `MAX_SCENE_INLINE_IMAGES` (e.g., 3).
    - `MAX_STYLE_INLINE_IMAGES` (e.g., 3).
- In `tasks_routes.ts`, where we derive the list of `InlineImageInput`s from `resolvedImageRefs`:
  - Group images by `scope` and `assetType`.
  - Apply limits:
    - First truncate within each scope to its max.
    - Then enforce the global total cap if needed.
  - When truncation occurs:
    - Log a one-line summary:

      ```ts
      console.log(
        `[ai] Truncated inline images for task ${task.id}: ` +
          `requested=${requestedCount}, sent=${sentCount}`,
      );
      ```

    - Optionally log a more detailed breakdown at debug level:
      - How many images were dropped per scope/type.
- Ensure we do not alter the **text** IMAGE REFERENCES section: it should still mention all configured reference images, even if only a subset is actually inlined. (Future work could annotate that some were omitted.)

Testing:
- Create tasks with many attached references across characters/scenes/styles:
  - Confirm only the limited number of inline images are sent.
  - Confirm renders still succeed and logs describe the truncation.

Checkpoint:
- Inline-image usage per render is bounded and predictable.

---

### Step 2 — Harmonize IMAGE REFERENCES with inline images and constraints
**Status: Pending**

Implementation:
- In `prompt_renderer.ts`:
  - Adjust `IMAGE REFERENCES` section wording to better align with Reference Constraints:
    - When a Reference Constraint is present:
      - Preface the section with a line like:

        ```text
        IMAGE REFERENCES
        (Use these reference images in accordance with the REFERENCE CONSTRAINTS section.)
        ```

    - When no Reference Constraint is present:
      - Keep the current language (possibly slightly more explicit).
  - Optionally add simple ordinal labels that correspond to the order of inline images:
    - E.g., annotate bullets as “(Image 1)”, “(Image 2)” to give the model a consistent mapping between the text and the internal ordering of inline parts.
- Ensure the ordering of `resolvedImageRefs` is consistent:
  - For example:
    - Characters (sorted by definition name) → Scene → Style.
  - This ordering can be mirrored in both the text bullets and the order of `inlineData` parts.

Testing:
- Capture prompt snapshots for:
  - With Reference Constraint + images.
  - With images but no Reference Constraint.
  - With neither.
  - Verify that the wording is coherent and references the right sections, without introducing ambiguity.

Checkpoint:
- The IMAGE REFERENCES section and inline images feel tightly aligned and behave consistently regardless of constraint presence.

---

### Step 3 — Refine REFERENCE CONSTRAINTS phrasing for clarity and model alignment
**Status: Pending**

Implementation:
- In `prompt_renderer.ts` (and config labels/descriptions under `referenceConstraints`):
  - Tweak labels and descriptions to be:
    - Imperative and unambiguous from the model’s perspective.
    - Explicit about what to preserve vs. what can change.
  - For example:
    - `Character identity lock: Strict Identity Preservation` →
      - Change the bullet to:

        ```text
        - Character identity lock: Treat the reference character’s face, proportions, and key features as fixed; do not redesign the character.
        ```

    - Keep the config-driven nature:
      - We can extend labels/descriptions in config (for authoring UX) and, when needed, bake slightly more verbose guidance directly into the renderer for core fields like fidelity, identity, layout, pose, and camera flexibility.
- Ensure the REFERENCE CONSTRAINTS section uses a stable order driven by `referenceConstraintConfig.categories` and properties.

Testing:
- Compare prompt text before/after for a few real tasks:
  - Confirm that the constraints read like direct instructions to an assistant, not just labels.
  - Confirm that tweaks do not break the config-driven extensibility (adding new constraint fields still surfaces them automatically).

Checkpoint:
- The constraint section is crisp, directive, and easy for the model to act on, while remaining fully config-driven.

---

### Step 4 — Improve logging and debugging for (constraints + inline images)
**Status: Pending**

Implementation:
- In `tasks_routes.ts` (render handler):
  - When image-augmented mode is active:
    - Already log which assets were chosen (Plan 20_1); refine this to:

      ```ts
      [ai] Inline image refs for task 42:
        - character_face: definition="Jennifer", assetId=101, name="Jennifer face ref 1", key="spaces/12/assets/..."
        - scene_reference: definition="Upscale Bar Interior", assetId=205, name="Bar layout", key="spaces/12/assets/..."
      ```

  - When a Reference Constraint is attached:
    - Log which constraint id/name was used:

      ```ts
      console.log(
        `[ai] Reference constraint for task ${task.id}: definitionId=${refConstraint.id}, name="${refConstraint.name}"`,
      );
      ```
- In `gemini_client.ts`:
  - Keep `DEBUG_PROMPT` behavior as-is (logging the full text prompt).
  - Add a short line when inline images are present:

    ```ts
    console.log(`[ai] Gemini inline images: count=${inlineImages.length}`);
    ```

- Optionally add a small developer-only script or `agents/tests` entry showing an example mapping from:
  - Task → reference constraint → resolved image refs → inline image parts.

Testing:
- Trigger a few renders with:
  - Different combinations of constraints and references.
  - Confirm logs give a clear story of:
    - Which constraint was used.
    - Which assets were inlined.
    - How many images were sent.

Checkpoint:
- It’s straightforward to answer “which images and which constraints were actually applied to this render?” from logs alone.

---

### Step 5 — UX nudges (optional but recommended)
**Status: Pending**

Implementation:
- In `SpaceTasksView` and `ProjectView`:
  - Add subtle indicators when a task has:
    - A Reference Constraint selected.
    - One or more reference images attached (via characters/scene/style).
  - For example:
    - A small badge like “Uses reference images” or “Constraint: High Fidelity” near the task header.
- In Space-level definition lists:
  - For Reference Constraints, show a short summary (e.g., main fidelity mode and whether identity/layout locks are strict/soft).
  - This reduces the friction of choosing the right constraint when setting up a task.

Testing:
- Verify that these cues show and update correctly as tasks are edited and constraints are changed, without altering core behavior.

Checkpoint:
- Users can easily see which tasks are “reference-driven” and which constraints they’re using, without digging into raw prompts or logs.

---

## 3. Progress Tracking

- Step 1 — Enforce image count limits per render: Pending  
- Step 2 — Harmonize IMAGE REFERENCES with inline images and constraints: Pending  
- Step 3 — Refine REFERENCE CONSTRAINTS phrasing for clarity and model alignment: Pending  
- Step 4 — Improve logging and debugging for (constraints + inline images): Pending  
- Step 5 — UX nudges (optional but recommended): Pending  

Once Plan 20_3 is complete, the image-augmented mode and Reference Constraints will behave predictably and transparently: renders will use a bounded number of reference images, the prompt text will clearly describe how those images should be interpreted under explicit constraints, and logs/UX will make it easy to understand and debug how each render was controlled. 

