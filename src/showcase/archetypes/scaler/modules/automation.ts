import {
  Decimal,
  createAutomationTiers,
  persistent,
  selectionHybridPayback,
  withPersistentContext,
  type AutomationTiers,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type Persistent,
  type Producer,
  type ProducerCategory,
  type Purchasable,
} from '@open-loop/engine';
import { createModuleApi } from '@/modules/module-api';
import {
  ANCHORS,
  CANON_PRICES,
  CONTINUITY_PRICES,
  DRILL_LIMIT,
  LEGACY_PRICES,
  successionInterval,
  type ChainTierDef,
} from '../data';
import { CoreKey } from './core';
import { RunKey } from './run';
import { LegacyKey } from './legacy';
import { ContinuityKey } from './continuity';
import { CanonKey } from './canon';
import { PrestigeKey } from './prestige';

/**
 * The automation ladder, one rung per layer's hand-off:
 *   - the Dispatch Desk recruits heroes;
 *   - the Succession Plan reboots the timeline, at most once per interval;
 *   - the Network Liaison spends Legacy;
 *   - the Crossover Event rewrites the multiverse;
 *   - the Monitor spends Continuity.
 * Turning the Age is never automated. Each piece is a pure policy below, gated
 * by its automation tier, its ownership and, where it resets, its duty switch;
 * the probe's player calls the same policies by hand before the tier is reached.
 */

/** The automation ladder's tiers, in the order the arc reaches them. */
export type ScalerAutomationTier =
  | 'manual'
  | 'dispatch'
  | 'succession'
  | 'liaison'
  | 'crossover'
  | 'monitor';

export interface RebootState {
  pendingLegacy: number;
  legacyEarned: number;
  inElseworld: boolean;
  /** Seconds this timeline has run. */
  runSeconds: number;
}

export interface RebootParams {
  /** Reboot once pending Legacy reaches this share of Legacy earned (never below 1). */
  share: number;
  /** Never sooner than this many seconds into a timeline. */
  interval: number;
}

/** Succession Plan: whether to Reboot now. Never forfeits an Elseworld in progress. */
export function shouldReboot(state: RebootState, params: RebootParams): boolean {
  if (state.inElseworld || state.runSeconds < params.interval) return false;
  return state.pendingLegacy >= Math.max(1, params.share * state.legacyEarned);
}

export interface RewriteState {
  pendingContinuity: number;
  /** Continuity earned this Age. */
  continuityEarned: number;
  inElseworld: boolean;
}

/** Crossover Event: whether to Rewrite now. Never forfeits an Elseworld in progress. */
export function shouldRewrite(state: RewriteState, params: { share: number }): boolean {
  if (state.inElseworld) return false;
  return state.pendingContinuity >= Math.max(1, params.share * state.continuityEarned);
}

// TODO(expansion): setupPolicyAutoPurchase with `waitForCost` lets the policy save, but at
// `interval: 0` it makes one attempt per tick; this desk buys until the policy would rather
// save. One per tick slows the 13th Reboot by 4 minutes (balance/arc-probe.ts).
/** Headroom between the batch's price, summed here, and the engine's sum of it. */
const BATCH_MARGIN = 1e-9;

/**
 * The recruits one-at-a-time recruiting makes first, as a count per row: every
 * recruit that pays back in under a threshold, for the largest threshold whose
 * recruits Justice covers and `room` holds.
 *
 * While the batch's total price is within `amount`, every recruit left in it is
 * affordable at every step, so it waits zero and scores its payback alone. One
 * recruit at a time then buys all of the batch before anything outside it, and
 * the order inside cannot change the counts.
 */
