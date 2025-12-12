import type { StyleCategory } from './types';

export const lightTreatmentCategory: StyleCategory = {
  key: "color_and_lighting",
  label: "Color & Lighting",
  order: 3,
  description:
    "Color palette, saturation, contrast, and lighting character for this style.",
  properties: [
    {
      key: "lighting_style",
      label: "Lighting style",
      type: "tags",
      options: [
        { value: "soft_light", label: "Soft, Even Light" },
        { value: "dramatic_light", label: "Dramatic / High Contrast Light" },
        { value: "rim_light", label: "Rim Lighting" },
        { value: "studio_light", label: "Studio Lighting" },
        { value: "ambient_light", label: "Ambient / Environmental Light" },
      ],
      allowCustom: true,
    },
  ],
};
