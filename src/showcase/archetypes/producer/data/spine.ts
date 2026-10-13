// ─── Skeleton ───
// The spine's home in `data/`. Every number Consolidated Holdings uses falls out of
// the authored anchors below, in plain arithmetic with no engine and no runtime
// state. Modules read the cost ratio and each subsidiary's base cost at a
// `tunable()` reader site (`modules/firm.ts`), so a probe perturbs them without
// editing this file. `balance/producer-projection.ts` prints the prediction;
// `balance/arc-probe.ts` diffs the shipping game against it.
//
// Bucket: exponential family. Within a band the stack is one constant factor
// (modifier-product rule), and every stack step (a memo, a certificate, a grade, a
// standing upgrade) is a discrete step on a count or a lifetime total, so crossing
// one is a splice point rather than a continuous coupling. Synergies and the
// referral network are the exceptions: each reads another holding's count, so a
// tier's rate is a function of the whole count vector.
//
// Where the closed form stops:
//   - which holding absorbs the next dollar (combinatorial selection). The spine
//     closes on a stated buy order, payback-greedy over affordable units and phones
//     with the cheapest open memo held back once the board sits. Under synergies
//     greedy payback is a heuristic, not an optimum.
//   - tips arrive at random and pay a random effect. The projection books each at
//     its expected value, on the mean interval, at a stated catch rate.
// `projectArc` evaluates both over the closed-form ladder; the probes measure the
// spread.

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
/** Seconds from a cold start to the ending, for the reference player. */
export const ENDING_TARGET = 4 * 3600;
/** The reference player catches this share of tips. 1 is attentive; 0 is idle. */
export const REFERENCE_CATCH = 1;
/**
 * Median ending with tips drawn, over the ending with each tip booked at its
 * expected value. A drawn bull market is convex: ×7 one tip in three earns more
 * than ×3 every tip, because the desk buys at a cadence and the next windfall
 * reads the bank it leaves. The solve targets the expected arc at
 * ENDING_TARGET / DRAWN_PACE so the drawn median lands on the target.
 */
export const DRAWN_PACE = 0.956; // 24 seeds (balance/tip-probe.ts § 1)

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
// Chains: the referral network and the deal (every deal, by hand or by phone), the
// hand alone, each subsidiary's rate, and operations (every subsidiary and phone).

/** Owned counts at which a subsidiary's management memos appear. */
export const UPGRADE_AT = [10, 40, 80, 120, 160, 200] as const;
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

/** Owned counts that earn a market-leader certificate; each doubles that subsidiary. */
export const MILESTONE_AT = [25, 50, 100, 150, 200] as const;
export const MILESTONE_MULT = 2;

/** Credit grades, earned on lifetime revenue (a statistics record, never the current rate). */
export const GRADES = [
  'B',
  'BB',
  'BBB',
  'A',
  'AA',
  'AAA',
  'Blue chip',
  'Gilt-edged',
  'Gold standard',
  'Bedrock',
] as const;
/** Grade k lands when lifetime revenue reaches the opener price of tier k + GRADE_TIER_OFFSET. */
export const GRADE_TIER_OFFSET = 2;
/** Each grade multiplies every subsidiary and phone: the operations chain. */
export const GRADE_MULT = 1.2;

// ── Synergies ──
// A pair of holdings, cheaper first, coupled by a memo once both are owned past a
// count. The cheaper earns SYNERGY_CHEAP more per unit of the dearer; the dearer
// SYNERGY_DEAR more per unit of the cheaper (Cookie Clicker `Game.SynergyUpgrade`,
// unlocked by count alone here, never by prestige). Each holding sits in two pairs.

export const SYNERGY_PAIRS = [
  [0, 3],
  [1, 4],
  [2, 5],
  [3, 6],
  [4, 7],
  [0, 5],
  [1, 6],
  [2, 7],
] as const;
/** Both holdings owned at least this many reveal the pair's next synergy memo. */
export const SYNERGY_AT = [15, 75, 150] as const;
export const SYNERGY_CHEAP = 0.05;
export const SYNERGY_DEAR = 0.001;

// ── Phones (the sales desk's ladder) ──
// The sales desk comes with DESK_PHONES phones, so it deals at the hand's pace;
// each phone bought adds a deal a second. A phone earns what a deal pays, through
// operations, and is bought on payback with the subsidiaries.

