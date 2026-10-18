/**
 * The balance spine: every economy and combat number in the game, derived from
 * a few named anchors. Plain arithmetic, no engine construction, no live state.
 *
 * Coverage boundary:
 * - Bucket, economy: pure closed-form. The hustler ladder is geometric
 *   (`cost(k) = c0 · m^k`) and income is linear in hustlers; the supply cap
 *   splices the training rate to zero at the cap (piecewise closed-form).
 * - Bucket, combat: strategy-space integration. For a fixed pair of army
 *   compositions and focus orders, a district fight is Lanchester's square law
 *   and closes (`fightSeconds`, `survivorsOfWinner`). Siege against a turret
 *   is a linear-attrition integral and closes (`minSiegeForce`).
 * - Where the closed form stops: the joint choice of two seats (what each
 *   builds, where it sends units, when it assaults), fog of war, and district
 *   control flipping under both. None of that projects.
 * - What measures the remainder: `src/probe.ts` plays every contract under the
 *   shipping policies and prints each beat's time against `matchSeconds`.
 */

// ─── Anchors ───────────────────────────────────────────────────────────────
// Chosen, not derived. Everything below them is arithmetic over them.

/** Scrip per second per hustler. Defines the unit: one scrip is one hustler-second. */
export const HUSTLER_RATE = 1;
/** Hustlers a crew opens a match with. */
export const START_HUSTLERS = 5;
/** The first hustler pays back its price in this many seconds. */
export const FIRST_PAYBACK_S = 30;
/** Cost doublings across the hustlers a reference match buys. */
export const HUSTLER_DOUBLINGS = 3;
/** Hustlers a reference match buys before payback passes the horizon. */
export const HUSTLER_BUYS = 24;
/** A reference match lasts this long against a contract of equal economy. */
export const MATCH_S = 480;
/** Mid-match landmark the army anchor is read at. */
export const MID_S = 240;
/** Share of income the reference crew spends on hustlers while they still pay back. */
export const ECON_SHARE = 0.5;
/** A hustler is not worth buying once its payback passes this. */
export const PAYBACK_HORIZON_S = 150;
/** Share of army-side spend that goes to buildings, squats and research, not units. */
export const OVERHEAD_SHARE = 0.3;
/** Units the reference crew fields at `MID_S`. */
export const MID_ARMY = 24;
/** Seconds one training building takes per unit. */
export const TRAIN_S = 20;
/** A crew opens with four first-hustlers' worth of scrip. */
export const START_SCRIP = 4 * FIRST_PAYBACK_S * HUSTLER_RATE;
/** Scrip value of one aether, so mixed costs stay value-equal. */
export const AETHER_PRICE = 2;
/** Aether per second per ley tap. */
export const TAP_RATE = 0.5;
/** A ley tap pays back (at `AETHER_PRICE`) in this many seconds. */
export const TAP_PAYBACK_S = 40;
/** Display scale of combat: damage per second of one basic unit. */
export const UNIT_DPS = 5;
/** Damage multiplier of a counter pairing, and of a resisted one. */
export const COUNTER = 1.5;
export const RESIST = 0.6;
/** Two equal-size squads, one countering the other, resolve in this long. */
export const FIGHT_S = 20;
/** A siege force this size razes a headquarters in `SIEGE_S`, ignoring its turret. */
export const SIEGE_FORCE = 15;
export const SIEGE_S = 60;
/** Below this many units, a siege dies to the turret before the headquarters falls. */
export const MIN_SIEGE_FORCE = 7;
/** A squad of `REF_PRESENCE` units takes an empty district in `CAPTURE_S`. */
export const CAPTURE_S = 15;
export const REF_PRESENCE = 5;
/** An astral scout reveals the whole map this long, then rests for the cooldown. */
export const SCOUT_S = 20;
export const SCOUT_COOLDOWN_S = 45;
/** A scout costs what one ley tap seeps in the scout's own duration. */
export const scoutCost = SCOUT_S * TAP_RATE;
/**
 * A held district pays what this many hustlers pay. Four was retired: holding
 * all three districts then out-earned the hustler economy by ~70% and every
 * probed match went to whoever took turf first (2026-10-18 sweep, 16 cells).
 */
export const TURF_HUSTLERS = 2;
/** Supply cap with no squats, and what each squat adds. */
export const SUPPLY_BASE = 12;
export const SUPPLY_PER_SQUAT = 8;
/** Enforcer value, in basic units. Value-equal under the square law, so dps and hp scale by its root squared. */
export const ENFORCER_VALUE = 2.5;

// ─── Economy ───────────────────────────────────────────────────────────────

