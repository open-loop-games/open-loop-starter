/**
 * Interlocker arc bot — the shared sim core for the balance lane.
 *
 * Per the frontier balance-process (`/work/studio/frontier/docs/balance-process.md`)
 * and `archetypes/BALANCING.md` § Theme 5: this is a **deliberately-unrealistic
 * session driver** that stays harness-side. Arc-1 ships NO player-facing
 * automation (it is a hand-play demo), so — unlike the "automation is game code"
 * convention — the policy legitimately lives in the harness. What it must NOT do
 * is re-implement game *mechanics*: every decision it makes flows through the
 * real shipping module APIs (`gatherCatnip`, `refineCatnip`, `purchasable.purchase`,
 * `setJobCount`, `triggerCraft`, science `purchase`). The engine is the math; the
 * bot only chooses *what to press*.
 *
 * The policy is a **faithful phased player model** grounded in the closed-form
 * lens carried in each `data/*.ts` `─── Balance ───` section:
 *
 *   - **Bootstrap gate** — kitten cap is 0 until a hut exists; a hut needs wood;
 *     pre-population wood only comes from manual refine (100 catnip → 1 wood).
 *     So the opening is forced: gather → refine → first hut → first kitten.
 *   - **Catnip solvency governs population** — every kitten drains 4.25/s. Pre-
 *     agriculture, fields (0.625/s, geometric catnip cost) are the only source;
 *     post-agriculture a farmer is net +0.75/s. Population is catnip-gated.
 *   - **Winter is a banking problem, not a rate problem** — production ×0.25 for
 *     200s/yr. All-farmer winter output (~1.25·P/s) can't meet 4.25·P/s, so the
 *     colony survives winter only by banking catnip (barns → +5000 cap each) and
 *     shaving demand (pastures → −0.5%/each). The controller banks in the fat
 *     seasons and draws the bank down through winter.
 *   - **Architecture (42000 science) is the arc wall** — with only libraries
 *     (+10%/each) for science multipliers, the grind is long; the bot commits
 *     most non-farmer kittens to scholar once solvency is secured.
 *   - **Megalith raw cost** — 25 beam (=4375 wood) + 50 slab (=12500 minerals) +
 *     5 plate (=625 iron); minerals dominate, so the craft crew is miner-heavy.
 *
 * Determinism: arc-1 has no RNG in any shipping module, so a run is fully
 * deterministic — one run is the measurement, no seed sweep (contrast frontier's
 * process pool, which exists for its session variance). "Layer twists, not
 * seeds" does not apply here; there is a single canonical trajectory.
 */

import { runUntil } from '@open-loop/engine';
import { createInterlockerEngine } from '..';
import { DAYS_PER_SEASON, SEASONS, SECONDS_PER_DAY } from '../data/calendar';
import {
  BuildingsKey,
  type BuildingsApi,
  ResourcesKey,
  type ResourcesApi,
  SciencesKey,
  type SciencesApi,
  VillageKey,
  type VillageApi,
  WorkshopKey,
  type WorkshopApi,
} from '../modules';
import type { BuildingId, JobId, ScienceId } from '../data/types';

// ─── Lens constants (mirrors of data; the bot reasons with them) ──────────────
const CATNIP_PER_KITTEN = 4.25; // village.js:9 — the drain that gates population.
const FARMER_CATNIP = 5; // village.js:26 — gross; net +0.75 after own drain.
const FIELD_CATNIP = 0.625; // buildings.js:317 — pre-agriculture catnip source.
const WINTER_MULT = Math.min(...SEASONS.map((s) => s.catnipMultiplier)); // 0.25
const WINTER_SEC = DAYS_PER_SEASON * SECONDS_PER_DAY; // 200s

const SCIENCE_ORDER: ScienceId[] = [
  'calendar',
  'agriculture',
  'mining',
  'metal',
  'construction',
  'architecture',
];

export interface ArcModules {
  resources: ResourcesApi;
  buildings: BuildingsApi;
  village: VillageApi;
  sciences: SciencesApi;
  workshop: WorkshopApi;
}

export interface ArcEngine {
  engine: ReturnType<typeof createInterlockerEngine>['engine'];
  mods: ArcModules;
}

