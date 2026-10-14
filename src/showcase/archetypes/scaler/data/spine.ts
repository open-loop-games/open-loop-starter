// ─── Skeleton ───
// The spine's home in `data/`. Every economy number in Paragon is derived here
// from the named anchors below, in plain arithmetic with no engine and no runtime
// state. `balance/arc-probe.ts` plays the shipping game and diffs it against
// `PREDICTION`.
//
// Bucket: exponential family. A tier's units cost c·mⁿ, and each prestige layer
// pays a root of what the layer below earned, so each layer compresses the one
// below it by a power. Each layer also opens a cascading chain (tier k makes
// tier k−1), whose output inside one reset is a polynomial in time.
//
// Where the closed form stops:
//   - the run itself. A run buys in ladder order: fill tier k from its first unit
//     to `hold`, save for tier k+1's first unit, repeat; past the top tier, keep
//     buying the top tier. Income is what the holdings make. The time to a total is
//     an exponential integral, integrated numerically. Hope multiplies the whole
//     run by g(t) = (1 + Hope(t))^p, which is time-separable: the run earns in t
//     real seconds what the plain run earns in τ = ∫₀ᵗ g. Real players interleave,
//     so the ladder is a bound on the shape, not the policy.
//   - when to prestige. The reference walk resets each layer at a share of what
//     that layer has earned; a policy, not an optimum.
//   - the thresholds. Once a layer is automated its timelines sit at the
//     automation's interval, and its time is a count of resets, not a rate. So
//     the first Rewrite's threshold, each Age's gate and each Elseworld tier's goal
//     are set on a schedule: what the reference has earned when the slot comes up.
//     The walk records them in one pass.

// ═══ Authored anchors and levers ═══
// The design decisions. Everything below the next banner is derived.

export const ANCHORS = {
  /** Opening balance of every run; also tier 1's base cost, so the first Patrol is bought at t=0. */
  startJustice: 10,
  /** base cost / base rate, every tier: no tier is a better deal per Justice than another. */
  paybackS: 10,
  /** Per-unit price growth. Doubles about every five buys — the pacing playbook's genre default. */
  priceRatio: 1.15,
  /**
   * Units of a tier the run holds when it opens the next one. Fitted, not chosen:
   * the Dispatch Desk holds 5 when the next tier opens, and 4 lands the ladder
   * model's openings within 4–18% of the engine's. The fractional hold absorbs
   * that the desk interleaves tiers where the ladder fills them in order.
   */
  // balance/arc-probe.ts § tier openings; the game has no RNG, so one run is the measurement
  hold: 4,
  /** Seconds between successive tier openings in a fresh run with no multipliers. */
  tierGapS: 30,
  tierCount: 6,
  /** The first Reboot opens this many seconds into a fresh save. */
  firstRebootS: 240,
  /** Legacy = ⌊∛(run justice / threshold)⌋ — the cube root, Cookie Clicker's convention. */
  payoutDegree: 3,
  /** Reference policy: reboot once pending Legacy reaches this fraction of Legacy earned. */
  rebootFraction: 0.5,
  /** Continuity = ⌊√(legacy earned / threshold)⌋. */
  continuityDegree: 2,
  /** Reference policy: rewrite once pending Continuity reaches this fraction of Continuity earned this Age. */
  rewriteFraction: 0.5,
  /** The first Rewrite's slot. Earlier than this, Act I ends without a wall of long timelines. */
  firstRewriteS: 1500,
  /** Each Age's slot: Silver, Bronze, Dark, Modern. The Modern Age is the arc's end beat. */
  ageSlotsS: [6300, 9000, 11700, 14400],
  /** An Elseworld tier's goal is what its restricted run earns in this many seconds when its slot comes up. */
  elseworldS: 120,
  /** The first Elseworld slot, and the gap between slots. */
  elseworldFirstS: 900,
  elseworldGapS: 555,
  /** Where the reference walk stops: past the Modern Age, so its gate is recorded. */
  walkS: 15000,
} as const;

/**
 * Content magnitudes — what each upgrade, reward and restriction is worth.
 * Chosen by feel, not derived; they sit here because the walk below has to
 * include every term that multiplies the curve it solves.
 */
