/**
 * Closed-form spec layer — engine as oracle, queried as pure math.
 *
 * Builds a producer engine instance once (no bot, no ticks running) and
 * mutates persistent refs into hypothetical states; the engine's own
 * `repeatable.getCost(1)`, `computedRate`, and `getTotalRate` answer cost
 * and production at each step with the full modifier chain applied. No
 * spec-side reimplementation of cost / rate / chain math.
 *
 * The triangular composer walks a strict-tier-order schedule (algebra
 * §6.3 / §6.6); per-step Δt is `Cost / total_rate` per
 * `case-studies/core-timing-formula.md §4.1`. The lowest-tier bootstrap
 * (count 0 → 1, no production yet, e.g. cursor seeded by clicks) stays
 * bot territory: with `getTotalRate` zero the spec correctly returns +∞.
 */

import { Decimal, type Engine } from 'open-loop-engine';
import {
  CONTINUOUS_PRODUCER_IDS,
  createProducerEngine,
  getBuildings,
  getPrimaryResource,
  getUpgrades,
} from '..';

let counter = 0;

let cachedEngine: Engine | undefined;

function getSpecEngine(): Engine {
  if (cachedEngine) return cachedEngine;
  const { engine } = createProducerEngine(undefined, {
    persistenceNamespace: `spec-${++counter}`,
  });
  engine.selectMod('bakery');
  engine.start();
  engine.stop();
  cachedEngine = engine;
  return engine;
}

function setCounts(counts: Readonly<Record<string, number>>): void {
  for (const entry of getBuildings().getAll()) {
    if (entry.def.trigger !== 'continuous' || !entry.producer.repeatable) continue;
    entry.producer.repeatable.amount.value = counts[entry.def.id] ?? 0;
  }
}

export interface TierStep {
  kind: 'tier';
  /** Continuous tier id to expand. */
  id: string;
  /** Count to grow to. No-op if not strictly greater than the current accumulated count. */
  to: number;
}

export interface UpgradeStep {
  kind: 'upgrade';
  /** Upgrade id from `data/upgrades.ts`. No-op if already active. */
  id: string;
}

export type ScheduleStep = TierStep | UpgradeStep;

export interface ArcWaypoint {
  /** The schedule step this waypoint corresponds to (one waypoint per step, no-ops included). */
  step: ScheduleStep;
  /** Cumulative time at the moment the step's effect lands. */
  atSec: number;
  /** Tier counts after the step is applied. Upgrade steps do not change counts. */
  counts: Readonly<Record<string, number>>;
}

/**
 * Per-step waypoints under a strict-tier-order schedule. Tier steps grow
 * a producer's count; upgrade steps activate an upgrade (its modifier
 * binding fires reactively via `purchasable.active`, feeding the rate
 * chain for subsequent steps). One waypoint per schedule entry (no-ops
 * included).
 *
 * Triangular per algebra §6.3 — production at step i depends only on
 * counts and modifiers established by steps 1..i. Series composition
 * per §6.6 — total is Σ per-step first-passages. Each per-step Δt is
 * queried from the engine: `repeatable.getCost(1)` (or `upgrade.getCost(1)`)
 * for cost, `getTotalRate` for the rate.
 *
 * `initial` seeds counts before the first step; pass `{ cursor: 1 }` to
 * skip the click-driven bootstrap. The spec does not seed bought
 * upgrades; if a fork wants pre-bought modifiers it can place them as
 * leading upgrade steps.
 */
export function arcWaypoints(
  schedule: readonly ScheduleStep[],
  initial: Readonly<Record<string, number>> = {},
): ArcWaypoint[] {
  getSpecEngine();
  const buildings = getBuildings();
  const upgrades = getUpgrades();
  const primary = getPrimaryResource();

  const counts: Record<string, number> = { ...initial };
  setCounts(counts);
  resetUpgrades();

  const out: ArcWaypoint[] = [];
  let total = 0;

  for (const step of schedule) {
    if (step.kind === 'tier') {
      const from = counts[step.id] ?? 0;
      if (step.to > from) {
        const p = buildings.getProducer(step.id);
        if (!p?.repeatable) throw new Error(`arcWaypoints: no continuous producer '${step.id}'`);

        for (let k = from; k < step.to; k++) {
          counts[step.id] = k;
          setCounts(counts);
          const cost = Decimal.fromValue(p.repeatable.getCost(1)).toNumber();
          const rate = Decimal.fromValue(buildings.getTotalRate(primary)).toNumber();
          total += rate > 0 ? cost / rate : Number.POSITIVE_INFINITY;
        }
        counts[step.id] = step.to;
        setCounts(counts);
      }
    } else {
      const u = upgrades.getPurchasable(step.id);
      if (!u) throw new Error(`arcWaypoints: no upgrade '${step.id}'`);
      if (!u.active.value) {
        const cost = Decimal.fromValue(u.getCost(1)).toNumber();
        const rate = Decimal.fromValue(buildings.getTotalRate(primary)).toNumber();
        total += rate > 0 ? cost / rate : Number.POSITIVE_INFINITY;
        // Set amount directly — bypasses cost/onPurchase, but `active` is
        // computed from `amount >= 1` and the grants bound via
        // `setupDeclarativeBindings(grants, purchasable.active)` watch
        // active reactively, so the modifier joins the rate chain
        // immediately.
        u.amount.value = 1;
      }
    }
    out.push({ step, atSec: total, counts: { ...counts } });
  }
  return out;
}

function resetUpgrades(): void {
  for (const entry of getUpgrades().getAll()) {
    if (entry.purchasable.active.value) entry.purchasable.amount.value = 0;
  }
}

/** Total schedule time. Convenience wrapper over `arcWaypoints`. */
export function arcTimeUnderTierOrder(
  schedule: readonly ScheduleStep[],
  initial: Readonly<Record<string, number>> = {},
): number {
  const wps = arcWaypoints(schedule, initial);
  return wps.length === 0 ? 0 : wps[wps.length - 1]!.atSec;
}

/**
 * Default strict-tier-order schedule derived from data: for each continuous
 * producer in registration order, expand to `perTierCount`, then activate
 * its `-boost-i` upgrade (the producer-archetype naming convention surfaced
 * via `TIER1_UPGRADE_IDS`). Globals are not included — they're a strategy
 * choice, callers append where they want them.
 */
export function strictTierOrderSchedule(opts: { perTierCount: number }): ScheduleStep[] {
  const out: ScheduleStep[] = [];
  for (const id of CONTINUOUS_PRODUCER_IDS) {
    out.push({ kind: 'tier', id, to: opts.perTierCount });
    out.push({ kind: 'upgrade', id: `${id}-boost-i` });
  }
  return out;
}
