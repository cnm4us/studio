import type { StyleCategory } from './types';

export const renderingTechniqueCategory: StyleCategory = {
  key: 'rendering_technique',
  label: 'Rendering Technique',
  order: 4,
  description:
    'Shading, texture, and rendering decisions that define how the style is realized.',
  properties: [
    {
      key: 'shading',
      label: 'Shading',
      type: 'enum',
      allowCustom: true,
    },
    {
      key: 'texture',
      label: 'Texture treatment',
      type: 'tags',
      allowCustom: true,
    },
    {
      key: 'surface_finish',
      label: 'Surface finish',
      type: 'enum',
      allowCustom: true,
    },
  ],
};