/** Build a fresh interlocker engine with every shipping module installed and the
 *  real-time loop started-then-stopped (the `bot.ts` pattern — the harness drives
 *  sim-time via `runUntil`, not the RAF loop). */
export function buildArcEngine(namespace = `arc-${arcSeq()}`): ArcEngine {
  const { engine } = createInterlockerEngine({ persistenceNamespace: namespace });
  engine.selectMod('kittens');
  engine.start();
  engine.stop();
  const mods: ArcModules = {
    resources: mustInject(engine, ResourcesKey, 'resources'),
    buildings: mustInject(engine, BuildingsKey, 'buildings'),
    village: mustInject(engine, VillageKey, 'village'),
    sciences: mustInject(engine, SciencesKey, 'sciences'),
    workshop: mustInject(engine, WorkshopKey, 'workshop'),
  };
  return { engine, mods };
}

// `Date.now()` is unavailable in workflow scripts and discouraged in probes;
// a module-scoped counter keeps namespaces unique within a process run.
let _arcSeq = 0;
function arcSeq(): number {
  return _arcSeq++;
}

function mustInject<T>(
  engine: ArcEngine['engine'],
  key: Parameters<ArcEngine['engine']['tryInject']>[0] & { __t?: T },
  label: string,
): T {
  const api = engine.tryInject(key) as T | undefined;
  if (!api) throw new Error(`interlocker/arc-bot: module "${label}" not installed`);
  return api;
}

// ─── Bot state ────────────────────────────────────────────────────────────────
interface BotState {
  /** Simple hysteresis so the farmer/scholar controller doesn't thrash 1↔0
   *  every tick when net catnip hovers around zero. */
  lastFarmerTarget: number;
}

const N = (v: unknown): number => Number(v as number);

function canBuyBuilding(mods: ArcModules, id: BuildingId): boolean {
  if (!mods.buildings.isVisible(id)) return false;
  const entry = mods.buildings.category.getEntry(id);
  return !!entry && entry.purchasable.canPurchase.value;
}
function buyBuilding(mods: ArcModules, id: BuildingId): boolean {
  const entry = mods.buildings.category.getEntry(id);
  if (!entry || !entry.purchasable.canPurchase.value) return false;
  // Buildings are leveled purchasables with bulk enabled — an explicit `1` buys
  // one, not "as many as affordable" (the canonical trap the old probe hit).
  entry.purchasable.purchase(1);
  return true;
}

/** Catnip the colony must hold banked NOW to survive the next winter at the
 *  current allocation — the worst-case seasonal deficit integrated over winter.
 *  Modeled on Kitten Scientists' worst-weather projection. */
function winterReserve(mods: ArcModules): number {
  const k = N(mods.resources.resources.kittens.value);
  const fields = mods.buildings.buildingCount('field') * FIELD_CATNIP;
  const farmers = N(mods.village.jobCounts.farmer.value) * FARMER_CATNIP;
  const worstProd = (fields + farmers) * WINTER_MULT;
  const worstDeficit = Math.max(0, CATNIP_PER_KITTEN * k - worstProd);
  return worstDeficit * WINTER_SEC;
}

// ─── The policy ───────────────────────────────────────────────────────────────
/** One tick of the bot. Called from the `until` callback so it runs once per
 *  simulated second. Order mirrors how a player works the panels. */
export function stepArcBot(mods: ArcModules, state: BotState): void {
  const { buildings, sciences } = mods;

  // 1) Manual openers — always work the Bonfire buttons. Gather is the bootstrap
  //    catnip channel; several clicks/tick approximates an engaged player.
  for (let i = 0; i < 10; i++) buildings.gatherCatnip();

  // 2) Research — buy the lowest incomplete science whenever affordable. Never
  //    hoard: science is only ever spent on research, so banking it is pure loss.
  for (const id of SCIENCE_ORDER) {
    if (sciences.scienceCompleted(id)) continue;
    const entry = sciences.category.getEntry(id);
    if (entry?.purchasable.canPurchase.value) entry.purchasable.purchase(1);
    break; // only the current frontier science; deeper ones are gated anyway
  }

  // 3) Jobs — the catnip-solvency controller. Farmers first (survival), then a
  //    minimal craft crew, then everything else to scholar (the architecture
  //    grind). Recomputed each tick against the live bank, with hysteresis.
  allocateJobs(mods, state);

  // 4) Buildings — housing + banking + economy, in priority order.
  buildingsPass(mods);

  // 5) Refine surplus catnip → wood (structural), never touching the winter bank.
  refinePass(mods);

  // 6) Craft toward the megalith once the workshop is up.
  craftPass(mods);
}

