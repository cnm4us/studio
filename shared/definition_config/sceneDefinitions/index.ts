import type { SceneDefinitionConfig } from "./types.js";
import { coreSceneCategory } from "./coreScene.js";
import { spatialLayoutCategory } from "./spatialLayout.js";
import { lightingCategory } from "./lighting.js";
import { atmosphereCategory } from "./atmosphere.js";
import { colorEnvironmentCategory } from "./colorEnvironment.js";
import { cameraAndCompositionCategory } from "./cameraAndComposition.js";
import { propsAndSetDressCategory } from "./propsAndSetDress.js";
import { sceneLoreCategory } from "./sceneLore.js";

export * from "./types.js";

export const sceneDefinitionConfig: SceneDefinitionConfig = {
  categories: [
    coreSceneCategory,
    spatialLayoutCategory,
    lightingCategory,
    atmosphereCategory,
    colorEnvironmentCategory,
    cameraAndCompositionCategory,
    propsAndSetDressCategory,
    sceneLoreCategory,
  ],
};
