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
import {
  EARTHS,
  LEGACY_UPGRADES,
  LEVERS,
  NETWORK_TIERS,
  SOFTCAP_KNEE,
  type ChainTierDef,
  type LegacyUpgradeDef,
} from '../data';
import { CoreKey } from './core';
import { RunKey } from './run';
import { createChain } from './chain';

/**
 * Legacy, the first prestige layer's currency, its shop and the Network it buys.
 * Each Reboot of the timeline banks Legacy, and every hero works harder for each
 * point earned since the last Rewrite. A Rewrite wipes this module's whole
 * context: the Network's units with it, and the Echoes and Earths the Parallel
 * Earths have made this cycle (the Earths themselves belong to Continuity).
 */

export interface LegacyApi {
  legacy: Resource;
  shop: PurchasableCategory<LegacyUpgradeDef>;
  upgrade(id: LegacyUpgradeDef['id']): Purchasable;
  /** Legacy earned since the last Rewrite, spent or not. */
  legacyEarned: ComputedRef<Decimal>;
  /** What Legacy earned multiplies output by: 1 + earned, bent to √ past the knee. */
  legacyMultiplier: ComputedRef<Decimal>;
  /** The Network: Informants, Safehouses and Watchtowers, bought with Legacy. */
  network: ProducerCategory<ChainTierDef>;
  /** Echoes, which the Parallel Earths make this cycle. */
  echo: Resource;
  /** Earth-Twos and Earth-Threes the Earths have made this cycle. */
  earthsMade: [Resource, Resource];
  /** Bank Legacy a Reboot pays; it counts toward Legacy earned. */
  bank(amount: DecimalSource): void;
}

export const LegacyKey: InjectionKey<LegacyApi> = Symbol(
  'scaler/legacy',
) as InjectionKey<LegacyApi>;

let api: LegacyApi;

export function getLegacy(): LegacyApi {
  return api;
}

export const LEGACY_SHOP = 'legacy-shop';

export function createLegacyModule(): EngineModule {
  return {
    id: 'scaler/legacy',
    dependencies: ['scaler/core', 'scaler/run'],
    install(ctx) {
      const core = ctx.inject(CoreKey);
      const run = ctx.inject(RunKey);
      const legacy = createResource<DecimalSource>(0, { id: 'legacy', displayName: 'Legacy' });
      // The run-scoped cumulative of `./run.ts`, one layer up: Legacy arrives only at a
      // Reboot, so the count is kept where it is banked.
      const earned = persistent<DecimalSource>(0, { id: 'legacy-earned', decimal: true });
      const legacyEarned = computed(() => Decimal.fromValue(earned.value));
      const legacyMultiplier = computed(() =>
        Formula.variable(legacyEarned)
          .step(
            () => core.knee.apply(SOFTCAP_KNEE),
            (x) => x.pow(LEVERS.softcapPower),
          )
          .add(1)
          .evaluate(),
      );

      const upgrade = (id: LegacyUpgradeDef['id']): Purchasable =>
        shop.getPurchasable(id) as Purchasable;
      const shop: PurchasableCategory<LegacyUpgradeDef> =
        createPurchasableCategory<LegacyUpgradeDef>({
          id: LEGACY_SHOP,
          mapPurchasable: (def) => {
            const display = { title: def.displayName, description: def.description };
            if (def.id === 'training') {
              return {
                display,
                requirements: (level) =>
                  createCostRequirement({
                    resource: legacy,
                    cost: Formula.exponential(level, LEVERS.trainingBase, LEVERS.trainingRatio),
                  }),
                grants: [
                  {
                    chain: core.output,
                    multiplier: (): Decimal =>
                      Decimal.pow(LEVERS.trainingMult, upgrade('training').count.value),
                    description: 'Hero Training',
                  },
                ],
              };
            }
            const grants =
              def.id === 'public-trust'
                ? [
                    {
                      chain: core.output,
                      multiplier: LEVERS.publicTrustMult,
                      description: def.displayName,
                    },
                  ]
                : def.id === 'press-office'
                  ? [
                      {
                        chain: core.legacyGain,
                        multiplier: LEVERS.pressOfficeMult,
                        description: def.displayName,
                      },
                    ]
                  : [];
            return {
              display,
              requirements: createCostRequirement({ resource: legacy, cost: def.price! }),
              limit: 1,
              grants,
              onPurchase: () => core.log('upgrade', `Bought ${def.displayName}.`),
            };
          },
        });
      shop.register(LEGACY_UPGRADES);

      core.output.bind({
        modifier: createMultiplicativeModifier({
          multiplier: () => legacyMultiplier.value,
          description: 'Legacy',
        }),
        text: 'Legacy',
      });

      const network = createChain({
        id: 'network',
        tiers: NETWORK_TIERS,
        cost: legacy,
        currency: run.hope,
        made: run.networkMade,
        speed: core.hopeSpeed,
        registerTick: ctx.onTick,
      });

      const echo = createResource<DecimalSource>(0, { id: 'echo', displayName: 'Echoes' });
      const earthsMade: [Resource, Resource] = [
        createResource<DecimalSource>(0, { id: 'earth-twos-made' }),
        createResource<DecimalSource>(0, { id: 'earth-threes-made' }),
      ];
      // Echoes count through the potency chain, so Lost Earth's rule can silence them.
      const echoEffect = () =>
        Decimal.mul(core.echoPotency.apply(1), echo.value).add(1).pow(EARTHS.power);
      core.legacyGain.bind({
        modifier: createMultiplicativeModifier({ multiplier: echoEffect, description: 'Echoes' }),
        text: 'Echoes',
      });
      core.hopeSpeed.bind({
        modifier: createMultiplicativeModifier({ multiplier: echoEffect, description: 'Echoes' }),
        text: 'Echoes',
      });

      api = {
        legacy,
        network,
        echo,
        earthsMade,
        shop,
        upgrade,
        legacyEarned,
        legacyMultiplier: computed(() => Decimal.fromValue(legacyMultiplier.value)),
        bank: (amount) => {
          addResource(legacy, amount);
          earned.value = Decimal.add(earned.value, amount);
        },
      };
      ctx.provide(LegacyKey, api);
    },
  };
}