function allocateJobs(mods: ArcModules, state: BotState): void {
  const { resources, buildings, village, sciences } = mods;
  const k = N(resources.resources.kittens.value);
  if (k <= 0) return;

  const bank = N(resources.resources.catnip.value);
  const reserve = winterReserve(mods);
  const fieldsProd = buildings.buildingCount('field') * FIELD_CATNIP;

  // Farmer target: cover current consumption from farmers+fields with a small
  // surplus, and lean heavier when the bank is below the winter reserve (bank
  // low → prioritise survival), lighter when the bank is flush (draw down through
  // winter, free kittens for science). Hysteresis band ±1 avoids per-tick thrash.
  let farmers = 0;
  if (village.isJobVisible('farmer')) {
    const surplusWanted = bank < reserve ? CATNIP_PER_KITTEN : 0; // +1 kitten of headroom when banking
    const need = (surplusWanted + CATNIP_PER_KITTEN * k - fieldsProd) / FARMER_CATNIP;
    farmers = clamp(Math.ceil(need), 0, k);
    if (Math.abs(farmers - state.lastFarmerTarget) <= 1 && bank > reserve * 0.5) {
      farmers = clamp(state.lastFarmerTarget, 0, k);
    }
  }
  // Pre-agriculture (farmer not visible) `farmers` stays 0: population is fed by
  // fields alone, and the buildings pass paces huts so we never admit kittens the
  // fields can't feed.
  state.lastFarmerTarget = farmers;

  let rem = k - farmers;

  // Wood is the arc's structural bottleneck (huts scale ×2.5 in wood, workshop
  // needs 100 wood at once, beams cost 175 each), so the craft-crew share flexes
  // by phase:
  //   - workshop push (mining done, workshop unbuilt) → wood/miner heavy to bank
  //     the one-time 100-wood + 400-mineral cost;
  //   - megalith stockpile (architecture done, megalith uncrafted) → wood/miner
  //     heavy to feed the 25-beam / 50-slab / 5-plate recipe;
  //   - otherwise (the long architecture grind) → scholar-dominant, with only a
  //     small standing craft crew so science — the arc's 42000-point wall — is
  //     the primary sink. Biasing wood here (the earlier bug) starves science
  //     and the grind never finishes.
  const workshopPush =
    sciences.scienceCompleted('mining') && buildings.buildingCount('workshop') < 1;
  const megalithStockpile =
    sciences.scienceCompleted('architecture') && N(resources.resources.megalith.value) < 1;
  const heavyCraft = workshopPush || megalithStockpile;
  const woodShare = heavyCraft ? 0.4 : 0.15;
  const wantWoodcutters = rem > 0 ? Math.min(rem, Math.max(1, Math.round(k * woodShare))) : 0;
  const minerShare = heavyCraft ? 0.3 : 0.15;
  const wantMiners = village.isJobVisible('miner')
    ? Math.min(rem - wantWoodcutters, Math.max(1, Math.round(k * minerShare)))
    : 0;
  const woodcutters = Math.max(0, wantWoodcutters);
  const miners = Math.max(0, wantMiners);
  rem -= woodcutters + miners;

  // Everything else → scholar while science remains; otherwise pile into the
  // craft crew to finish the megalith stockpile.
  const scienceLeft = !sciences.scienceCompleted('architecture');
  const scholars = scienceLeft && village.isJobVisible('scholar') ? Math.max(0, rem) : 0;
  const extraCrew = rem - scholars; // architecture done → dump into woodcutters
  const targets: Record<JobId, number> = {
    farmer: farmers,
    woodcutter: woodcutters + Math.max(0, extraCrew),
    miner: miners,
    scholar: scholars,
  };

  // Apply: reduce first (frees headroom under the ≤ kittens write-site guard),
  // then increase.
  const order: JobId[] = ['scholar', 'woodcutter', 'farmer', 'miner'];
  for (const job of order) {
    if (targets[job] < village.jobCounts[job].value) safeSetJob(village, job, targets[job]);
  }
  for (const job of order) {
    if (targets[job] > village.jobCounts[job].value) safeSetJob(village, job, targets[job]);
  }
}

