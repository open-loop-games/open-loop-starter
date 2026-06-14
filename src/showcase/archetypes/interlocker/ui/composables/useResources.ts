import { computed, type ComputedRef, type Ref } from 'vue';
import { Decimal, type DecimalSource } from '@open-loop/engine';
import type { ResourceReadout, ResourceHighlight } from '@/ui/compositions';
import { getCalendar, getResources } from '../../modules';
import { DEFAULT_INTERLOCKER_DATA } from '../../data';
import type { InterlockerData, ResourceSpec } from '../../data/types';

/**
 * Synthesize the Interlocker wallet into `ResourceReadout[]` for the
 * vertical-sidebar variant of `ResourceHeaderStrip`. Each readout carries the
 * live amount, the chained cap (when the resource has a base cap), and the
 * net rate (positive contributions minus consumption for catnip).
 *
 * The `highlight` axis maps to the strip's chip variant:
 *   - 'surplus' when the resource is at or above its cap.
 *   - 'deficit' when the net rate is negative.
 */
export function useResources(): ResourceReadout[] {
  const resources = getResources();
  const calendar = getCalendar();
  const data = DEFAULT_INTERLOCKER_DATA;
  return data.resources.map((spec) => buildReadout(spec, resources, calendar, data));
}

function buildReadout(
  spec: ResourceSpec,
  resources: ReturnType<typeof getResources>,
  calendar: ReturnType<typeof getCalendar>,
  data: InterlockerData,
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
  // zero base. Catnip is special: its production is scaled by the active
  // season (mirrors village onTick's read-site multiply), and consumption
  // happens outside the chain (village subtractResource), so the displayed
  // rate is seasoned-production minus the live consumption magnitude. Other
  // resources read the rate chain directly.
  const rate = computed<DecimalSource>(() => {
    const baseRate = resources.productionRate(spec.id);
    if (spec.id === 'catnip') {
      const production = baseRate * calendar.catnipMultiplier.value;
      const kittens = Number(resources.resources.kittens.value);
      const perKitten = Math.abs(data.catnipPerKittenPerSec);
      return production - perKitten * kittens;
    }
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
