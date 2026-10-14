import {
  createTuningRegistry,
  type EngineModule,
  type InjectionKey,
  type TuningRegistry,
} from '@open-loop/engine';

/**
 * The `tunable()` key registry, the one perturbation path. Every key has a live `tunable()`
 * reader; `BALANCING.md` § The tunables says what each moves. A key's prefix is the spine
 * term it feeds:
 *
 *   - `contact/scale`     contact damage against the spine's curve
 *   - `player/baseHp`     the double's health before star, padding and stamina
 *
 * The anchors not keyed here are read from `../data/spine.ts` directly: each one feeds a
 * solve (the level gain, the ladder, the agency's growth), so perturbing it means rerunning
 * the projection.
 */
export type SurvivorTunableKey = 'contact/scale' | 'player/baseHp';

export const SurvivorTuningRegistryKey: InjectionKey<TuningRegistry> = Symbol(
  'survivor/tuning-registry',
) as InjectionKey<TuningRegistry>;

/** Creates the registry every `tunable()` reader binds into. Runs first. */
export function createTuningModule(): EngineModule {
  return {
    id: 'survivor/tuning',
    install(ctx) {
      ctx.provide(SurvivorTuningRegistryKey, createTuningRegistry('survivor-tuning'));
    },
  };
}
