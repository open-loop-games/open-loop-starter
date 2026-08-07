import type { EngineModule } from '@open-loop/engine';
import { createTuningModule } from './tuning';
import { createAutomationTiersModule } from './automation-tiers';
import { createMatchModule } from './match';
import { createEconomyModule } from './economy';
import { createTacticalSimModule } from './tactical-sim';
import { createAutomationModule } from './automation';

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
 * is the option bag. The default matchup is the archetype's opening argument —
 * **greedy versus rush**, separated on `economyShare` (`φ`):
 *
 * - `a` **rush**: `φ = 0`, everything into army, committed in bursts.
 * - `b` **greedy**: `φ = 0.5`, half of income compounding, army in a thinner
 *   stream until the economy pays for a thicker one.
 *
 * That pairing is chosen to make the spine legible rather than to be fair: the
 * rush is ahead early and the greedy seat is ahead later, so which one wins is a
 * question about the match clock. It is the matchup the probes read, and it is
 * expected to be lopsided until `balance/` says where the crossover sits.
 */
export function createSkirmishModules(): EngineModule[] {
  return [
    createTuningModule(),
    createAutomationTiersModule(),
    createMatchModule({ resetModules: MATCH_SCOPE_MODULES }),
    createEconomyModule(),
    createTacticalSimModule(),
    createAutomationModule('a', { economyShare: 0, cadenceSec: 2, maxSpawnPerBurst: Infinity }),
    createAutomationModule('b', { economyShare: 0.5, cadenceSec: 3, maxSpawnPerBurst: 2 }),
  ];
}
