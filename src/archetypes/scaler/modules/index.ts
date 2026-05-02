import type { EngineModule } from 'open-loop-engine';
import type { ScalerData } from '../data/types';
import { createAntimatterModule } from './antimatter';
import { createPrestigeModule } from './prestige';
import { createTranscendModule } from './transcend';
import { createResetsModule } from './resets';
import { createAchievementsModule } from './achievements';
import { createCategoriesModule } from './categories';

// Re-exports for the composables / UI layer.
export {
  AntimatterAcceleratorKey,
  AntimatterCoinKey,
  AntimatterMultiplierKey,
  AntimatterProducersKey,
  AntimatterRateChainsKey,
  AntimatterTotalRateKey,
} from './antimatter';
export {
  CrystalUpgradesKey,
  PrestigeConversionKey,
  PrestigePointsKey,
  PrestigeProducersKey,
  PrestigeRateChainsKey,
  PrestigeShardRateKey,
  PrestigeShardsKey,
} from './prestige';
export {
  AcceleratorBoostKey,
  ChallengesKey,
  TranscendConversionKey,
  TranscendPointsKey,
  TranscendProducersKey,
  TranscendRateChainsKey,
  TranscendShardRateKey,
  TranscendShardsKey,
  TranscendUpgradesKey,
} from './transcend';
export { AntimatterResetKey, PrestigeResetKey, TranscendResetKey } from './resets';
export { AchievementsKey } from './achievements';

/**
 * Compose the scaler modules in dependency order. Engine topological-sort
 * picks up `dependencies` declared on each module; this list is the input
 * order, and the engine resolves the install + connect order from the
 * declared edges.
 *
 *   antimatter
 *      │
 *      ▼
 *   prestige  ──→ resets ──→ achievements ──→ categories
 *      │
 *      ▼
 *   transcend
 *
 * Modules close over `data` at construction. Per-tier conversion lives in
 * the tier module's connect() phase (paired with the matching reset from
 * scaler/resets). Cross-tier orchestration (reset composition, modifier
 * chain composition for cross-tier achievement / challenge effects) lives
 * in resets.ts + the per-tier modules' rateChain wiring.
 */
export function createScalerModules(data: ScalerData): EngineModule[] {
  return [
    createAntimatterModule(data),
    createPrestigeModule(data),
    createTranscendModule(data),
    createResetsModule(),
    createAchievementsModule(data),
    createCategoriesModule(),
  ];
}
