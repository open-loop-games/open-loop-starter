// ─── Skeleton ───
// The spine's home in `data/`. Every economy number in Spoor is derived here from
// a handful of named anchors, in plain arithmetic with no engine. Modules read
// these values at their `tunable()` reader sites and never re-author them.
//
// The model is a reference trip: walk from the lodge to the middle of band k,
// hunt `huntsPerTrip` times, walk home and bank the haul, refilling water on the
// way. Everything else is sized against what that trip earns per second, so a
// band's prices are "how long you dwell in the band before" rather than
// hand-picked numbers. Each band's den trophy changes the trip from the band
// after its den.

export const ANCHORS = {
  /** Designed time from a cold start to the Pale Hart under the reference policy. */
  arcSeconds: 1800,
  /** Meadow, forest, marsh, snowfield, deepwood. */
  bands: 5,
  /** Tiles of depth from the lodge per band. */
  bandDepth: 4,
  /** G — each band's quarry pays G× the band before. */
  yieldGrowth: 2.5,
  /** Y0 — meat from one meadow hare. */
  hareMeat: 3,
  /** Hides per meat on every carcass. */
  hideRatio: 0.4,
  /** Hunts in one reference trip. */
  huntsPerTrip: 4,
  /** Sim-seconds to walk one tile. */
  stepSeconds: 0.5,
  /** Sim-seconds one hunt takes. */
  huntSeconds: 3,
  /** Jerky eaten per tile walked by the huntsman alone. */
  supplyPerStep: 1,
  /** Jerky eaten per hunt. */
  supplyPerHunt: 1,
  /** Water drunk per tile walked: more than jerky, so water binds the walk first. */
  waterPerStep: 2,
  /** Water drunk per hunt. */
  waterPerHunt: 1,
  /** Water the starting skin holds: eight steps, against the satchel's twelve. */
  skinBase: 16,
  /** Water each waterskin level adds: four more steps. */
  skinStep: 8,
  /** Smoking stretches meat: jerky per meat. */
  jerkyPerMeat: 2,
  /** Lodge producer price ratio: about 6 cost doublings across about 30 purchases. */
  priceRatio: 1.15,
  /** Target gap between lodge purchases, inside the 30–120s flow band. */
  beatSeconds: 45,
  /** How a band's hide budget splits between the five gear lines; sums to 1. */
  gearShare: 0.3,
  frameShare: 0.22,
  bowShare: 0.23,
  satchelShare: 0.13,
  skinShare: 0.12,
} as const;

// ─── Balance ────────────────────────────────────────────────────────────────

const A = ANCHORS;

// === LODGE PRODUCERS ===

/** Wood per second from one woodcutter. */
export const WOOD_RATE = 0.2;
/** Meat per second from one snare line. */
export const SNARE_RATE = 0.15;
/** The lodge's opening stores. */
export const START_WOOD = 15;
export const START_JERKY = 30;

const round5 = (x: number): number => Math.max(5, Math.round(x / 5) * 5);

// === QUARRY YIELDS ===

/** Meat per carcass of band k's timid quarry: Y0 · G^k. */
export const yieldMeat = (k: number): number => A.hareMeat * A.yieldGrowth ** k;
/** Hides per carcass of band k's timid quarry. */
export const yieldHide = (k: number): number => A.hideRatio * yieldMeat(k);
/** Antler per carcass: none before the marsh, then G^(k−2). */
export const yieldAntler = (k: number): number => (k < 2 ? 0 : A.yieldGrowth ** (k - 2));
/** Dangerous quarry pays this much over the band's timid quarry, for the risk. */
export const DANGER_PREMIUM = 1.6;

// === TROPHIES ===
// A den beast is beatable with the next band's bow, so the reference policy takes
// band k's den as it enters band k+1, and the trophy counts from that band on.

