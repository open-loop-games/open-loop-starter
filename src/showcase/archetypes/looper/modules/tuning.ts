import {
  createTuningRegistry,
  type EngineModule,
  type InjectionKey,
  type TuningRegistry,
} from '@open-loop/engine';

/**
 * Keys registered against the looper tuning registry. Solvers and balance
 * probes perturb these via `pushScope`; the engine pattern lives at
 * `open-loop-engine/src/core/override-registry.ts` and surfaces through
 * the picker (`open-loop-engine/docs/api/harness.md` § Picker).
 *
 * The first-arc port's per-action constants (manaCost, weights, rewardRatio,
 * progressAmount, etc.) are vanilla canonical and not surfaced here —
 * perturbing them deforms the canonical economy. Solver work targets these
 * cross-cutting scalars where forks would re-tune progression shape.
 *
 * Grep for `tunable(` to audit the surface.
 */
export type LooperTunableKey =
  | 'balance/initialMana'
  | 'balance/costDivisor'
  | 'balance/talentAccrualRatio';

export const LooperTuningRegistryKey: InjectionKey<TuningRegistry> = Symbol(
  'looper/tuning-registry',
) as InjectionKey<TuningRegistry>;

export const tuningModule: EngineModule = {
  id: 'tuning',
  install(ctx) {
    const registry = createTuningRegistry('looper-tuning');
    ctx.provide(LooperTuningRegistryKey, registry);
  },
};
