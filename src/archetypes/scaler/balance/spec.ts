/**
 * Scaler engine-as-oracle helpers — methodology #2 spec layer.
 *
 * Per `archetypes/BALANCING.md § Engine as oracle`: frozen-state queries
 * against `getCost(1)` / `computedRate` / `getTotalRate` for the
 * triangular multi-resource walker over the antimatter subsystem. The
 * engine *is* the math; this file does no spec-side reimplementation
 * of cost / rate / chain composition.
 *
 * Sub-leaf B scope: **antimatter slice only**. Pure / triangular per
 * scaler.md § 3 stress axis 1 + body § 1 (matches producer's existing
 * triangular composition row). Prestige (Optimal stopping / ROI math)
 * and ECC (Piecewise) get their predictor halves at sub-leaves D and E
 * respectively.
 *
 * The triangular composer walks a strict-tier-order schedule (algebra
 * § 6.3 + § 6.6); per-step Δt is `Cost / total_rate` per
 * `closed-form-progression/case-studies/core-timing-formula.md § 4`.
 *
 * Mid-step rate transitions (achievement firings on cumulative-threshold
 * crossings) are spliced via the engine's `timeUntilGateFlip` primitive
 * over each unfired achievement's `Gate` spec. **Scaler caveat at sub-
 * leaf B:** scaler achievements still use the legacy
 * `requirement: (state) => boolean` predicate vtable
 * (modules/achievements.ts), not Gate. Sub-leaf C migrates them per
 * OL-841 body § 4. Until then, `nextAchievementFireDistance` returns
 * +∞ for every step and the predictor systematically underestimates
 * sim — this is the expected drift signal in `verify.ts`. Documented
 * in `archetypes/scaler.balance.md` first finding.
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
import { createScalerEngine } from '..';
import { ScalerTiersKey, type ScalerTier } from '../modules/tiers';

let counter = 0;
let cachedEngine: Engine | undefined;

function getSpecEngine(): Engine {
  if (cachedEngine) return cachedEngine;
  const { engine } = createScalerEngine(undefined, {
    persistenceNamespace: `spec-${++counter}`,
  });
  engine.selectMod('synergism-slim');
  engine.start();
  engine.stop();
  cachedEngine = engine;
  return engine;
}

function getTier(engine: Engine, id: 'antimatter' | 'prestige' | 'transcend'): ScalerTier {
  const tiers = engine.tryInject(ScalerTiersKey);
  if (!tiers) throw new Error('spec: ScalerTiersKey not provided by engine');
  const tier = tiers.find((t) => t.id === id);
  if (!tier) throw new Error(`spec: tier '${id}' missing from ScalerTiersKey`);
  return tier;
}

function setAntimatterCounts(engine: Engine, counts: Readonly<Record<string, number>>): void {
  const tier = getTier(engine, 'antimatter');
  for (const entry of tier.producers.getAll()) {
    if (entry.producer.trigger !== 'continuous' || !entry.producer.repeatable) continue;
    entry.producer.repeatable.amount.value = counts[entry.def.id] ?? 0;
  }
}

function resetAntimatterUpgrades(engine: Engine): void {
  const tier = getTier(engine, 'antimatter');
  if (!tier.upgrades) return;
  for (const entry of tier.upgrades.getAll()) {
    if (entry.purchasable.active.value) entry.purchasable.amount.value = 0;
  }
}

/**
 * Reset the antimatter walker world to baseline before a walker pass.
 * Counts/upgrades first, then achievements — so when watchers re-evaluate
 * after the reset, requirements see the baseline state.
 *
 * Antimatter-only at sub-leaf B. Prestige/transcend reset semantics live
 * with their tier conversions (already handled engine-side via
 * `Reset.reset()`); the spec walker for D/E will hook into the existing
 * Reset surface rather than reimplement.
 *
 * `seedCounts` lets callers skip a bootstrap regime. Since scaler's
 * antimatter has no click-driven first-purchase (the 1e2 coin bootstrap
 * grant covers Worker's 100-coin cost), the default empty seedCounts
 * matches the canonical first-cycle start.
 */
export function resetAntimatterWalkerWorld(
  engine: Engine,
  seedCounts: Readonly<Record<string, number>> = {},
): void {
  const tier = getTier(engine, 'antimatter');
  setAntimatterCounts(engine, seedCounts);
  resetAntimatterUpgrades(engine);

  const coin = tier.currency;
  if (coin.cumulative) coin.cumulative.value = Decimal.dZero;
  coin.value = Decimal.dZero;

  // Reset all achievements regardless of tier — antimatter walker may
  // splice on cross-tier ones if (post sub-leaf C) any have antimatter-
  // resource-bearing Gate specs.
  const categories = engine.tryInject(CategoriesKey);
  if (categories?.achievements) {
    for (const cat of categories.achievements) {
      for (const entry of cat.getAll()) {
        if (entry.achievement.earned.value) {
          entry.achievement.earned.value = false;
          entry.achievement.earnedAt.value = null;
        }
      }
    }
  }
}

