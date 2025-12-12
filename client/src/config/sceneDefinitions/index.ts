import type { SceneDefinitionConfig } from "./types";
import { coreSceneCategory } from "./coreScene";
import { spatialLayoutCategory } from "./spatialLayout";
import { lightingCategory } from "./lighting";
import { atmosphereCategory } from "./atmosphere";
import { colorEnvironmentCategory } from "./colorEnvironment";
import { cameraAndCompositionCategory } from "./cameraAndComposition";
import { propsAndSetDressCategory } from "./propsAndSetDress";
import { sceneLoreCategory } from "./sceneLore";

export * from "./types";

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
