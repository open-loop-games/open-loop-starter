// ─── Skeleton ───
// The spine's home in `data/`. Every economy number in Paragon is derived here
// from the named anchors below, in plain arithmetic with no engine and no runtime
// state. `balance/arc-probe.ts` plays the shipping game and diffs it against
// `PREDICTION`.
//
// Bucket: exponential family. A tier's units cost c·mⁿ, and each prestige layer
// pays a root of what the layer below earned, so each layer compresses the one
// below it by a power.
//
// Where the closed form stops:
//   - the run itself. A run buys in ladder order: fill tier k from its first unit
//     to `hold`, save for tier k+1's first unit, repeat; past the top tier, keep
//     buying the top tier. Income is what the holdings make: lower tiers frozen at
//     `hold`, the filling tier at its live count. The time to a total is an
//     exponential integral, integrated numerically. Real players interleave, so
//     the ladder is a bound on the shape, not the policy.
//   - when to prestige. The reference walk reboots at a stated share and rewrites
//     the moment Continuity is pending; it is a policy, not an optimum.

// ─── Balance ───

// ── Authored anchors ──
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
  /** Reboots the reference policy plays before Rewrite opens. */
  rewriteAfter: 7,
  /** Continuity = ⌊√(legacy earned / threshold)⌋. */
  continuityDegree: 2,
  /** Once the early shop is bought, each Rewrite cycle takes this fraction of the one before. */
  rewriteCompress: 0.8,
  /** An Elseworld goal is what the restricted run earns in this many seconds at the multiplier it opens at. */
  elseworldS: 120,
} as const;

/**
 * Content magnitudes — what each upgrade, reward and restriction is worth.
 * Chosen by feel, not derived; they sit here because the walk below has to
 * include every term that multiplies the curve it solves.
 */
export const LEVERS = {
  publicTrustMult: 3,
  trainingMult: 2,
  /** Hero Training costs `trainingBase * trainingRatio^level` Legacy. */
  trainingBase: 3,
  trainingRatio: 2,
  pressOfficeMult: 2,
  /** Legends: ×legendMult per lifetime-justice decade-triple (1e3, 1e6, …). */
  legendMult: 1.1,
  legendDecades: [3, 6, 9, 12, 15, 18, 21, 24],
  noPowersRewardMult: 4,
  secretIdentityRewardMult: 2,
  villainUprisingAdd: 0.1,
  villainUprisingRewardAdd: -0.02,
  /** The Legacy multiplier bends to √ past its knee; Secret Identity's reward moves the knee. */
  softcapPower: 0.5,
  secretIdentityKneeMult: 3,
  mythicMult: 2,
  mythicBase: 2,
  mythicRatio: 3,
} as const;

/** Legacy upgrades by id, with their one-shot prices — the reference walk buys them in this order. */
export const LEGACY_PRICES = {
  dispatch: 1,
  'public-trust': 2,
  'elseworld-protocols': 4,
  'press-office': 8,
} as const;

/** Continuity upgrades and their one-shot prices. */
export const CONTINUITY_PRICES = {
  'eternal-dispatch': 1,
  'auto-reboot': 1,
} as const;

/** No Powers silences this tier and every one above it. */
export const HIGH_TIER_FROM = 4;

// ── Derived: the tier ladder ──

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

