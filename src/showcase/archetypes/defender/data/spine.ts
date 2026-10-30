// ─── Skeleton ───
// The spine's home in `data/`. Every economy number in the Walled Garden falls
// out of the anchors below, in plain arithmetic with no engine. Modules read
// each anchor at a `tunable()` reader site (`modules/garden.ts`), so a probe
// perturbs an anchor without editing this file. `balance/defender-projection.ts`
// prints the prediction; `balance/arc-probe.ts` diffs the shipping game against it.
//
// The model, stated so it can be wrong:
//
//   income(w)  = S₀ · G^(w−1) · (G − 1)                   bounty a fully-cleared wave w pays
//   V(w)       = S + Σ income + what calling it a day paid  compost the reference gardener has committed
//   C(p, w)    = (V(w) · share / thrushCost) · thrushDps · (n·gap + dwell(p))
//   W(p, w)    = pressure(p) · land · toll(kind(w)) · C(p, w) · answer(p, kind(w)) · δ^(w − last)⁺
//
// C is the reference board's stream capacity, the leak estimate's form: every
// hunting plant fires from the wave's first arrival to its last departure, one
// pest at a time. `land` is the share of that capacity a board actually lands
// before a pest gets through, so at `pressure = 1` the reference gardener is at
// the leak threshold, and `1 / pressure` is the margin a plot leaves. What the
// almanac adds, and whatever the gardener plants better than the reference, is
// margin bought.
//
// The endless tail: nights past a plot's last go on turning the rotation. Bounty keeps
// the curve above, so the plot's own economy stays live, and HP grows faster by
// `tailDivergence` a night, so the dark has a threshold and how deep a board gets is
// the measurement (td-arcade `map/format.rs` `FinalWaveSpec`, its two-rate tail).
//
// The counter wheel: every night sends one kind of pest, and each attack form
// meets each armour kind at its own multiplier. The reference board splits its
// hunting compost across forms as the plot's rotation asks, so only `answer`,
// the share of that board that can hurt tonight's kind, fires at full weight.
// `toll` is what the closed form cannot see about a kind: how much of a pool of
// beetles, or of greenfly, a board lands before one gets through, against slugs.

export interface SpineAnchors {
  /** Price of the reference plant; every other price is a ratio of it. */
  thrushCost: number;
  /** Reference plant damage per second; the damage unit. */
  thrushDps: number;
  /** Reference plant reach, in cells. */
  thrushRange: number;
  /** Baseline pest walking speed, cells per second. */
  pestSpeed: number;
  /** Seconds between consecutive arrivals inside one wave. */
  spawnGap: number;
  /** Compost at the start of every plot, before the almanac. */
  startCompost: number;
  /** Share of the board's compost in hunting plants; the rest is hedge. */
  damageShare: number;
  /** Share of the stream capacity a board lands at the leak threshold. */
  land: number;
  /** Per-wave growth of the bounty curve. ln2 / ln G ≈ waves per doubling. */
  waveGrowth: number;
  /** Pressure of the first plot. */
  basePressure: number;
  /** Multiplicative pressure step between consecutive plots. */
  pressureStep: number;
  /** Waves in the first plot. */
  baseWaves: number;
  /** Extra waves per later plot. */
  wavesStep: number;
  /** Fraction of a wave's income an instant early call pays, scaled by the build time given up. */
  earlyCallShare: number;
  /** Cost ratio between consecutive plant levels. */
  upgradeGrowth: number;
  /** Seconds of build time between waves (the first wave waits for the gardener). */
  buildSeconds: number;
  /** Per night past a plot's last, how much faster HP grows than bounty. Above 1, or the tail never ends. */
  tailDivergence: number;
}

