import {
  createTuningRegistry,
  type EngineModule,
  type InjectionKey,
  type TuningRegistry,
} from '@open-loop/engine';

/**
 * The `tunable()` key registry, the one perturbation path. Every key has a live `tunable()`
 * reader in `./logbook.ts`; `BALANCING.md` § The tunables says what each moves. A key's
 * prefix is the spine term it feeds, not the file it is read in:
 *
 *   - `peg/crossNight`, `peg/g`            the two numbers that author a watch's length
 *   - `ward/perWall`                       the ward unit every wall and the peg scale from
 *   - `wrack/netRate`                      the economy's unit of flow; every price is a multiple
 *   - `phase/daySeconds`, `phase/nightSeconds`   the alternation's clock
 *
 * The anchors not keyed here (bracing, buttress bonus, prices in cycles, the payout's
 * reference run) are read from `../data/spine.ts` `ANCHORS` directly.
 */
export type CyclerTunableKey =
  | 'peg/crossNight'
  | 'peg/g'
  | 'ward/perWall'
  | 'wrack/netRate'
  | 'phase/daySeconds'
  | 'phase/nightSeconds';

export const CyclerTuningRegistryKey: InjectionKey<TuningRegistry> = Symbol(
  'cycler/tuning-registry',
) as InjectionKey<TuningRegistry>;

/** Creates the registry every `tunable()` reader binds into. Runs first. */
export function createTuningModule(): EngineModule {
  return {
    id: 'cycler/tuning',
    install(ctx) {
      ctx.provide(CyclerTuningRegistryKey, createTuningRegistry('cycler-tuning'));
    },
  };
}
