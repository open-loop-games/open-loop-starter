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
  /** Collection efficiency: a driver output, assumed here. Seed 7, takes 1–3 of the cell's pilot: 0.64–0.71. */
  eta: 0.68,
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

  /** A rating starts the take this many scenes deeper into the curve. */
  ratingSceneOffset: 1.5,

  /** Clout a baseline take pays: sized for readable shop prices. */
  cloutPerBaselineTake: 40,
  /** Seconds a zero-meta first take is assumed to last before it wipes out. */
  baselineTakeSeconds: 270,
  /** Takes of baseline payout that buy the whole agency. */
  shopTakes: 36,
} as const;

// ─── Opposition curves: scaled-opposition over the scene index ───

export function ratingSceneOffsetFor(rating: number): number {
  return ANCHORS.ratingSceneOffset * rating;
}

export function sceneAt(t: number, rating = 0): number {
  return Math.floor(t / ANCHORS.sceneSeconds) + ratingSceneOffsetFor(rating);
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

/** Reels a second at a scene, assuming the rigs keep pace so kills match arrivals. */
export function incomeRate(scene: number): number {
  const shot = 1 + ANCHORS.shotShare * (ANCHORS.shotMult - 1);
  return arrivalRate(scene) * meanHpFactor(scene) * ANCHORS.eta * shot;
}

/** Seconds before the first arrival walks into the opening rig's reach. */
export const INCOME_LAG = (ANCHORS.spawnRadius - ANCHORS.openingReach) / ANCHORS.openingSpeed;

/** Cumulative reels banked by time t, integrated scene by scene, trailing arrivals by the walk-in. */
export function cumulativeIncome(t: number, rating = 0): number {
  let total = 0;
  let at = 0;
  t -= INCOME_LAG;
  while (at < t) {
    const sceneEnd = (Math.floor(at / ANCHORS.sceneSeconds) + 1) * ANCHORS.sceneSeconds;
    const span = Math.min(sceneEnd, t) - at;
    total += incomeRate(sceneAt(at, rating)) * span;
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

/** Reels per point of clout: a baseline take pays `cloutPerBaselineTake`. */
export const REELS_PER_CLOUT =
  cumulativeIncome(ANCHORS.baselineTakeSeconds) / ANCHORS.cloutPerBaselineTake;

export interface AgencyAnchor {
  id: 'effects-budget' | 'padding' | 'cardio' | 'boom-mic' | 'script-doctor';
  /** Price of the first level, in baseline takes of clout. */
  takesForFirst: number;
  maxLevel: number;
}

/** The agency's prices: the cheapest perk costs one baseline take. */
export const AGENCY_ANCHORS: readonly AgencyAnchor[] = [
  { id: 'effects-budget', takesForFirst: 1, maxLevel: 5 },
  { id: 'padding', takesForFirst: 1, maxLevel: 5 },
  { id: 'cardio', takesForFirst: 1.25, maxLevel: 4 },
  { id: 'boom-mic', takesForFirst: 1.25, maxLevel: 3 },
  { id: 'script-doctor', takesForFirst: 4, maxLevel: 1 },
];

/** Star signings, in baseline takes of clout. */
export const STAR_TAKES = { pyro: 2.5, wirework: 5 } as const;

function shopTotal(growth: number): number {
  let total = 0;
  for (const a of AGENCY_ANCHORS) {
    for (let l = 0; l < a.maxLevel; l++) total += a.takesForFirst * growth ** l;
  }
  return total + STAR_TAKES.pyro + STAR_TAKES.wirework;
}

/** Per-level agency price growth, solved so the whole shop costs `shopTakes` takes. */
export function solveAgencyGrowth(): number {
  let lo = 1;
  let hi = 4;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (shopTotal(mid) < ANCHORS.shopTakes) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export const AGENCY_GROWTH = solveAgencyGrowth();

export function agencyBaseCost(a: AgencyAnchor): number {
  return Math.round(a.takesForFirst * ANCHORS.cloutPerBaselineTake);
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
