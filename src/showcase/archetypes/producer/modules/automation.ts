import {
  Decimal,
  computed,
  createAutomationTiers,
  createCostRequirement,
  createPurchasableCategory,
  persistent,
  selectionPaybackPeriod,
  setupPolicyAutoPurchase,
  setupSweepAutoPurchase,
  withPersistentContext,
  type AutomationTiers,
  type EngineModule,
  type InjectionKey,
  type Persistent,
  type Producer,
  type PurchasableCategory,
  type SelectionPolicy,
} from '@open-loop/engine';
import {
  ACQUISITION_INTERVAL,
  DESK_DEAL_RATE,
  EXECUTIVES,
  EXECUTIVE_DEFS,
  type ExecutiveDef,
  type HireId,
} from '../data';
import { FirmKey } from './firm';

/**
 * The executive floor: the hires that hand the firm's work to the firm. Each
 * hire unlocks one automation tier, and each desk works only while its switch is
 * on, so turning a desk off is how the player saves by hand.
 *
 *   - the sales desk closes deals at the hand's pace;
 *   - the acquisitions desk buys the subsidiary that pays itself back soonest;
 *   - the board signs every management memo the moment the money is there.
 */

/** The dispatch ladder's automation tiers: by hand, then one per hire. */
export type ProducerAutomationTier = 'hand' | HireId;

export interface AutomationApi {
  executives: PurchasableCategory<ExecutiveDef>;
  dispatch: AutomationTiers;
  /** Per-desk switches; a hired desk works only while its switch is on. */
  deskOn: Record<HireId, Persistent<boolean>>;
  /** True while the desk is hired and on duty. */
  working(id: HireId): boolean;
  /** What the acquisitions desk holds back for the board: the cheapest open memo. */
  memoReserve: { readonly value: Decimal };
}

export const AutomationKey: InjectionKey<AutomationApi> = Symbol(
  'producer/automation',
) as InjectionKey<AutomationApi>;

let api: AutomationApi;

export function getAutomation(): AutomationApi {
  return api;
}

/** The acquisitions desk's rule: lowest marginal payback, cost of the next unit over what one unit earns. */
export const acquisitionPolicy: SelectionPolicy<Producer> = selectionPaybackPeriod<Producer>(
  (p) => {
    const rate = Decimal.fromValue(p.computedRate.value);
    if (!rate.gt(0) || !p.repeatable) return Infinity;
    return Decimal.fromValue(p.repeatable.getCost(1)).div(rate).toNumber();
  },
);

/**
 * Probe-side variants of the acquisitions desk. The game ships the defaults; the
 * allocation probe swaps them to measure what the desk's rule carries.
 */
export interface AutomationModuleOptions {
  /** The desk's selection rule. Default: `acquisitionPolicy`. */
  policy?: SelectionPolicy<Producer>;
  /** Hold back the cheapest open memo once the board sits. Default: true. */
  memoReserve?: boolean;
  /** Let the desk save for a unit it cannot yet afford. Default: false. */
  waitForCost?: boolean;
}

export function createAutomationModule(options: AutomationModuleOptions = {}): EngineModule {
  return {
    id: 'producer/automation',
    dependencies: ['producer/firm'],
    install(ctx) {
      const firm = ctx.inject(FirmKey);
      const { cash, deal, management, subsidiaries, post } = firm;

      const executives = createPurchasableCategory<ExecutiveDef>({
        id: EXECUTIVES,
        mapPurchasable: (def) => ({
          display: { title: def.title, description: def.description },
          requirements: createCostRequirement({ resource: cash, cost: def.cost }),
          limit: 1,
          visible: def.visible,
        }),
        mapState: (def, p) => {
          p.on('purchased', () => post('hire', `hired ${def.title.toLowerCase()}`, -def.cost));
        },
      });
      executives.register(EXECUTIVE_DEFS);

      const dispatch = createAutomationTiers({
        id: 'dispatch',
        tiers: [
          { id: 'hand' satisfies ProducerAutomationTier, displayName: 'By hand', order: 0 },
          ...EXECUTIVE_DEFS.map((def, j) => ({
            id: def.id satisfies ProducerAutomationTier,
            displayName: def.title,
            order: j + 1,
            unlockWhen: { kind: 'active' as const, category: EXECUTIVES, entry: def.id },
          })),
        ],
      });

      const deskOn = withPersistentContext('desks', () =>
        Object.fromEntries(
          EXECUTIVE_DEFS.map((d) => [d.id, persistent<boolean>(true, { id: d.id })]),
        ),
      ) as Record<HireId, Persistent<boolean>>;
      const working = (id: HireId) => dispatch.hasReached(id) && deskOn[id].value;

      // The sales desk fires the same deal the button fires, at the hand's pace.
      // TODO(expansion): auto-firing a manual producer at a rate. setupPolicyAutoPurchase skips
      // manual producers and createThrottle fires once per tick, so N activations per tick are
      // counted here by hand.
      let owedDeals = 0;
      ctx.onTick((dt) => {
        if (!working('sales-desk')) {
          owedDeals = 0;
          return;
        }
        owedDeals += dt * DESK_DEAL_RATE;
        while (owedDeals >= 1) {
          owedDeals -= 1;
          deal();
        }
      });

      // Once the board sits, the acquisitions desk holds back the price of the cheapest open
      // memo. Otherwise units priced just under a memo absorb every dollar, and the memo, a
      // better buy by construction, waits until the whole ladder outprices it.
      // TODO(expansion): priority between two auto-buyers drawing on one wallet, composed here
      // from the policy buyer's `reserve` over the sweep's candidates.
      const memoReserve = computed(() => {
        if (!working('board')) return Decimal.dZero;
        let floor: Decimal | undefined;
        for (const { def, purchasable } of management.getAll()) {
          if (!purchasable.visible.value || purchasable.active.value) continue;
          if (!floor || floor.gt(def.cost)) floor = Decimal.fromValue(def.cost);
        }
        return floor ?? Decimal.dZero;
      });

      withPersistentContext('desk-clocks', () => {
        setupPolicyAutoPurchase(
          subsidiaries,
          {
            enabled: () => working('acquisitions-desk'),
            interval: ACQUISITION_INTERVAL,
            policy: options.policy ?? acquisitionPolicy,
            reserve: options.memoReserve === false ? undefined : memoReserve,
            waitForCost: options.waitForCost ?? false,
          },
          ctx.onTick,
        );
        setupSweepAutoPurchase(management, { enabled: () => working('board') }, ctx.onTick);
      });

      api = { executives, dispatch, deskOn, working, memoReserve };
      ctx.provide(AutomationKey, api);
    },
  };
}