function planBatch(
  rows: { cost: DecimalSource; rate: DecimalSource }[],
  amount: DecimalSource,
  priceRatio: DecimalSource,
  room: number,
): number[] {
  const none = rows.map(() => 0);
  const ratio = Decimal.fromValue(priceRatio).toNumber();
  if (!(ratio > 1) || room < 2 || !Decimal.gt(amount, 0)) return none;
  // Log10 space in doubles: a count is at most `room`, so ratio^count stays in range.
  const step = Math.log10(ratio);
  const logAmount = Decimal.log10(amount).toNumber();
  const lines = rows.map(({ cost, rate }) =>
    Decimal.gt(rate, 0)
      ? {
          payback: Decimal.div(cost, rate).log10().toNumber(),
          share: Decimal.log10(cost).toNumber() - logAmount,
        }
      : undefined,
  );
  const paybacks = lines.flatMap((l) => (l ? [l.payback] : []));
  if (paybacks.length === 0) return none;
  const counts = (t: number) =>
    lines.map((l) => (l && t > l.payback ? Math.ceil((t - l.payback) / step) : 0));
  const fits = (n: number[]) => {
    let total = 0;
    let spend = 0;
    n.forEach((k, j) => {
      if (k === 0) return;
      total += k;
      spend += (10 ** lines[j]!.share * (ratio ** k - 1)) / (ratio - 1);
    });
    return total <= room && spend <= 1 - BATCH_MARGIN;
  };
  // Bisect the threshold: at `lo` nothing pays back under it, at `hi` a row overflows
  // `room` or Justice. `room` may be unbounded, so widen `hi` until one does.
  let lo = Math.min(...paybacks);
  let hi = Math.max(...paybacks) + step;
  while (fits(counts(hi))) hi += 2 * (hi - lo);
  for (let i = 0; i < 64; i++) {
    const mid = (lo + hi) / 2;
    if (fits(counts(mid))) lo = mid;
    else hi = mid;
  }
  return counts(lo);
}

/**
 * Dispatch Desk: recruits one hero at a time, each the winner over every tier,
 * affordable or not, by Cookie Monster's blended payback. Stops when the winner
 * is still being saved for, which is the point: buying whatever is affordable
 * never opens the next tier. Returns recruits made, at most `limit`, which may
 * be `Infinity`.
 *
 * `priceRatio` is the growth of every tier's price per recruit. While Justice
 * covers a whole batch, the desk buys it as one purchase per hero (`planBatch`).
 */
export function recruitHeroes(
  heroes: Producer[],
  income: () => DecimalSource,
  priceRatio: DecimalSource,
  limit: number,
): number {
  // A recruit moves only its own tier's price: a hero's per-unit rate reads its
  // modifier chains, never a count, and spending leaves lifetime Justice (the
  // Legends) alone. So each purchase re-reads only the hero it bought.
  const read = (p: Producer) => ({
    cost: p.purchasable!.getCost(1),
    rate: p.computedRate.value,
    open: !p.purchasable!.maxed.value,
  });
  const scored = new Map(heroes.filter((p) => p.purchasable).map((p) => [p, read(p)]));
  const policy = selectionHybridPayback<Producer>({
    getCost: (p) => scored.get(p)!.cost,
    getRate: (p) => scored.get(p)!.rate,
    getAmount: (p) => p.resource.value,
    getReserve: () => 0,
    getTotalRate: income,
  });
  let bought = 0;
  while (bought < limit) {
    const open = [...scored].filter(([, s]) => s.open).map(([p]) => p);
    if (open.length === 0) break;
    // Every tier is paid in Justice, so any hero's resource is the budget.
    const plan = planBatch(
      open.map((p) => scored.get(p)!),
      open[0]!.resource.value,
      priceRatio,
      limit - bought,
    );
    let made = 0;
    if (plan.reduce((a, b) => a + b, 0) > 1) {
      open.forEach((p, j) => {
        if (plan[j] === 0) return;
        made += Decimal.fromValue(p.purchasable!.purchase(plan[j])).toNumber();
        scored.set(p, read(p));
      });
    }
    if (made === 0) {
      const best = policy.pick(open);
      if (!best?.purchasable!.canPurchase.value) break;
      made = Decimal.fromValue(best.purchasable!.purchase(1)).toNumber();
      if (made === 0) break;
      scored.set(best, read(best));
    }
    bought += made;
  }
  return bought;
}

/**
 * A shop's spending rule, the reference walk's: every one-shot in price order,
 * then the cheapest of what levels, for as long as the cheapest is affordable.
 * Returns purchases made.
 */
export function spendShop(oneShots: Purchasable[], levelled: Purchasable[]): number {
  let bought = 0;
  for (const p of oneShots) {
    if (!p.active.value && p.canPurchase.value && p.purchase(1)) bought++;
  }
  for (;;) {
    const open = levelled.filter((p) => p.visible.value && !p.maxed.value);
    if (open.length === 0) break;
    const next = open.reduce((a, b) => (Decimal.lt(b.getCost(1), a.getCost(1)) ? b : a));
    if (!next.canPurchase.value || !next.purchase(1)) break;
    bought++;
  }
  return bought;
}

