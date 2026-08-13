import { computed } from 'vue';
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
import { getProducerGameState } from './refinements';

/**
 * Dispatch — the automation ladder and the allocation rule it gates.
 *
 * This module is the archetype's instrument as well as its mechanic. The spine
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

/** Tier ids in ladder order. Policies are typed against this union. */
export type ProducerAutomationTier = 'manual' | 'assisted' | 'managed';

export interface DispatchApi {
  /** The ladder — `hasReached`, `unlock`, `currentTierId`. */
  tiers: AutomationTiers;
  /** Player toggle. Inert until `assisted` unlocks; that is the point. */
  isActive: Persistent<boolean>;
}

/**
 * The allocation rules, keyed by the tier that grants them. Exported so
 * `balance/allocation-probe.ts` can sweep the SHIPPING rules rather than
 * copies of them — swapping this argument is the whole sweep.
 *
 * - `cheapest` — buy whatever is cheapest and affordable. The naive rule, and
 *   the one a player approximates before they think about it.
 * - `payback` — smallest `purchaseBeatSeconds`, the engine's single-unit
 *   payback metric. Ignores how long you would have to save, so it starves
 *   whenever the best-payback candidate is unaffordable.
 * - `hybrid` — `max(cost − bank, 0) / headlineRate + cost / Δrate`. The wait
 *   term collapses to zero once a candidate is affordable, handing the
 *   decision back to pure payback. Sourced by the engine from Cookie
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
      getResource: (p) => p.resource.value,
      // No spending floor. The hybrid rule's wait term already models saving
      // toward an unaffordable candidate; a reserve on top would be a second,
      // uncalibrated brake on the same behavior.
      getReserve: () => 0,
      getHeadlineRate: (p) => classes.getTotalRate(p.resource),
    }),
  };
}

/**
 * Fleet sizes at which each rung unlocks. The ladder WITHHOLDS — a declared
 * ladder that gates nothing is a divergence, not an adoption
 * (`.claude/rules/archetype-authoring.md` § Conformance), so these are real
 * requirements rather than an `unlock()` at install.
 *
 * Both are provisional and both move the arc: opening a gate earlier hands
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
   * harness-only state living in game code; a factory argument is
   * configuration, which is the shape the other archetypes' modules already
   * take.
   *
   * Unset in every shipping path.
   */
  forcePolicy?: DispatchPolicyName;
}

export function createAutomationModule(options: AutomationModuleOptions = {}): EngineModule {
  return {
    id: 'producer/automation',
    dependencies: ['producer/swarm', 'producer/refinements'],
    install(ctx) {
      const classes = getClasses();
      const state = getProducerGameState();

      const tiers = createAutomationTiers({
        id: 'producer-automation',
        tiers: [
          { id: 'manual', name: 'Manual', order: 0 },
          {
            id: 'assisted',
            name: 'Assisted dispatch',
            order: 1,
            requirement: computed(() => state.fleetSizeAtLeast(ASSISTED_AT_FLEET)),
          },
          {
            id: 'managed',
            name: 'Managed dispatch',
            order: 2,
            requirement: computed(() => state.fleetSizeAtLeast(MANAGED_AT_FLEET)),
          },
        ],
      });

      const isActive = persistent<boolean>(false, { name: 'dispatchActive' });
      const policies = buildDispatchPolicies(classes);

      setupPolicyAutoPurchase(
        classes,
        {
          enabled: computed(() => tiers.hasReached('assisted') && isActive.value),
          // One attempt per second. Coarser than per-tick on purpose: the
          // player-facing fiction is a dispatcher working through a queue, and
          // a per-tick buyer makes the ladder invisible by clearing every
          // affordable purchase the instant it is affordable.
          interval: 1,
          // Two rungs ship: `assisted` grants `cheapest`, `managed` grants
          // `hybrid`. `payback` is built but ungranted — it is the sweep's
          // middle point, and whether it deserves a rung of its own is an
          // open question `balance/allocation-probe.ts` answers rather than
          // one this file should guess.
          policy: computed(() =>
            options.forcePolicy
              ? policies[options.forcePolicy]
              : tiers.hasReached('managed')
                ? policies.hybrid
                : policies.cheapest,
          ),
        },
        ctx.onTick,
      );

      ctx.provide(DispatchKey, { tiers, isActive });
    },
  };
}
