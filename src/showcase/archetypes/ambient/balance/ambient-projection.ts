/**
 * Ambient — closed-form balance projection (no engine).
 *
 * Run: pnpm exec vite-node src/showcase/archetypes/ambient/balance/ambient-projection.ts
 *
 * Projection — pure math, NO engine (`open-loop-engine/docs/consumer-guide-balance.md`
 * § The spine — a falsifiable prediction). It predicts; the probes verify. If the
 * spine cannot write the ladder inversion, the buy order and the reveal times on
 * paper, the economy is mis-specified rather than merely untuned.
 *
 * THE SPINE (see `../IDENTITY.md` § Rate-function spine and `../data/producers.ts`
 * § Balance). Geometric cost-scaling tuned gentle, with an achievement product
 * layered on as pacing:
 *
 *     cost_i(n)   = baseCost_i · s^n                       (s = COST_SCALING)
 *     spend_i(n)  = baseCost_i · (s^n − 1)/(s − 1)         geometric series
 *     n_i(S)      = log_s( 1 + S·(s−1)/baseCost_i )        the inversion
 *     headline(t) = Σ_i count_i · baseRate_i · A           A = achievement product
 *
 * Coverage is full — one modeled subsystem, no stochastic layer — so this file
 * carries the whole arc, in three parts of decreasing certainty:
 *
 *   1. THE LADDER — exact arithmetic. Nothing to verify; it is the algebra.
 *   2. THE BUY ORDER — mirrors `selectionHybridPayback`'s score exactly
 *      (`open-loop-engine/src/core/policy.ts`). Predicts which tier the shipping
 *      autobuyer takes next. Wrong here means the policy model drifted from the
 *      engine, which is worth knowing before reading any timing.
 *   3. THE ARC — reinvestment quadrature. With all income reinvested, the arc
 *      solves dS/dt = headline(S), so t(S) = ∫ dS/headline(S). Still math, no
 *      engine: the integrand is closed-form and only the integral is numeric.
 *      Compare its reveal times against `reveal-probe.ts`'s measured ones.
 *
 * Divergence in part 3 is the interesting output. The quadrature assumes income
 * is reinvested continuously and instantly; the shipping autobuyer buys on a 1s
 * interval against integer counts, so it should run slightly *behind* — a
 * projection that ran behind the engine would mean the model is wrong, not the
 * tuning.
 */

import { AUTO_PRODUCERS } from '../data/producers';
import { UNLOCKS } from '../data/unlocks';
import { DEFAULT_ACHIEVEMENT_MULTIPLIER } from '../modules/achievements';

const S = 1.08; // COST_SCALING — inlined in data/producers.ts, see the note there.

/** `interval` passed to `setupPolicyAutoPurchase` in `modules/autobuyers/auto-producers.ts`. */
const PURCHASE_INTERVAL_SEC = 1;

interface Tier {
  id: string;
  baseCost: number;
  baseRate: number;
  initial: number;
}

const TIERS: Tier[] = AUTO_PRODUCERS.map((p) => ({
  id: p.id,
  baseCost: Number(p.purchase.baseCost),
  baseRate: Number(p.baseRate),
  initial: Number(p.purchase.initialAmount ?? 0),
}));

/** Producer-reveal unlocks, in threshold order — what part 3 predicts. */
const REVEALS = UNLOCKS.filter((u) => u.reveals.kind === 'producer')
  .map((u) => ({
    id: u.id,
    producerId: (u.reveals as { kind: 'producer'; producerId: string }).producerId,
    threshold: Number(u.threshold),
  }))
  .sort((a, b) => a.threshold - b.threshold);

// ─── 1. The ladder — exact ───────────────────────────────────────────────────

/** `cost_i(n)` — price of the (n+1)th unit. */
function costAt(t: Tier, n: number): number {
  return t.baseCost * Math.pow(S, n);
}

/** `spend_i(n)` — cumulative cost of taking tier `t` from 0 to `n` owned. */
function spendTo(t: Tier, n: number): number {
  return (t.baseCost * (Math.pow(S, n) - 1)) / (S - 1);
}