export type TrophyId = 'mattock' | 'coracle' | 'sledge';
/** The band from which each trophy changes the reference trip. */
export const TROPHY_FROM: Record<TrophyId, number> = { mattock: 2, coracle: 3, sledge: 4 };
const holds = (t: TrophyId, k: number): boolean => k >= TROPHY_FROM[t];
/** Steps the coracle saves each way across the Fen, cutting over the meres. */
export const CORACLE_SAVE = 1;
/** Steps from a band's waystone camp to its middle: the sledge's trip starts there. */
export const CAMP_TO_MIDDLE = A.bandDepth / 2 + 1;

// === THE REFERENCE TRIP ===

/** Tiles walked out to band k's middle and back to where the haul banks. */
export const walkSteps = (k: number): number => {
  if (holds('sledge', k)) return 2 * CAMP_TO_MIDDLE;
  const lodge = 2 * (A.bandDepth * k + A.bandDepth / 2);
  return holds('coracle', k) ? lodge - 2 * CORACLE_SAVE : lodge;
};

// === WATER ===
// Water is free at springs, the river, the Fen's meres and the lodge well, but the
// skin holds fewer steps than the satchel. A trip whose water need passes the
// skin refills on the way, and each refill is a detour off the route.

/** Water the waterskin holds at level L. */
export const skinCapacity = (level: number): number => A.skinBase + level * A.skinStep;
/** The skin level the reference policy carries into band k: bought from the band before. */
export const skinLevelAt = (k: number): number => Math.min(k, 3);
/** Water one trip into band k drinks. */
export const waterNeed = (k: number): number =>
  walkSteps(k) * A.waterPerStep + A.huntsPerTrip * A.waterPerHunt;
/** Refills one trip into band k makes on the way. */
export const refillsFor = (k: number): number =>
  Math.max(0, Math.ceil(waterNeed(k) / skinCapacity(skinLevelAt(k))) - 1);
/**
 * Steps off the route to the nearest water, by band: the lodge well, the
 * forest's springs and river, the Fen's meres, the Snowfield's frozen water, the
 * dry Deepwood. With the mattock every camp is a well, and no band is far from one.
 */
export const REFILL_DETOUR = [0, 2, 1, 4, 6];
export const refillDetour = (k: number): number =>
  holds('mattock', k) ? Math.min(REFILL_DETOUR[k], 1) : REFILL_DETOUR[k];

/** Tiles one trip into band k walks, its refill detours included. */
export const tripSteps = (k: number): number => walkSteps(k) + refillsFor(k) * 2 * refillDetour(k);
export const tripSeconds = (k: number): number =>
  tripSteps(k) * A.stepSeconds + A.huntsPerTrip * A.huntSeconds;
/** Jerky one reference trip eats. */
export const tripSupply = (k: number): number =>
  tripSteps(k) * A.supplyPerStep + A.huntsPerTrip * A.supplyPerHunt;
/** Jerky per second a huntsman expeditioning without pause in band k eats. */
export const jerkyDemand = (k: number): number => tripSupply(k) / tripSeconds(k);

// === THE SMOKEHOUSE ===

/** Jerky per second from one smoke rack at full feed: exactly the meadow's demand. */
export const RACK_JERKY_RATE = jerkyDemand(0);
/** Racks band k's demand calls for. */
export const racksFor = (k: number): number => Math.ceil(jerkyDemand(k) / RACK_JERKY_RATE);
/**
 * Wood burned per jerky: one woodcutter feeds the forest's smoking at half its
 * output, leaving the other half for camps and racks.
 */
export const WOOD_PER_JERKY = (0.5 * WOOD_RATE) / jerkyDemand(1);
/** First extra rack: two beats of a single woodcutter, since a rack also burns wood. */
export const RACK_BASE_COST = round5(2 * WOOD_RATE * A.beatSeconds);
/** Racks are coarser purchases than producers: a rack is about half a band's jerky demand. */
export const RACK_PRICE_RATIO = 1.6;
/** The second rack: one is owned from the start, so it is priced one step up the ladder. */
export const SECOND_RACK_COST = RACK_BASE_COST * RACK_PRICE_RATIO;

// === PACING ===

