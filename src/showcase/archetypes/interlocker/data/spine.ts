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

/** The build a run reaches by its Exposition. */
export interface BuildPlan {
  yard: number;
  farm: number;
  mine: number;
  pit: number;
  warehouse: number;
  cite: number;
}

/** Raw units a second from one raw building, under the empire's renown. */
export function rawRate(empire: Empire): number {
  return RHO * (1 + RENOWN_OUTPUT_STEP * empire.renown);
}

/** What the solved charters give: Crédit Mobilier's stake, the École Centrale's labour. */
export interface CharterEffects {
  /** units of each raw stock every run opens with under Crédit Mobilier */
  stake: number;
  /** every trade's labour multiplier under the École Centrale */
  ecole: number;
}

/** Every bin's size over its base, at `warehouses`. */
function binMult(warehouses: number): number {
  return 1 + WAREHOUSE_CAP_STEP * warehouses;
}

function fitsBins(cost: Cost, mult: number): boolean {
  return Object.entries(cost).every(([k, v]) => v <= baseCapacity(k as ResourceId) * mult);
}

const atLevel = (cost: Cost, growth: number, level: number): Cost =>
  Object.fromEntries(Object.entries(cost).map(([k, v]) => [k, v * Math.pow(growth, level)]));

/** Seconds of the next cité's bread the gardens keep in hand beyond the ration. */
export const GARDEN_LEAD = 60;

/**
 * Share of each crew seat's draw that is raw stock of each kind, with the trades seated in
 * proportion to a balanced line (four spars, two aluminium and an engine per aeroplane):
 * spruce 8, bauxite 10 and coal 7 of every 35 input units the line moves.
 */
export const LINE_DRAW: Record<'spruce' | 'bauxite' | 'coal', number> = (() => {
  const need = { aeroplanes: 1 } as Record<ResourceId, number>;
  let units = 0;
  for (const role of [...ROLE_ORDER].reverse()) {
    const rec = RECIPES[role];
    const cycles = (need[rec.output] ?? 0) / rec.yields;
    for (const [k, q] of Object.entries(rec.inputs)) {
      need[k as ResourceId] = (need[k as ResourceId] ?? 0) + cycles * q;
      units += cycles * q;
    }
  }
  return { spruce: need.spruce / units, bauxite: need.bauxite / units, coal: need.coal / units };
})();

export interface RunPrediction {
  /** Seconds the raw buildings spend earning every raw unit the run draws. */
  rawSeconds: number;
  /** Seconds the crew spends moving every worked good the run needs. */
  crewSeconds: number;
  seconds: number;
  /** Stock the run spends on every price but the yards', pits' and drifts', by kind. */
  prices: Cost;
}

/**
 * Closed-form estimate of one run, stated so the probes can contradict it. The run buys
 * every patent it does not hold and the build in `plan`, and fills the hangar. Two budgets:
 *
 * - raw: every raw unit the run draws (prices, and what the workshops eat to make the
 *   worked goods), at the mean raw throughput as raw buildings come online from the two a
 *   run opens with (RAMP_SHARE), less the bread the ration eats;
 * - crew: every worked good the run needs, in crew-seconds, at the mean crew.
 *
 * They run at once, and the run lasts as long as the longer: a raw-bound run is shortened
 * by renown, a crew-bound one by crew. Renown scales raw throughput, Imperial Patronage the
 * opening crew and the École Centrale labour; the Patent Pool takes the kept patents off
 * the bill, and Crédit Mobilier's stake off the purse.
 */
export function predictRun(
  empire: Empire,
  plan: BuildPlan = planFor(empire),
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
  const prices = { ...spend };
  ladder('yard', COST_GROWTH, 1, plan.yard);
  ladder('mine', COST_GROWTH, 0, plan.mine);
  ladder('pit', COST_GROWTH, 0, plan.pit);
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
  const stake = empire.charters.includes('credit') ? fx.stake : 0;
  const rawUnits = RAW.reduce((s, r) => s + Math.max(0, (need[r] ?? 0) - stake), 0);
  const rho = rawRate(empire);
  const w0 = BASE_WORKERS + (empire.charters.includes('patronage') ? PATRONAGE_WORKERS : 0);
  const crewMean = (w0 + w0 + WORKERS_PER_CITE * plan.cite) / 2;
  // The gardens' bread that the ration eats never reaches a price.
  const rawEnd =
    plan.yard + plan.farm + plan.mine + plan.pit - (crewMean * UPKEEP_PER_WORKER) / rho;
  const rawSeconds = rawUnits / (rho * (2 + (rawEnd - 2) * RAMP_SHARE));
  const labour = RHO_WORKER * (empire.charters.includes('ecole') ? fx.ecole : 1);
  const crewSeconds = crewUnits / labour / crewMean;
  return { rawSeconds, crewSeconds, seconds: Math.max(rawSeconds, crewSeconds), prices };
}

/**
 * How far across the run, on average, the raw buildings are from the two it opens with to
 * the plan's count. A linear ramp is 1/2; a self-financing build comes online later.
 * Fit with the run as its longer budget: 3/8 gives 6% rms, 14% at worst, over the 35 runs
 * of `../balance/charter-probe.ts`.
 */
export const RAMP_SHARE = 3 / 8;

