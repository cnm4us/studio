import type { StyleCategory } from './types.js';

export const caricatureCategory: StyleCategory = {
  key: 'caricature_style',
  label: 'Caricature & Exaggeration',
  order: 40,
  description:
    'Controls stylized exaggeration of proportions, facial features, and expressions for illustrated characters.',
  properties: [
    {
      key: 'exaggeration_strength',
      label: 'Overall exaggeration strength',
      type: 'number',
      min: 0,
      max: 100,
      step: 1,
      description:
        'Global intensity of caricature exaggeration. Low values preserve realism; higher values push stylized distortion.',
    },
    {
      key: 'head_body_exaggeration',
      label: 'Head-to-body exaggeration',
      type: 'number',
      min: 0,
      max: 100,
      step: 1,
      description:
        'Controls how oversized the head appears relative to the body. Higher values produce more cartoon-like proportions.',
    },
    {
      key: 'eye_exaggeration',
      label: 'Eye exaggeration',
      type: 'number',
      min: 0,
      max: 100,
      step: 1,
      description: 'Degree to which eyes are enlarged or emphasized.',
    },
    {
      key: 'nose_exaggeration',
      label: 'Nose exaggeration',
      type: 'number',
      min: 0,
      max: 100,
      step: 1,
      description: 'Degree to which the nose is enlarged or emphasized.',
    },
    {
      key: 'mouth_exaggeration',
      label: 'Mouth exaggeration',
      type: 'number',
      min: 0,
      max: 100,
      step: 1,
      description: 'Degree to which the mouth is enlarged or emphasized.',
    },
    {
      key: 'brow_exaggeration',
      label: 'Eyebrow exaggeration',
      type: 'number',
      min: 0,
      max: 100,
      step: 1,
      description:
        'Degree to which eyebrows are enlarged or made more expressive.',
    },
    {
      key: 'jaw_chin_exaggeration',
      label: 'Jaw / chin exaggeration',
      type: 'number',
      min: 0,
      max: 100,
      step: 1,
      description: 'Degree to which jawline or chin shape is exaggerated.',
    },
    {
      key: 'shape_elasticity',
      label: 'Elastic shape distortion',
      type: 'number',
      min: 0,
      max: 100,
      step: 1,
      description: 'Controls how rubbery or elastic overall forms appear.',
    },
    {
      key: 'asymmetry_level',
      label: 'Intentional asymmetry',
      type: 'number',
      min: 0,
      max: 100,
      step: 1,
      description:
        'Degree of intentional asymmetry in facial features and proportions.',
    },
    {
      key: 'silhouette_exaggeration',
      label: 'Silhouette exaggeration',
      type: 'number',
      min: 0,
      max: 100,
      step: 1,
      description:
        'Controls exaggeration of the character’s overall outline and proportions.',
    },
    {
      key: 'expression_intensity',
      label: 'Expression exaggeration',
      type: 'number',
      min: 0,
      max: 100,
      step: 1,
      description:
        'Controls how theatrical or expressive facial expressions appear.',
    },
    {
      key: 'likeness_preservation',
      label: 'Likeness preservation',
      type: 'number',
      min: 0,
      max: 100,
      step: 1,
      description:
        'Balances exaggeration against recognizability. Higher values retain defining traits while exaggerating form.',
    },
  ],
};

