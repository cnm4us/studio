// types.ts — Scene Definitions

// Scene fields need more flexibility than style fields,
// so we broaden the allowed property types.
export type ScenePropertyType =
  | "string"
  | "enum"
  | "tags"
  | "number"
  | "boolean"
  | "list"; // for lists of objects, props, landmarks, etc.

// Standard option type for enums and selectable values
export type SceneOption = {
  value: string;
  label: string;
};

// Core property definition inside each category
export type SceneProperty = {
  key: string;
  label: string;
  type: ScenePropertyType;

  description?: string;

  // For enum / tags
  options?: SceneOption[];
  allowCustom?: boolean;

  // For number fields (e.g. brightness, camera elevation)
  min?: number;
  max?: number;
  step?: number;

  // For list fields — e.g., "recurringObjects", "landmarks"
  itemLabel?: string; // label for UI ("Add landmark", "Add prop")
};

// Each category is a block in the SceneDefinition UI
export type SceneCategory = {
  key: string;
  label: string;
  order: number;
  description?: string;
  properties: SceneProperty[];
};

// The full exported configuration
export type SceneDefinitionConfig = {
  categories: SceneCategory[];
};
