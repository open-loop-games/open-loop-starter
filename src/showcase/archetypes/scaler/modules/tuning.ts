import {
  createTuningRegistry,
  type EngineModule,
  type InjectionKey,
  type TuningRegistry,
} from '@open-loop/engine';
import type { TierId } from '../data';

/**
 * The `tunable()` key registry, the one perturbation path. Every key has a live
 * `tunable()` reader in `./run.ts`; a key with no reader would be a silent no-op
 * under `pushOverrides`. `BALANCING.md` § The tunables says what each moves.
 *
 *   - `heroes/priceRatio`          the per-unit price growth every tier shares
 *   - `heroes/<id>/baseCost`       a tier's first-unit price
 */
export type ScalerTunableKey = 'heroes/priceRatio' | `heroes/${TierId}/baseCost`;

export const ScalerTuningRegistryKey: InjectionKey<TuningRegistry> = Symbol(
  'scaler/tuning-registry',
) as InjectionKey<TuningRegistry>;

/** Creates the registry every `tunable()` reader binds into. Runs first. */
export function createTuningModule(): EngineModule {
  return {
    id: 'scaler/tuning',
    install(ctx) {
      ctx.provide(ScalerTuningRegistryKey, createTuningRegistry('scaler-tuning'));
    },
  };
}