export const LEVERS = {
  publicTrustMult: 3,
  trainingMult: 2,
  /** Hero Training costs `trainingBase * trainingRatio^level` Legacy; ×4 keeps its output near √Legacy. */
  trainingBase: 3,
  trainingRatio: 4,
  pressOfficeMult: 2,
  /** Legends: ×legendMult per lifetime-justice decade-triple (1e3, 1e6, …). */
  legendMult: 1.1,
  legendDecades: [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45],
  /** The Legacy multiplier bends to √ past its knee; Secret Identity's reward moves the knee. */
  softcapPower: 0.5,
  /**
   * Continuity earned this Age multiplies output by (1 + C)^power. Held low on
   * purpose: with Mythic Standing, the Reboots a Rewrite cycle needs scale as
   * C^(1 − power/3 − m), and near zero that exponent makes cycles constant and
   * Continuity exponential in time.
   */
  continuityPower: 0.3,
  /** Mythic Standing: Legacy gain ×mythicMult per level, costing mythicBase·mythicRatio^level Continuity. */
  mythicMult: 2,
  mythicBase: 2,
  mythicRatio: 9,
  /** The Succession Plan reboots at most once per interval; each drill cuts it, down to the floor. */
  successionIntervalS: 30,
  drillCut: 0.67,
  drillFloorS: 10,
  drillBase: 3,
  drillRatio: 10,
  /** Canon per Age = ⌊canonScale · (Continuity earned / first gate)^(1/canonDegree)⌋. */
  canonScale: 10,
  canonDegree: 4,
  /** Canon ever earned multiplies output by (1 + K)^canonPower and Continuity gain by (1 + K)^canonGainPower. */
  canonPower: 0.5,
  canonGainPower: 0.5,
} as const;

/**
 * A cascading chain of three tiers: tier 1 makes the chain's currency, tier 2
 * makes tier-1 units, tier 3 makes tier-2 units. Prices double per unit, so whole
 * bases keep every price whole and no shop leaves a layer's currency fractional. `rate[0]` is currency per
 * tier-1 unit per second; `rate[1]` tier-1 units per tier-2 unit; `rate[2]`
 * tier-2 units per tier-3 unit. The currency's effect is (1 + amount)^power.
 */
export interface ChainSpec {
  base: readonly [number, number, number];
  ratio: readonly [number, number, number];
  rate: readonly [number, number, number];
  power: number;
}

/** The Network, bought with Legacy: Hope multiplies every hero. */
export const NETWORK: ChainSpec = {
  base: [3, 30, 300],
  ratio: [2, 2, 2],
  rate: [1, 0.05, 0.01],
  power: 0.5,
};
/** Parallel Earths, bought with Continuity: Echoes multiply Legacy gain and how fast the Network makes Hope. */
export const EARTHS: ChainSpec = {
  base: [1, 4, 16],
  ratio: [2, 2, 2],
  rate: [0.1, 0.01, 0.002],
  power: 0.5,
};
/** Imprints, bought with Canon: Myth multiplies Continuity gain and how fast the Earths make Echoes. */
export const IMPRINTS: ChainSpec = {
  base: [5, 25, 125],
  ratio: [2, 2, 2],
  rate: [0.02, 0.002, 0.0003],
  power: 0.5,
};

/** Legacy upgrades by id, with their one-shot prices — the reference walk buys them in this order. */
export const LEGACY_PRICES = {
  dispatch: 1,
  'public-trust': 2,
  'elseworld-protocols': 4,
  'press-office': 8,
} as const;

/** Continuity upgrades and their one-shot prices, in buying order. An Age keeps all four. */
export const CONTINUITY_PRICES = {
  succession: 1,
  'eternal-dispatch': 1,
  liaison: 2,
  archives: 3,
} as const;

/** Canon upgrades and their one-shot prices, in buying order. Nothing resets Canon. */
export const CANON_PRICES = {
  crossover: 5,
  monitor: 5,
  'canon-elseworlds': 10,
} as const;

// ── Elseworlds ──

export const ELSEWORLD_IDS = [
  'no-powers',
  'secret-identity',
  'villain-uprising',
  'dark-days',
  'lost-earth',
] as const;
export type ElseworldId = (typeof ELSEWORLD_IDS)[number];

/** Completions each Elseworld allows. */
export const ELSEWORLD_TIERS = 5;

/** No Powers silences this tier and every one above it. */
export const HIGH_TIER_FROM = 4;

/** Rules and rewards. A reward reads the Elseworld's completion count `c` (≥ 1 once resolved). */
export const ELSEWORLD_LEVERS = {
  /** No Powers: street tiers ×4, doubling per further completion. */
  noPowersStreet: (c: number) => (c === 0 ? 1 : 4 * 2 ** (c - 1)),
  /** Secret Identity: Legacy gain ×2 and the softcap knee ×3, per completion. */
  secretIdentityGain: (c: number) => 2 ** c,
  secretIdentityKnee: (c: number) => 3 ** c,
  /** Villain Uprising: the rule adds to the price ratio; each completion takes some away. */
  villainUprisingAdd: 0.1,
  villainUprisingRelief: (c: number) => 0.015 * c,
  /** Dark Days: the rule stops Hope; each completion makes Hope ×3 faster. */
  darkDaysHope: (c: number) => 3 ** c,
  /** Lost Earth: the rule stops Echoes; each completion makes Echoes ×3 faster. */
  lostEarthEcho: (c: number) => 3 ** c,
  /** Each tier of an Elseworld asks at least this many times the tier before. */
  tierEscalation: 10,
} as const;

