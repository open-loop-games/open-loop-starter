import {
  Decimal,
  createCostRequirement,
  createBooleanRequirement,
  createPurchasableCategory,
  type EngineModule,
  type InjectionKey,
  type Purchasable,
  type PurchasableCategory,
  type ComputedRef,
} from '@open-loop/engine';
import { computed } from 'vue';
import { PRESTIGE_BALANCE, type PrestigeBalance } from '../data/prestige';
import {
  UPGRADE_BALANCE,
  CYCLER_UPGRADES,
  type UpgradeBalance,
  type UpgradeDef,
} from '../data/upgrades';
import { getBuild } from './build';
import { getPrestige } from './prestige';

/**
 * Upgrades module — the permanent catalog on the prestige wallet (see
 * `../IDENTITY.md` § Growth ports, `addUpgrade`). A `createPurchasableCategory`
 * of permanents that cost Fragments:
 *
 *   • reach — freely-sold permanent power (raises D_max). Under the peg this
 *     re-baselines W₀, so it buys REACH at +0 run length. Effect delegates to the
 *     build module (`raisePower`), which OWNS the power level L (build is
 *     self-bootable without this module); the catalog only drives + prices it.
 *   • g-bender — the sole PACE lever, reach-gated. Leveled: each level lowers the
 *     operative g toward the g=1 asymptote (`bendBase`), lengthening every run.
 *     Cost + gate + bend all read the purchasable's OWN `amount` (the bend level)
 *     via a late-bound ref, so there's a single source of truth and no dual-persist.
 *
 * Installs LAST: it reads the Fragments Resource from prestige and the power level
 * from build, and its `bendBase` is read by the cycle kernel's frozen schedule
 * getter (composed over the burn-tier schedule in `modules/index.ts`).
 */
export interface UpgradesApi {
  /** The upgrade catalog. */
  category: PurchasableCategory<UpgradeDef>;
  /** The freely-sold reach permanent (raises build power level L). */
  reach: Purchasable;
  /** The reach-gated g-bender (the sole pace lever). */
  gBender: Purchasable;
  /** Current g-bend level L_bend (the g-bender purchasable's amount). */
  gBendLevel: ComputedRef<number>;
  /** Lower an escalation base g toward the g=1 asymptote by the current bend level. */
  bendBase(g: number): number;
}

export const UpgradesKey: InjectionKey<UpgradesApi> = Symbol(
  'cycler/upgrades',
) as InjectionKey<UpgradesApi>;

let upgrades: UpgradesApi | null = null;

export function getUpgrades(): UpgradesApi {
  if (!upgrades) throw new Error('cycler/upgrades: not installed yet');
  return upgrades;
}

export interface UpgradesModuleOptions {
  prestige?: PrestigeBalance;
  upgrade?: UpgradeBalance;
}

export function createUpgradesModule(options: UpgradesModuleOptions = {}): EngineModule {
  const prestigeData = options.prestige ?? PRESTIGE_BALANCE;
  const upgradeData = options.upgrade ?? UPGRADE_BALANCE;
  const quorum = prestigeData.mergeQuorum;
  const {
    powerUpgradeCostRatio: ratio,
    gBendRatio,
    gBendBaseCost,
    gBendCostRatio,
    gBendGateStep,
  } = upgradeData;

  return {
    id: 'cycler/upgrades',
    install(ctx) {
      // Late-bound holder for the g-bender purchasable — its `amount` is the bend
      // level L_bend, the single source of truth read by the cost, the reach gate,
      // and `bendBase`. Populated after `register`; every getter that reads it is
      // lazy (affordability checks / run-start), so it's always set by call time.
      const holder: { gBender?: Purchasable } = {};
      const gBendLevelOf = (): number => Number(holder.gBender?.amount.value ?? 0);

      const category = createPurchasableCategory<UpgradeDef>({
        id: 'cycler/upgrades',
        mapPurchasable: (def) => {
          if (def.kind === 'reach') {
            // Cost = mergeQuorum · ratio^L, keyed off the LIVE power level L (build
            // owns it). `onPurchase` raises L; the purchasable's own `amount` tracks
            // the buy count (== L, since only this raises power now). Single-step
            // (`bulkPurchase: false`) so the live-L cost is never mispriced by a
            // buy-max walk.
            return {
              display: { title: def.title, description: def.description },
              requirements: createCostRequirement({
                resource: getPrestige().fragmentsResource,
                cost: () =>
                  new Decimal(quorum).mul(Decimal.pow(ratio, getBuild().powerLevel.value)),
              }),
              limit: Infinity,
              bulkPurchase: false,
              onPurchase: () => {
                getBuild().raisePower();
              },
            };
          }
          if (def.kind === 'g-bender') {
            // The sole pace lever. Two requirements (flat array — not allOf — so
            // the cost stays bulk-aware; bulkPurchase is off anyway):
            //   • cost — geometric in the bend level: base · ratio^L_bend.
            //   • reach gate — the NEXT level (L_bend+1) needs L ≥ (L_bend+1)·step.
            // The bend itself is applied through the frozen schedule getter
            // (`modules/index.ts` → `bendBase`), so it lands on the next run.
            return {
              display: { title: def.title, description: def.description },
              requirements: [
                createCostRequirement({
                  resource: getPrestige().fragmentsResource,
                  cost: () =>
                    new Decimal(gBendBaseCost).mul(Decimal.pow(gBendCostRatio, gBendLevelOf())),
                }),
                createBooleanRequirement({
                  requirement: () =>
                    getBuild().powerLevel.value >= (gBendLevelOf() + 1) * gBendGateStep,
                  description: 'reach gate',
                }),
              ],
              limit: Infinity,
              bulkPurchase: false,
            };
          }
          throw new Error(`cycler/upgrades: unhandled upgrade kind '${(def as UpgradeDef).kind}'`);
        },
      });
      category.register(CYCLER_UPGRADES);

      const reach = category.getPurchasable('reach');
      holder.gBender = category.getPurchasable('g-bender');
      if (!reach || !holder.gBender) throw new Error('cycler/upgrades: catalog failed to register');
      const gBender = holder.gBender;

      const gBendLevel = computed(() => gBendLevelOf());
      // g_eff = 1 + (g − 1)·r_bend^L_bend — the multiplicative approach to the g=1
      // asymptote (data/upgrades.ts § Balance (g-bender)). L_bend 0 ⇒ g unchanged.
      const bendBase = (g: number): number => 1 + (g - 1) * Math.pow(gBendRatio, gBendLevelOf());

      const api: UpgradesApi = { category, reach, gBender, gBendLevel, bendBase };
      upgrades = api;
      ctx.provide(UpgradesKey, api);
    },
  };
}
