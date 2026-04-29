import type { ComputedRef, DecimalSource, EngineRef, Resource } from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import { HeadlineRateKey, PrimaryLifetimeKey, PrimaryResourceKey } from '../modules';

export interface HeadlineStats {
  primary: Resource<DecimalSource>;
  lifetime: EngineRef<DecimalSource>;
  perSecond: ComputedRef<DecimalSource>;
}

export function useHeadlineRate(): HeadlineStats {
  return {
    primary: useModule(PrimaryResourceKey),
    lifetime: useModule(PrimaryLifetimeKey),
    perSecond: useModule(HeadlineRateKey),
  };
}
