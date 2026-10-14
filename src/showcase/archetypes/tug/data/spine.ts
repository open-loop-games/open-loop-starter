// ─── Balance ───
// The spine: every number in a battle derives here from a handful of named anchors. Plain
// arithmetic, no engine. The modules read the anchors through `tunable()` where a probe
// perturbs them, so every derived number follows an override.
//
// Bucket: adversarial zero-sum lane over flat income, a frontage-limited Lanchester clash.
//
//   income        → flat r₀ per keep, × the tithe ladder; ground held pays nothing
//   one release   → B = r₀ · T_horn of troops, formed FILES wide in ranks by troop
//   a clash       → each side loses members at (fighters in reach) × dps / hp,
//                   fighters in reach = min(n, FILES × rows the reach covers)
//   equal value   → per member  hp · dps · F(n_B) / cost = K   at one release's budget
//   the gate      → falls to two mangonels in `breachSeconds`
//   the season    → closes `lastWeekSeconds` after the last week opens; the keep whose gate
//                   lost the larger share yields
//
// Melee strikes from its front rank only, so it fights by the linear law; a bow reaches
// over several ranks, so a small bow wave fights whole, by the square law. Equal value per
// silver at one release's budget is what makes a squad of five weak yeomen worth its price.
// Where a clash happens is not closed: the line is the sum of releases, cover and the
// rival's choices, and the probes measure it.

import { TROOPS, troop, type TroopDef, type TroopId } from './troops';

/** The only hand-picked numbers. */
export const ANCHORS = {
  /** Silver a second each keep's harvest pays, whatever the causeway does: the unit of account. */
  income: 10,
  /** Silver each keep opens a battle with, in seconds of income. */
  startSeconds: 5,
  /** Seconds between one keep's horns. The other keep's sound halfway between. */
  hornSeconds: 10,

  /** The causeway's length in paces; Fairhold stands at 0 and the rival's keep at the far end. */
  causewayLength: 100,
  /** Files a released wave forms across: the width of the causeway in men. */
  files: 3,
  /** Paces between ranks. */
  rankSpacing: 2,
  /** Troops a keep may have in the bailey and on the causeway together. */
  muster: 60,

  /** Display anchor: a yeoman's hp. Fixes K in the equal-value rule and nothing else. */
  yeomanHp: 10,
  /** Damage a troop deals to the troop it beats; it takes the inverse back. */
  counterSharpness: 1.6,
  /** Paces past its reach a knight sees bowmen and charges them. */
  chargeSight: 8,

  /** Damage taken by a defender at its own gate. Cover ramps from this to none at the midpoint. */
  coverAtGate: 0.15,
  /** Share of its damage an ordinary troop deals to a gate. */
  gateShare: 0.25,
  /** Share of its damage a mangonel deals to troops; at the gate it deals its full damage. */
  siegeVsTroops: 0.5,
  /** Paces from the enemy gate at which an engine throws at it, over any wall or line. */
  engineThrow: 60,
  /** Seconds two mangonels at the gate take to breach it. Sizes the gate. */
  breachSeconds: 24,
  /** The gatehouse bows: damage a second on the nearest attacker, and their reach in paces. */
  gatehouseDps: 5,
  gatehouseReach: 15,
  /** Share of a raider's gate damage it loots from the defender's treasury. */
  lootShare: 0.5,

  /** The campaign season's length; the last week follows it. */
  seasonSeconds: 150,
  /** The last week: harvests and musters step through `surge`; at its end the season closes. */
  lastWeekSeconds: 120,
  surge: [2, 3],

  /** Each raise of the tithe adds this much base income. */
  titheStep: 0.25,
  /** The first raise pays back in this fraction of the season. */
  tithePaybackFraction: 1 / 3,
  /** The Nth raise pays back in exactly one season; past it, raising is a bad bet. */
  tithesPerSeason: 4,

  /** Renown for a victory over the first lord; grows linearly with the rung. */
  renownBase: 10,
  /** Share of a victory's renown a defeat still pays. */
  defeatShare: 0.4,
  /** Per-rung growth of the rival's harvest, and per-level growth of a strength boon. */
  rungGrowth: 1.12,
  /** Gate hp a Stone Curtain level adds. */
  curtainStep: 0.25,
  /** Fields on the march, three a lord; taking the last keep is the ending. */
  rungs: 15,
  /** Strength boon levels a field the lords grow by: the ladder's steepness. */
  boonsPerField: 0.85,

  /** Seconds a keep weapon takes to charge. */
  weaponCharge: 45,
  /** The trebuchet's stone: damage to each member in the foremost `trebuchetRanks` ranks. */
  trebuchetDamage: 30,
  trebuchetRanks: 2,
  /** A champion's hp and damage, as multiples of a member of its troop. */
  championHp: 18,
  championDps: 4,
  /** Share of the silver the waiting seconds would have paid that an early horn costs. */
  earlyHornFee: 0.5,
  /** Walking speed in a ford; a knight's in stakes, where it cannot charge. */
  fordSpeed: 2 / 3,
  stakesSpeed: 0.5,
} as const;

