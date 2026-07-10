import { computed, type ComputedRef } from 'vue';
import { type DecimalSource } from '@open-loop/engine';
import { getSciences } from '../../modules';
import { DEFAULT_INTERLOCKER_DATA } from '../../data';
import type { ScienceId, ScienceSpec } from '../../data/types';

export interface ScienceRow {
  id: ScienceId;
  name: string;
  def: ScienceSpec;
  cost: ComputedRef<DecimalSource>;
  prerequisiteName: string | null;
  researched: ComputedRef<boolean>;
  visible: ComputedRef<boolean>;
  canResearch: ComputedRef<boolean>;
  prereqMet: ComputedRef<boolean>;
  research(): void;
}

export function useSciences(): ScienceRow[] {
  const sciences = getSciences();
  const data = DEFAULT_INTERLOCKER_DATA;
  const nameById = new Map(data.sciences.map((s) => [s.id, s.name]));

  return data.sciences.map<ScienceRow>((def) => {
    const entry = computed(() => sciences.category.getEntry(def.id));
    const researched = computed(() => sciences.scienceCompleted(def.id));
    const prereqMet = computed(
      () => def.prerequisite == null || sciences.scienceCompleted(def.prerequisite),
    );
    // Show every prereq-met or already-researched science. Locked sciences
    // with unmet prereqs stay hidden — matches `SciencesApi.isVisible` for
    // research-ability, but the panel also keeps researched rows visible as a
    // checked-off list.
    const visible = computed(() => prereqMet.value);
    const canResearch = computed(() => entry.value?.purchasable.canPurchase.value ?? false);
    const prerequisiteName = def.prerequisite ? (nameById.get(def.prerequisite) ?? null) : null;
    const cost = computed<DecimalSource>(() => sciences.scienceCost(def.id));

    return {
      id: def.id,
      name: def.name,
      def,
      cost,
      prerequisiteName,
      researched,
      visible,
      canResearch,
      prereqMet,
      research() {
        if (!canResearch.value) return;
        entry.value!.purchasable.purchase(1);
      },
    };
  });
}
