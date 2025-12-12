import type { SceneCategory } from "./types";

export const spatialLayoutCategory: SceneCategory = {
  key: "spatial_layout",
  label: "Spatial Layout & Environment Geometry",
  order: 2,
  description:
    "Defines the physical structure, scale, and key landmarks of the environment. This ensures consistent camera movement and scene continuity across panels.",
  properties: [
    {
      key: "environment_scale",
      label: "Environment scale",
      type: "enum",
      description:
        "General spatial size of the scene, which affects framing, movement, and object spacing.",
      options: [
        {
          value: "very_small",
          label: "Very Small (tight booth, cramped alley)",
        },
        { value: "small", label: "Small (bedroom, office, shop aisle)" },
        { value: "medium", label: "Medium (living room, medium plaza)" },
        { value: "large", label: "Large (hall, warehouse, open street)" },
        { value: "vast", label: "Vast (fields, huge hangar, massive cavern)" },
      ],
      allowCustom: true,
    },
    {
      key: "primary_geometry",
      label: "Primary room / area geometry",
      type: "enum",
      description:
        "Overall shape of the environment that affects camera orientation and character placement.",
      options: [
        { value: "rectangular", label: "Rectangular Room / Space" },
        { value: "square", label: "Square Room / Space" },
        { value: "circular", label: "Circular / Round" },
        { value: "tunnel_like", label: "Long / Tunnel-like" },
        { value: "open_area", label: "Open Area (fields, plazas)" },
        { value: "multi_level", label: "Multi-Level (stairs, platforms)" },
      ],
      allowCustom: true,
    },
    {
      key: "key_landmarks",
      label: "Key landmarks / anchor points",
      type: "list",
      itemLabel: "Add landmark",
      description:
        "Major recognizable features that help maintain continuity across panels (e.g., window on east wall, statue in center, neon sign on the right).",
    },
    {
      key: "primary_axes",
      label: "Primary directional axes",
      type: "tags",
      description:
        "Optional environmental orientation cues that help with consistent panning and camera rotation (e.g., ‘north-facing window’, ‘entrance on west side’).",
      allowCustom: true,
    },
    {
      key: "entry_points",
      label: "Entrances / exits",
      type: "list",
      itemLabel: "Add entry point",
      description:
        "Locations of doors, alley openings, stairways, or paths. Useful for character movement continuity.",
    },
    {
      key: "anchored_prop",
      label: "Anchor prop (continuity object)",
      type: "string",
      description:
        "Name of the object that appears in all or most shots (e.g., desk, lamppost, tree, counter). Helps maintain spatial orientation.",
    },
    {
      key: "height_complexity",
      label: "Height complexity",
      type: "enum",
      description:
        "Indicates whether the scene has vertical layers that affect camera placement and occlusion.",
      options: [
        { value: "flat", label: "Flat (single elevation)" },
        {
          value: "varied",
          label: "Varied Heights (uneven terrain, tall shelves)",
        },
        { value: "multi_tier", label: "Multi-tier (balconies, platforms)" },
      ],
      allowCustom: true,
    },
    {
      key: "navigation_paths",
      label: "Paths / walkways / flow",
      type: "list",
      itemLabel: "Add path",
      description:
        "Lines of movement implied in the space (e.g., hallway direction, street flow, footpath). Useful for sequential storytelling.",
    },
  ],
};
