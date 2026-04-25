import { inject } from 'vue';
import type { Engine, PurchasableCategory } from 'open-loop-engine';
import type { UnlockDef } from '../data/types';
import { UnlocksKey } from '../modules';

/**
 * Access the visibility-unlock category. Reads `bought.value` on each entry to
 * drive UI gating (producer rows hidden until their unlock fires, scene-variant
 * unlocks bridged into the ZoneSystem in `modules/scene.ts`, achievement-grid
 * affordance gated by `garden-almanac`, etc.).
 */
export function useUnlocks(): PurchasableCategory<UnlockDef> {
  const engine = inject<Engine>('engine');
  const unlocks = engine?.tryInject(UnlocksKey);
  if (!unlocks) {
    throw new Error('useUnlocks() called outside an active ambient engine');
  }
  return unlocks;
}
