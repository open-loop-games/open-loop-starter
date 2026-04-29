import { computed, watch } from 'vue';
import type { ComputedRef, Ref } from 'vue';
import { persistent, type EngineModule, type InjectionKey } from 'open-loop-engine';
import type { TugData } from '../data/types';
import { MetaKey } from './meta';

export interface ArcState {
  /** True when arc-closure conditions are currently satisfied. */
  complete: ComputedRef<boolean>;
  /** Latches true the first time `complete` flips true; survives save/load. */
  announced: Ref<boolean>;
  /** End-of-arc flavour line — surfaced by the UI on first crossing. */
  flavour: string;
}

export const ArcKey: InjectionKey<ArcState> = Symbol('tug/meta/arc') as InjectionKey<ArcState>;

const DEFAULT_FLAVOUR =
  'The fleets fall silent. Counter-strategy mastered; the rotation is yours to shape.';

/**
 * Bimodal beat-7 arc-closure predicate, branching at install time on
 * `data.balance.metaProgressionEnabled`:
 *
 * - **Meta-on** — closure when `meta.factionsUnlocked > 0` (first faction
 *   unlocked through prestige progression).
 * - **Meta-off (skeleton default)** — closure when
 *   `meta.maxCounterPivotsAnyMatch >= 3` (player demonstrated counter-pivot
 *   mastery in at least one match across their lifetime). Updates on
 *   `'matchEnded'` events; the arc fires on the first match where 3+ pivots
 *   occur.
 *
 * The latch + computed shape mirrors Producer/Ambient `arc.ts`.
 */
export function createArcModule(data: TugData): EngineModule {
  return {
    id: 'tug/meta/arc',
    dependencies: ['tug/meta'],
    install(ctx) {
      const meta = ctx.inject(MetaKey);

      const announced = persistent<boolean>(false, { name: 'arcAnnounced' });

      const complete = data.balance.metaProgressionEnabled
        ? computed(() => meta.factionsUnlocked.value > 0)
        : computed(() => meta.maxCounterPivotsAnyMatch.value >= 3);

      watch(
        complete,
        (isComplete) => {
          if (isComplete && !announced.value) announced.value = true;
        },
        { immediate: true },
      );

      ctx.provide(ArcKey, {
        complete,
        announced,
        flavour: DEFAULT_FLAVOUR,
      });
    },
  };
}
