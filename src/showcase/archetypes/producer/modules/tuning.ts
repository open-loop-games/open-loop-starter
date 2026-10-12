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
 * `pushOverrides`: it looks like a working tunable and perturbs nothing.
 * Grep for `tunable(` to audit.
 *
 * `balance/costRatio` is one key, not one per class: the spine derives a
 * single `m` and every class shares it (`../data/curve.ts` § Balance).
 *
 * Namespaces:
 *   - `balance/costRatio`           — the shared cost ratio, `m`
 *   - `balance/clickYieldScale`     — ×N on the hand-launch chain
 *   - `balance/revisionMultiplier`  — the per-revision default reward
 *   - `balance/generationStep`      — the breadth chain's per-class step
 *   - `classes/<id>/baseCost`       — a class's zeroth-unit cost, `a_i`
 *   - `classes/<id>/baseRate`       — a class's per-unit rate, `r_i`
 */
export type ProducerTunableKey =
  | 'balance/costRatio'
  | 'balance/clickYieldScale'
  | 'balance/revisionMultiplier'
  | 'balance/generationStep'
  | `classes/${ProbeClassId}/baseCost`
  | `classes/${ProbeClassId}/baseRate`;

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