export const DESK_PHONES = ACTIVE_DEAL_RATE;
export const PHONE_COST_RATIO = 1.15;

// ── The referral network ──
// Every deal pays REFERRAL_STEP[0] more per subsidiary owned, and each later
// network multiplies that by its step (Cookie Clicker's Thousand fingers family).

/** Phones owned that reveal each network. */
export const REFERRAL_AT = [25, 50, 100, 150, 200] as const;
export const REFERRAL_STEP = [0.1, 5, 10, 20, 20] as const;
/** The first network costs the opener of this tier; each later one the next tier's. */
export const REFERRAL_PRICE_TIER = 5;

// ── Achievements and standing ──
// Every achievement counts toward standing, STANDING_DIVISOR to a point. Each
// standing upgrade, bought once its standing is reached, multiplies operations by
// (1 + standing · STANDING_K): standing earned after the purchase keeps raising it
// (Cookie Clicker's milk and kittens).

export const STANDING_DIVISOR = 25;
export const STANDING_AT = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5] as const;
export const STANDING_K = 0.1;
/** The first standing upgrade costs the opener of this tier; each later one the next tier's. */
export const STANDING_PRICE_TIER = 4;
/** Owned counts past the certificates that earn an achievement and nothing else. */
export const HAVE_AT = [125, 175] as const;
/** Lifetime revenue marks: 10^(REVENUE_FIRST + REVENUE_STEP·k). */
export const REVENUE_FIRST = 3;
export const REVENUE_STEP = 1.5;
export const REVENUE_MARKS = 14;
/** Income-per-second marks: 10^(INCOME_FIRST + k). */
export const INCOME_FIRST = 1;
export const INCOME_MARKS = 18;
export const PHONE_MARKS = [10, 25, 50, 100, 200] as const;
export const TIP_MARKS = [1, 7, 27, 77] as const;
export const HAND_DEAL_MARKS = [100, 1000] as const;

// ── Tips (windfalls) ──
// A tip on the wire comes in on a hazard ramp: past TIP_MIN each second rolls
// ((t − min)/(max − min))^TIP_POWER thirty times (Cookie Clicker rolls each frame
// at 30 fps), and the clock waits while a tip is up. A tip lasts TIP_LIFETIME
// seconds; caught, it draws one effect, an even pick over three, with the last
// effect struck four times in five. No desk catches tips.

export const TIP_MIN = 300;
export const TIP_MAX = 900;
export const TIP_POWER = 5;
export const TIP_ROLLS_PER_SECOND = 30;
export const TIP_LIFETIME = 13;
export const TIP_REPEAT_STRIKE = 0.8;
/** Bull market: operations ×BULL_MULT for BULL_SECONDS. */
export const BULL_MULT = 7;
export const BULL_SECONDS = 77;
/** Closing spree: deals by hand ×SPREE_MULT for SPREE_SECONDS. */
export const SPREE_MULT = 77;
export const SPREE_SECONDS = 13;
/** Windfall deal: the smaller of WINDFALL_BANK of cash on hand and WINDFALL_INCOME seconds of income. */
export const WINDFALL_BANK = 0.15;
export const WINDFALL_INCOME = 900;
/**
 * Tip upgrades, revealed at tips caught: the first two halve the interval and
 * double the lifetime, the third doubles every effect's length.
 */
export const TIP_UPGRADE_AT = [7, 27, 77] as const;

// ── Automation (dispatch) ──

/** Executive hires, in ladder order. Each costs the opener of `priceTier` and appears once `revealTier` is owned. */
export const HIRES = [
  { id: 'sales-desk', priceTier: 2, revealTier: 1 },
  { id: 'acquisitions-desk', priceTier: 3, revealTier: 2 },
  { id: 'board', priceTier: 5, revealTier: 4 },
] as const;
/** Seconds between the acquisitions desk's purchases. Sub-second so it keeps up with a hand. */
export const ACQUISITION_INTERVAL = 0.5;

// ── The ending ──
// The Consolidated Building is offered once the firm owns ENDING_AT of its top
// tier, priced at ENDING_SAVE seconds of the income the reference player has then.
// The reference player stops buying to save for it.

export const ENDING_AT = 150;
export const ENDING_SAVE = 900;

