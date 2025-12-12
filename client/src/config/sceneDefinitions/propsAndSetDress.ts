import type { SceneCategory } from "./types";

export const propsAndSetDressCategory: SceneCategory = {
  key: "props_and_set_dress",
  label: "Props & Set Dressing",
  order: 7,
  description:
    "Defines recurring objects, furniture, decorations, tools, signage, and other set elements that maintain continuity across panels. Controls what exists in the space and where its visual identity comes from.",
  properties: [
    {
      key: "major_props",
      label: "Major props (persistent objects)",
      type: "list",
      itemLabel: "Add major prop",
      description:
        "Key objects that should remain stable across most shots (e.g., desk, sofa, coffee table, neon sign, bar counter, medical equipment, tree cluster).",
    },
    {
      key: "minor_props",
      label: "Minor props (optional / ambient objects)",
      type: "list",
      itemLabel: "Add minor prop",
      description:
        "Smaller objects that add texture but may not appear in every shot (e.g., books, cups, scattered papers, plants, bags, signage).",
    },
    {
      key: "anchor_prop",
      label: "Anchor prop (continuity object)",
      type: "string",
      description:
        "A special object that helps orient the viewer and supports consistent panning and shot alignment (e.g., 'the red lamp on the left table', 'the statue in the center plaza').",
    },
    {
      key: "prop_material_notes",
      label: "Material / surface notes for props",
      type: "string",
      description:
        "Optional notes describing the material feel (e.g., polished wood desk, chrome barstools, worn leather sofa, glowing runes on stone).",
    },
    {
      key: "signage_and_text_elements",
      label: "Signage / text-bearing elements",
      type: "list",
      itemLabel: "Add sign or text element",
      description:
        "Any sign, screen, poster, labels, or written materials that must remain consistent (e.g., store sign, café menu board, terminal screen display).",
    },
    {
      key: "object_layout_notes",
      label: "Object layout notes",
      type: "string",
      description:
        "Spatial notes on prop positions or relationships (e.g., 'the couch faces west window', 'lamp always on right side of desk').",
    },
    {
      key: "interactive_objects",
      label: "Interactive or narrative objects",
      type: "list",
      itemLabel: "Add interactive object",
      description:
        "Objects that characters touch, use, activate, sit on, or interact with (e.g., doors, monitors, medical tools, weapons, ritual items).",
    },
    {
      key: "forbidden_objects",
      label: "Forbidden objects",
      type: "tags",
      description:
        "Objects that should never appear in this scene (e.g., avoid modern tech in medieval tavern, no firearms in peaceful café).",
      allowCustom: true,
    },
    {
      key: "set_dress_notes",
      label: "General set dressing notes",
      type: "string",
      description:
        "Freeform notes for overall décor logic (e.g., 'minimalist Scandinavian design', 'chaotic workshop clutter', 'sleek sci-fi consoles along east wall').",
    },
  ],
};
