import { computed, ref, type ComputedRef, type Ref } from 'vue';
import { type EngineModule, type InjectionKey } from 'open-loop-engine';
import { TimeSystemKey } from './auto-producers';

export interface SessionClock {
  /** Sim-time seconds the save has accumulated across all resets. */
  secondsSinceCreation: ComputedRef<number>;
  /**
   * Sim-time seconds since the live session began. After
   * `processOfflineTime` runs at session start, AppRoot must call
   * `refreshElapsedAtResume()` so this measures live-session time rather
   * than including the catch-up advance.
   */
  secondsSinceLastResume: ComputedRef<number>;
  /**
   * Wall-clock catch-up gap delivered at the most recent resume. Writable:
   * AppRoot computes this from `engine.load().timestamp` (the engine's
   * SaveManager already records save timestamps, so we do not duplicate
   * that tracking here) and writes the result post-load. Defaults to 0 on
   * cold boot.
   */
  lastResumeGapSec: Ref<number>;
  /**
   * Re-snap `elapsedAtResume` to the current `time.elapsed`. AppRoot calls
   * this after `processOfflineTime` returns so subsequent reads of
   * `secondsSinceLastResume` exclude the catch-up advance.
   */
  refreshElapsedAtResume(): void;
}

export const SessionClockKey: InjectionKey<SessionClock> = Symbol(
  'ambient/session-clock',
) as InjectionKey<SessionClock>;

/**
 * Session-clock predicates over the engine's TimeSystem. Drives the
 * `secondsSinceCreation` / `secondsSinceLastResume` / `offlineGapAtLeast`
 * predicates in `AmbientGameState`; the achievements module reads via the
 * provided computed refs.
 *
 * Resume timeline (AppRoot-driven):
 *   1. `engine.load()` fires `ctx.onLoad`; this module captures
 *      `elapsedAtResume = time.elapsed` (pre-catchup snapshot).
 *   2. AppRoot reads `engine.load().timestamp`, computes
 *      `gap = (Date.now() - timestamp) / 1000`, writes
 *      `sessionClock.lastResumeGapSec.value = gap`.
 *   3. AppRoot calls `processOfflineTime(engine.loop, gap, ...)`, which
 *      advances `time.elapsed` (and `time.totalPlayTime`) by the gap.
 *   4. AppRoot calls `sessionClock.refreshElapsedAtResume()` so
 *      `secondsSinceLastResume` resumes measuring live-session time.
 */
export function createSessionClockModule(): EngineModule {
  return {
    id: 'ambient/session-clock',
    dependencies: ['ambient/auto-producers'],
    install(ctx) {
      const time = ctx.inject(TimeSystemKey);
      const elapsedAtResume = ref(time.elapsed.value);
      const lastResumeGapSec = ref(0);

      const secondsSinceCreation = computed(() => time.totalPlayTime.value);
      const secondsSinceLastResume = computed(() => time.elapsed.value - elapsedAtResume.value);

      ctx.onLoad(() => {
        elapsedAtResume.value = time.elapsed.value;
      });

      ctx.provide(SessionClockKey, {
        secondsSinceCreation,
        secondsSinceLastResume,
        lastResumeGapSec,
        refreshElapsedAtResume: () => {
          elapsedAtResume.value = time.elapsed.value;
        },
      });
    },
  };
}
