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
 *   - `pieces/priceRatio`       every fabricator ladder's per-copy price ratio
 *   - `pieces/pulse/dps`        a Pulse Cannon's damage a second, the economy's unit
 *   - `pieces/rail/dps`         a Railgun's damage a second
 *   - `pieces/lance/dps`        a Spinal Lance's damage a second
 *   - `pieces/capacitor/boost`  what a Capacitor adds to each edge-adjacent weapon
 *   - `pieces/targeting/boost`  what a Targeting Array adds to each corner-adjacent weapon
 *   - `pieces/beacon/gain`      what an Arc Beacon's stamp adds to a weapon's stamp family
 *   - `pieces/coolant/gain`     what a Coolant Manifold adds to an adjacent booster's links
 *   - `pieces/director/boost`   what a Fire Director adds to each weapon down its line
 *   - `pieces/director/reach`   how many hull cells a Fire Director's line reaches
 *   - `pieces/tractor/gain`     what a Salvage Tractor adds to an adjacent weapon's salvage
 *   - `refits/mult`             each refit's multiplier on the firepower chain
 *
 * Prices are not keyed. They are read off the spine's scheduled income in `../data/spine.ts`
 * at load, so perturbing them means editing the spine and rerunning the projection.
 */
export type PackerTunableKey =
  | 'pieces/priceRatio'
  | 'pieces/pulse/dps'
  | 'pieces/rail/dps'
  | 'pieces/lance/dps'
  | 'pieces/capacitor/boost'
  | 'pieces/targeting/boost'
  | 'pieces/beacon/gain'
  | 'pieces/coolant/gain'
  | 'pieces/director/boost'
  | 'pieces/director/reach'
  | 'pieces/tractor/gain'
  | 'refits/mult';

export const PackerTuningRegistryKey: InjectionKey<TuningRegistry> = Symbol(
  'packer/tuning-registry',
) as InjectionKey<TuningRegistry>;

/** Creates the registry every `tunable()` reader binds into. Runs first. */
export function createTuningModule(): EngineModule {
  return {
    id: 'packer/tuning',
    install(ctx) {
      ctx.provide(PackerTuningRegistryKey, createTuningRegistry('packer-tuning'));
    },
  };
}