/**
 * Spec-side accessor — `timeUntilGateFlip` projects `cumulative-gte`
 * against the underlying resource's rate. Antimatter cycle's rate-
 * bearing channel is `coin`; other resources surface as 0-rate so
 * `count-gte` / `unlock` / `state` Gates pass through opaque.
 */
function buildSpecAccessor(engine: Engine): GameStateAccessor & GameStateMutator {
  const tier = getTier(engine, 'antimatter');
  const coin = tier.currency;
  return {
    getResource: (id) => (id === coin.id ? Decimal.fromValue(coin.value) : Decimal.dZero),
    getRate: (id) =>
      id === coin.id ? Decimal.fromValue(tier.producers.getTotalRate(coin)) : Decimal.dZero,
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
  return { accessor: buildSpecAccessor(engine), categories, registry };
}

export interface TierStep {
  kind: 'tier';
  /** Antimatter producer id to expand. */
  id: string;
  /** Count to grow to. No-op if not strictly greater than the current accumulated count. */
  to: number;
}

export interface UpgradeStep {
  kind: 'upgrade';
  /** Antimatter upgrade id (`accelerator` | `multiplier`). No-op if already active. */
  id: string;
}

export type ScheduleStep = TierStep | UpgradeStep;

export interface ArcWaypoint {
  /** The schedule step this waypoint corresponds to (one waypoint per step, no-ops included). */
  step: ScheduleStep;
  /** Cumulative time at the moment the step's effect lands. */
  atSec: number;
  /** Antimatter tier counts after the step is applied. Upgrade steps do not change counts. */
  counts: Readonly<Record<string, number>>;
}

/**
 * Per-walker hooks consumed by {@link accumulateUntilPay}'s splice loop.
 * Identical shape to producer's so the splice math stays uniform across
 * archetypes — convergence signal if a third archetype lands the same
 * shape (graduate as engine helper per `candidate-primitives.md`).
 */
export interface AccumulateUntilPayOps {
  getRate: () => number;
  getNextSpliceDistance: () => number;
  advance: (dt: number, rate: number) => void;
}

/**
 * Splice-aware "save up cost coins at the current rate" loop. Returns
 * elapsed dt; `Number.POSITIVE_INFINITY` when the rate is zero and no
 * splice can change that. Lifted verbatim from producer/balance/spec.ts;
 * see that file for the splice-semantics rationale.
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
 * Per-step waypoints under a strict-tier-order schedule for the
 * antimatter subsystem. Triangular per algebra §6.3; series composition
 * per §6.6 — total is Σ per-step first-passages.
 *
 * Sub-leaf B scope: **antimatter only**. Schedule walks Worker → ... →
 * Refinery + Accelerator + Multiplier. No prestige/transcend conversions
 * are spliced; for cross-cycle predictions the walker would need to
 * model the conversion → reset → bootstrap loop, which is sub-leaf D
 * territory.
 */
export function arcWaypoints(
  schedule: readonly ScheduleStep[],
  initial: Readonly<Record<string, number>> = {},
): ArcWaypoint[] {
  const engine = getSpecEngine();
  const tier = getTier(engine, 'antimatter');
  const coin = tier.currency;
  const coinCumulative = coin.cumulative;
  if (!coinCumulative) {
    throw new Error("arcWaypoints: 'scaler/coins' resource has no cumulative tracker");
  }
  if (!tier.upgrades) {
    throw new Error('arcWaypoints: antimatter tier has no upgrades category');
  }
  const upgrades = tier.upgrades;

  const runtime = buildGateRuntime(engine);
  const counts: Record<string, number> = { ...initial };

  resetAntimatterWalkerWorld(engine, counts);

  const accumulate = (cost: number): number =>
    accumulateUntilPay(cost, {
      getRate: () => Decimal.fromValue(tier.producers.getTotalRate(coin)).toNumber(),
      getNextSpliceDistance: () => nextAchievementFireDistance(runtime),
      advance: (dt, rate) => {
        coinCumulative.value = Decimal.add(coinCumulative.value, dt * rate);
      },
    });

  const out: ArcWaypoint[] = [];
  let total = 0;

  for (const step of schedule) {
    if (step.kind === 'tier') {
      const from = counts[step.id] ?? 0;
      if (step.to > from) {
        const p = tier.producers.getProducer(step.id);
        if (!p?.repeatable) {
          throw new Error(`arcWaypoints: no continuous producer '${step.id}'`);
        }

        for (let k = from; k < step.to; k++) {
          counts[step.id] = k;
          setAntimatterCounts(engine, counts);
          const cost = Decimal.fromValue(p.repeatable.getCost(1)).toNumber();
          total += accumulate(cost);
        }
        counts[step.id] = step.to;
        setAntimatterCounts(engine, counts);
      }
    } else {
      const u = upgrades.getPurchasable(step.id);
      if (!u) throw new Error(`arcWaypoints: no upgrade '${step.id}'`);
      if (!u.active.value) {
        const cost = Decimal.fromValue(u.getCost(1)).toNumber();
        total += accumulate(cost);
        // Set amount directly — bypasses cost/onPurchase, but `active`
        // is computed from `amount >= 1` and the grants bound via
        // `chain.bind` watch it reactively, so the modifier joins the
        // rate chain immediately.
        u.amount.value = 1;
      }
    }
    out.push({ step, atSec: total, counts: { ...counts } });
  }
  return out;
}

/**
 * Smallest computed flip-distance across unfired achievements with a
 * Gate-form requirement. **Returns +∞ at sub-leaf B** because scaler
 * achievements have not been migrated onto Gate yet — sub-leaf C
 * migration replaces the predicate vtable with Gate literals; until
 * then `entry.achievement.gate` is undefined for every entry.
 *
 * Lifted from producer/balance/spec.ts. Walks every achievement category
 * (scaler ships one — `'scaler/achievements'`); generalizes if forks
 * fan out into per-tier achievement categories.
 */
export function nextAchievementFireDistance(runtime: GateRuntime): number {
  const categories = runtime.categories.achievements;
  if (!categories) return Number.POSITIVE_INFINITY;
  let nearest = Number.POSITIVE_INFINITY;
  for (const cat of categories) {
    for (const entry of cat.getAll()) {
      if (entry.achievement.earned.value) continue;
      const gate = entry.achievement.gate;
      if (!gate) continue;
      const dist = timeUntilGateFlip(gate, runtime);
      if (dist.reason === 'computed' && dist.seconds < nearest) {
        nearest = dist.seconds;
      }
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
 * Default strict-tier-order schedule for the antimatter subsystem: walk
 * the first `tierCount` antimatter producers in registration order to
 * `perTierCount`, then activate Accelerator + Multiplier as cumulative-
 * buy upgrades (one purchase each at sub-leaf B; cumulative-buy walking
 * is C territory once the schedule shape settles).
 *
 * `tierCount` defaults to all 5 antimatter producers. Sub-leaf B's verify
 * passes 2 to keep the no-bot sim within budget; sub-leaf C widens once
 * calibration tightens cost-vs-rate tier ratios.
 */
export function antimatterStrictTierOrderSchedule(opts: {
  perTierCount: number;
  tierCount?: number;
}): ScheduleStep[] {
  const out: ScheduleStep[] = [];
  const allTiers = ['antimatter-1', 'antimatter-2', 'antimatter-3', 'antimatter-4', 'antimatter-5'];
  const tiersToWalk = allTiers.slice(0, opts.tierCount ?? allTiers.length);
  for (const id of tiersToWalk) {
    out.push({ kind: 'tier', id, to: opts.perTierCount });
  }
  out.push({ kind: 'upgrade', id: 'accelerator' });
  out.push({ kind: 'upgrade', id: 'multiplier' });
  return out;
}

// ─── TODO(sub-leaf D) — Prestige timing predictor (Optimal stopping / #5) ───
// ROI math per BALANCING.md § Theme 3 #5 canonical existence proof:
//   paybackSeconds = cost / (rate × (multiplier − 1))
// Adapted to scaler's prestige conversion: `cost` is the headline-resource
// threshold (Synergism's prestigeConversionLog implicit ladder), `rate` is
// the current coin production rate, `multiplier` is the post-conversion
// `chain.apply(baseRate) / baseRate` after `prestigePoints` increments
// achievement-and-crystal-fed grants. **Open uncertainty** (OL-841 body):
// the denominator may need to factor in the layered Crystal-upgrade cost
// ladder paid post-conversion in prestigeShards. Sub-leaf D triage call.

// ─── TODO(sub-leaf E) — ECC softcap predictor (Piecewise / #2) ───
// Math layer per Synergism `Challenges.ts:541-548` `CalcECC`:
//   linear stack until N completions, then softcap.
// Bot attempt rule + sim verify. Walker count earned at sub-leaf E
// triage. **Open uncertainty** (OL-841 body): challenge `completions`
// `keep:` semantics — verify the engine doesn't recurse-reset
// `'scaler/transcend/challenges/{id}'` contexts under the transcend
// reset before authoring this predictor. If completions zero on every
// transcend cycle, ECC stacking is structurally impossible and the
// predictor isn't the failure mode.
