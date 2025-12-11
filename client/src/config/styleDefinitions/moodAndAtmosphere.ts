import type { StyleCategory } from './types';

export const moodAndAtmosphereCategory: StyleCategory = {
  key: 'mood_and_atmosphere',
  label: 'Mood & Atmosphere',
  order: 6,
  description:
    'Emotional tone and atmospheric cues this style tends to emphasize.',
  properties: [
    {
      key: 'mood_keywords',
      label: 'Mood keywords',
      type: 'tags',
      allowCustom: true,
    },
    {
      key: 'atmosphere',
      label: 'Atmosphere / environment feel',
      type: 'tags',
      description:
        'Optional cues like foggy, crisp, neon_lit, dreamlike, grounded.',
      allowCustom: true,
    },
  ],
};