/** Camp j (0-based) on a waystone, priced in wood, doubling: three beats of one woodcutter. */
export const campCost = (j: number): number => round5(WOOD_RATE * A.beatSeconds * 3 * 2 ** j);
/** Wood per second one woodcutter leaves over while the racks smoke the meadow's jerky. */
export const OPENING_WOOD_RATE = WOOD_RATE - WOOD_PER_JERKY * jerkyDemand(0);
/**
 * The meadow is onboarding, not a full band. A forest trip needs the forest
 * kit — the first camp, and the second rack the forest's jerky demand calls
 * for — so the forest's stay starts when the opening's wood has paid for it.
 */
export const MEADOW_SECONDS = (campCost(0) + SECOND_RACK_COST - START_WOOD) / OPENING_WOOD_RATE;
/** Seconds the reference policy spends in each band past the meadow; the deepwood's is the Hart's trail. */
export const DWELL_SECONDS = (A.arcSeconds - MEADOW_SECONDS) / (A.bands - 1);
export const bandSeconds = (k: number): number => (k === 0 ? MEADOW_SECONDS : DWELL_SECONDS);

/**
 * How each band's stay earns against the reference trip. Below 1 is the walk
 * the trip does not model: early trips on the gear the band was entered with,
 * walking between scattered herds, shallower quarry on the way, waiting on the
 * racks. Above 1 is hauls larger than the trip's four hunts. Measured, not
 * projected: solved so each band's stay in `balance/arc-probe.ts` (mean over
 * its default seeds) matches its scheduled stay. The forest's and the Fen's
 * factors trade against each other, because the Fen's gear is priced from the
 * forest's budget, so the kept step is the one that lands the Hart.
 */
export const FIELD_FACTOR = [1, 0.55, 0.82, 1.35, 0.7];
/** Band k's stay in seconds of the reference trip's earning. */
export const earningSeconds = (k: number): number => bandSeconds(k) * FIELD_FACTOR[k];
export const bandStart = (k: number): number =>
  k === 0 ? 0 : MEADOW_SECONDS + (k - 1) * DWELL_SECONDS;

// === SKILL AND STATISTICS ===

/** Huntcraft XP per kill in band k: G^k, so XP tracks the yield ladder. */
export const huntXp = (k: number): number => A.yieldGrowth ** k;
/** XP to reach level L: XP_SCALE · (2^L − 1). */
export const XP_SCALE = 5;
/** Yield and prowess multiplier per Huntcraft level. */
export const SKILL_STEP = 1.08;
/** Kills of one species that earn its bestiary entry, and the yield bonus it pays. */
export const BESTIARY_KILLS = 10;
export const BESTIARY_BONUS = 1.25;

/** Hunts the reference policy makes across band k's stay. */
export const huntsIn = (k: number): number => (A.huntsPerTrip * earningSeconds(k)) / tripSeconds(k);
/**
 * Chance a hunt of a band's timid quarry succeeds at Huntcraft level L, with the
 * bow matched to the band: prowess 2ᵏ·s against threat 2ᵏ/4, so s / (s + ¼).
 */
export const timidHitChance = (level: number): number => {
  const s = SKILL_STEP ** level;
  return s / (s + 0.25);
};

interface BandSkill {
  /** Huntcraft level at the middle of the stay */
  level: number;
  /** chance a hunt kills, at that level */
  hit: number;
  kills: number;
}

const levelFor = (xp: number): number => Math.floor(Math.log2(xp / XP_SCALE + 1));

/**
 * Huntcraft across the arc, band by band. A kill trains the skill and the skill
 * raises the hit chance, so each band's level is solved from the kills before it
 * and half its own, with the hit chance read once at the level it enters with.
 */
