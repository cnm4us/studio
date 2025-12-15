export type ReferenceConstraintPropertyType = 'string' | 'enum' | 'tags';

export type ReferenceConstraintOption = {
  value: string;
  label: string;
};

export type ReferenceConstraintProperty = {
  key: string;
  label: string;
  type: ReferenceConstraintPropertyType;
  description?: string;
  options?: ReferenceConstraintOption[];
  allowCustom?: boolean;
};

export type ReferenceConstraintCategory = {
  key: string;
  label: string;
  order: number;
  description?: string;
  properties: ReferenceConstraintProperty[];
};

export type ReferenceConstraintConfig = {
  categories: ReferenceConstraintCategory[];
};

