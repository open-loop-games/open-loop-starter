import {
  createTuningRegistry,
  type EngineModule,
  type InjectionKey,
  type TuningRegistry,
} from '@open-loop/engine';
import type { SpineAnchors } from '../data';

/**
 * The `tunable()` key registry, the one perturbation path. Every spine anchor
 * is a key, `spine/<anchor>`, read once in `./garden.ts`; each default closure
 * reads `../data/spine.ts`. Probes perturb a key through
 * `registry.pushOverrides`. `BALANCING.md` § The tunables says what each moves.
 */
export type DefenderTunableKey = `spine/${keyof SpineAnchors}`;

export const DefenderTuningRegistryKey: InjectionKey<TuningRegistry> = Symbol(
  'defender/tuning-registry',
) as InjectionKey<TuningRegistry>;

/** Creates the registry every `tunable()` reader binds into. Runs first. */
export function createTuningModule(): EngineModule {
  return {
    id: 'defender/tuning',
    install(ctx) {
      ctx.provide(DefenderTuningRegistryKey, createTuningRegistry('defender-tuning'));
    },
  };
}
