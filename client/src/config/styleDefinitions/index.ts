import type { StyleDefinitionConfig } from './types';
import { coreStyleCategory } from './coreStyle';
import { lineAndDetailCategory } from './lineAndDetail';
import { lightTreatmentCategory } from './lightTreatment';
import { colorCategory } from "./color";
import { renderingTechniqueCategory } from './renderingTechnique';
import { compositionAndCameraCategory } from './compositionAndCamera';
import { moodAndAtmosphereCategory } from './moodAndAtmosphere';

export * from './types';

export const styleDefinitionConfig: StyleDefinitionConfig = {
  categories: [
    coreStyleCategory,
    lineAndDetailCategory,
    lightTreatmentCategory,
    colorCategory,
    renderingTechniqueCategory,
    compositionAndCameraCategory,
    moodAndAtmosphereCategory,
  ],
};

