import {
  Decimal,
  Formula,
  createCostRequirement,
  createMultiplicativeModifier,
  createPurchasableCategory,
  createResource,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type Purchasable,
  type PurchasableCategory,
  type Resource,
} from '@open-loop/engine';
import { CONTINUITY_POWER, CONTINUITY_UPGRADES, LEVERS, type ContinuityUpgradeDef } from '../data';
import { CoreKey } from './core';

/**
 * Continuity, the second prestige layer's currency, and its shop. Each Rewrite
 * of the multiverse banks Continuity, and every point ever earned multiplies the
 * corps. Nothing resets it.
 */

export interface ContinuityApi {
  continuity: Resource;
  shop: PurchasableCategory<ContinuityUpgradeDef>;
  upgrade(id: ContinuityUpgradeDef['id']): Purchasable;
}

export const ContinuityKey: InjectionKey<ContinuityApi> = Symbol(
  'scaler/continuity',
) as InjectionKey<ContinuityApi>;

let api: ContinuityApi;

export function getContinuity(): ContinuityApi {
  return api;
}

export const CONTINUITY_SHOP = 'continuity-shop';

export function createContinuityModule(): EngineModule {
  return {
    id: 'scaler/continuity',
    dependencies: ['scaler/core'],
    install(ctx) {
      const core = ctx.inject(CoreKey);
      const continuity = createResource<DecimalSource>(0, {
        id: 'continuity',
        displayName: 'Continuity',
      });

      const upgrade = (id: ContinuityUpgradeDef['id']): Purchasable =>
        shop.getPurchasable(id) as Purchasable;
      const shop: PurchasableCategory<ContinuityUpgradeDef> =
        createPurchasableCategory<ContinuityUpgradeDef>({
          id: CONTINUITY_SHOP,
          mapPurchasable: (def) => {
            const display = { title: def.displayName, description: def.description };
            if (def.id === 'mythic') {
              return {
                display,
                requirements: (level) =>
                  createCostRequirement({
                    resource: continuity,
                    cost: Formula.exponential(level, LEVERS.mythicBase, LEVERS.mythicRatio),
                  }),
                grants: [
                  {
                    chain: core.legacyGain,
                    multiplier: (): Decimal =>
                      Decimal.pow(LEVERS.mythicMult, upgrade('mythic').count.value),
                    description: def.displayName,
                  },
                ],
              };
            }
            return {
              display,
              requirements: createCostRequirement({ resource: continuity, cost: def.price! }),
              limit: 1,
              onPurchase: () => core.log('upgrade', `Bought ${def.displayName}.`),
            };
          },
        });
      shop.register(CONTINUITY_UPGRADES);

      // Continuity ever earned multiplies output: read off the engine's lifetime
      // tracker, so spending Continuity never costs the bonus.
      core.output.bind({
        modifier: createMultiplicativeModifier({
          multiplier: () => Decimal.add(1, continuity.cumulative!.value).pow(CONTINUITY_POWER),
          description: 'Continuity',
        }),
        text: 'Continuity',
      });

      api = { continuity, shop, upgrade };
      ctx.provide(ContinuityKey, api);
    },
  };
}
