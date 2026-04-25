import type { AmbientData } from './types';
import { ACHIEVEMENTS } from './achievements';
import { AMBIENT_BALANCE, AUTO_PRODUCERS } from './producers';
import { SCENE_VARIANTS } from './scene-variants';
import { UNLOCKS } from './unlocks';

export * from './types';
export { ACHIEVEMENTS } from './achievements';
export { AMBIENT_BALANCE, AUTO_PRODUCERS } from './producers';
export { SCENE_VARIANTS } from './scene-variants';
export { UNLOCKS } from './unlocks';
export { applyAmbientOverrides, type AmbientOverrides } from './overrides';

export const DEFAULT_AMBIENT_DATA: AmbientData = {
  producers: AUTO_PRODUCERS,
  unlocks: UNLOCKS,
  achievements: ACHIEVEMENTS,
  sceneVariants: SCENE_VARIANTS,
  balance: AMBIENT_BALANCE,
};
