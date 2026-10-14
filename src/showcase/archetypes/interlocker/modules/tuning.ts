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
 *   - `works/rho`               raw units a second from one raw building
 *   - `works/workerRate`        input units a second one compagnon moves through a workshop
 *   - `works/upkeepPerWorker`   bread a second each compagnon eats
 *   - `storage/fillSeconds`     seconds of one raw building a base bin holds
 *   - `storage/warehouseStep`   the share of its base each warehouse adds to every bin
 *   - `expo/threshold`          aeroplanes in the hangar an Exposition needs
 *   - `renown/outputStep`       raw output added per lifetime renown
 *
 * Prices are not keyed. They are multiples of C0 = RHO · T_FIRST fixed in `../data/spine.ts`
 * at load, so perturbing them means editing the spine and rerunning the projection.
 */
export type InterlockerTunableKey =
  | 'works/rho'
  | 'works/workerRate'
  | 'works/upkeepPerWorker'
  | 'storage/fillSeconds'
  | 'storage/warehouseStep'
  | 'expo/threshold'
  | 'renown/outputStep';

export const InterlockerTuningRegistryKey: InjectionKey<TuningRegistry> = Symbol(
  'interlocker/tuning-registry',
) as InjectionKey<TuningRegistry>;

/** Creates the registry every `tunable()` reader binds into. Runs first. */
export function createTuningModule(): EngineModule {
  return {
    id: 'interlocker/tuning',
    install(ctx) {
      ctx.provide(InterlockerTuningRegistryKey, createTuningRegistry('interlocker-tuning'));
    },
  };
}
