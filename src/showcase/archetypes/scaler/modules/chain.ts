import {
  createProducerCategory,
  type ModifierChain,
  type ProducerCategory,
  type RegisterTick,
  type Resource,
} from '@open-loop/engine';
import type { ChainTierDef } from '../data';

/**
 * A layer's cascading chain on the engine's production cascade: tier 1 makes the
 * layer's currency, tier 2 makes tier-1 units, tier 3 makes tier-2 units. A
 * tier's count is what was bought plus what the tier above has made
 * (`extraCount`), so the currency grows as a polynomial in time.
 *
 * Bought units and made units live at different reset depths: the category
 * belongs to the module that owns the cost currency, the made counts and the
 * currency to the module one reset shallower. So a layer's reset clears what its
 * chain made but keeps what was bought with the layer above.
 */
export interface ChainOptions {
  id: string;
  tiers: ChainTierDef[];
  /** What each unit is bought with. */
  cost: Resource;
  /** What tier 1 makes. */
  currency: Resource;
  /** Units tier 2 and tier 3 have made, of tier 1 and tier 2. */
  made: [Resource, Resource];
  /** Multiplies tier 1's output: how fast the chain makes its currency. */
  speed?: ModifierChain;
  registerTick: RegisterTick;
}

export function createChain(options: ChainOptions): ProducerCategory<ChainTierDef> {
  const { cost, currency, made, speed } = options;
  const chain = createProducerCategory<ChainTierDef>({
    id: options.id,
    registerTick: options.registerTick,
    mapProducer: (def) => ({
      resource: def.tier === 1 ? currency : made[def.tier - 2],
      baseRate: def.rate,
      trigger: 'continuous',
      display: def.displayName,
      extraCount: def.tier < 3 ? made[def.tier - 1] : undefined,
      purchase: { costResource: cost, baseCost: def.baseCost, costRatio: def.costRatio },
    }),
    mapState: (def, producer) => {
      if (def.tier === 1 && speed) producer.rateChain.bind({ modifier: speed, text: speed.id });
    },
  });
  chain.register(options.tiers);
  return chain;
}