const chainUnits = (chain: ProducerCategory<ChainTierDef>): Purchasable[] =>
  chain.getAll().map((e) => e.producer.purchasable!);

export interface AutomationApi {
  ladder: AutomationTiers;
  /** The desk recruits only while on duty. */
  dispatchOn: Persistent<boolean>;
  /** The plan reboots only while on duty. */
  autoRebootOn: Persistent<boolean>;
  /** The plan's share: reboot once pending Legacy reaches it of Legacy earned. */
  autoRebootShare: Persistent<number>;
  /** The Crossover rewrites only while on duty. */
  crossoverOn: Persistent<boolean>;
  /** The Crossover's share: rewrite once pending Continuity reaches it of Continuity earned this Age. */
  crossoverShare: Persistent<number>;
  /** The Succession Plan's interval now. */
  rebootInterval(): number;
  /**
   * Recruit by the desk's policy until it would rather save, with no cap, as a
   * player recruiting by hand; returns units bought.
   */
  recruitBest(): number;
  /** The Liaison's spending: the Legacy shop and the Network. */
  spendLegacy(): number;
  /** The Monitor's spending: the Continuity shop and the Earths. */
  spendContinuity(): number;
  /** The reference player's Canon spending, never automated: the Canon shop and the Imprints. */
  spendCanon(): number;
}

export const AutomationKey: InjectionKey<AutomationApi> = Symbol(
  'scaler/automation',
) as InjectionKey<AutomationApi>;

const automationApi = createModuleApi(AutomationKey);
export const getAutomation = automationApi.get;

/** The most recruits the desk buys per second of game time. The arc reaches it: BALANCING.md § Couplings. */
export const DESK_RECRUITS_PER_SECOND = 1000;

