import type { AppearanceCategory } from './types';

export const coreIdentityCategory: AppearanceCategory = {
  key: 'core_identity',
  label: 'Core Identity',
  order: 1,
  description:
    'High-level identity traits that help the AI maintain who this character is.',
  properties: [
    {
      key: 'name',
      label: 'Name',
      type: 'string',
      description: 'Canonical name or short identifier for this character.',
    },
    {
      key: 'age_range',
      label: 'Age / apparent age range',
      type: 'enum',
      description: 'Short code such as early_20s, mid_30s, ageless, etc.',
      allowCustom: true,
    },
    {
      key: 'gender_identity',
      label: 'Gender identity or presentation',
      type: 'enum',
      allowCustom: true,
    },
    {
      key: 'pronouns',
      label: 'Pronouns',
      type: 'enum',
      allowCustom: true,
    },
    {
      key: 'species',
      label: 'Species / race',
      type: 'enum',
      allowCustom: true,
    },
    {
      key: 'ethnicity_cues',
      label: 'Ethnicity / cultural cues',
      type: 'enum',
      allowCustom: true,
    },
    {
      key: 'height_category',
      label: 'Height category',
      type: 'string',
      description: 'Short descriptor like short, average, tall.',
    },
    {
      key: 'body_type',
      label: 'Body type',
      type: 'string',
      description: 'High-level body build (e.g. athletic, slender).',
    },
    {
      key: 'personality_keywords',
      label: 'Personality keywords',
      type: 'tags',
      description:
        'Comma-separated traits like stoic, playful, serious, chaotic_good.',
      allowCustom: true,
    },
    {
      key: 'archetype',
      label: 'Narrative archetype',
      type: 'string',
      description: 'E.g. mentor, maverick, antihero, strategist.',
    },
  ],
};

