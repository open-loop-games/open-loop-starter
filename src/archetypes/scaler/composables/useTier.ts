import { computed, type ComputedRef } from 'vue';
import type {
  ChallengeCategory,
  ChallengeDef as EngineChallengeDef,
  DecimalSource,
  ModifierChain,
  Resource,
} from 'open-loop-engine';
import { useModule } from '@/composables/useModule';
import type { Tier } from '../data/types';
import { ScalerTiersKey } from '../modules';
import type { TierDisplay } from '../ui/tier-configs';
import { useProducers, type ProducerRow } from './useProducers';
import { useUpgrades, type UpgradeRow } from './useUpgrades';
import { useTierReset, type TierResetApi } from './useTierReset';

export interface TierState {
  id: Tier;
  display: TierDisplay;
  currency: Resource<DecimalSource>;
  shards?: Resource<DecimalSource>;
  producers: ComputedRef<ProducerRow[]>;
  rateChains: ModifierChain[];
  totalRate: ComputedRef<DecimalSource>;
  upgrades?: ComputedRef<UpgradeRow<{ id: string }>[]>;
  reset?: TierResetApi;
  challenges?: ChallengeCategory<EngineChallengeDef>;
}

/**
 * Compose a tier's UI-facing state bag from its display config. Resolves
 * the tier from the engine's `ScalerTiersKey` (the archetype-specific
 * tier registry) and pairs the engine-side bundle with display-side
 * labels. Internally calls the parameterized composables (`useProducers`,
 * `useUpgrades`, `useTierReset`); components that need only one slice
 * (e.g. a sidebar chain readout) can call the building blocks directly.
 *
 * `rateChains` and `totalRate` derive from the producer category — they're
 * one-liners off `producers.getAll()` rather than separate fields, since
 * the category is already in scope via the tier bundle.
 */
export function useTier(display: TierDisplay): TierState {
  const tiers = useModule(ScalerTiersKey);
  const tier = tiers.find((t) => t.id === display.id);
  if (!tier) {
    throw new Error(`useTier: tier '${display.id}' missing from ScalerTiersKey`);
  }

  const rateChains = tier.producers.getAll().map((entry) => entry.producer.rateChain);
  // Producers in scaler always emit into shards (when present) or the tier's
  // own currency (antimatter case where coins are both currency and output).
  const outputResource = tier.shards ?? tier.currency;
  const totalRate = computed(() => tier.producers.getTotalRate(outputResource));
  const producers = useProducers(tier.producers);
  const upgrades = tier.upgrades
    ? (useUpgrades(tier.upgrades) as unknown as ComputedRef<UpgradeRow<{ id: string }>[]>)
    : undefined;
  const reset = tier.conversion ? useTierReset(tier.conversion) : undefined;

  return {
    id: tier.id,
    display,
    currency: tier.currency,
    shards: tier.shards,
    producers,
    rateChains,
    totalRate,
    upgrades,
    reset,
    challenges: tier.challenges,
  };
}
