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
/**
 * Dispatch Desk: which hero to recruit next, ranked over every tier, affordable
 * or not, by Cookie Monster's blended payback. Returns undefined when the winner
 * is still being saved for, which is the point: buying whatever is affordable
 * never opens the next tier.
 */
export function pickHero(heroes: Producer[], income: () => DecimalSource): Producer | undefined {
  const policy = selectionHybridPayback<Producer>({
    getCost: (p) => p.repeatable!.getCost(1),
    getRate: (p) => p.computedRate.value,
    getAmount: (p) => p.resource.value,
    getReserve: () => 0,
    getTotalRate: income,
  });
  const best = policy.pick(heroes.filter((p) => p.repeatable && !p.repeatable.maxed.value));
  return best?.repeatable!.canPurchase.value ? best : undefined;
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
  chain.getAll().map((e) => e.producer.repeatable!);

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
  /** Recruit by the desk's policy until it would rather save; returns units bought. */
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

/** More recruits than one tick of any run buys; a guard, not a rule. */
const MAX_RECRUITS_PER_TICK = 500;

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

      function recruitBest(): number {
        const list = run.heroes.getAll().map((e) => e.producer);
        let bought = 0;
        for (; bought < MAX_RECRUITS_PER_TICK; bought++) {
          const pick = pickHero(list, () => run.totalRate.value);
          if (!pick) break;
          pick.repeatable!.purchase(1);
        }
        return bought;
      }
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

      ctx.onTick(() => {
        if (running('dispatch') && settings.dispatchOn.value) recruitBest();
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
