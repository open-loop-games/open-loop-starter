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
}

/** A price or a stock bundle, by resource. */
export type Cost = Partial<Record<ResourceId, number>>;

/** Recipes are content, authored; every number below is derived from them. */
export const RECIPES: Record<RoleId, Recipe> = {
  sawyer: { inputs: { spruce: 2 }, output: 'spars', yields: 1 },
  smelter: { inputs: { bauxite: 2, coal: 1 }, output: 'aluminium', yields: 1 },
  machinist: { inputs: { aluminium: 3, coal: 2 }, output: 'engines', yields: 1 },
  rigger: { inputs: { spars: 4, aluminium: 2, engines: 1 }, output: 'aeroplanes', yields: 1 },
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

// ── recipes and raw-equivalent value ──

/** Raw-equivalent value of one unit: 1 for raw goods, else the recipe walked down (aluminium 3, spar 2, engine 11, aeroplane 25). */
export const RAW_EQ: Record<ResourceId, number> = (() => {
  const eq = {} as Record<ResourceId, number>;
  for (const r of RAW) eq[r] = 1;
  for (const role of ROLE_ORDER) {
    const rec = RECIPES[role];
    let sum = 0;
    for (const [res, qty] of Object.entries(rec.inputs)) sum += eq[res as ResourceId] * qty;
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

// ── prestige ──

/** Renown for P aeroplanes held: floor(H0·√(P/P0)), the square-root conversion (playbook § prestige formula). */
export function renownFor(planes: number, threshold = EXPO_THRESHOLD): number {
  if (planes < threshold) return 0;
  return Math.floor(EXPO_BASE_RENOWN * Math.sqrt(planes / threshold));
}

/** Raw output multiplier per lifetime renown: each Exposition's 2 renown buys a fifth more. */
export const RENOWN_OUTPUT_STEP = 0.1;

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

/** Charter prices in renown. The first Exposition (2) buys one, so every run starts further along. */
export const CHARTER_COST = {
  patronage: 2,
  patents: 3,
  credit: 3,
  ecole: 4,
} as const;
export const PATRONAGE_WORKERS = 2;
export const CREDIT_CAP_MULT = 1.5;
export const ECOLE_LABOUR_MULT = 1.25;

// ── the first-run prediction ──

/** Raw-equivalent of a cost bundle. */
export function rawValue(cost: Cost): number {
  let s = 0;
  for (const [k, v] of Object.entries(cost)) s += RAW_EQ[k as ResourceId] * v;
  return s;
}

/** The build a first run is expected to reach by its Exposition. */
export interface BuildPlan {
  yard: number;
  farm: number;
  mine: number;
  pit: number;
  warehouse: number;
  cite: number;
}

/** The patents on the first run's path to the riggers. */
export const FIRST_RUN_RESEARCH = [
  'sawpit',
  'concession',
  'cites',
  'bonded',
  'hall',
  'steam',
  'monoplane',
] as const;

export interface ExpositionPrediction {
  /** Seconds the raw buildings spend earning every raw price on the path. */
  rawSeconds: number;
  /** Crew-seconds of worked goods on the path, over the mean crew. */
  crewSeconds: number;
  seconds: number;
}

/**
 * Closed-form estimate of the first Exposition, stated so the probes can contradict it.
 * Two budgets, spent mostly in sequence because the workshops open one patent at a time:
 *
 * - raw: every raw unit the run spends directly (patent and building prices in bread,
 *   spruce, bauxite and coal), at the mean raw throughput RHO·(B0+B1)/2, as raw
 *   buildings come online roughly linearly;
 * - crew: every worked good the run needs (spars, aluminium, engines, the P0 aeroplanes
 *   and the goods inside them), in crew-seconds, since a worker moves RHO_WORKER input
 *   units a second, at the mean crew (W0+W1)/2.
 *
 * T ≈ T_raw + T_crew. Raw bins sit full while crew binds, so worked goods are budgeted in
 * crew-seconds rather than as raw throughput.
 */
export function predictFirstExposition(plan: BuildPlan = DEFAULT_PLAN): ExpositionPrediction {
  const spend: Cost = {};
  const add = (cost: Cost, times = 1) => {
    for (const [k, v] of Object.entries(cost))
      spend[k as ResourceId] = (spend[k as ResourceId] ?? 0) + v * times;
  };
  for (const id of FIRST_RUN_RESEARCH) add(RESEARCH_COST[id]);
  const ladder = (id: keyof typeof BUILDING_COST, growth: number, from: number, to: number) => {
    for (let k = from; k < to; k++) add(BUILDING_COST[id], Math.pow(growth, k));
  };
  ladder('yard', COST_GROWTH, 1, plan.yard);
  ladder('farm', COST_GROWTH, 1, plan.farm);
  ladder('mine', COST_GROWTH, 0, plan.mine);
  ladder('pit', COST_GROWTH, 0, plan.pit);
  ladder('warehouse', WAREHOUSE_GROWTH, 0, plan.warehouse);
  ladder('cite', CITE_GROWTH, 0, plan.cite);
  // The aeroplanes, and the worked goods inside them, walked down the recipes.
  const need = { ...spend, aeroplanes: EXPO_THRESHOLD } as Record<ResourceId, number>;
  let crewUnits = 0;
  for (const role of [...ROLE_ORDER].reverse()) {
    const rec = RECIPES[role];
    const cycles = (need[rec.output] ?? 0) / rec.yields;
    for (const [k, q] of Object.entries(rec.inputs)) {
      need[k as ResourceId] = (need[k as ResourceId] ?? 0) + cycles * q;
      crewUnits += cycles * q;
    }
  }
  const rawUnits = RAW.reduce((s, r) => s + (spend[r] ?? 0), 0);
  const rawEnd = plan.yard + plan.farm + plan.mine + plan.pit;
  const rawSeconds = rawUnits / ((RHO * (2 + rawEnd)) / 2);
  const crewMean = (BASE_WORKERS + BASE_WORKERS + WORKERS_PER_CITE * plan.cite) / 2;
  const crewSeconds = crewUnits / RHO_WORKER / crewMean;
  return { rawSeconds, crewSeconds, seconds: rawSeconds + crewSeconds };
}

/** The build a first run is expected to reach by its Exposition. */
export const DEFAULT_PLAN: BuildPlan = {
  yard: 8,
  farm: 4,
  mine: 5,
  pit: 4,
  warehouse: WAREHOUSES_FOR_EXPO,
  cite: 4,
};
