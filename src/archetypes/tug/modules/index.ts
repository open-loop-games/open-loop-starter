import type { EngineModule } from 'open-loop-engine';
import type { TugData } from '../data/types';
import { createTuningModule } from './tuning';
import { createIncomeSideModule } from './income';
import { createLaneModule } from './lane';
import { createUnitsSideModule } from './units';
import { createCategoriesModule } from './categories';
import { createMatchModule } from './match';
import { createAiOpponentModule } from './ai-opponent';
import { createMetaModule } from './meta';
import { createArcModule } from './arc';
import { createPrestigeModule } from './prestige';

export {
  SIDES,
  TugDataKey,
  TugTuningRegistryKey,
  type Side,
  type TugTunableKey,
  type TugTunables,
} from './tuning';
export { IncomeKey } from './income';
export { LaneKey, type LaneApi, type LaneEvents, type UnitInstance } from './lane';
export { UnitsKey, SequencerKey, type UnitSendMeta } from './units';
export {
  MatchKey,
  TUG_MATCH_SCOPE_MODULES,
  type MatchApi,
  type MatchEvents,
  type MatchEndedPayload,
  type MatchOutcome,
} from './match';
export { MetaKey, type MetaApi } from './meta';
export { ArcKey, type ArcState } from './arc';
export { PrestigeKey } from './prestige';

/**
 * Compose the Tug modules in dependency order. Modules close over `data` at
 * construction; overrides applied upstream in a future `boot.ts` flow
 * through unchanged.
 *
 * No runtime `withPersistentContext` wrapper around this list — the engine
 * wraps each module's install in `withPersistentContext(mod.id, ...)` at
 * `engine.start()` time, and the composer's array-creation closure runs
 * before any engine state exists. Match-scope reset semantics are encoded
 * via the explicit module-id list in `match.ts::TUG_MATCH_SCOPE_MODULES`.
 *
 * Module ordering reflects the dependency graph (the engine topo-sorts on
 * `dependencies`, but listing in order keeps the source readable):
 *
 *  1. `tug/tuning` — registry + data publish; OUTSIDE match-scope so leaf-6
 *     pushed scopes survive match resets.
 *  2. `tug/match/<side>/income` — per-side mineral resources.
 *  3. `tug/match/lane` — single shared module; both sides' unit arrays +
 *     cross-side combat.
 *  4. `tug/match/<side>/units` — per-side shop + sequencer + cooldowns.
 *  5. `tug/categories` — aggregator; both sides' unit shops.
 *  6. `tug/match` — match orchestrator; subscribes to lane + sequencers.
 *  7. `tug/match/ai-opponent` — AI policy. Strict-after-units ordering so
 *     `UnitsKey.ai` is provided before the AI tries to read it.
 *  8. `tug/meta` — cross-match state container.
 *  9. `tug/meta/arc` — beat-7 closure predicate.
 * 10. `tug/meta/prestige` — conditional; only when meta-progression is on.
 */
export function createTugModules(data: TugData): EngineModule[] {
  const modules: EngineModule[] = [
    createTuningModule(data),
    createIncomeSideModule(data, 'player'),
    createIncomeSideModule(data, 'ai'),
    createLaneModule(data),
    createUnitsSideModule(data, 'player'),
    createUnitsSideModule(data, 'ai'),
    createCategoriesModule(),
    createMatchModule(data),
    createAiOpponentModule(data),
    createMetaModule(data),
    createArcModule(data),
  ];
  if (data.balance.metaProgressionEnabled) {
    modules.push(createPrestigeModule(data));
  }
  return modules;
}
