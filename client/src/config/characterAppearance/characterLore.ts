import type { AppearanceCategory } from './types';

export const characterLoreCategory: AppearanceCategory = {
  key: 'character_lore',
  label: 'Character Lore',
  order: 8,
  description:
    'Inner motivations, strengths, and flaws that drive the character.',
  properties: [
    { key: 'motivations', label: 'Motivations', type: 'string' },
    {
      key: 'strengths',
      label: 'Strengths',
      type: 'tags',
      description:
        'Comma-separated strengths like resilient, empathetic, analytical.',
      allowCustom: true,
    },
    {
      key: 'flaws',
      label: 'Flaws',
      type: 'tags',
      description:
        'Comma-separated flaws like impulsive, secretive, stubborn.',
      allowCustom: true,
    },
    {
      key: 'role_in_story',
      label: 'Role in story',
      type: 'enum',
      description: 'E.g. protagonist, rival, supporting, antagonist.',
      allowCustom: true,
    },
  ],
};

