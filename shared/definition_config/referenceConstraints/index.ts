import type { ReferenceConstraintConfig } from './types.js';
import {
  referenceConstraintsCategory,
  referenceConstraintImagesCategory,
} from './coreConstraints.js';

export * from './types.js';

export const referenceConstraintConfig: ReferenceConstraintConfig = {
  categories: [referenceConstraintsCategory, referenceConstraintImagesCategory],
};