/** The only hand-picked numbers. Everything in § Balance follows from them. */
export const ANCHORS: SpineAnchors = {
  thrushCost: 50,
  thrushDps: 10,
  thrushRange: 2.5,
  pestSpeed: 1.5,
  spawnGap: 0.8,
  startCompost: 200,
  // Measured: the reference gardener's board is 0.88 / 0.80–0.85 / 0.81 hunting plants by plot (`capacity-probe.ts`).
  damageShare: 0.83,
  // Measured: the reference gardener loses a plot at 0.71 / 1.00 / 0.90 of capacity
  // (`threshold-probe.ts`, no almanac); `land` is their geometric mean.
  land: 0.86,
  // ln2 / ln1.22 ≈ 3.5 waves per doubling: a purchase every wave, a visible jump every ~3.
  waveGrowth: 1.22,
  basePressure: 0.55,
  // 0.55 → 0.83 → 1.24: the third plot is past the reference gardener, and the level-8
  // almanac a flawless pass through the other two earns brings it to ≈0.9.
  pressureStep: 1.5,
  baseWaves: 10,
  wavesStep: 4,
  earlyCallShare: 0.3,
  // Level k costs base · 1.5^(k−1) and multiplies damage by the same total, so damage per compost
  // is level-independent and the spine holds whether the gardener upgrades or plants wide.
  upgradeGrowth: 1.5,
  // Long enough to plant three or four things by hand; calling it a day is what shortens it.
  buildSeconds: 25,
  // Derived against the margin the dark is entered with, not picked: δ = m^(1/D) for a
  // margin m and a target depth D, then one sweep and one correction (`tail-probe.ts`).
  // Measured: the reference gardener gets 6 / 10 / 10 nights deep, against a target of 8.
  tailDivergence: 1.13,
};

/**
 * Seconds a slug-speed pest spends in one hunting plant's reach on the
 * reference gardener's board, per plot: the leak estimate's dwell. A property
 * of each map's stone and of the maze the reference gardener lays on it, so
 * not a tunable. Measured, damage-weighted plot means over two passes
 * (`capacity-probe.ts`).
 */
export const PLOT_DWELL = [5.5, 7.6, 7.2];

/**
 * Seconds from a wave's last arrival to its end on the reference gardener's
 * board, per plot: how far the last pest walks before it is seen off. Like
 * `PLOT_DWELL`, a property of the map and its maze. It does not size a wave,
 * so it is measured in the reference gardener's arc (`capacity-probe.ts`).
 */
export const PLOT_TAIL = [5.5, 16.1, 7.2];

/**
 * Seconds a slug-speed flyer spends in one bat box's reach: the dwell of a
 * moth night, which crosses the beds in a straight line whatever the hedges
 * do. Measured mean over moth nights (`capacity-probe.ts`).
 */
export const FLIGHT_DWELL = 3.7;

/** Maximum plant level. Structural: four rungs fit the board's ~135 cells against the third plot's value. */
export const MAX_LEVEL = 4;

// ─── Balance ───

// ── Waves

/** Waves in plot `p` (0-based). */
export function wavesIn(a: SpineAnchors, p: number): number {
  return a.baseWaves + a.wavesStep * p;
}

/** Pressure of plot `p` at the reference planting, before the almanac. */
export function pressure(a: SpineAnchors, p: number): number {
  return a.basePressure * a.pressureStep ** p;
}

/** Baseline pest count of wave `w` (1-based); variants rescale it. */
export function baseCount(w: number): number {
  return 6 + Math.floor((w - 1) / 2);
}

/** Seconds the wave streams past one hunting plant: arrivals, then one dwell. */
export function waveWindow(a: SpineAnchors, p: number, w: number): number {
  const dwell = ARMOUR[nightKind(a, p, w)] === 'wing' ? FLIGHT_DWELL : PLOT_DWELL[p];
  return baseCount(w) * a.spawnGap + dwell;
}

/** Bounty a fully-cleared wave `w` pays in total: the bounty curve. */
export function waveIncome(a: SpineAnchors, w: number): number {
  return a.startCompost * a.waveGrowth ** (w - 1) * (a.waveGrowth - 1);
}

/**
 * Compost the reference gardener has committed when wave `w` launches: the
 * plot's start, every bounty before `w`, and what calling it a day at once paid
 * for waves 2..w. The first wave waits, so it pays nothing early.
 *
 *   V(w) = S + S₀·(G^(w−1) − 1) + e·m·S₀·(G^w − G)
 */
export function committedValue(a: SpineAnchors, w: number, bins = 0, earlyRiser = 0): number {
  const s = a.startCompost * (1 + LESSON_STEP.bins * bins);
  const m = 1 + LESSON_STEP['early-riser'] * earlyRiser;
  const g = a.waveGrowth;
  return (
    s + a.startCompost * (g ** (w - 1) - 1) + a.earlyCallShare * m * a.startCompost * (g ** w - g)
  );
}

