// ─── Skeleton ───
// The spine's home in `data/`. Every economy number in the Aluminium Empire is derived
// here from a handful of named anchors, in plain arithmetic with no engine. Modules read
// these values at their `tunable()` reader sites and never re-author them; the projection
// (`../balance/interlocker-projection.ts`) prints them, and the probes contradict them.
//
// Unit system: one "raw unit" is what one raw building (timber yard, market garden,
// bauxite pit, coal drift) yields in one second at the base rate RHO. Every worked good is
// priced in raw-equivalents (RAW_EQ) by walking its recipe down to raw units, and storage,
// costs and labour rates all key off that one valuation. So the whole economy rescales
// together when an anchor moves.

/** Every stock the works holds. */
export type ResourceId =
  | 'bread'
  | 'spruce'
  | 'bauxite'
  | 'coal'
  | 'aluminium'
  | 'spars'
  | 'engines'
  | 'aeroplanes';

/** The four workshop trades a compagnon can be seated at. */
export type RoleId = 'sawyer' | 'smelter' | 'machinist' | 'rigger';

/** A workshop recipe: one cycle consumes `inputs` and yields `output`. */
export interface Recipe {
  inputs: Partial<Record<ResourceId, number>>;
  output: ResourceId;
  yields: number;
  /** steam one cycle draws from the boilers; not carried, so no labour */
  steam?: number;
}

/** A price or a stock bundle, by resource. */
export type Cost = Partial<Record<ResourceId, number>>;

/** Recipes are content, authored; every number below is derived from them. */
export const RECIPES: Record<RoleId, Recipe> = {
  sawyer: { inputs: { spruce: 2 }, output: 'spars', yields: 1 },
  smelter: { inputs: { bauxite: 2, coal: 1 }, output: 'aluminium', yields: 1 },
  machinist: { inputs: { aluminium: 3, coal: 2 }, output: 'engines', yields: 1, steam: 2 },
  rigger: {
    inputs: { spars: 4, aluminium: 2, engines: 1 },
    output: 'aeroplanes',
    yields: 1,
    steam: 3,
  },
};

/** The raw stocks, which only buildings make. */
export const RAW: ResourceId[] = ['bread', 'spruce', 'bauxite', 'coal'];

/** The trades in recipe order: each reads only goods made by the trades before it. */
export const ROLE_ORDER: RoleId[] = ['sawyer', 'smelter', 'machinist', 'rigger'];

// ─── Balance ────────────────────────────────────────────────────────────────

/** Raw units per second from one raw building. The unit of the economy; rescaling it rescales nothing in time. */
export const RHO = 1;

/** Seconds the starting timber yard takes to pay for the first purchase: the first beat. */
export const T_FIRST = 30;

/** Seconds of one raw building's output a base storage bin holds: the return cadence a full bin makes. */
export const T_FILL = 150;

/**
 * Raw-building purchases per type in one run (N), and the cost doublings the player
 * should feel across them (K). Pacing playbook: m = 2^(K/N). N=25, K=5 gives 1.1487, the
 * genre's "doubles every five", because a run buys about 25 of the busiest building.
 */
export const RUN_PURCHASES = 25;
export const RUN_DOUBLINGS = 5;

/** Input units one worker moves through a workshop per second: a balanced chain is one worker per raw building. */
export const RHO_WORKER = RHO;

/** Workers one market garden feeds. Sets the upkeep rate u = RHO / FED_PER_FARM. */
export const FED_PER_FARM = 4;

/** Aeroplanes in the hangar needed to stage an Exposition, and the renown the threshold pays. */
export const EXPO_THRESHOLD = 10;
export const EXPO_BASE_RENOWN = 2;

// ── prices and growth ──

/** Base price unit: what the starting yard earns in T_FIRST seconds (30). */
export const C0 = RHO * T_FIRST;

/** Raw-building cost ratio, m = 2^(K/N) (1.1487). */
export const COST_GROWTH = Math.pow(2, RUN_DOUBLINGS / RUN_PURCHASES);

/**
 * Support buildings ramp faster than producers. A run wants about 8 warehouses and 8
 * cités, not 25, so the same five doublings land over 8 purchases (2^(5/8) = 1.54).
 * Warehouses soften to 2^(5/12) = 1.335 so storage never becomes the only wall; cités
 * take 2^(5/10). Both set by feel against that count; the probes report the counts bought.
 */
export const WAREHOUSE_GROWTH = Math.pow(2, 5 / 12);
export const CITE_GROWTH = Math.pow(2, 5 / 10);
export const BOILER_GROWTH = CITE_GROWTH;

// ── recipes and raw-equivalent value ──

/** Steam one boiler raises from a unit of coal. Steam is valued at the coal it burns. */
export const STEAM_PER_COAL = 2;

