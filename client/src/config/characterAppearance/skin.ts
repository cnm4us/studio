import type { AppearanceCategory } from './types';

export const skinCategory: AppearanceCategory = {
  key: 'skin',
  label: 'Skin',
  order: 4,
  description: 'Skin tone, undertone, and complexion.',
  properties: [
    { key: 'skin_tone', label: 'Skin tone', type: 'string' },
    { key: 'undertone', label: 'Undertone', type: 'string' },
    { key: 'complexion', label: 'Complexion', type: 'string' },
  ],
};

