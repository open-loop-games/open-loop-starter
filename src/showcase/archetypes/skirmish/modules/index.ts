import type { EngineModule } from '@open-loop/engine';
import { createTuningModule, SIDES, type Side } from './tuning';
import { createAutomationTiersModule } from './automation-tiers';
import { createMatchModule } from './match';
import { createEconomyModule } from './economy';
import { createTacticalSimModule } from './tactical-sim';
import { createAutomationModule, type AutomationOptions } from './automation';
import {
  PERSONAS,
  PERSONA_KEYS,
  getPersonaDef,
  type PersonaKey,
  type PersonaDef,
} from '../data/tactical';

export { PERSONAS, PERSONA_KEYS, getPersonaDef };
export type { PersonaKey, PersonaDef };

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
export { createAutomationModule, AutomationKey } from './automation';
export type { AutomationOptions, AutomationApi } from './automation';

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
  a: { ...PERSONAS.rush, cadenceJitter: 0 },
  b: { ...PERSONAS.investor, cadenceJitter: 0 },
};

export interface SkirmishModulesOptions {
  /** Per-seat policy. Partial: an omitted seat keeps its default persona. */
  seats?: Partial<Record<Side, AutomationOptions>>;
  /** Per-seat named persona preset. Takes precedence over `seats` if provided. */
  personas?: Partial<Record<Side, PersonaKey>>;
}
export function createSkirmishModules(options?: SkirmishModulesOptions): EngineModule[] {
  const seats = SIDES.map((side) => {
    let opts: AutomationOptions;
    if (options?.personas?.[side]) {
      opts = PERSONAS[options.personas[side]!];
    } else {
      opts = options?.seats?.[side] ?? DEFAULT_SEATS[side];
    }
    return { side, opts };
  });
  return [
    createTuningModule(),
    createAutomationTiersModule(),
    createMatchModule({ resetModules: MATCH_SCOPE_MODULES }),
    createEconomyModule(),
    createTacticalSimModule(),
    ...seats.map(({ side, opts }) => createAutomationModule(side, opts)),
  ];
}