// ── The night bookkeeper (offline catch-up) ──
// Catch-up replays the time away through the live game loop: the desks work, the
// player does not. Tips go uncaught and press waits, so time away costs more arc
// than its length (`balance/offline-probe.ts` § 2). It is bought once. Until then a
// return replays nothing.
//
// The window answers two limits, and the smaller binds:
//   - game length: one return replays at most an hour of a four-hour arc, so time
//     away never plays the arc for the player;
//   - processing speed: catch-up runs before the game screen appears, so the
//     window times the replay cost (`balance/offline-probe.ts` § 3) is the wait.

/** The bookkeeper costs the opener of `priceTier` and appears once `revealTier` is owned. */
export const BOOKKEEPER = { priceTier: 4, revealTier: 3 } as const;
/** Share of the arc one return may replay. */
export const OFFLINE_ARC_SHARE = 0.25;
/** Longest wait a return may hold the load, in seconds. */
export const OFFLINE_WAIT_BUDGET = 3;
/** Wall-clock seconds to replay one second away. */
export const OFFLINE_REPLAY_COST = 0.0013; // 1.33 ms mid-arc, every desk working (balance/offline-probe.ts § 3)
/** Longest time away one return replays, in seconds; time past it is lost. */
export const OFFLINE_WINDOW_SECONDS = Math.min(
  OFFLINE_ARC_SHARE * ENDING_TARGET,
  OFFLINE_WAIT_BUDGET / OFFLINE_REPLAY_COST,
);

// ── Ladder generator ──

export interface Ladder {
  costStep: number;
  rateStep: number;
  /** a_i, for i past the top tier too: an opener price is the spine's price unit. */
  opener: (i: number) => number;
  /** a_i for the real tiers. */
  baseCost: number[];
  /** r_i */
  baseRate: number[];
}

/** Tier i costs a₀·S^i and earns r₀·(S/g)^i, so self-payback climbs ×g per tier. */
export function buildLadder(costStep: number): Ladder {
  const rateStep = costStep / PAYBACK_GROWTH;
  const opener = (i: number) => OPENER_COST * costStep ** i;
  const baseCost: number[] = [];
  const baseRate: number[] = [];
  for (let i = 0; i < TIER_COUNT; i++) {
    baseCost.push(opener(i));
    baseRate.push(OPENER_RATE * rateStep ** i);
  }
  return { costStep, rateStep, opener, baseCost, baseRate };
}

/** Cost of unit n (zero-based) of a tier: a·m^n. */
export function unitCost(a: number, n: number): number {
  return a * COST_RATIO ** n;
}

/** Memo price at reveal count N: ρ·(μ−1)·N·a·m^N. */
export function upgradeCost(a: number, n: number): number {
  return UPGRADE_PAYBACK_RATIO * (UPGRADE_MULT - 1) * n * unitCost(a, n);
}

/** Synergy memo price at reveal count N: ρ times the units' worth of rate it adds on each side. */
export function synergyCost(ladder: Ladder, cheap: number, dear: number, n: number): number {
  return (
    UPGRADE_PAYBACK_RATIO *
    n *
    (SYNERGY_CHEAP * n * unitCost(ladder.baseCost[cheap], n) +
      SYNERGY_DEAR * n * unitCost(ladder.baseCost[dear], n))
  );
}

/** Training k repays TRAINING_PAYBACK seconds of the active deal income it adds. */
export function trainingCost(k: number): number {
  const dealBefore = DEAL_YIELD * TRAINING_MULT ** k * ACTIVE_DEAL_RATE;
  return TRAINING_PAYBACK * (TRAINING_MULT - 1) * dealBefore;
}

export function gradeThreshold(ladder: Ladder, k: number): number {
  return ladder.opener(k + GRADE_TIER_OFFSET);
}

export function hireCost(ladder: Ladder, priceTier: number): number {
  return ladder.opener(priceTier);
}

/** Phone n (zero-based, bought phones only): the sales desk's price over its phones, ×PHONE_COST_RATIO each. */
export function phoneCost(ladder: Ladder, n: number): number {
  return (hireCost(ladder, HIRES[0].priceTier) / DESK_PHONES) * PHONE_COST_RATIO ** n;
}

/** Referral network k costs the opener of tier REFERRAL_PRICE_TIER + k. */
export function referralCost(ladder: Ladder, k: number): number {
  return ladder.opener(REFERRAL_PRICE_TIER + k);
}

