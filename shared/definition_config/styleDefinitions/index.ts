import type { StyleDefinitionConfig } from './types.js';
import { coreStyleCategory } from './coreStyle.js';
import { lineAndDetailCategory } from './lineAndDetail.js';
import { lightTreatmentCategory } from './lightTreatment.js';
import { colorCategory } from "./color.js";
import { renderingTechniqueCategory } from './renderingTechnique.js';
import { compositionAndCameraCategory } from './compositionAndCamera.js';
import { moodAndAtmosphereCategory } from './moodAndAtmosphere.js';
import { referenceImagesCategory } from './referenceImages.js';

export * from './types.js';

export const styleDefinitionConfig: StyleDefinitionConfig = {
  categories: [
    coreStyleCategory,
    lineAndDetailCategory,
    lightTreatmentCategory,
    colorCategory,
    renderingTechniqueCategory,
    compositionAndCameraCategory,
    moodAndAtmosphereCategory,
    referenceImagesCategory,
  ],
};
