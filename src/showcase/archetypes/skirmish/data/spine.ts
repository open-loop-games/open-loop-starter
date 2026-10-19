/**
 * The balance spine: every economy and combat number in the game, derived from
 * a few named anchors. Plain arithmetic, no engine construction, no live state.
 *
 * Coverage boundary:
 * - Bucket, economy: pure closed-form. Each hustler node (the safehouse, and
 *   every district a crew owns) climbs its own geometric ladder
 *   (`cost(k) = c0 · m^k`) to a limit, and income is linear in hustlers; the
 *   supply cap splices the training rate to zero at the cap (piecewise closed-form).
 * - Bucket, combat: strategy-space integration. For a fixed pair of army
 *   compositions and focus orders, a district fight is Lanchester's square law
 *   and closes (`fightSeconds`, `survivorsOfWinner`). Siege against a turret
 *   is a linear-attrition integral and closes (`minSiegeForce`).
 * - Where the closed form stops: the joint choice of two seats (what each
 *   builds, where it sends units, when it assaults), fog of war, and district
 *   control flipping under both, which decides whose hustlers work each district.
 *   None of that projects; the walks assume one district owned from `REF_TAKE_S`.
 * - The army's ramp closes too, under the reference crew's own rules: floors on
 *   one price ladder and the charter, saved for ahead of hustlers, each floor converting
 *   one unit per `TRAIN_S` (`walkArmy`). Fights, squats and research are left out.
 * - What measures the remainder: `balance/arc-probe.ts` plays every contract
 *   under the shipping policies and prints each beat beside `landmarks()`.
 */

// ─── Anchors ───────────────────────────────────────────────────────────────
// Chosen, not derived. Everything below them is arithmetic over them.

/** Scrip per second per hustler. Defines the unit: one scrip is one hustler-second. */
export const HUSTLER_RATE = 1;
/** Hustlers a crew opens a match with. */
export const START_HUSTLERS = 5;
/** The first hustler pays back its price in this many seconds. */
export const FIRST_PAYBACK_S = 30;
/**
 * Hustlers one node hires: the safehouse, past the ones it opens with, and each district a
 * crew owns. Income saturates at each node and grows by taking ground.
 */
export const NODE_HUSTLERS = 5;
/** Cost doublings across one node's hires: its last pays back in four times the first's. */
export const NODE_DOUBLINGS = 2;
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
/**
 * Units of value the reference crew's army-side spend buys by `MID_S`. It defines a
 * unit's value; floors cannot convert that spend so fast, so the army the crew fields
 * by then is smaller (`walkArmy`).
 */
export const MID_ARMY = 24;
/** Seconds one training floor takes per unit of value. */
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
/**
 * Damage multiplier of a counter pairing, and of a resisted one. At 1.5 / 0.6 the
 * pairing rewarded no reading of the rival: counter fit 1.17 for a seat that bent its
 * mix toward counters against 1.14 for one that did not (2026-10-18 loop probe).
 */
export const COUNTER = 2;
export const RESIST = 0.5;
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
/** The reference crew owns one district from this second: the first take the arc probe records. */
export const REF_TAKE_S = 190;
/** Supply cap with no squats, and what each squat adds. */
export const SUPPLY_BASE = 12;
export const SUPPLY_PER_SQUAT = 8;
/** Enforcer value, in basic units. Value-equal under the square law, so dps and hp scale by its root squared. */
export const ENFORCER_VALUE = 2.5;
/** Share of a unit's value paid in scrip, the rest in aether at `AETHER_PRICE`. Razors pay it all. */
export const HEXER_SCRIP_SHARE = 0.5;
export const RIGGER_SCRIP_SHARE = 0.75;
export const ENFORCER_SCRIP_SHARE = 0.7;
/** A crew saves for a floor once it is this many seconds of income away; hustlers wait for it. */
export const SAVE_HORIZON_S = 40;
/** Training pauses only for the last stretch of a save, this many seconds of income. */
export const PAUSE_HORIZON_S = 12;
/** Ley taps the reference crew holds before any floor needs more. */
export const REF_TAPS = 3;
/** The charter that raises a crew a tier costs this many units of value, once this many floors stand. */
export const CHARTER_UNITS = 8;
export const CHARTER_FLOORS = 2;

// ─── Economy ───────────────────────────────────────────────────────────────

