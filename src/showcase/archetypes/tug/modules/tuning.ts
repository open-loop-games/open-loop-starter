import {
  createTuningRegistry,
  type EngineModule,
  type InjectionKey,
  type TuningRegistry,
} from '@open-loop/engine';

/**
 * The `tunable()` key registry, the one perturbation path. Every key has a live `tunable()`
 * reader; `BALANCING.md` § The tunables says what each moves. A key's prefix is the spine
 * term it feeds, not the file it is read in:
 *
 *   - `income/base`                    the unit of account; every price is seconds of it
 *   - `horn/seconds`                   a keep's release period, and so one release's size
 *   - `clash/counterSharpness`         how hard the wheel bites
 *   - `cover/atGate`                   the ramparts' reach: the spring that pulls the line home
 *   - `gate/share`                     how much an ordinary troop batters a gate
 *   - `season/seconds`                 when the last week's fury begins
 *   - `ladder/rungGrowth`              the rival's harvest per rung, and a boon level's worth
 *
 * The anchors not keyed here (squad shapes, reach, the equal-value rule, the gate's breach
 * time) are read from `../data/spine.ts` and `../data/troops.ts` directly: each one moves
 * the member stats the spine derives, so perturbing it means rerunning the projection.
 */
export type TugTunableKey =
  | 'income/base'
  | 'horn/seconds'
  | 'clash/counterSharpness'
  | 'cover/atGate'
  | 'gate/share'
  | 'season/seconds'
  | 'ladder/rungGrowth';

export const TugTuningRegistryKey: InjectionKey<TuningRegistry> = Symbol(
  'tug/tuning-registry',
) as InjectionKey<TuningRegistry>;

/** Creates the registry every `tunable()` reader binds into. Runs first. */
export function createTuningModule(): EngineModule {
  return {
    id: 'tug/tuning',
    install(ctx) {
      ctx.provide(TugTuningRegistryKey, createTuningRegistry('tug-tuning'));
    },
  };
}
