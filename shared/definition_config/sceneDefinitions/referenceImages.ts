import type { SceneCategory } from "./types.js";

export const referenceImagesCategory: SceneCategory = {
  key: "reference_images",
  label: "Reference Images",
  order: 9,
  description:
    "Optional reference images that capture the overall mood, layout, or key landmarks of this scene.",
  properties: [
    {
      key: "scene_reference_image_ids",
      label: "Scene reference images",
      type: "string",
      description:
        "IDs of scene reference images stored as space assets. The UI presents these as selectable assets rather than raw IDs.",
    },
  ],
};

