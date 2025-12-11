import type { StyleCategory } from './types';

export const lineAndDetailCategory: StyleCategory = {
  key: 'line_and_detail',
  label: 'Line & Detail',
  order: 2,
  description:
    'Line work, edge treatment, and overall level of detail for this style.',
  properties: [
    {
      key: 'line_weight',
      label: 'Line weight',
      type: 'enum',
      allowCustom: true,
    },
    {
      key: 'line_quality',
      label: 'Line quality',
      type: 'tags',
      allowCustom: true,
    },
    {
      key: 'detail_level',
      label: 'Detail level',
      type: 'enum',
      allowCustom: true,
    },
  ],
};