/** `c0 = payback · rate`: the first hustler costs what it pays in `FIRST_PAYBACK_S`. */
export const hustlerBaseCost = FIRST_PAYBACK_S * HUSTLER_RATE;
/** `m = 2^(K/(N−1))`: `NODE_DOUBLINGS` doublings from a node's first hire to its last. */
export const hustlerRatio = 2 ** (NODE_DOUBLINGS / (NODE_HUSTLERS - 1));

/** Districts the reference crew owns at second `t`. */
export const refHeld = (t: number) => (t >= REF_TAKE_S ? 1 : 0);

/**
 * The cheapest next hire for a crew that has made `bought[i]` hires at node `i` (0 the
 * safehouse, then each owned district) and owns `held` districts; none once every node is full.
 */
export function nextHire(
  bought: number[],
  held: number,
): { node: number; cost: number } | undefined {
  let best: { node: number; cost: number } | undefined;
  for (let i = 0; i <= held; i++) {
    const b = bought[i] ?? 0;
    if (b >= NODE_HUSTLERS) continue;
    const cost = hustlerBaseCost * hustlerRatio ** b;
    if (!best || cost < best.cost) best = { node: i, cost };
  }
  return best;
}

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
 * to hustlers while the cheapest next hire pays back inside `PAYBACK_HORIZON_S`, the
 * rest (and everything after) to the army side. Hires fill the safehouse and the
 * districts the reference crew owns (`refHeld`); when it owns them is the
 * strategy-space remainder the probe measures.
 */
