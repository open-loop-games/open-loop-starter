import { computed, shallowRef, type ComputedRef } from 'vue';
import {
  createAutomationTiers,
  persistent,
  selectionCheapest,
  selectionHybridPayback,
  selectionPaybackPeriod,
  setupPolicyAutoPurchase,
  type AutomationTiers,
  type EngineModule,
  type InjectionKey,
  type Persistent,
  type Producer,
  type ProducerCategory,
  type SelectionPolicy,
} from '@open-loop/engine';
import type { ProbeClassDef } from '../data/types';
import { getClasses } from './swarm';
import { getProducerStateView } from './refinements';

/**
 * Dispatch — the automation ladder and the allocation rule each rung unlocks.
 *
 * This module is the archetype's measuring tool as well as its mechanic. The spine
 * declares the allocation rule as the combinatorial-selection edge where the
 * closed form stops (`../IDENTITY.md` § Where the closed form stops), and the
 * probe that measures how much that edge is worth drives THIS code — not a
 * re-implementation of it (`/work/studio/CLAUDE.md` § automation as game code).
 *
 * The rules themselves are engine primitives. Producer picks among them; it
 * does not author one.
 */

export const DispatchKey: InjectionKey<DispatchApi> = Symbol(
  'producer/dispatch',
) as InjectionKey<DispatchApi>;

/** Automation tier ids in ladder order. Policies are typed against this union. */
export type ProducerAutomationTier = 'manual' | 'assisted' | 'managed';

export interface DispatchApi {
  /** The ladder — `hasReached`, `unlock`, `currentTierId`. */
  tiers: AutomationTiers;
  /** Player toggle. Inert until `assisted` unlocks; that is the point. */
  isActive: Persistent<boolean>;
  /** The allocation rule the open rung grants — what the dispatcher runs when active. */
  rule: ComputedRef<DispatchPolicyName>;
  /** Whether the dispatcher may hold mass for a pick it can't yet afford. */
  waitsForCost: ComputedRef<boolean>;
  /**
   * The class the dispatcher is holding mass for: its last pick, when that pick
   * couldn't be paid. `null` while it can purchase, and while it isn't running. Only
   * set while {@link waitsForCost} holds.
   */
  savingFor: ComputedRef<ProbeClassDef | null>;
}

/**
 * The allocation rules, keyed by the automation tier that grants them. Exported so
 * `balance/allocation-probe.ts` can sweep the SHIPPING rules rather than
 * copies of them — swapping this argument is the whole sweep.
 *
 * - `cheapest` — purchase whatever is cheapest and affordable. The naive rule, and
 *   the one a player approximates before they think about it.
 * - `payback` — smallest `purchaseBeatSeconds`, the time a producer's whole
 *   stack takes to earn its next unit's cost — a stack-amortized beat that
 *   favours tall stacks, not the marginal payback of one more unit. It has no
 *   term for how long a save would take, so it is only ever offered what is
 *   affordable now.
 * - `hybrid` — `max(cost − mass, 0) / totalRate + cost / Δrate`. The wait
 *   term costs the save toward a candidate and collapses to zero once it is
 *   affordable, handing the decision back to pure payback. It is the one rule
 *   that runs with `waitForCost`, so it can hold mass for a better pick rather
 *   than spend on whatever is affordable. Sourced by the engine from Cookie
 *   Monster's `pp` and Frozen Cookies' `purchaseEfficiency`.
 *
 * `hybrid` is the one the ladder's top rung grants, because affordability
 * versus payback IS this archetype's decision surface (`../data/classes.ts`
 * § Balance) and it is the only one of the three that models both terms.
 */
export type DispatchPolicyName = 'cheapest' | 'payback' | 'hybrid';

export function buildDispatchPolicies(
  classes: ProducerCategory<ProbeClassDef>,
): Record<DispatchPolicyName, SelectionPolicy<Producer>> {
  return {
    cheapest: selectionCheapest<Producer>((p) => p.repeatable!.getCost(1)),
    payback: selectionPaybackPeriod<Producer>((p) => p.purchaseBeatSeconds.value),
    hybrid: selectionHybridPayback<Producer>({
      getCost: (p) => p.repeatable!.getCost(1),
      getRate: (p) => p.computedRate.value,
      getAmount: (p) => p.resource.value,
      // No reserve. The wait term already models saving toward an
      // unaffordable candidate; a reserve on top would be a second,
      // uncalibrated brake on the same behavior.
      getReserve: () => 0,
      getTotalRate: (p) => classes.getTotalRate(p.resource),
    }),
  };
}

