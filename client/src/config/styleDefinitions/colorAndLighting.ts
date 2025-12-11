import type { StyleCategory } from './types';

export const colorAndLightingCategory: StyleCategory = {
  key: 'color_and_lighting',
  label: 'Color & Lighting',
  order: 3,
  description:
    'Color palette, saturation, contrast, and lighting character for this style.',
  properties: [
    {
      key: 'color_palette',
      label: 'Color palette',
      type: 'tags',
      allowCustom: true,
    },
    {
      key: 'saturation',
      label: 'Saturation',
      type: 'enum',
      allowCustom: true,
    },
    {
      key: 'lighting_style',
      label: 'Lighting style',
      type: 'tags',
      allowCustom: true,
    },
  ],
};