const A = ANCHORS;

export const startSilver = A.startSeconds * A.income;
/** One release's budget at base income. */
export const releaseBudget = A.income * A.hornSeconds;

// ─── The clash ───
// A member's cost is its squad's price split evenly. Fighters in reach cap at the files
// times the ranks its reach covers. Equal value per silver at one release's budget sets
// hp · dps per member; the role's duel time D = hp / dps splits it:
//   dps = √(K · c / (F · D)),  hp = D · dps.
// The yeoman's display hp fixes K.

export function memberCost(t: TroopDef): number {
  return (t.costSeconds * A.income) / t.squad;
}

/** Members of a troop that strike at once, out of `n` in the wave. */
export function frontage(t: TroopDef, n: number): number {
  return Math.min(n, A.files * Math.max(1, Math.floor(t.reach / A.rankSpacing)));
}

/** Members one release's budget raises; never under one, so an engine dearer than a release is still one engine. */
const releaseMembers = (t: TroopDef) => Math.max(1, releaseBudget / memberCost(t));
const pike = troop('pike');
const K =
  (A.yeomanHp * (A.yeomanHp / pike.duelSeconds) * frontage(pike, releaseMembers(pike))) /
  memberCost(pike);

export interface MemberStats {
  cost: number;
  hp: number;
  /** Damage a second against troops, before counters and cover. */
  dps: number;
  /** Damage a second against a gate. */
  gateDps: number;
  /** Paces a second. */
  speed: number;
  reach: number;
}

export function memberStats(id: TroopId): MemberStats {
  const t = troop(id);
  const c = memberCost(t);
  const dps = Math.sqrt((K * c) / (frontage(t, releaseMembers(t)) * t.duelSeconds));
  return {
    cost: c,
    hp: t.duelSeconds * dps,
    dps: t.breaksWalls ? dps * A.siegeVsTroops : dps,
    gateDps: t.breaksWalls ? dps : dps * A.gateShare,
    speed: A.causewayLength / t.crossSeconds,
    reach: t.reach,
  };
}

/** Damage multiplier `a` deals to `b`. */
export function counterMultiplier(a: TroopId, b: TroopId, sharpness: number): number {
  if (troop(a).beats === b) return sharpness;
  if (troop(b).beats === a) return 1 / sharpness;
  return 1;
}

/**
 * The clash the spine predicts: `na` members of `a` against `nb` of `b`, integrated under
 * the frontage model, with the shorter reach walking the reach gap under fire. Cover is out
 * of it: the clash is read in the open, at the middle.
 */
export function predictClash(a: TroopId, na: number, b: TroopId, nb: number) {
  const A_ = memberStats(a);
  const B_ = memberStats(b);
  const ta = troop(a);
  const tb = troop(b);
  const s = ANCHORS.counterSharpness;
  let x = na;
  let y = nb;
  let t = 0;
  const gap = Math.abs(A_.reach - B_.reach);
  if (A_.reach > B_.reach)
    y -= (frontage(ta, x) * A_.dps * counterMultiplier(a, b, s) * (gap / B_.speed)) / B_.hp;
  if (B_.reach > A_.reach)
    x -= (frontage(tb, y) * B_.dps * counterMultiplier(b, a, s) * (gap / A_.speed)) / A_.hp;
  const dt = 0.05;
  while (x > 0 && y > 0 && t < 600) {
    const dy = (frontage(ta, Math.ceil(x)) * A_.dps * counterMultiplier(a, b, s) * dt) / B_.hp;
    const dx = (frontage(tb, Math.ceil(y)) * B_.dps * counterMultiplier(b, a, s) * dt) / A_.hp;
    x -= dx;
    y -= dy;
    t += dt;
  }
  if (x > 0) return { winner: 'a' as const, kept: x / na, seconds: t };
  if (y > 0) return { winner: 'b' as const, kept: y / nb, seconds: t };
  return { winner: null, kept: 0, seconds: t };
}

