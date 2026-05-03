import { computed } from 'vue';
import type { ComputedRef, Ref } from 'vue';
import type { DecimalSource, Resource } from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import { AutoProducersKey, PrimaryLifetimeKey, PrimaryResourceKey } from '../modules';

export interface HeadlineStats {
  primary: Resource<DecimalSource>;
  lifetime: Ref<DecimalSource>;
  perSecond: ComputedRef<DecimalSource>;
}

export function useHeadlineRate(): HeadlineStats {
  const primary = useModule(PrimaryResourceKey);
  const buildings = useModule(AutoProducersKey);
  return {
    primary,
    lifetime: useModule(PrimaryLifetimeKey),
    perSecond: computed(() => buildings.getTotalRate(primary)),
  };
}
