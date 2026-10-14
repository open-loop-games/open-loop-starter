import {
  Decimal,
  Formula,
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
  type Purchasable,
  type PurchasableCategory,
  type Resource,
} from '@open-loop/engine';
import { LEGACY_UPGRADES, LEVERS, SOFTCAP_KNEE, type LegacyUpgradeDef } from '../data';
import { CoreKey } from './core';

/**
 * Legacy, the first prestige layer's currency, and its shop. Each Reboot of the
 * timeline banks Legacy, and every hero works harder for each point earned since
 * the last Rewrite. A Rewrite wipes this module's whole context.
 */

export interface LegacyApi {
  legacy: Resource;
  shop: PurchasableCategory<LegacyUpgradeDef>;
  upgrade(id: LegacyUpgradeDef['id']): Purchasable;
  /** Legacy earned since the last Rewrite, spent or not. */
  legacyEarned: ComputedRef<Decimal>;
  /** What Legacy earned multiplies output by: 1 + earned, bent to √ past the knee. */
  legacyMultiplier: ComputedRef<Decimal>;
  /** Start counting `legacyEarned` from now; the Rewrite calls it once it settles. */
  markRewriteStart(): void;
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
    dependencies: ['scaler/core'],
    install(ctx) {
      const core = ctx.inject(CoreKey);
      const legacy = createResource<DecimalSource>(0, { id: 'legacy', displayName: 'Legacy' });
      // The run-scoped cumulative of `./run.ts`, one layer up.
      const rewriteMark = persistent<DecimalSource>(0, { id: 'rewrite-mark', decimal: true });
      const legacyEarned = computed(() => Decimal.sub(legacy.cumulative!.value, rewriteMark.value));
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

      api = {
        legacy,
        shop,
        upgrade,
        legacyEarned,
        legacyMultiplier: computed(() => Decimal.fromValue(legacyMultiplier.value)),
        markRewriteStart: () => {
          rewriteMark.value = legacy.cumulative!.value;
        },
      };
      ctx.provide(LegacyKey, api);
    },
  };
}