/**
 * The order Elseworld tiers come up in. Slot i opens at elseworldFirstS + i·elseworldGapS;
 * Dark Days needs a Rewrite and Lost Earth an Age, so they enter late.
 */
export const ELSEWORLD_SCHEDULE: readonly ElseworldId[] = (() => {
  const [np, si, vu, dd, le] = ELSEWORLD_IDS;
  return [
    np,
    si,
    vu,
    dd,
    np,
    si,
    vu,
    dd,
    np,
    si,
    vu,
    dd,
    le,
    np,
    si,
    le,
    vu,
    dd,
    le,
    np,
    si,
    le,
    vu,
    dd,
    le,
  ];
})();

// ═══ Derived: the tier ladder ═══

/** Justice spent filling one tier from its first unit to `hold` units, in units of its base cost. */
export function fillFactor(ratio: number = ANCHORS.priceRatio): number {
  return (ratio ** ANCHORS.hold - 1) / (ratio - 1);
}

/** What a run is allowed to use, for restricted (Elseworld) predictions. */
export interface RunShape {
  /** Highest tier that produces. */
  tiers?: number;
  /** Per-unit price growth in force; tier spend is held at the base ratio's fill budget. */
  ratio?: number;
  /** Extra multiplier on the street tiers (below `HIGH_TIER_FROM`) — No Powers's reward. */
  street?: number;
}

/**
 * Units a run holds per tier under `shape`. A steeper price ratio buys fewer
 * units for the same spend: the fill budget at the base ratio, re-spent at
 * the shape's ratio.
 */
export function holdFor(shape: RunShape = {}): number {
  const ratio = shape.ratio ?? ANCHORS.priceRatio;
  return Math.log(1 + fillFactor() * (ratio - 1)) / Math.log(ratio);
}

/** Simpson's rule — the one numeric tool the spine uses. */
function integrate(f: (x: number) => number, a: number, b: number, steps = 200): number {
  if (b <= a) return 0;
  const h = (b - a) / steps;
  let sum = f(a) + f(b);
  for (let i = 1; i < steps; i++) sum += f(a + i * h) * (i % 2 ? 4 : 2);
  return (sum * h) / 3;
}

/**
 * One stretch of a run. While a tier fills, every Justice buys it, so its count
 * n obeys dn/dt = income(n) / (c·mⁿ): the time to reach n is ∫ c·mˣ / income(x) dx,
 * an exponential integral with no elementary form, so it is integrated
 * numerically. Justice spent to reach n is the geometric sum c·(mⁿ − m^n₀)/(m − 1),
 * which inverts exactly.
 */
interface Phase {
  kind: 'fill' | 'save';
  tier: number;
  /** Justice earned (and spent) across the phase; Infinity for the open-ended top tier. */
  earned: number;
  /** fill: base cost, ratio, frozen lower-tier income, per-unit rate, starting count. */
  cost: number;
  ratio: number;
  low: number;
  rate: number;
  from: number;
  /** save: the flat income. */
  income: number;
}

function phaseSecondsTo(ph: Phase, earned: number, steps: number): number {
  if (ph.kind === 'save') return earned / ph.income;
  const { cost, ratio, low, rate, from } = ph;
  const n = Math.log(ratio ** from + (earned * (ratio - 1)) / cost) / Math.log(ratio);
  return integrate((x) => (cost * ratio ** x) / (low + rate * x), from, n, steps);
}

function ladder(mu: number, shape: RunShape, step: number): Phase[] {
  const top = shape.tiers ?? ANCHORS.tierCount;
  const ratio = shape.ratio ?? ANCHORS.priceRatio;
  const hold = holdFor(shape);
  const cost = (k: number) => ANCHORS.startJustice * step ** (k - 1);
  const band = (k: number) => (k < HIGH_TIER_FROM ? (shape.street ?? 1) : 1);
  const rate = (k: number) => (mu * band(k) * cost(k)) / ANCHORS.paybackS;
  const phases: Phase[] = [];
  let low = 0;
  for (let k = 1; k <= top; k++) {
    const isTop = k === top;
    const end = isTop ? Infinity : hold;
    const earned = isTop ? Infinity : (cost(k) * (ratio ** end - ratio)) / (ratio - 1);
    phases.push({
      kind: 'fill',
      tier: k,
      earned,
      cost: cost(k),
      ratio,
      low,
      rate: rate(k),
      from: 1,
      income: 0,
    });
    if (isTop) break;
    low += rate(k) * hold;
    phases.push({
      kind: 'save',
      tier: k,
      earned: cost(k + 1),
      cost: 0,
      ratio,
      low,
      rate: 0,
      from: 0,
      income: low,
    });
  }
  return phases;
}

