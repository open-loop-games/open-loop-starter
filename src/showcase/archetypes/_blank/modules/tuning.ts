import {
  createTuningRegistry,
  type EngineModule,
  type InjectionKey,
  type TuningRegistry,
} from '@open-loop/engine';

/**
 * The `tunable()` key registry — the one perturbation path (no parallel
 * `data/balance.ts`; see `.claude/rules/archetype-authoring.md` § Directory
 * shape). Balance probes and
 * solvers perturb these keys via `registry.pushOverrides`; the engine pattern lives
 * at `open-loop-engine/src/core/override-registry.ts`.
 *
 * A fork adds one union member per perturbable balance value and reads it at the
 * owning module's construction site with `tunable(registry, key, defaultFn)`.
 * Grep for `tunable(` to audit the live surface.
 *
 * Namespaces (blank base — one key, the example accumulator's rate):
 *   - `core/ratePerSecond` — units of `count` accrued per game-second
 */
export type GameTunableKey = 'core/ratePerSecond';

export const GameTuningRegistryKey: InjectionKey<TuningRegistry> = Symbol(
  'game/tuning-registry',
) as InjectionKey<TuningRegistry>;

/**
 * Cross-module foundation. Creates the override registry every `tunable()`
 * reader binds into. Runs first (no dependencies); game modules carry
 * `dependencies: ['game/tuning']` and inject the registry.
 */
export function createTuningModule(): EngineModule {
  return {
    id: 'game/tuning',
    install(ctx) {
      ctx.provide(GameTuningRegistryKey, createTuningRegistry('game-tuning'));
    },
  };
}
