import { computed, type ComputedRef, type Ref } from 'vue';
import { Decimal, type DecimalSource } from '@open-loop/engine';
import type { ResourceReadout, ResourceHighlight } from '@/ui/compositions';
import { getBuildings, getResources, getVillage } from '../../modules';
import { DEFAULT_INTERLOCKER_DATA } from '../../data';
import type { ResourceSpec } from '../../data/types';

/**
 * Synthesize the Interlocker wallet into `ResourceReadout[]` for the
 * vertical-sidebar variant of `ResourceHeaderStrip`. Each readout carries the
 * live amount, the chained cap (when the resource has a base cap), and the
 * net rate (positive contributions minus consumption).
 *
 * The `highlight` axis maps to the strip's chip variant:
 *   - 'surplus' when the resource is at or above its cap.
 *   - 'deficit' when the net rate is negative.
 */
export function useResources(): ResourceReadout[] {
  const resources = getResources();
  const village = getVillage();
  const buildings = getBuildings();
  const data = DEFAULT_INTERLOCKER_DATA;
  return data.resources.map((spec) => buildReadout(spec, resources, village, buildings));
}

function buildReadout(
  spec: ResourceSpec,
  resources: ReturnType<typeof getResources>,
  village: ReturnType<typeof getVillage>,
  buildings: ReturnType<typeof getBuildings>,
): ResourceReadout {
  const resourceRef = resources.resources[spec.id];
  const maxChain = resources.maxChains[spec.id];

  // `Resource<Decimal>` exposes `.value` as a writable getter/setter backed by
  // its internal persistent ref; treat it as a Ref for the readout contract.
  const value = resourceRef as unknown as Ref<DecimalSource>;

  const cap =
    spec.baseCapacity !== null
      ? computed<DecimalSource>(
          () => maxChain.apply(spec.baseCapacity as DecimalSource) as DecimalSource,
        )
      : undefined;

  // Rate = chain.apply(0) sums all positive/negative contributions onto the
  // zero base, minus whatever consumption happens outside the chain (smelter
  // draws wood + minerals, village draws catnip) via `subtractResource`
  // directly. Each module that runs a drain owns its own net-rate/
  // consumption-rate computed; the UI reads those single getters rather than
  // re-deriving the per-tick math, so the readout can't drift out of sync
  // with what onTick actually does.
  const rate = computed<DecimalSource>(() => {
    if (spec.id === 'catnip') return village.catnipNetRate.value;
    const baseRate = resources.productionRate(spec.id);
    if (spec.id === 'wood') return baseRate - buildings.smelterConsumptionRate.wood.value;
    if (spec.id === 'minerals') return baseRate - buildings.smelterConsumptionRate.minerals.value;
    return baseRate;
  });

  const highlight: ComputedRef<ResourceHighlight> = computed(() => {
    if (cap && Decimal.gte(value.value, cap.value)) return 'surplus';
    if (Decimal.lt(rate.value, 0)) return 'deficit';
    return 'normal';
  });

  return {
    id: spec.id,
    label: spec.name,
    value,
    cap,
    rate,
    highlight,
  };
}
