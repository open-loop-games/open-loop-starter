/**
 * Producer balance predictor — bot-policy walker (methodology #2 research surface).
 *
 * Closed-form math model of the producer arc, played as the bot would play it.
 * Per `archetypes/BALANCING.md § Theme 3 #2`: predictor and sim are decoupled
 * peers, both reading the engine's math primitives at different layers
 * (predictor closes form, sim ticks). They are not coupled and shouldn't
 * validate each other; drift between them is expected research output.
 *
 * The walker accepts an `engine` parameter and reads the producer module's
 * categories via the existing module-level singletons (`getBuildings`,
 * `getUpgrades`, `getAchievements`, `getPrimaryResource`, `getClickCount`).
 * Those singletons bind to the LAST-built engine instance during install.
 * Callers must not interleave `getSpecEngine()` calls (`spec.ts`) with this
 * walker — the singletons would re-bind to a different engine. Within a
 * single execution path the binding is stable.
 *
 * Override scope reach: the solver's `pushScope` against
 * `ProducerTuningRegistryKey` reaches this walker's cost/rate readouts
 * because the tuning registry is engine-scoped (each engine instance carries
 * its own registry) and we read from the SAME engine the solver pushed
 * against.
 *
 * What's modeled:
 *   - Producer policy (`selectionHybridPayback` via `buildBotPolicy`) against
 *     the currently-affordable filter.
 *   - Click-taper rate channel (`bot.ts:expectedClicksAt` regimes 1/s for
 *     [0,30), 0.2/s for [30,120), 0/s after).
 *   - Achievement Gate flips and click-regime boundaries during cookie save-up,
 *     spliced via `accumulateUntilPay` from `./spec`.
 *   - Upgrade affordability — swept after every state change with re-check
 *     until no flip remains.
 *
 * What's simplified vs the bot:
 *   - The bot's policy and upgrade sweeps are throttled by `setupPolicyAutoPurchase`
 *     (1s policy interval, 2s upgrade sweep). The walker fires both as events:
 *     each newly-affordable item is purchased the instant it becomes affordable.
 *     The resulting timing offset is sub-interval — small relative to beat
 *     windows — and is exactly the kind of decoupled-peer drift the smoke
 *     driver visualizes.
 *   - The headline-rate cache in `auto-purchase.ts:249` is per-drain; the
 *     predictor builds a fresh map per pick. Negligible at producer's
 *     intended balance.
 */

import {
  Decimal,
  CategoriesKey,
  ResourceRegistryKey,
  timeUntilResource,
  type Engine,
  type GameStateAccessor,
  type GameStateMutator,
  type GateRuntime,
  type Producer,
} from '@open-loop/engine';
import { getBuildings, getClickCount, getPrimaryResource, getUpgrades } from '..';
import { buildBotPolicy } from './bot';
import { accumulateUntilPay, nextAchievementFireDistance, resetWalkerWorld } from './spec';

// ─── Click taper ─────────────────────────────────────────────────────────
//
// Mirrors `bot.ts:expectedClicksAt` as a piecewise-constant rate channel.
// The bot fires clicks integer-by-integer at sim-tick boundaries; the
// predictor models them as a continuous rate. With `tickDelta=1s` and click
// rates ≤ 1/s, integral and integer-stepped trajectories agree to within
// sub-second quantization.

const CLICK_REGIMES = [
  { until: 30, rate: 1 },
  { until: 120, rate: 0.2 },
] as const;

function clickRateAt(simTimeSec: number): number {
  for (const r of CLICK_REGIMES) if (simTimeSec < r.until) return r.rate;
  return 0;
}

function nextClickRegimeBoundary(simTimeSec: number): number {
  for (const r of CLICK_REGIMES) {
    if (simTimeSec < r.until) return r.until - simTimeSec;
  }
  return Number.POSITIVE_INFINITY;
}

// ─── Walker accessor ─────────────────────────────────────────────────────

function buildBotWalkerAccessor(getSimTime: () => number): GameStateAccessor & GameStateMutator {
  const buildings = getBuildings();
  const primary = getPrimaryResource();
  const clickCount = getClickCount();
  return {
    getResource: (id) => {
      if (id === 'cookies') return Decimal.fromValue(primary.value);
      if (id === 'click-count') return Decimal.fromValue(clickCount.value);
      return Decimal.dZero;
    },
    getRate: (id) => {
      if (id === 'cookies') {
        const production = Decimal.fromValue(buildings.getTotalRate(primary)).toNumber();
        const clickProducer = buildings.getProducer('click');
        const clickYield = clickProducer
          ? Decimal.fromValue(clickProducer.computedRate.value).toNumber()
          : 0;
        return Decimal.fromValue(production + clickRateAt(getSimTime()) * clickYield);
      }
      if (id === 'click-count') return Decimal.fromValue(clickRateAt(getSimTime()));
      return Decimal.dZero;
    },
    isUnlocked: () => false,
    getState: () => undefined,
    applyResourceOp: () => {},
    setUnlocked: () => {},
    setState: () => {},
  };
}