/** `n_i(S)` — how many of tier `t` a lifetime total of `sprouts` buys outright. */
function countAffordable(t: Tier, sprouts: number): number {
  return Math.log(1 + (sprouts * (S - 1)) / t.baseCost) / Math.log(S);
}

function fmtTime(sec: number): string {
  if (!Number.isFinite(sec)) return '—';
  if (sec < 60) return `${sec.toFixed(1)}s`;
  if (sec < 3600) return `${(sec / 60).toFixed(1)}m`;
  return `${(sec / 3600).toFixed(2)}h`;
}

function fmt(n: number): string {
  if (n >= 1e6) return n.toExponential(2);
  return n.toLocaleString('en-US', { maximumFractionDigits: 1 });
}

console.log('# Ambient — closed-form projection\n');
console.log(`Ladder steepness s = ${S}; achievement unit A₁ = ${DEFAULT_ACHIEVEMENT_MULTIPLIER}\n`);

console.log('## 1. The ladder (exact)\n');
console.log('Per-tier price and payback at a few owned-counts. Payback is');
console.log('`cost(n) / baseRate` — seconds for one more unit to repay itself.\n');
console.log('| tier | baseCost | baseRate | cost@10 | cost@100 | payback@0 | payback@100 |');
console.log('|---|---|---|---|---|---|---|');
for (const t of TIERS) {
  console.log(
    `| ${t.id} | ${fmt(t.baseCost)} | ${fmt(t.baseRate)} | ${fmt(costAt(t, 10))} | ` +
      `${fmt(costAt(t, 100))} | ${fmtTime(costAt(t, 0) / t.baseRate)} | ` +
      `${fmtTime(costAt(t, 100) / t.baseRate)} |`,
  );
}

console.log('\nThe `baseCost / baseRate` ratios are the pacing invariant a fork retunes:');
console.log(
  '  ' + TIERS.map((t) => `${t.id} ${(t.baseCost / t.baseRate).toFixed(0)}`).join('  ·  '),
);
console.log("Coop's dip below planter is the deliberate first-purchase-feels-good beat.\n");

console.log('### The inversion — `n_i(S)`, owned-count against lifetime sprouts\n');
console.log('This is the shallow ladder doing its job: at s = 1.08 the count keeps');
console.log('climbing across decades of sprouts instead of hitting a wall. The');
console.log('`spend` column is the geometric series — what that count costs outright.\n');
{
  const LEVELS = [1e3, 1e5, 1e7, 1e9];
  console.log('| tier | ' + LEVELS.map((s) => `n@${fmt(s)}`).join(' | ') + ' | spend@1e9 |');
  console.log('|---' + LEVELS.map(() => '|---').join('') + '|---|');
  for (const t of TIERS) {
    const counts = LEVELS.map((s) => countAffordable(t, s).toFixed(1));
    const n9 = countAffordable(t, 1e9);
    console.log(`| ${t.id} | ${counts.join(' | ')} | ${fmt(spendTo(t, n9))} |`);
  }
  console.log('\nEach decade of sprouts buys a roughly constant *increment* of count');
  console.log('(log_s(10) ≈ 30), which is the structural reason the arc reads as');
  console.log('steady rather than as a series of walls.\n');
}

// ─── 2. The buy order — mirrors selectionHybridPayback ───────────────────────

interface Holding {
  tier: Tier;
  count: number;
}

/**
 * `selectionHybridPayback`'s score, in plain arithmetic:
 *   `max(cost − resource, 0)/headline + cost/rate`. With no income, an
 * unaffordable tier would wait forever and is skipped, while an affordable one
 * ranks by `cost/rate` alone. Rate is the engine's `computedRate`, which is
 * the *per-unit* effective rate — so a tier at count 0 is still a candidate.
 */
