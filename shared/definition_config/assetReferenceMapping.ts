export type AssetReferenceType =
  | 'character_face'
  | 'character_body'
  | 'character_hair'
  | 'character_full'
  | 'character_prop'
  | 'character_clothing'
  | 'scene_reference'
  | 'style_reference';

export type AssetBinding = {
  definitionType: 'character' | 'scene' | 'style' | 'reference_constraint';
  // Category key in the definition config
  categoryKey: string;
  // Property key in the category config
  propertyKey: string;
  // Where in metadata we store IDs (category + property key)
  metadataCategoryKey: string;
  metadataPropertyKey: string;
  // Optional legacy single-value property key in metadata
  legacyMetadataPropertyKey?: string;
  // Space asset type this property corresponds to
  assetType: AssetReferenceType;
};

export const assetReferenceBindings: AssetBinding[] = [
  // Character base reference images
  {
    definitionType: 'character',
    categoryKey: 'base_reference_images',
    propertyKey: 'face_reference_image_id',
    metadataCategoryKey: 'base_reference_images',
    metadataPropertyKey: 'face_reference_image_ids',
    legacyMetadataPropertyKey: 'face_reference_image_id',
    assetType: 'character_face',
  },
  {
    definitionType: 'character',
    categoryKey: 'base_reference_images',
    propertyKey: 'body_reference_image_id',
    metadataCategoryKey: 'base_reference_images',
    metadataPropertyKey: 'body_reference_image_ids',
    legacyMetadataPropertyKey: 'body_reference_image_id',
    assetType: 'character_body',
  },
  {
    definitionType: 'character',
    categoryKey: 'base_reference_images',
    propertyKey: 'hair_reference_image_id',
    metadataCategoryKey: 'base_reference_images',
    metadataPropertyKey: 'hair_reference_image_ids',
    legacyMetadataPropertyKey: 'hair_reference_image_id',
    assetType: 'character_hair',
  },
  {
    definitionType: 'character',
    categoryKey: 'base_reference_images',
    propertyKey: 'full_character_reference_image_id',
    metadataCategoryKey: 'base_reference_images',
    metadataPropertyKey: 'full_character_reference_image_ids',
    legacyMetadataPropertyKey: 'full_character_reference_image_id',
    assetType: 'character_full',
  },
  // Scene reference images (single category/property, multi-asset metadata)
  {
    definitionType: 'scene',
    categoryKey: 'reference_images',
    propertyKey: 'scene_reference_image_ids',
    metadataCategoryKey: 'reference_images',
    metadataPropertyKey: 'scene_reference_image_ids',
    assetType: 'scene_reference',
  },
  // Style reference images
  {
    definitionType: 'style',
    categoryKey: 'reference_images',
    propertyKey: 'style_reference_image_ids',
    metadataCategoryKey: 'reference_images',
    metadataPropertyKey: 'style_reference_image_ids',
    assetType: 'style_reference',
  },
  // Reference constraint-owned images
  {
    definitionType: 'reference_constraint',
    categoryKey: 'reference_images',
    propertyKey: 'character_reference_image_ids',
    metadataCategoryKey: 'reference_images',
    metadataPropertyKey: 'character_reference_image_ids',
    assetType: 'character_face',
  },
  {
    definitionType: 'reference_constraint',
    categoryKey: 'reference_images',
    propertyKey: 'scene_reference_image_ids',
    metadataCategoryKey: 'reference_images',
    metadataPropertyKey: 'scene_reference_image_ids',
    assetType: 'scene_reference',
  },
  {
    definitionType: 'reference_constraint',
    categoryKey: 'reference_images',
    propertyKey: 'style_reference_image_ids',
    metadataCategoryKey: 'reference_images',
    metadataPropertyKey: 'style_reference_image_ids',
    assetType: 'style_reference',
  },
];

export const findAssetBinding = (
  definitionType: 'character' | 'scene' | 'style' | 'reference_constraint',
  categoryKey: string,
  propertyKey: string,
): AssetBinding | undefined =>
  assetReferenceBindings.find(
    (binding) =>
      binding.definitionType === definitionType &&
      binding.categoryKey === categoryKey &&
      binding.propertyKey === propertyKey,
  );
