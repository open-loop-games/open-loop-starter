import type { PurchasableCategory } from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import type { UnlockDef } from '../data/types';
import { UnlocksKey } from '../modules';

/**
 * Access the visibility-unlock category. Reads `bought.value` on each entry to
 * drive UI gating (producer rows hidden until their unlock fires, scene-variant
 * unlocks bridged into the ZoneSystem in `modules/scene.ts`, achievement-grid
 * affordance gated by `garden-almanac`, etc.).
 */
export function useUnlocks(): PurchasableCategory<UnlockDef> {
  return useModule(UnlocksKey);
}
