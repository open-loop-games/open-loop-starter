// ─── Skeleton ───
// The spine: every number in a take derives from the anchors here. Plain arithmetic, no
// engine and no runtime reads, so the projection and the modules read the same values.
//
// Bucket: geometric discrete on scene marks. Both sides of a take compound: rig damage
// through the rewrite draft, extra hp and arrivals through the scene index. The closed core
// is a crossing between two geometric curves, and the rewrite ladder is derived from the
// income model so drafts land on the authored schedule instead of beside it. Where the
// closed form stops is in `../IDENTITY.md` § Rate-function spine.

import { meanHpFactor } from './extras';
import { RATINGS } from './ratings';

// ─── Balance ───
// The only hand-picked numbers in the economy. Each line says why.

export const ANCHORS = {
  /** A take runs to CUT at seven minutes: one take is one coffee-break session. */
  takeSeconds: 420,
  /** The scene index, the opposition's content ordinal, advances once a minute. */
  sceneSeconds: 60,
  /** First rewrite 12 s in: the build starts moving at once. */
  firstBeat: 12,
  /** The last rewrite gap is 50 s, still inside the flow band of 30 s–2 min. */
  lastInterval: 50,

  /** Scene-0 extra hp: one pistol shot drops a grunt at scene 0. */
  hp0: 5,
  /** Per-scene hp growth. */
  hpGrowth: 1.3,
  /** Scene-0 arrivals a second. Many soft bodies rather than few hard ones, so the floor holds a crowd. */
  spawn0: 1.8,
  /** Per-scene arrival growth. */
  spawnGrowth: 1.15,
  /** Required damage over incoming hp flux. Barely above 1, so the floor holds a crowd rather than emptying. */
  ttkMargin: 1.2,

  /** Contact damage per touching extra a second at scene 0: five on you kill in about 7 s. */
  contact0: 3,
  /** Per-scene contact growth, far slower than hp growth. */
  contactGrowth: 1.12,
  /** The double's base health. */
  playerHp: 100,

  /** Share of rewrites spent on pages that are not damage (health, speed, mic). */
  defenseShare: 0.3,
  /**
   * Reels banked over the reels that walk on: η times the share of arrivals downed, since
   * the floor holds an uncleared crowd. A driver output, assumed here. The Veteran
   * improvising at G: 0.59 (take-probe, 16 seeds, `income` × η).
   */
  incomeShare: 0.59,
  /** Assumed share of kills that land inside the shot. */
  shotShare: 0.15,
  /** What a kill inside the shot pays, against one outside. */
  shotMult: 2,

  /** Mid-radius of the arrival ring, world units. */
  spawnRadius: 670,
  /** The opening rig's reach: an arrival is in range once it closes to here. */
  openingReach: 300,
  /** The opening crowd's walking speed (grunts). */
  openingSpeed: 62,

  /** Rig slots on the double's harness. */
  rigSlots: 4,
  /** Rig level cap. */
  rigMaxLevel: 5,

  /** Full takes the career banks at a rating before the next opens: the ratings' pace. */
  takesPerRating: 3,
  /**
   * Full takes from a fresh save to the picture's wrap, when R's lead falls: about two
   * hours of eight-minute takes. The shop is sized to be bought out there.
   */
  arcTakes: 15,

  /** Clout a full take at G pays: sized for readable shop prices. */
  cloutPerTake: 80,
} as const;

// ─── Opposition curves: scaled-opposition over the scene index ───

/** The scene index `t` seconds into a take entered `depth` scenes deep. */
export function sceneAt(t: number, depth = 0): number {
  return Math.floor(t / ANCHORS.sceneSeconds) + depth;
}

export function extraHp(scene: number): number {
  return ANCHORS.hp0 * ANCHORS.hpGrowth ** scene;
}

export function arrivalRate(scene: number): number {
  return ANCHORS.spawn0 * ANCHORS.spawnGrowth ** scene;
}

export function contactDps(scene: number): number {
  return ANCHORS.contact0 * ANCHORS.contactGrowth ** scene;
}