export function createAutomationModule(): EngineModule {
  return {
    id: 'scaler/automation',
    dependencies: [
      'scaler/core',
      'scaler/run',
      'scaler/legacy',
      'scaler/continuity',
      'scaler/canon',
      'scaler/prestige',
    ],
    install(ctx) {
      const core = ctx.inject(CoreKey);
      const run = ctx.inject(RunKey);
      const legacy = ctx.inject(LegacyKey);
      const continuity = ctx.inject(ContinuityKey);
      const canon = ctx.inject(CanonKey);
      const prestige = ctx.inject(PrestigeKey);

      const settings = withPersistentContext('settings', () => ({
        dispatchOn: persistent<boolean>(true, { id: 'dispatch-on' }),
        autoRebootOn: persistent<boolean>(true, { id: 'auto-reboot-on' }),
        autoRebootShare: persistent<number>(ANCHORS.rebootFraction, { id: 'auto-reboot-share' }),
        crossoverOn: persistent<boolean>(true, { id: 'crossover-on' }),
        crossoverShare: persistent<number>(ANCHORS.rewriteFraction, { id: 'crossover-share' }),
      }));

      const owns = {
        dispatch: () => legacy.upgrade('dispatch').active.value,
        succession: () => continuity.upgrade('succession').active.value,
        liaison: () => continuity.upgrade('liaison').active.value,
        crossover: () => canon.upgrade('crossover').active.value,
        monitor: () => canon.upgrade('monitor').active.value,
      };
      const ladder = createAutomationTiers({
        id: 'automation',
        tiers: [
          { id: 'manual' satisfies ScalerAutomationTier, displayName: 'Manual', order: 0 },
          {
            id: 'dispatch' satisfies ScalerAutomationTier,
            displayName: 'Dispatch Desk',
            order: 1,
            unlockWhen: owns.dispatch,
          },
          {
            id: 'succession' satisfies ScalerAutomationTier,
            displayName: 'Succession Plan',
            order: 2,
            unlockWhen: owns.succession,
          },
          {
            id: 'liaison' satisfies ScalerAutomationTier,
            displayName: 'Network Liaison',
            order: 3,
            unlockWhen: owns.liaison,
          },
          {
            id: 'crossover' satisfies ScalerAutomationTier,
            displayName: 'Crossover Event',
            order: 4,
            unlockWhen: owns.crossover,
          },
          {
            id: 'monitor' satisfies ScalerAutomationTier,
            displayName: 'The Monitor',
            order: 5,
            unlockWhen: owns.monitor,
          },
        ],
      });
      ladder.on('unlocked', (id) => {
        const tier = ladder.tiers.find((t) => t.id === id);
        if (tier) core.scanner.post(`Automation online: ${tier.displayName}.`, 'automation');
      });
      // A Rewrite can take the Dispatch Desk away, an Age the Continuity shop; the
      // ladder re-reads what is owned.
      prestige.rewriteReset.on('afterReset', () => ladder.resetUnlocks());
      prestige.ageReset.on('afterReset', () => ladder.resetUnlocks());
      // The ladder counts a rung reached once any rung above it is, but a reset can
      // take one piece (the Dispatch Desk) and leave the rest: each piece also checks
      // that it is owned.
      const running = (tier: Exclude<ScalerAutomationTier, 'manual'>) =>
        ladder.isUnlocked(tier) && owns[tier]();

      const recruit = (limit: number) =>
        recruitHeroes(
          run.heroes.getAll().map((e) => e.producer),
          () => run.totalRate.value,
          run.priceRatio.value,
          limit,
        );
      const recruitBest = () => recruit(Infinity);
      const spendLegacy = () =>
        spendShop(
          (Object.keys(LEGACY_PRICES) as (keyof typeof LEGACY_PRICES)[]).map((id) =>
            legacy.upgrade(id),
          ),
          [legacy.upgrade('training'), ...chainUnits(legacy.network)],
        );
      const spendContinuity = () =>
        spendShop(
          (Object.keys(CONTINUITY_PRICES) as (keyof typeof CONTINUITY_PRICES)[]).map((id) =>
            continuity.upgrade(id),
          ),
          [
            continuity.upgrade('mythic'),
            continuity.upgrade('drill'),
            ...chainUnits(continuity.earths),
          ],
        );
      const spendCanon = () =>
        spendShop(
          (Object.keys(CANON_PRICES) as (keyof typeof CANON_PRICES)[]).map((id) =>
            canon.upgrade(id),
          ),
          chainUnits(canon.imprints),
        );
      const rebootInterval = () =>
        successionInterval(
          Math.min(DRILL_LIMIT, continuity.upgrade('drill').count.value as number),
        );
      const inElseworld = () => prestige.elseworlds.current.value !== null;

      // The desk's limit is per second, so a coarse tick and a fine one allow the
      // same rate. Only the fraction of a recruit carries over; an unspent limit is
      // not banked.
      let carry = 0;
      ctx.onTick((dt) => {
        if (!running('dispatch') || !settings.dispatchOn.value) return;
        const allowance = carry + DESK_RECRUITS_PER_SECOND * dt;
        const limit = Math.floor(allowance);
        carry = allowance - limit;
        recruit(limit);
      });
      ctx.onTick(() => {
        if (running('liaison')) spendLegacy();
        if (running('monitor')) spendContinuity();
      });
      ctx.onTick(() => {
        if (!running('succession') || !settings.autoRebootOn.value) return;
        const state: RebootState = {
          pendingLegacy: prestige.pendingLegacy.value.toNumber(),
          legacyEarned: Decimal.fromValue(legacy.legacyEarned.value).toNumber(),
          inElseworld: inElseworld(),
          runSeconds: run.runSeconds.value,
        };
        const params = { share: settings.autoRebootShare.value, interval: rebootInterval() };
        if (shouldReboot(state, params)) prestige.reboot();
      });
      ctx.onTick(() => {
        if (!running('crossover') || !settings.crossoverOn.value) return;
        const state: RewriteState = {
          pendingContinuity: prestige.pendingContinuity.value.toNumber(),
          continuityEarned: continuity.continuityEarned.value.toNumber(),
          inElseworld: inElseworld(),
        };
        if (shouldRewrite(state, { share: settings.crossoverShare.value })) prestige.rewrite();
      });

      const api: AutomationApi = {
        ladder,
        ...settings,
        rebootInterval,
        recruitBest,
        spendLegacy,
        spendContinuity,
        spendCanon,
      };
      automationApi.publish(ctx, api);
    },
  };
}
