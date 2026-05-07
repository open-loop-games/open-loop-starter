import type { EngineModule } from 'open-loop-engine';
import type { TugData } from '../data/types';
import { createTuningModule } from './tuning';
import { createFortressModule } from './fortress';
import { createIncomeSideModule } from './income';
import { createIncomeUpgradesSideModule } from './income-upgrades';
import { createLaneModule } from './lane';
import { createUnitsSideModule } from './units';
import { createMatchModule } from './match';
import { createOpponentBotModule } from './opponent-bot';
import { createMetaModule } from './meta';
import { createPrestigeModule } from './prestige';

export {
  LANE_LENGTH,
  SIDES,
  TugDataKey,
  TugTuningRegistryKey,
  type Side,
  type TugTunableKey,
  type TugTunables,
} from './tuning';
export { getFortress, type FortressApi } from './fortress';
export { getIncome, getIncomeRateChain } from './income';
export { getIncomeUpgrades, IncomeUpgradeRoiKey, type RoiMetrics } from './income-upgrades';
export { LaneKey, type LaneApi, type LaneEvents, type UnitInstance } from './lane';
export { getUnits, SequencerKey, UnitsCooldownKey, type UnitSendMeta } from './units';
export {
  MatchKey,
  TUG_MATCH_SCOPE_MODULES,
  type MatchApi,
  type MatchEvents,
  type MatchEndedPayload,
  type MatchOutcome,
} from './match';
export { MetaKey, type MetaApi } from './meta';
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
 *  3. `tug/match/fortress` — per-side fortress HP resources + fortress
 *     `UnitInstance` for the lane's engagement model. Lives between
 *     income and lane so lane can inject the fortress units.
 *  4. `tug/match/lane` — single shared module; both sides' unit arrays +
 *     cross-side combat (fortress treated as just-another opposing unit).
 *  5. `tug/match/<side>/units` — per-side shop + sequencer + cooldowns.
 *     The engine self-publishes `CategoriesKey` from the unit + income-
 *     upgrade category factories at construction time; no aggregator.
 *  6. `tug/match` — match orchestrator; injects fortress + lane +
 *     sequencers.
 *  7. `tug/match/ai/opponent-bot` — AI policy. Strict-after-units ordering
 *     so `getUnits('ai')` returns a populated handle before the AI reads it.
 *     Side-parameterized so sim engines can install a second instance for
 *     `'player'` (unattended balance harnesses); production installs only
 *     the `'ai'` instance and leaves player input to the UI.
 *  8. `tug/meta` — cross-match state container.
 *  9. `tug/meta/prestige` — conditional; only when meta-progression is on.
 */
export function createTugModules(data: TugData): EngineModule[] {
  const modules: EngineModule[] = [
    createTuningModule(data),
    createIncomeSideModule(data, 'player'),
    createIncomeSideModule(data, 'ai'),
    createIncomeUpgradesSideModule(data, 'player'),
    createIncomeUpgradesSideModule(data, 'ai'),
    createFortressModule(data),
    createLaneModule(data),
    createUnitsSideModule(data, 'player'),
    createUnitsSideModule(data, 'ai'),
    createMatchModule(data),
    createOpponentBotModule(data, 'ai'),
    createMetaModule(data),
  ];
  if (data.balance.metaProgressionEnabled) {
    modules.push(createPrestigeModule(data));
  }
  return modules;
}