/** Standing upgrade k costs the opener of tier STANDING_PRICE_TIER + k. */
export function standingCost(ladder: Ladder, k: number): number {
  return ladder.opener(STANDING_PRICE_TIER + k);
}

/** Tip upgrade k costs the opener of tier 2 + 2k. */
export function tipUpgradeCost(ladder: Ladder, k: number): number {
  return ladder.opener(2 + 2 * k);
}

/** The referral network's add per subsidiary, after the first `networks` are bought. */
export function referralPerSubsidiary(networks: number): number {
  let add = 0;
  for (let k = 0; k < networks; k++) add = k === 0 ? REFERRAL_STEP[0] : add * REFERRAL_STEP[k];
  return add;
}

/** Interval and lifetime scale after the first `upgrades` tip upgrades. */
export function tipScale(upgrades: number): {
  interval: number;
  lifetime: number;
  duration: number;
} {
  const halvings = Math.min(upgrades, 2);
  return {
    interval: 0.5 ** halvings,
    lifetime: 2 ** halvings,
    duration: upgrades >= 3 ? 2 : 1,
  };
}

/** Per-second spawn chance of a tip `t` seconds after the last one, at interval scale `scale`. */
export function tipChance(t: number, scale: number): number {
  const lo = TIP_MIN * scale;
  const hi = TIP_MAX * scale;
  if (t <= lo) return 0;
  const frame = Math.min(1, ((t - lo) / (hi - lo)) ** TIP_POWER);
  return 1 - (1 - frame) ** TIP_ROLLS_PER_SECOND;
}

/** Mean seconds between tips on the hazard ramp, plus how long a tip stays up before it is caught or gone. */
export function meanTipInterval(scale: number, upSeconds: number): number {
  let survive = 1;
  let mean = 0;
  for (let t = 1; t <= TIP_MAX * scale; t++) {
    const h = tipChance(t, scale);
    mean += survive * h * t;
    survive *= 1 - h;
  }
  return mean + upSeconds;
}

// ── Runnable spine: the reference arc ──

const TIP_EFFECTS_DRAW = ['bull', 'spree', 'windfall'] as const;

export interface ProjectedBeat {
  label: string;
  t: number;
}

export interface Projection {
  beats: ProjectedBeat[];
  /** Seconds to the first unit of each tier; Infinity if never inside the horizon. */
  tierOpen: number[];
  /** When the Consolidated Building is offered, and when it is bought. */
  endingOffered: number;
  endingBought: number;
  /** Its price: ENDING_SAVE seconds of income at the offer. */
  endingCost: number;
  finalRate: number;
  counts: number[];
  phones: number;
  achievements: number;
  tipsCaught: number;
}

/**
 * Evaluate the reference player over the closed-form ladder, one-second steps.
 * Each second: earn, book any tip due at its expected value, mark achievements,
 * take every affordable memo, hire and upgrade, then spend on units and phones by
 * lowest marginal payback among the affordable, at the acquisitions desk's cadence
 * once it is hired. Once the board sits, only cash
 * above the cheapest open memo's price is spent; once the ending is offered,
 * nothing is, until it is bought. The hand deals at ACTIVE_DEAL_RATE until the
 * sales desk takes over at the same rate.
 *
 * @param ladder the ladder to project
 * @param horizon seconds to run
 * @param catchRate share of tips the reference catches
 * @param endingCost a fixed ending price; unset, it is priced at the offer
 * @param rng draw tips by the hazard ramp and their effects from this stream,
 *   instead of booking each at its expected value; the arc's spread over seeds
 */
