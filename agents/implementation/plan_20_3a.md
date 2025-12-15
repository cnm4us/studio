# Implementation Plan 20_3a: Reference Constraint–Owned Image References

## 1. Overview

Goal: Allow **Reference Constraints** to own image references, so you can:
- Attach one or more space assets directly to a Reference Constraint.
- Select that Reference Constraint (plus a Style and optional prompt) in a task.
- Have those images participate in:
  - The `IMAGE REFERENCES` section of the prompt.
  - The inline image payload sent to Gemini (same mechanism as characters/scenes/styles).

This plan keeps everything **config- and asset-mapping–driven**, reusing the existing image pipeline:
- `space_assets` for uploaded images.
- `assetReferenceMapping.ts` to connect definition metadata → asset types.
- `collectAssetRefsFromMetadata` and `tasks_routes.ts` to turn definition metadata into URL + inline image inputs.

We’ll treat Reference Constraint images as **role-specific**:
- “Character-like” constraint images → show up under Character references.
- “Scene-like” constraint images → show up under Scene references.
- “Style-like” constraint images → show up under Style references.

No new DB tables are required; everything stays in `definitions.metadata` and `space_assets`.

Anchors:
- Config:
  - `shared/definition_config/referenceConstraints/*`
  - `shared/definition_config/assetReferenceMapping.ts`
- Metadata + prompt:
  - `server/src/definition_metadata.ts`
  - `server/src/asset_reference_helpers.ts`
  - `server/src/prompt_renderer.ts`
- Tasks + inline images:
  - `server/src/tasks_routes.ts`
  - `server/src/image_inline_helpers.ts`
  - `server/src/gemini_client.ts`
- Client:
  - `client/src/definitionMetadata.ts`
  - `client/src/views/ReferenceConstraintDefinitionFormView.tsx`
  - `client/src/App.tsx` (to pass `spaceAssets` into the constraint form, mirroring Style/Scene/Character).

---

## 2. Step-by-Step Plan

### Step 1 — Extend Reference Constraint config with `reference_images`
**Status: Pending**

Implementation:
- In `shared/definition_config/referenceConstraints/`:
  - Add a new category, e.g. in `coreConstraints.ts` or a new file:

    ```ts
    export const referenceConstraintImagesCategory: ReferenceConstraintCategory = {
      key: 'reference_images',
      label: 'Reference Images',
      order: 10,
      description:
        'Optional reference images that this constraint governs (character, scene, or style).',
      properties: [
        {
          key: 'character_reference_image_ids',
          label: 'Character reference images',
          type: 'string',
          description:
            'IDs of character-focused reference images (face, body, full character).',
        },
        {
          key: 'scene_reference_image_ids',
          label: 'Scene reference images',
          type: 'string',
          description:
            'IDs of scene-focused reference images (layout, environment, landmarks).',
        },
        {
          key: 'style_reference_image_ids',
          label: 'Style reference images',
          type: 'string',
          description:
            'IDs of style-focused reference images (rendering, line, color treatment).',
        },
      ],
    };
    ```

  - Add this category to the exported `referenceConstraintConfig.categories` (order after the main constraints).

Notes:
- We keep the properties generic (`*_reference_image_ids`) and let asset mapping decide which `AssetReferenceType` they correspond to.

Testing:
- Type-check shared config in both server and client builds.

Checkpoint:
- Reference Constraints have a `reference_images` category ready to store asset IDs.

---

### Step 2 — Add asset bindings for Reference Constraints
**Status: Pending**

Implementation:
- In `shared/definition_config/assetReferenceMapping.ts`:
  - Extend `AssetBinding.definitionType` union to include `'reference_constraint'`.
  - Add bindings that map the new `reference_images` properties to logical asset types:

    ```ts
    {
      definitionType: 'reference_constraint',
      categoryKey: 'reference_images',
      propertyKey: 'character_reference_image_ids',
      metadataCategoryKey: 'reference_images',
      metadataPropertyKey: 'character_reference_image_ids',
      assetType: 'character_full', // or use character_face if you prefer
    },
    {
      definitionType: 'reference_constraint',
      categoryKey: 'reference_images',
      propertyKey: 'scene_reference_image_ids',
      metadataCategoryKey: 'reference_images',
      metadataPropertyKey: 'scene_reference_image_ids',
      assetType: 'scene_reference',
    },
    {
      definitionType: 'reference_constraint',
      categoryKey: 'reference_images',
      propertyKey: 'style_reference_image_ids',
      metadataCategoryKey: 'reference_images',
      metadataPropertyKey: 'style_reference_image_ids',
      assetType: 'style_reference',
    },
    ```

  - Update `findAssetBinding`’s `definitionType` parameter type to accept `'reference_constraint'` if needed.

Notes:
- We intentionally reuse existing `AssetReferenceType` values so the rest of the pipeline (IMAGE REFERENCES + inline images) doesn’t need special-case logic.

Testing:
- Quick compile; no runtime behavior change yet.

Checkpoint:
- The system knows how to interpret Reference Constraint metadata fields as asset references.

---

### Step 3 — Teach the server to collect constraint-owned asset refs
**Status: Pending**

