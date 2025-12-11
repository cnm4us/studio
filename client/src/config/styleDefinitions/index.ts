import type { StyleDefinitionConfig } from './types';
import { coreStyleCategory } from './coreStyle';
import { lineAndDetailCategory } from './lineAndDetail';
import { colorAndLightingCategory } from './colorAndLighting';
import { renderingTechniqueCategory } from './renderingTechnique';
import { compositionAndCameraCategory } from './compositionAndCamera';
import { moodAndAtmosphereCategory } from './moodAndAtmosphere';

export * from './types';

export const styleDefinitionConfig: StyleDefinitionConfig = {
  categories: [
    coreStyleCategory,
    lineAndDetailCategory,
    colorAndLightingCategory,
    renderingTechniqueCategory,
    compositionAndCameraCategory,
    moodAndAtmosphereCategory,
  ],
};