const BAND_SKILL: readonly BandSkill[] = (() => {
  const out: BandSkill[] = [];
  let xpBefore = 0;
  for (let k = 0; k < A.bands; k++) {
    const entering = timidHitChance(levelFor(xpBefore));
    const level = levelFor(xpBefore + 0.5 * huntsIn(k) * entering * huntXp(k));
    const hit = timidHitChance(level);
    const kills = huntsIn(k) * hit;
    out.push({ level, hit, kills });
    xpBefore += kills * huntXp(k);
  }
  return out;
})();

/** Kills the reference policy makes across band k's stay. */
export const killsIn = (k: number): number => BAND_SKILL[k].kills;
/** Huntcraft level at the middle of band k's stay. */
export const skillLevelAt = (k: number): number => BAND_SKILL[k].level;
/** Share of band k's hunts that kill, at the band's middle. */
export const hitChance = (k: number): number => BAND_SKILL[k].hit;
/**
 * Every multiplier on a carcass, inside the solve: Huntcraft at the band's
 * middle, and the bestiary bonus, which ten kills earn early in every band.
 */
export const yieldMult = (k: number): number => SKILL_STEP ** skillLevelAt(k) * BESTIARY_BONUS;

// === BAND BUDGETS ===

/** Kills in one reference trip into band k. */
const tripKills = (k: number): number => A.huntsPerTrip * hitChance(k);

/** Hides per second of expeditioning in band k. */
export const hideRate = (k: number): number =>
  (tripKills(k) * yieldHide(k) * yieldMult(k)) / tripSeconds(k);
/** Antler per second of expeditioning in band k. */
export const antlerRate = (k: number): number =>
  (tripKills(k) * yieldAntler(k) * yieldMult(k)) / tripSeconds(k);
/** Meat per second after the trip's own jerky is smoked back out of it. */
export const meatNetRate = (k: number): number =>
  (tripKills(k) * yieldMeat(k) * yieldMult(k) - tripSupply(k) / A.jerkyPerMeat) / tripSeconds(k);

/** Hides banked over band k's stay. */
export const hideBudget = (k: number): number => hideRate(k) * earningSeconds(k);
/** Antler banked over band k's stay. */
export const antlerBudget = (k: number): number => antlerRate(k) * earningSeconds(k);

// === CARRYING ===

/** Pack capacity at frame level L: one reference trip's haul in band L, multipliers included. */
export const packCapacity = (level: number): number =>
  Math.ceil(
    A.huntsPerTrip * (yieldMeat(level) + yieldHide(level) + yieldAntler(level)) * yieldMult(level),
  );
/**
 * Jerky the satchel holds at level L. Base covers a meadow trip with a margin;
 * each level adds one band's extra round-trip walk (2 · bandDepth).
 */
export const supplyCapacity = (level: number): number =>
  tripSupply(0) + 4 + level * 2 * A.bandDepth;

// === PROWESS AND THREAT ===

/** Bow draw at level L: doubles per level, so bow level k meets band k's danger. */
export const bowPower = (level: number): number => 2 ** level;
/** Band k's dangerous quarry: an even fight for a bow of level k before skill. */
export const threat = (k: number): number => 2 ** k;
/** The Pale Hart: half again a deepwood beast, so skill and hounds must close the gap. */
export const HART_THREAT = threat(4) * 1.5;
/** Band k's den beast: an even fight for the next band's bow. */
export const denThreat = (k: number): number => threat(k + 1);
/** A den beast pays this much over the band's dangerous quarry. */
export const DEN_PREMIUM = 2;
/** Chance a hunt against threat t succeeds at prowess p. */
export const winChance = (prowess: number, t: number): number =>
  t <= 0 ? 1 : prowess / (prowess + t);

// === GEAR PRICES (hides, antler, wood) ===

/**
 * Terrain gear opens band k and is bought out of band k−1's stay. The forest
 * (band 1) needs none: reach — a camp or a satchel — gates it.
 */
export const terrainGearCost = (k: 2 | 3 | 4): { hide: number; antler: number; wood: number } => ({
  hide: round5(A.gearShare * hideBudget(k - 1)),
  antler: k >= 3 ? round5(0.5 * antlerBudget(k - 1)) : 0,
  wood: k === 4 ? round5(WOOD_RATE * DWELL_SECONDS * 0.5) : 0,
});