function secondsToEarnAt(
  justice: number,
  mu: number,
  shape: RunShape,
  step: number,
  steps = 200,
): number {
  let clock = 0;
  let earned = 0;
  for (const ph of ladder(mu, shape, step)) {
    if (justice <= earned + ph.earned) return clock + phaseSecondsTo(ph, justice - earned, steps);
    clock += phaseSecondsTo(ph, ph.earned, steps);
    earned += ph.earned;
  }
  return clock;
}

function tierOpensAtStep(k: number, mu: number, shape: RunShape, step: number): number {
  let clock = 0;
  for (const ph of ladder(mu, shape, step)) {
    if (ph.kind === 'fill' && ph.tier === k) return clock;
    clock += phaseSecondsTo(ph, ph.earned, 200);
  }
  return clock;
}

/**
 * Base-cost ratio between successive tiers, solved so the top tier opens at
 * `(tierCount − 1) · tierGapS` in a fresh run with no multipliers.
 */
export const TIER_COST_STEP = (() => {
  const target = (ANCHORS.tierCount - 1) * ANCHORS.tierGapS;
  let lo = 1.5;
  let hi = 200;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (tierOpensAtStep(ANCHORS.tierCount, 1, {}, mid) > target) hi = mid;
    else lo = mid;
  }
  return lo;
})();

/** Base cost of tier k (1-based). */
export function tierCost(k: number): number {
  return ANCHORS.startJustice * TIER_COST_STEP ** (k - 1);
}

/** Base Justice/s of one unit of tier k — its cost over the uniform payback. */
export function tierRate(k: number): number {
  return tierCost(k) / ANCHORS.paybackS;
}

/** Seconds a fresh run takes to earn `justice` at output multiplier `mu`. */
export function secondsToEarn(justice: number, mu: number, shape: RunShape = {}): number {
  return secondsToEarnAt(justice, mu, shape, TIER_COST_STEP);
}

/** Seconds into a fresh run when tier k opens (its first unit is bought). */
export function tierOpensAt(k: number, mu = 1, shape: RunShape = {}): number {
  return tierOpensAtStep(k, mu, shape, TIER_COST_STEP);
}

/**
 * The inverse of an increasing function by regula falsi in log–log space, where
 * the ladder's time-to-earn is close to a power law: a few evaluations where
 * bisection takes forty.
 */
function invertIncreasing(f: (x: number) => number, target: number, guess: number): number {
  let a = Math.max(guess, 1e-300);
  let fa = f(a);
  let b = a;
  let fb = fa;
  if (fa < target) {
    while (fb < target) {
      a = b;
      fa = fb;
      b *= 16;
      fb = f(b);
    }
  } else {
    while (fa >= target && a > 1e-300) {
      b = a;
      fb = fa;
      a /= 16;
      fa = f(a);
    }
  }
  const lt = Math.log(target);
  let la = Math.log(a);
  let lb = Math.log(b);
  let ya = Math.log(Math.max(fa, 1e-300)) - lt;
  let yb = Math.log(fb) - lt;
  let side = 0;
  for (let i = 0; i < 60 && lb - la > 1e-9; i++) {
    const lc = ya === yb ? (la + lb) / 2 : (la * yb - lb * ya) / (yb - ya);
    const yc = Math.log(Math.max(f(Math.exp(lc)), 1e-300)) - lt;
    if (Math.abs(yc) < 1e-7) return Math.exp(lc);
    if (yc < 0) {
      la = lc;
      ya = yc;
      if (side === -1) yb /= 2;
      side = -1;
    } else {
      lb = lc;
      yb = yc;
      if (side === 1) ya /= 2;
      side = 1;
    }
  }
  return Math.exp((la + lb) / 2);
}

/** Justice a fresh run has earned after `t` seconds at multiplier `mu` (inverts {@link secondsToEarn}). */
export function earnedAt(t: number, mu: number, shape: RunShape = {}): number {
  return invertIncreasing((j) => secondsToEarn(j, mu, shape), t, ANCHORS.startJustice * mu * t);
}

// ═══ Derived: chains ═══

