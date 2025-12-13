# Implementation Plan 19_2: Link Space Assets to Character, Scene, and Style Definitions

## 1. Overview

Goal: Allow Character, Scene, and Style definitions to **reference one or more Space assets per reference type**, storing only asset IDs in definition metadata and keeping everything **config-driven**. This builds on `plan_19_1` (Space Assets storage/API/UI) and prepares for prompt integration in `plan_19_3`.

In this plan we will:
- Evolve metadata types and config to support **multi-asset references** (arrays) instead of single ID strings.
- Add a light mapping layer between definition configs and asset reference types.
- Extend the Character/Scene/Style definition forms to browse and select assets (by type) from the current Space.
- Persist selected asset IDs into `definitions.metadata` in a stable, future-proof way.

Out of scope (deferred to `plan_19_3`):
- Using these asset references in the Prompt Renderer (`IMAGE REFERENCES`).
- Generating signed URLs or guidance text for the model.

Anchors:
- Shared configs:
  - `shared/definition_config/characterAppearance/baseReferenceImages.ts`
  - `shared/definition_config/sceneDefinitions/*.ts`
  - `shared/definition_config/styleDefinitions/*.ts`
- Metadata types:
  - `client/src/definitionMetadata.ts`
  - `server/src/definition_metadata.ts`
- Definition CRUD:
  - `server/src/space_definitions_routes.ts`
  - `server/src/definitions_service.ts`
- Space Assets:
  - `db/migrations.sql` — `space_assets` table (from `plan_19_1`).
  - `server/src/space_assets_routes.ts` (to be implemented in `plan_19_1`).
  - `client/src/App.tsx` — Space assets loading helpers.
  - `client/src/views/SpaceAssetsView.tsx` — Assets management UI.
- Definition forms:
  - `client/src/views/CharacterDefinitionFormView.tsx`
  - `client/src/views/SceneDefinitionFormView.tsx`
  - `client/src/views/StyleDefinitionFormView.tsx`

---

## 2. Step-by-Step Plan

### Step 1 — Update metadata types for multi-asset references
**Status: Pending**

Implementation:
- Character metadata:
  - In `client/src/definitionMetadata.ts` and `server/src/definition_metadata.ts`:
    - Change the `base_reference_images` block to support **arrays of asset IDs**:

      ```ts
      base_reference_images?: {
        face_reference_image_ids?: string[];
        body_reference_image_ids?: string[];
        hair_reference_image_ids?: string[];
        full_character_reference_image_ids?: string[];
        // For forward compatibility / custom categories:
        [key: string]: string | string[] | undefined;
      };
      ```

    - Keep the index signature so newly added keys from config continue to work.
- Scene and Style metadata:
  - Scene:
    - `SceneDefinitionMetadata` is already flexible (`[categoryKey: string]: { [propertyKey: string]: ... }`), so no structural change is required. We will interpret specific properties as arrays of asset IDs by convention.
  - Style:
    - For this plan we will **not** add dedicated asset fields into `StyleDefinitionMetadata`; instead, we will use the generic `SceneDefinitionMetadata`-style approach for style asset references in the next step via config mapping.
- Backward-compatibility:
  - When rendering forms or prompts, treat both `*_image_id` (string) and `*_image_ids` (string[]) as valid, but **write** only the new `*_image_ids` array properties going forward.

Testing:
- Type-check the client and server after modifying metadata types.

Checkpoint:
- The type system allows multi-asset references for base character images without constraining future extension for scenes/styles.

---

### Step 2 — Evolve character base reference images config to array semantics (non-breaking)
**Status: Pending**

Implementation:
- In `shared/definition_config/characterAppearance/baseReferenceImages.ts`:
  - Keep existing category and property keys for now to avoid breaking current data:

    ```ts
    export const baseReferenceImagesCategory: AppearanceCategory = {
      key: 'base_reference_images',
      label: 'Base Reference Images',
      order: 9,
      description: 'Optional reference image IDs used by the pipeline (face/body/hair/full-character).',
      properties: [
        { key: 'face_reference_image_id', label: 'Face reference image ID', type: 'string' },
        { key: 'body_reference_image_id', label: 'Body reference image ID', type: 'string' },
        { key: 'hair_reference_image_id', label: 'Hair reference image ID', type: 'string' },
        { key: 'full_character_reference_image_id', label: 'Full-character reference image ID', type: 'string' },
      ],
    };
    ```

  - We **do not** change `type: 'string'` yet; instead, the form layer will:
    - Render these as **multi-select asset pickers**.
    - Store values under the new plural keys (`*_image_ids`) in `CharacterAppearanceMetadata.base_reference_images`.
    - Optionally keep the first selected ID mirrored to the legacy singular property for backward compatibility (`face_reference_image_id = face_reference_image_ids[0]`), to support any existing consumers that still read the singular keys.
- We keep the config stable so authors can reorganize categories/properties without editing the renderer; the asset/linking semantics are applied in the form + prompt layers.

Testing:
- Confirm that the form still iterates categories and properties as before, and type narrowing still compiles.