function phaseSecondsTo(ph: Phase, earned: number): number {
  if (ph.kind === 'save') return earned / ph.income;
  const { cost, ratio, low, rate, from } = ph;
  const n = Math.log(ratio ** from + (earned * (ratio - 1)) / cost) / Math.log(ratio);
  return integrate((x) => (cost * ratio ** x) / (low + rate * x), from, n);
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

function secondsToEarnAt(justice: number, mu: number, shape: RunShape, step: number): number {
  let clock = 0;
  let earned = 0;
  for (const ph of ladder(mu, shape, step)) {
    if (justice <= earned + ph.earned) return clock + phaseSecondsTo(ph, justice - earned);
    clock += phaseSecondsTo(ph, ph.earned);
    earned += ph.earned;
  }
  return clock;
}

function tierOpensAtStep(k: number, mu: number, shape: RunShape, step: number): number {
  let clock = 0;
  for (const ph of ladder(mu, shape, step)) {
    if (ph.kind === 'fill' && ph.tier === k) return clock;
    clock += phaseSecondsTo(ph, ph.earned);
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

/** Justice a fresh run has earned after `t` seconds at multiplier `mu` (inverts {@link secondsToEarn}). */
export function earnedAt(t: number, mu: number, shape: RunShape = {}): number {
  let lo = 0;
  let hi = 1;
  while (secondsToEarn(hi, mu, shape) < t) hi *= 2;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (secondsToEarn(mid, mu, shape) >= t) hi = mid;
    else lo = mid;
  }
  return hi;
}

// ── Derived: the prestige stack ──

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

// ── The reference walk ──
// The reference player: Reboot once pending Legacy reaches `rebootFraction`
// of Legacy earned; buy Legacy upgrades in price order and Hero Training
// whenever affordable; once Elseworld Protocols is owned, spend each new run on
// the next unresolved Elseworld, but only while output is at least the multiplier
// Elseworld goals are sized at (`elseworldMu`) — never an Elseworld straight after an
// Rewrite has stripped the Legacy term; Rewrite the moment Continuity is pending; buy
// Continuity upgrades in price order and Mythic Standing whenever affordable.
// Every term that multiplies the curve is inside the walk. An Elseworld run is
// timed under its rule up to the goal, then under the normal rules from there.

/** One Reboot of the reference walk. */
export interface WalkStep {
  reboot: number;
  /** Rewrite cycle this Reboot belongs to (0 before the first Rewrite). */
  cycle: number;
  runSeconds: number;
  /** Seconds since the save began, at the moment of this Reboot. */
  atSeconds: number;
  legacyEarned: number;
  outputMult: number;
  bought: string[];
}

export interface WalkCycle {
  rewrite: number;
  atSeconds: number;
  /** Seconds this cycle took, from the previous Rewrite (or the start). */
  cycleSeconds: number;
  continuityGain: number;
}

export interface Walk {
  steps: WalkStep[];
  cycles: WalkCycle[];
  /** Output multiplier and Legacy earned at the Reboot that buys Elseworld Protocols. */
  elseworldMu: number;
  elseworldLegacy: number;
}

export interface WalkParams {
  /** Stop after this many Reboots. */
  reboots: number;
  /** Stop after this many Rewrites. */
  rewrites?: number;
  rewriteThreshold: number;
  knee: number;
  continuityPower: number;
  /** Elseworld goals and the output multiplier they are sized at; omitted, Elseworld runs are timed as ordinary runs. */
  elseworlds?: { goals: Record<(typeof ELSEWORLD_ORDER)[number], number>; mu: number };
}

export const ELSEWORLD_ORDER = ['no-powers', 'secret-identity', 'villain-uprising'] as const;

export function walk(params: WalkParams): Walk {
  let earned = 0;
  let held = 0;
  let continuityHeld = 0;
  let continuityEver = 0;
  let mythic = 0;
  let clock = 0;
  let cycleStart = 0;
  let lifetime = ANCHORS.startJustice as number;
  let training = 0;
  const owned = new Set<string>();
  const continuityOwned = new Set<string>();
  const resolved = new Set<string>();
  const steps: WalkStep[] = [];
  const cycles: WalkCycle[] = [];
  let elseworldMu = 0;
  let elseworldLegacy = 0;

  const knee = () =>
    params.knee * (resolved.has('secret-identity') ? LEVERS.secretIdentityKneeMult : 1);
  const outputMult = () =>
    legacyMultiplier(earned, knee()) *
    (owned.has('public-trust') ? LEVERS.publicTrustMult : 1) *
    LEVERS.trainingMult ** training *
    LEVERS.legendMult ** legendsFor(lifetime) *
    (1 + continuityEver) ** params.continuityPower;
  const gainMult = () =>
    (owned.has('press-office') ? LEVERS.pressOfficeMult : 1) *
    (resolved.has('secret-identity') ? LEVERS.secretIdentityRewardMult : 1) *
    LEVERS.mythicMult ** mythic;
  const shape = (): RunShape => ({
    ratio:
      ANCHORS.priceRatio + (resolved.has('villain-uprising') ? LEVERS.villainUprisingRewardAdd : 0),
    street: resolved.has('no-powers') ? LEVERS.noPowersRewardMult : 1,
  });

  for (let i = 1; i <= params.reboots; i++) {
    const mu = outputMult();
    const ready = owned.has('elseworld-protocols') && mu >= (params.elseworlds?.mu ?? 0);
    const elseworld = ready ? ELSEWORLD_ORDER.find((c) => !resolved.has(c)) : undefined;
    const need = Math.max(1, Math.ceil(ANCHORS.rebootFraction * earned));
    const target = Math.max(
      REBOOT_THRESHOLD * (need / gainMult()) ** ANCHORS.payoutDegree,
      REBOOT_THRESHOLD,
    );
    let runSeconds = secondsToEarn(target, mu, shape());
    if (elseworld && params.elseworlds) {
      const goal = params.elseworlds.goals[elseworld];
      const ruled =
        elseworld === 'no-powers'
          ? secondsToEarn(goal, mu, { ...shape(), tiers: HIGH_TIER_FROM - 1 })
          : elseworld === 'secret-identity'
            ? secondsToEarn(goal, mu / legacyMultiplier(earned, knee()), shape())
            : secondsToEarn(goal, mu, {
                ...shape(),
                ratio: ANCHORS.priceRatio + LEVERS.villainUprisingAdd,
              });
      runSeconds = Math.max(runSeconds, ruled + runSeconds - secondsToEarn(goal, mu, shape()));
    }
    const gain = legacyFor(target, gainMult());
    clock += runSeconds;
    lifetime += target;
    earned += gain;
    held += gain;
    if (elseworld) resolved.add(elseworld);

    const bought: string[] = [];
    for (const [id, price] of Object.entries(LEGACY_PRICES)) {
      if (!owned.has(id) && held >= price) {
        owned.add(id);
        held -= price;
        bought.push(id);
        if (id === 'elseworld-protocols' && elseworldMu === 0) {
          elseworldMu = outputMult();
          elseworldLegacy = earned;
        }
      }
    }
    for (;;) {
      const price = LEVERS.trainingBase * LEVERS.trainingRatio ** training;
      if (held < price) break;
      held -= price;
      training++;
      bought.push(`training ${training}`);
    }
    steps.push({
      reboot: i,
      cycle: cycles.length,
      runSeconds,
      atSeconds: clock,
      legacyEarned: earned,
      outputMult: mu,
      bought,
    });

    if (earned >= params.rewriteThreshold) {
      const continuityGain = Math.floor(
        (earned / params.rewriteThreshold) ** (1 / ANCHORS.continuityDegree),
      );
      continuityHeld += continuityGain;
      continuityEver += continuityGain;
      cycles.push({
        rewrite: cycles.length + 1,
        atSeconds: clock,
        cycleSeconds: clock - cycleStart,
        continuityGain,
      });
      cycleStart = clock;
      // The wipe runs before the new Continuity is spent, so Eternal Dispatch bought
      // now protects the next Rewrite, not this one.
      const kept = continuityOwned.has('eternal-dispatch')
        ? [...owned].filter((id) => id === 'dispatch' || id === 'elseworld-protocols')
        : [];
      for (const [id, price] of Object.entries(CONTINUITY_PRICES)) {
        if (!continuityOwned.has(id) && continuityHeld >= price) {
          continuityOwned.add(id);
          continuityHeld -= price;
        }
      }
      for (;;) {
        const price = LEVERS.mythicBase * LEVERS.mythicRatio ** mythic;
        if (continuityHeld < price) break;
        continuityHeld -= price;
        mythic++;
      }
      earned = 0;
      held = 0;
      training = 0;
      owned.clear();
      kept.forEach((id) => owned.add(id));
      if (params.rewrites !== undefined && cycles.length >= params.rewrites) break;
    }
  }
  return { steps, cycles, elseworldMu, elseworldLegacy };
}

const FIRST_LAYER = walk({
  reboots: ANCHORS.rewriteAfter,
  rewriteThreshold: Infinity,
  knee: Infinity,
  continuityPower: 1,
});

/** Legacy earned (since the last Rewrite) that opens Rewrite. */
export const REWRITE_THRESHOLD = FIRST_LAYER.steps[FIRST_LAYER.steps.length - 1].legacyEarned;

/** Where the Legacy multiplier starts to bend: at the Rewrite threshold, so pushing past it is a signal to go up a layer. */
export const SOFTCAP_KNEE = REWRITE_THRESHOLD;

/** Pending Continuity for a cycle that earned `legacy`. */
export function continuityFor(legacy: number): number {
  if (legacy < REWRITE_THRESHOLD) return 0;
  return Math.floor((legacy / REWRITE_THRESHOLD) ** (1 / ANCHORS.continuityDegree));
}

// ── Derived: Elseworld goals ──

/** The output multiplier Elseworld goals are sized at: the reference player's, the moment Elseworld Protocols is bought. */
export const ELSEWORLD_MU = FIRST_LAYER.elseworldMu;

/** Run justice each Elseworld asks for: what its restricted run earns in `elseworldS` at the multiplier Elseworlds open at. */
export const ELSEWORLD_GOALS = {
  'no-powers': earnedAt(ANCHORS.elseworldS, FIRST_LAYER.elseworldMu, { tiers: HIGH_TIER_FROM - 1 }),
  'secret-identity': earnedAt(
    ANCHORS.elseworldS,
    FIRST_LAYER.elseworldMu / legacyMultiplier(FIRST_LAYER.elseworldLegacy, SOFTCAP_KNEE),
  ),
  'villain-uprising': earnedAt(ANCHORS.elseworldS, FIRST_LAYER.elseworldMu, {
    ratio: ANCHORS.priceRatio + LEVERS.villainUprisingAdd,
  }),
} as const;

/** The reference walk through `rewrites` cycles at a given Continuity output power. */
export function walkCycles(rewrites: number, continuityPower: number): Walk {
  return walk({
    reboots: 500,
    rewrites,
    rewriteThreshold: REWRITE_THRESHOLD,
    knee: SOFTCAP_KNEE,
    continuityPower,
    elseworlds: { goals: ELSEWORLD_GOALS, mu: ELSEWORLD_MU },
  });
}

/**
 * Continuity multiplies output by (1 + Continuity ever earned)^power. The power is
 * solved so that, once the early shop is bought, each Rewrite cycle takes
 * `rewriteCompress` of the one before — measured as the mean per-cycle
 * ratio from cycle 4 to cycle 8. Solved there, not on cycles 1→2 or 2→3: those
 * compress by 4× and 1.36× at power 0 (Elseworld rewards, Mythic Standing, the
 * keep-set), so a target on them pins the power at zero and Continuity's own term
 * pays nothing; from cycle 4 on, power 0 plateaus and Continuity is what moves it.
 */
export const CONTINUITY_POWER = (() => {
  const ratio = (p: number) => {
    const cycles = walkCycles(8, p).cycles;
    if (cycles.length < 8) return Infinity;
    return (cycles[7].cycleSeconds / cycles[3].cycleSeconds) ** (1 / 4);
  };
  let lo = 0;
  let hi = 4;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (ratio(mid) > ANCHORS.rewriteCompress) lo = mid;
    else hi = mid;
  }
  return hi;
})();

/** The full prediction, for the probe to diff against. */
export const PREDICTION = {
  tierOpens: Array.from({ length: ANCHORS.tierCount }, (_, i) => tierOpensAt(i + 1)),
  walk: walkCycles(8, CONTINUITY_POWER),
};