function score(h: Holding, sprouts: number, headline: number, achievements: number): number {
  const cost = costAt(h.tier, h.count);
  const rate = h.tier.baseRate * achievements;
  if (rate <= 0) return Infinity;
  if (headline <= 0) return cost > sprouts ? Infinity : cost / rate;
  return Math.max(cost - sprouts, 0) / headline + cost / rate;
}

function headlineRate(holdings: Holding[], achievements: number): number {
  return holdings.reduce((sum, h) => sum + h.count * h.tier.baseRate, 0) * achievements;
}

console.log('## 2. The buy order (mirrors the shipping policy)\n');
console.log('Scored at a cold start — every tier at its seeded count, no sprouts banked.');
console.log('Lowest score is what `selectionHybridPayback` takes first.\n');
{
  const holdings: Holding[] = TIERS.map((tier) => ({ tier, count: tier.initial }));
  const headline = headlineRate(holdings, 1);
  const rows = holdings
    .map((h) => ({ id: h.tier.id, s: score(h, 0, headline, 1) }))
    .sort((a, b) => a.s - b.s);
  console.log('| rank | tier | score |');
  console.log('|---|---|---|');
  rows.forEach((r, i) => console.log(`| ${i + 1} | ${r.id} | ${fmt(r.s)} |`));
  console.log(`\nPredicted first purchase: **${rows[0].id}**.`);
  console.log('While nothing is affordable the wait term dominates, so the cheapest');
  console.log('reachable tier wins regardless of its payback — that is the cold-start');
  console.log('branch the engine documents, reproduced here rather than assumed.\n');
}

// ─── 3. The arc — reinvestment quadrature ────────────────────────────────────

/**
 * Owned counts under full reinvestment of a lifetime total `S`, allocated by the
 * same payback ordering the policy uses. Closed-form per tier given its share;
 * the split itself is what the quadrature steps through.
 */
function marchArc(): Array<{ id: string; producerId: string; threshold: number; t: number }> {
  const holdings: Holding[] = TIERS.map((tier) => ({ tier, count: tier.initial }));
  const results: Array<{ id: string; producerId: string; threshold: number; t: number }> = [];

  let lifetime = 0; // cumulative sprouts ever produced — what reveals read
  let banked = 0; // unspent
  let t = 0;
  let nextReveal = 0;

  // A = 1 throughout: no achievement product. See § Coverage.
  const achievements = 1;

  /** A tier is buyable only once its own reveal has fired — `canPurchase`. */
  const revealedAt = new Map(REVEALS.map((r) => [r.producerId, r.threshold]));
  const isRevealed = (h: Holding): boolean => lifetime >= (revealedAt.get(h.tier.id) ?? 0);

  const recordRevealsUpTo = (targetLifetime: number, headline: number): void => {
    while (nextReveal < REVEALS.length && REVEALS[nextReveal].threshold <= targetLifetime) {
      const r = REVEALS[nextReveal];
      const dtReveal = Math.max(0, r.threshold - lifetime) / headline;
      results.push({ id: r.id, producerId: r.producerId, threshold: r.threshold, t: t + dtReveal });
      nextReveal++;
    }
  };

  // Step on purchase events: between two purchases the headline rate is
  // constant, so each segment's elapsed time is exact division rather than
  // integration error. The quadrature is the sum over those exact segments.
  const MAX_EVENTS = 200_000;
  for (let i = 0; i < MAX_EVENTS && nextReveal < REVEALS.length; i++) {
    const headline = headlineRate(holdings, achievements);
    if (headline <= 0) break;

    recordRevealsUpTo(lifetime, headline);
    if (nextReveal >= REVEALS.length) break;

    // The engine scores only AFFORDABLE, REVEALED candidates — it never banks
    // toward a tier it cannot buy yet. Modeling a global pick instead makes the
    // arc race ahead, because the projection then buys high-rate tiers before
    // the game has revealed them.
    const eligible = holdings.filter((h) => isRevealed(h) && costAt(h.tier, h.count) <= banked);

    if (eligible.length === 0) {
      // Nothing buyable: accrue until the cheapest revealed tier is affordable,
      // or until the next reveal lands, whichever comes first.
      const revealedHoldings = holdings.filter(isRevealed);
      const cheapest = revealedHoldings.length
        ? Math.min(...revealedHoldings.map((h) => costAt(h.tier, h.count)))
        : Infinity;
      const nextThreshold = REVEALS[nextReveal].threshold;
      const target = Math.min(
        Number.isFinite(cheapest) ? cheapest : Infinity,
        Math.max(nextThreshold - lifetime + banked, 0),
      );
      const need = Math.max(target - banked, 0);
      if (!Number.isFinite(need) || need <= 0) break;
      const dt = need / headline;
      recordRevealsUpTo(lifetime + need, headline);
      t += dt;
      lifetime += need;
      banked += need;
      continue;
    }

    let best = eligible[0];
    let bestScore = Infinity;
    for (const h of eligible) {
      const sc = score(h, banked, headline, achievements);
      if (sc < bestScore) {
        bestScore = sc;
        best = h;
      }
    }

    // The autobuyer is throttled to one purchase per `interval` seconds, so a
    // burst of affordable purchases still costs real time.
    const dt = PURCHASE_INTERVAL_SEC;
    recordRevealsUpTo(lifetime + headline * dt, headline);
    t += dt;
    lifetime += headline * dt;
    banked += headline * dt - costAt(best.tier, best.count);
    best.count += 1;
  }
  return results;
}