Checkpoint:
- Character base reference images category remains config-driven and non-breaking, while the metadata layer is ready for multiple asset IDs.

---

### Step 3 — Introduce a mapping from config properties to asset reference types
**Status: Pending**

Implementation:
- Add a small, centralized mapping module (shared across client/server):
  - Create `shared/definition_config/assetReferenceMapping.ts` exporting:

    ```ts
    export type AssetReferenceType =
      | 'character_face'
      | 'character_body'
      | 'character_hair'
      | 'character_full'
      | 'character_prop'
      | 'character_clothing'
      | 'scene_reference'
      | 'style_reference';

    export type AssetBinding = {
      // Definition type: 'character' | 'scene' | 'style'
      definitionType: 'character' | 'scene' | 'style';
      // Category key in the config
      categoryKey: string;
      // Property key in the category config used by the form
      propertyKey: string;
      // Where in metadata we store IDs (category + property key)
      metadataCategoryKey: string;
      metadataPropertyKey: string;
      // Space asset type this property corresponds to
      assetType: AssetReferenceType;
    };

    export const assetReferenceBindings: AssetBinding[] = [
      {
        definitionType: 'character',
        categoryKey: 'base_reference_images',
        propertyKey: 'face_reference_image_id',
        metadataCategoryKey: 'base_reference_images',
        metadataPropertyKey: 'face_reference_image_ids',
        assetType: 'character_face',
      },
      {
        definitionType: 'character',
        categoryKey: 'base_reference_images',
        propertyKey: 'body_reference_image_id',
        metadataCategoryKey: 'base_reference_images',
        metadataPropertyKey: 'body_reference_image_ids',
        assetType: 'character_body',
      },
      {
        definitionType: 'character',
        categoryKey: 'base_reference_images',
        propertyKey: 'hair_reference_image_id',
        metadataCategoryKey: 'base_reference_images',
        metadataPropertyKey: 'hair_reference_image_ids',
        assetType: 'character_hair',
      },
      {
        definitionType: 'character',
        categoryKey: 'base_reference_images',
        propertyKey: 'full_character_reference_image_id',
        metadataCategoryKey: 'base_reference_images',
        metadataPropertyKey: 'full_character_reference_image_ids',
        assetType: 'character_full',
      },
      // Scene and style bindings will be added/extended here as we add
      // reference-image categories to their configs.
    ];
    ```

- This mapping serves two purposes:
  - The **forms** can look up, for a given definition type + (categoryKey, propertyKey), which asset type to list and where to store the selected IDs in metadata.
  - The **prompt renderer** (in `plan_19_3`) can invert this mapping: given metadata and asset type, determine which asset IDs to resolve and how to phrase them.
- Keeping this mapping in `shared/definition_config` keeps behavior centralized and versioned with other config changes.

Testing:
- Ensure the shared module builds in both client and server bundles.

Checkpoint:
- There is a single source of truth for how definition properties bind to space asset types and metadata keys.

---

### Step 4 — Extend Character definition form to select multiple assets per type
**Status: Pending**

Implementation:
- In `client/src/App.tsx`:
  - Ensure Space assets for the current space are loaded and available to the Character definition form:
    - Expose `spaceAssets` and related state as props to `CharacterDefinitionFormView`.
  - Ensure assets are filtered by `spaceId`, not project.
- In `client/src/views/CharacterDefinitionFormView.tsx`:
  - Extend props to accept:
    - `spaceAssets: SpaceAssetSummary[]` (matching the DTO from `plan_19_1`).
  - Inside the category/property rendering loop:
    - For each property, consult `assetReferenceBindings` for:
      - `definitionType: 'character'`
      - `categoryKey` = `category.key`
      - `propertyKey` = `prop.key`
    - If a binding exists:
      - Instead of rendering the generic text/enum/tags input, render a **multi-select asset picker**:
        - Compute `boundAssetType = binding.assetType`.
        - `availableAssets = spaceAssets.filter(a => a.type === boundAssetType)`.
        - `selectedIds = characterMetadata[binding.metadataCategoryKey]?.[binding.metadataPropertyKey] ?? []`.
      - UI behavior:
        - Show selected assets as pills with name + “×” remove button.
        - Show remaining assets (filtered by type and not already selected) as pill buttons or a simple list with “Add” actions.
      - On add/remove:
        - Update `characterMetadata` using `setCharacterMetadata`:
          - Ensure `base_reference_images` exists.
          - Write `metadata.base_reference_images[binding.metadataPropertyKey]` as a `string[]` of asset IDs.
          - Optionally mirror the first selected ID to the legacy singular key:

            ```ts
            baseRef.face_reference_image_id = selectedIds[0] ?? undefined;
            ```

        - Keep the rest of the category metadata intact.
      - Do **not** show the generic text input for these binding-backed properties; the asset picker completely replaces it.
- UX notes:
  - If there are no assets for a given type, show a small helper message linking back to the Space Assets page, e.g., “No face reference assets yet. Use ‘Add assets’ in the Space view to upload.”

