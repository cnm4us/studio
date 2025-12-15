import type {
  CharacterAppearanceMetadata,
  StyleDefinitionMetadata,
  ReferenceConstraintMetadata,
} from './definition_metadata.js';
import {
  findCharacterCategory,
  findCharacterProperty,
  findSceneCategory,
  findSceneProperty,
  findStyleCategory,
  findStyleProperty,
  resolveOptionLabel,
} from './definition_config_helpers.js';
import { referenceConstraintConfig } from '../../shared/definition_config/referenceConstraints/index.js';
import {
  assetReferenceBindings,
  type AssetReferenceType,
} from '../../shared/definition_config/assetReferenceMapping.js';
import type { PromptAssetRefScope } from './asset_reference_helpers.js';

export type RenderCharacterInput = {
  name: string;
  metadata: CharacterAppearanceMetadata | null;
};

export type ResolvedPromptImageRef = {
  scope: PromptAssetRefScope;
  definitionName: string;
  assetType: AssetReferenceType;
  assetName: string;
  url: string;
};

export type RenderPromptOptions = {
  taskPrompt: string;
  characters: RenderCharacterInput[];
  style: StyleDefinitionMetadata | null;
  scene: unknown | null;
  referenceConstraint?: ReferenceConstraintMetadata | null;
  referenceConstraintName?: string | null;
  imageReferences?: ResolvedPromptImageRef[];
};

const SECTION_IMAGE_REFERENCES = 'IMAGE REFERENCES';
const SECTION_REFERENCE_CONSTRAINTS = 'REFERENCE CONSTRAINTS';
const SECTION_STYLE = 'STYLE';
const SECTION_CHARACTERS = 'CHARACTERS';
const SECTION_SCENE = 'SCENE';
const SECTION_TASK = 'TASK';
const SECTION_TEXT_ELEMENTS = 'TEXT ELEMENTS';

const CHARACTER_CATEGORY_ORDER: Array<keyof CharacterAppearanceMetadata> = [
  'core_identity',
  'facial_structure',
  'hair',
  'skin',
  'physique',
  'distinctive_markers',
  'clothing_defaults',
  'character_lore',
  'base_reference_images',
];

const STYLE_CATEGORY_ORDER: Array<keyof StyleDefinitionMetadata> = [
  'core_style',
  'line_and_detail',
  'color_and_lighting',
  'rendering_technique',
  'composition_and_camera',
  'mood_and_atmosphere',
];

const CHARACTER_ASSET_KEYS_BY_CATEGORY = new Map<string, Set<string>>();
const STYLE_ASSET_KEYS_BY_CATEGORY = new Map<string, Set<string>>();
const SCENE_ASSET_KEYS_BY_CATEGORY = new Map<string, Set<string>>();

for (const binding of assetReferenceBindings) {
  const targetMap =
    binding.definitionType === 'character'
      ? CHARACTER_ASSET_KEYS_BY_CATEGORY
      : binding.definitionType === 'scene'
      ? SCENE_ASSET_KEYS_BY_CATEGORY
      : STYLE_ASSET_KEYS_BY_CATEGORY;

  const categoryKey = binding.metadataCategoryKey;
  let set = targetMap.get(categoryKey);
  if (!set) {
    set = new Set<string>();
    targetMap.set(categoryKey, set);
  }

  set.add(binding.metadataPropertyKey);
  if (binding.legacyMetadataPropertyKey) {
    set.add(binding.legacyMetadataPropertyKey);
  }
}

const humanizeKey = (key: string): string => {
  const withSpaces = key.replace(/_/g, ' ');
  if (!withSpaces) return '';
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
};

function formatScalarValue(
  value: unknown,
  options?: { value: string; label: string }[],
): string | null {
  if (value == null) return null;

  if (typeof value === 'string') {
    // If this property has predefined options, prefer the option label.
    const label = resolveOptionLabel(options ?? [], value);
    if (label) return label;
    // For custom or free-text values, respect the text as-is.
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return null;
}

const formatValue = (
  value: unknown,
  options?: { value: string; label: string }[],
): string | null => {
  if (value == null) return null;

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => {
        if (item == null) return '';
        return formatScalarValue(item, options) ?? '';
      })
      .filter((part) => part.length > 0);

    return parts.length > 0 ? parts.join(', ') : null;
  }

  return formatScalarValue(value, options);
};

const ASSET_TYPE_LABELS: Record<AssetReferenceType, string> = {
  character_face: 'Character reference images',
  character_body: 'Body reference images',
  character_hair: 'Hair reference images',
  character_full: 'Full-character reference images',
  character_prop: 'Prop reference images',
  character_clothing: 'Clothing reference images',
  scene_reference: 'Scene reference images',
  style_reference: 'Style reference images',
};

