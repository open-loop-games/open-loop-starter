import type { EngineModule } from '@open-loop/engine';
import { createTuningModule, SIDES, type FactionId, type Side } from './tuning';
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
  type TargetingWeights,
} from '../data/tactical';

export { PERSONAS, PERSONA_KEYS, getPersonaDef };
export type { PersonaKey, PersonaDef, TargetingWeights };

export {
  createTuningModule,
  SkirmishTuningRegistryKey,
  DEFAULT_FACTIONS,
  SIDES,
  isHostile,
  opponentsOf,
  opponentOf,
} from './tuning';
export {
  createAutomationTiersModule,
  AutomationTiersKey,
  type SkirmishAutomationTier,
} from './automation-tiers';
export type { FactionId, Side, SkirmishTunableKey } from './tuning';
export { createMatchModule, MatchKey, SKIRMISH_MATCH_SCOPE_MODULES } from './match';
export type {
  MatchApi,
  MatchEvents,
  MatchEndedPayload,
  MatchOutcome,
  FactionElimination,
  MatchModuleOptions,
} from './match';
export { createEconomyModule, EconomyKey } from './economy';
export type { EconomyApi } from './economy';
export { createTacticalSimModule, TacticalKey } from './tactical-sim';
export type { TacticalApi, Unit, TacticalSimModuleOptions } from './tactical-sim';
export { createAutomationModule, AutomationKey, getAutomationKey } from './automation';
export type { AutomationOptions, AutomationApi } from './automation';
export type { EconomyModuleOptions } from './economy';

/**
 * Tactical sim + AI policies are match-scoped. Their `persistent()` state
 * (cadence accumulators, and the sim's unit arrays / base hp / nextId) clears
 * on the boundary; the sim and economy additionally re-init themselves on
 * `matchStarted`, because the reset runs at `end()` and a match can open over a
 * live one. The match module itself and tuning stay out (see `match.ts`).
 */
export const MATCH_SCOPE_MODULES: readonly string[] = [
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
  crimson: { ...PERSONAS.rush, cadenceJitter: 0.15 },
  azure: { ...PERSONAS.boom, cadenceJitter: 0.15 },
  emerald: { ...PERSONAS.skirmish, cadenceJitter: 0.15 },
};
export interface SkirmishModulesOptions {
  /** Roster of participating factions. Defaults to SIDES (['a', 'b']) or derived from seats/personas. */
  factions?: readonly FactionId[];
  /** Per-seat policy. Partial: an omitted seat keeps its default persona. */
  seats?: Partial<Record<FactionId, AutomationOptions>>;
  /** Per-seat named persona preset. Takes precedence over `seats` if provided. */
  personas?: Partial<Record<FactionId, PersonaKey>>;
  /** Base placement radius. Defaults to BASE_RADIUS (38). */
  baseRadius?: number;
}

export function createSkirmishModules(options?: SkirmishModulesOptions): EngineModule[] {
  const factions =
    options?.factions ??
    (options?.seats && Object.keys(options.seats).length > 0
      ? Object.keys(options.seats)
      : options?.personas && Object.keys(options.personas).length > 0
        ? Object.keys(options.personas)
        : SIDES);

  const matchScopeModules = [
    'skirmish/match/economy',
    'skirmish/match/tactical',
    ...factions.map((f) => `skirmish/match/${f}/automation`),
  ];

  const seats = factions.map((side, i) => {
    let opts: AutomationOptions;
    if (options?.personas?.[side]) {
      opts = PERSONAS[options.personas[side]!];
    } else if (options?.seats?.[side]) {
      opts = options.seats[side]!;
    } else if (DEFAULT_SEATS[side]) {
      opts = DEFAULT_SEATS[side];
    } else {
      const keys: PersonaKey[] = ['rush', 'investor', 'skirmish', 'boom', 'combined'];
      opts = PERSONAS[keys[i % keys.length]];
    }
    return { side, opts };
  });

  return [
    createTuningModule(),
    createAutomationTiersModule(),
    createMatchModule({ factions, resetModules: matchScopeModules }),
    createEconomyModule({ factions }),
    createTacticalSimModule({ factions, baseRadius: options?.baseRadius }),
    ...seats.map(({ side, opts }) => createAutomationModule(side, opts)),
  ];
}
