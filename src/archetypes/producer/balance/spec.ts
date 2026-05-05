/**
 * Producer engine-as-oracle helpers — methodology #2 spec layer.
 *
 * Per `archetypes/BALANCING.md § Engine as oracle`: frozen-state queries
 * against `getCost(1)` / `computedRate` / `getTotalRate` for the triangular
 * multi-resource walker. The engine *is* the math; this file does no
 * spec-side reimplementation of cost / rate / chain composition.
 *
 * Builds a producer engine instance once (no bot, no ticks running) and
 * mutates persistent refs into hypothetical states; the engine's own
 * primitives answer cost and production at each step with the full
 * modifier chain applied.
 *
 * The triangular composer walks a strict-tier-order schedule (algebra
 * § 6.3 + § 6.6); per-step Δt is `Cost / total_rate` per
 * `closed-form-progression/case-studies/core-timing-formula.md § 4`.
 *
 * Mid-step rate transitions (achievement firings on cumulative-threshold
 * crossings) are spliced via the engine's `timeUntilGateFlip` primitive
 * over each unfired achievement's `Gate` spec. The predictor advances
 * the cookies resource symbolically; the achievement watchers (sync-
 * flush) fire `complete()` when crossings land mid-step, the rate chain
 * reactively reflects each fire, and the residual cost integrates
 * against the new rate.
 *
 * The lowest-tier bootstrap (count 0 → 1, no production yet — cursor seeded
 * by clicks) stays bot territory: with `getTotalRate` zero the spec
 * correctly returns +∞.
 */

