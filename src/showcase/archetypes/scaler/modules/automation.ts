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
} from '@open-loop/engine';
import { ANCHORS } from '../data';
import { CoreKey } from './core';
import { RunKey } from './run';
import { LegacyKey } from './legacy';
import { ContinuityKey } from './continuity';
import { PrestigeKey } from './prestige';

/**
 * The automation ladder: the Dispatch Desk recruits heroes, and the Succession
 * Plan reboots the timeline. Each is a pure policy below, gated by its
 * automation tier and its duty switch; the probe's player calls the same
 * policies by hand before the tier is reached.
 */

/** The automation ladder's tiers: by hand, then the desk, then the plan. */
export type ScalerAutomationTier = 'manual' | 'dispatch' | 'succession';

export interface RebootState {
  pendingLegacy: number;
  legacyEarned: number;
  inElseworld: boolean;
}

export interface RebootParams {
  /** Reboot once pending Legacy reaches this share of Legacy earned (never below 1). */
  share: number;
}

/** Succession Plan: whether to Reboot now. Never forfeits an Elseworld in progress. */
export function shouldReboot(state: RebootState, params: RebootParams): boolean {
  if (state.inElseworld) return false;
  return state.pendingLegacy >= Math.max(1, params.share * state.legacyEarned);
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

export interface AutomationApi {
  ladder: AutomationTiers;
  /** The desk recruits only while on duty. */
  dispatchOn: Persistent<boolean>;
  /** The plan reboots only while on duty. */
  autoRebootOn: Persistent<boolean>;
  /** The plan's share: reboot once pending Legacy reaches it of Legacy earned. */
  autoRebootShare: Persistent<number>;
  /** Recruit by the desk's policy until it would rather save; returns units bought. */
  recruitBest(): number;
}

export const AutomationKey: InjectionKey<AutomationApi> = Symbol(
  'scaler/automation',
) as InjectionKey<AutomationApi>;

let api: AutomationApi;

export function getAutomation(): AutomationApi {
  return api;
}

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
      'scaler/prestige',
    ],
    install(ctx) {
      const core = ctx.inject(CoreKey);
      const run = ctx.inject(RunKey);
      const legacy = ctx.inject(LegacyKey);
      const continuity = ctx.inject(ContinuityKey);
      const prestige = ctx.inject(PrestigeKey);

      const { dispatchOn, autoRebootOn, autoRebootShare } = withPersistentContext(
        'settings',
        () => ({
          dispatchOn: persistent<boolean>(true, { id: 'dispatch-on' }),
          autoRebootOn: persistent<boolean>(true, { id: 'auto-reboot-on' }),
          autoRebootShare: persistent<number>(ANCHORS.rebootFraction, { id: 'auto-reboot-share' }),
        }),
      );

      const ladder = createAutomationTiers({
        id: 'automation',
        tiers: [
          { id: 'manual' satisfies ScalerAutomationTier, displayName: 'Manual', order: 0 },
          {
            id: 'dispatch' satisfies ScalerAutomationTier,
            displayName: 'Dispatch Desk',
            order: 1,
            unlockWhen: () => legacy.upgrade('dispatch').active.value,
          },
          {
            id: 'succession' satisfies ScalerAutomationTier,
            displayName: 'Succession Plan',
            order: 2,
            unlockWhen: () => continuity.upgrade('auto-reboot').active.value,
          },
        ],
      });
      ladder.on('unlocked', (id) => {
        const tier = ladder.tiers.find((t) => t.id === id);
        if (tier) core.log('automation', `Automation online: ${tier.displayName}.`);
      });
      // A Rewrite can take the Dispatch Desk away; the ladder re-reads what is owned.
      prestige.rewriteReset.on('afterReset', () => ladder.resetUnlocks());

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

      ctx.onTick(() => {
        if (!ladder.isUnlocked('dispatch') || !dispatchOn.value) return;
        recruitBest();
      });
      ctx.onTick(() => {
        if (!ladder.isUnlocked('succession') || !autoRebootOn.value) return;
        const state: RebootState = {
          pendingLegacy: prestige.pendingLegacy.value.toNumber(),
          legacyEarned: Decimal.fromValue(legacy.legacyEarned.value).toNumber(),
          inElseworld: prestige.elseworlds.current.value !== null,
        };
        if (shouldReboot(state, { share: autoRebootShare.value })) prestige.reboot();
      });

      api = { ladder, dispatchOn, autoRebootOn, autoRebootShare, recruitBest };
      ctx.provide(AutomationKey, api);
    },
  };
}
