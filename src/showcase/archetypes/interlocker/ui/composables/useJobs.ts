import { computed, type ComputedRef } from 'vue';
import { getResources, getVillage } from '../../modules';
import { DEFAULT_INTERLOCKER_DATA } from '../../data';
import type { JobId, JobSpec } from '../../data/types';

export interface JobRow {
  id: JobId;
  name: string;
  def: JobSpec;
  count: ComputedRef<number>;
  ratePerSecond: ComputedRef<number>;
  visible: ComputedRef<boolean>;
  canIncrement: ComputedRef<boolean>;
  canDecrement: ComputedRef<boolean>;
  increment(): void;
  decrement(): void;
}

export interface VillageReadout {
  kittens: ComputedRef<number>;
  unassigned: ComputedRef<number>;
}

/**
 * Population-allocator rows. `+`/`-` clamps client-side against the unassigned
 * pool so the Button's hold-repeat doesn't tail-call into a
 * `JobAssignmentError`. `Button` already wraps `v-hold-repeat`, so consumers
 * only wire the click handler.
 *
 * TODO(expansion): finite-pool allocator row pattern (count + or - against a
 * shared pool). N=1 in the corpus today (Interlocker only); promote into
 * @/ui/compositions/ when Director/Survivor/Packer archetype lands and reuses
 * the shape. See OL-1056 umbrella's "population-as-allocator pressure" note.
 */
export function useJobs(): { rows: JobRow[]; village: VillageReadout } {
  const village = getVillage();
  const resources = getResources();
  const data = DEFAULT_INTERLOCKER_DATA;

  const kittens = computed(() => Number(resources.resources.kittens.value));
  const totalAssigned = computed(() =>
    data.jobs.reduce((sum, def) => sum + village.jobCounts[def.id].value, 0),
  );
  const unassigned = computed(() => Math.max(0, kittens.value - totalAssigned.value));

  const rows = data.jobs.map<JobRow>((def) => {
    const count = computed(() => village.jobCounts[def.id].value);
    const ratePerSecond = computed(() => count.value * def.baseRatePerSecond);
    const visible = computed(() => village.isJobVisible(def.id));
    const canIncrement = computed(() => unassigned.value > 0);
    const canDecrement = computed(() => count.value > 0);

    return {
      id: def.id,
      name: def.name,
      def,
      count,
      ratePerSecond,
      visible,
      canIncrement,
      canDecrement,
      increment() {
        if (!canIncrement.value) return;
        village.setJobCount(def.id, count.value + 1);
      },
      decrement() {
        if (!canDecrement.value) return;
        village.setJobCount(def.id, count.value - 1);
      },
    };
  });

  return { rows, village: { kittens, unassigned } };
}
