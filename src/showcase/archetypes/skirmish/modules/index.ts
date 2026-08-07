import type { EngineModule } from '@open-loop/engine';
import { createTuningModule, SIDES, type Side } from './tuning';
import { createAutomationTiersModule } from './automation-tiers';
import { createMatchModule } from './match';
import { createEconomyModule } from './economy';
import { createTacticalSimModule } from './tactical-sim';
import { createAutomationModule, type AutomationOptions } from './automation';

export { createTuningModule, SkirmishTuningRegistryKey, SIDES, opponentOf } from './tuning';
export {
  createAutomationTiersModule,
  AutomationTiersKey,
  type SkirmishAutomationTier,
} from './automation-tiers';
export type { Side, SkirmishTunableKey } from './tuning';
export { createMatchModule, MatchKey, SKIRMISH_MATCH_SCOPE_MODULES } from './match';
export type {
  MatchApi,
  MatchEvents,
  MatchEndedPayload,
  MatchOutcome,
  MatchModuleOptions,
} from './match';
export { createEconomyModule, EconomyKey } from './economy';
export type { EconomyApi } from './economy';
export { createTacticalSimModule, TacticalKey } from './tactical-sim';
export type { TacticalApi, Unit } from './tactical-sim';
export { createAutomationModule } from './automation';
export type { AutomationOptions } from './automation';

/**
 * Tactical sim + both AI policies are match-scoped. Their `persistent()` state
 * (cadence accumulators, and the sim's unit arrays / base hp / nextId) clears
 * on the boundary; the sim additionally re-inits itself on `matchStarted`
 * because `createReset` doesn't restore `createResource` (supply). The match
 * module itself and tuning stay out (see `match.ts`). Only the module-list
 * assembler knows which modules are installed, so the list lives here.
 */
const MATCH_SCOPE_MODULES: readonly string[] = [
  'skirmish/match/economy',
  'skirmish/match/tactical',
  'skirmish/match/a/automation',
  'skirmish/match/b/automation',
];

/**
 * The skirmish module list. `bootEngine` installs the shared base (settings,
 * ui-prefs) alongside these.
 *
 * Bot-vs-bot: the SAME automation factory installs on every seat, and a persona
 * is the option bag. The default matchup is **rush versus investor**, separated
 * ONLY on `economyShare` (`φ`):
 *
 * - `a` **rush**: `φ = 0`, everything into army.
 * - `b` **investor**: `φ = 0.2`, a fifth of income compounding.
 *
 * Holding the tempo dials equal is deliberate — it makes this matchup a point on
 * the surface `balance/split-probe.ts` sweeps, so the demo can be located on the
 * payoff matrix instead of being a separate configuration nobody measured. The
 * investor wins it, which is the archetype's claim made visible; both splits sit
 * inside the intransitive cycle that probe reports, so neither is simply
 * correct.
 */
export const DEFAULT_SEATS: Record<Side, AutomationOptions> = {
  a: { economyShare: 0, cadenceSec: 2, maxSpawnPerBurst: Infinity },
  b: { economyShare: 0.2, cadenceSec: 2, maxSpawnPerBurst: Infinity },
};

export interface SkirmishModulesOptions {
  /** Per-seat policy. Partial: an omitted seat keeps its default persona. */
  seats?: Partial<Record<Side, AutomationOptions>>;
}

export function createSkirmishModules(options?: SkirmishModulesOptions): EngineModule[] {
  const seats = SIDES.map((side) => ({
    side,
    opts: options?.seats?.[side] ?? DEFAULT_SEATS[side],
  }));
  return [
    createTuningModule(),
    createAutomationTiersModule(),
    createMatchModule({ resetModules: MATCH_SCOPE_MODULES }),
    createEconomyModule(),
    createTacticalSimModule(),
    ...seats.map(({ side, opts }) => createAutomationModule(side, opts)),
  ];
}
