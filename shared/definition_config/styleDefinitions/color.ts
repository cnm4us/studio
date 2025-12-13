import type { StyleCategory } from './types.js';

export const colorCategory: StyleCategory = {
  key: "color_and_lighting",
  label: "Color & Lighting",
  order: 3,
  description:
    "Color palette, saturation, contrast, and lighting character for this style.",
  properties: [
    {
      key: "color_palette",
      label: "Color palette",
      type: "tags",
      description:
        "High-level palette choices for the rendering style. These do not dictate scene lighting or environmental colors.",
      options: [
        { value: "bold_colors", label: "Bold Colors" },
        { value: "limited_palette", label: "Limited Palette" },
        { value: "pastel", label: "Pastel Palette" },
        { value: "high_contrast", label: "High Contrast" },
        { value: "muted", label: "Muted / Desaturated" },
      ],
      allowCustom: true,
    },
    {
      key: "saturation",
      label: "Saturation level",
      type: "enum",
      description:
        "Overall saturation level of the artwork, separate from realistic lighting.",
      options: [
        { value: "low", label: "Low Saturation" },
        { value: "medium", label: "Medium Saturation" },
        { value: "high", label: "High Saturation" },
      ],
      allowCustom: true,
    },
  ],
};