Implementation:
- In `server/src/asset_reference_helpers.ts`:
  - Introduce a minimal input type for Reference Constraints:

    ```ts
    type ReferenceConstraintInput = {
      id: number;
      name: string;
      metadata: ReferenceConstraintMetadata | null;
    };
    ```

  - Update `PromptAssetRefScope` if needed to remain `'character' | 'scene' | 'style'` (we'll map constraint images into these scopes).
  - Extend `collectAssetRefsFromMetadata` to accept an optional `referenceConstraint` field:

    ```ts
    export const collectAssetRefsFromMetadata = (params: {
      characters: CharacterInput[];
      style?: StyleInput | null;
      scene?: SceneInput | null;
      referenceConstraint?: ReferenceConstraintInput | null;
    }): CollectedAssetRef[] => { ... }
    ```

  - When `referenceConstraint` is present:
    - Filter `assetReferenceBindings` for `definitionType === 'reference_constraint'`.
    - For each binding, read from the constraint’s `reference_images` category via `metadataCategoryKey`.
    - Use `collectIdsFromCategory` to get asset IDs.
    - Decide which **scope** to use per binding:
      - For `assetType` in `character_*` → `scope: 'character'` (definitionName = constraint name).
      - For `scene_reference` → `scope: 'scene'`.
      - For `style_reference` → `scope: 'style'`.
    - Push `CollectedAssetRef` entries accordingly.

Notes:
- This means IMAGE REFERENCES may list some lines like:

  ```text
  Character references:
  - Jennifer — Face reference images: ...
  - High Fidelity Portrait Constraint — Full-character reference images: ...
  ```

  where “High Fidelity Portrait Constraint” is the Reference Constraint’s name contributing additional references.

Testing:
- Unit-style test via a small harness or by logging in dev:
  - Create a constraint with various `*_reference_image_ids`.
  - Confirm `collectAssetRefsFromMetadata` returns `CollectedAssetRef` entries scoped as intended.

Checkpoint:
- Constraint-owned assets are merged into the same unified asset ref list used by characters/scenes/styles.

---

### Step 4 — Wire constraint image refs into tasks & inline images
**Status: Pending**

Implementation:
- In `server/src/tasks_routes.ts`:
  - When building `collectedRefs = collectAssetRefsFromMetadata({ ... })`, add:

    ```ts
    referenceConstraint: referenceConstraintDefinition
      ? {
          id: referenceConstraintDefinition.id as number,
          name: (referenceConstraintDefinition.name as string) ?? 'Constraint',
          metadata: referenceConstraintMeta ?? null,
        }
      : null,
    ```

    where `referenceConstraintMeta` is already parsed from `referenceConstraintDefinition.metadata` in Plan 20_2.
  - The rest of the pipeline (resolving `space_assets`, building `resolvedImageRefs`, constructing `inlineImageInputs`) already operates over `CollectedAssetRef[]`; it will automatically include the constraint-owned images.
- No changes needed to the inline-image helpers or S3 layer:
  - They work purely from `fileKey`, `mimeType`, etc., regardless of which definition the asset came from.

Testing:
- Create a Reference Constraint with attached assets, a Style, and a task that uses only:
  - Reference Constraint + Style + prompt.
- Trigger a render and inspect:
  - Debug logs (`DEBUG_PROMPT` + inline image logs) to confirm:
    - IMAGE REFERENCES section includes constraint-owned images.
    - `[ai] Inline image refs for task ...` logs show at least one entry with `definitionName` equal to the constraint’s name.

Checkpoint:
- Selecting a Reference Constraint that owns images is sufficient to feed those images into the render pipeline.

---

### Step 5 — Client: select space assets inside the constraint form
**Status: Pending**

Implementation:
- In `client/src/App.tsx`:
  - When rendering `ReferenceConstraintDefinitionFormView`, pass `spaceAssets` just like we do for character/scene/style forms.
- In `client/src/views/ReferenceConstraintDefinitionFormView.tsx`:
  - Accept an optional `spaceAssets?: SpaceAssetSummary[]` prop (same type as in other forms).
  - For `reference_images` category + each property:
    - Instead of a free string input, render:
      - A selectable list of matching assets (filtered by desired type).
      - A pill list of selected assets with “×” to remove, mirroring `StyleDefinitionFormView` asset selectors.
    - For this plan, we can keep it simple:
      - Treat all selected assets for `character_reference_image_ids` as “character_full” (the binding decides the asset type).
      - Filter `spaceAssets` to all asset types for now or:
        - `character_reference_image_ids` → `character_*` asset types.
        - `scene_reference_image_ids` → `scene_reference`.
        - `style_reference_image_ids` → `style_reference`.
  - On add/remove:
    - Update `ReferenceConstraintMetadata` under `reference_images` with string IDs, identical to how style/scene forms manage `*_image_ids`.

Testing:
- From a Space:
  - Upload several assets.
  - Create/edit a Reference Constraint and attach multiple assets to each `*_reference_image_ids` property.
  - Save and reload the form; ensure selections are persisted and re-render correctly.

Checkpoint:
- The constraint form lets you attach and manage space assets as image references, with a UX consistent with other definition forms.

---

## 3. Progress Tracking

- Step 1 — Extend Reference Constraint config with `reference_images`: Pending  
- Step 2 — Add asset bindings for Reference Constraints: Pending  
- Step 3 — Teach the server to collect constraint-owned asset refs: Pending  
- Step 4 — Wire constraint image refs into tasks & inline images: Pending  
- Step 5 — Client: select space assets inside the constraint form: Pending  

Once Plan 20_3a is complete, Reference Constraints will be able to **own their own image references**, and those images will flow through the same config-driven pipeline: selectable in the Space UI, saved into definition metadata, resolved to `space_assets`, surfaced in IMAGE REFERENCES, and sent inline to Gemini whenever that constraint is attached to a task. 