function safeSetJob(village: VillageApi, job: JobId, n: number): void {
  try {
    village.setJobCount(job, Math.max(0, Math.floor(n)));
  } catch {
    // setJobCount throws when the sum would exceed kittens — skip; the next
    // tick's reduce-then-increase pass reconciles.
  }
}

function buildingsPass(mods: ArcModules): void {
  const { resources, buildings, village } = mods;
  const catnipCap =
    N(resources.bag.remainingCapacityForType('catnip')) + N(resources.resources.catnip.value);
  const bank = N(resources.resources.catnip.value);
  const reserve = winterReserve(mods);
  const net = mods.village.catnipNetRate.value;
  const kittenRoom = N(resources.bag.remainingCapacityForType('kittens'));

  // a) Hut — the population lever. Buy when housing is full (or nearly) AND the
  //    colony can feed +2 more kittens: pre-agriculture that means the current
  //    net covers them; post-agriculture farmers will backfill, so gate on the
  //    bank being healthy instead of instantaneous net.
  const canFeedTwoMore = village.isJobVisible('farmer')
    ? bank > reserve // farmers can be hired to cover growth once agriculture lands
    : net >= 2 * CATNIP_PER_KITTEN;
  if (kittenRoom <= 0 && canFeedTwoMore && canBuyBuilding(mods, 'hut')) {
    if (buyBuilding(mods, 'hut')) return;
  }

  // b) Barn — winter banking. Buy when the winter reserve is bumping the catnip
  //    cap (can't bank enough to survive winter) and catnip is flush enough to
  //    afford it. Barns are the storage answer to the winter deficit.
  if (reserve > catnipCap * 0.8 && canBuyBuilding(mods, 'barn')) {
    if (buyBuilding(mods, 'barn')) return;
  }

  // c) Pasture — shaves catnip demand (−0.5%/each), directly easing winter.
  if (
    village.isJobVisible('farmer') &&
    buildings.buildingCount('pasture') < 10 &&
    canBuyBuilding(mods, 'pasture')
  ) {
    if (buyBuilding(mods, 'pasture')) return;
  }

  // d) Library — science multiplier. A handful is worth it; beyond that wood is
  //    better spent on huts/crafts.
  if (buildings.buildingCount('library') < 6 && canBuyBuilding(mods, 'library')) {
    if (buyBuilding(mods, 'library')) return;
  }

  // e) Field — the PRE-agriculture catnip engine only. Once farmers exist they
  //    are far cheaper catnip than a geometrically-priced field, so stop.
  if (
    !village.isJobVisible('farmer') &&
    bank > 20 &&
    buildings.buildingCount('field') < 30 &&
    canBuyBuilding(mods, 'field')
  ) {
    if (buyBuilding(mods, 'field')) return;
  }

  // f) Economy tier. Workshop FIRST — it gates the entire craft chain (megalith),
  //    so it precedes buildings that compete for its wood (mine, lumberMill) and
  //    minerals (smelter). Mine/smelter are held back until the workshop is built
  //    so the one-time 100-wood + 400-mineral workshop cost isn't starved by the
  //    tier buying cheaper mineral/wood sinks first (the ordering trap that kept
  //    beat 5 from ever firing).
  const workshopBuilt = buildings.buildingCount('workshop') >= 1;
  const tier: Array<[BuildingId, number]> = workshopBuilt
    ? [
        ['smelter', 6], // iron production — the plate input
        ['warehouse', 4], // +25 iron cap each: lifts iron 100→125+ so plate can craft
        ['lumberMill', 3], // +10% wood — compounding relief on the bottleneck
        ['mine', 4],
        ['quarry', 3],
      ]
    : [['workshop', 1]];
  for (const [id, cap] of tier) {
    if (buildings.buildingCount(id) < cap && canBuyBuilding(mods, id)) {
      if (buyBuilding(mods, id)) return;
    }
  }
}

