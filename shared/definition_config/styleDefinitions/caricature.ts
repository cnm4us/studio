import type { StyleCategory } from './types.js';

export const caricatureCategory: StyleCategory = {
  key: 'caricature_style',
  label: 'Caricature & Exaggeration',
  order: 40,
  description:
    'Controls stylized exaggeration of proportions, facial features, and expressions for illustrated characters.',
  properties: [
    {
      key: 'exaggeration_level',
      label: 'Exaggeration level',
      type: 'enum',
      options: [
        { value: 'minimal', label: 'Minimal (near realistic)' },
        { value: 'subtle', label: 'Subtle caricature' },
        { value: 'moderate', label: 'Moderate caricature' },
        { value: 'strong', label: 'Strong caricature' },
        { value: 'extreme', label: 'Extreme caricature' },
      ],
      description:
        'High-level control over how strongly caricature exaggeration is applied.',
    },
    {
      key: 'head_body_exaggeration',
      label: 'Head-to-body exaggeration',
      type: 'enum',
      options: [
        { value: 'realistic', label: 'Realistic proportions' },
        { value: 'slight', label: 'Slightly enlarged head' },
        { value: 'moderate', label: 'Moderately oversized head' },
        {
          value: 'large',
          label: 'Noticeably oversized head (cartoon proportion)',
        },
        {
          value: 'extreme',
          label: 'Dramatically oversized head (caricature)',
        },
      ],
      description:
        'Controls how oversized the head appears relative to the body, from realistic human proportions to exaggerated caricature.',
    },
    {
      key: 'eye_exaggeration',
      label: 'Eye exaggeration',
      type: 'enum',
      options: [
        { value: 'realistic', label: 'Realistic eye proportions' },
        { value: 'slight', label: 'Slightly enlarged eyes' },
        {
          value: 'moderate',
          label: 'Moderately enlarged, expressive eyes',
        },
        { value: 'large', label: 'Large, highly expressive eyes' },
        {
          value: 'extreme',
          label: 'Dramatically oversized eyes (cartoon / caricature)',
        },
      ],
      description:
        'Controls how large and expressive the eyes appear, from realistic proportions to exaggerated cartoon-style emphasis.',
    },
    {
      key: 'mouth_exaggeration',
      label: 'Mouth exaggeration',
      type: 'enum',
      options: [
        { value: 'realistic', label: 'Realistic mouth proportions' },
        { value: 'slight', label: 'Slightly emphasized mouth' },
        {
          value: 'moderate',
          label: 'Moderately enlarged, expressive mouth',
        },
        { value: 'large', label: 'Large, highly expressive mouth' },
        {
          value: 'extreme',
          label: 'Dramatically oversized mouth (cartoon / caricature)',
        },
      ],
      description:
        'Controls how prominent and expressive the mouth appears, from realistic proportions to exaggerated caricature-style emphasis.',
    },
    {
      key: 'brow_exaggeration',
      label: 'Eyebrow exaggeration',
      type: 'enum',
      options: [
        { value: 'realistic', label: 'Natural eyebrow proportions' },
        { value: 'slight', label: 'Slightly emphasized eyebrows' },
        {
          value: 'moderate',
          label: 'Moderately exaggerated, expressive eyebrows',
        },
        { value: 'large', label: 'Bold, highly expressive eyebrows' },
        {
          value: 'extreme',
          label: 'Dramatically exaggerated eyebrows (cartoon / caricature)',
        },
      ],
      description:
        'Controls how expressive and prominent the eyebrows appear, from natural proportions to exaggerated caricature emphasis.',
    },
    {
      key: 'jaw_chin_exaggeration',
      label: 'Jaw / chin exaggeration',
      type: 'enum',
      options: [
        { value: 'realistic', label: 'Natural jawline and chin' },
        { value: 'slight', label: 'Slightly emphasized jaw or chin' },
        {
          value: 'moderate',
          label: 'Moderately exaggerated jawline or chin',
        },
        { value: 'large', label: 'Strong, stylized jawline or chin' },
        {
          value: 'extreme',
          label: 'Dramatically exaggerated jaw or chin (caricature)',
        },
      ],
      description:
        'Controls how strongly the jawline and chin are stylized, from natural anatomy to bold caricature exaggeration.',
    },
    {
      key: 'shape_elasticity',
      label: 'Elastic shape distortion',
      type: 'enum',
      options: [
        { value: 'rigid', label: 'Rigid, realistic forms' },
        { value: 'slight', label: 'Slightly softened forms' },
        {
          value: 'moderate',
          label: 'Moderately elastic, stylized forms',
        },
        { value: 'elastic', label: 'Highly elastic, cartoon-like forms' },
        {
          value: 'extreme',
          label: 'Very elastic, rubbery caricature forms',
        },
      ],
      description:
        'Controls how flexible and elastic overall shapes appear, from rigid realistic structure to highly rubbery caricature distortion.',
    },
    {
      key: 'asymmetry_level',
      label: 'Intentional asymmetry',
      type: 'enum',
      options: [
        { value: 'none', label: 'Fully symmetrical' },
        { value: 'slight', label: 'Slight, natural asymmetry' },
        {
          value: 'moderate',
          label: 'Moderate hand-drawn asymmetry',
        },
        { value: 'strong', label: 'Strong, intentional asymmetry' },
        {
          value: 'extreme',
          label: 'Highly asymmetric, exaggerated caricature',
        },
      ],
      description:
        'Controls how asymmetrical facial features and proportions appear, from clean symmetry to intentionally exaggerated, hand-drawn distortion.',
    },
    {
      key: 'silhouette_exaggeration',
      label: 'Silhouette exaggeration',
      type: 'enum',
      options: [
        { value: 'realistic', label: 'Realistic silhouette' },
        { value: 'slight', label: 'Slightly stylized silhouette' },
        {
          value: 'moderate',
          label: 'Moderately exaggerated silhouette',
        },
        { value: 'strong', label: 'Strong, stylized silhouette' },
        {
          value: 'extreme',
          label: 'Highly exaggerated silhouette (caricature)',
        },
      ],
      description:
        'Controls how strongly the character’s overall outline and proportions are exaggerated, from realistic form to bold caricature silhouette.',
    },
    {
      key: 'expression_intensity',
      label: 'Expression exaggeration',
      type: 'enum',
      options: [
        { value: 'neutral', label: 'Subtle, natural expressions' },
        { value: 'slight', label: 'Slightly expressive' },
        { value: 'moderate', label: 'Clearly expressive' },
        { value: 'strong', label: 'Highly expressive, theatrical' },
        {
          value: 'extreme',
          label: 'Over-the-top, exaggerated cartoon expressions',
        },
      ],
      description:
        'Controls how expressive and theatrical facial expressions appear, from subtle natural emotion to bold cartoon-style exaggeration.',
    },
    {
      key: 'likeness_preservation',
      label: 'Likeness preservation',
      type: 'enum',
      options: [
        { value: 'loose', label: 'Loose resemblance' },
        { value: 'approximate', label: 'Approximate likeness' },
        {
          value: 'recognizable',
          label: 'Clearly recognizable likeness',
        },
        {
          value: 'strong',
          label: 'Strong likeness preservation',
        },
        { value: 'exact', label: 'Very strong likeness preservation' },
      ],
      description:
        'Controls how closely the character’s defining features are preserved as exaggeration is applied, from loose interpretation to strong recognizability.',
    },
    {
      key: 'line_style',
      label: 'Line style',
      type: 'enum',
      options: [
        { value: 'clean', label: 'Clean, even linework' },
        { value: 'expressive', label: 'Expressive hand-drawn lines' },
        { value: 'scratchy', label: 'Scratchy, editorial ink lines' },
        { value: 'bold', label: 'Bold, heavy ink outlines' },
        { value: 'chaotic', label: 'Loose, exaggerated cartoon lines' },
      ],
      description:
        'Controls the character and expressiveness of linework, from clean illustration to bold editorial cartoon ink.',
    },
  ],
};

