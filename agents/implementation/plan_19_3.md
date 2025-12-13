# Implementation Plan 19_3: Prompt Integration for Space Asset References

## 1. Overview

Goal: Use the Space assets linked in Character, Scene, and Style definitions (from `plan_19_2`) to render a rich **IMAGE REFERENCES** section in the prompt sent to the image model. This section should:
- Be **config-driven** via `assetReferenceBindings` and definition configs.
- Use asset **types** (face/body/hair/scene/style, etc.) to provide clear guidance text.
- List per-definition references (which character/scene/style each image belongs to).
- Use URLs that are stable and safe to hand to the model (from `space_assets.file_url`, with an option to sign later if needed).

We will:
- Add helpers to collect asset IDs from definition metadata using the shared bindings.
- Fetch the corresponding `space_assets` rows for a given Space.
- Extend the prompt renderer to consume these resolved references and format the IMAGE REFERENCES section.
- Wire everything into the Task render pipeline without changing user-facing flows.

Out of scope:
- Changing how assets are uploaded or edited (handled in `plan_19_1`).
- Changing how definitions link to assets (handled in `plan_19_2`).

Anchors:
- Shared mapping: `shared/definition_config/assetReferenceMapping.ts` (from `plan_19_2`).
- Metadata types:
  - `server/src/definition_metadata.ts`
- Prompt renderer:
  - `server/src/prompt_renderer.ts`
- Task render pipeline:
  - `server/src/tasks_routes.ts`
  - `server/src/gemini_client.ts` (DEBUG_PROMPT logging)
- Space assets:
  - `db/migrations.sql` — `space_assets` table (from `plan_19_1`).
  - `server/src/space_assets_routes.ts` & S3 helpers (`server/src/s3_client.ts`).

---

## 2. Step-by-Step Plan

### Step 1 — Define server-side types and helpers for resolved asset references
**Status: Pending**

Implementation:
- Add a new helper module, e.g. `server/src/asset_reference_helpers.ts`:
  - Import `assetReferenceBindings` and `AssetReferenceType` from `shared/definition_config/assetReferenceMapping.js`.
  - Define lightweight types for prompt integration:

    ```ts
    export type PromptAssetRefScope = 'character' | 'scene' | 'style';

    export type AssetReferenceBinding = {
      definitionType: PromptAssetRefScope;
      categoryKey: string;
      propertyKey: string;
      metadataCategoryKey: string;
      metadataPropertyKey: string;
      assetType: AssetReferenceType;
    };

    export type CollectedAssetRef = {
      scope: PromptAssetRefScope;
      definitionId: number;
      definitionName: string;
      binding: AssetReferenceBinding;
      assetIds: string[]; // raw IDs from metadata; we’ll normalize to numbers where possible
    };
    ```

  - Export a function to collect asset IDs from metadata:

    ```ts
    export function collectAssetRefsFromMetadata(params: {
      characters: Array<{ id: number; name: string; metadata: CharacterAppearanceMetadata | null }>;
      style?: { id: number; name: string; metadata: StyleDefinitionMetadata | null } | null;
      scene?: { id: number; name: string; metadata: Record<string, unknown> | null } | null;
    }): CollectedAssetRef[] {
      // implementation will:
      //  - iterate bindings for each scope
      //  - read metadata[binding.metadataCategoryKey]?.[binding.metadataPropertyKey]
      //  - normalize values to string[]
      //  - skip empty arrays
      //  - attach definitionId/name
    }
    ```

- Normalization rules:
  - Accept both `string` and `string[]` (for compatibility with legacy scalar `*_image_id` values).
  - Coerce everything to `string[]` and filter out empty strings.

Testing:
- Add a small local harness or temporary unit-like call in dev to ensure:
  - For a character with `base_reference_images.face_reference_image_ids = ['123', '456']` it yields a `CollectedAssetRef` with those IDs.
  - When no assets are attached, the result is an empty array.

Checkpoint:
- The server can derive a structured list of “which definition uses which asset IDs, in what role”.

---

### Step 2 — Implement a service helper to load `space_assets` by ID
**Status: Pending**