Testing:
- In a Space:
  - Upload several assets of types `character_face`, `character_body`, etc. via the Space Assets page.
  - Create a new Character:
    - In “Base Reference Images” category, see asset pickers instead of plain string inputs.
    - Select multiple images per type.
  - Save the character and inspect:
    - `definitions.metadata.base_reference_images.face_reference_image_ids` etc. contain arrays of asset IDs.
    - Optionally, singular `face_reference_image_id` mirrors the first one.

Checkpoint:
- Character definition forms can attach multiple reference images per type, persisted into metadata as asset ID arrays.

---

### Step 5 — Add Scene and Style reference bindings and UI (minimal)
**Status: Pending**

Implementation:
- Scene and Style configs:
  - For this plan we will add **one generic reference-image property** to each:
    - Scene:
      - Add a new category file (if not already present) or extend an existing one (e.g., `sceneLoreCategory` or a new `referenceImagesCategory`) with:

        ```ts
        {
          key: 'scene_reference_images',
          label: 'Scene reference images',
          type: 'string', // UI will override to multi-asset picker
          description: 'Optional reference images that capture the mood and layout of this scene.',
        }
        ```

    - Style:
      - Add a property in a relevant category (e.g., core style or mood/atmosphere):

        ```ts
        {
          key: 'style_reference_images',
          label: 'Style reference images',
          type: 'string',
          description: 'Optional reference images that embody this style.',
        }
        ```

  - The intent is the same as for characters: configs remain string-based; multi-image semantics live in metadata + form.
- Extend `assetReferenceBindings`:

  ```ts
  // Scene
  assetReferenceBindings.push({
    definitionType: 'scene',
    categoryKey: 'scene_reference_images', // or the appropriate category key
    propertyKey: 'scene_reference_images',
    metadataCategoryKey: 'scene_reference_images',
    metadataPropertyKey: 'scene_reference_image_ids',
    assetType: 'scene_reference',
  });

  // Style
  assetReferenceBindings.push({
    definitionType: 'style',
    categoryKey: 'core_style' /* or another chosen category */,
    propertyKey: 'style_reference_images',
    metadataCategoryKey: 'style_reference_images',
    metadataPropertyKey: 'style_reference_image_ids',
    assetType: 'style_reference',
  });
  ```

- Update forms:
  - `SceneDefinitionFormView.tsx` and `StyleDefinitionFormView.tsx`:
    - Accept `spaceAssets` props, like the Character form.
    - Within the generic category/property rendering loop:
      - Check `assetReferenceBindings` for definitionType `'scene'` or `'style'`.
      - For bindings, render the same multi-asset picker UI as in the Character form, storing IDs under `SceneDefinitionMetadata`/`StyleDefinitionMetadata` using `metadataCategoryKey` / `metadataPropertyKey`.
      - Suppress the generic text input when a binding is present.

Testing:
- Create Scene and Style definitions:
  - Confirm the new reference image fields show asset pickers.
  - Select multiple assets; save and verify metadata includes `*_image_ids` arrays.

Checkpoint:
- Scenes and Styles can also reference one or more Space assets via their definitions.

---

### Step 6 — Server: ensure definition CRUD paths treat asset IDs as opaque JSON
**Status: Pending**

Implementation:
- In `server/src/space_definitions_routes.ts` and `server/src/definitions_service.ts`:
  - Confirm we are already treating `metadata` as an arbitrary JSON object and not enforcing shape beyond `JSON.stringify` / `JSON.parse`.
  - No schema changes are needed, but we should:
    - Add minimal runtime type guards (if present) to accept arrays of strings for `*_image_ids` fields.
    - Ensure there is no code path that assumes `face_reference_image_id` etc. are scalars.
- Migration / compatibility:
  - Leave existing definitions as-is; when edited via the new forms:
    - If `*_image_ids` arrays are present, keep them.
    - Optionally populate `*_image_ids` from existing scalar `*_image_id` values when loading metadata into the form, so a previously saved single ID appears as a selected asset and can be extended.

Testing:
- Create and edit definitions end-to-end:
  - Check that new multi-asset selections round-trip through the API.
  - Verify legacy characters with only scalar `*_image_id` fields can be edited and upgraded without errors.

Checkpoint:
- The server accepts and persists the new asset ID arrays transparently during definition create/edit operations.

---

## 3. Progress Tracking

- Step 1 — Update metadata types for multi-asset references: Pending  
- Step 2 — Evolve character base reference images config to array semantics (non-breaking): Pending  
- Step 3 — Introduce mapping from config properties to asset reference types: Pending  
- Step 4 — Extend Character definition form to select multiple assets per type: Pending  
- Step 5 — Add Scene and Style reference bindings and UI (minimal): Pending  
- Step 6 — Server: ensure definition CRUD paths treat asset IDs as opaque JSON: Pending  

Once Plan 19_2 is complete, Characters, Scenes, and Styles will be able to attach multiple reference images per type via Space assets, with all selections stored as asset ID arrays in their metadata. `plan_19_3` will then consume these references to build a rich `IMAGE REFERENCES` section in the prompt renderer, using the same config-driven mapping.