/** Hp a second walking onto the floor: what the rigs must out-run. Hp, arrivals and the roster mix. */
export function hpFlux(scene: number): number {
  return arrivalRate(scene) * extraHp(scene) * meanHpFactor(Math.floor(scene));
}

// ─── Draft schedule ───
// Rewrite gaps grow geometrically from `firstBeat` to `lastInterval`. The beat count is a
// consequence: the largest K whose schedule ends inside the take.

export interface BeatSchedule {
  count: number;
  ratio: number;
  times: number[];
}

export function solveBeatSchedule(): BeatSchedule {
  const { firstBeat, lastInterval, takeSeconds } = ANCHORS;
  let best: BeatSchedule = { count: 1, ratio: 1, times: [firstBeat] };
  for (let k = 2; k < 60; k++) {
    const ratio = (lastInterval / firstBeat) ** (1 / (k - 1));
    const times: number[] = [];
    let t = 0;
    for (let i = 0; i < k; i++) {
      t += firstBeat * ratio ** i;
      times.push(t);
    }
    if (t > takeSeconds) break;
    best = { count: k, ratio, times };
  }
  return best;
}

export const BEATS = solveBeatSchedule();

// ─── Damage: the per-level rig gain is solved, not chosen ───

/** The opening rig's damage a second: the margin over scene-0 flux. Every rig's level-1 damage equals it, so a rig choice is about shape. */
export const DPS0 = ANCHORS.ttkMargin * hpFlux(0);

/** Damage a second the scene demands of a zero-meta take. */
export function requiredDps(scene: number): number {
  return ANCHORS.ttkMargin * hpFlux(scene);
}

/** Offensive rewrites by the last beat: the share of beats that is not defensive. */
export const OFFENSIVE_PICKS = Math.round(BEATS.count * (1 - ANCHORS.defenseShare));

/**
 * Mean loadout after j offensive picks, in units of DPS0: alternate a new rig, while a slot
 * is free, with levelling the deepest rig not yet maxed. Depth first, because the per-level
 * gain is geometric.
 */
export function loadoutDps(j: number, levelGain: number): number {
  const levels = [1];
  for (let p = 0; p < j; p++) {
    const wantNew = p % 2 === 0 && levels.length < ANCHORS.rigSlots;
    if (wantNew) levels.push(1);
    else {
      let deep = -1;
      for (let i = 0; i < levels.length; i++) {
        if (levels[i]! < ANCHORS.rigMaxLevel && (deep < 0 || levels[i]! > levels[deep]!)) deep = i;
      }
      if (deep >= 0) levels[deep]!++;
    }
  }
  return levels.reduce((a, l) => a + levelGain ** (l - 1), 0);
}

