import type { AppearanceCategory } from './types';

export const hairCategory: AppearanceCategory = {
  key: 'hair',
  label: 'Hair',
  order: 3,
  description: 'Hair color, texture, and styling.',
  properties: [
    { key: 'hair_color', label: 'Hair color', type: 'string' },
    { key: 'hair_texture', label: 'Hair texture', type: 'string' },
    { key: 'hair_length', label: 'Hair length', type: 'string' },
    { key: 'hair_parting', label: 'Hair parting', type: 'string' },
    { key: 'hair_volume', label: 'Hair volume', type: 'string' },
    { key: 'hair_silhouette', label: 'Hair silhouette', type: 'string' },
    { key: 'facial_hair', label: 'Facial hair', type: 'string' },
  ],
};

