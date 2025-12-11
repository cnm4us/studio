import type { AppearanceCategory } from './types';

export const distinctiveMarkersCategory: AppearanceCategory = {
  key: 'distinctive_markers',
  label: 'Distinctive Markers',
  order: 6,
  description:
    'Recurring expressions, postures, or voice qualities that define the character.',
  properties: [
    {
      key: 'signature_expression',
      label: 'Signature expression',
      type: 'string',
    },
    {
      key: 'signature_posture',
      label: 'Signature posture',
      type: 'string',
    },
    { key: 'voice_quality', label: 'Voice quality', type: 'string' },
  ],
};

