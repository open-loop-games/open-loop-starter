import {
  createTuningRegistry,
  type EngineModule,
  type InjectionKey,
  type TuningRegistry,
} from '@open-loop/engine';

/**
 * The `tunable()` key registry, the one perturbation path. Every key has a live `tunable()`
 * reader; `BALANCING.md` § The tunables says what each moves.
 *
 *   - `student/baseCost`, `student/growth`, `student/rate`   the ladder (`./dojo.ts`)
 *   - `senpai/baseCost`, `senpai/growth`, `senpai/trainRate`  the cascade (`./dojo.ts`)
 *   - `temper/baseCost`, `temper/growth`                       the fist (`./dojo.ts`)
 *   - `strike/seconds`                                         a training strike's income-seconds (`./dojo.ts`)
 *   - `executor/beatSeconds0`, `executor/beatShrink`           the student's cadence (`./kata.ts`)
 *   - `gate/rotationSeconds`, `gate/bountyStrikesPerBeat`, `gate/standing`   bouts (`./gate.ts`)
 *   - `graduation/threshold`                                   run Ki for the first Insight (`./graduation.ts`)
 */
export type ScripterTunableKey =
  | 'student/baseCost'
  | 'student/growth'
  | 'student/rate'
  | 'senpai/baseCost'
  | 'senpai/growth'
  | 'senpai/trainRate'
  | 'temper/baseCost'
  | 'temper/growth'
  | 'strike/seconds'
  | 'executor/beatSeconds0'
  | 'executor/beatShrink'
  | 'gate/rotationSeconds'
  | 'gate/bountyStrikesPerBeat'
  | 'gate/standing'
  | 'graduation/threshold';

export const ScripterTuningRegistryKey: InjectionKey<TuningRegistry> = Symbol(
  'scripter/tuning-registry',
) as InjectionKey<TuningRegistry>;

/** Creates the registry every `tunable()` reader binds into. Runs first. */
export function createTuningModule(): EngineModule {
  return {
    id: 'scripter/tuning',
    install(ctx) {
      ctx.provide(ScripterTuningRegistryKey, createTuningRegistry('scripter-tuning'));
    },
  };
}
