import type { CharacterAppearanceConfig } from './types';
import { coreIdentityCategory } from './coreIdentity';
import { facialStructureCategory } from './facialStructure';
import { hairCategory } from './hair';
import { skinCategory } from './skin';
import { physiqueCategory } from './physique';
import { distinctiveMarkersCategory } from './distinctiveMarkers';
import { clothingDefaultsCategory } from './clothingDefaults';
import { characterLoreCategory } from './characterLore';
import { baseReferenceImagesCategory } from './baseReferenceImages';

export * from './types';

export const characterAppearanceConfig: CharacterAppearanceConfig = {
  categories: [
    coreIdentityCategory,
    facialStructureCategory,
    hairCategory,
    skinCategory,
    physiqueCategory,
    distinctiveMarkersCategory,
    clothingDefaultsCategory,
    characterLoreCategory,
    baseReferenceImagesCategory,
  ],
};

