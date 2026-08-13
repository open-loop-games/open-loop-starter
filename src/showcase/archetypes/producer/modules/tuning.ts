import {
  createTuningRegistry,
  type EngineModule,
  type InjectionKey,
  type TuningRegistry,
} from '@open-loop/engine';
import type { ProbeClassId } from '../data/types';

/**
 * The `tunable()` key registry — the one perturbation path (canon: `tug`; see
 * `.claude/rules/archetype-authoring.md` § Conformance). No parallel
 * `data/balance.ts` override file.
 *
 * Every key below has a live `tunable()` reader. That is a deliberate
 * constraint, not an accident: a key with no reader is a silent no-op under
 * `pushScope`, which reads as a working knob and perturbs nothing.
 * Grep for `tunable(` to audit.
 *
 * **What is deliberately NOT here, and why.** Two of the archetype's most
 * interesting constants cannot be perturbed through this path:
 *
 * - `COST_RATIO` (`m`) reaches the engine as `ProducerPurchaseConfig.
 *   costScaling`, typed `DecimalSource` rather than `Computable`, so it is
 *   read once at registration and a registered knob would never be re-read.
 *   Sweeping `m` means editing `data/curve.ts` and re-running, or composing
 *   the curve as a `Formula` at the wiring layer — `costCurve` in
 *   `src/balance/cost-curve.ts` is the battery for that, and it is what
 *   `balance/producer-projection.ts` uses.
 * - Class `baseRate` is static on `ProducerMapping` for the same reason.
 *   `balance/classRateScale` below is the reactive stand-in: a multiplicative
 *   modifier on every class chain, which perturbs realized output without
 *   pretending the authored constant moved.
 *
 * Namespaces:
 *   - `balance/classRateScale`      — ×N on every probe class's rate chain
 *   - `balance/clickYieldScale`     — ×N on the hand-launch chain
 *   - `balance/revisionMultiplier`  — the per-revision default reward
 *   - `balance/generationStep`      — the breadth chain's per-class step
 *   - `classes/<id>/baseCost`       — a class's zeroth-unit cost, `a_i`
 */
export type ProducerTunableKey =
  | 'balance/classRateScale'
  | 'balance/clickYieldScale'
  | 'balance/revisionMultiplier'
  | 'balance/generationStep'
  | `classes/${ProbeClassId}/baseCost`;

export const ProducerTuningRegistryKey: InjectionKey<TuningRegistry> = Symbol(
  'producer/tuning-registry',
) as InjectionKey<TuningRegistry>;

/**
 * Cross-module foundation. Creates the override registry every `tunable()`
 * reader binds into. Runs first (no dependencies); game modules carry
 * `dependencies: ['producer/tuning']` and inject the registry.
 */
export function createTuningModule(): EngineModule {
  return {
    id: 'producer/tuning',
    install(ctx) {
      ctx.provide(ProducerTuningRegistryKey, createTuningRegistry('producer-tuning'));
    },
  };
}