function refinePass(mods: ArcModules): void {
  const { resources, buildings } = mods;
  const catnipCap =
    N(resources.bag.remainingCapacityForType('catnip')) + N(resources.resources.catnip.value);
  // Hold back for winter — but never reserve more than half the catnip storage.
  // A full worst-case winter reserve would sequester the entire catnip economy
  // and starve refine→wood, capping population and the workshop forever (the
  // wall the first bot hit). Capping the hold-back trades a couple of winter
  // kitten-deaths for a wood economy that actually feeds growth — the same call
  // a human makes. Excess catnip above the cap converts to structural wood.
  const hold = Math.min(winterReserve(mods), catnipCap * 0.5);
  const woodCap =
    N(resources.bag.remainingCapacityForType('wood')) + N(resources.resources.wood.value);
  for (let i = 0; i < 40; i++) {
    if (N(resources.resources.wood.value) >= woodCap * 0.95) break;
    if (N(resources.resources.catnip.value) <= hold + buildings.refineCatnipCost) break;
    if (!buildings.refineCatnip()) break;
  }
}

/** Craft stockpile caps. The megalith recipe is 25 beam / 50 slab / 5 plate;
 *  beam/slab carry a small buffer above it because warehouses (which lift the iron
 *  cap that gates plate) are themselves priced in beam + slab, so the intermediates
 *  must bootstrap the storage that unblocks the chain. */
const CRAFT_CAP = { beam: 35, slab: 60, plate: 5 };

function craftPass(mods: ArcModules): void {
  const { resources, workshop } = mods;
  if (!workshop.isVisible('beam') && !workshop.isVisible('megalith')) return;

  // Fire the megalith the moment its inputs are ready (arc closure).
  if (workshop.isVisible('megalith')) {
    const got = workshop.triggerCraft('megalith');
    if (Object.keys(got).length > 0) return;
  }

  // Build every intermediate that is below its cap and whose inputs are on hand —
  // INDEPENDENTLY, not just the single lowest-ratio one. (The old single-lowest
  // rule fixated on `plate`, whose iron stays 0 until a smelter runs, and so
  // never crafted beam/slab — raw wood/minerals pinned at cap.) Crafting is
  // atomic and a no-op when inputs are short, so eager calls are harmless.
  //
  // Crafted from workshop-up onward, NOT gated on architecture: beam eats wood
  // and slab eats minerals that would otherwise sit pinned at cap (wasted), and
  // — the load-bearing reason — a warehouse (priced in beam + slab) is what lifts
  // the iron cap from 100 to 125, and plate costs 125 iron. Gate the craft chain
  // behind architecture and plate can never be crafted: the warehouse it needs
  // can't be built. So the intermediates bootstrap the storage that unblocks
  // themselves. `plate` still only fires once a warehouse has raised the iron cap
  // (the atomic convert no-ops until iron ≥ 125).
  for (const id of ['beam', 'slab', 'plate'] as const) {
    if (!workshop.isVisible(id)) continue;
    if (N(resources.resources[id].value) >= CRAFT_CAP[id]) continue;
    workshop.triggerCraft(id);
  }
}

// ─── Beats + runner ───────────────────────────────────────────────────────────
export interface Beat {
  id: number;
  label: string;
  fired: (mods: ArcModules) => boolean;
}

/** Arc beats — timeline anchors, NOT tuning targets (measure-and-record). Each
 *  is a predicate marking a shape-change in the arc; the runner records when it
 *  first fires. */
export const ARC_BEATS: Beat[] = [
  {
    id: 1,
    label: 'First catnip field built',
    fired: (m) => m.buildings.buildingCount('field') >= 1,
  },
  {
    id: 2,
    label: 'First kitten arrives',
    fired: (m) => N(m.resources.resources.kittens.value) >= 1,
  },
  { id: 3, label: 'Calendar researched', fired: (m) => m.sciences.scienceCompleted('calendar') },
  {
    id: 4,
    label: 'Agriculture researched (farmers unlock)',
    fired: (m) => m.sciences.scienceCompleted('agriculture'),
  },
  {
    id: 5,
    label: 'Workshop online (mining + workshop built)',
    fired: (m) =>
      m.sciences.scienceCompleted('mining') && m.buildings.buildingCount('workshop') >= 1,
  },
  {
    id: 6,
    label: 'First megalith crafted',
    fired: (m) => N(m.resources.resources.megalith.value) >= 1,
  },
  {
    id: 7,
    label: 'Arc closure — architecture + megalith owned',
    fired: (m) =>
      m.sciences.scienceCompleted('architecture') && N(m.resources.resources.megalith.value) >= 1,
  },
];

