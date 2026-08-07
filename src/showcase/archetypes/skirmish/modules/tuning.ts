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
  | 'match/timeLimitSec'
  | 'economy/incomePerWorker'
  | 'economy/workerCost'
  | 'tactical/unitCost';

/**
 * The two factions. Kept deliberately neutral (`a`/`b`, not player/ai) — the
 * archetype is bot-vs-bot first; a "player" side is just a seat whose policy is
 * swapped for input later. Modules parameterize over `Side` so both seats run
 * identical code.
 */
export type Side = 'a' | 'b';
export const SIDES: readonly Side[] = ['a', 'b'];
export function opponentOf(side: Side): Side {
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
