import type { EngineModule } from '@open-loop/engine';
import type { TugData } from '../data/types';
import { createTuningModule } from './tuning';
import { createFortressModule } from './fortress';
import { createIncomeSideModule } from './income';
import { createIncomeUpgradesSideModule } from './income-upgrades';
import { createLaneModule } from './lane';
import { createUnitsSideModule } from './units';
import { createMatchModule } from './match';
import { createOpponentBotModule, type OpponentBotOptions } from './opponent-bot';
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
export { getIncome, getIncomeRateChain, BASE_INCOME_RATE } from './income';
export { getIncomeUpgrades, IncomeUpgradeRoiKey, type RoiMetrics } from './income-upgrades';
export { LaneKey, type LaneApi, type LaneEvents, type UnitInstance } from './lane';
export { getUnits, SequencerKey, UnitsCooldownKey, type UnitSendMeta } from './units';
export {
  MatchKey,
  TUG_MATCH_RESET_CONTEXTS,
  type MatchApi,
  type MatchEvents,
  type MatchEndedPayload,
  type MatchOutcome,
} from './match';
export { MetaKey, type MetaApi } from './meta';
export { PrestigeKey } from './prestige';
export type { OpponentBotOptions } from './opponent-bot';

export interface TugModulesOptions {
  /** The AI opponent install on the AI side (`opponent-bot`). Defaults to
   *  `{ persona: 'counter' }` with production-zero believability — the
   *  human player drives the player side. */
  ai?: OpponentBotOptions;
  /** Player-side automated player install (`opponent-bot`). Production omits;
   *  headless engines pass it to drive unattended bilateral runs. */
  player?: OpponentBotOptions;
  /** Cross-match meta-progression layer. Production skeleton: false. */
  metaProgressionEnabled?: boolean;
}

/**
 * Compose the Tug modules in dependency order. Modules close over `data` at
 * construction; the engine wraps each install in
 * `withPersistentContext(mod.id, ...)` at `engine.start()` time.
 *
 * Module ordering reflects the dependency graph (the engine topo-sorts on
 * `dependencies`, but listing in order keeps the source readable):
 *
 *  1. `tug/tuning` — registry + data publish; OUTSIDE match-scope so
 *     pushed scopes survive match resets.
 *  2. `tug/match/<side>/income` — per-side mineral resources.
 *  3. `tug/match/fortress` — per-side fortress HP resources + fortress
 *     `UnitInstance` for the lane's engagement model. It is between
 *     income and lane so lane can inject the fortress units.
 *  4. `tug/match/lane` — single shared module; both sides' unit arrays +
 *     cross-side combat (fortress treated as just-another opposing unit).
 *  5. `tug/match/<side>/units` — per-side shop + sequencer + cooldowns.
 *     The engine self-publishes `CategoriesKey` from the unit + income-
 *     upgrade category factories at construction time; no aggregator.
 *  6. `tug/match` — match orchestrator; injects fortress + lane +
 *     sequencers.
 *  7. `tug/match/<side>/opponent-bot` — AI policy. Strict-after-units
 *     ordering so `getUnits(side)` returns a populated handle before the
 *     AI opponent reads it. Side-parameterized so headless engines can
 *     install a second instance for `'player'` (unattended balance-harness
 *     runs); production installs only the `'ai'` instance and leaves
 *     player input to the UI.
 *  8. `tug/meta` — cross-match state container.
 *  9. `tug/meta/prestige` — conditional; only when meta-progression is on.
 */
export function createTugModules(data: TugData, options?: TugModulesOptions): EngineModule[] {
  const aiOptions: OpponentBotOptions = options?.ai ?? { persona: 'counter' };
  const modules: EngineModule[] = [
    createTuningModule(data),
    createIncomeSideModule('player'),
    createIncomeSideModule('ai'),
    createIncomeUpgradesSideModule(data, 'player'),
    createIncomeUpgradesSideModule(data, 'ai'),
    createFortressModule(data),
    createLaneModule(data),
    createUnitsSideModule(data, 'player'),
    createUnitsSideModule(data, 'ai'),
    createMatchModule(data),
    createOpponentBotModule(data, 'ai', aiOptions),
    createMetaModule(data),
  ];
  if (options?.player) {
    modules.push(createOpponentBotModule(data, 'player', options.player));
  }
  if (options?.metaProgressionEnabled) {
    modules.push(createPrestigeModule(data));
  }
  return modules;
}