export function walkEconomy(seconds: number, incomeMult = 1): WalkPoint[] {
  const out: WalkPoint[] = [];
  let hustlers = START_HUSTLERS;
  const bought: number[] = [];
  let econPurse = START_SCRIP;
  let armySpend = 0;
  for (let t = 0; t <= seconds; t++) {
    const income = hustlers * HUSTLER_RATE * incomeMult;
    out.push({ t, hustlers, income, armySpend });
    const next = nextHire(bought, refHeld(t));
    const pays = !!next && next.cost / (HUSTLER_RATE * incomeMult) < PAYBACK_HORIZON_S;
    const share = pays ? ECON_SHARE : 0;
    econPurse += income * share;
    armySpend += income * (1 - share);
    if (next && pays && econPurse >= next.cost) {
      econPurse -= next.cost;
      hustlers += 1;
      bought[next.node] = (bought[next.node] ?? 0) + 1;
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

/** The first training floor costs four units: it pays back in four trained units' worth of throughput. */
export const buildingBaseCost = 4 * unitValue;
/**
 * `m_b = (cost of the B-th floor / first)^(1/(B−1))`, one ladder over every floor a
 * crew stands up, tech floors included. Solved so the B-th floor costs a quarter of
 * `PAYBACK_HORIZON_S` of mid-match income: past that a crew trains with what it has.
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

/** The charter's price: a sink on the unit-value scale, saved for like a floor. */
export const charterCost = CHARTER_UNITS * unitValue;

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

// ─── Lieutenants ───────────────────────────────────────────────────────────

/**
 * A lieutenant's price, in units of value: hiring one spends scrip the army does
 * not get, and both seats pay it, since both play the policy through lieutenants.
 * The ladder climbs half a unit a rung: fixer, quartermaster, tactician. Measured
 * at ×1 a fully hired seat lost two contracts of four; at this rung it took all four.
 */
export const LIEUTENANT_UNITS = [0.5, 1, 1.5];
export const lieutenantCost = LIEUTENANT_UNITS.map((u) => u * unitValue);

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

/** Once no owned node has a hire that pays, a crew builds floors drawing up to this share of income. */
export const LATE_FLOOR_SHARE = 1.15;

/** Scrip one unit of an even triangle mix costs: razors, hexers and riggers alike. */
const refScripPerUnit = ((1 + HEXER_SCRIP_SHARE + RIGGER_SCRIP_SHARE) / 3) * unitValue;

/** One step of the army walk: what the reference crew has stood up by second `t`. */
export interface ArmyPoint {
  t: number;
  hustlers: number;
  /** False while no owned node has room for a hire that pays back inside `PAYBACK_HORIZON_S`. */
  hustlersPay: boolean;
  floors: number;
  /** True once the crew holds its charter. */
  chartered: boolean;
  units: number;
}

/**
 * The reference crew's economy as the shipping policy plays it, by the half second:
 * lieutenants hired as soon as their price is in the purse; the next floor saved for
 * while its draw fits the army share of income, holding hustlers and taps back once it
 * is `SAVE_HORIZON_S` of income away; the charter saved for the same way once
 * `CHARTER_FLOORS` stand, ahead of the next floor; `REF_TAPS` taps; the cheapest hire at
 * an owned node while it pays back (`nextHire`, `refHeld`); every floor training an even
 * triangle mix at one unit per `TRAIN_S`, paused for a save's last `PAUSE_HORIZON_S`.
 * Aether is assumed fed; fights, squats and research are left out.
 */
export function walkArmy(seconds: number): ArmyPoint[] {
  const dt = 0.5;
  const out: ArmyPoint[] = [];
  let hustlers = START_HUSTLERS;
  const bought: number[] = [];
  let scrip = START_SCRIP;
  let floors = 0;
  let units = 0;
  let taps = 0;
  let hired = 0;
  let chartered = false;
  const draw = (n: number) => (n * refScripPerUnit) / TRAIN_S;
  for (let t = 0; t <= seconds; t += dt) {
    const income = hustlers * HUSTLER_RATE;
    scrip += income * dt;
    while (hired < lieutenantCost.length && scrip >= lieutenantCost[hired]!)
      scrip -= lieutenantCost[hired++]!;
    const hire = nextHire(bought, refHeld(t));
    const pays = !!hire && hire.cost / HUSTLER_RATE < PAYBACK_HORIZON_S;
    const share = pays ? 1 - ECON_SHARE : LATE_FLOOR_SHARE;
    let saving = false;
    let paused = false;
    const floorCost = buildingBaseCost * buildingRatio ** floors;
    if (!chartered && floors >= CHARTER_FLOORS) {
      if (scrip >= charterCost) {
        scrip -= charterCost;
        chartered = true;
      } else if (charterCost < SAVE_HORIZON_S * income) {
        saving = true;
        paused = charterCost - scrip < PAUSE_HORIZON_S * income;
      }
    } else if (draw(floors + 1) <= share * income) {
      if (scrip >= floorCost) {
        scrip -= floorCost;
        floors += 1;
      } else if (floorCost < SAVE_HORIZON_S * income) {
        saving = true;
        paused = floorCost - scrip < PAUSE_HORIZON_S * income;
      }
    }
    const tapCost = tapBaseCost * tapRatio ** taps;
    if (!saving && taps < REF_TAPS && scrip >= tapCost) {
      scrip -= tapCost;
      taps += 1;
    }
    if (hire && pays && !saving && scrip >= hire.cost) {
      scrip -= hire.cost;
      hustlers += 1;
      bought[hire.node] = (bought[hire.node] ?? 0) + 1;
    }
    if (!paused && floors > 0) {
      const spend = Math.min(draw(floors) * dt, scrip);
      scrip -= spend;
      units += spend / refScripPerUnit;
    }
    out.push({ t, hustlers, hustlersPay: pays, floors, chartered, units });
  }
  return out;
}

/**
 * Predicted landmarks for the reference crew, from the army walk: its first floor, the
 * safehouse filling, its charter, its safehouse and first district filling, the army reaching a siege force plus a holding squad, and a match at
 * `MATCH_S`. The walk fields no losses, so a measured siege beat lands later.
 */
export function landmarks(): Landmark[] {
  const army = walkArmy(MATCH_S);
  const at = (f: (p: ArmyPoint) => boolean) => army.find(f)?.t ?? NaN;
  return [
    { beat: 'first training floor', predictedS: at((p) => p.floors > 0) },
    { beat: 'safehouse full (no home hire left)', predictedS: at((p) => !p.hustlersPay) },
    {
      beat: 'econ plateau (safehouse and one district full)',
      predictedS: at((p) => p.t >= REF_TAKE_S && !p.hustlersPay),
    },
    { beat: 'crew chartered (tier two)', predictedS: at((p) => p.chartered) },
    {
      beat: 'army reaches a siege force plus a holding squad',
      predictedS: at((p) => p.units >= MIN_SIEGE_FORCE + REF_PRESENCE),
    },
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
    charterCost,
    tapBaseCost,
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