/** `c0 = payback · rate`: the first hustler costs what it pays in `FIRST_PAYBACK_S`. */
export const hustlerBaseCost = FIRST_PAYBACK_S * HUSTLER_RATE;
/** `m = 2^(K/N)`: `HUSTLER_DOUBLINGS` doublings across `HUSTLER_BUYS` purchases. */
export const hustlerRatio = 2 ** (HUSTLER_DOUBLINGS / HUSTLER_BUYS);

/** One step of the reference walk: what the crew holds at second `t`. */
export interface WalkPoint {
  t: number;
  hustlers: number;
  income: number;
  /** Cumulative scrip spent on the army side (units, buildings, squats, research). */
  armySpend: number;
}

/**
 * The reference crew's economy, walked second by second: `ECON_SHARE` of income
 * to hustlers while the next one pays back inside `PAYBACK_HORIZON_S`, the rest
 * (and everything after) to the army side. Turf income is left out: it is the
 * strategy-space remainder the probe measures.
 */
export function walkEconomy(seconds: number, incomeMult = 1): WalkPoint[] {
  const out: WalkPoint[] = [];
  let hustlers = START_HUSTLERS;
  let bought = 0;
  let econPurse = START_SCRIP;
  let armySpend = 0;
  for (let t = 0; t <= seconds; t++) {
    const income = hustlers * HUSTLER_RATE * incomeMult;
    out.push({ t, hustlers, income, armySpend });
    const next = hustlerBaseCost * hustlerRatio ** bought;
    const pays = next / (HUSTLER_RATE * incomeMult) < PAYBACK_HORIZON_S;
    const share = pays ? ECON_SHARE : 0;
    econPurse += income * share;
    armySpend += income * (1 - share);
    if (pays && econPurse >= next) {
      econPurse -= next;
      hustlers += 1;
      bought += 1;
    }
  }
  return out;
}

const walk = walkEconomy(MATCH_S);

/** `u = (1 − overhead) · armySpend(MID) / MID_ARMY`: one basic unit's value in scrip. */
export const unitValue = ((1 - OVERHEAD_SHARE) * walk[MID_S].armySpend) / MID_ARMY;

/** Army-side income per second at mid-match: what the training buildings must convert. */
const midArmyIncome = walk[MID_S].income;
/** `B = income · TRAIN_S / u`: buildings that convert mid-match income into units with nothing idle. */
export const buildingsAtMid = (midArmyIncome * TRAIN_S) / unitValue;

/** A training building costs four of its units: it pays back in four trained units' worth of throughput. */
export const buildingBaseCost = 4 * unitValue;
/**
 * `m_b = (cost of the B-th building / first)^(1/(B−1))`, solved so the B-th
 * building costs `PAYBACK_HORIZON_S` of mid-match income: past that a crew
 * trains with what it has.
 */
export const buildingRatio =
  ((PAYBACK_HORIZON_S * midArmyIncome) / 4 / buildingBaseCost) **
  (1 / Math.max(1, buildingsAtMid - 1));

/** Squats: the first costs two units, and the ratio keeps the squat that reaches `MID_ARMY`'s cap at four units. */
export const squatBaseCost = 2 * unitValue;
const squatsForMidArmy = Math.ceil((MID_ARMY * 1.25 - SUPPLY_BASE) / SUPPLY_PER_SQUAT);
export const squatRatio = 2 ** (1 / Math.max(1, squatsForMidArmy - 1));

/** `c_tap = payback · rate · price`. */
export const tapBaseCost = TAP_PAYBACK_S * TAP_RATE * AETHER_PRICE;
/** Each tap after the first costs a third more; six taps is the node limit. */
export const tapRatio = 4 / 3;
export const TAP_LIMIT = 6;

/** A held district's scrip rate. */
export const turfRate = TURF_HUSTLERS * HUSTLER_RATE;

// ─── Combat ────────────────────────────────────────────────────────────────

/**
 * Lanchester square law. Each side's casualty rate is the other's count times
 * `k · eff`, with `k = dps / hp`. For equal starting counts and a counter
 * pairing (winner eff `COUNTER`, loser eff `RESIST`), the loser hits zero at
 * `tanh(γt) = √(RESIST/COUNTER)`, `γ = k·√(COUNTER·RESIST)`. Solved for k:
 * `k = atanh(√(R/C)) / (FIGHT_S · √(C·R))`.
 */
export const killRate =
  Math.atanh(Math.sqrt(RESIST / COUNTER)) / (FIGHT_S * Math.sqrt(COUNTER * RESIST));
/** `hp = dps / k`. */
export const unitHp = UNIT_DPS / killRate;

