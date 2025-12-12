import type { SceneCategory } from "./types";

export const sceneLoreCategory: SceneCategory = {
  key: "scene_lore",
  label: "Scene Lore & Narrative Context",
  order: 8,
  description:
    "Worldbuilding and narrative continuity details tied to this environment. Defines its history, ownership, cultural influences, plot relevance, and rules that shape how the scene behaves across panels.",
  properties: [
    {
      key: "history",
      label: "History of the scene",
      type: "string",
      description:
        "A brief history or backstory of this location (e.g., 'formerly a warehouse repurposed as a clinic', 'ancient ruins built over a leyline').",
    },
    {
      key: "recent_events",
      label: "Recent events",
      type: "list",
      itemLabel: "Add event",
      description:
        "Notable events that recently occurred here and might affect visuals (e.g., 'window shattered last night', 'ceremony just ended').",
    },
    {
      key: "scene_owner",
      label: "Owner / controlling party",
      type: "string",
      description:
        "Who owns, manages, or controls this location (e.g., 'NPC shopkeeper', 'corporate security', 'the local monarchy').",
    },
    {
      key: "cultural_influences",
      label: "Cultural / stylistic influences",
      type: "tags",
      description:
        "Relevant cultural, architectural, or aesthetic influences (e.g., 'Mediterranean', 'Art Deco', 'cyberpunk Osaka', 'Nordic minimalism').",
      allowCustom: true,
    },
    {
      key: "magic_or_tech_rules",
      label: "Magic or technology rules",
      type: "string",
      description:
        "Special rules governing how magic, tech, or physics behave here (e.g., 'holograms distort near the relic', 'spells are weaker underground').",
    },
    {
      key: "scene_restrictions",
      label: "Scene restrictions",
      type: "tags",
      description:
        "Elements or behaviors forbidden in this location (e.g., 'no visible weaponry', 'no neon lighting', 'no living plants').",
      allowCustom: true,
    },
    {
      key: "scene_hazards",
      label: "Hazards / dangers",
      type: "tags",
      description:
        "Optional environmental hazards (e.g., 'unstable floor', 'arcane energy surges', 'wet slippery surfaces', 'low oxygen').",
      allowCustom: true,
    },
    {
      key: "narrative_role_notes",
      label: "Narrative role notes",
      type: "string",
      description:
        "Extra context about why this scene matters to the story (e.g., 'meeting point for conspirators', 'hero's childhood home', 'epic confrontation happens here').",
    },
  ],
};
