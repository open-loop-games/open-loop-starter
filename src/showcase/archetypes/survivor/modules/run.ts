import {
  persistent,
  withPersistentContext,
  type ComputedRef,
  type EngineModule,
  type InjectionKey,
} from '@open-loop/engine';
import { computed, ref, type Ref } from 'vue';
import { cumulativeIncomeAmortized } from '../data/income';
import { SCHEDULE_BALANCE, beatTime, deriveXpLadder, scheduledBeatsBy } from '../data/schedule';
import { BASELINE_SEAT } from '../data/seats';
import { ArenaKey, type RunOutcome } from './arena';
import { MetaKey } from './meta';
import { meanMoteYield } from '../data/specimens';

/**
 * Run module — owns the lifecycle, the XP ladder, and the draft beats.
 *
 * It drives the arena rather than the other way round (`ArenaKey.advance`), so a
 * pending draft holds the floor still without the arena knowing what a draft is.
 * Dependencies stay one-way: `run → arena`, and `draft → run` on top.
 *
 * The ladder is DERIVED here at install from the same `deriveXpLadder` the
 * projection uses, against the same amortized income model — not copied from it.
 * That is the whole point of putting the derivation in `data/`: there is no
 * second implementation to drift.
 */

/** Which term ended the run. The probe's headline reading. */
export type BindingCause =
  | 'running'
  | 'hp-floor'
  | 'traversal-collapse'
  | 'collection-starvation'
  | 'timer';

export interface RunApi {
  outcome: ComputedRef<RunOutcome>;
  bindingCause: ComputedRef<BindingCause>;
  /** Draft beats fired so far. */
  level: ComputedRef<number>;
  /** Beats owed but not yet resolved. The floor is held while this is > 0. */
  pendingPicks: Ref<number>;
  /** Cumulative motes needed for the next beat. */
  nextThreshold: ComputedRef<number>;
  /** How far ahead (+) or behind (−) the authored schedule this run is, in beats. */
  scheduleDelta: ComputedRef<number>;
  /** The derived ladder, exposed so probes can print it. */
  ladder: readonly number[];
  startRun: (seatId?: string) => void;
  /** Resolve one owed pick. `modules/draft.ts` calls this once it has applied one. */
  consumePick: () => void;
}

export const RunKey: InjectionKey<RunApi> = Symbol('survivor/run') as InjectionKey<RunApi>;

export function createRunModule(): EngineModule {
  return {
    id: 'survivor/run',
    dependencies: ['survivor/arena', 'survivor/meta'],
    install(ctx) {
      const arena = ctx.inject(ArenaKey);
      const meta = ctx.inject(MetaKey);

      // The ladder, derived once against the baseline seat's amortized income.
      // Amortized rather than impulsive: see `data/income.ts` § Balance.
      const ladder = deriveXpLadder((t) =>
        cumulativeIncomeAmortized(t, BASELINE_SEAT, SCHEDULE_BALANCE.runSeconds),
      );
      const cumulative: number[] = [];
      ladder.reduce((acc, step) => {
        const next = acc + step;
        cumulative.push(next);
        return next;
      }, 0);

      const stats = withPersistentContext('survivor/run', () => ({
        bestLevel: persistent<number>(0, { id: 'bestLevel' }),
        runsFinished: persistent<number>(0, { id: 'runsFinished' }),
      }));

      const level = ref(0);
      const pendingPicks = ref(0);
      const cause = ref<BindingCause>('running');

      const startRun = (seatId?: string): void => {
        arena.startRun(seatId);
        level.value = 0;
        pendingPicks.value = 0;
        cause.value = 'running';
      };

      const finish = (outcome: Exclude<RunOutcome, 'running'>, why: BindingCause): void => {
        arena.endRun(outcome);
        cause.value = why;
        stats.runsFinished.value += 1;
        // Notes bank on EVERY end, including death — the continuous-accumulator
        // property (`../data/meta.ts` § Balance). Yield is sampled at run midpoint,
        // which is the mix the run actually fought through.
        meta.award(arena.state.value.stats.kills, meanMoteYield(arena.elapsed.value / 2));
        if (level.value > stats.bestLevel.value) stats.bestLevel.value = level.value;
      };

      ctx.onTick((dt) => {
        if (arena.outcome.value !== 'running') return;
        // A pending draft holds the floor. This is the seam a human seat plugs
        // into: the AI resolves within the same tick, a player takes their time.
        if (pendingPicks.value > 0) return;

        const result = arena.advance(dt);
        const elapsed = arena.elapsed.value;

        if (result.died) {
          finish('died', 'hp-floor');
          return;
        }
        if (result.trapped) {
          finish('trapped', 'traversal-collapse');
          return;
        }

        // Beats fire on banked motes, never on the clock — which is what makes
        // income matter and what lets a collector burst deliver several at once.
        while (level.value < cumulative.length && arena.banked.value >= cumulative[level.value]) {
          level.value += 1;
          pendingPicks.value += 1;
        }

        if (elapsed >= SCHEDULE_BALANCE.runSeconds) {
          // Survived the arc. Whether that reads as a win or as a grind is the
          // schedule question: a run that reached the purge several beats short
          // was starved of income, not of time.
          const behind = scheduledBeatsBy(elapsed) - level.value;
          finish('survived', behind > 3 ? 'collection-starvation' : 'timer');
        }
      });

      ctx.provide(RunKey, {
        outcome: arena.outcome,
        bindingCause: computed(() => cause.value),
        level: computed(() => level.value),
        pendingPicks,
        nextThreshold: computed(() =>
          level.value < cumulative.length ? cumulative[level.value] : Number.POSITIVE_INFINITY,
        ),
        scheduleDelta: computed(() => level.value - scheduledBeatsBy(arena.elapsed.value)),
        ladder,
        startRun,
        consumePick: () => {
          if (pendingPicks.value > 0) pendingPicks.value -= 1;
        },
      });

      void beatTime;
    },
  };
}
