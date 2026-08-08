import { computed, type ComputedRef } from 'vue';
import { useModule } from '@/composables/useModule';
import { ArenaKey } from '../modules/arena';
import { RunKey } from '../modules/run';
import { SCHEDULE_BALANCE, scheduledBeatsBy } from '../data/schedule';

/**
 * The beat ladder, as the HUD reads it.
 *
 * Earns its layer by synthesising across two modules — `run` owns the derived
 * ladder and the level, `arena` owns banked motes and elapsed time — into the
 * one thing this archetype's HUD is actually about: **is this run keeping up
 * with the authored schedule?**
 *
 * That question is the archetype's balance thesis on screen. The ladder is
 * derived from the income model so beats land on the authored schedule
 * (`../IDENTITY.md` § Rate-function spine); a run drifting behind it is the
 * collection-starvation binding cause forming in real time, and the probes
 * currently report runs finishing 5–19 beats short. Rendering the ghost marker
 * beside the live one makes that visible without a probe run.
 */

export interface BeatLadderView {
  /** Beats fired so far. */
  level: ComputedRef<number>;
  /** Total beats the authored schedule holds. */
  total: number;
  /** Where the authored schedule says this run should be by now. */
  scheduled: ComputedRef<number>;
  /** Ahead (+) or behind (−) the schedule, in beats. */
  delta: ComputedRef<number>;
  /** Fill toward the next beat, 0–1. */
  progress: ComputedRef<number>;
  /** Motes banked, and what the next beat costs. */
  banked: ComputedRef<number>;
  nextThreshold: ComputedRef<number>;
  /** Run clock as `mm:ss`, and the arc length it runs against. */
  clock: ComputedRef<string>;
  elapsed: ComputedRef<number>;
  runSeconds: number;
}

export function useBeatLadder(): BeatLadderView {
  const arena = useModule(ArenaKey);
  const run = useModule(RunKey);

  // Cumulative thresholds, from the same derived ladder the run module fires
  // against — so the track cannot drift from what actually triggers a beat.
  const cumulative: number[] = [];
  run.ladder.reduce((acc, step) => {
    const next = acc + step;
    cumulative.push(next);
    return next;
  }, 0);

  const level = computed(() => run.level.value);

  const progress = computed(() => {
    const i = level.value;
    if (i >= cumulative.length) return 1;
    const floor = i > 0 ? cumulative[i - 1] : 0;
    const span = cumulative[i] - floor;
    if (span <= 0) return 0;
    return Math.min(1, Math.max(0, (arena.banked.value - floor) / span));
  });

  return {
    level,
    total: cumulative.length,
    scheduled: computed(() => scheduledBeatsBy(arena.elapsed.value)),
    delta: computed(() => run.scheduleDelta.value),
    progress,
    banked: computed(() => arena.banked.value),
    nextThreshold: computed(() => run.nextThreshold.value),
    elapsed: computed(() => arena.elapsed.value),
    runSeconds: SCHEDULE_BALANCE.runSeconds,
    clock: computed(() => formatClock(arena.elapsed.value)),
  };
}

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}
