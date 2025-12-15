# Implementation Plan 20_5: Per-Image Usage Instructions (Assets + Reference Constraints)

## 1. Overview

Goal: Make it explicit **how each reference image should be used** in a render, without changing the underlying Gemini API, by:
- Allowing optional **usage instructions on assets** (what this image is typically for).
- Allowing **per-asset overrides on Reference Constraints** (how to use this image in this constraint/task).
- Emitting those instructions in the **IMAGE REFERENCES** section and pairing each image’s text with its inline image part, so Gemini does not need to guess which image is which or how to use it.

This builds on:
- Plan 19_x (space assets, reference constraints wiring).
- Plan 20_1 / 20_2 (inline image support + reference constraint prompts).
- Plan 20_3 / 20_4 (limits, logging, budgeting).

User expectations:
- Asset names will be used as labels in the prompt (“Jennifer”, “Sci‑Fi Military”).
- Assets may carry a default usage hint.
- Reference Constraints can override those hints per attached asset.
- The final prompt should read like a director’s brief where each image has a clearly described role.

---

## 2. Data Model Changes

### Step 1 — Add optional usage hint to space assets
**Status: Pending**

Implementation:
- DB:
  - Add a nullable `usage_hint` column to `space_assets`:
    - `ALTER TABLE space_assets ADD COLUMN usage_hint TEXT NULL AFTER name;`
- Server types:
  - `server/src/space_assets_service.ts`:
    - Extend the `SpaceAsset` type / interface with:

      ```ts
      usageHint?: string | null;
      ```

  - Ensure SELECTs include `usage_hint` and the mapper populates `usageHint`.
- Routes:
  - `server/src/space_assets_routes.ts`:
    - For create/update asset endpoints, accept an optional `usageHint` field in the body.
    - Validate as a short, free‑text string (e.g. max length ~1024 chars).
    - Map `usageHint` → `usage_hint` column on insert/update.

### Step 2 — Add per-asset usage overrides to ReferenceConstraintMetadata
**Status: Pending**

Implementation:
- Shared metadata:
  - `shared/definition_config/referenceConstraints/types.ts`:
    - Extend `ReferenceConstraintMetadata` with:

      ```ts
      reference_images_usage?: {
        [assetId: string]: {
          usageInstruction?: string;
        };
      };
      ```

    - Document semantics in comments:
      - Keyed by numeric asset ID (string key in JSON).
      - `usageInstruction` overrides the asset’s `usageHint` when this constraint is used.
- Server metadata:
  - `server/src/definition_metadata.ts`:
    - Mirror the field in server-side `ReferenceConstraintMetadata` type.
- Client metadata:
  - `client/src/definitionMetadata.ts`:
    - Mirror in client-side `ReferenceConstraintMetadata` type.

---

## 3. UI & Editing Workflow

### Step 3 — Asset-level usage hint editing
**Status: Pending**

Implementation:
- In the Space Assets view (`client/src/App.tsx` or the extracted view component for `#/spaces/:id/assets`):
  - When creating or editing an asset:
    - Add a small text area or input labeled:
      - “Default usage note (optional)” or similar.
    - Bind this to `usageHint` on the asset.
    - Include `usageHint` in the POST/PUT body to `/api/spaces/:spaceId/assets`.
  - In the assets list:
    - Optionally show the usage hint under each thumbnail (truncated) so the user can see it at a glance.

### Step 4 — Reference Constraint per-asset usage override
**Status: Pending**

Implementation:
- In the Reference Constraint form view (space-level create/edit):
  - For each selected asset (character/scene/style reference image list):
    - Display:
      - Asset name.
      - Asset type label (face, apparel, scene, etc).
      - A small text input/textarea:
        - Label: “Usage in this constraint (optional; overrides asset default)”.
    - Bind this to `reference_images_usage[assetId].usageInstruction` in the client metadata.
  - On save:
    - Include `reference_images_usage` in the definition metadata payload.
    - No backend changes required beyond type support; the metadata is stored as JSON.

---

## 4. Prompt Rendering Changes

### Step 5 — Compute effective usage instruction per image
**Status: Pending**