const SCOPE_LABELS: Record<PromptAssetRefScope, string> = {
  character: 'Character references',
  scene: 'Scene references',
  style: 'Style references',
};

const renderImageReferencesSection = (
  imageReferences?: ResolvedPromptImageRef[],
): string => {
  if (!imageReferences || imageReferences.length === 0) {
    return [
      SECTION_IMAGE_REFERENCES,
      '- No image reference constraints provided.',
    ].join('\n');
  }

  const lines: string[] = [];
  lines.push(SECTION_IMAGE_REFERENCES);

  const scopes: PromptAssetRefScope[] = ['character', 'scene', 'style'];

  for (const scope of scopes) {
    const refsForScope = imageReferences.filter(
      (ref) => ref.scope === scope,
    );
    if (refsForScope.length === 0) continue;

    const allFromConstraint = refsForScope.every(
      (ref) => ref.definitionName === 'Reference constraint',
    );

    if (allFromConstraint) {
      // Constraint-only references: present them as a simple block.
      lines.push('Reference constraint:');

      const byType = new Map<AssetReferenceType, ResolvedPromptImageRef[]>();
      for (const ref of refsForScope) {
        const existing = byType.get(ref.assetType);
        if (existing) {
          existing.push(ref);
        } else {
          byType.set(ref.assetType, [ref]);
        }
      }

      for (const [assetType, refsOfType] of byType.entries()) {
        const typeLabel = ASSET_TYPE_LABELS[assetType] ?? assetType;
        for (const ref of refsOfType) {
          lines.push(`- ${ref.assetName} — ${typeLabel}`);
        }
      }

      lines.push('');
      continue;
    }

    // Mixed references (characters/scenes/styles and possibly constraints) —
    // use the existing scoped layout.
    lines.push(`${SCOPE_LABELS[scope]}:`);

    const byDefinition = new Map<string, ResolvedPromptImageRef[]>();
    for (const ref of refsForScope) {
      const key = ref.definitionName || 'Unnamed';
      const existing = byDefinition.get(key);
      if (existing) {
        existing.push(ref);
      } else {
        byDefinition.set(key, [ref]);
      }
    }

    for (const [definitionName, refsForDef] of byDefinition.entries()) {
      const byType = new Map<AssetReferenceType, ResolvedPromptImageRef[]>();
      for (const ref of refsForDef) {
        const existing = byType.get(ref.assetType);
        if (existing) {
          existing.push(ref);
        } else {
          byType.set(ref.assetType, [ref]);
        }
      }

      for (const [assetType, refsOfType] of byType.entries()) {
        const typeLabel = ASSET_TYPE_LABELS[assetType] ?? assetType;
        lines.push(`- ${definitionName} — ${typeLabel}:`);
        for (const ref of refsOfType) {
          lines.push(`  - ${ref.assetName}`);
        }
      }
    }

    lines.push('');
  }

  return lines.join('\n').trimEnd();
};

const renderReferenceConstraintsSection = (
  name: string | null | undefined,
  meta: ReferenceConstraintMetadata | null | undefined,
): string => {
  if (!meta || typeof meta !== 'object') {
    return '';
  }

  const lines: string[] = [];
  lines.push(SECTION_REFERENCE_CONSTRAINTS);

  const trimmedName = typeof name === 'string' ? name.trim() : '';
  if (trimmedName.length > 0) {
    lines.push(`- Name: ${trimmedName}`);
  }

  let hasAnyValue = false;

  const categories = referenceConstraintConfig.categories
    .slice()
    .sort((a, b) => a.order - b.order);

  for (const category of categories) {
    // Skip reference_images here; those are represented in IMAGE REFERENCES.
    if (category.key === 'reference_images') {
      continue;
    }

    const categoryValue = (meta as any)[
      category.key as keyof ReferenceConstraintMetadata
    ] as Record<string, unknown> | undefined;
    if (!categoryValue || typeof categoryValue !== 'object') {
      continue;
    }

    for (const prop of category.properties) {
      const rawValue =
        (categoryValue as Record<string, unknown>)[prop.key] ?? null;
      const formatted = formatValue(rawValue, prop.options);
      if (!formatted) continue;

      hasAnyValue = true;
      const label = prop.label ?? humanizeKey(prop.key);
      lines.push(`- ${label}: ${formatted}`);
    }
  }

  if (!hasAnyValue && !trimmedName) {
    return '';
  }

  return lines.join('\n');
};