import {
  CategoriesKey,
  Decimal,
  ResourceRegistryKey,
  timeUntilGateFlip,
  type Engine,
  type GameStateAccessor,
  type GameStateMutator,
  type GateRuntime,
} from 'open-loop-engine';
import {
  CONTINUOUS_PRODUCER_IDS,
  createProducerEngine,
  getAchievements,
  getBuildings,
  getClickCount,
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

function resetUpgrades(): void {
  for (const entry of getUpgrades().getAll()) {
    if (entry.purchasable.active.value) entry.purchasable.amount.value = 0;
  }
}

function resetAchievements(): void {
  for (const entry of getAchievements().getAll()) {
    if (entry.achievement.earned.value) {
      entry.achievement.earned.value = false;
      entry.achievement.earnedAt.value = null;
    }
  }
}

/**
 * Reset producer/upgrade/achievement world to baseline before a walker pass.
 * Both the strict-tier-order walker (`arcWaypoints`) and the bot-policy walker
 * (`arcWaypointsBotPolicy`) call this on entry.
 *
 * Order matters: counts/upgrades/lifetime first, then achievements — so when
 * watchers re-evaluate after the reset, requirements see the baseline state
 * and any always-true predicate (e.g. milestone-tier-1 against a seeded
 * cursor count) re-fires correctly.
 *
 * `seedCounts` lets callers skip a bootstrap regime (e.g. `{ cursor: 1 }` to
 * skip the click-driven first-cursor purchase). Click-count cumulative is
 * always reset to zero — load-bearing for the bot walker's click-taper Gate
 * splices; harmless for the strict-tier-order walker, which doesn't ride
 * clicks.
 */
export function resetWalkerWorld(seedCounts: Readonly<Record<string, number>> = {}): void {
  setCounts(seedCounts);
  resetUpgrades();
  const primary = getPrimaryResource();
  if (primary.cumulative) primary.cumulative.value = Decimal.dZero;
  primary.value = Decimal.dZero;
  const clickCount = getClickCount();
  if (clickCount.cumulative) clickCount.cumulative.value = Decimal.dZero;
  clickCount.value = Decimal.dZero;
  resetAchievements();
}

// Spec-side accessor — `timeUntilGateFlip` projects `cumulative-gte` against
// the underlying resource's rate (via `runtime.accessor.getRate(resource)`),
// so the splice walker needs a rate-bearing accessor over the cookies
// resource specifically. Other surfaces aren't probed: `count-gte` /
// `unlock` are opaque-predicate at the predictor layer; `state` isn't used
// by any producer Gate. Only cookies needs a rate.
function buildSpecAccessor(): GameStateAccessor & GameStateMutator {
  const buildings = getBuildings();
  const primary = getPrimaryResource();
  return {
    getResource: (id) => (id === 'cookies' ? Decimal.fromValue(primary.value) : Decimal.dZero),
    getRate: (id) =>
      id === 'cookies' ? Decimal.fromValue(buildings.getTotalRate(primary)) : Decimal.dZero,
    isUnlocked: () => false,
    getState: () => undefined,
    applyResourceOp: () => {},
    setUnlocked: () => {},
    setState: () => {},
  };
}

function buildGateRuntime(engine: Engine): GateRuntime {
  const categories = engine.tryInject(CategoriesKey);
  const registry = engine.tryInject(ResourceRegistryKey);
  if (!categories || !registry) {
    throw new Error('arcWaypoints: engine missing CategoriesKey or ResourceRegistryKey');
  }
  return { accessor: buildSpecAccessor(), categories, registry };
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
 * Per-walker hooks consumed by {@link accumulateUntilPay}'s splice loop.
 *
 * `getRate` and `getNextSpliceDistance` are re-read on every iteration so
 * reactive rate-chain updates (achievement firings, regime transitions) feed
 * the residual cost integration on the next pass. `advance` is the world-
 * mutating effect — each walker plugs in its own cumulative/balance updates
 * here.
 */
export interface AccumulateUntilPayOps {
  /** Current production rate (cookies/sec) at frozen state. */
  getRate: () => number;
  /** Smallest distance until the next intra-step splice event, or `Infinity`. */
  getNextSpliceDistance: () => number;
  /** Advance the walker's world by `dt` seconds at `rate` cookies/sec. */
  advance: (dt: number, rate: number) => void;
}

/**
 * Splice-aware "save up cost cookies at the current rate" loop. Returns the
 * elapsed dt; `Number.POSITIVE_INFINITY` when the rate is zero and no splice
 * can change that.
 *
 * Splice semantics: when a splice (achievement firing, regime boundary, etc.)
 * lands strictly before the residual cost is paid, the loop advances to that
 * splice, lets `advance` mutate the world, then re-reads `getRate` so the
 * post-splice rate (which may be higher under reactive modifier-chain
 * bindings) integrates the rest of the residual cost. Identical to the
 * original inline implementation per `core-timing-formula.md § 4` — extracted
 * so both walkers share one splice loop.
 */
export function accumulateUntilPay(cost: number, ops: AccumulateUntilPayOps): number {
  let remaining = cost;
  let stepDt = 0;
  while (remaining > 0) {
    const rate = ops.getRate();
    if (rate <= 0) return Number.POSITIVE_INFINITY;
    const dtToBuy = remaining / rate;
    const nextFireDt = ops.getNextSpliceDistance();
    if (nextFireDt >= dtToBuy) {
      stepDt += dtToBuy;
      ops.advance(dtToBuy, rate);
      remaining = 0;
    } else {
      stepDt += nextFireDt;
      ops.advance(nextFireDt, rate);
      remaining -= nextFireDt * rate;
    }
  }
  return stepDt;
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
 * computed by `accumulateUntilPay`, which integrates `cost / rate` while
 * splicing on intra-step achievement-fire moments — `getTotalRate` re-
 * reads after each fire so the residual cost crosses against the new
 * (higher) rate.
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
  const engine = getSpecEngine();
  const buildings = getBuildings();
  const upgrades = getUpgrades();
  const primary = getPrimaryResource();
  const primaryCumulative = primary.cumulative;
  if (!primaryCumulative) {
    throw new Error("arcWaypoints: 'cookies' resource has no cumulative tracker");
  }

  const runtime = buildGateRuntime(engine);
  const counts: Record<string, number> = { ...initial };

  resetWalkerWorld(counts);

  // Strict-tier-order walker: cookie production is the only rate channel,
  // achievement Gate flips the only splice source. Cost is "paid" by time-
  // integration against cumulative; primary.value isn't tracked because no
  // policy is reading it — the schedule is pre-computed.
  const accumulate = (cost: number): number =>
    accumulateUntilPay(cost, {
      getRate: () => Decimal.fromValue(buildings.getTotalRate(primary)).toNumber(),
      getNextSpliceDistance: () => nextAchievementFireDistance(runtime),
      advance: (dt, rate) => {
        primaryCumulative.value = Decimal.add(primaryCumulative.value, dt * rate);
      },
    });

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
          total += accumulate(cost);
        }
        counts[step.id] = step.to;
        setCounts(counts);
      }
    } else {
      const u = upgrades.getPurchasable(step.id);
      if (!u) throw new Error(`arcWaypoints: no upgrade '${step.id}'`);
      if (!u.active.value) {
        const cost = Decimal.fromValue(u.getCost(1)).toNumber();
        total += accumulate(cost);
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

/**
 * Smallest computed flip-distance across unfired achievements with a
 * Gate-form requirement. `Infinity` when no rate-bearing predicate has a
 * finite distance — the predictor then accepts the full per-purchase Δt.
 *
 * Opaque-predicate / no-rate / uncomputable distances are skipped — those
 * predicates fire at schedule events (handled by the per-step framing) or
 * have no mechanical mid-step crossing. Only `'computed'` distances drive
 * the splice.
 */
export function nextAchievementFireDistance(runtime: GateRuntime): number {
  let nearest = Number.POSITIVE_INFINITY;
  for (const entry of getAchievements().getAll()) {
    if (entry.achievement.earned.value) continue;
    const gate = entry.achievement.gate;
    if (!gate) continue;
    const dist = timeUntilGateFlip(gate, runtime);
    if (dist.reason === 'computed' && dist.seconds < nearest) {
      nearest = dist.seconds;
    }
  }
  return nearest;
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