/** Seconds until the weaker side of a two-squad fight is gone, under the square law. */
export function fightSeconds(
  a: number,
  b: number,
  effAonB: number,
  effBonA: number,
  k = killRate,
): number {
  const alpha = k * effAonB;
  const beta = k * effBonA;
  const strengthA = alpha * a * a;
  const strengthB = beta * b * b;
  const gamma = Math.sqrt(alpha * beta);
  const ratio =
    strengthA >= strengthB ? (b / a) * Math.sqrt(beta / alpha) : (a / b) * Math.sqrt(alpha / beta);
  return Math.atanh(Math.min(ratio, 0.999999)) / gamma;
}

/** Survivors of the stronger side: `√(N_w² − (eff_l/eff_w)·N_l²)`. */
export function survivorsOfWinner(a: number, b: number, effAonB: number, effBonA: number): number {
  const sa = effAonB * a * a;
  const sb = effBonA * b * b;
  return sa >= sb
    ? Math.sqrt(a * a - (effBonA / effAonB) * b * b)
    : Math.sqrt(b * b - (effAonB / effBonA) * a * a);
}

/** `H = SIEGE_FORCE · dps · SIEGE_S`. */
export const hqIntegrity = SIEGE_FORCE * UNIT_DPS * SIEGE_S;
/**
 * A siege of n units under a turret of dps D loses `D/hp` units a second, so it
 * deals at most `dps·hp·n²/(2D)` before it is gone. Setting that to `H` at
 * `n = MIN_SIEGE_FORCE` gives `D = MIN² · dps · hp / (2H)`.
 */
export const turretDps = (MIN_SIEGE_FORCE ** 2 * UNIT_DPS * unitHp) / (2 * hqIntegrity);

/** The smallest siege that razes `H` under turret `D`: `n = √(2·H·D / (dps·hp))`. */
export function minSiegeForce(h = hqIntegrity, d = turretDps, dps = UNIT_DPS, hp = unitHp): number {
  return Math.sqrt((2 * h * d) / (dps * hp));
}

/** Control per second a full `REF_PRESENCE` squad adds to an uncontested district (control spans −1..1). */
export const captureRate = 1 / CAPTURE_S;

/** Enforcer stats: value `V` under the square law needs `dps·hp` scaled by `V²`, split evenly. */
export const enforcerDps = UNIT_DPS * ENFORCER_VALUE;
export const enforcerHp = unitHp * ENFORCER_VALUE;

// ─── Contracts ─────────────────────────────────────────────────────────────

/**
 * The opposing crew's income multiplier per contract: a ladder that climbs to
 * parity. A ladder ending above parity (0.8 → 1.25, on the theory that the
 * player's countering would make up the gap) was retired: the 2026-10-18 sweep
 * (4 contracts × 7 multipliers, shipping automation on the player seat) lost
 * every contract at ×1.1, so countering is worth under a tenth of income.
 */
export const CONTRACT_INCOME = [0.8, 0.9, 0.95, 1.0];

/** A spine landmark the probe prints beside the measured beat. */
export interface Landmark {
  beat: string;
  predictedS: number;
}

/**
 * Predicted landmarks for the reference crew: last hustler, the army reaching
 * a minimum siege force, and a match at `MATCH_S`.
 */
export function landmarks(): Landmark[] {
  const finalHustlers = walk[MATCH_S].hustlers;
  const lastHustler = walk.findIndex((p) => p.hustlers >= finalHustlers);
  const unitsAt = (t: number) =>
    ((1 - OVERHEAD_SHARE) * walk[Math.min(t, MATCH_S)].armySpend) / unitValue;
  const siegeReady = walk.findIndex((p) => unitsAt(p.t) >= MIN_SIEGE_FORCE + REF_PRESENCE);
  return [
    { beat: 'econ plateau (hustler payback past horizon)', predictedS: lastHustler },
    { beat: 'army reaches a siege force plus a holding squad', predictedS: siegeReady },
    { beat: 'match ends (equal economy)', predictedS: MATCH_S },
  ];
}

/** The whole spine, for the probe and the README. */
export function describeSpine(): Record<string, number> {
  return {
    hustlerBaseCost,
    hustlerRatio,
    unitValue,
    buildingsAtMid,
    buildingBaseCost,
    buildingRatio,
    squatBaseCost,
    squatRatio,
    tapBaseCost,
    turfRate,
    killRate,
    unitHp,
    hqIntegrity,
    turretDps,
    minSiegeForce: minSiegeForce(),
    counterFightS: fightSeconds(10, 10, COUNTER, RESIST),
    counterSurvivorsOf10: survivorsOfWinner(10, 10, COUNTER, RESIST),
    enforcerDps,
    enforcerHp,
    midIncome: walk[MID_S].income,
    endIncome: walk[MATCH_S].income,
  };
}