export function projectArc(
  ladder: Ladder,
  horizon: number,
  catchRate = REFERENCE_CATCH,
  endingCost?: number,
  rng?: () => number,
): Projection {
  const counts = new Array<number>(TIER_COUNT).fill(0);
  const tierMult = new Array<number>(TIER_COUNT).fill(1);
  const tierOpen = new Array<number>(TIER_COUNT).fill(Infinity);
  const taken = new Set<string>();
  const beats: ProjectedBeat[] = [];
  let cash = 0;
  let lifetime = 0;
  let training = 0;
  let grades = 0;
  let phonesBought = 0;
  let deskPhones = 0;
  let networks = 0;
  let achievements = 0;
  let standingBought = 0;
  let tipsCaught = 0;
  let tipUpgrades = 0;
  let handDeals = 0;
  let revenueMarks = 0;
  let incomeMarks = 0;
  let endingOffered = Infinity;
  let endingBought = Infinity;
  let price = endingCost ?? Infinity;

  const subs = () => counts.reduce((s, n) => s + n, 0);
  const phones = () => deskPhones + phonesBought;
  const standing = () => achievements / STANDING_DIVISOR;
  // A bull market in force: the multiplier and the seconds it has left.
  let bullMult = 1;
  let bullLeft = 0;
  const ops = () => {
    let f = GRADE_MULT ** grades * bullMult;
    for (let k = 0; k < standingBought; k++) f *= 1 + standing() * STANDING_K;
    return f;
  };
  // Synergy memos bought per pair, and each tier's synergy factor, kept current
  // as counts and memos change: the greedy reads them inside its inner loop.
  const pairMemos = new Array<number>(SYNERGY_PAIRS.length).fill(0);
  const synergyFactor = new Array<number>(TIER_COUNT).fill(1);
  const refreshSynergy = () => {
    synergyFactor.fill(1);
    SYNERGY_PAIRS.forEach(([c, d], p) => {
      for (let v = 0; v < pairMemos[p]; v++) {
        synergyFactor[c] *= 1 + SYNERGY_CHEAP * counts[d];
        synergyFactor[d] *= 1 + SYNERGY_DEAR * counts[c];
      }
    });
  };
  const synergy = (i: number) => synergyFactor[i];
  const deal = () =>
    (DEAL_YIELD + referralPerSubsidiary(networks) * subs()) * TRAINING_MULT ** training;
  const tierRate = (i: number) => ladder.baseRate[i] * tierMult[i] * synergy(i) * ops();
  const phoneRate = () => deal() * ops();
  const passive = () => counts.reduce((s, n, i) => s + n * tierRate(i), 0) + phones() * phoneRate();
  const memoCost = (i: number, n: number) => upgradeCost(ladder.baseCost[i], n);
  const achieve = (t: number, label: string) => {
    achievements++;
    beats.push({ label: `achievement ${label}`, t });
  };

  const memoIds = counts.map((_, i) => UPGRADE_AT.map((n) => `memo t${i}@${n}`));
  const synergyIds = SYNERGY_PAIRS.map(([c, d]) => SYNERGY_AT.map((n) => `syn ${c}-${d}@${n}`));
  // A caught tip is caught at once; a missed one holds the clock its whole lifetime.
  const upSeconds = (lifetimeScale: number) => (1 - catchRate) * TIP_LIFETIME * lifetimeScale;
  let scale = tipScale(0);
  let interval = meanTipInterval(scale.interval, upSeconds(scale.lifetime));
  let nextTip = interval;
  let sinceTip = 0;
  let lastEffect: (typeof TIP_EFFECTS_DRAW)[number] | '' = '';

  for (let t = 1; t <= horizon; t++) {
    const handRate = deskPhones > 0 ? 0 : ACTIVE_DEAL_RATE;
    handDeals += handRate;
    const income = handRate * deal() + passive();
    cash += income;
    lifetime += income;

    // A tip, booked at its expected value (each effect a third of the draws), or
    // drawn when a stream is given.
    sinceTip++;
    const tipDue = rng ? rng() < tipChance(sinceTip, scale.interval) : t >= nextTip;
    if (tipDue) {
      nextTip += interval;
      sinceTip = 0;
      // A bull market is a multiplier in force for its length, not a lump: what it
      // earns feeds the bank the next windfall reads, and the desk buys through it.
      const spree = (SPREE_MULT - 1) * SPREE_SECONDS * scale.duration * ACTIVE_DEAL_RATE * deal();
      const windfall = Math.min(WINDFALL_BANK * cash, WINDFALL_INCOME * passive());
      let bull = 1 + (catchRate * (BULL_MULT - 1)) / 3;
      let gain = (catchRate * (spree + windfall)) / 3;
      let caught = catchRate;
      if (rng) {
        caught = rng() < catchRate ? 1 : 0;
        const pool = TIP_EFFECTS_DRAW.filter((e) => e !== lastEffect || rng() >= TIP_REPEAT_STRIKE);
        lastEffect = pool[Math.floor(rng() * pool.length)];
        bull = caught && lastEffect === 'bull' ? BULL_MULT : 1;
        gain = caught * (lastEffect === 'spree' ? spree : lastEffect === 'windfall' ? windfall : 0);
      }
      if (bull > 1) {
        bullMult = bull;
        bullLeft = BULL_SECONDS * scale.duration;
      }
      cash += gain;
      lifetime += gain;
      tipsCaught += caught;
      beats.push({ label: 'tip', t });
    }
    if (bullLeft > 0 && --bullLeft <= 0) bullMult = 1;

    // Achievements.
    while (grades < GRADES.length && lifetime >= gradeThreshold(ladder, grades)) {
      grades++;
      achieve(t, `grade ${GRADES[grades - 1]}`);
    }
    while (
      revenueMarks < REVENUE_MARKS &&
      lifetime >= 10 ** (REVENUE_FIRST + REVENUE_STEP * revenueMarks)
    ) {
      revenueMarks++;
      achieve(t, `revenue ${revenueMarks}`);
    }
    while (incomeMarks < INCOME_MARKS && passive() >= 10 ** (INCOME_FIRST + incomeMarks)) {
      incomeMarks++;
      achieve(t, `income ${incomeMarks}`);
    }
    const once = (id: string, reached: boolean) => {
      if (reached && !taken.has(id)) {
        taken.add(id);
        achieve(t, id);
      }
    };
    for (const n of PHONE_MARKS) once(`phones ${n}`, phones() >= n);
    for (const n of TIP_MARKS) once(`tips ${n}`, tipsCaught >= n);
    for (const n of HAND_DEAL_MARKS) once(`deals ${n}`, handDeals >= n);

    // One-shots, taken on sight.
    const take = (id: string, cost: number, apply: () => void) => {
      if (taken.has(id) || cash < cost) return;
      cash -= cost;
      taken.add(id);
      apply();
      beats.push({ label: id, t });
    };
    if (endingOffered === Infinity) {
      for (let k = training; k < TRAINING_COUNT && counts[k] > 0; k++) {
        take(`training ${k + 1}`, trainingCost(k), () => training++);
      }
      for (let i = 0; i < TIER_COUNT; i++) {
        UPGRADE_AT.forEach((n, k) => {
          if (counts[i] >= n)
            take(memoIds[i][k], memoCost(i, n), () => (tierMult[i] *= UPGRADE_MULT));
        });
      }
      SYNERGY_PAIRS.forEach(([c, d], p) => {
        SYNERGY_AT.forEach((n, k) => {
          if (counts[c] >= n && counts[d] >= n) {
            take(synergyIds[p][k], synergyCost(ladder, c, d, n), () => {
              pairMemos[p]++;
              refreshSynergy();
            });
          }
        });
      });
      for (const h of HIRES) {
        if (counts[h.revealTier] >= 1) {
          take(`hire ${h.id}`, hireCost(ladder, h.priceTier), () => {
            if (h.id === 'sales-desk') deskPhones = DESK_PHONES;
          });
        }
      }
      if (networks < REFERRAL_AT.length && phones() >= REFERRAL_AT[networks]) {
        take(`referral ${networks + 1}`, referralCost(ladder, networks), () => networks++);
      }
      if (standingBought < STANDING_AT.length && standing() >= STANDING_AT[standingBought]) {
        take(
          `standing ${standingBought + 1}`,
          standingCost(ladder, standingBought),
          () => standingBought++,
        );
      }
      if (tipUpgrades < TIP_UPGRADE_AT.length && tipsCaught >= TIP_UPGRADE_AT[tipUpgrades]) {
        take(`tip upgrade ${tipUpgrades + 1}`, tipUpgradeCost(ladder, tipUpgrades), () => {
          tipUpgrades++;
          scale = tipScale(tipUpgrades);
          interval = meanTipInterval(scale.interval, upSeconds(scale.lifetime));
        });
      }
    }

    // The ending: offered at ENDING_AT of the top tier; the reference saves for it.
    if (endingOffered === Infinity && counts[TIER_COUNT - 1] >= ENDING_AT) {
      endingOffered = t;
      if (endingCost === undefined) price = ENDING_SAVE * passive();
      beats.push({ label: 'ending offered', t });
    }
    if (endingOffered < Infinity) {
      if (endingBought === Infinity && cash >= price) {
        cash -= price;
        endingBought = t;
        beats.push({ label: 'the Consolidated Building', t });
        break;
      }
      continue;
    }

    // Once the board sits, the desk holds back the price of the cheapest open memo:
    // a subsidiary memo, a synergy or the next referral network.
    let reserve = 0;
    if (taken.has('hire board')) {
      reserve = Infinity;
      for (let i = 0; i < TIER_COUNT; i++) {
        UPGRADE_AT.forEach((n, k) => {
          if (counts[i] >= n && !taken.has(memoIds[i][k]))
            reserve = Math.min(reserve, memoCost(i, n));
        });
      }
      SYNERGY_PAIRS.forEach(([c, d], p) => {
        SYNERGY_AT.forEach((n, k) => {
          if (counts[c] >= n && counts[d] >= n && !taken.has(synergyIds[p][k])) {
            reserve = Math.min(reserve, synergyCost(ladder, c, d, n));
          }
        });
      });
      if (networks < REFERRAL_AT.length && phones() >= REFERRAL_AT[networks]) {
        reserve = Math.min(reserve, referralCost(ladder, networks));
      }
      if (reserve === Infinity) reserve = 0;
    }

    // Units and phones: payback-greedy over the affordable. The hand buys all it can;
    // the acquisitions desk buys one each ACQUISITION_INTERVAL, so cash it cannot
    // spend yet waits for a dearer unit with a better payback.
    let budget = taken.has('hire acquisitions-desk') ? 1 / ACQUISITION_INTERVAL : Infinity;
    while (budget-- > 0) {
      let best = -2;
      let bestPayback = Infinity;
      for (let i = 0; i < TIER_COUNT; i++) {
        if (i > 0 && counts[i - 1] < 1) break;
        const c = unitCost(ladder.baseCost[i], counts[i]);
        if (c > cash - reserve) continue;
        const payback = c / tierRate(i);
        if (payback < bestPayback) {
          bestPayback = payback;
          best = i;
        }
      }
      if (deskPhones > 0) {
        const c = phoneCost(ladder, phonesBought);
        if (c <= cash - reserve && c / phoneRate() < bestPayback) best = -1;
      }
      if (best === -2) break;
      if (best === -1) {
        cash -= phoneCost(ladder, phonesBought);
        phonesBought++;
        continue;
      }

      cash -= unitCost(ladder.baseCost[best], counts[best]);
      counts[best]++;
      refreshSynergy();
      if (counts[best] === 1) {
        tierOpen[best] = t;
        beats.push({ label: `open t${best}`, t });
        achieve(t, `first t${best}`);
      }
      for (const n of MILESTONE_AT) {
        if (counts[best] === n) {
          tierMult[best] *= MILESTONE_MULT;
          achieve(t, `certificate t${best}@${n}`);
        }
      }
      for (const n of HAVE_AT) if (counts[best] === n) achieve(t, `own t${best}@${n}`);
    }
  }
  return {
    beats,
    tierOpen,
    endingOffered,
    endingBought,
    endingCost: price,
    finalRate: passive(),
    counts,
    phones: phones(),
    achievements,
    tipsCaught,
  };
}

// ── The solve ──

/**
 * CLASS_COST_STEP is solved, not chosen: bisect the per-tier cost step until the
 * reference player, tips booked at their expected value, buys the ending at
 * ENDING_TARGET / DRAWN_PACE, so with tips drawn the median lands on the target.
 * Arc length is monotone in the step (a steeper ladder is a longer climb), so
 * bisection is sound.
 */
function solveCostStep(): number {
  const target = ENDING_TARGET / DRAWN_PACE;
  let lo = 3;
  let hi = 20;
  for (let iter = 0; iter < 18; iter++) {
    const mid = (lo + hi) / 2;
    const end = projectArc(buildLadder(mid), target * 1.5).endingBought;
    if (end > target) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

export const CLASS_COST_STEP = solveCostStep();
export const LADDER = buildLadder(CLASS_COST_STEP);
/** The ending's price: ENDING_SAVE seconds of the reference player's income at the offer. */
export const ENDING_COST = projectArc(LADDER, (ENDING_TARGET / DRAWN_PACE) * 1.5).endingCost;