function buildGateRuntime(engine: Engine, getSimTime: () => number): GateRuntime {
  const categories = engine.tryInject(CategoriesKey);
  const registry = engine.tryInject(ResourceRegistryKey);
  if (!categories || !registry) {
    throw new Error('arcWaypointsBotPolicy: engine missing CategoriesKey or ResourceRegistryKey');
  }
  return { accessor: buildBotWalkerAccessor(getSimTime), categories, registry };
}

// ─── Walker ──────────────────────────────────────────────────────────────

export interface BotPolicyWalkerOpts {
  /** Predicate evaluated each iteration; walker exits when it fires. */
  predicate: (engine: Engine) => boolean;
  /** Maximum sim-seconds to walk before returning Infinity. */
  budgetSec: number;
  /** Optional initial counts (e.g. `{ cursor: 1 }`). Defaults to `{}`. */
  initial?: Readonly<Record<string, number>>;
}

export interface BotPolicyWalkerResult {
  fireTime: number;
}

/**
 * Walk the bot's policy decisions in closed form against frozen-state engine
 * queries. Returns the sim-time at which `predicate` fires, or `Infinity`
 * when the budget is exhausted or the world enters stasis.
 *
 * Uses module-level singletons for category access (see file-level note);
 * accepts `engine` for `pushScope`-reachable cost/rate readouts and for the
 * Gate runtime (`CategoriesKey`, `ResourceRegistryKey`).
 */