/** Raw-equivalent value of one unit: 1 for raw goods, else the recipe walked down, steam at its coal. */
export const RAW_EQ: Record<ResourceId, number> = (() => {
  const eq = {} as Record<ResourceId, number>;
  for (const r of RAW) eq[r] = 1;
  for (const role of ROLE_ORDER) {
    const rec = RECIPES[role];
    let sum = 0;
    for (const [res, qty] of Object.entries(rec.inputs)) sum += eq[res as ResourceId] * qty;
    sum += (rec.steam ?? 0) / STEAM_PER_COAL;
    eq[rec.output] = sum / rec.yields;
  }
  return eq;
})();

/** Input units one recipe cycle draws. */
export function recipeDraw(role: RoleId): number {
  return Object.values(RECIPES[role].inputs).reduce((a, b) => a + b, 0);
}

/**
 * Cycles per second one worker runs at a trade: RHO_WORKER input units a second over the
 * units one cycle draws (sawyer 1/2, smelter 1/3, machinist 1/5, rigger 1/7). One worker
 * at each stage then roughly matches one raw building on the stage's main input.
 */
export const ROLE_RATE: Record<RoleId, number> = Object.fromEntries(
  ROLE_ORDER.map((r) => [r, RHO_WORKER / recipeDraw(r)]),
) as Record<RoleId, number>;

/** Bread per second each worker eats (0.25). */
export const UPKEEP_PER_WORKER = RHO / FED_PER_FARM;

/** Workers housed before any cité, and per cité. */
export const BASE_WORKERS = 2;
export const WORKERS_PER_CITE = 2;

// ── storage ──

/**
 * A bin holds T_FILL seconds of one raw building, in raw-equivalents: cap = RHO·T_FILL /
 * RAW_EQ. Raw 150, spars 75, aluminium 50, engines 13.6, aeroplanes 6. So the hangar cannot
 * hold an Exposition's 10 aeroplanes until warehouses widen it: storage is an interlock.
 */
export function baseCapacity(res: ResourceId, fillSeconds = T_FILL): number {
  return (RHO * fillSeconds) / RAW_EQ[res];
}

/** Each warehouse widens every bin by this share of its base size. */
export const WAREHOUSE_CAP_STEP = 0.5;

/** Warehouses needed before the hangar holds EXPO_THRESHOLD aeroplanes: ceil((P0/cap − 1)/step) = 2. */
export const WAREHOUSES_FOR_EXPO = Math.ceil(
  (EXPO_THRESHOLD / baseCapacity('aeroplanes') - 1) / WAREHOUSE_CAP_STEP,
);

// ── the year ──

/** Seconds of one season: one bin's fill, so winter's shortfall is what the larder must hold. */
export const SEASON_SECONDS = T_FILL;

/** The seasons in order, and what each makes of a market garden's yield. */
export const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
export type Season = (typeof SEASONS)[number];
export const SEASON_YIELD: Record<Season, number> = {
  spring: 1.5,
  summer: 1,
  autumn: 1,
  winter: 0.25,
};

/** Chance a season turns, and how far it turns the gardens' yield either way. */
export const WEATHER_CHANCE = 0.35;
export const WEATHER_SWING = 0.15;

/** The gardens' yield across a year, before weather, which averages out. */
export const MEAN_SEASON_YIELD = SEASONS.reduce((s, k) => s + SEASON_YIELD[k], 0) / SEASONS.length;

/**
 * The weather of season `n` since the works were founded: 0, or ±WEATHER_SWING. A hash of
 * `n`, not a stream, so a save, a probe and the almanac's forecast all read the same sky.
 */
