import { computed, ref, watch, type ComputedRef, type Ref } from 'vue';
import { Decimal, persistent, type EngineModule, type InjectionKey } from 'open-loop-engine';
import type { AmbientData } from '../data/types';
import { PrimaryResourceKey, TimeSystemKey } from './auto-producers';
import { UnlocksKey } from './unlocks';

export interface ArcState {
  /** True when arc-closure conditions are currently satisfied. */
  complete: ComputedRef<boolean>;
  /** Latches true the first time `complete` flips true — survives save/load. */
  announced: Ref<boolean>;
  /** End-of-arc flavour line — surfaced by the UI on first crossing. */
  flavour: string;
}

export interface SessionClock {
  /** Sim-time seconds the save has accumulated across all resets. */
  secondsSinceCreation: ComputedRef<number>;
  /** Sim-time seconds since the live session began (post-load, post-catch-up). */
  secondsSinceLastResume: ComputedRef<number>;
  /** Wall-clock catch-up gap delivered at the most recent resume. */
  lastResumeGapSec: Ref<number>;
}

export const ArcKey: InjectionKey<ArcState> = Symbol('ambient/arc') as InjectionKey<ArcState>;
export const SessionClockKey: InjectionKey<SessionClock> = Symbol(
  'ambient/session-clock',
) as InjectionKey<SessionClock>;

const DEFAULT_FLAVOUR =
  'A full year, kept patiently. The garden hums on its own — no urgency, just continuance.';

type Ref2<T> = { value: T };
const asRef = <T>(r: Ref2<T>): Ref<T> => r as unknown as Ref<T>;

/**
 * Composes arc-closure detection and session-clock state for the Ambient
 * archetype.
 *
 * **Arc closure.** Beat 7's "prestige-eligible state reached" condition is
 * `primary >= balance.prestigeEligibleThreshold AND deepest unlock visible`.
 * "Deepest unlock" = the unlock with the highest threshold. The latch
 * announces once on rising edge and survives save/load.
 *
 * **Session clock.** Three ambient-specific predicates compose over the
 * engine's `createTimeSystem` plus a single persistent wall-clock anchor:
 * - `secondsSinceCreation` = `time.totalPlayTime` (sim-time aged).
 * - `secondsSinceLastResume` = `time.elapsed - elapsedAtResume` where
 *   `elapsedAtResume` is captured non-persistently at module install AND
 *   re-captured at `ctx.onLoad` (post-load snapshot).
 * - `offlineGapAtLeast(s)` = `lastResumeGapSec >= s`, with `lastResumeGapSec`
 *   set in `ctx.onLoad` from `Date.now() - lastSaveAtMs`. The persistent
 *   `lastSaveAtMs` is updated each `ctx.onSave`.
 *
 * Catch-up integration (calling `processOfflineTime` against the gap) is
 * outside this module's scope — the boot wrapper or a follow-up wiring
 * step owns that. The gap value is surfaced regardless so
 * `triggeredOnResume` predicates work whether or not catch-up runs.
 */
export function createArcModule(data: AmbientData): EngineModule {
  return {
    id: 'ambient/arc',
    dependencies: ['ambient/auto-producers', 'ambient/unlocks'],
    install(ctx) {
      const time = ctx.inject(TimeSystemKey);
      const primary = ctx.inject(PrimaryResourceKey);
      const unlocks = ctx.inject(UnlocksKey);

      // ─── Session clock ───
      const lastSaveAtMs = persistent<number>(Date.now(), { name: 'lastSaveAtMs' });
      const lastResumeGapSec = ref(0);
      const elapsedAtResume = ref(time.elapsed.value);

      ctx.onSave(() => {
        lastSaveAtMs.value = Date.now();
      });

      ctx.onLoad(() => {
        const gapMs = Date.now() - lastSaveAtMs.value;
        lastResumeGapSec.value = Math.max(0, gapMs / 1000);
        // Post-load elapsed snapshot. If a boot wrapper later runs
        // processOfflineTime against the gap, time.elapsed advances after
        // this hook — secondsSinceLastResume then measures live-session
        // time, not catch-up time. With no wrapper the gap simply isn't
        // integrated into elapsed, and lastResumeGapSec still surfaces it
        // for triggeredOnResume predicates.
        elapsedAtResume.value = time.elapsed.value;
      });

      const secondsSinceCreation = computed(() => time.totalPlayTime.value);
      const secondsSinceLastResume = computed(() => time.elapsed.value - elapsedAtResume.value);

      // ─── Arc closure ───
      const announced = persistent<boolean>(false, { name: 'arcAnnounced' });

      // Sort unlocks by threshold descending; first entry is "deepest".
      // Number-conversion is safe because thresholds are bounded
      // (≤ 50_000_000 in DEFAULT_AMBIENT_DATA). Forks pushing thresholds
      // into Decimal-overflow territory should swap to Decimal.compare.
      const deepestUnlockId = data.unlocks
        .slice()
        .sort((a, b) => Number(b.threshold) - Number(a.threshold))[0]?.id;

      const complete = computed(() => {
        if (!Decimal.gte(primary.value, data.balance.prestigeEligibleThreshold)) return false;
        if (!deepestUnlockId) return false;
        const purchasable = unlocks.getPurchasable(deepestUnlockId);
        return purchasable?.bought.value ?? false;
      });

      watch(
        complete,
        (isComplete) => {
          if (isComplete && !announced.value) announced.value = true;
        },
        { immediate: true },
      );

      ctx.provide(ArcKey, {
        complete,
        announced: asRef(announced),
        flavour: DEFAULT_FLAVOUR,
      });
      ctx.provide(SessionClockKey, {
        secondsSinceCreation,
        secondsSinceLastResume,
        lastResumeGapSec,
      });
    },
  };
}
