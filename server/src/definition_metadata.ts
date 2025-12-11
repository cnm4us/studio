export type CharacterAppearanceMetadata = {
  core_identity?: {
    name?: string;
    age_range?: string;
    gender_identity?: string;
    pronouns?: string;
    species?: string;
    ethnicity_cues?: string;
    height_category?: string;
    body_type?: string;
    personality_keywords?: string[];
    archetype?: string;
  };
  facial_structure?: {
    face_shape?: string;
    jawline?: string;
    cheek_structure?: string;
    forehead_proportion?: string;
    eye_shape?: string;
    eye_size?: string;
    eye_color?: string;
    eyebrow_shape?: string;
    nose_shape?: string;
    mouth_shape?: string;
    chin_shape?: string;
  };
  hair?: {
    hair_color?: string;
    hair_texture?: string;
    hair_length?: string;
    hair_parting?: string;
    hair_volume?: string;
    hair_silhouette?: string;
    facial_hair?: string;
  };
  skin?: {
    skin_tone?: string;
    undertone?: string;
    complexion?: string;
  };
  physique?: {
    overall_body_shape?: string;
    shoulder_width?: string;
    waist_definition?: string;
    torso_length?: string;
    leg_length?: string;
    musculature?: string;
  };
  distinctive_markers?: {
    signature_expression?: string;
    signature_posture?: string;
    voice_quality?: string;
  };
  clothing_defaults?: {
    casual_preference?: string[];
    color_palette?: string;
    accessories?: string[];
  };
  character_lore?: {
    motivations?: string;
    strengths?: string[];
    flaws?: string[];
    role_in_story?: string;
  };
};

export type StyleDefinitionMetadata = {
  core_style?: {
    render_domain?: string;
    genre?: string[];
  };
  line_and_detail?: {
    line_weight?: string;
    line_quality?: string[];
    detail_level?: string;
  };
  color_and_lighting?: {
    color_palette?: string[];
    saturation?: string;
    lighting_style?: string[];
  };
  rendering_technique?: {
    shading?: string;
    texture?: string[];
    surface_finish?: string;
  };
  composition_and_camera?: {
    camera_style?: string[];
    focal_length?: string;
  };
  mood_and_atmosphere?: {
    mood_keywords?: string[];
    atmosphere?: string[];
  };
};

