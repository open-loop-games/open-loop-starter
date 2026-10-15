import {
  Decimal,
  Formula,
  addResource,
  computed,
  createCostRequirement,
  createMultiplicativeModifier,
  createPurchasableCategory,
  createResource,
  persistent,
  type ComputedRef,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type ProducerCategory,
  type Purchasable,
  type PurchasableCategory,
  type Resource,
} from '@open-loop/engine';
import { createModuleApi } from '@/modules/module-api';
import {
  CONTINUITY_UPGRADES,
  DRILL_LIMIT,
  EARTH_TIERS,
  IMPRINTS,
  LEVERS,
  type ChainTierDef,
  type ContinuityUpgradeDef,
} from '../data';
import { CoreKey } from './core';
import { LegacyKey } from './legacy';
import { createChain } from './chain';

/**
 * Continuity, the second prestige layer's currency, its shop and the Parallel
 * Earths it buys. Each Rewrite of the multiverse banks Continuity, and every
 * point earned this Age multiplies the corps. An Age wipes this module's whole
 * context: the Earths with it, and the Myth and Imprints the Imprints have made
 * this Age (the Imprints themselves belong to Canon). The Age keeps the
 * automation and the Archives (`AGE_KEEPS`).
 */

export interface ContinuityApi {
  continuity: Resource;
  shop: PurchasableCategory<ContinuityUpgradeDef>;
  upgrade(id: ContinuityUpgradeDef['id']): Purchasable;
  /** Continuity earned this Age, spent or not. */
  continuityEarned: ComputedRef<Decimal>;
  /** Parallel Earths: Earth-Two, Earth-Three and Earth-Prime, bought with Continuity. */
  earths: ProducerCategory<ChainTierDef>;
  /** Myth, which the Imprints make this Age. */
  myth: Resource;
  /** Indie and Prestige Imprints the Imprints have made this Age. */
  imprintsMade: [Resource, Resource];
  /** Bank Continuity a Rewrite pays; it counts toward Continuity earned. */
  bank(amount: DecimalSource): void;
}

export const ContinuityKey: InjectionKey<ContinuityApi> = Symbol(
  'scaler/continuity',
) as InjectionKey<ContinuityApi>;

const continuityApi = createModuleApi(ContinuityKey);
export const getContinuity = continuityApi.get;

export const CONTINUITY_SHOP = 'continuity-shop';

export function createContinuityModule(): EngineModule {
  return {
    id: 'scaler/continuity',
    dependencies: ['scaler/core', 'scaler/legacy'],
    install(ctx) {
      const core = ctx.inject(CoreKey);
      const legacy = ctx.inject(LegacyKey);
      const continuity = createResource<DecimalSource>(0, {
        id: 'continuity',
        displayName: 'Continuity',
      });
      // The run-scoped cumulative of `./run.ts`, two layers up, kept where it is banked.
      const earned = persistent<DecimalSource>(0, { id: 'continuity-earned', decimal: true });
      const continuityEarned = computed(() => Decimal.fromValue(earned.value));

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
            if (def.id === 'drill') {
              return {
                display,
                visible: () => upgrade('succession').active.value,
                limit: DRILL_LIMIT,
                requirements: (level) =>
                  createCostRequirement({
                    resource: continuity,
                    cost: Formula.exponential(level, LEVERS.drillBase, LEVERS.drillRatio),
                  }),
              };
            }
            return {
              display,
              requirements: createCostRequirement({ resource: continuity, cost: def.price! }),
              limit: 1,
              onPurchase: () => core.scanner.post(`Bought ${def.displayName}.`, 'upgrade'),
            };
          },
        });
      shop.register(CONTINUITY_UPGRADES);

      core.output.bind({
        modifier: createMultiplicativeModifier({
          multiplier: () => Decimal.add(1, continuityEarned.value).pow(LEVERS.continuityPower),
          description: 'Continuity',
        }),
        text: 'Continuity',
      });

      const earths = createChain({
        id: 'earths',
        tiers: EARTH_TIERS,
        cost: continuity,
        currency: legacy.echo,
        made: legacy.earthsMade,
        speed: core.echoSpeed,
        registerTick: ctx.onTick,
      });

      const myth = createResource<DecimalSource>(0, { id: 'myth', displayName: 'Myth' });
      const imprintsMade: [Resource, Resource] = [
        createResource<DecimalSource>(0, { id: 'indies-made' }),
        createResource<DecimalSource>(0, { id: 'prestiges-made' }),
      ];
      const mythEffect = () => Decimal.add(1, myth.value).pow(IMPRINTS.power);
      core.continuityGain.bind({
        modifier: createMultiplicativeModifier({ multiplier: mythEffect, description: 'Myth' }),
        text: 'Myth',
      });
      core.echoSpeed.bind({
        modifier: createMultiplicativeModifier({ multiplier: mythEffect, description: 'Myth' }),
        text: 'Myth',
      });

      const api: ContinuityApi = {
        continuity,
        shop,
        upgrade,
        continuityEarned,
        earths,
        myth,
        imprintsMade,
        bank: (amount) => {
          addResource(continuity, amount);
          earned.value = Decimal.add(earned.value, amount);
        },
      };
      continuityApi.publish(ctx, api);
    },
  };
}