/** Price of the next unit of chain tier k (0-based) with `owned` already bought. */
export function chainPrice(chain: ChainSpec, k: number, owned: number): number {
  return chain.base[k] * chain.ratio[k] ** owned;
}

/**
 * Currency a chain has made `t` seconds after its generated counts last reset,
 * with `owned` units bought per tier and its currency output ×`speed`. Tier 3
 * makes r₂·n₃·t tier-2 units, tier 2 makes tier-1 units at r₁ per unit, and
 * tier 1 makes currency at r₀·speed per unit:
 *   amount(t) = r₀·speed·(n₁t + r₁n₂t²/2 + r₁r₂n₃t³/6).
 */
export function chainAmountAt(
  chain: ChainSpec,
  owned: readonly number[],
  t: number,
  speed = 1,
): number {
  const [r0, r1, r2] = chain.rate;
  return (
    r0 * speed * (owned[0] * t + (r1 * owned[1] * t * t) / 2 + (r1 * r2 * owned[2] * t ** 3) / 6)
  );
}

// ═══ Derived: the prestige stack ═══

/** Run justice that pays the first Legacy: what a fresh run earns by `firstRebootS`. */
export const REBOOT_THRESHOLD = earnedAt(ANCHORS.firstRebootS, 1);

/** Pending Legacy for a run that earned `justice`, at a Legacy-gain multiplier `gain`. */
export function legacyFor(justice: number, gain = 1): number {
  if (justice < REBOOT_THRESHOLD) return 0;
  return Math.floor(gain * (justice / REBOOT_THRESHOLD) ** (1 / ANCHORS.payoutDegree));
}

/** The Legacy multiplier on output: 1 + earned, bent to a fractional power past `knee`. */
export function legacyMultiplier(earned: number, knee: number): number {
  const bent = earned <= knee ? earned : knee + (earned - knee) ** LEVERS.softcapPower;
  return 1 + bent;
}

/** Legends earned by a lifetime justice total. */
export function legendsFor(lifetime: number): number {
  return LEVERS.legendDecades.filter((d) => lifetime >= 10 ** d).length;
}

/** The Succession Plan's interval after `drills` drills. */
export function successionInterval(drills: number): number {
  return Math.max(LEVERS.drillFloorS, LEVERS.successionIntervalS * LEVERS.drillCut ** drills);
}

/** Drills that still cut the interval: beyond these the floor holds. */
export const DRILL_LIMIT = Math.ceil(
  Math.log(LEVERS.drillFloorS / LEVERS.successionIntervalS) / Math.log(LEVERS.drillCut),
);

// ═══ The reference walk ═══
// The reference player:
//   - reboots once pending Legacy reaches `rebootFraction` of Legacy earned; once
//     the Succession Plan is bought, no sooner than its interval, so a timeline
//     shorter than the interval earns on until the interval is up;
//   - buys each shop's one-shots in price order, then the cheapest of everything
//     levelled (Hero Training and the Network; Mythic Standing, drills and the
//     Earths; the Imprints);
//   - rewrites once pending Continuity reaches `rewriteFraction` of Continuity
//     earned this Age;
//   - turns the Age the moment its gate is met;
//   - takes the next scheduled Elseworld tier at the start of a timeline once its
//     slot has come, if the tier is open (cap) and the Elseworld is available, and
//     once the goal it would size is at least `tierEscalation` times the tier
//     before; a slot that comes up just after an Age waits for a stronger timeline.
// Every term that multiplies the curve is inside the walk. A timeline's Hope is
// read at its start (owned units, Echo speed), Legacy gain and Continuity gain at
// the reset. An Elseworld run is timed under its rule up to the goal, then under
// the normal rules from there.

/** One Reboot of the reference walk. */
export interface WalkStep {
  reboot: number;
  at: number;
  runSeconds: number;
  /** Rewrites and Ages before this Reboot. */
  rewrites: number;
  ages: number;
  legacyEarned: number;
  outputMult: number;
  elseworld?: { id: ElseworldId; tier: number };
}

export interface WalkRewrite {
  rewrite: number;
  at: number;
  cycleSeconds: number;
  gain: number;
  /** Continuity earned this Age after it. */
  earned: number;
}

export interface WalkAge {
  age: number;
  at: number;
  ageSeconds: number;
  canon: number;
}

export interface ElseworldSlot {
  id: ElseworldId;
  tier: number;
  /** When the reference entered it. */
  at: number;
  goal: number;
  /** The output multiplier the goal is sized at; weaker than this, the goal takes longer than `elseworldS`. */
  mu: number;
}

export interface Walk {
  steps: WalkStep[];
  rewrites: WalkRewrite[];
  ages: WalkAge[];
  slots: ElseworldSlot[];
  /** Legacy earned at the first Reboot past `firstRewriteS`. */
  rewriteThreshold: number;
  /** Continuity earned this Age at the first Rewrite past each Age's slot. */
  ageGates: number[];
}

