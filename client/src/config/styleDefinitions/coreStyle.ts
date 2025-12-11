import type { StyleCategory } from './types';

export const coreStyleCategory: StyleCategory = {
  key: 'core_style',
  label: 'Core Style',
  order: 1,
  description:
    'High-level style identity that describes what kind of visual world this style belongs to.',
  properties: [
    {
      key: 'render_domain',
      label: 'Render domain',
      type: 'enum',
      description:
        'Overall rendering family for this style (e.g. comic, anime, painterly, photorealistic).',
      allowCustom: true,
    },
    {
      key: 'genre',
      label: 'Genre / subject focus',
      type: 'tags',
      description:
        'Comma-separated genres this style is best suited for (e.g. fantasy, sci_fi, slice_of_life).',
      allowCustom: true,
    },
    {
      key: 'influences',
      label: 'Visual influences',
      type: 'tags',
      description:
        'Optional shorthand for influences or reference traditions (e.g. European BD, Saturday-morning cartoon).',
      allowCustom: true,
    },
  ],
};

