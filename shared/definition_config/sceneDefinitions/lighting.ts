import type { SceneCategory } from "./types.js";

export const lightingCategory: SceneCategory = {
  key: "lighting",
  label: "Lighting & Illumination",
  order: 3,
  description:
    "Defines the lighting conditions, directions, sources, and time-based cues of the environment. Critical for consistent mood and believable transitions across panels.",
  properties: [
    {
      key: "time_of_day",
      label: "Time of day",
      type: "enum",
      description:
        "General time context that affects mood, sky color, and light direction.",
      options: [
        { value: "pre_dawn", label: "Pre-dawn" },
        { value: "sunrise", label: "Sunrise" },
        { value: "morning", label: "Morning" },
        { value: "noon", label: "Noon" },
        { value: "afternoon", label: "Afternoon" },
        { value: "golden_hour", label: "Golden Hour" },
        { value: "sunset", label: "Sunset" },
        { value: "dusk", label: "Dusk" },
        { value: "night", label: "Night" },
        { value: "midnight", label: "Midnight" },
      ],
      allowCustom: true,
    },
    {
      key: "primary_light_source",
      label: "Primary light source",
      type: "enum",
      description:
        "Main illumination type that defines the overall lighting behavior in the scene.",
      options: [
        { value: "sunlight", label: "Sunlight" },
        { value: "moonlight", label: "Moonlight" },
        { value: "indoor_overhead", label: "Indoor Overhead Lighting" },
        { value: "lamps", label: "Lamps / Soft Lamps" },
        { value: "candlelight", label: "Candlelight" },
        { value: "firelight", label: "Firelight" },
        { value: "neon_signage", label: "Neon Signage" },
        { value: "streetlights", label: "Streetlights" },
        { value: "screen_glow", label: "Screen Glow / Monitors" },
        { value: "mixed_sources", label: "Mixed Light Sources" },
      ],
      allowCustom: true,
    },
    {
      key: "secondary_light_sources",
      label: "Secondary light sources",
      type: "list",
      itemLabel: "Add secondary source",
      description:
        "Optional additional lights (neon sign on right, window behind subject, candle on table). Useful for maintaining consistent reflections or ambience.",
    },
    {
      key: "light_direction",
      label: "Light direction",
      type: "enum",
      description:
        "Directional lighting cues, important for consistent shadows and highlights.",
      options: [
        { value: "front", label: "Front lighting" },
        { value: "back", label: "Backlighting" },
        { value: "side_left", label: "Side light (left)" },
        { value: "side_right", label: "Side light (right)" },
        { value: "top_down", label: "Top-down lighting" },
        { value: "bottom_up", label: "Upward lighting (rarer, dramatic)" },
        { value: "multi_directional", label: "Multi-directional lighting" },
      ],
      allowCustom: true,
    },
    {
      key: "lighting_intensity",
      label: "Lighting intensity",
      type: "number",
      min: 0,
      max: 100,
      step: 1,
      description:
        "Approximate brightness of the scene. Lower values imply dim or moody environments; higher values imply bright, clear lighting.",
    },
    {
      key: "shadow_style",
      label: "Shadow style",
      type: "enum",
      description:
        "Determines shadow softness, contrast, and dramatic quality.",
      options: [
        { value: "soft_shadows", label: "Soft shadows" },
        { value: "hard_shadows", label: "Hard shadows" },
        { value: "dramatic_contrast", label: "High contrast / noir shadows" },
        { value: "ambient_occlusion_heavy", label: "Heavy ambient occlusion" },
      ],
      allowCustom: true,
    },

    {
      key: "light_temperature",
      label: "Light temperature",
      type: "enum",
      description:
        "Color temperature or tone of the lighting, heavily impacting mood.",
      options: [
        { value: "cool", label: "Cool (bluish)" },
        { value: "neutral", label: "Neutral white" },
        { value: "warm", label: "Warm (yellow/orange)" },
        { value: "mixed", label: "Mixed warm + cool sources" },
      ],
      allowCustom: true,
    },

    {
      key: "lighting_notes",
      label: "Special lighting notes",
      type: "string",
      description:
        "Freeform description for advanced cues (e.g., 'volumetric rays through blinds', 'flickering neon', 'rim light outlining subject').",
    },
  ],
};