Implementation:
- In the server prompt pipeline:
  - Prefer to centralize logic in `server/src/image_inline_helpers.ts` or `server/src/prompt_renderer.ts`.
  - Inputs available:
    - Resolved image references (from `collectAssetRefsFromMetadata` + asset lookup).
    - `asset.name`, `asset.usageHint`.
    - `referenceConstraintMetadata.reference_images_usage`.
  - For each `ResolvedPromptImageRef`:
    - Determine `effectiveUsageInstruction`:

      ```ts
      const override =
        referenceConstraintMetadata?.reference_images_usage?.[String(assetId)]?.usageInstruction;
      const effectiveUsageInstruction =
        override ??
        asset.usageHint ??
        defaultUsageForAssetType(assetType); // e.g. “Use this only for outfit/clothing cues.”
      ```

    - `defaultUsageForAssetType` can live in a small helper table keyed by `assetType`.

### Step 6 — Emit per-image text+image pairs in prompt
**Status: Pending**

Implementation:
- Adjust how we build Gemini `parts` in `server/src/gemini_client.ts` caller (`tasks_routes.ts`):
  - Instead of:

    ```ts
    parts: [
      { text: fullPrompt },
      ...inlineImages.map(img => ({ inlineData: img }))
    ]
    ```

  - Move to a structure built in `prompt_renderer.ts` that returns:
    - `promptTextWithoutImageBlocks` (STYLE, CHARACTERS, SCENE, TASK, TEXT ELEMENTS).
    - `imageReferenceBlocks[]` where each item includes:
      - `headerText` (e.g. `Face reference image A — "Jennifer":`).
      - `usageText` from `effectiveUsageInstruction`.
      - `inlineImage` (mimeType + base64).
  - Then construct `parts` as:

    ```ts
    const parts: any[] = [];

    imageReferenceBlocks.forEach(block => {
      parts.push({
        text:
          `IMAGE REFERENCES\n\n` +
          `${block.headerText}\n` +
          (block.usageText ? `- Usage: ${block.usageText}\n\n` : '\n'),
      });
      parts.push({ inlineData: block.inlineImage });
    });

    parts.push({ text: promptTextWithoutImageBlocks });
    ```

  - Ensure that the **rendered prompt snapshot** still shows IMAGE REFERENCES and REFERENCE CONSTRAINTS in a human-readable way (as today), but internally we now break it into text+image pairs for Gemini.

Notes:
- For tasks with **no reference images**, continue to send a single text part as today.
- For **character/scene/style-only images** (no constraint), we still use asset `usageHint` or type-based defaults.

---

## 5. Logging & Debugging

### Step 7 — Surface usage instructions in debug logs
**Status: Pending**

Implementation:
- When `DEBUG_PROMPT` is enabled:
  - In the “Inline image refs for task N” log (tasks routes / helpers):
    - Include `effectiveUsageInstruction` for each image:

      ```text
      - character/character_face: definition="Scarlet Reference",
        assetName="Jennifer", usage="Use only for facial identity..."
      ```

  - The JSON request stub (already written by Plan 20_1) will naturally reflect the new `parts` ordering; no base64 is logged.

Testing:
- Inspect terminal:
  - Confirm that:
    - Each inline image has a logged usage.
    - `parts` in the JSON stub show alternating text (with usage) and inlineData.

---

## 6. Rollout & Backwards Compatibility

### Step 8 — Backfill and defaults
**Status: Pending**

Implementation:
- DB migration:
  - `space_assets.usage_hint` is nullable; no backfill required.
- Runtime defaults:
  - If no asset `usageHint` and no constraint override:
    - Use a safe fallback per asset type, e.g.:
      - Face reference: “Use this image only for facial identity and expression.”
      - Apparel reference: “Use this image only for clothing / outfit cues.”
      - Scene reference: “Use this image only for layout, lighting, and environment.”
- Ensure that existing assets/constraints continue to work without modification; instructions will simply be generic until users add more specific hints.

---

## 7. Acceptance Criteria

- Assets can store an optional usage hint string.
- Reference Constraints can store optional per-asset usage overrides.
- For a task that uses reference images:
  - The prompt’s IMAGE REFERENCES section clearly labels each image and includes a usage line.
  - The Gemini `contents.parts` array alternates text and `inlineData` for each image, with instructions in the preceding text part.
- When `DEBUG_PROMPT=1`:
  - Logs show each image’s role and effective usage.
  - JSON request stub files include the correctly ordered parts (with base64 redacted).
- Tasks without reference images behave exactly as before.

