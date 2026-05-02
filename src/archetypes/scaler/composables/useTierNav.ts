import { ref, type Ref } from 'vue';
import type { Tier } from '../data/types';

const activeTier: Ref<Tier> = ref('antimatter');

export interface TierNavApi {
  activeTier: Ref<Tier>;
  setTier: (tier: Tier) => void;
}

/**
 * Active prestige-layer tab + setter. Module-scope ref so every consumer
 * (Tabs in AppRoot, sidebar chain readout, projected-gain text) reads the
 * same value without prop-drilling. Session-local; not persisted across
 * reloads in 2b. Promote to a UI module + persistent ref if forks need it.
 */
export function useTierNav(): TierNavApi {
  return {
    activeTier,
    setTier: (tier: Tier) => {
      activeTier.value = tier;
    },
  };
}