/**
 * Damage the reference board in plot `p` can deal to wave `w`: each hunting
 * plant fires from the first arrival to the last departure, `n·gap + dwell`
 * seconds, one pest at a time. The damage share of committed compost buys
 * thrush-equivalents, whose damage per compost is level-flat.
 */
export function referenceCapacity(
  a: SpineAnchors,
  p: number,
  w: number,
  wellFed = 0,
  bins = 0,
  earlyRiser = 0,
): number {
  const thrushes = (committedValue(a, w, bins, earlyRiser) * a.damageShare) / a.thrushCost;
  const dps = a.thrushDps * (1 + LESSON_STEP['well-fed'] * wellFed);
  return thrushes * dps * waveWindow(a, p, w);
}

/** Effective HP pool of wave `w` in plot `p`, in slug-speed HP. */
export function waveHp(a: SpineAnchors, p: number, w: number): number {
  const kind = nightKind(a, p, w);
  const dark = a.tailDivergence ** Math.max(0, w - wavesIn(a, p));
  return (
    pressure(a, p) *
    a.land *
    KIND_TOLL[kind] *
    referenceCapacity(a, p, w) *
    answerShare(a, p, kind) *
    dark
  );
}

/** Seconds after launch at which wave `w`'s last pest arrives. */
export function lastArrival(a: SpineAnchors, p: number, w: number): number {
  return Math.max(...composeWave(a, p, w).map((s) => s.at));
}

/**
 * Seconds plot `p` takes under a gardener who calls every wave the moment the
 * build is spent: build time is zero, so the plot is its waves' arrivals and,
 * after each wave's last arrival, the map's tail.
 */
export function plotSeconds(a: SpineAnchors, p: number): number {
  let s = 0;
  for (let w = 1; w <= wavesIn(a, p); w++) s += lastArrival(a, p, w) + PLOT_TAIL[p];
  return s;
}

/** Sim-seconds from a cold start at which each plot is held, plots in order, first try each. */
export function predictHeldAt(a: SpineAnchors, plots: number): number[] {
  const out: number[] = [];
  let t = 0;
  for (let p = 0; p < plots; p++) out.push((t += plotSeconds(a, p)));
  return out;
}

// ── Pests

export type PestKind = 'slug' | 'mouse' | 'beetle' | 'aphid' | 'moth' | 'badger';

/**
 * What a pest's body is to the plants that hunt it. A `wing` flies a straight
 * line from the gap to the seedbed, over hedges and stone alike.
 */
export type Armour = 'soft' | 'shell' | 'swarm' | 'wing';

export const ARMOUR: Record<PestKind, Armour> = {
  slug: 'soft',
  mouse: 'soft',
  beetle: 'shell',
  aphid: 'swarm',
  moth: 'wing',
  badger: 'soft',
};

export interface PestSpec {
  kind: PestKind;
  hp: number;
  /** Cells per second. */
  speed: number;
  /** Compost paid when this pest is seen off. */
  bounty: number;
  /** Seedlings lost if it reaches the seedbed. */
  leak: number;
  /** Seconds after the wave launches that it arrives. */
  at: number;
}

/** Speed ratio of each pest to the baseline. */
export const SPEED_MULT: Record<PestKind, number> = {
  slug: 1,
  mouse: 1.6,
  beetle: 0.65,
  aphid: 0.8,
  moth: 1.4,
  badger: 0.55,
};

/** Pests in a night of each kind, over the baseline count. */
const COUNT_MULT: Record<PestKind, number> = {
  slug: 1,
  mouse: 1.5,
  beetle: 0.5,
  aphid: 2.5,
  moth: 1,
  badger: 1,
};

const LEAK: Record<PestKind, number> = {
  slug: 1,
  mouse: 1,
  beetle: 2,
  aphid: 1,
  moth: 1,
  badger: 6,
};

/**
 * A night of each kind's leak threshold over a night of slugs', with the right
 * answer on the board: moths fly over the maze that lengthens every other
 * kind's dwell, a release clears greenfly by the cluster. A property of the kinds, so not a tunable. Measured,
 * geometric mean over the plots that send the kind (`threshold-probe.ts --kinds`).
 */
