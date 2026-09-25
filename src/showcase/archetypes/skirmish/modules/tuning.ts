import {
  createTuningRegistry,
  type EngineModule,
  type InjectionKey,
  type TuningRegistry,
} from '@open-loop/engine';

/**
 * The `tunable()` key registry — the one perturbation path (no parallel
 * `data/balance.ts`; see `../../README.md` § Balance). Balance probes and
 * solvers perturb these keys via `registry.pushScope`.
 *
 * Add one union member per perturbable balance value; read it at the owning
 * module's construction site with `tunable(registry, key, defaultFn)`. Grep for
 * `tunable(` to audit the live surface.
 *
 * Namespaces:
 *   - `match/timeLimitSec` — wall-clock cap before a match ends `time-limit`
 *   - `economy/incomePerWorker`, `economy/workerCost` — the guns-versus-butter
 *     curve. `r = incomePerWorker / workerCost` is the growth constant `φ`
 *     multiplies in the spine's closed form, so these two move it together.
 *   - `tactical/unitCost` — army price; the other side of the same split.
 *
 * `economyShare` (`φ` itself) is deliberately NOT here. It is a per-seat policy
 * parameter on `AutomationOptions`, not a global constant — two seats hold
 * different values at once, which a registry key cannot express.
 */
export type SkirmishTunableKey =
  'match/timeLimitSec' | 'economy/incomePerWorker' | 'economy/workerCost' | 'tactical/unitCost';

/**
 * Faction identifiers. Widened from the bilateral duel (`'a' | 'b'`) to arbitrary
 * N-faction free-for-all identifiers ($N \ge 3$).
 *
 * `Side` is retained as an alias for backward compatibility.
 */
export type FactionId = string;
export type Side = FactionId;

export const DEFAULT_FACTIONS: readonly FactionId[] = ['a', 'b'];
export const SIDES: readonly Side[] = DEFAULT_FACTIONS;

/**
 * Relational hostility check. In the base free-for-all case, any two distinct
 * factions are hostile.
 */
export function isHostile(a: FactionId, b: FactionId): boolean {
  return a !== b;
}

/**
 * Returns all factions hostile to `faction` within the provided `roster`.
 */
export function opponentsOf(
  faction: FactionId,
  roster: readonly FactionId[] = DEFAULT_FACTIONS,
): FactionId[] {
  return roster.filter((f) => isHostile(faction, f));
}

/**
 * Legacy binary opponent helper. In an N-faction match, returns the first
 * hostile opponent, falling back to binary 'a' <-> 'b'.
 */
export function opponentOf(side: Side, roster?: readonly FactionId[]): Side {
  if (roster && roster.length > 0) {
    const opps = opponentsOf(side, roster);
    if (opps.length > 0) return opps[0];
  }
  return side === 'a' ? 'b' : 'a';
}

export const SkirmishTuningRegistryKey: InjectionKey<TuningRegistry> = Symbol(
  'skirmish/tuning-registry',
) as InjectionKey<TuningRegistry>;

/**
 * Cross-module foundation. Creates the override registry every `tunable()`
 * reader binds into. Runs first (no dependencies); modules carry
 * `dependencies: ['skirmish/tuning']` and inject the registry.
 */
export function createTuningModule(): EngineModule {
  return {
    id: 'skirmish/tuning',
    install(ctx) {
      ctx.provide(SkirmishTuningRegistryKey, createTuningRegistry('skirmish-tuning'));
    },
  };
}