const renderCharacterBlock = (character: RenderCharacterInput): string => {
  const lines: string[] = [];

  const meta: CharacterAppearanceMetadata = character.metadata ?? {};
  const metaCore = meta.core_identity ?? {};
  const headerName = character.name || metaCore.name || 'Character';

  lines.push(`CHARACTER — ${headerName}`);

  // Render known categories in a fixed order first.
  for (const categoryKey of CHARACTER_CATEGORY_ORDER) {
    const category = (meta as any)[categoryKey] as
      | Record<string, unknown>
      | undefined;
    if (!category || typeof category !== 'object') {
      continue;
    }

    const categoryKeyStr = String(categoryKey);
    const skipKeys = CHARACTER_ASSET_KEYS_BY_CATEGORY.get(categoryKeyStr);

    const entries = Object.entries(category).filter(
      ([key, value]) =>
        key !== 'name' &&
        value !== null &&
        value !== undefined &&
        !(skipKeys && skipKeys.has(key)),
    );
    if (entries.length === 0) {
      continue;
    }

    const categoryConfig = findCharacterCategory(categoryKeyStr);
    const categoryLabel =
      categoryConfig?.label ?? humanizeKey(String(categoryKey));

    lines.push(`${categoryLabel}:`);
    for (const [propKey, rawValue] of entries) {
      const propConfig = findCharacterProperty(
        String(categoryKey),
        String(propKey),
      );
      const formatted = formatValue(rawValue, propConfig?.options);
      if (!formatted) continue;
      const label = propConfig?.label ?? humanizeKey(propKey);
      lines.push(`- ${label}: ${formatted}`);
    }
    lines.push('');
  }

  // Render any unexpected/extra categories in a stable order after known ones.
  const knownCategorySet = new Set(CHARACTER_CATEGORY_ORDER as string[]);
  const extraCategoryKeys = Object.keys(meta).filter(
    (key) => !knownCategorySet.has(key),
  );

  for (const extraKey of extraCategoryKeys) {
    const category = (meta as any)[extraKey] as
      | Record<string, unknown>
      | undefined;
    if (!category || typeof category !== 'object') {
      continue;
    }

    const skipKeys = CHARACTER_ASSET_KEYS_BY_CATEGORY.get(extraKey);

    const entries = Object.entries(category).filter(([propKey, value]) => {
      if (value === null || value === undefined) return false;
      if (skipKeys && skipKeys.has(propKey)) return false;
      return true;
    });
    if (entries.length === 0) {
      continue;
    }

    const categoryConfig = findCharacterCategory(extraKey);
    const categoryLabel = categoryConfig?.label ?? humanizeKey(extraKey);

    lines.push(`${categoryLabel}:`);
    for (const [propKey, rawValue] of entries) {
      const propConfig = findCharacterProperty(extraKey, String(propKey));
      const formatted = formatValue(rawValue, propConfig?.options);
      if (!formatted) continue;
      const label = propConfig?.label ?? humanizeKey(propKey);
      lines.push(`- ${label}: ${formatted}`);
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd();
};

const renderStyleSection = (
  style: StyleDefinitionMetadata | null,
): string | '' => {
  if (!style) return '';

  const meta: StyleDefinitionMetadata = style;
  const lines: string[] = [];

  const knownCategorySet = new Set(STYLE_CATEGORY_ORDER as string[]);

  // Known style categories first.
  for (const categoryKey of STYLE_CATEGORY_ORDER) {
    const category = (meta as any)[categoryKey] as
      | Record<string, unknown>
      | undefined;
    if (!category || typeof category !== 'object') continue;

    const categoryKeyStr = String(categoryKey);
    const skipKeys = STYLE_ASSET_KEYS_BY_CATEGORY.get(categoryKeyStr);

    const entries = Object.entries(category).filter(([propKey, value]) => {
      if (value === null || value === undefined) return false;
      if (skipKeys && skipKeys.has(propKey)) return false;
      return true;
    });
    if (entries.length === 0) continue;

    const categoryConfig = findStyleCategory(categoryKeyStr);
    const categoryLabel =
      categoryConfig?.label ?? humanizeKey(String(categoryKey));

    lines.push(`${categoryLabel}:`);
    for (const [propKey, rawValue] of entries) {
      const propConfig = findStyleProperty(
        String(categoryKey),
        String(propKey),
      );
      const formatted = formatValue(rawValue, propConfig?.options);
      if (!formatted) continue;
      const label = propConfig?.label ?? humanizeKey(propKey);
      lines.push(`- ${label}: ${formatted}`);
    }
    lines.push('');
  }

  // Any extra categories not in STYLE_CATEGORY_ORDER.
  const extraCategoryKeys = Object.keys(meta).filter(
    (key) => !knownCategorySet.has(key),
  );

  for (const extraKey of extraCategoryKeys) {
    const category = (meta as any)[extraKey] as
      | Record<string, unknown>
      | undefined;
    if (!category || typeof category !== 'object') continue;

    const skipKeys = STYLE_ASSET_KEYS_BY_CATEGORY.get(extraKey);

    const entries = Object.entries(category).filter(([propKey, value]) => {
      if (value === null || value === undefined) return false;
      if (skipKeys && skipKeys.has(propKey)) return false;
      return true;
    });
    if (entries.length === 0) continue;

    const categoryConfig = findStyleCategory(extraKey);
    const categoryLabel = categoryConfig?.label ?? humanizeKey(extraKey);

    lines.push(`${categoryLabel}:`);
    for (const [propKey, rawValue] of entries) {
      const propConfig = findStyleProperty(extraKey, String(propKey));
      const formatted = formatValue(rawValue, propConfig?.options);
      if (!formatted) continue;
      const label = propConfig?.label ?? humanizeKey(propKey);
      lines.push(`- ${label}: ${formatted}`);
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd();
};

const renderSceneSection = (scene: unknown): string | '' => {
  if (!scene || typeof scene !== 'object' || Array.isArray(scene)) return '';

  const meta = scene as Record<string, unknown>;
  const lines: string[] = [];

  const categoryKeys = Object.keys(meta);
  if (categoryKeys.length === 0) return '';

  for (const categoryKey of categoryKeys) {
    const category = meta[categoryKey];
    if (!category || typeof category !== 'object' || Array.isArray(category)) {
      continue;
    }

    const skipKeys = SCENE_ASSET_KEYS_BY_CATEGORY.get(categoryKey);

    const entries = Object.entries(
      category as Record<string, unknown>,
    ).filter(([propKey, value]) => {
      if (value === null || value === undefined) return false;
      if (skipKeys && skipKeys.has(propKey)) return false;
      return true;
    });
    if (entries.length === 0) continue;

    const categoryConfig = findSceneCategory(categoryKey);
    const categoryLabel = categoryConfig?.label ?? humanizeKey(categoryKey);

    lines.push(`${categoryLabel}:`);
    for (const [propKey, rawValue] of entries) {
      const propConfig = findSceneProperty(categoryKey, String(propKey));
      const formatted = formatValue(rawValue, propConfig?.options);
      if (!formatted) continue;
      const label = propConfig?.label ?? humanizeKey(propKey);
      lines.push(`- ${label}: ${formatted}`);
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd();
};

export const renderPrompt = (options: RenderPromptOptions): string => {
  const {
    taskPrompt,
    characters,
    style,
    scene,
    referenceConstraint,
    referenceConstraintName,
    imageReferences,
  } = options;

  const sections: string[] = [];

  // 1. IMAGE REFERENCES
  sections.push(renderImageReferencesSection(imageReferences));

  // 2. REFERENCE CONSTRAINTS (if any)
  const constraintsSection = renderReferenceConstraintsSection(
    referenceConstraintName,
    referenceConstraint,
  );
  if (constraintsSection) {
    sections.push(constraintsSection);
  }

  // 3. STYLE
  if (style) {
    const styleBlock = renderStyleSection(style);
    if (styleBlock) {
      sections.push([SECTION_STYLE, styleBlock].join('\n'));
    }
  }

  // 4. CHARACTERS
  if (characters.length > 0) {
    const characterBlocks = characters.map((c) => renderCharacterBlock(c));
    sections.push(
      [SECTION_CHARACTERS, ...characterBlocks].join('\n\n').trimEnd(),
    );
  }

  // 5. SCENE
  if (scene) {
    const sceneBlock = renderSceneSection(scene);
    if (sceneBlock) {
      sections.push([SECTION_SCENE, sceneBlock].join('\n'));
    }
  }

  // 6. TASK
  sections.push(
    [
      SECTION_TASK,
      taskPrompt.trim().length > 0
        ? taskPrompt.trim()
        : '- No explicit task prompt provided.',
    ].join('\n'),
  );

  // 7. TEXT ELEMENTS (speech / thought bubbles)
  sections.push(
    [
      SECTION_TEXT_ELEMENTS,
      '- No speech or thought bubbles.',
    ].join('\n'),
  );

  return sections.join('\n\n');
};
