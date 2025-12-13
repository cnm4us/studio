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
    [key: string]: string | string[] | undefined;
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
    [key: string]: string | string[] | undefined;
  };
  hair?: {
    hair_color?: string;
    hair_texture?: string;
    hair_length?: string;
    hair_parting?: string;
    hair_volume?: string;
    hair_silhouette?: string;
    facial_hair?: string;
    [key: string]: string | string[] | undefined;
  };
  skin?: {
    skin_tone?: string;
    undertone?: string;
    complexion?: string;
    [key: string]: string | string[] | undefined;
  };
  physique?: {
    overall_body_shape?: string;
    shoulder_width?: string;
    waist_definition?: string;
    torso_length?: string;
    leg_length?: string;
    musculature?: string;
    [key: string]: string | string[] | undefined;
  };
  distinctive_markers?: {
    signature_expression?: string;
    signature_posture?: string;
    voice_quality?: string;
    [key: string]: string | string[] | undefined;
  };
  clothing_defaults?: {
    casual_preference?: string[];
    color_palette?: string;
    accessories?: string[];
    [key: string]: string | string[] | undefined;
  };
  character_lore?: {
    motivations?: string;
    strengths?: string[];
    flaws?: string[];
    role_in_story?: string;
    [key: string]: string | string[] | undefined;
  };
  base_reference_images?: {
    // Legacy single-ID fields (kept for compatibility)
    face_reference_image_id?: string;
    body_reference_image_id?: string;
    hair_reference_image_id?: string;
    full_character_reference_image_id?: string;
    // Preferred multi-asset fields
    face_reference_image_ids?: string[];
    body_reference_image_ids?: string[];
    hair_reference_image_ids?: string[];
    full_character_reference_image_ids?: string[];
    [key: string]: string | string[] | undefined;
  };
};

export type StyleDefinitionMetadata = {
  core_style?: {
    render_domain?: string;
    genre?: string[];
    influences?: string[];
    [key: string]: string | string[] | undefined;
  };
  line_and_detail?: {
    line_weight?: string;
    line_quality?: string[];
    detail_level?: string;
    [key: string]: string | string[] | undefined;
  };
  color_and_lighting?: {
    color_palette?: string[];
    saturation?: string;
    lighting_style?: string[];
    [key: string]: string | string[] | undefined;
  };
  rendering_technique?: {
    shading?: string;
    texture?: string[];
    surface_finish?: string;
    [key: string]: string | string[] | undefined;
  };
  composition_and_camera?: {
    camera_style?: string[];
    focal_length?: string;
    composition_notes?: string[];
    [key: string]: string | string[] | undefined;
  };
  mood_and_atmosphere?: {
    mood_keywords?: string[];
    atmosphere?: string[];
    [key: string]: string | string[] | undefined;
  };
  // Optional reference images category for styles
  reference_images?: {
    style_reference_image_ids?: string[];
    [key: string]: string | string[] | undefined;
  };
};
