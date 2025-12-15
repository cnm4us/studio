import type { ReferenceConstraintCategory } from './types.js';

export const referenceConstraintsCategory: ReferenceConstraintCategory = {
  key: 'reference_constraints',
  label: 'Reference Constraints',
  order: 1,
  description:
    'Rules governing how strictly the model should adhere to provided reference images when transforming or stylizing content.',
  properties: [
    {
      key: 'fidelity_mode',
      label: 'Reference fidelity mode',
      type: 'enum',
      options: [
        { value: 'exact', label: 'Exact Translation (No Redesign)' },
        {
          value: 'high',
          label: 'High Fidelity (Minimal Interpretation)',
        },
        {
          value: 'balanced',
          label: 'Balanced (Faithful but Stylized)',
        },
        { value: 'loose', label: 'Loose (Inspired By Reference)' },
      ],
      allowCustom: false,
      description:
        'How closely the final render should match the reference images versus allowing stylistic reinterpretation.',
    },
    {
      key: 'identity_lock',
      label: 'Character identity lock',
      type: 'enum',
      options: [
        { value: 'strict', label: 'Strict Identity Preservation' },
        {
          value: 'strong',
          label: 'Strong Likeness Preservation',
        },
        { value: 'soft', label: 'General Likeness Only' },
        { value: 'none', label: 'No Identity Constraint' },
      ],
      allowCustom: false,
      description:
        'How aggressively to preserve the character’s facial structure, proportions, and key identifying features.',
    },
    {
      key: 'layout_lock',
      label: 'Scene layout lock',
      type: 'enum',
      options: [
        { value: 'strict', label: 'Exact Layout & Geometry' },
        {
          value: 'strong',
          label: 'Preserve Layout & Proportions',
        },
        {
          value: 'soft',
          label: 'Preserve General Spatial Feel',
        },
        { value: 'none', label: 'No Layout Constraint' },
      ],
      allowCustom: false,
      description:
        'How strictly to preserve spatial layout, perspective, and major object placement from the reference scene.',
    },
    {
      key: 'camera_flexibility',
      label: 'Camera adjustment allowance',
      type: 'enum',
      options: [
        { value: 'locked', label: 'Camera Fully Locked' },
        {
          value: 'minor',
          label: 'Minor Angle / Framing Adjustments',
        },
        {
          value: 'moderate',
          label: 'Moderate Reframing Allowed',
        },
        { value: 'free', label: 'Camera Free to Reinterpret' },
      ],
      allowCustom: false,
      description:
        'How free the camera is to move away from the reference framing (angle, crop, focal length).',
    },
    {
      key: 'pose_flexibility',
      label: 'Character pose flexibility',
      type: 'enum',
      options: [
        { value: 'locked', label: 'Pose Locked to Reference' },
        {
          value: 'minor',
          label: 'Minor Posture Adjustments',
        },
        {
          value: 'adaptive',
          label: 'Adapt Pose to Task',
        },
        { value: 'free', label: 'Pose Free to Redesign' },
      ],
      allowCustom: false,
      description:
        'How much the character pose may change relative to the reference pose.',
    },
    {
      key: 'style_application',
      label: 'Style application scope',
      type: 'tags',
      options: [
        { value: 'rendering_only', label: 'Rendering Technique Only' },
        { value: 'line_work', label: 'Line & Edge Interpretation' },
        { value: 'color_palette', label: 'Color Interpretation' },
        { value: 'texture', label: 'Surface & Texture Stylization' },
        {
          value: 'shape_simplification',
          label: 'Shape Simplification Allowed',
        },
      ],
      allowCustom: true,
      description:
        'Which aspects of the reference should be stylized (rendering, line work, color, texture, shape).',
    },
  ],
};

export const referenceConstraintImagesCategory: ReferenceConstraintCategory = {
  key: 'reference_images',
  label: 'Reference Images',
  order: 10,
  description:
    'Optional reference images that this constraint governs (character, scene, or style).',
  properties: [
    {
      key: 'character_reference_image_ids',
      label: 'Character reference images',
      type: 'string',
      description:
        'IDs of character-focused reference images (typically face references for identity preservation).',
    },
    {
      key: 'scene_reference_image_ids',
      label: 'Scene reference images',
      type: 'string',
      description:
        'IDs of scene-focused reference images (layout, environment, camera framing).',
    },
    {
      key: 'style_reference_image_ids',
      label: 'Style reference images',
      type: 'string',
      description:
        'IDs of style-focused reference images (rendering, line, color treatment).',
    },
  ],
};