Implementation:
- Add a new module `server/src/space_assets_service.ts`:

  ```ts
  import { getDbPool } from './db.js';

  export type SpaceAssetRecord = {
    id: number;
    space_id: number;
    name: string;
    type: string;
    file_key: string;
    file_url: string;
    metadata: any;
    created_at: Date;
  };

  export async function getSpaceAssetsByIds(
    spaceId: number,
    assetIds: number[],
  ): Promise<SpaceAssetRecord[]> {
    if (assetIds.length === 0) return [];
    const db = getDbPool();
    const [rows] = await db.query(
      'SELECT * FROM space_assets WHERE space_id = ? AND id IN (?)',
      [spaceId, assetIds],
    );
    return rows as SpaceAssetRecord[];
  }
  ```

- For now, use the stored `file_url` directly; if we decide later to sign URLs via CloudFront, we can add a `maybeSignAssetUrl` helper analogous to `tasks_routes.ts`.

Testing:
- From a dev console or temporary route, call `getSpaceAssetsByIds` with known asset IDs and confirm it returns the expected records.

Checkpoint:
- The server can resolve asset IDs in metadata into full asset records (name, type, URLs).

---

### Step 3 — Extend `renderPrompt` to accept structured image references and render IMAGE REFERENCES
**Status: Pending**

Implementation:
- In `server/src/prompt_renderer.ts`:
  - Import `AssetReferenceType` and `PromptAssetRefScope` from the new helper/mapping.
  - Define a DTO for resolved references:

    ```ts
    export type ResolvedPromptImageRef = {
      scope: PromptAssetRefScope; // 'character' | 'scene' | 'style'
      definitionName: string;
      assetType: AssetReferenceType;
      assetName: string;
      url: string;
    };
    ```

  - Extend `RenderPromptOptions` to include an optional array:

    ```ts
    export type RenderPromptOptions = {
      taskPrompt: string;
      characters: RenderCharacterInput[];
      style: StyleDefinitionMetadata | null;
      scene: unknown | null;
      imageReferences?: ResolvedPromptImageRef[];
    };
    ```

  - Add a new helper `renderImageReferencesSection(imageReferences?: ResolvedPromptImageRef[]): string`:
    - If `imageReferences` is missing or empty, return the existing fallback:

      ```ts
      IMAGE REFERENCES
      - No image reference constraints provided.
      ```

    - Otherwise:
      - Group references by `scope` (`character`, `scene`, `style`), then by `definitionName`, then by `assetType`.
      - Provide human-readable headings:
        - `Character references`
        - `Scene references`
        - `Style references`
      - For each group, emit something like:

        ```text
        IMAGE REFERENCES
        Character references:
        - Jennifer — Face reference images:
          - https://...
          - https://...
        - Jennifer — Clothing reference images:
          - https://...

        Scene references:
        - Upscale Bar Interior — Scene reference images:
          - https://...

        Style references:
        - Slice-of-life comic style — Style reference images:
          - https://...
        ```

      - To keep things config-driven, map `assetType` to human phrases via a local mapping table, e.g.:

        ```ts
        const ASSET_TYPE_LABELS: Record<AssetReferenceType, string> = {
          character_face: 'Face reference images',
          character_body: 'Body reference images',
          character_hair: 'Hair reference images',
          character_full: 'Full-character reference images',
          character_prop: 'Prop reference images',
          character_clothing: 'Clothing reference images',
          scene_reference: 'Scene reference images',
          style_reference: 'Style reference images',
        };
        ```

      - Optionally, attach short guidance phrases per type (e.g., “Use these to constrain facial structure and expression”) to refine the wording; keep these in a small mapping so changes remain localized.
  - Update `renderPrompt` to call `renderImageReferencesSection(options.imageReferences)` instead of the current placeholder block.

Testing:
- Create a synthetic `imageReferences` array with a few entries and call `renderPrompt` directly to validate the structure and phrasing of the IMAGE REFERENCES section.

Checkpoint:
- The prompt renderer can express real image references with URLs in a structured, human-readable way.

---

### Step 4 — Wire asset collection and resolution into the task render route
**Status: Pending**

