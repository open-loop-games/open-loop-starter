import { inject, type ComputedRef, type Ref } from 'vue';
import type { DecimalSource, Engine, Resource } from 'open-loop-engine';
import { HeadlineRateKey, PrimaryLifetimeKey, PrimaryResourceKey } from '../modules';

export interface HeadlineStats {
  primary: Resource<DecimalSource>;
  lifetime: Ref<DecimalSource>;
  perSecond: ComputedRef<DecimalSource>;
}

export function useHeadlineRate(): HeadlineStats {
  const engine = inject<Engine>('engine');
  const primary = engine?.tryInject(PrimaryResourceKey);
  const lifetime = engine?.tryInject(PrimaryLifetimeKey);
  const perSecond = engine?.tryInject(HeadlineRateKey);
  if (!primary || !lifetime || !perSecond) {
    throw new Error('useHeadlineRate() called outside an active producer engine');
  }
  return {
    primary,
    lifetime,
    perSecond: perSecond as unknown as ComputedRef<DecimalSource>,
  };
}
