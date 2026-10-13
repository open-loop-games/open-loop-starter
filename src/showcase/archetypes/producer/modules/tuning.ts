import {
  createTuningRegistry,
  type EngineModule,
  type InjectionKey,
  type TuningRegistry,
} from '@open-loop/engine';
import type { SUBSIDIARY_DEFS } from '../data';

/**
 * The `tunable()` key registry, the one perturbation path. Every key has a live
 * `tunable()` reader in `./firm.ts`; a key with no reader would be a silent no-op
 * under `pushOverrides`. `BALANCING.md` § The tunables says what each moves.
 *
 *   - `balance/costRatio`              the shared cost ratio, `m`
 *   - `subsidiaries/<id>/baseCost`     a subsidiary's zeroth-unit price, `a_i`
 */
export type ProducerTunableKey =
  | 'balance/costRatio'
  | `subsidiaries/${(typeof SUBSIDIARY_DEFS)[number]['id']}/baseCost`;

export const ProducerTuningRegistryKey: InjectionKey<TuningRegistry> = Symbol(
  'producer/tuning-registry',
) as InjectionKey<TuningRegistry>;

/** Creates the registry every `tunable()` reader binds into. Runs first. */
export function createTuningModule(): EngineModule {
  return {
    id: 'producer/tuning',
    install(ctx) {
      ctx.provide(ProducerTuningRegistryKey, createTuningRegistry('producer-tuning'));
    },
  };
}