export const KIND_TOLL: Record<PestKind, number> = {
  slug: 1,
  mouse: 1.08,
  beetle: 0.81,
  aphid: 1.22,
  moth: 0.35,
  badger: 1,
};

/** Share of the final wave's HP pool the badger carries alone. */
const BADGER_SHARE = 0.35;

/**
 * The kinds each plot sends, night after night, in order; the rotation starts
 * again when it runs out. Each plot adds one turn of the wheel: the Bean Rows
 * bring moths, the Orchard greenfly, so a night asks a different answer from
 * the night before.
 */
export const NIGHTS: PestKind[][] = [
  ['slug', 'mouse', 'slug', 'beetle'],
  ['slug', 'mouse', 'moth', 'slug', 'beetle', 'moth'],
  ['slug', 'aphid', 'beetle', 'moth', 'mouse', 'aphid', 'beetle', 'moth'],
];

/**
 * The kind of pest night `w` of plot `p` sends; the last night is the badger's.
 * Past it, in the dark, the rotation goes on, and the badger never returns: a
 * boss is never a turn of the wheel (td-arcade `FinalWaveSpec::cycle`).
 */
export function nightKind(a: SpineAnchors, p: number, w: number): PestKind {
  if (w === wavesIn(a, p)) return 'badger';
  const r = NIGHTS[p];
  return r[(w - 1) % r.length];
}

/**
 * Compose wave `w` of plot `p` from the closed forms: scaled opposition with no
 * authored per-wave record. Damage a pest takes scales with its exposure, which
 * is ∝ 1/speed, so every pest's HP is divided by its speed ratio: a wave of mice
 * and a wave of beetles carry the same pool in baseline-speed HP. Bounty is
 * split across the wave in proportion to effective HP.
 */
export function composeWave(a: SpineAnchors, p: number, w: number): PestSpec[] {
  const pool = waveHp(a, p, w);
  const income = waveIncome(a, w);
  const n = baseCount(w);
  const kind = nightKind(a, p, w);
  const plan: { kind: PestKind; share: number }[] = [];

  if (kind === 'badger') {
    plan.push({ kind: 'badger', share: BADGER_SHARE });
    for (let i = 0; i < n; i++) plan.push({ kind: 'slug', share: (1 - BADGER_SHARE) / n });
  } else {
    const m = Math.max(1, Math.round(n * COUNT_MULT[kind]));
    for (let i = 0; i < m; i++) plan.push({ kind, share: 1 / m });
  }

  // The window is sized off the baseline count, so a variant wave spreads its arrivals over the same stream length.
  const gap = (n * a.spawnGap) / plan.length;
  return plan.map((s, i) => ({
    kind: s.kind,
    hp: Math.max(1, Math.round((pool * s.share) / SPEED_MULT[s.kind])),
    speed: a.pestSpeed * SPEED_MULT[s.kind],
    bounty: Math.max(1, Math.round(income * s.share)),
    leak: LEAK[s.kind],
    // The badger walks in last, behind the slugs.
    at: s.kind === 'badger' ? n * a.spawnGap + 2 : i * gap,
  }));
}

// ── Plants

export type PlantId = 'hedge' | 'thrush' | 'trap' | 'bat' | 'marigold' | 'ladybird';

/** How a hunting plant does its damage: a peck, a ladybird release, a bat hawking on the wing. */
export type Form = 'peck' | 'release' | 'hawk';
export const FORMS: Form[] = ['peck', 'release', 'hawk'];

/**
 * Damage multiplier of each attack form against each armour kind; 0 cannot
 * reach it, and a plant never aims at what it cannot reach. Every armour kind
 * has a form at 1, so the wheel takes damage away from a wrong answer and
 * never adds it to a right one: the spine's thrush-equivalents stay the unit.
 */
export const FORM_VS_ARMOUR: Record<Form, Record<Armour, number>> = {
  // A thrush cracks a shell on its anvil stone; greenfly are hardly worth its while.
  peck: { soft: 1, shell: 1, swarm: 0.3, wing: 0 },
  // Ladybirds eat greenfly by the hundred, and a shell turns them.
  release: { soft: 1, shell: 0.25, swarm: 1, wing: 0 },
  // Bats take moths on the wing and never stoop for anything on the ground.
  hawk: { soft: 0, shell: 0, swarm: 0, wing: 1 },
};

