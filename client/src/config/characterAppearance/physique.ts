import type { AppearanceCategory } from './types';

export const physiqueCategory: AppearanceCategory = {
  key: 'physique',
  label: 'Physique',
  order: 5,
  description:
    'Overall body shape, proportions, and musculature that affect silhouette.',
  properties: [
    {
      key: 'overall_body_shape',
      label: 'Overall body shape',
      type: 'string',
    },
    { key: 'shoulder_width', label: 'Shoulder width', type: 'string' },
    { key: 'waist_definition', label: 'Waist definition', type: 'string' },
    { key: 'torso_length', label: 'Torso length', type: 'string' },
    { key: 'leg_length', label: 'Leg length', type: 'string' },
    { key: 'musculature', label: 'Musculature', type: 'string' },
  ],
};