console.log('## 3. The arc (reinvestment quadrature) — a strict upper bound\n');
console.log('Reveal times under reinvestment, with the achievement product held at');
console.log('A = 1. The march mirrors the three things that actually constrain the');
console.log('shipping autobuyer: it scores only AFFORDABLE candidates, only among');
console.log('tiers whose reveal has already fired, and at most one purchase per');
console.log(`${PURCHASE_INTERVAL_SEC}s interval.\n`);
console.log('Achievements only ever *raise* the rate, so with A = 1 these are the');
console.log('LATEST the reveals can land. `reveal-probe.ts` must measure every');
console.log('crossing at or before these times; a probe running late means something');
console.log('is wrong with the economy, not with the model.\n');
console.log('A = 1 is not a simplification for tidiness — see § Coverage below.\n');
console.log('| unlock | reveals | lifetime threshold | predicted |');
console.log('|---|---|---|---|');
for (const r of marchArc()) {
  console.log(`| ${r.id} | ${r.producerId} | ${fmt(r.threshold)} | ${fmtTime(r.t)} |`);
}

console.log('\n## Coverage — where this closed form stops\n');
console.log('At the **achievement product**. Each achievement folds a multiplier into');
console.log('the rate chain when its requirement fires, and those requirements are');
console.log('arbitrary predicates over game state (`data/achievements.ts`) — resume');
console.log('gaps, owned-counts, elapsed time. They are a discrete-event layer, not a');
console.log('rate function, so no expression here projects them. Bounding is the');
console.log('honest treatment: hold A = 1 and report the latest possible arc.');
console.log('\nThat gap is measurable rather than theoretical. At the coop reveal the');
console.log('shipping engine already carries A ≈ 1.04 (two achievements earned), which');
console.log('is precisely the distance between this bound and the probe. What measures');
console.log('the remainder is `reveal-probe.ts` and `solve-probe.ts` — not more algebra.');
console.log('\nThe remaining gap is fractional counts: the march buys against a');
console.log('continuous count where the engine holds integers. That makes the real');
console.log('arc marginally slower, which pushes the same way as A = 1 and so cannot');
console.log('threaten the bound from below.');
console.log('\nIf a probe ever measures a reveal LATER than its bound here, suspect the');
console.log('part-2 buy order first — a mis-modeled policy moves every timing');
console.log('downstream of it. Two such errors were caught writing this file: scoring');
console.log('unaffordable candidates, and buying tiers before their reveal fired. Both');
console.log('made the arc race ahead of the engine while looking perfectly reasonable.');
console.log('\nA reveal landing outside its beat window is a content question, not a');
console.log('tuning one — see `../BALANCING.md` § Known thin on the unfold cadence.');
