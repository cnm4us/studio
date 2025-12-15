import type {
  CharacterAppearanceMetadata,
  StyleDefinitionMetadata,
  ReferenceConstraintMetadata,
} from './definition_metadata.js';
import {
  assetReferenceBindings,
  type AssetBinding,
} from '../../shared/definition_config/assetReferenceMapping.js';

export type PromptAssetRefScope = 'character' | 'scene' | 'style';

export type CollectedAssetRef = {
  scope: PromptAssetRefScope;
  definitionId: number;
  definitionName: string;
  binding: AssetBinding;
  assetIds: string[];
};

type CharacterInput = {
  id: number;
  name: string;
  metadata: CharacterAppearanceMetadata | null;
};

type StyleInput = {
  id: number;
  name: string;
  metadata: StyleDefinitionMetadata | null;
};

type SceneInput = {
  id: number;
  name: string;
  metadata: Record<string, unknown> | null;
};

type ReferenceConstraintInput = {
  id: number;
  name: string;
  metadata: ReferenceConstraintMetadata | null;
};

const collectIdsFromCategory = (
  category: Record<string, unknown> | undefined,
  binding: AssetBinding,
): string[] => {
  if (!category) return [];

  const primary = category[binding.metadataPropertyKey];
  const legacy =
    binding.legacyMetadataPropertyKey != null
      ? category[binding.legacyMetadataPropertyKey]
      : undefined;

  const values: unknown[] = [];
  if (primary != null) {
    values.push(primary);
  } else if (legacy != null) {
    values.push(legacy);
  }

  const result: string[] = [];

  for (const value of values) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item == null) continue;
        const str = String(item).trim();
        if (str.length > 0) {
          result.push(str);
        }
      }
    } else if (value != null) {
      const str = String(value).trim();
      if (str.length > 0) {
        result.push(str);
      }
    }
  }

  return Array.from(new Set(result));
};

export const collectAssetRefsFromMetadata = (params: {
  characters: CharacterInput[];
  style?: StyleInput | null;
  scene?: SceneInput | null;
  referenceConstraint?: ReferenceConstraintInput | null;
}): CollectedAssetRef[] => {
  const results: CollectedAssetRef[] = [];

  // Characters
  const characterBindings = assetReferenceBindings.filter(
    (binding) => binding.definitionType === 'character',
  );

  for (const character of params.characters) {
    const meta = character.metadata ?? {};

    for (const binding of characterBindings) {
      const category = (meta as any)[
        binding.metadataCategoryKey as keyof CharacterAppearanceMetadata
      ] as Record<string, unknown> | undefined;

      const assetIds = collectIdsFromCategory(category, binding);
      if (assetIds.length === 0) continue;

      results.push({
        scope: 'character',
        definitionId: character.id,
        definitionName: character.name,
        binding,
        assetIds,
      });
    }
  }

  // Style
  const styleBindingList = assetReferenceBindings.filter(
    (binding) => binding.definitionType === 'style',
  );

  const style = params.style;
  if (style && style.metadata) {
    const meta = style.metadata;

    for (const binding of styleBindingList) {
      const category = (meta as any)[
        binding.metadataCategoryKey as keyof StyleDefinitionMetadata
      ] as Record<string, unknown> | undefined;

      const assetIds = collectIdsFromCategory(category, binding);
      if (assetIds.length === 0) continue;

      results.push({
        scope: 'style',
        definitionId: style.id,
        definitionName: style.name,
        binding,
        assetIds,
      });
    }
  }

  // Scene
  const sceneBindings = assetReferenceBindings.filter(
    (binding) => binding.definitionType === 'scene',
  );

  const scene = params.scene;
  if (scene && scene.metadata) {
    const meta = scene.metadata;

    for (const binding of sceneBindings) {
      const category = (meta as any)[
        binding.metadataCategoryKey
      ] as Record<string, unknown> | undefined;

      const assetIds = collectIdsFromCategory(category, binding);
      if (assetIds.length === 0) continue;

      results.push({
        scope: 'scene',
        definitionId: scene.id,
        definitionName: scene.name,
        binding,
        assetIds,
      });
    }
  }

  // Reference constraint–owned images, mapped into character/scene/style scopes.
  const constraintBindings = assetReferenceBindings.filter(
    (binding) => binding.definitionType === 'reference_constraint',
  );

  const referenceConstraint = params.referenceConstraint;
  if (referenceConstraint && referenceConstraint.metadata) {
    const meta = referenceConstraint.metadata;

    for (const binding of constraintBindings) {
      const category = (meta as any)[
        binding.metadataCategoryKey as keyof ReferenceConstraintMetadata
      ] as Record<string, unknown> | undefined;

      const assetIds = collectIdsFromCategory(category, binding);
      if (assetIds.length === 0) continue;

      const scope: PromptAssetRefScope =
        binding.assetType === 'scene_reference'
          ? 'scene'
          : binding.assetType === 'style_reference'
          ? 'style'
          : 'character';

      results.push({
        scope,
        definitionId: referenceConstraint.id,
        definitionName: 'Reference constraint',
        binding,
        assetIds,
      });
    }
  }

  return results;
};