function cheapest(options: [string, number][]): [string, number] {
  return options.reduce((best, o) => (o[1] < best[1] ? o : best));
}

/** Hope-weighted seconds in `t` real seconds of a timeline. */
function weighted(t: number, hope: (t: number) => number): number {
  return integrate((x) => (1 + hope(x)) ** NETWORK.power, 0, t, 16);
}

/** Real seconds whose Hope-weighted time is `tau`. */
function realSeconds(tau: number, hope: (t: number) => number): number {
  if (hope(tau) === 0) return tau;
  let lo = 0;
  let hi = tau;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (weighted(mid, hope) >= tau) hi = mid;
    else lo = mid;
  }
  return hi;
}

/** Simpson steps for the walk's run timing; the ladder is smooth enough that this holds 0.1%. */
const WALK_STEPS = 32;

export function walkArc(untilS: number = ANCHORS.walkS): Walk {
  const time = (justice: number, mu: number, shape: RunShape) =>
    secondsToEarnAt(justice, mu, shape, TIER_COST_STEP, WALK_STEPS);
  const earned = (tau: number, mu: number, shape: RunShape, guess: number) =>
    invertIncreasing((j) => time(j, mu, shape), tau, guess);

  let clock = 0;
  // the Legacy layer
  let legEarned = 0;
  let legHeld = 0;
  const legOwned = new Set<string>();
  let training = 0;
  const network = [0, 0, 0];
  // the Continuity layer
  let contEarned = 0;
  let contHeld = 0;
  const contOwned = new Set<string>();
  let mythic = 0;
  let drills = 0;
  const earths = [0, 0, 0];
  let cycleStart = 0;
  // the Canon layer
  let canonEver = 0;
  let canonHeld = 0;
  const canonOwned = new Set<string>();
  const imprints = [0, 0, 0];
  let ageStart = 0;
  // Elseworlds and records
  const done: Record<ElseworldId, number> = {
    'no-powers': 0,
    'secret-identity': 0,
    'villain-uprising': 0,
    'dark-days': 0,
    'lost-earth': 0,
  };
  let lifetime: number = ANCHORS.startJustice;
  let rewriteThreshold = Infinity;
  const ageGates: number[] = [];
  const steps: WalkStep[] = [];
  const rewrites: WalkRewrite[] = [];
  const ages: WalkAge[] = [];
  const slots: ElseworldSlot[] = [];

  const knee = () =>
    rewriteThreshold * ELSEWORLD_LEVERS.secretIdentityKnee(done['secret-identity']);
  const myth = () => chainAmountAt(IMPRINTS, imprints, clock - ageStart);
  const echo = (lost = false) =>
    lost
      ? 0
      : chainAmountAt(
          EARTHS,
          earths,
          clock - cycleStart,
          ELSEWORLD_LEVERS.lostEarthEcho(done['lost-earth']) * (1 + myth()) ** IMPRINTS.power,
        );
  const outputWithoutLegacy = () =>
    (legOwned.has('public-trust') ? LEVERS.publicTrustMult : 1) *
    LEVERS.trainingMult ** training *
    LEVERS.legendMult ** legendsFor(lifetime) *
    (1 + contEarned) ** LEVERS.continuityPower *
    (1 + canonEver) ** LEVERS.canonPower;
  const output = () => outputWithoutLegacy() * legacyMultiplier(legEarned, knee());
  const legacyGain = (lost = false) =>
    (legOwned.has('press-office') ? LEVERS.pressOfficeMult : 1) *
    ELSEWORLD_LEVERS.secretIdentityGain(done['secret-identity']) *
    LEVERS.mythicMult ** mythic *
    (1 + echo(lost)) ** EARTHS.power;
  const continuityGain = () =>
    (1 + myth()) ** IMPRINTS.power * (1 + canonEver) ** LEVERS.canonGainPower;
  const shape = (rule?: ElseworldId): RunShape => ({
    ratio:
      ANCHORS.priceRatio -
      ELSEWORLD_LEVERS.villainUprisingRelief(done['villain-uprising']) +
      (rule === 'villain-uprising' ? ELSEWORLD_LEVERS.villainUprisingAdd : 0),
    street: ELSEWORLD_LEVERS.noPowersStreet(done['no-powers']),
    tiers: rule === 'no-powers' ? HIGH_TIER_FROM - 1 : undefined,
  });
  const hopeFor = (rule?: ElseworldId) => {
    if (rule === 'dark-days') return () => 0;
    const speed =
      ELSEWORLD_LEVERS.darkDaysHope(done['dark-days']) *
      (1 + echo(rule === 'lost-earth')) ** EARTHS.power;
    const owned = [...network];
    return (t: number) => chainAmountAt(NETWORK, owned, t, speed);
  };
  const muFor = (rule?: ElseworldId) =>
    rule === 'secret-identity' ? outputWithoutLegacy() : output();
  const cap = () =>
    !legOwned.has('elseworld-protocols')
      ? 0
      : canonOwned.has('canon-elseworlds')
        ? 5
        : contOwned.has('archives')
          ? 4
          : 2;
  const available = (id: ElseworldId) =>
    id === 'dark-days' ? rewrites.length > 0 : id === 'lost-earth' ? ages.length > 0 : true;

  function spend() {
    for (const [id, price] of Object.entries(LEGACY_PRICES)) {
      if (!legOwned.has(id) && legHeld >= price) {
        legOwned.add(id);
        legHeld -= price;
      }
    }
    for (;;) {
      const [id, price] = cheapest([
        ['training', LEVERS.trainingBase * LEVERS.trainingRatio ** training],
        ...network.map((n, k): [string, number] => [`${k}`, chainPrice(NETWORK, k, n)]),
      ]);
      if (legHeld < price) break;
      legHeld -= price;
      if (id === 'training') training++;
      else network[Number(id)]++;
    }
    for (const [id, price] of Object.entries(CONTINUITY_PRICES)) {
      if (!contOwned.has(id) && contHeld >= price) {
        contOwned.add(id);
        contHeld -= price;
      }
    }
    for (;;) {
      const options: [string, number][] = [
        ['mythic', LEVERS.mythicBase * LEVERS.mythicRatio ** mythic],
        ...earths.map((n, k): [string, number] => [`${k}`, chainPrice(EARTHS, k, n)]),
      ];
      if (contOwned.has('succession') && drills < DRILL_LIMIT) {
        options.push(['drill', LEVERS.drillBase * LEVERS.drillRatio ** drills]);
      }
      const [id, price] = cheapest(options);
      if (contHeld < price) break;
      contHeld -= price;
      if (id === 'mythic') mythic++;
      else if (id === 'drill') drills++;
      else earths[Number(id)]++;
    }
    for (const [id, price] of Object.entries(CANON_PRICES)) {
      if (!canonOwned.has(id) && canonHeld >= price) {
        canonOwned.add(id);
        canonHeld -= price;
      }
    }
    for (;;) {
      const [id, price] = cheapest(
        imprints.map((n, k): [string, number] => [`${k}`, chainPrice(IMPRINTS, k, n)]),
      );
      if (canonHeld < price) break;
      canonHeld -= price;
      imprints[Number(id)]++;
    }
  }

  while (clock < untilS) {
    // The next scheduled Elseworld tier, once its slot has come.
    let rule: ElseworldId | undefined;
    let goal = 0;
    const next = ELSEWORLD_SCHEDULE[slots.length];
    const slotAt = ANCHORS.elseworldFirstS + slots.length * ANCHORS.elseworldGapS;
    if (next && legEarned > 0 && clock >= slotAt && available(next) && done[next] < cap()) {
      const budget = weighted(ANCHORS.elseworldS, hopeFor(next));
      const sized = earned(budget, muFor(next), shape(next), REBOOT_THRESHOLD);
      const before = slots.filter((s) => s.id === next).at(-1)?.goal ?? 0;
      if (sized >= before * ELSEWORLD_LEVERS.tierEscalation) {
        rule = next;
        goal = sized;
        slots.push({ id: next, tier: done[next] + 1, at: clock, goal, mu: output() });
      }
    }

    const mu = output();
    const hope = hopeFor();
    const gain = legacyGain();
    const need = Math.max(1, Math.ceil(ANCHORS.rebootFraction * legEarned));
    let target = Math.max(
      REBOOT_THRESHOLD * (need / gain) ** ANCHORS.payoutDegree,
      REBOOT_THRESHOLD,
    );
    let runSeconds = realSeconds(time(target, mu, shape()), hope);
    const interval = contOwned.has('succession') ? successionInterval(drills) : 0;
    if (runSeconds < interval && !rule) {
      // The plan waits out its interval, and the timeline earns on until then.
      target = earned(weighted(interval, hope), mu, shape(), target);
      runSeconds = interval;
    }
    if (rule) {
      const ruled = realSeconds(time(goal, muFor(rule), shape(rule)), hopeFor(rule));
      const normalToGoal = realSeconds(time(goal, mu, shape()), hope);
      runSeconds = Math.max(runSeconds, ruled + runSeconds - normalToGoal);
    }
    clock += runSeconds;
    lifetime += Math.max(target, goal);
    const legGain = legacyFor(target, gain);
    legEarned += legGain;
    legHeld += legGain;
    if (rule) done[rule]++;
    steps.push({
      reboot: steps.length + 1,
      at: clock,
      runSeconds,
      rewrites: rewrites.length,
      ages: ages.length,
      legacyEarned: legEarned,
      outputMult: mu,
      elseworld: rule ? { id: rule, tier: done[rule] } : undefined,
    });
    spend();

    if (!Number.isFinite(rewriteThreshold) && clock >= ANCHORS.firstRewriteS) {
      rewriteThreshold = legEarned;
    }
    const pendingC = Math.floor(
      continuityGain() * (legEarned / rewriteThreshold) ** (1 / ANCHORS.continuityDegree),
    );
    if (
      legEarned < rewriteThreshold ||
      pendingC < Math.max(1, ANCHORS.rewriteFraction * contEarned)
    ) {
      continue;
    }
    contEarned += pendingC;
    contHeld += pendingC;
    rewrites.push({
      rewrite: rewrites.length + 1,
      at: clock,
      cycleSeconds: clock - cycleStart,
      gain: pendingC,
      earned: contEarned,
    });
    cycleStart = clock;
    const kept = contOwned.has('eternal-dispatch')
      ? [...legOwned].filter((id) => id === 'dispatch' || id === 'elseworld-protocols')
      : [];
    legEarned = 0;
    legHeld = 0;
    training = 0;
    network.fill(0);
    legOwned.clear();
    kept.forEach((id) => legOwned.add(id));
    spend();

    const age = ages.length;
    if (
      ageGates[age] === undefined &&
      age < ANCHORS.ageSlotsS.length &&
      clock >= ANCHORS.ageSlotsS[age]
    ) {
      ageGates[age] = contEarned;
    }
    if (ageGates[age] === undefined || contEarned < ageGates[age]) continue;
    const canon = Math.floor(
      LEVERS.canonScale * (contEarned / ageGates[0]) ** (1 / LEVERS.canonDegree),
    );
    canonEver += canon;
    canonHeld += canon;
    ages.push({ age: age + 1, at: clock, ageSeconds: clock - ageStart, canon });
    ageStart = clock;
    cycleStart = clock;
    contEarned = 0;
    contHeld = 0;
    mythic = 0;
    drills = 0;
    earths.fill(0);
    spend();
  }
  return { steps, rewrites, ages, slots, rewriteThreshold, ageGates };
}

