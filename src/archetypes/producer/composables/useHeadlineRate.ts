import type { ComputedRef, Ref } from 'vue';
import type { DecimalSource, Resource } from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import { HeadlineRateKey, PrimaryLifetimeKey, PrimaryResourceKey } from '../modules';

export interface HeadlineStats {
  primary: Resource<DecimalSource>;
  lifetime: Ref<DecimalSource>;
  perSecond: ComputedRef<DecimalSource>;
}

export function useHeadlineRate(): HeadlineStats {
  return {
    primary: useModule(PrimaryResourceKey),
    lifetime: useModule(PrimaryLifetimeKey),
    perSecond: useModule(HeadlineRateKey),
  };
}
