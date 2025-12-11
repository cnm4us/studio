import type { AppearanceCategory } from './types';

export const clothingDefaultsCategory: AppearanceCategory = {
  key: 'clothing_defaults',
  label: 'Clothing Defaults',
  order: 7,
  description:
    'Typical clothing and accessories the character tends to wear.',
  properties: [
    {
      key: 'casual_preference',
      label: 'Casual clothing preferences',
      type: 'tags',
      description:
        'Comma-separated descriptors like streetwear, formal, utilitarian.',
      allowCustom: true,
    },
    {
      key: 'color_palette',
      label: 'Default clothing color palette',
      type: 'string',
    },
    {
      key: 'accessories',
      label: 'Typical accessories',
      type: 'tags',
      description:
        'Comma-separated items like glasses, earrings, rings, scarf.',
      allowCustom: true,
    },
  ],
};