// ─── Cover and the season ───
// Cover ramps with depth, from none at the midpoint to `coverAtGate` at the keep: the
// ramparts' reach. A line pushed home stiffens; a line at the middle moves freely. The spring
// is 1/coverAtGate strong, more than any advantage the march hands out, so a line never
// reaches a gate on strength alone. Engines throw from `engineThrow` paces: a line held past
// the middle puts its engines in reach, and that is what scores. The last week surges
// harvests and musters, never damage, so the host that holds ground then converts it.

/** Damage multiplier on a defender `depth` of the way from the midpoint to its own gate. */
export function coverAt(depth: number, atGate: number): number {
  return 1 - (1 - atGate) * Math.max(0, Math.min(1, depth));
}

/** Every blow's multiplier at battle second `t`: 1 in season, doubling through the last week. */
/** The harvest and muster multiplier at battle second `t`: 1 in season, then the surge steps. */
export function seasonSurge(t: number, season: number = A.seasonSeconds): number {
  if (t <= season) return 1;
  const step = Math.floor(((t - season) / A.lastWeekSeconds) * A.surge.length);
  return A.surge[Math.min(step, A.surge.length - 1)]!;
}

/** The second the season closes and the gate tiebreak is read. */
export const seasonClose = (season: number = A.seasonSeconds) => season + A.lastWeekSeconds;

// ─── The gate ───
// Two mangonels at the gate breach it in `breachSeconds`: H = 2 · d_siege · breachSeconds.
// Ordinary troops batter it at `gateShare` of their damage, so a breach without engines
// takes a host standing at the gate under the gatehouse bows.

export const gateHp = 2 * memberStats('siege').gateDps * A.breachSeconds;

// ─── The tithe (in-battle escalating-price income ladder) ───
// Each raise adds e·r₀ income. Payback of raise n = c₀·m^n / (e·r₀).
//   payback(0) = f·S         ⇒ c₀ = f·S·e·r₀
//   payback(N−1) = S         ⇒ m = (1/f)^(1/(N−1))

export const titheBaseCost = A.tithePaybackFraction * A.seasonSeconds * A.titheStep * A.income;
export const titheCostRatio = Math.pow(1 / A.tithePaybackFraction, 1 / (A.tithesPerSeason - 1));

// ─── The Chronicle (meta-progression across battles) ───
// Renown per battle: R(r) = R₀·(1 + r) for a victory, × defeatShare for a defeat; never
// debited. Volumes follow a triangular ladder, xp(L) = R₀·L(L+1)/2, so a lord who wins every
// rung in order reaches volume r + 1 after rung r. One boon a volume.

export function renownFor(rung: number, won: boolean): number {
  return A.renownBase * (1 + rung) * (won ? 1 : A.defeatShare);
}

// ─── Scaled opposition ───
// The lord's men grow in hp and damage by g^(b·rung), b strength boon levels a field. Under a
// full muster a harvest buys little, so the rung binds into vigor, where it bites whatever
// the muster. A Drilled Levies level multiplies Fairhold's the same way; Fertile Fields buys
// income, which binds while losses at the line consume the harvest. The march stops growing
// the lords at its end; the boons do not stop, so a run of defeats always buys a way through.

export function rivalScale(
  rung: number,
  growth: number,
  perField: number = A.boonsPerField,
): number {
  return Math.pow(growth, perField * Math.min(rung, A.rungs));
}

/** Every troop's member stats, for the projection's table. */
export function memberTable(): Record<TroopId, MemberStats> {
  return Object.fromEntries(TROOPS.map((t) => [t.id, memberStats(t.id)])) as Record<
    TroopId,
    MemberStats
  >;
}