/**
 * Fleet sizes at which each rung unlocks. The ladder WITHHOLDS — a declared
 * ladder that blocks nothing is a divergence, not an adoption
 * (`.claude/rules/archetype-authoring.md` § Conformance), so these are real
 * `unlockWhen` predicates rather than an `unlock()` at install.
 *
 * Both are provisional and both move the arc: unlocking a rung earlier hands
 * allocation to a better rule sooner, which is a spine change and not a
 * costume one. Re-tune against `balance/allocation-probe.ts`, never in
 * isolation.
 */
const ASSISTED_AT_FLEET = 25;
const MANAGED_AT_FLEET = 150;

export interface AutomationModuleOptions {
  /**
   * Pin the allocation rule for the whole run, ignoring which rung is open.
   *
   * The sweep seam, and the reason it is a construction option rather than
   * runtime state: `balance/allocation-probe.ts` measures what the rule is
   * worth by running the same arc under each of the three, and it has to drive
   * the shipping dispatcher to do it. A ref the probe could poke would be
   * balance-harness-only state in game code; a factory argument is
   * an option, which is the shape the other archetypes' modules already
   * take.
   *
   * Unset in every shipping path.
   */
  forcePolicy?: DispatchPolicyName;
  /**
   * Pin whether the dispatcher may wait for cost, overriding the rule-derived
   * choice. The sweep's control: `hybrid` with this `false` is the same rule
   * without the license to save, so the gap between the two runs is what
   * saving is worth. A construction option for the same reason `forcePolicy`
   * is. Unset in every shipping path.
   */
  forceWaitForCost?: boolean;
}

export function createAutomationModule(options: AutomationModuleOptions = {}): EngineModule {
  return {
    id: 'producer/automation',
    dependencies: ['producer/swarm', 'producer/refinements'],
    install(ctx) {
      const classes = getClasses();
      const state = getProducerStateView();

      const tiers = createAutomationTiers({
        id: 'producer-automation',
        tiers: [
          { id: 'manual', displayName: 'Manual', order: 0 },
          {
            id: 'assisted',
            displayName: 'Assisted dispatch',
            order: 1,
            unlockWhen: computed(() => state.fleetSizeAtLeast(ASSISTED_AT_FLEET)),
          },
          {
            id: 'managed',
            displayName: 'Managed dispatch',
            order: 2,
            unlockWhen: computed(() => state.fleetSizeAtLeast(MANAGED_AT_FLEET)),
          },
        ],
      });

      const isActive = persistent<boolean>(false, { id: 'dispatchActive' });
      const enabled = computed(() => tiers.hasReached('assisted') && isActive.value);
      const policies = buildDispatchPolicies(classes);
      // Two rungs ship: `assisted` grants `cheapest`, `managed` grants
      // `hybrid`. `payback` is built but ungranted — it is the sweep's middle
      // point, and whether it deserves a rung of its own is an open question
      // `balance/allocation-probe.ts` answers rather than one this file should
      // guess.
      const rule = computed<DispatchPolicyName>(
        () => options.forcePolicy ?? (tiers.hasReached('managed') ? 'hybrid' : 'cheapest'),
      );
      // Waiting belongs to the rule, not the rung: only `hybrid` scores how
      // long a save takes, so only it may hold mass for a pick it can't yet
      // afford. In play that is the managed rung either way. Under
      // `forcePolicy` a rung check would switch waiting on mid-run for
      // `payback` and `cheapest` too, and each sweep column would stop
      // being one rule.
      const waitsForCost = computed(() => options.forceWaitForCost ?? rule.value === 'hybrid');

      // Recorded when the pick is made: a payable pick is purchased in the same
      // attempt, so only an unpayable one is a hold.
      const held = shallowRef<Producer | null>(null);
      const recordHold = (policy: SelectionPolicy<Producer>): SelectionPolicy<Producer> => ({
        pick(candidates, ctx) {
          const best = policy.pick(candidates, ctx);
          held.value = best && !best.repeatable!.canPurchase.value ? best : null;
          return best;
        },
      });
      const savingFor = computed(() =>
        enabled.value && held.value ? (classes.getDef(held.value.id) ?? null) : null,
      );

      setupPolicyAutoPurchase(
        classes,
        {
          enabled,
          // One attempt per second. Coarser than per-tick on purpose: the
          // player-facing fiction is a dispatcher working through a queue, and
          // a per-tick purchaser makes the ladder invisible by clearing every
          // affordable purchase the instant it is affordable.
          interval: 1,
          policy: computed(() => recordHold(policies[rule.value])),
          waitForCost: waitsForCost,
        },
        ctx.onTick,
      );

      ctx.provide(DispatchKey, { tiers, isActive, rule, waitsForCost, savingFor });
    },
  };
}
