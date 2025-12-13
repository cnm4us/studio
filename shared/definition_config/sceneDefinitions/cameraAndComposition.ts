import type { SceneCategory } from "./types.js";

export const cameraAndCompositionCategory: SceneCategory = {
  key: "camera_and_composition",
  label: "Camera & Composition",
  order: 6,
  description:
    "Defines how the scene is framed, the camera’s default position and behavior, shot types, perspective rules, and allowed movements. Essential for multi-panel continuity and cinematic storytelling.",
  properties: [
    {
      key: "default_camera_angle",
      label: "Default camera angle",
      type: "enum",
      description:
        "The baseline angle used when rendering neutral or establishing shots.",
      options: [
        { value: "eye_level", label: "Eye-level" },
        { value: "high_angle", label: "High angle (looking down)" },
        { value: "low_angle", label: "Low angle (looking up)" },
        { value: "birdseye", label: "Bird’s-eye / top-down" },
        { value: "wormseye", label: "Worm’s-eye / very low" },
        { value: "over_the_shoulder", label: "Over-the-shoulder" },
        { value: "canted_dutch", label: "Dutch / canted angle" },
      ],
      allowCustom: true,
    },
    {
      key: "default_shot_type",
      label: "Default shot type",
      type: "enum",
      description: "General framing used when no specific shot is requested.",
      options: [
        { value: "establishing_wide", label: "Establishing shot (wide)" },
        { value: "full_body", label: "Full body" },
        { value: "medium", label: "Medium shot" },
        { value: "medium_close", label: "Medium-close shot" },
        { value: "close_up", label: "Close-up" },
        { value: "extreme_close", label: "Extreme close-up" },
      ],
      allowCustom: true,
    },
    {
      key: "default_focal_length",
      label: "Default focal length",
      type: "enum",
      description:
        "Lens behavior affecting distortion, depth, and spatial compression.",
      options: [
        { value: "wide_24mm", label: "Wide (~24mm equivalent)" },
        { value: "standard_35mm", label: "Standard (~35mm)" },
        { value: "natural_50mm", label: "Natural (~50mm, human-like)" },
        { value: "portrait_85mm", label: "Portrait (~85mm)" },
        { value: "telephoto_135mm", label: "Telephoto (~135mm)" },
        { value: "fisheye", label: "Fisheye / extreme wide" },
      ],
      allowCustom: true,
    },
    {
      key: "perspective_style",
      label: "Perspective style",
      type: "enum",
      description: "Defines the geometric projection used to render the space.",
      options: [
        { value: "one_point", label: "One-point perspective" },
        { value: "two_point", label: "Two-point perspective" },
        { value: "three_point", label: "Three-point (dramatic verticals)" },
        { value: "isometric", label: "Isometric / axonometric" },
        { value: "forced_perspective", label: "Forced perspective" },
      ],
      allowCustom: true,
    },
    {
      key: "allowed_camera_movements",
      label: "Allowed camera movements",
      type: "tags",
      description:
        "Defines which cinematic movements this scene can support across panels (e.g., pan left/right, dolly in/out, crane up/down, orbit around subject).",
      options: [
        { value: "pan_left", label: "Pan left" },
        { value: "pan_right", label: "Pan right" },
        { value: "tilt_up", label: "Tilt up" },
        { value: "tilt_down", label: "Tilt down" },
        { value: "dolly_in", label: "Dolly in (move forward)" },
        { value: "dolly_out", label: "Dolly out (move backward)" },
        { value: "truck_left", label: "Truck left (sideways movement)" },
        { value: "truck_right", label: "Truck right" },
        { value: "crane_up", label: "Crane up" },
        { value: "crane_down", label: "Crane down" },
        { value: "orbit_subject", label: "Orbit around subject" },
      ],
      allowCustom: true,
    },
    {
      key: "forbidden_camera_behaviors",
      label: "Forbidden camera behaviors",
      type: "tags",
      description:
        "Movements or angles that should not be used (e.g., no fisheye, no extreme low angles, no orbiting in tight hallways).",
      allowCustom: true,
    },
    {
      key: "composition_rules",
      label: "Composition rules",
      type: "tags",
      description:
        "Guidelines for visual framing (e.g., rule of thirds, centered composition, strong leading lines, symmetrical framing).",
      options: [
        { value: "rule_of_thirds", label: "Rule of thirds" },
        { value: "centered", label: "Centered / symmetry" },
        { value: "leading_lines", label: "Leading lines" },
        { value: "foreground_framing", label: "Foreground framing elements" },
        { value: "deep_focus", label: "Deep focus composition" },
        { value: "shallow_focus", label: "Shallow focus composition" },
      ],
      allowCustom: true,
    },
    {
      key: "camera_notes",
      label: "Camera behavior notes",
      type: "string",
      description:
        "Freeform notes for highly specific recurrent framing logic (e.g., 'always show window in left third when panning east', 'character A is often foreground silhouette').",
    },
  ],
};
