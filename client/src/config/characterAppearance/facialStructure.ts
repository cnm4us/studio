import type { AppearanceCategory } from './types';

export const facialStructureCategory: AppearanceCategory = {
  key: 'facial_structure',
  label: 'Facial Structure',
  order: 2,
  description:
    'Face shape, features, and overall structure that make the character recognizable.',
  properties: [
    { key: 'face_shape', label: 'Face shape', type: 'string' },
    { key: 'jawline', label: 'Jawline', type: 'string' },
    { key: 'cheek_structure', label: 'Cheek structure', type: 'string' },
    {
      key: 'forehead_proportion',
      label: 'Forehead proportion',
      type: 'string',
    },
    { key: 'eye_shape', label: 'Eye shape', type: 'string' },
    { key: 'eye_size', label: 'Eye size', type: 'string' },
    { key: 'eye_color', label: 'Eye color', type: 'string' },
    { key: 'eyebrow_shape', label: 'Eyebrow shape', type: 'string' },
    { key: 'nose_shape', label: 'Nose shape', type: 'string' },
    { key: 'mouth_shape', label: 'Mouth shape', type: 'string' },
    { key: 'chin_shape', label: 'Chin shape', type: 'string' },
  ],
};