export interface PlantSpec {
  id: PlantId;
  /** How it hunts; null for a plant that does not. */
  form: Form | null;
  cost: number;
  /** Damage per shot at level 1; 0 for a plant that does not attack. */
  damage: number;
  /** Seconds between shots. */
  cooldown: number;
  /** Reach in cells, Euclidean from the cell's centre. */
  range: number;
  /** Shot cells per second. */
  shotSpeed: number;
  /** Splash radius in cells; 0 for single-target. */
  splash: number;
  /** Fraction of speed removed from pests in range. */
  slow: number;
  /** Damage bonus granted to each 8-neighbour plant; a plant takes the strongest one touching it, once. */
  amp: number;
  /** Gardener's level that opens it. */
  unlockLevel: number;
}

/** Expected pests a ladybird release catches. Chosen by feel; the probe can count it. */
const SPLASH_HITS = 2;
/**
 * Hunting neighbours a marigold must boost to pay for itself. Its boost does
 * not stack, so a full ring of eight is twice its price, and a ring is a 3×3
 * block: the shape a maze can least use.
 */
const MARIGOLD_BREAK_EVEN = 4;
const MARIGOLD_AMP = 0.5;
const TRAP_SLOW = 0.4;
/** Reference thrushes whose fire one trap's slow overlaps. */
const TRAP_OVERLAP = 2;

export function plantSpecs(a: SpineAnchors): Record<PlantId, PlantSpec> {
  const thrushShot = a.thrushDps * 0.5; // two shots a second
  const ladybirdCost = 120;
  // Ladybird damage per compost, times the pests a release catches, matches the thrush's.
  const ladybirdDps = ((a.thrushDps / a.thrushCost) * ladybirdCost) / SPLASH_HITS;
  // A trap stretches exposure by 1/(1−slow) for the thrushes it overlaps; priced at the thrush-value that adds.
  const trapCost = Math.round((a.thrushCost * (1 / (1 - TRAP_SLOW) - 1) * TRAP_OVERLAP) / 10) * 10;
  const base = {
    form: null,
    damage: 0,
    cooldown: 0,
    range: 0,
    shotSpeed: 0,
    splash: 0,
    slow: 0,
    amp: 0,
    unlockLevel: 0,
  };
  return {
    hedge: { ...base, id: 'hedge', cost: a.thrushCost / 5 },
    thrush: {
      ...base,
      id: 'thrush',
      form: 'peck',
      cost: a.thrushCost,
      damage: thrushShot,
      cooldown: 0.5,
      range: a.thrushRange,
      shotSpeed: 10,
    },
    trap: { ...base, id: 'trap', cost: trapCost, range: 2, slow: TRAP_SLOW, unlockLevel: 2 },
    // A thrush for moths: the same damage per compost, at the same price.
    bat: {
      ...base,
      id: 'bat',
      form: 'hawk',
      cost: a.thrushCost,
      damage: thrushShot,
      cooldown: 0.5,
      range: a.thrushRange,
      shotSpeed: 12,
      unlockLevel: 3,
    },
    marigold: {
      ...base,
      id: 'marigold',
      cost: Math.round((MARIGOLD_BREAK_EVEN * a.thrushCost * MARIGOLD_AMP) / 10) * 10,
      amp: MARIGOLD_AMP,
      unlockLevel: 4,
    },
    ladybird: {
      ...base,
      id: 'ladybird',
      form: 'release',
      cost: ladybirdCost,
      damage: ladybirdDps * 2,
      cooldown: 2,
      range: 3.5,
      shotSpeed: 4,
      splash: 1,
      unlockLevel: 7,
    },
  };
}

/** Price of raising a plant from `level` to `level + 1`. */
export function upgradeCost(a: SpineAnchors, base: number, level: number): number {
  return Math.round(base * a.upgradeGrowth ** level);
}

/** Damage multiplier at `level`: total compost sunk over base cost, so damage per compost is flat. */
export function levelMultiplier(a: SpineAnchors, level: number): number {
  let total = 0;
  for (let k = 0; k < level; k++) total += a.upgradeGrowth ** k;
  return total;
}