/** Frame level L (≥1) fits band L's haul; bought from band L−1's stay. */
export const frameCost = (level: number): number => round5(A.frameShare * hideBudget(level - 1));
/** Bow level L (≥1) meets band L's danger; antler joins once antler exists (L ≥ 3). */
export const bowCost = (level: number): { hide: number; antler: number } => ({
  hide: round5(A.bowShare * hideBudget(level - 1)),
  antler: level >= 3 ? round5(0.3 * antlerBudget(level - 1)) : 0,
});
/** Satchel level L: the reach line, the alternative to camps. */
export const satchelCost = (level: number): number =>
  round5(A.satchelShare * hideBudget(level - 1));
/** Waterskin level L: the water line, the alternative to walking to a spring. */
export const skinCost = (level: number): number => round5(A.skinShare * hideBudget(level - 1));

// === LODGE PRICES ===

/** First woodcutter: one beat of the meadow's net meat. */
export const WOODCUTTER_BASE_COST = round5(meatNetRate(0) * A.beatSeconds);
/** First snare: one beat of a single woodcutter's wood. */
export const SNARE_BASE_COST = round5(WOOD_RATE * A.beatSeconds);
/** Hounds: priced in meat, tripling — few, deliberate purchases. */
export const HOUND_BASE_COST = round5(meatNetRate(1) * A.beatSeconds * 2);
export const HOUND_PRICE_RATIO = 3;
/** Each hound: pack +20%, prowess +25%, and a quarter of a huntsman's jerky per tile. */
export const HOUND_PACK = 0.2;
export const HOUND_PROWESS = 0.25;
export const HOUND_SUPPLY_PER_STEP = 0.25;

// === CHARTING AND THE HART ===

/** Tiles charted per Wayfinder rank; each rank widens the huntsman's sight by one. */
export const WAYFINDER_TILES = [60, 160];

/**
 * Seconds for a depleted band-k herd to regrow one head: one of the band's
 * reference trips. A band holds about 11 timid herds of 3 (about 80 open tiles
 * at the map's herd share), so regrowth supplies about 33 head per trip against
 * the 4 the trip takes — slack for the herds the huntsman cannot reach yet.
 */
export const herdRegrowSeconds = (k: number): number => tripSeconds(k);

/**
 * Deepwood kills before the Hart's trail shows: one reference stay's worth, so
 * the last band is dwelt in rather than walked through.
 */
export const HART_TRAIL_KILLS = Math.round(killsIn(4));

// === PREDICTIONS ===

export interface BeatPrediction {
  label: string;
  seconds: number;
}

/**
 * When the reference policy should finish the forest kit, first set foot in
 * each band past the forest, take each den's trophy, and take the Hart. `balance/arc-probe.ts` prints
 * the measured diff.
 */
export function predictBeats(): BeatPrediction[] {
  // The first purchase is the second rack, from the opening wood and one woodcutter.
  const firstPurchase = (SECOND_RACK_COST - START_WOOD) / OPENING_WOOD_RATE;
  const out: BeatPrediction[] = [
    { label: 'first lodge purchase', seconds: Math.round(firstPurchase) },
  ];
  // The forest's edge is a few steps from the lodge, so setting foot in it marks
  // nothing; its stay starts with the forest kit, which the first camp completes.
  out.push({ label: 'camp 1', seconds: Math.round(MEADOW_SECONDS) });
  for (let k = 2; k < A.bands; k++)
    out.push({ label: `enter band ${k}`, seconds: Math.round(bandStart(k)) });
  // Each den falls as the band after it opens, with that band's bow.
  for (const [trophy, from] of Object.entries(TROPHY_FROM))
    out.push({ label: `trophy ${trophy}`, seconds: Math.round(bandStart(from)) });
  out.push({ label: 'the Hart', seconds: A.arcSeconds });
  out.sort((a, b) => a.seconds - b.seconds);
  return out;
}
