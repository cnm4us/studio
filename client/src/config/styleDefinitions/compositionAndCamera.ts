import type { StyleCategory } from './types';

export const compositionAndCameraCategory: StyleCategory = {
  key: 'composition_and_camera',
  label: 'Composition & Camera',
  order: 5,
  description:
    'Default framing, camera behavior, and compositional tendencies for this style.',
  properties: [
    {
      key: 'camera_style',
      label: 'Camera style',
      type: 'tags',
      allowCustom: true,
    },
    {
      key: 'focal_length',
      label: 'Focal length / lens feel',
      type: 'enum',
      allowCustom: true,
    },
    {
      key: 'composition_notes',
      label: 'Composition notes',
      type: 'tags',
      description:
        'Optional notes about layout tendencies (e.g. centered subjects, rule-of-thirds).',
      allowCustom: true,
    },
  ],
};

