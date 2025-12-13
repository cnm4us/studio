import type { SceneCategory } from "./types.js";

export const coreSceneCategory: SceneCategory = {
  key: "core_scene",
  label: "Core Scene Identity",
  order: 1,
  description:
    "High-level scene identity describing what kind of environment this is, what world it belongs to, and its narrative purpose.",
  properties: [
    {
      key: "scene_name",
      label: "Scene name",
      type: "string",
      description:
        "Short identifier for this scene (e.g., 'Rooftop at Dawn', 'Neon Alley', 'Sharon’s Clinic Waiting Room').",
    },
    {
      key: "setting_type",
      label: "Setting type",
      type: "enum",
      description:
        "General environment category defining the nature of this location.",
      options: [
        { value: "indoor", label: "Indoor" },
        { value: "outdoor", label: "Outdoor" },
        { value: "interior_room", label: "Interior Room" },
        { value: "corridor", label: "Corridor / Hallway" },
        { value: "street", label: "Street / Alley" },
        { value: "public_square", label: "Public Square / Plaza" },
        { value: "vehicle_interior", label: "Vehicle Interior" },
        { value: "natural_landscape", label: "Natural Landscape" },
        { value: "industrial_site", label: "Industrial Site" },
        { value: "commercial_space", label: "Commercial / Shop" },
        { value: "residential_space", label: "Residential / Home" },
        { value: "fantasy_location", label: "Fantasy Location" },
        { value: "sci_fi_location", label: "Sci-Fi Location" },
      ],
      allowCustom: true,
    },
    {
      key: "genre",
      label: "Genre / world flavor",
      type: "tags",
      description:
        "Genre or worldbuilding context this scene belongs to (e.g., fantasy, sci-fi, noir, slice of life).",
      options: [
        { value: "fantasy", label: "Fantasy" },
        { value: "sci_fi", label: "Sci-Fi" },
        { value: "urban", label: "Urban / Contemporary" },
        { value: "slice_of_life", label: "Slice of Life" },
        { value: "romance", label: "Romance" },
        { value: "horror", label: "Horror" },
        { value: "noir", label: "Noir" },
        { value: "historical", label: "Historical" },
        { value: "post_apocalyptic", label: "Post-Apocalyptic" },
        { value: "dystopian", label: "Dystopian" },
        { value: "high_fantasy", label: "High Fantasy" },
        { value: "cyberpunk", label: "Cyberpunk" },
      ],
      allowCustom: true,
    },
    {
      key: "time_period",
      label: "Time period / era",
      type: "enum",
      description:
        "General indication of when this scene exists, useful for props, architecture, and ambiance.",
      options: [
        { value: "ancient", label: "Ancient / Antiquity" },
        { value: "medieval", label: "Medieval" },
        { value: "renaissance", label: "Renaissance" },
        { value: "industrial", label: "Industrial Age" },
        { value: "early_20th", label: "Early 20th Century" },
        { value: "mid_20th", label: "Mid 20th Century" },
        { value: "late_20th", label: "Late 20th Century" },
        { value: "modern_day", label: "Modern Day" },
        { value: "near_future", label: "Near Future" },
        { value: "far_future", label: "Far Future" },
        { value: "timeless", label: "Timeless / Ambiguous" },
      ],
      allowCustom: true,
    },
    {
      key: "scene_role",
      label: "Narrative role",
      type: "enum",
      description:
        "What narrative purpose this scene plays in your story or project.",
      options: [
        { value: "establishing", label: "Establishing Environment" },
        { value: "conflict", label: "Conflict / Action Area" },
        { value: "intimate_space", label: "Intimate / Personal Space" },
        { value: "public_meeting", label: "Public Meeting Place" },
        { value: "workspace", label: "Workspace / Professional Setting" },
        { value: "investigation", label: "Investigation / Search Area" },
        { value: "sanctuary", label: "Sanctuary / Safe Space" },
        { value: "transition_zone", label: "Transition Space" },
      ],
      allowCustom: true,
    },
    {
      key: "influences",
      label: "Environmental influences",
      type: "tags",
      description:
        "Optional shorthand for architectural, cultural, or visual influences (e.g., ‘Mediterranean’, ‘Art Deco’, ‘Cyberpunk Tokyo’, ‘Nordic minimalism’).",
      allowCustom: true,
    },
  ],
};
