import type { EngineModule } from 'open-loop-engine';
import type { ScalerData } from '../data/types';
import { createAntimatterModule } from './antimatter';
import { createPrestigeModule } from './prestige';
import { createTranscendModule } from './transcend';
import { createAchievementsModule } from './achievements';
import { createAutobuyerRegistryModule } from './autobuyers';
import { createAntimatterAutobuyersModule } from './autobuyers/antimatter';
import { createPrestigeAutobuyersModule } from './autobuyers/prestige';
import { createTranscendAutobuyersModule } from './autobuyers/transcend';

// Re-exports for the composables / UI layer.
export { ScalerTiersKey, type ScalerTier } from './tiers';
export { ScalerTuningRegistryKey, type ScalerTunables } from './tuning';
export { AutobuyerMasterToggleKey, AutobuyerRegistryKey, type AutobuyerSpec } from './autobuyers';

/**
 * Compose the scaler modules in dependency order. Engine topological-sort
 * picks up `dependencies` declared on each module; this list is the input
 * order, and the engine resolves the install + connect order from the
 * declared edges.
 *
 *   antimatter
 *      │
 *      ▼
 *   prestige  ──→ achievements
 *      │
 *      ▼
 *   transcend
 *
 * Each tier module owns its own Reset (created locally in connect() with the
 * appropriate scope + `keep:` exemption for its currency). The tier API for
 * each is published into `ScalerTiersKey` — a single archetype-specific key
 * carrying the per-tier bundle. Engine-native types (Resource, Categories,
 * Conversion, Reset) flow through the engine's discovery surfaces
 * (`ResourceRegistryKey`, `CategoriesKey`) — no per-resource / per-category
 * keys.
 */
export function createScalerModules(data: ScalerData): EngineModule[] {
  return [
    createAntimatterModule(data),
    createPrestigeModule(data),
    createTranscendModule(data),
    createAchievementsModule(data),
    createAutobuyerRegistryModule(),
    createAntimatterAutobuyersModule(),
    createPrestigeAutobuyersModule(),
    createTranscendAutobuyersModule(),
  ];
}
