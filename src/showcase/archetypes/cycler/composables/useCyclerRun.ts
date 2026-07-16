import { computed, type ComputedRef } from 'vue';
import { Decimal } from '@open-loop/engine';
import { getCycle, getBuild, getPrestige, type CyclePhase } from '../modules';

/**
 * Cross-module synthesis for the run readout — the containment gauge and the
 * merge header both read the same derived state (phase, pressure, the burn vs
 * capacity race, the pending payout), so it lives here once rather than in each
 * panel. Reads the cycle kernel, the build ceiling, and the prestige payout;
 * earns the composable layer with `computed` synthesis across the three.
 *
 * Consumed only from panels under the post-start game view, so the module
 * getters are always resolved by call time (see `.claude/rules/app-root-discipline.md`).
 */
export interface CyclerRunView {
  /** The active beat, phased. */
  phase: ComputedRef<CyclePhase>;
  /** Player-facing phase name. */
  phaseLabel: ComputedRef<string>;
  /** Elapsed run-time in whole seconds (for `formatTime`). */
  elapsedSeconds: ComputedRef<number>;
  /** Closed-form authored run length N* (minutes). */
  predictedMinutes: ComputedRef<number>;
  /** burn / D_max, clamped to [0, 1] — the vessel fill. */
  fill: ComputedRef<number>;
  /** Raw pressure burn / D_max (may exceed 1 at the crossing). */
  pressure: ComputedRef<number>;
  /** Current exogenous burn W(t) — the debit the ceiling must outpace. */
  burn: ComputedRef<Decimal>;
  /** Saturated capacity ceiling D_max the burn is racing. */
  capacity: ComputedRef<Decimal>;
  /** True once the burn has overtaken D_max — the merge bell. */
  ended: ComputedRef<boolean>;
  /** Fragments the current run has accrued (banked automatically at the bell). */
  pendingFragments: ComputedRef<Decimal>;
  /** Permanent power level L (reach), carried across merges. */
  powerLevel: ComputedRef<number>;
  /** Re-peg and start the next run. Returns false unless the bell has rung. */
  merge(): boolean;
}

const PHASE_LABELS: Record<CyclePhase, string> = {
  setup: 'Setup',
  comfortable: 'Comfortable',
  'first-bite': 'First bite',
  'under-review': 'Under review',
  'merge-bell': 'Merge bell',
};

export function useCyclerRun(): CyclerRunView {
  const cycle = getCycle();
  const build = getBuild();
  const prestige = getPrestige();

  const phase = computed(() => cycle.phase.value);
  const phaseLabel = computed(() => PHASE_LABELS[phase.value]);
  const elapsedSeconds = computed(() => Math.floor(cycle.elapsedMinutes.value * 60));
  const predictedMinutes = computed(() => cycle.predictedRunLength());
  const pressure = computed(() => cycle.pressure.value);
  const fill = computed(() => Math.max(0, Math.min(1, pressure.value)));
  const ended = computed(() => cycle.runState.value === 'ended');

  return {
    phase,
    phaseLabel,
    elapsedSeconds,
    predictedMinutes,
    fill,
    pressure,
    burn: cycle.burn,
    capacity: cycle.capacity,
    ended,
    pendingFragments: prestige.pendingFragments,
    powerLevel: build.powerLevel,
    merge: prestige.merge,
  };
}