export function weatherFor(n: number): number {
  let h = Math.imul(n + 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  const u = (h >>> 0) / 2 ** 32;
  if (u >= WEATHER_CHANCE) return 0;
  return u < WEATHER_CHANCE / 2 ? -WEATHER_SWING : WEATHER_SWING;
}

/** The gardens' yield multiplier in season `n`. */
export function gardenYield(n: number): number {
  return SEASON_YIELD[SEASONS[((n % 4) + 4) % 4]!] + weatherFor(n);
}

// ── steam ──

/** Steam one Boiler House raises a second at full load: one coal drift's coal. */
export const BOILER_STEAM = RHO * STEAM_PER_COAL;

/** Steam the Sheet Rolling Mill draws a second while it runs; unpowered, its smelters lose the lift. */
export const MILL_LOAD = 1;

// ── prestige: the jury's medal ──

/** The worked goods the jury sees: every stock a workshop makes, held at staging. */
export const EXHIBITED: ResourceId[] = ['spars', 'aluminium', 'engines', 'aeroplanes'];

/** The jury's score that pays EXPO_BASE_RENOWN: the threshold's hangar, in raw-equivalents. */
export const SCORE_UNIT = EXPO_THRESHOLD * RAW_EQ.aeroplanes;

/** The jury's score for goods held: their raw-equivalent value. */
export function exhibitScore(held: Cost): number {
  return EXHIBITED.reduce((s, r) => s + (held[r] ?? 0) * RAW_EQ[r], 0);
}

/**
 * Renown for a score: floor(H0·√(S/S0)), the square-root conversion (playbook § prestige
 * formula), so a medal step costs more score than the last.
 */
export function renownFor(score: number): number {
  if (score < SCORE_UNIT) return 0;
  return Math.floor(EXPO_BASE_RENOWN * Math.sqrt(score / SCORE_UNIT));
}

/** The largest medal the spine ever plans a run for: a bound on the search, not a rule of play. */
export const MEDAL_CEILING = 60;

/** The least score that pays `renown`. */
export function scoreFor(renown: number): number {
  return SCORE_UNIT * Math.pow(renown / EXPO_BASE_RENOWN, 2);
}

/**
 * Seconds the jury takes between sittings: an Exposition is staged no sooner than this
 * after the last. The one budget renown does not shorten, so late runs keep a length and
 * a faster works earns a bigger medal rather than a shorter run.
 */
export const JURY_SITTING = 2 * SEASON_SECONDS;

/** Raw output multiplier per lifetime renown. */
export const RENOWN_OUTPUT_STEP = 0.1;

// ── the Ministry's orders ──

/**
 * Seconds between the Ministry's offers, and the seconds an offer stands before it lapses.
 * Offers fall halfway between JURY_SITTING's multiples, so none arrives as the jury sits.
 */
export const ORDER_PERIOD = T_FILL;
export const ORDER_LAPSE = 180;

/** Seconds of a balanced line's output one order asks for, shared among its lines. */
export const ORDER_SECONDS = 60;

/** Worked goods an order asks for, at least and at most. */
export const ORDER_LINES = [1, 3] as const;

// ── prices, as multiples of C0 (T_FIRST seconds of one raw building) ──

const scale = (w: Cost): Cost =>
  Object.fromEntries(Object.entries(w).map(([k, v]) => [k, Math.round(v * C0)]));

/** Base cost of each building's first unit. The weights are authored relative prices; C0 sets their scale. */
export const BUILDING_COST = {
  yard: scale({ spruce: 1 }),
  farm: scale({ spruce: 0.8 }),
  mine: scale({ spruce: 1.2, spars: 0.4 }),
  pit: scale({ spruce: 1.2, spars: 0.4 }),
  warehouse: scale({ spruce: 2.5, spars: 1.5 }),
  cite: scale({ spruce: 2, bread: 2 }),
  boiler: scale({ spars: 1, aluminium: 0.5 }),
} satisfies Record<string, Cost>;

/** Patent prices. Each is a few minutes of the economy that exists when it opens. */
export const RESEARCH_COST = {
  sawpit: scale({ spruce: 2.5 }),
  concession: scale({ spruce: 4, spars: 2 }),
  cites: scale({ spars: 2, bread: 3 }),
  bonded: scale({ spruce: 4, spars: 2 }),
  hall: scale({ bauxite: 4, coal: 2.5 }),
  coking: scale({ coal: 4, spars: 2 }),
  steam: scale({ aluminium: 2.2, coal: 4 }),
  rolling: scale({ aluminium: 3, spars: 2 }),
  monoplane: scale({ aluminium: 2, spars: 4, engines: 0.3 }),
} satisfies Record<string, Cost>;

/**
 * Derivation guard: warehouses a price needs before it fits the bins,
 * ceil((price/baseCap − 1)/step) over its line items. Bonded Warehousing and its
 * ancestors must need none, or no warehouse can ever be built and the run softlocks.
 */
export function warehousesNeeded(cost: Cost): number {
  let w = 0;
  for (const [k, v] of Object.entries(cost)) {
    w = Math.max(w, Math.ceil((v / baseCapacity(k as ResourceId) - 1) / WAREHOUSE_CAP_STEP));
  }
  return w;
}

/** Patent multipliers: Coking Ovens lifts coal drifts, the Rolling Mill lifts the smelters. */
export const COKING_MULT = 1.5;
export const ROLLING_MULT = 1.5;

/** The charters, in the order the reference player petitions them. */
export const CHARTER_IDS = ['patronage', 'patents', 'credit', 'ecole'] as const;
export type CharterId = (typeof CHARTER_IDS)[number];

/** Compagnons Imperial Patronage adds to every run. Authored; Crédit and the École are solved below. */
export const PATRONAGE_WORKERS = 2;

// ── the run model ──

/** Raw-equivalent of a cost bundle. */
export function rawValue(cost: Cost): number {
  let s = 0;
  for (const [k, v] of Object.entries(cost)) s += RAW_EQ[k as ResourceId] * v;
  return s;
}

/** What an Exposition never clears, and so what a run opens with. */
export interface Empire {
  /** renown ever earned: the raw-output bonus reads it */
  renown: number;
  charters: readonly CharterId[];
}

/** The first run's empire. */
export const FRESH: Empire = { renown: 0, charters: [] };

/** The founding patents the Patent Pool keeps across an Exposition. */
export const PATENT_POOL = [
  'sawpit',
  'concession',
  'cites',
  'bonded',
] as const satisfies readonly (keyof typeof RESEARCH_COST)[];

/** The build a run reaches by its Exposition, and the medal it stages for. */
export interface BuildPlan {
  yard: number;
  farm: number;
  mine: number;
  pit: number;
  warehouse: number;
  cite: number;
  boiler: number;
  /** renown the run's medal pays */
  renown: number;
}

/** What the empire's renown makes of every raw building's yield and every compagnon's labour. */
export function renownMult(renown: number): number {
  return 1 + RENOWN_OUTPUT_STEP * renown;
}

/** Raw units a second from one raw building, under the empire's renown. */
export function rawRate(empire: Empire): number {
  return RHO * renownMult(empire.renown);
}

/** Input units a second one compagnon moves, under the empire's renown and the École. */
export function labourRate(empire: Empire, fx: CharterEffects): number {
  return (
    RHO_WORKER * renownMult(empire.renown) * (empire.charters.includes('ecole') ? fx.ecole : 1)
  );
}

/** What the solved charters give: Crédit Mobilier's stake, the École Centrale's labour. */
export interface CharterEffects {
  /** units of each raw stock every run opens with under Crédit Mobilier */
  stake: number;
  /** every trade's labour multiplier under the École Centrale */
  ecole: number;
}

/** Every bin's size over its base, at `warehouses`. */
export function binMult(warehouses: number): number {
  return 1 + WAREHOUSE_CAP_STEP * warehouses;
}

function fitsBins(cost: Cost, mult: number): boolean {
  return Object.entries(cost).every(([k, v]) => v <= baseCapacity(k as ResourceId) * mult);
}

const atLevel = (cost: Cost, growth: number, level: number): Cost =>
  Object.fromEntries(Object.entries(cost).map(([k, v]) => [k, v * Math.pow(growth, level)]));

/** The most the bins can show the jury at `warehouses`: every exhibited bin full. */
export function exhibitMax(warehouses: number): number {
  return EXHIBITED.reduce((s, r) => s + baseCapacity(r) * binMult(warehouses) * RAW_EQ[r], 0);
}

/** Seconds the gardens take, beyond the ration, to raise the last cité's bread: a season. */
export const GARDEN_LEAD = SEASON_SECONDS;

/**
 * What a balanced line draws per input unit its crew moves, with the trades seated in
 * proportion (four spars, two aluminium and an engine per aeroplane): each raw stock,
 * coal including the boilers', and steam. `worked` is the raw-equivalent of every worked
 * good the line makes on the way, what an order can ask of it.
 */
export const LINE_DRAW = (() => {
  const need = { aeroplanes: 1 } as Record<ResourceId, number>;
  let units = 0;
  let steam = 0;
  let worked = RAW_EQ.aeroplanes;
  for (const role of [...ROLE_ORDER].reverse()) {
    const rec = RECIPES[role];
    const cycles = (need[rec.output] ?? 0) / rec.yields;
    steam += cycles * (rec.steam ?? 0);
    for (const [k, q] of Object.entries(rec.inputs)) {
      need[k as ResourceId] = (need[k as ResourceId] ?? 0) + cycles * q;
      units += cycles * q;
      if (EXHIBITED.includes(k as ResourceId)) worked += cycles * q * RAW_EQ[k as ResourceId];
    }
  }
  return {
    spruce: need.spruce / units,
    bauxite: need.bauxite / units,
    coal: (need.coal + steam / STEAM_PER_COAL) / units,
    steam: steam / units,
    worked: worked / units,
  };
})();

/**
 * Raw-equivalent of worked goods one Ministry order asks of a crew moving `units` a
 * second. The whole order is ORDER_SECONDS of a balanced line, shared among its lines, so
 * an order's worth does not depend on how many lines it has: on average, one exhibited
 * good's share of the line's worked output.
 */
export function orderValue(units: number): number {
  return (ORDER_SECONDS * units * LINE_DRAW.worked) / EXHIBITED.length;
}

export interface RunPrediction {
  /** Seconds the raw buildings spend earning every raw unit the run draws. */
  rawSeconds: number;
  /** Seconds the crew spends moving every worked good the run needs. */
  crewSeconds: number;
  /** Seconds until the Ministry has offered every order the score past the bins needs. */
  orderSeconds: number;
  /** orders the run fills */
  orders: number;
  seconds: number;
  /** Stock the run spends on every price but the yards', pits' and drifts', by kind. */
  prices: Cost;
  /** score the plan makes: the bins' share, and the orders' */
  exhibit: number;
  dossier: number;
  /** the medal the run shows: its exhibit and every order it fills */
  renown: number;
}

/**
 * Closed-form estimate of one run, stated so the probes can contradict it. The run buys
 * every patent it does not hold and the build in `plan`, and makes the score its medal
 * needs. Three budgets:
 *
 * - raw: every raw unit the run draws (prices, the boilers' coal, and what the workshops
 *   eat to make the worked goods), at the mean raw throughput as raw buildings come online
 *   from the two a run opens with (RAMP_SHARE), the gardens at their mean season, less the
 *   bread the ration eats;
 * - crew: every worked good the run needs, in crew-seconds, at the mean crew;
 * - orders: the score past the bins' reach comes only through the Ministry's orders. One
 *   is offered every ORDER_PERIOD, worth `orderValue` of the full crew, so the run lasts
 *   until the last one it needs is offered and filled.
 *
 * They run at once, and the run lasts as long as the longest.
 */
export function predictRun(
  empire: Empire,
  plan: BuildPlan,
  fx: CharterEffects = CHARTER_EFFECTS,
): RunPrediction {
  const spend: Cost = {};
  const add = (cost: Cost) => {
    for (const [k, v] of Object.entries(cost))
      spend[k as ResourceId] = (spend[k as ResourceId] ?? 0) + v;
  };
  const kept = empire.charters.includes('patents') ? (PATENT_POOL as readonly string[]) : [];
  for (const [id, cost] of Object.entries(RESEARCH_COST)) if (!kept.includes(id)) add(cost);
  const ladder = (id: keyof typeof BUILDING_COST, growth: number, from: number, to: number) => {
    for (let k = from; k < to; k++) add(atLevel(BUILDING_COST[id], growth, k));
  };
  ladder('farm', COST_GROWTH, 1, plan.farm);
  ladder('warehouse', WAREHOUSE_GROWTH, 0, plan.warehouse);
  ladder('cite', CITE_GROWTH, 0, plan.cite);
  ladder('boiler', BOILER_GROWTH, 0, plan.boiler);
  const prices = { ...spend };
  ladder('yard', COST_GROWTH, 1, plan.yard);
  ladder('mine', COST_GROWTH, 0, plan.mine);
  ladder('pit', COST_GROWTH, 0, plan.pit);
  // The score, as equal raw-equivalent shares of every exhibited good, the hangar at
  // least the threshold; then every worked good walked down the recipes.
  const score = scoreFor(plan.renown);
  const need = { ...spend } as Record<ResourceId, number>;
  for (const r of EXHIBITED) need[r] = (need[r] ?? 0) + score / EXHIBITED.length / RAW_EQ[r];
  need.aeroplanes = Math.max(need.aeroplanes, EXPO_THRESHOLD);
  let crewUnits = 0;
  let steam = 0;
  for (const role of [...ROLE_ORDER].reverse()) {
    const rec = RECIPES[role];
    const cycles = (need[rec.output] ?? 0) / rec.yields;
    steam += cycles * (rec.steam ?? 0);
    for (const [k, q] of Object.entries(rec.inputs)) {
      need[k as ResourceId] = (need[k as ResourceId] ?? 0) + cycles * q;
      crewUnits += cycles * q;
    }
  }
  need.coal += steam / STEAM_PER_COAL;
  const stake = empire.charters.includes('credit') ? fx.stake : 0;
  const rawUnits = RAW.reduce((s, r) => s + Math.max(0, (need[r] ?? 0) - stake), 0);
  const rho = rawRate(empire);
  const w0 = BASE_WORKERS + (empire.charters.includes('patronage') ? PATRONAGE_WORKERS : 0);
  const crewMean = (w0 + w0 + WORKERS_PER_CITE * plan.cite) / 2;
  const crewEnd = w0 + WORKERS_PER_CITE * plan.cite;
  // The gardens' bread that the ration eats never reaches a price.
  const rawEnd =
    plan.yard +
    plan.mine +
    plan.pit +
    plan.farm * MEAN_SEASON_YIELD -
    (crewMean * UPKEEP_PER_WORKER) / rho;
  const throughput = rho * (2 + (rawEnd - 2) * RAMP_SHARE);
  const labour = labourRate(empire, fx);
  const crewSeconds = crewUnits / labour / crewMean;
  // The rolling mill's load runs over the second half of the run.
  let rawSeconds = rawUnits / throughput;
  rawSeconds += ((MILL_LOAD / STEAM_PER_COAL) * Math.max(rawSeconds, crewSeconds)) / 2 / throughput;
  const exhibit = Math.min(score, exhibitMax(plan.warehouse));
  const dossier = score - exhibit;
  // The Ministry orders only from works that have shown at an Exposition.
  const orders =
    dossier <= 0
      ? 0
      : empire.renown > 0
        ? Math.ceil(dossier / orderValue(crewEnd * labour) - 1e-9)
        : Infinity;
  // The last order is filled by the seated line in about ORDER_SECONDS, slower in
  // proportion when the raw buildings cannot feed the full crew.
  const rawPerUnit = LINE_DRAW.spruce + LINE_DRAW.bauxite + LINE_DRAW.coal;
  const starved = Math.max(1, (crewEnd * labour * rawPerUnit) / (rho * rawEnd));
  const orderSeconds =
    orders > 0 ? (orders - 1 / 2) * ORDER_PERIOD + ORDER_FILL * ORDER_SECONDS * starved : 0;
  const seconds = Math.max(rawSeconds, crewSeconds, orderSeconds, JURY_SITTING);
  return {
    rawSeconds,
    crewSeconds,
    orderSeconds,
    orders,
    seconds,
    prices,
    exhibit,
    dossier,
    // Orders land whole, so the run shows every order it fills, not only the share it needed.
    renown: renownFor(exhibit + orders * orderValue(crewEnd * labour)),
  };
}

/**
 * How far across the run, on average, the raw buildings are from the two it opens with to
 * the plan's count. A linear ramp is 1/2; a self-financing build comes online later.
 * Fit together with ORDER_FILL on `../balance/charter-probe.ts`: 10% rms on gain rate, 5% on
 * the medal.
 */
export const RAMP_SHARE = 0.27;

/**
 * ORDER_SECONDS a run's last order takes to fill once offered, with raw to spare: the crew
 * is seated for the line, not the order. Fit with RAMP_SHARE.
 */
export const ORDER_FILL = 2.5;

/**
 * The build for `warehouses` and a medal of `renown`, from rules rather than a fit:
 * - cités: every cité whose price fits the bins, because a cité's compagnons work the
 *   whole rest of the run;
 * - gardens: the full crew's ration at the mean season plus GARDEN_LEAD seconds of the last
 *   cité's bread, and at least what carries the crew through a winter on a full larder;
 * - boilers: the full crew's steam, and the mill's;
 * - raw producers: the full crew's draw of each raw stock, plus twice the mean rate the
 *   run's other prices spend it at over the crew's seconds, because producers come online
 *   across the run. The crew's seconds, not the run's, so the build does not move with
 *   the run model it is checked against.
 */
export function buildFor(
  empire: Empire,
  warehouse: number,
  renown: number,
  fx: CharterEffects = CHARTER_EFFECTS,
): BuildPlan {
  const mult = binMult(warehouse);
  let cite = 0;
  while (fitsBins(atLevel(BUILDING_COST.cite, CITE_GROWTH, cite), mult)) cite++;
  const crew =
    BASE_WORKERS +
    (empire.charters.includes('patronage') ? PATRONAGE_WORKERS : 0) +
    WORKERS_PER_CITE * cite;
  const rho = rawRate(empire);
  const ration = crew * UPKEEP_PER_WORKER;
  const nextBread = cite ? (atLevel(BUILDING_COST.cite, CITE_GROWTH, cite - 1).bread ?? 0) : 0;
  const larder = baseCapacity('bread') * mult;
  const farm = Math.max(
    1,
    Math.ceil((ration + nextBread / GARDEN_LEAD) / (rho * MEAN_SEASON_YIELD)),
    Math.ceil((ration - larder / SEASON_SECONDS) / (rho * SEASON_YIELD.winter)),
  );
  const labour = labourRate(empire, fx);
  const boiler = Math.ceil((crew * labour * LINE_DRAW.steam + MILL_LOAD) / (BOILER_STEAM * rho));
  let plan: BuildPlan = { yard: 1, farm, mine: 1, pit: 1, warehouse, cite, boiler, renown };
  // The producers' own spars move the crew's seconds a little: a few passes settle it.
  for (let i = 0; i < 4; i++) {
    const run = predictRun(empire, plan, fx);
    const at = (r: 'spruce' | 'bauxite' | 'coal') =>
      Math.max(
        1,
        Math.ceil(
          (crew * labour * LINE_DRAW[r] + (2 * (run.prices[r] ?? 0)) / run.crewSeconds) / rho,
        ),
      );
    plan = { ...plan, yard: at('spruce'), mine: at('bauxite'), pit: at('coal') };
  }
  return plan;
}

/**
 * What a run is worth per second: the growth it buys in the renown multiplier, as a log,
 * so early renown, which multiplies everything after it, counts for more than late.
 */
export function gainRate(empire: Empire, renown: number, seconds: number): number {
  return Math.log(renownMult(empire.renown + renown) / renownMult(empire.renown)) / seconds;
}

const plans = new Map<string, BuildPlan>();

/** The medal the reference player's run shows at `empire`. */
export function medalFor(empire: Empire, fx: CharterEffects = CHARTER_EFFECTS): number {
  return predictRun(empire, planFor(empire, fx), fx).renown;
}

/**
 * The run the reference player plays: of every warehouse count from the least that holds
 * an Exposition and fits every patent to the most the bins can price, and every medal
 * from the first, the build and medal with the best `gainRate`.
 */
export function planFor(empire: Empire, fx: CharterEffects = CHARTER_EFFECTS): BuildPlan {
  const key = `${empire.renown}|${empire.charters.join(',')}|${fx.stake}|${fx.ecole}`;
  const memo = plans.get(key);
  if (memo) return memo;
  let wMin = 0;
  while (
    baseCapacity('aeroplanes') * binMult(wMin) < EXPO_THRESHOLD ||
    !Object.values(RESEARCH_COST).every((c) => fitsBins(c, binMult(wMin)))
  )
    wMin++;
  let wMax = wMin;
  while (fitsBins(atLevel(BUILDING_COST.warehouse, WAREHOUSE_GROWTH, wMax), binMult(wMax))) wMax++;
  let best: BuildPlan | undefined;
  let bestRate = 0;
  for (let w = wMin; w <= wMax; w++) {
    let last = 0;
    // Targets below the medal a run shows are the same run, so step past it.
    for (let r = EXPO_BASE_RENOWN; r <= MEDAL_CEILING;) {
      const plan = buildFor(empire, w, r, fx);
      const run = predictRun(empire, plan, fx);
      const rate = gainRate(empire, run.renown, run.seconds);
      if (rate > bestRate) [best, bestRate] = [plan, rate];
      if (rate < last) break;
      last = rate;
      r = Math.max(r, run.renown) + 1;
    }
  }
  plans.set(key, best!);
  return best!;
}

// ── the charters, solved ──

/** Share of a run Crédit Mobilier and the École Centrale each save, where the arc first holds it. */
export const CHARTER_SHARE = 1 / 8;

/** Runs a charter's saving takes to repay the Expositions spent earning it: what prices it. */
export const CHARTER_PAYBACK = 10;

/** Share of a run `charter` saves, held over those listed before it at `renown`. */
export function charterSaving(charter: CharterId, renown: number, fx: CharterEffects): number {
  const before = CHARTER_IDS.slice(0, CHARTER_IDS.indexOf(charter));
  // A gain rate, not seconds: a charter may buy a longer run for a better medal.
  const rate = (charters: readonly CharterId[]) => {
    const empire = { renown, charters };
    const run = predictRun(empire, planFor(empire, fx), fx);
    return gainRate(empire, run.renown, run.seconds);
  };
  return 1 - rate(before) / rate([...before, charter]);
}

/** Mean share of a run `charter` saves over the CHARTER_PAYBACK runs from `renown`, each paying `perExpo`. */
function windowSaving(
  charter: CharterId,
  renown: number,
  perExpo: number,
  fx: CharterEffects,
): number {
  let sum = 0;
  for (let k = 0; k < CHARTER_PAYBACK; k++) sum += charterSaving(charter, renown + k * perExpo, fx);
  return sum / CHARTER_PAYBACK;
}

/**
 * The charters' effects and prices, solved together because each depends on the other: a
 * price sets the renown the arc first holds a charter at, and the saving from there sets
 * the price. Savings are averaged over the CHARTER_PAYBACK runs after a charter is first
 * held, because the plan's whole-building steps make a single run's saving jumpy.
 * - Crédit Mobilier's stake and the École Centrale's labour are the smallest that save
 *   CHARTER_SHARE of a run over that window; the stake is capped by the base bins.
 * - Every price is the renown of the Expositions its saving repays over that window: a
 *   charter that saves s of a run costs s·CHARTER_PAYBACK Expositions' renown.
 */
function solveCharters(): { effects: CharterEffects; cost: Record<CharterId, number> } {
  const fx: CharterEffects = { stake: 0, ecole: 1 };
  const cost = Object.fromEntries(CHARTER_IDS.map((c) => [c, EXPO_BASE_RENOWN])) as Record<
    CharterId,
    number
  >;
  // Bisect on the smallest value in [lo, hi] at `step` whose window saving reaches the share.
  const least = (lo: number, hi: number, step: number, saves: (v: number) => boolean) => {
    if (!saves(hi)) return hi;
    while (hi - lo > step) {
      const mid = Math.round((lo + hi) / 2 / step) * step;
      if (mid === hi || mid === lo) break;
      if (saves(mid)) hi = mid;
      else lo = mid;
    }
    return hi;
  };
  for (let pass = 0; pass < 3; pass++) {
    // Walk the arc to the renown it holds each charter at, petitioning in order.
    let empire: Empire = FRESH;
    let held = 0;
    for (const c of CHARTER_IDS) {
      while (held < cost[c]) {
        const r = medalFor(empire, fx);
        held += r;
        empire = { ...empire, renown: empire.renown + r };
      }
      const perExpo = medalFor(empire, fx);
      const saves = (f: CharterEffects) =>
        windowSaving(c, empire.renown, perExpo, f) >= CHARTER_SHARE;
      if (c === 'credit')
        fx.stake = least(0, baseCapacity('spruce'), 5, (v) => saves({ ...fx, stake: v }));
      if (c === 'ecole')
        fx.ecole = least(1, 3, 0.05, (v) => saves({ ...fx, ecole: Math.round(v * 100) / 100 }));
      fx.ecole = Math.round(fx.ecole * 100) / 100;
      cost[c] = Math.max(
        1,
        Math.round(perExpo * CHARTER_PAYBACK * windowSaving(c, empire.renown, perExpo, fx)),
      );
      held -= cost[c];
      empire = { ...empire, charters: [...empire.charters, c] };
    }
  }
  return { effects: { ...fx }, cost };
}

const solved = solveCharters();

/** Crédit Mobilier's stake and the École Centrale's labour, as solved. */
export const CHARTER_EFFECTS: CharterEffects = solved.effects;

/** Charter prices in renown, as solved. */
export const CHARTER_COST: Record<CharterId, number> = solved.cost;

/** The foreman's bureaux, in the order the arc buys them once the charters are held. */
export const BUREAU_IDS = ['seating', 'estate', 'academie'] as const;
export type BureauId = (typeof BUREAU_IDS)[number];

/**
 * Expositions' renown each bureau costs, at the medal the arc stages when it is first
 * affordable. A bureau automates play the spine already assumes, so it saves no time on
 * paper; its price only spaces the three across the arc.
 */
export const BUREAU_RUNS: Record<BureauId, number> = { seating: 1, estate: 2, academie: 3 };

/** The year the works are founded, and the year of the Exposition whose Grand Prix ends the arc. */
export const FOUNDED = 1855;
export const GRAND_PRIX_YEAR = 1867;

/** Seconds of play the arc spans: the seasons from the founding to the spring of 1867. */
export const ARC_SECONDS = (GRAND_PRIX_YEAR - FOUNDED) * SEASONS.length * SEASON_SECONDS;

/** The build a first run is expected to reach by its Exposition. */
export const DEFAULT_PLAN: BuildPlan = planFor(FRESH);

/** One run of the arc as the spine predicts it. */
export interface ArcRun {
  /** the empire the run opens with */
  empire: Empire;
  /** bureaux held when the run opens */
  bureaux: BureauId[];
  plan: BuildPlan;
  seconds: number;
  /** the medal it shows */
  renown: number;
  /** play-seconds when its Exposition is staged */
  at: number;
}

/**
 * The arc the spine predicts: each run stages the medal its plan chooses; the charters
 * are petitioned in their listed order, each saved for before the next, then the bureaux.
 */
export function predictArc(expositions: number): ArcRun[] {
  const runs: ArcRun[] = [];
  let empire = FRESH;
  let bureaux: BureauId[] = [];
  let held = 0;
  let at = 0;
  for (let k = 0; k < expositions; k++) {
    const plan = planFor(empire);
    const { seconds, renown } = predictRun(empire, plan);
    at += seconds;
    runs.push({ empire, bureaux, plan, seconds, renown, at });
    held += renown;
    const charters = [...empire.charters];
    for (const c of CHARTER_IDS.filter((c) => !charters.includes(c))) {
      if (held < CHARTER_COST[c]) break;
      held -= CHARTER_COST[c];
      charters.push(c);
    }
    bureaux = [...bureaux];
    if (charters.length === CHARTER_IDS.length)
      for (const b of BUREAU_IDS.filter((b) => !bureaux.includes(b))) {
        if (held < BUREAU_COST[b]) break;
        held -= BUREAU_COST[b];
        bureaux.push(b);
      }
    empire = { renown: empire.renown + renown, charters };
  }
  return runs;
}

/** Each bureau's price in renown: BUREAU_RUNS medals of the run that first could afford it. */
export const BUREAU_COST: Record<BureauId, number> = (() => {
  const cost = Object.fromEntries(BUREAU_IDS.map((b) => [b, Infinity])) as Record<BureauId, number>;
  let empire = FRESH;
  let held = 0;
  let next = 0;
  while (next < BUREAU_IDS.length && empire.renown < 1e6) {
    const medal = medalFor(empire);
    held += medal;
    const charters = [...empire.charters];
    for (const c of CHARTER_IDS.filter((c) => !charters.includes(c))) {
      if (held < CHARTER_COST[c]) break;
      held -= CHARTER_COST[c];
      charters.push(c);
    }
    if (charters.length === CHARTER_IDS.length) {
      const b = BUREAU_IDS[next]!;
      if (cost[b] === Infinity) cost[b] = medal * BUREAU_RUNS[b];
      if (held >= cost[b]) {
        held -= cost[b];
        next++;
      }
    }
    empire = { renown: empire.renown + medal, charters };
  }
  return cost;
})();

/**
 * The Grand Prix of the 1867 Exposition: the medal, in renown, the arc first stages once
 * ARC_SECONDS have passed. Staging it ends the story; play goes on.
 */
export const GRAND_PRIX: number = (() => {
  let empire = FRESH;
  let held = 0;
  let at = 0;
  for (;;) {
    const run = predictRun(empire, planFor(empire));
    at += run.seconds;
    if (at >= ARC_SECONDS) return run.renown;
    held += run.renown;
    const charters = [...empire.charters];
    for (const c of CHARTER_IDS.filter((c) => !charters.includes(c))) {
      if (held < CHARTER_COST[c]) break;
      held -= CHARTER_COST[c];
      charters.push(c);
    }
    empire = { renown: empire.renown + run.renown, charters };
  }
})();
