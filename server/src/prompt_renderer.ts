import type {
  CharacterAppearanceMetadata,
  StyleDefinitionMetadata,
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

export type RenderCharacterInput = {
  name: string;
  metadata: CharacterAppearanceMetadata | null;
};

export type RenderPromptOptions = {
  taskPrompt: string;
  characters: RenderCharacterInput[];
  style: StyleDefinitionMetadata | null;
  scene: unknown | null;
};

const SECTION_IMAGE_REFERENCES = 'IMAGE REFERENCES';
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

    const entries = Object.entries(category).filter(
      ([key, value]) =>
        key !== 'name' && value !== null && value !== undefined,
    );
    if (entries.length === 0) {
      continue;
    }

    const categoryConfig = findCharacterCategory(String(categoryKey));
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

    const entries = Object.entries(category).filter(
      ([, value]) => value !== null && value !== undefined,
    );
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

    const entries = Object.entries(category).filter(
      ([, value]) => value !== null && value !== undefined,
    );
    if (entries.length === 0) continue;

    const categoryConfig = findStyleCategory(String(categoryKey));
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

    const entries = Object.entries(category).filter(
      ([, value]) => value !== null && value !== undefined,
    );
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

    const entries = Object.entries(
      category as Record<string, unknown>,
    ).filter(([, value]) => value !== null && value !== undefined);
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
  const { taskPrompt, characters, style, scene } = options;

  const sections: string[] = [];

  // 1. IMAGE REFERENCES (placeholder for now)
  sections.push(
    [
      SECTION_IMAGE_REFERENCES,
      '- No image reference constraints provided.',
    ].join('\n'),
  );

  // 2. STYLE (placeholder for now; will be expanded in later steps)
  if (style) {
    const styleBlock = renderStyleSection(style);
    if (styleBlock) {
      sections.push([SECTION_STYLE, styleBlock].join('\n'));
    }
  }

  // 3. CHARACTERS
  if (characters.length > 0) {
    const characterBlocks = characters.map((c) => renderCharacterBlock(c));
    sections.push(
      [SECTION_CHARACTERS, ...characterBlocks].join('\n\n').trimEnd(),
    );
  }

  // 4. SCENE
  if (scene) {
    const sceneBlock = renderSceneSection(scene);
    if (sceneBlock) {
      sections.push([SECTION_SCENE, sceneBlock].join('\n'));
    }
  }

  // 5. TASK
  sections.push(
    [
      SECTION_TASK,
      taskPrompt.trim().length > 0
        ? taskPrompt.trim()
        : '- No explicit task prompt provided.',
    ].join('\n'),
  );

  // 6. TEXT ELEMENTS (speech / thought bubbles)
  sections.push(
    [
      SECTION_TEXT_ELEMENTS,
      '- No speech or thought bubbles.',
    ].join('\n'),
  );

  return sections.join('\n\n');
};
