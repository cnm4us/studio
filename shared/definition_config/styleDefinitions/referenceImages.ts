import type { StyleCategory } from "./types.js";

export const referenceImagesCategory: StyleCategory = {
  key: "reference_images",
  label: "Reference Images",
  order: 8,
  description:
    "Optional reference images that embody this style’s rendering, line work, and color treatment.",
  properties: [
    {
      key: "style_reference_image_ids",
      label: "Style reference images",
      type: "string",
      description:
        "IDs of style reference images stored as space assets. The UI presents these as selectable assets rather than raw IDs.",
    },
  ],
};

