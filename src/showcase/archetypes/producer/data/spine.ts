// ─── Skeleton ───
// The spine's home in `data/`. Every number Consolidated Holdings uses falls out of
// the authored anchors below, in plain arithmetic with no engine and no runtime
// state. Modules read the cost ratio and each subsidiary's base cost at a
// `tunable()` reader site (`modules/firm.ts`), so a probe perturbs them without
// editing this file. `balance/producer-projection.ts` prints the prediction;
// `balance/arc-probe.ts` diffs the shipping game against it.
//
// Bucket: exponential family. Within a band the stack is one constant factor
// (modifier-product rule), and every stack step (a management memo, a market
// milestone, a credit grade) is a discrete step on a count or a lifetime total, so
// crossing one is a piecewise splice point rather than a continuous coupling.
//
// Where the closed form stops: which subsidiary absorbs the next dollar
// (combinatorial selection). The spine closes conditional on a stated buy order,
// payback-greedy over affordable units with the cheapest open memo held back once
// the board sits, and `projectArc` evaluates that order over the closed-form
// ladder. The arc probe checks the prediction against the engine.

// ─── Balance ───

// ── Authored anchors ──
// The only numbers chosen by judgment. Everything below them is derived.

/** $ per deal closed by hand, before any training. The unit of currency. */
export const DEAL_YIELD = 1;
/** Deals per second an engaged player sustains on the button. Chosen by feel; the probe's runner clicks at this rate. */
export const ACTIVE_DEAL_RATE = 4;
/** Seconds of hand-dealing to afford the first pushcart. Arousal band: the game must answer the first click fast. */
export const OPENING_BEAT = 5;
/** Beat at `LATE_LEVEL` on the isolated ladder, in the flow band's upper region. */
export const LATE_BEAT = 60;
export const LATE_LEVEL = 20;
/** Seconds the first pushcart takes to pay for itself. */
export const OPENER_PAYBACK = 25;
/** How much worse each tier's self-payback is than the tier below. Above 1 keeps the ladder a ladder, not a menu. */
export const PAYBACK_GROWTH = 1.25;
/** Seconds from a cold start to the top tier's first acquisition: the arc's length. */
export const LADDER_TARGET = 20 * 60;

// ── The one derived ratio ──

/** m = (T_n / T_1)^(1/(n−1)): incremental-math `pacing.mdx` § Targeting a beat time directly. */
export const COST_RATIO = (LATE_BEAT / OPENING_BEAT) ** (1 / (LATE_LEVEL - 1));
/** Doubling time in purchases, (ln 2)/ln m: what the player feels as cadence. */
export const DOUBLING_PURCHASES = Math.LN2 / Math.log(COST_RATIO);

// ── The ladder ──

export const TIER_COUNT = 8;
/** a₀: the opener costs exactly OPENING_BEAT seconds of hand-dealing. */
export const OPENER_COST = OPENING_BEAT * DEAL_YIELD * ACTIVE_DEAL_RATE;
/** r₀: the opener repays itself in OPENER_PAYBACK seconds. */
export const OPENER_RATE = OPENER_COST / OPENER_PAYBACK;

// ── The stack (Π μ) ──
// Three chains: the deal (click only, isolated), each subsidiary's rate, and
// operations (global).

/** Owned counts at which a subsidiary's management memos appear. */
export const UPGRADE_AT = [10, 40] as const;
/** Each management memo doubles its subsidiary's output. */
export const UPGRADE_MULT = 2;
/**
 * Memo payback as a fraction of the next unit's payback at the reveal count.
 * C = ρ·(μ−1)·N·a_i·m^N makes the memo ρ× the payback of unit N. Below 1 the
 * reveal is a clear buy, which is what makes it a threshold moment.
 */
export const UPGRADE_PAYBACK_RATIO = 0.6;

/** Sales-training memos on the deal chain; each doubles the deal. */
export const TRAINING_COUNT = 3;
export const TRAINING_MULT = 2;
/** A training course repays itself in this many seconds of active dealing. */
export const TRAINING_PAYBACK = 30;

/** Owned counts that earn a market-leader milestone; each doubles that subsidiary. */
export const MILESTONE_AT = [25, 50, 100] as const;
export const MILESTONE_MULT = 2;

/** Credit grades, earned on lifetime revenue (a statistics record, never the current rate). */
export const GRADES = ['B', 'BB', 'BBB', 'A', 'AA', 'AAA'] as const;
/** Grade k lands when lifetime revenue reaches the opener price of tier k + GRADE_TIER_OFFSET. */
export const GRADE_TIER_OFFSET = 2;
/** Each grade multiplies every subsidiary: the operations chain. */
export const GRADE_MULT = 1.2;