/**
 * The build the reference player reaches by the Exposition, from rules rather than a fit:
 * - warehouses: until the hangar holds an Exposition and every patent fits its bins;
 * - cités: every cité whose price fits the bins at those warehouses, because a cité's
 *   compagnons work the whole rest of the run;
 * - gardens: the full crew's ration, plus GARDEN_LEAD seconds of the next cité's bread;
 * - raw producers: the full crew's draw of each raw stock, plus twice the mean rate the
 *   run's other prices spend it at over the crew's seconds, because producers come online
 *   across the run. The crew's seconds, not the run's, so the build does not move with
 *   the run model it is checked against.
 */
export function planFor(empire: Empire, fx: CharterEffects = CHARTER_EFFECTS): BuildPlan {
  let warehouse = 0;
  while (
    baseCapacity('aeroplanes') * binMult(warehouse) < EXPO_THRESHOLD ||
    !Object.values(RESEARCH_COST).every((c) => fitsBins(c, binMult(warehouse)))
  )
    warehouse++;
  let cite = 0;
  while (fitsBins(atLevel(BUILDING_COST.cite, CITE_GROWTH, cite), binMult(warehouse))) cite++;
  const crew =
    BASE_WORKERS +
    (empire.charters.includes('patronage') ? PATRONAGE_WORKERS : 0) +
    WORKERS_PER_CITE * cite;
  const rho = rawRate(empire);
  const nextBread = atLevel(BUILDING_COST.cite, CITE_GROWTH, cite).bread ?? 0;
  const farm = Math.max(1, Math.ceil((crew * UPKEEP_PER_WORKER + nextBread / GARDEN_LEAD) / rho));
  const labour = RHO_WORKER * (empire.charters.includes('ecole') ? fx.ecole : 1);
  let plan: BuildPlan = { yard: 1, farm, mine: 1, pit: 1, warehouse, cite };
  // The producers' own spars move the crew's seconds a little: a few passes settle it.
  for (let i = 0; i < 6; i++) {
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

// ── the charters, solved ──

/** Share of a run Crédit Mobilier and the École Centrale each save, where the arc first holds it. */
export const CHARTER_SHARE = 1 / 8;

/** Runs a charter's saving takes to repay the Expositions spent earning it: what prices it. */
export const CHARTER_PAYBACK = 10;

/** Share of a run `charter` saves, held over those listed before it at `renown`. */
export function charterSaving(charter: CharterId, renown: number, fx: CharterEffects): number {
  const before = CHARTER_IDS.slice(0, CHARTER_IDS.indexOf(charter));
  const run = (charters: readonly CharterId[]) => {
    const empire = { renown, charters };
    return predictRun(empire, planFor(empire, fx), fx).seconds;
  };
  return 1 - run([...before, charter]) / run(before);
}

/** Mean share of a run `charter` saves over the CHARTER_PAYBACK runs from `renown`. */
function windowSaving(charter: CharterId, renown: number, fx: CharterEffects): number {
  const perExpo = renownFor(EXPO_THRESHOLD);
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
  const perExpo = renownFor(EXPO_THRESHOLD);
  const fx: CharterEffects = { stake: 0, ecole: 1 };
  const cost = Object.fromEntries(CHARTER_IDS.map((c) => [c, perExpo])) as Record<
    CharterId,
    number
  >;
  for (let pass = 0; pass < 4; pass++) {
    let spent = 0;
    for (const c of CHARTER_IDS) {
      // The arc earns `perExpo` a run and petitions in order: the renown it holds this one at.
      spent += cost[c];
      const at = Math.ceil(spent / perExpo) * perExpo;
      if (c === 'credit') {
        fx.stake = 0;
        while (fx.stake < baseCapacity('spruce') && windowSaving(c, at, fx) < CHARTER_SHARE)
          fx.stake += 5;
      }
      if (c === 'ecole') {
        fx.ecole = 1;
        while (fx.ecole < 3 && windowSaving(c, at, fx) < CHARTER_SHARE) fx.ecole += 0.05;
        fx.ecole = Math.round(fx.ecole * 100) / 100;
      }
      cost[c] = Math.max(1, Math.round(perExpo * CHARTER_PAYBACK * windowSaving(c, at, fx)));
    }
  }
  return { effects: fx, cost };
}

const solved = solveCharters();

/** Crédit Mobilier's stake and the École Centrale's labour, as solved. */
export const CHARTER_EFFECTS: CharterEffects = solved.effects;

/** Charter prices in renown, as solved. */
export const CHARTER_COST: Record<CharterId, number> = solved.cost;

/** The build a first run is expected to reach by its Exposition. */
export const DEFAULT_PLAN: BuildPlan = planFor(FRESH);

/** One run of the arc as the spine predicts it. */
export interface ArcRun {
  /** the empire the run opens with */
  empire: Empire;
  plan: BuildPlan;
  seconds: number;
  /** play-seconds when its Exposition is staged */
  at: number;
}

/**
 * The arc the spine predicts: each run pays the threshold's renown, and the charters are
 * petitioned in their listed order, each saved for before the next.
 */
export function predictArc(expositions: number): ArcRun[] {
  const runs: ArcRun[] = [];
  let empire = FRESH;
  let held = 0;
  let at = 0;
  for (let k = 0; k < expositions; k++) {
    const plan = planFor(empire);
    const seconds = predictRun(empire, plan).seconds;
    at += seconds;
    runs.push({ empire, plan, seconds, at });
    held += renownFor(EXPO_THRESHOLD);
    const charters = [...empire.charters];
    for (const c of CHARTER_IDS.filter((c) => !charters.includes(c))) {
      if (held < CHARTER_COST[c]) break;
      held -= CHARTER_COST[c];
      charters.push(c);
    }
    empire = { renown: empire.renown + renownFor(EXPO_THRESHOLD), charters };
  }
  return runs;
}
