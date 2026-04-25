import { computed, inject, type ComputedRef, type Ref } from 'vue';
import type { DecimalSource, Engine } from 'open-loop-engine';
import { HeadlineRateKey, PrimaryLifetimeKey, PrimaryResourceKey } from '../modules';

export interface HeadlineStats {
  /**
   * Materialised primary-resource value. Read in templates; do not pass the
   * underlying `Resource` directly because its Ref-brand from the engine's Vue
   * install does not match the starter's Vue Ref-brand (OL-622/625).
   */
  primary: ComputedRef<DecimalSource>;
  lifetime: Ref<DecimalSource>;
  perSecond: ComputedRef<DecimalSource>;
}

export function useHeadlineRate(): HeadlineStats {
  const engine = inject<Engine>('engine');
  const primary = engine?.tryInject(PrimaryResourceKey);
  const lifetime = engine?.tryInject(PrimaryLifetimeKey);
  const perSecond = engine?.tryInject(HeadlineRateKey);
  if (!primary || !lifetime || !perSecond) {
    throw new Error('useHeadlineRate() called outside an active ambient engine');
  }
  return {
    primary: computed(() => primary.value),
    lifetime,
    perSecond: perSecond as unknown as ComputedRef<DecimalSource>,
  };
}