// ── Automation (dispatch) ──

/** Executive hires, in ladder order. Each costs the opener of `priceTier` and appears once `revealTier` is owned. */
export const HIRES = [
  { id: 'sales-desk', priceTier: 2, revealTier: 1 },
  { id: 'acquisitions-desk', priceTier: 3, revealTier: 2 },
  { id: 'board', priceTier: 5, revealTier: 4 },
] as const;
/** The sales desk deals at the engaged player's rate: it replaces the hand, it does not out-earn it. */
export const DESK_DEAL_RATE = ACTIVE_DEAL_RATE;
/** Seconds between the acquisitions desk's purchases. Sub-second so it keeps up with a hand. */
export const ACQUISITION_INTERVAL = 0.5;

// ── The night bookkeeper (offline catch-up) ──
// Time away is a time-base map, not a rate term: catch-up replays the time away
// through the live game loop, desks included, so the arc in sim-time is untouched.
// It is bought once. Until then a return replays nothing.
//
// The window answers two limits, and the smaller binds:
//   - game length: one return replays at most the climb to the top tier, so time
//     away never plays the arc for the player;
//   - processing speed: catch-up runs before the game screen appears, so the
//     window times the replay cost (`balance/offline-probe.ts` § 3) is the wait.

/** The bookkeeper costs the opener of `priceTier` and appears once `revealTier` is owned. */
export const BOOKKEEPER = { priceTier: 4, revealTier: 3 } as const;
/** Longest wait a return may hold the load, in seconds. */
export const OFFLINE_WAIT_BUDGET = 3;
/** Wall-clock seconds to replay one second away. */
export const OFFLINE_REPLAY_COST = 0.0009; // 0.87 ms mid-arc, every desk working (balance/offline-probe.ts § 3)
/** Longest time away one return replays, in seconds; time past it is lost. */
export const OFFLINE_WINDOW_SECONDS = Math.min(
  LADDER_TARGET,
  OFFLINE_WAIT_BUDGET / OFFLINE_REPLAY_COST,
);

// ── Ladder generator ──

export interface Ladder {
  costStep: number;
  rateStep: number;
  /** a_i */
  baseCost: number[];
  /** r_i */
  baseRate: number[];
}

/** Tier i costs a₀·S^i and earns r₀·(S/g)^i, so self-payback climbs ×g per tier. */
export function buildLadder(costStep: number): Ladder {
  const rateStep = costStep / PAYBACK_GROWTH;
  const baseCost: number[] = [];
  const baseRate: number[] = [];
  for (let i = 0; i < TIER_COUNT; i++) {
    baseCost.push(OPENER_COST * costStep ** i);
    baseRate.push(OPENER_RATE * rateStep ** i);
  }
  return { costStep, rateStep, baseCost, baseRate };
}

/** Cost of unit n (zero-based) of a tier: a·m^n. */
export function unitCost(a: number, n: number): number {
  return a * COST_RATIO ** n;
}

/** Memo price at reveal count N: ρ·(μ−1)·N·a·m^N. */
export function upgradeCost(a: number, n: number): number {
  return UPGRADE_PAYBACK_RATIO * (UPGRADE_MULT - 1) * n * unitCost(a, n);
}

/** Training k repays TRAINING_PAYBACK seconds of the active deal income it adds. */
export function trainingCost(k: number): number {
  const dealBefore = DEAL_YIELD * TRAINING_MULT ** k * ACTIVE_DEAL_RATE;
  return TRAINING_PAYBACK * (TRAINING_MULT - 1) * dealBefore;
}

export function gradeThreshold(ladder: Ladder, k: number): number {
  return ladder.baseCost[k + GRADE_TIER_OFFSET];
}

export function hireCost(ladder: Ladder, priceTier: number): number {
  return ladder.baseCost[priceTier];
}

// ── Runnable spine: the payback-greedy projection ──

export interface ProjectedBeat {
  label: string;
  t: number;
}

export interface Projection {
  beats: ProjectedBeat[];
  /** Seconds to the first unit of each tier; Infinity if never inside the horizon. */
  tierOpen: number[];
  finalRate: number;
  counts: number[];
}

/**
 * Evaluate the stated buy order over the closed-form ladder, one-second steps.
 * Each second: earn, take every affordable memo and hire, then spend on
 * subsidiaries by lowest marginal payback among affordable units. Once the board
 * sits, only cash above the cheapest open memo's price is spent. The hand deals
 * at ACTIVE_DEAL_RATE until the sales desk takes over at the same rate.
 */