// ═══ Derived: the thresholds the walk records ═══

const ARC = walkArc();

/** Legacy earned (since the last Rewrite) that opens Rewrite. */
export const REWRITE_THRESHOLD = ARC.rewriteThreshold;

/** Where the Legacy multiplier starts to bend: at the Rewrite threshold, so pushing past it is a signal to go up a layer. */
export const SOFTCAP_KNEE = REWRITE_THRESHOLD;

/** Pending Continuity for a cycle that earned `legacy`, at a Continuity-gain multiplier `gain`. */
export function continuityFor(legacy: number, gain = 1): number {
  if (legacy < REWRITE_THRESHOLD) return 0;
  return Math.floor(gain * (legacy / REWRITE_THRESHOLD) ** (1 / ANCHORS.continuityDegree));
}

/**
 * Continuity earned in an Age that opens the next Age, by Ages already turned.
 * Past the scheduled Ages, each gate grows by the last scheduled ratio.
 */
export function ageGate(agesTurned: number): number {
  const gates = ARC.ageGates;
  const last = gates.length - 1;
  if (agesTurned <= last) return gates[agesTurned];
  return gates[last] * (gates[last] / gates[last - 1]) ** (agesTurned - last);
}

/** Canon an Age pays for `continuity` earned in it; 0 below the gate. */
export function canonFor(continuity: number, agesTurned: number): number {
  if (continuity < ageGate(agesTurned)) return 0;
  return Math.floor(LEVERS.canonScale * (continuity / ageGate(0)) ** (1 / LEVERS.canonDegree));
}

/** Run justice each Elseworld tier asks for, by Elseworld and tier (index 0 is tier 1). */
export const ELSEWORLD_GOALS = Object.fromEntries(
  ELSEWORLD_IDS.map((id) => [id, ARC.slots.filter((s) => s.id === id).map((s) => s.goal)]),
) as Record<ElseworldId, number[]>;

/** The full prediction, for the probe to diff against. */
export const PREDICTION = {
  tierOpens: Array.from({ length: ANCHORS.tierCount }, (_, i) => tierOpensAt(i + 1)),
  walk: ARC,
};
