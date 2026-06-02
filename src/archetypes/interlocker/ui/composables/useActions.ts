import { computed, type ComputedRef } from 'vue';
import { Decimal } from '@open-loop/engine';
import { useBulkMode } from '@/composables/useBulkMode';
import { getBuildings, getResources } from '../../modules';

/**
 * The two manual opener actions that bootstrap the colony from zero, before any
 * catnip field or woodcutter exists (canon buildings.js:2747-2754):
 *   - Gather catnip: +N catnip per click, always available.
 *   - Refine catnip: spend N catnip → produce M wood; gated on catnip, and
 *     honoring the shared ×1/×10/×100 bulk selector (canon's "Refine catnip
 *     x100"). Bulk runs up to the affordable count, like the building buys.
 */
export interface ActionRow {
  id: string;
  label: ComputedRef<string>;
  /** Cost/yield line shown under the label, mirroring canon's button subtext. */
  detail: ComputedRef<string>;
  enabled: ComputedRef<boolean>;
  run: () => void;
}

export function useActions(): ActionRow[] {
  const buildings = getBuildings();
  const resources = getResources();
  const { mode, resolveAmount } = useBulkMode();
  const catnip = resources.resources.catnip;

  // How many refines the wallet can currently fund, then the bulk-resolved
  // count (numeric N capped to affordable; 'max' → all affordable).
  const refineAffordable = computed(() =>
    Decimal.fromValue(catnip.value).div(buildings.refineCatnipCost).floor(),
  );
  const refineCount = computed(() => Decimal.fromValue(resolveAmount(refineAffordable.value)));
  const refineMultiplier = computed(() => (mode.value === 'max' ? 'max' : mode.value));

  return [
    {
      id: 'gather-catnip',
      label: computed(() => 'Gather catnip'),
      detail: computed(() => `+${buildings.gatherCatnipAmount} catnip`),
      enabled: computed(() => true),
      run: () => buildings.gatherCatnip(),
    },
    {
      id: 'refine-catnip',
      label: computed(() =>
        mode.value === 1 ? 'Refine catnip' : `Refine catnip ×${refineMultiplier.value}`,
      ),
      detail: computed(
        () => `${buildings.refineCatnipCost} catnip → ${buildings.refineCatnipWoodOutput} wood`,
      ),
      enabled: computed(() => Decimal.gte(refineCount.value, 1)),
      run: () => {
        const times = Number(refineCount.value);
        for (let i = 0; i < times; i++) {
          if (!buildings.refineCatnip()) break;
        }
      },
    },
  ];
}