export function projectArc(ladder: Ladder, horizon: number): Projection {
  const counts = new Array<number>(TIER_COUNT).fill(0);
  const tierMult = new Array<number>(TIER_COUNT).fill(1);
  const tierOpen = new Array<number>(TIER_COUNT).fill(Infinity);
  const upgradesTaken = new Set<string>();
  const milestonesTaken = new Set<string>();
  const hired = new Set<string>();
  const beats: ProjectedBeat[] = [];
  let cash = 0;
  let lifetime = 0;
  let deal = DEAL_YIELD;
  let training = 0;
  let grades = 0;
  let ops = 1;

  const tierRate = (i: number) => ladder.baseRate[i] * tierMult[i] * ops;
  const passive = () => counts.reduce((s, n, i) => s + n * tierRate(i), 0);

  for (let t = 1; t <= horizon; t++) {
    const income = deal * ACTIVE_DEAL_RATE + passive();
    cash += income;
    lifetime += income;

    while (grades < GRADES.length && lifetime >= gradeThreshold(ladder, grades)) {
      beats.push({ label: `grade ${GRADES[grades]}`, t });
      grades++;
      ops *= GRADE_MULT;
    }

    // Memos and hires: taken on sight.
    for (let k = training; k < TRAINING_COUNT && counts[k] > 0; k++) {
      const c = trainingCost(k);
      if (cash < c) break;
      cash -= c;
      deal *= TRAINING_MULT;
      training++;
      beats.push({ label: `training ${k + 1}`, t });
    }
    for (let i = 0; i < TIER_COUNT; i++) {
      for (const n of UPGRADE_AT) {
        const id = `${i}@${n}`;
        if (upgradesTaken.has(id) || counts[i] < n) continue;
        const c = upgradeCost(ladder.baseCost[i], n);
        if (cash < c) continue;
        cash -= c;
        tierMult[i] *= UPGRADE_MULT;
        upgradesTaken.add(id);
        beats.push({ label: `upgrade t${i}@${n}`, t });
      }
    }
    for (const h of HIRES) {
      if (hired.has(h.id) || counts[h.revealTier] < 1) continue;
      const c = hireCost(ladder, h.priceTier);
      if (cash < c) continue;
      cash -= c;
      hired.add(h.id);
      beats.push({ label: `hire ${h.id}`, t });
    }

    // Once the board sits, the desk holds back the price of the cheapest open memo.
    let reserve = 0;
    if (hired.has('board')) {
      reserve = Infinity;
      for (let i = 0; i < TIER_COUNT; i++) {
        for (const n of UPGRADE_AT) {
          if (counts[i] >= n && !upgradesTaken.has(`${i}@${n}`)) {
            reserve = Math.min(reserve, upgradeCost(ladder.baseCost[i], n));
          }
        }
      }
      if (reserve === Infinity) reserve = 0;
    }

    // Units: payback-greedy over the affordable.
    for (;;) {
      let best = -1;
      let bestPayback = Infinity;
      for (let i = 0; i < TIER_COUNT; i++) {
        const c = unitCost(ladder.baseCost[i], counts[i]);
        if (c > cash - reserve) continue;
        const payback = c / tierRate(i);
        if (payback < bestPayback) {
          bestPayback = payback;
          best = i;
        }
      }
      if (best < 0) break;
      cash -= unitCost(ladder.baseCost[best], counts[best]);
      counts[best]++;
      if (counts[best] === 1) {
        tierOpen[best] = t;
        beats.push({ label: `open t${best}`, t });
      }
      for (const n of MILESTONE_AT) {
        const id = `${best}@${n}`;
        if (counts[best] >= n && !milestonesTaken.has(id)) {
          milestonesTaken.add(id);
          tierMult[best] *= MILESTONE_MULT;
          beats.push({ label: `milestone t${best}@${n}`, t });
        }
      }
    }
  }
  return { beats, tierOpen, finalRate: passive(), counts };
}

// ── The solve ──

/**
 * CLASS_COST_STEP is solved, not chosen: bisect the per-tier cost step until the
 * projection opens the top tier at LADDER_TARGET. Arc length is monotone in the
 * step (a steeper ladder is a longer climb), so bisection is sound.
 */
function solveCostStep(): number {
  let lo = 2;
  let hi = 60;
  for (let iter = 0; iter < 40; iter++) {
    const mid = (lo + hi) / 2;
    const open = projectArc(buildLadder(mid), LADDER_TARGET * 3).tierOpen[TIER_COUNT - 1];
    if (open > LADDER_TARGET) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

export const CLASS_COST_STEP = solveCostStep();
export const LADDER = buildLadder(CLASS_COST_STEP);