Implementation:
- In `server/src/tasks_routes.ts`, within the render handler (where we already:
  - Load character, style, scene definitions.
  - Parse their metadata with `parseJsonIfString`.
  - Build the `characters`, `styleMeta`, `sceneMeta` inputs for `renderPrompt`.
):
  - After computing `characterMetas`, `styleMeta`, and `sceneMeta`, call `collectAssetRefsFromMetadata`:

    ```ts
    const collectedRefs = collectAssetRefsFromMetadata({
      characters: characterDefinitions.map((def, index) => ({
        id: def.id as number,
        name: characterNames[index], // same as we pass to renderPrompt
        metadata: characterMetas[index] ?? null,
      })),
      style: styleDefinition
        ? {
            id: styleDefinition.id as number,
            name: styleDefinition.name as string,
            metadata: styleMeta ?? null,
          }
        : null,
      scene: sceneDefinition
        ? {
            id: sceneDefinition.id as number,
            name: sceneDefinition.name as string,
            metadata: (sceneMeta as Record<string, unknown>) ?? null,
          }
        : null,
    });
    ```

  - Collect the distinct numeric asset IDs:

    ```ts
    const assetIdSet = new Set<number>();
    for (const ref of collectedRefs) {
      for (const rawId of ref.assetIds) {
        const maybeId = Number(rawId);
        if (Number.isFinite(maybeId) && maybeId > 0) {
          assetIdSet.add(maybeId);
        }
      }
    }
    const assetIds = Array.from(assetIdSet);
    ```

  - If `assetIds.length > 0`:
    - Call `getSpaceAssetsByIds(task.space_id, assetIds)`.
    - Map returned `SpaceAssetRecord`s into `ResolvedPromptImageRef[]`:

      ```ts
      const assetsById = new Map(spaceAssets.map((a) => [a.id, a]));

      const resolvedImageRefs: ResolvedPromptImageRef[] = [];
      for (const ref of collectedRefs) {
        for (const rawId of ref.assetIds) {
          const id = Number(rawId);
          const asset = assetsById.get(id);
          if (!asset) continue;
          resolvedImageRefs.push({
            scope: ref.scope,
            definitionName: ref.definitionName,
            assetType: ref.binding.assetType,
            assetName: asset.name,
            url: asset.file_url,
          });
        }
      }
      ```

  - Pass `resolvedImageRefs` into `renderPrompt`:

    ```ts
    const finalPrompt = renderPrompt({
      taskPrompt: prompt,
      characters: preparedCharacters,
      style: styleMeta,
      scene: sceneMeta,
      imageReferences: resolvedImageRefs,
    });
    ```

  - If `assetIds` is empty, call `renderPrompt` without `imageReferences` (or with an empty array) to preserve current behavior.

Testing:
- Run through a full render flow with:
  - A character that has one or more attached base reference images.
  - Optionally, scene/style reference images once their bindings are in place.
  - Confirm, via DEBUG_PROMPT logs, that:
    - The IMAGE REFERENCES section lists the expected URLs.
    - The rest of the prompt remains unchanged.

Checkpoint:
- Task renders now include real image references in the prompt when attached; otherwise they fall back to the previous “no image reference constraints” wording.

---

### Step 5 — Robustness, logging, and graceful degradation
**Status: Pending**

Implementation:
- Handle partial failures gracefully:
  - If some asset IDs in metadata are missing in `space_assets` (e.g., deleted assets):
    - Skip those entries silently for now; optionally add a debug log in the server console (`[assets] Missing space asset for id=...`).
  - If `getSpaceAssetsByIds` throws an error:
    - Log an error (`[assets] Failed to load space assets for prompt; continuing without image references`).
    - Proceed with `imageReferences` omitted so renders still work.
- DEBUG_PROMPT:
  - Keep using `renderImageWithGemini` as-is; the prompt logging there will now naturally include the new IMAGE REFERENCES section.
  - Optionally add a brief log in `tasks_routes.ts` indicating how many references were resolved:

    ```ts
    if (resolvedImageRefs.length > 0) {
      console.log(`[tasks] Resolved ${resolvedImageRefs.length} image references for prompt.`);
    }
    ```

Testing:
- Simulate missing assets by:
  - Attaching an asset ID to a definition.
  - Deleting that asset from `space_assets`.
  - Confirm renders still succeed, just without those missing images in the prompt.

Checkpoint:
- The system handles edge cases without breaking the render pipeline and surfaces useful debugging information when DEBUG_PROMPT is enabled.

---

## 3. Progress Tracking

- Step 1 — Define server-side types and helpers for resolved asset references: Pending  
- Step 2 — Implement service helper to load `space_assets` by ID: Pending  
- Step 3 — Extend `renderPrompt` to accept structured image references and render IMAGE REFERENCES: Pending  
- Step 4 — Wire asset collection and resolution into the task render route: Pending  
- Step 5 — Robustness, logging, and graceful degradation: Pending  

Once Plan 19_3 is complete, prompts will contain a structured IMAGE REFERENCES section that ties Space assets to specific characters, scenes, and styles, with URLs and guidance text that improve model alignment while remaining fully config-driven and resilient to config changes or asset churn.

