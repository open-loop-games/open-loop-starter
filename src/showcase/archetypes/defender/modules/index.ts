import type { EngineModule } from '@open-loop/engine';
import type { DefenderData } from '../data/types';
import { createTuningModule } from './tuning';
import { createMapModule } from './map';
import { createTowersModule } from './towers';
import { createBloonsModule } from './bloons';
import { createRoundModule } from './round';

export { DefenderDataKey, DefenderTuningRegistryKey, type DefenderTunableKey } from './tuning';
export { MapKey, getMap, type MapApi, type MapCell } from './map';
export { TowersKey, TowerShopKey, getTowers, type TowersApi } from './towers';
export {
  BloonsKey,
  WaveSequencerKey,
  getBloons,
  type BloonsApi,
  type WaveStreamMeta,
} from './bloons';
export { RoundKey, getRound, type RoundApi, type MatchOutcome } from './round';

/**
 * Compose the Defender modules in dependency order. The engine topo-sorts on
 * `dependencies`; listing in order keeps the source readable.
 *
 *  1. `defender/tuning` — registry + data publish (no dependencies).
 *  2. `defender/map` — spatial grid + static path (deps: tuning).
 *  3. `defender/towers` — shop + placed towers + per-tower TimedProgress
 *     cooldowns + targeting + fire (deps: tuning, map).
 *  4. `defender/bloons` — wave-stream sequencer + bloon lifecycle + shedding
 *     via internal `spawnBloon` (deps: tuning, map).
 *  5. `defender/round` — money + lives + round counter + win/loss predicate
 *     + round-clear bonus orchestration (deps: tuning, bloons, towers).
 *
 * Phase 1 ships all five as STUBS publishing only the injection keys and
 * api contracts. `tuning` is the only fully-implemented module — its body
 * (registry creation + data publish) is the foundation Phase 2 fan-out
 * branches consume.
 */
export function createDefenderModules(data: DefenderData): EngineModule[] {
  return [
    createTuningModule(data),
    createMapModule(data),
    createTowersModule(data),
    createBloonsModule(data),
    createRoundModule(data),
  ];
}
