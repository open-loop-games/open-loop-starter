import {
  Decimal,
  createCostRequirement,
  createMultiplicativeModifier,
  createPurchasableCategory,
  createResource,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type ProducerCategory,
  type Purchasable,
  type PurchasableCategory,
  type Resource,
} from '@open-loop/engine';
import {
  CANON_UPGRADES,
  IMPRINT_TIERS,
  LEVERS,
  type CanonUpgradeDef,
  type ChainTierDef,
} from '../data';
import { CoreKey } from './core';
import { ContinuityKey } from './continuity';
import { createChain } from './chain';

/**
 * Canon, the third prestige layer's currency, its shop and the Imprints it buys.
 * Each Turn of the Age banks Canon; Canon ever earned multiplies the corps and
 * every Rewrite's Continuity. Nothing resets this module.
 */

export interface CanonApi {
  canon: Resource;
  shop: PurchasableCategory<CanonUpgradeDef>;
  upgrade(id: CanonUpgradeDef['id']): Purchasable;
  /** Imprints: Indie, Prestige and the Flagship Line, bought with Canon. */
  imprints: ProducerCategory<ChainTierDef>;
}

export const CanonKey: InjectionKey<CanonApi> = Symbol('scaler/canon') as InjectionKey<CanonApi>;

let api: CanonApi;

export function getCanon(): CanonApi {
  return api;
}

export const CANON_SHOP = 'canon-shop';

export function createCanonModule(): EngineModule {
  return {
    id: 'scaler/canon',
    dependencies: ['scaler/core', 'scaler/continuity'],
    install(ctx) {
      const core = ctx.inject(CoreKey);
      const continuity = ctx.inject(ContinuityKey);
      const canon = createResource<DecimalSource>(0, { id: 'canon', displayName: 'Canon' });

      const shop = createPurchasableCategory<CanonUpgradeDef>({
        id: CANON_SHOP,
        mapPurchasable: (def) => ({
          display: { title: def.displayName, description: def.description },
          requirements: createCostRequirement({ resource: canon, cost: def.price }),
          limit: 1,
          onPurchase: () => core.log('upgrade', `Bought ${def.displayName}.`),
        }),
      });
      shop.register(CANON_UPGRADES);

      // Read off the engine's lifetime tracker, so spending Canon never costs the bonus.
      const ever = () => Decimal.add(1, canon.cumulative!.value);
      core.output.bind({
        modifier: createMultiplicativeModifier({
          multiplier: () => ever().pow(LEVERS.canonPower),
          description: 'Canon',
        }),
        text: 'Canon',
      });
      core.continuityGain.bind({
        modifier: createMultiplicativeModifier({
          multiplier: () => ever().pow(LEVERS.canonGainPower),
          description: 'Canon',
        }),
        text: 'Canon',
      });

      const imprints = createChain({
        id: 'imprints',
        tiers: IMPRINT_TIERS,
        cost: canon,
        currency: continuity.myth,
        made: continuity.imprintsMade,
        registerTick: ctx.onTick,
      });

      api = {
        canon,
        shop,
        upgrade: (id) => shop.getPurchasable(id) as Purchasable,
        imprints,
      };
      ctx.provide(CanonKey, api);
    },
  };
}
