import {
  characterAppearanceConfig,
  type AppearanceCategory,
  type AppearanceProperty,
  type AppearanceOption,
} from '../../shared/definition_config/characterAppearance/index.js';
import {
  styleDefinitionConfig,
  type StyleCategory,
  type StyleProperty,
  type StyleOption,
} from '../../shared/definition_config/styleDefinitions/index.js';
import {
  sceneDefinitionConfig,
  type SceneCategory,
  type SceneProperty,
  type SceneOption,
} from '../../shared/definition_config/sceneDefinitions/index.js';

const findCategory = <TCategory extends { key: string }>(
  categories: TCategory[],
  key: string,
): TCategory | null => {
  return categories.find((category) => category.key === key) ?? null;
};

type CategoryWithProps<TProp extends { key: string }> = {
  properties: TProp[];
};

const findProperty = <TProperty extends { key: string }>(
  category: CategoryWithProps<TProperty> | null,
  key: string,
): TProperty | null => {
  if (!category) return null;
  return category.properties.find((prop) => prop.key === key) ?? null;
};

export const findCharacterCategory = (
  categoryKey: string,
): AppearanceCategory | null =>
  findCategory<AppearanceCategory>(
    characterAppearanceConfig.categories,
    categoryKey,
  );

export const findCharacterProperty = (
  categoryKey: string,
  propKey: string,
): AppearanceProperty | null => {
  const category = findCharacterCategory(categoryKey);
  return findProperty<AppearanceProperty>(category, propKey);
};

export const findStyleCategory = (
  categoryKey: string,
): StyleCategory | null =>
  findCategory<StyleCategory>(
    styleDefinitionConfig.categories,
    categoryKey,
  );

export const findStyleProperty = (
  categoryKey: string,
  propKey: string,
): StyleProperty | null => {
  const category = findStyleCategory(categoryKey);
  return findProperty<StyleProperty>(category, propKey);
};

export const findSceneCategory = (categoryKey: string): SceneCategory | null =>
  findCategory<SceneCategory>(
    sceneDefinitionConfig.categories,
    categoryKey,
  );

export const findSceneProperty = (
  categoryKey: string,
  propKey: string,
): SceneProperty | null => {
  const category = findSceneCategory(categoryKey);
  return findProperty<SceneProperty>(category, propKey);
};

type AnyOption = AppearanceOption | StyleOption | SceneOption;

export const resolveOptionLabel = (
  options: AnyOption[] | undefined,
  value: string,
): string | null => {
  if (!options) return null;
  const match = options.find((opt) => opt.value === value);
  return match ? match.label : null;
};