/** Solves the level gain so the mean loadout at the last beat meets the last scene's demand. */
export function solveLevelGain(): number {
  const lastScene = sceneAt(BEATS.times[BEATS.count - 1]!);
  const target = requiredDps(lastScene) / DPS0;
  let lo = 1;
  let hi = 10;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (loadoutDps(OFFENSIVE_PICKS, mid) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Damage multiplier per rig level. Solved: change an anchor, never this. */
export const LEVEL_GAIN = solveLevelGain();

// ─── Income and the rewrite ladder ───

/** Reels banked a second at a scene. */
export function incomeRate(scene: number): number {
  const shot = 1 + ANCHORS.shotShare * (ANCHORS.shotMult - 1);
  return arrivalRate(scene) * meanHpFactor(scene) * ANCHORS.incomeShare * shot;
}

/** Seconds before the first arrival walks into the opening rig's reach. */
export const INCOME_LAG = (ANCHORS.spawnRadius - ANCHORS.openingReach) / ANCHORS.openingSpeed;

/** Cumulative reels banked by time t, integrated scene by scene, trailing arrivals by the walk-in. */
export function cumulativeIncome(t: number, depth = 0): number {
  let total = 0;
  let at = 0;
  t -= INCOME_LAG;
  while (at < t) {
    const sceneEnd = (Math.floor(at / ANCHORS.sceneSeconds) + 1) * ANCHORS.sceneSeconds;
    const span = Math.min(sceneEnd, t) - at;
    total += incomeRate(sceneAt(at, depth)) * span;
    at += span;
  }
  return total;
}

/**
 * The ladder: reels from level n to n+1 is x0·r^(n−1), so reels to reach level n+1 from
 * level 1 is x0·(rⁿ−1)/(r−1). Two anchors fix the two parameters: level 2 lands on beat 1
 * and level K+1 on beat K. The beats between land near, not on.
 */
export function solveLadder(): { x0: number; r: number } {
  const x0 = cumulativeIncome(BEATS.times[0]!);
  const target = cumulativeIncome(BEATS.times[BEATS.count - 1]!);
  const k = BEATS.count;
  let lo = 1.0001;
  let hi = 3;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    const total = (x0 * (mid ** k - 1)) / (mid - 1);
    if (total < target) lo = mid;
    else hi = mid;
  }
  return { x0, r: (lo + hi) / 2 };
}

export const LADDER = solveLadder();

/** Reels to reach a level from level 1: the ladder's closed form. */
export function reelsForLevel(level: number): number {
  const n = level - 1;
  return (LADDER.x0 * (LADDER.r ** n - 1)) / (LADDER.r - 1);
}

/** Predicted time of the k-th rewrite (1-based), read back off the ladder. */
export function predictedBeatTime(k: number): number {
  const need = reelsForLevel(k + 1);
  let lo = 0;
  let hi = ANCHORS.takeSeconds * 2;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (cumulativeIncome(mid) < need) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// ─── Meta: clout and the agency ───

/** Reels per point of clout: a full take at G pays `cloutPerTake`. Deeper takes pay more, because more walks on. */
export const REELS_PER_CLOUT = cumulativeIncome(ANCHORS.takeSeconds) / ANCHORS.cloutPerTake;

export interface AgencyAnchor {
  id: 'effects-budget' | 'padding' | 'cardio' | 'boom-mic' | 'script-doctor';
  /** Price of the first level, in full takes of clout. */
  takesForFirst: number;
  maxLevel: number;
}

/** The agency's prices: the cheapest perk costs half a take. */
export const AGENCY_ANCHORS: readonly AgencyAnchor[] = [
  { id: 'effects-budget', takesForFirst: 0.5, maxLevel: 5 },
  { id: 'padding', takesForFirst: 0.5, maxLevel: 5 },
  { id: 'cardio', takesForFirst: 0.625, maxLevel: 4 },
  { id: 'boom-mic', takesForFirst: 0.625, maxLevel: 3 },
  { id: 'script-doctor', takesForFirst: 2, maxLevel: 1 },
];

/** Star signings, in full takes of clout. */
export const STAR_TAKES = { pyro: 1.25, wirework: 2.5 } as const;

/** The whole shop, agency and stars, in full takes at G, at a price growth. */
function shopTotal(growth: number): number {
  let total = 0;
  for (const a of AGENCY_ANCHORS) {
    for (let l = 0; l < a.maxLevel; l++) total += a.takesForFirst * growth ** l;
  }
  return total + STAR_TAKES.pyro + STAR_TAKES.wirework;
}

/** Per-level agency price growth that makes the whole shop cost `shopTakes` full takes. */
export function solveAgencyGrowth(shopTakes: number): number {
  let lo = 1;
  let hi = 4;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (shopTotal(mid) < shopTakes) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export function agencyBaseCost(a: AgencyAnchor): number {
  return Math.round(a.takesForFirst * ANCHORS.cloutPerTake);
}

/**
 * What one agency level buys. The survival perks cost the schedule nothing; Effects Budget
 * raises damage, which holds time-to-kill; Personal Trainer and Sound Guy move η, which
 * front-loads the beats, bounded by their level caps.
 */
export const AGENCY_STEP = {
  'effects-budget': 0.12,
  padding: 0.15,
  cardio: 0.06,
  'boom-mic': 0.2,
} as const;

/** What one stack of each rewrite perk buys. */
export const PERK_STEP = {
  stamina: 0.25,
  cardio: 0.08,
  'boom-mic': 0.3,
  'crew-call': 0.08,
  'bigger-charges': 0.15,
} as const;

/** Stacks each of the two damage perks takes. */
export const OFFENSIVE_PERK_STACKS = 5;

// ─── The ratings: depth solved from the career's agency ───
// A rating enters the same curves deeper. Its depth is solved so the take clears its floor
// by the last beat as well as a zero-meta take clears G, with the damage the agency adds
// by the time the rating opens. That agency comes from a model career: `takesPerRating`
// full takes a rating, each paying its depth's income, spent by the reference agent (the
// next star once affordable, else the cheapest agency level).
//
// Clearing is not surviving: an improvising star kites an uncleared crowd, and the
// Veteran with nothing bought survives deeper than the clearing line. The opening rig is
// what binds the short-reach stars, and the solved depths stay inside it.

/** Rewrite level a take reaches by `t` at a depth: the ladder read off the income model. */
export function levelAt(t: number, depth = 0): number {
  const reels = cumulativeIncome(t, depth);
  return 1 + Math.floor(Math.log(1 + (reels * (LADDER.r - 1)) / LADDER.x0) / Math.log(LADDER.r));
}

/** Rig picks a full harness takes: three new rigs and four levels on each of four. */
const RIG_PICKS = ANCHORS.rigSlots - 1 + ANCHORS.rigSlots * (ANCHORS.rigMaxLevel - 1);

/** The loadout's damage in DPS0 after `offensive` picks: rigs first, then the two damage perks in turn. */
export function pickedDps(offensive: number): number {
  const rigs = Math.min(offensive, RIG_PICKS);
  const extra = offensive - rigs;
  const charges = Math.min(OFFENSIVE_PERK_STACKS, Math.ceil(extra / 2));
  const crew = Math.min(OFFENSIVE_PERK_STACKS, Math.floor(extra / 2));
  return (
    loadoutDps(rigs, LEVEL_GAIN) *
    (1 + PERK_STEP['bigger-charges'] * charges) *
    (1 + PERK_STEP['crew-call'] * crew)
  );
}

/** Damage a take delivers at the last beat over what its scene demands, at a depth and an agency damage multiplier. */
export function clearance(depth: number, damage = 1): number {
  const last = BEATS.times[BEATS.count - 1]!;
  const offensive = Math.round((levelAt(last, depth) - 1) * (1 - ANCHORS.defenseShare));
  return (DPS0 * pickedDps(offensive) * damage) / requiredDps(sceneAt(last, depth));
}

export interface RatingStep {
  depth: number;
  /** Full takes banked before the rating opens. */
  takesBefore: number;
  /** The agency's damage multiplier when it opens. */
  damage: number;
  /** Agency levels held when it opens. */
  agency: Record<AgencyAnchor['id'], number>;
  /** Clout a full take at this depth pays, the rating's pay included. */
  payPerTake: number;
}

export interface CareerModel {
  /** One step a rating, as the career meets it. */
  ratings: RatingStep[];
  /** The agency, its damage and its health at the wrap, after `arcTakes` takes. */
  wrap: { agency: RatingStep['agency']; damage: number; health: number };
  /** Clout the whole arc pays, in full takes at G. */
  arcPay: number;
}

const agencyDamage = (levels: RatingStep['agency']) =>
  1 + AGENCY_STEP['effects-budget'] * levels['effects-budget'];
const agencyHealth = (levels: RatingStep['agency']) => 1 + AGENCY_STEP.padding * levels.padding;

/**
 * The model career at an agency price growth: `takesPerRating` full takes at each rating
 * below R, then R until `arcTakes`, each paying its depth's income at its rating's pay and
 * spent by the reference agent (the next star once affordable, else the cheapest agency
 * level). Each rating's depth is solved on the agency held when it opens.
 */
export function projectCareer(growth: number): CareerModel {
  const levels = Object.fromEntries(AGENCY_ANCHORS.map((a) => [a.id, 0])) as RatingStep['agency'];
  const stars = [STAR_TAKES.pyro, STAR_TAKES.wirework].map((t) =>
    Math.round(t * ANCHORS.cloutPerTake),
  );
  const price = (a: AgencyAnchor) =>
    levels[a.id] >= a.maxLevel ? Infinity : Math.floor(agencyBaseCost(a) * growth ** levels[a.id]);
  const target = clearance(0);
  const ratings: RatingStep[] = [];
  let clout = 0;
  let arcPay = 0;
  const last = RATINGS.length - 1;
  for (let r = 0; r < RATINGS.length; r++) {
    const damage = agencyDamage(levels);
    let depth = 0;
    if (r > 0) {
      let lo = 0;
      let hi = 12;
      for (let i = 0; i < 50; i++) {
        const mid = (lo + hi) / 2;
        if (clearance(mid, damage) >= target) lo = mid;
        else hi = mid;
      }
      depth = lo;
    }
    const payPerTake =
      (cumulativeIncome(ANCHORS.takeSeconds, depth) / REELS_PER_CLOUT) * RATINGS[r]!.pay;
    ratings.push({
      depth,
      takesBefore: r * ANCHORS.takesPerRating,
      damage,
      agency: { ...levels },
      payPerTake,
    });
    const takes =
      r < last ? ANCHORS.takesPerRating : ANCHORS.arcTakes - last * ANCHORS.takesPerRating;
    for (let k = 0; k < takes; k++) {
      clout += payPerTake;
      arcPay += payPerTake;
      for (;;) {
        if (stars.length && stars[0]! <= clout) {
          clout -= stars.shift()!;
          continue;
        }
        const next = [...AGENCY_ANCHORS].sort((a, b) => price(a) - price(b))[0]!;
        if (price(next) > clout) break;
        clout -= price(next);
        levels[next.id]++;
      }
    }
  }
  return {
    ratings,
    wrap: { agency: { ...levels }, damage: agencyDamage(levels), health: agencyHealth(levels) },
    arcPay: arcPay / ANCHORS.cloutPerTake,
  };
}

/**
 * The shop's size and the model career together: the shop costs what the arc pays, so the
 * reference agent buys it out at the wrap. The career's pay reads the depths, which read
 * the agency, which reads the prices, so this iterates; the depths barely move the pay,
 * and it settles in a few rounds.
 */
function solveShop(): { growth: number; career: CareerModel } {
  let growth = solveAgencyGrowth(ANCHORS.arcTakes);
  let career = projectCareer(growth);
  for (let i = 0; i < 20; i++) {
    const next = solveAgencyGrowth(career.arcPay);
    if (Math.abs(next - growth) < 1e-9) break;
    growth = next;
    career = projectCareer(growth);
  }
  return { growth, career };
}

const SHOP = solveShop();

/** Per-level agency price growth. Solved: change an anchor, never this. */
export const AGENCY_GROWTH = SHOP.growth;

export const CAREER_MODEL = SHOP.career;
export const CAREER: readonly RatingStep[] = CAREER_MODEL.ratings;

/**
 * Each rating's lead part: a multiple of a lead's hp. R's lead stands against the wrap's
 * agency as every other lead stands against the agency its rating opens with. The climax
 * is a race between the lead's hp and the double's, so the agency counts as damage times
 * health.
 */
export const LEAD_PART: readonly number[] = CAREER.map((step, r) =>
  r === RATINGS.length - 1
    ? (CAREER_MODEL.wrap.damage * CAREER_MODEL.wrap.health) /
      (step.damage * agencyHealth(step.agency))
    : 1,
);

/** Scenes deep each rating starts, by rating index. Solved: change an anchor, never this. */
export const RATING_DEPTH: readonly number[] = CAREER.map((s) => s.depth);
