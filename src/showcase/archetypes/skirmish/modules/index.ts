import type { EngineModule } from '@open-loop/engine';
import { createTuningModule } from './tuning';
import { createMatchModule } from './match';
import { createTacticalSimModule } from './tactical-sim';
import { createAutomationModule } from './automation';

export { createTuningModule, SkirmishTuningRegistryKey, SIDES, opponentOf } from './tuning';
export type { Side, SkirmishTunableKey } from './tuning';
export { createMatchModule, MatchKey, SKIRMISH_MATCH_SCOPE_MODULES } from './match';
export type {
  MatchApi,
  MatchEvents,
  MatchEndedPayload,
  MatchOutcome,
  MatchModuleOptions,
} from './match';
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
  'skirmish/match/tactical',
  'skirmish/match/a/automation',
  'skirmish/match/b/automation',
];

/**
 * The skirmish module list. `bootEngine` installs the shared base (settings,
 * ui-prefs, ui-registry) alongside these.
 *
 * Bot-vs-bot: the SAME automation factory installs on both sides. Side `a` is
 * the all-in tempo player (short cadence, spawn all affordable); side `b`
 * drip-feeds (long cadence, one unit per burst) — a real throughput asymmetry,
 * so `a` fields the larger army and wins deterministically. Placeholder
 * balance: real personas + counter play arrive with later bones.
 */
export function createSkirmishModules(): EngineModule[] {
  return [
    createTuningModule(),
    createMatchModule({ resetModules: MATCH_SCOPE_MODULES }),
    createTacticalSimModule(),
    createAutomationModule('a', { cadenceSec: 2, maxSpawnPerBurst: Infinity }),
    createAutomationModule('b', { cadenceSec: 6, maxSpawnPerBurst: 1 }),
  ];
}