// ── The wheel

/** The gardener's level entering plot `p` after a flawless pass through the plots before it. */
export function entryLevel(a: SpineAnchors, p: number): number {
  let xp = 0;
  for (let q = 0; q < p; q++) xp += perfectScore(a, q, BASE_SEEDLINGS);
  return gardenerLevel(xp);
}

/**
 * The reference board's split of hunting compost across forms in plot `p`:
 * every night of the rotation asks for its best form among those learned on
 * entry, ties shared.
 */
export function formShares(a: SpineAnchors, p: number): Record<Form, number> {
  const level = entryLevel(a, p);
  const learned = Object.values(plantSpecs(a))
    .filter((s) => s.form !== null && s.unlockLevel <= level)
    .map((s) => s.form!);
  const share: Record<Form, number> = { peck: 0, release: 0, hawk: 0 };
  const nights = NIGHTS[p];
  for (const k of nights) {
    const best = Math.max(...learned.map((f) => FORM_VS_ARMOUR[f][ARMOUR[k]]));
    if (best === 0) continue;
    const answers = learned.filter((f) => FORM_VS_ARMOUR[f][ARMOUR[k]] === best);
    for (const f of answers) share[f] += 1 / answers.length / nights.length;
  }
  return share;
}

/** The share of plot `p`'s reference board that can hurt a pest of `kind`, at full weight. */
export function answerShare(a: SpineAnchors, p: number, kind: PestKind): number {
  const s = formShares(a, p);
  return FORMS.reduce((t, f) => t + s[f] * FORM_VS_ARMOUR[f][ARMOUR[kind]], 0);
}

/** Compost returned when a plant is dug up. */
export const REFUND_RATE = 0.7;

// ── Plot records and the gardener's level

/** Score multiplier of plot `p`; later plots are worth more per wave. */
export function plotScoreMult(p: number): number {
  return 1.5 ** p;
}

/** Points for clearing wave `w` of plot `p`. */
export function waveScore(p: number, w: number): number {
  return Math.round(10 * w * plotScoreMult(p));
}

/** Points for finishing plot `p` with `seedlings` left. */
export function victoryScore(p: number, seedlings: number): number {
  return Math.round(10 * seedlings * plotScoreMult(p));
}

/** Score of a flawless clear of plot `p` with `seedlings` intact. */
export function perfectScore(a: SpineAnchors, p: number, seedlings: number): number {
  let s = victoryScore(p, seedlings);
  for (let w = 1; w <= wavesIn(a, p); w++) s += waveScore(p, w);
  return s;
}

/**
 * Experience for level L is 40·L². Sized so a clean first plot lands level 4
 * (Σ10w over 10 waves + 20·10 = 750 → √(750/40) ≈ 4.3) and the first two land ~8.
 */
export const XP_PER_LEVEL_SQ = 40;

export function gardenerLevel(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / XP_PER_LEVEL_SQ));
}

export function xpForLevel(level: number): number {
  return XP_PER_LEVEL_SQ * level * level;
}

/** Seedlings in the seedbed at the start of every plot. */
export const BASE_SEEDLINGS = 20;

// ── The almanac

/** Per-level effect of each almanac lesson. Each caps at LESSON_MAX levels, one note a level. */
export const LESSON_STEP = {
  'well-fed': 0.1, // +10% damage
  bins: 0.15, // +15% starting compost
  perches: 0.2, // +0.2 cells range
  cloches: 4, // +4 seedlings
  'early-riser': 0.5, // +50% compost for calling it a day
} as const;
export type LessonId = keyof typeof LESSON_STEP;
export const LESSON_MAX = 4;

/**
 * Pressure the gardener actually faces on plot `p`'s last wave, given the
 * almanac: damage, starting compost and early-call pay all scale the board the
 * spine counts. Perches and cloches are margin it does not.
 */
export function effectivePressure(
  a: SpineAnchors,
  p: number,
  wellFed: number,
  bins: number,
  earlyRiser = 0,
): number {
  const w = wavesIn(a, p);
  const board =
    (1 + LESSON_STEP['well-fed'] * wellFed) *
    (committedValue(a, w, bins, earlyRiser) / committedValue(a, w));
  return pressure(a, p) / board;
}