export interface ArcResult {
  beatFireTimes: Record<number, number | null>;
  /** Sim-time at which architecture (the 42000-science arc wall) completed, or
   *  null if the budget ran out first. Not a beat (beat 7 pairs it with the
   *  megalith), but the arc's signature checkpoint — locked on its own. */
  architectureAt: number | null;
  finalSimTime: number;
  reachedClosure: boolean;
  final: Record<string, number>;
  /** Optional per-sample trajectory (populated when `sampleEvery` is set). */
  trajectory: TrajectorySample[];
}

export interface TrajectorySample {
  t: number;
  kittens: number;
  huts: number;
  fields: number;
  science: number;
  catnip: number;
  wood: number;
  minerals: number;
  iron: number;
  done: string;
}

/** Drive the arc bot to closure (beat 7), a caller `stopWhen`, or the sim-time
 *  budget — whichever is first — recording beat fire-times. `sampleEvery`
 *  (seconds) enables trajectory capture for probes; `stopWhen` lets a lock halt at
 *  its checkpoint (e.g. architecture completion) instead of burning the whole
 *  budget past it. */
export function runArc(
  opts: {
    maxSimTime: number;
    tickDelta?: number;
    sampleEvery?: number;
    stopWhen?: (mods: ArcModules) => boolean;
  } = { maxSimTime: 60000 },
): ArcResult {
  const { engine, mods } = buildArcEngine();
  const state: BotState = { lastFarmerTarget: 0 };
  const beatFireTimes: Record<number, number | null> = {};
  for (const b of ARC_BEATS) beatFireTimes[b.id] = null;
  const trajectory: TrajectorySample[] = [];
  const sampleEvery = opts.sampleEvery ?? 0;
  let lastSample = -1;
  let architectureAt: number | null = null;

  const result = runUntil({
    engine,
    until: ({ simTime }) => {
      stepArcBot(mods, state);
      for (const b of ARC_BEATS) {
        if (beatFireTimes[b.id] === null && b.fired(mods)) beatFireTimes[b.id] = simTime;
      }
      if (architectureAt === null && mods.sciences.scienceCompleted('architecture')) {
        architectureAt = simTime;
      }
      if (sampleEvery > 0) {
        const bucket = Math.floor(simTime / sampleEvery);
        if (bucket !== lastSample) {
          lastSample = bucket;
          trajectory.push(sample(mods, simTime));
        }
      }
      if (opts.stopWhen && opts.stopWhen(mods)) return true;
      return beatFireTimes[7] !== null;
    },
    maxSimTime: opts.maxSimTime,
    tickDelta: opts.tickDelta ?? 1,
  });

  return {
    beatFireTimes,
    architectureAt,
    finalSimTime: result.elapsedSimulated,
    reachedClosure: beatFireTimes[7] !== null,
    final: sampleToRecord(sample(mods, result.elapsedSimulated)),
    trajectory,
  };
}

function sample(mods: ArcModules, t: number): TrajectorySample {
  const done = SCIENCE_ORDER.filter((s) => mods.sciences.scienceCompleted(s)).join(',') || 'none';
  return {
    t,
    kittens: N(mods.resources.resources.kittens.value),
    huts: mods.buildings.buildingCount('hut'),
    fields: mods.buildings.buildingCount('field'),
    science: N(mods.resources.resources.science.value),
    catnip: N(mods.resources.resources.catnip.value),
    wood: N(mods.resources.resources.wood.value),
    minerals: N(mods.resources.resources.minerals.value),
    iron: N(mods.resources.resources.iron.value),
    done,
  };
}
function sampleToRecord(s: TrajectorySample): Record<string, number> {
  return {
    kittens: s.kittens,
    huts: s.huts,
    fields: s.fields,
    science: s.science,
    catnip: s.catnip,
    wood: s.wood,
    minerals: s.minerals,
    iron: s.iron,
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