export function arcWaypointsBotPolicy(
  engine: Engine,
  opts: BotPolicyWalkerOpts,
): BotPolicyWalkerResult {
  const { predicate, budgetSec, initial = {} } = opts;

  const buildings = getBuildings();
  const upgrades = getUpgrades();
  const primary = getPrimaryResource();
  if (!primary.cumulative) {
    throw new Error("arcWaypointsBotPolicy: 'cookies' resource has no cumulative tracker");
  }
  const clickCount = getClickCount();
  if (!clickCount.cumulative) {
    throw new Error("arcWaypointsBotPolicy: 'click-count' resource has no cumulative tracker");
  }

  resetWalkerWorld(initial);

  const policy = buildBotPolicy(buildings);
  let simTime = 0;
  const runtime = buildGateRuntime(engine, () => simTime);
  const accessor = runtime.accessor;

  const totalCookieRate = (): number => {
    const production = Decimal.fromValue(buildings.getTotalRate(primary)).toNumber();
    const clickProducer = buildings.getProducer('click');
    const clickYield = clickProducer
      ? Decimal.fromValue(clickProducer.computedRate.value).toNumber()
      : 0;
    return production + clickRateAt(simTime) * clickYield;
  };

  const buyProducer = (p: Producer): void => {
    if (!p.repeatable) return;
    const cost = Decimal.fromValue(p.repeatable.getCost(1)).toNumber();
    primary.value = Decimal.sub(primary.value, cost);
    p.repeatable.amount.value = Decimal.add(p.repeatable.amount.value, 1);
  };

  // Sweep currently-affordable upgrades. Re-check `canPurchase` after each
  // symbolic purchase because primary just dropped — `getAffordable()` returns
  // a snapshot, but each individual purchase gates on live `canPurchase`.
  const sweepAffordableUpgrades = (): boolean => {
    let bought = false;
    let progressed = true;
    while (progressed) {
      progressed = false;
      for (const u of upgrades.getAffordable()) {
        if (!u.canPurchase.value) continue;
        const cost = Decimal.fromValue(u.getCost(1)).toNumber();
        primary.value = Decimal.sub(primary.value, cost);
        u.amount.value = 1;
        progressed = true;
        bought = true;
      }
    }
    return bought;
  };

  // Smallest distance until any unaffordable producer or upgrade flips
  // affordable, given the current accessor view. Adopts the engine's
  // `timeUntilResource` (`core/transitions.ts:96`) directly against the
  // cookies cost-resource — `Purchasable` doesn't structurally expose its
  // cost-resource, so the wrapper `timeUntilAffordable` can't bind; the
  // engine's own harness walkers (`walk-purchasable-transitions.ts:99`,
  // `walk-producer-transitions.ts:112`) take the same shortcut. Single-
  // cookie economy makes the resource id a constant. Post-OL-850 the four
  // "buy 1" primitives agree on single-level cost semantics, so no integral-
  // mirror is needed. Returns `Infinity` when nothing has a computable
  // distance (rate ≤ 0, all bought).
  const distanceToNextAffordable = (): number => {
    let nearest = Number.POSITIVE_INFINITY;
    for (const entry of buildings.getAll()) {
      const p = entry.producer;
      if (!p.repeatable || !entry.def.purchase) continue;
      if (p.repeatable.canPurchase.value) continue;
      const dist = timeUntilResource('cookies', p.repeatable.getCost(1), accessor);
      if (dist.reason === 'computed' && dist.seconds < nearest) nearest = dist.seconds;
    }
    for (const entry of upgrades.getAll()) {
      const u = entry.purchasable;
      if (u.active.value || u.canPurchase.value) continue;
      const dist = timeUntilResource('cookies', u.getCost(1), accessor);
      if (dist.reason === 'computed' && dist.seconds < nearest) nearest = dist.seconds;
    }
    return nearest;
  };

  // Splice combinator for `accumulateUntilPay`: achievement Gate flips and
  // click-regime boundaries both transition the cookie rate channel mid-
  // save-up. `accumulateUntilPay` advances to whichever fires first, then
  // re-reads `getRate` so the post-splice rate integrates the residual cost.
  const nextSpliceDistance = (): number =>
    Math.min(nextAchievementFireDistance(runtime), nextClickRegimeBoundary(simTime));

  // Save-up advancer: integrate `cost` cookies at the combined cookie rate
  // (production + click-yield × click-rate), splicing on rate transitions.
  // Mutates primary.value, clickCount.value, and simTime as it goes.
  const saveUp = (cost: number): number =>
    accumulateUntilPay(cost, {
      getRate: totalCookieRate,
      getNextSpliceDistance: nextSpliceDistance,
      advance: (dt, rate) => {
        primary.value = Decimal.add(primary.value, dt * rate);
        const cRate = clickRateAt(simTime);
        if (cRate > 0) {
          clickCount.value = Decimal.add(clickCount.value, dt * cRate);
        }
        simTime += dt;
      },
    });

  const headlineCache = new Map<unknown, Decimal>();
  const getHeadlineRate = (p: Producer): Decimal => {
    const cached = headlineCache.get(p.resource);
    if (cached) return cached;
    const total = Decimal.fromValue(buildings.getTotalRate(p.resource));
    headlineCache.set(p.resource, total);
    return total;
  };

  // Iter cap is a safety against runaway loops. Healthy trajectory: iter ≈
  // purchases + save-ups, both bounded polynomially in the arc budget.
  let iterCount = 0;
  while (simTime <= budgetSec) {
    iterCount++;
    if (iterCount > 200_000) {
      console.log(
        `[walker] iter cap hit; simTime=${simTime} primary=${primary.value} iters=${iterCount}`,
      );
      return { fireTime: Number.POSITIVE_INFINITY };
    }
    if (predicate(engine)) return { fireTime: simTime };

    // Phase 1: drain all currently-affordable upgrades. Inner sweep loops
    // until no more flip — each purchase can unlock the next via modifier-
    // chain effects.
    if (sweepAffordableUpgrades()) {
      if (predicate(engine)) return { fireTime: simTime };
      continue;
    }

    // Phase 2: pick + buy one producer if any are affordable. Bot ordering
    // fires producer policy BEFORE upgrade sweep within a slot; the walker
    // phases upgrades first because they're typically cheaper. The ordering
    // only differs for the contrived case where producer + upgrade are both
    // newly affordable on the same save-up — bot would buy producer first,
    // walker buys upgrade first. Sub-tick noise.
    headlineCache.clear();
    const candidates: Producer[] = [];
    for (const entry of buildings.getAll()) {
      const p = entry.producer;
      if (!p.repeatable) continue;
      if (!p.repeatable.canPurchase.value) continue;
      candidates.push(p);
    }
    if (candidates.length > 0) {
      const pick = policy.pick(candidates, { getHeadlineRate });
      if (pick) {
        buyProducer(pick);
        continue;
      }
    }

    // Phase 3: nothing affordable — save up to the cheapest unaffordable
    // item and let the next iteration's phases 1/2 buy it. For producer's
    // single-cookie economy, argmin time = argmin gap.
    const dt = distanceToNextAffordable();
    if (!isFinite(dt)) return { fireTime: Number.POSITIVE_INFINITY };
    const rate = totalCookieRate();
    if (rate <= 0) return { fireTime: Number.POSITIVE_INFINITY };
    if (dt <= 0) {
      // timeUntilResource says current >= target, but our canPurchase filter
      // said the item was unaffordable. Should be unreachable post-OL-850;
      // bail rather than mask the engine asymmetry.
      return { fireTime: Number.POSITIVE_INFINITY };
    }
    const cost = dt * rate;
    const elapsed = saveUp(cost);
    if (!isFinite(elapsed)) return { fireTime: Number.POSITIVE_INFINITY };
    if (simTime > budgetSec) return { fireTime: Number.POSITIVE_INFINITY };
  }

  return { fireTime: Number.POSITIVE_INFINITY };
}
