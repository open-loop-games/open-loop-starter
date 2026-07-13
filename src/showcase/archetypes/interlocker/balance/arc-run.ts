/**
 * Interlocker arc runner — drives the SHIPPING automation for the balance lane.
 *
 * Replaces the retired bespoke bot (`balance/arc-bot.ts`, studio/open-loop-starter#8).
 * Per the studio convention "automation is game code, not a harness bot": the
 * policy now lives in `modules/automation.ts` and ships to players. This runner
 * only does what a player at the keyboard does that automation deliberately does
 * NOT — work the manual openers (gather / refine, the manual tier) — then lets the
 * automation module's own `onTick` drive build/assign/research/craft. The measured
 * beats are therefore exactly what a player running the canonical profile sees.
 *
 * The canonical profile IS the shipped `DEFAULT_AUTOMATION_PROFILE` — nothing is
 * injected here (that is the no-drift guarantee: the sweep axis and the player's
 * tuning surface are the same object). A sweep would mutate the automation Api's
 * profile after boot, before `runUntil`.
 *
 * Determinism: arc-1 has no RNG in any shipping module, so a run is fully
 * deterministic — one run is the measurement, no seed sweep.
 */

import { runUntil } from '@open-loop/engine';
import { createInterlockerEngine } from '..';
import {
  AutomationKey,
  type AutomationApi,
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
import type { ScienceId } from '../data/types';

const SCIENCE_ORDER: ScienceId[] = [
  'calendar',
  'agriculture',
  'mining',
  'metal',
  'construction',
  'architecture',
];

/** Automation tiers the harness force-unlocks so the shipping automation drives
 *  from t=0 (the milestone-gated unlocks are player-facing pacing, not a
 *  measurement concern). */
const FORCED_TIERS = ['build', 'assign', 'research', 'craft'] as const;

/** Manual-opener cadence per simulated second — an engaged player working the
 *  Bonfire buttons. Gather is the bootstrap catnip channel; refine (100 catnip →
 *  1 wood) is the only pre-population wood source, held back so it doesn't drain
 *  the catnip the automation is banking for winter. */
const GATHERS_PER_SEC = 10;
const REFINES_PER_SEC = 40;
const CATNIP_HOLD_FRACTION = 0.5;

export interface ArcModules {
  resources: ResourcesApi;
  buildings: BuildingsApi;
  village: VillageApi;
  sciences: SciencesApi;
  workshop: WorkshopApi;
  automation: AutomationApi;
}

export interface ArcEngine {
  engine: ReturnType<typeof createInterlockerEngine>['engine'];
  mods: ArcModules;
}

/** Build a fresh interlocker engine with every shipping module installed (incl.
 *  automation), the real-time loop started-then-stopped (the harness drives
 *  sim-time via `runUntil`), and every automation tier force-unlocked. */
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
    automation: mustInject(engine, AutomationKey, 'automation'),
  };
  for (const tier of FORCED_TIERS) mods.automation.tierSystem.unlock(tier);
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
  if (!api) throw new Error(`interlocker/arc-run: module "${label}" not installed`);
  return api;
}

const N = (v: unknown): number => Number(v as number);

/** Work the manual-tier openers for the `dt`-second step: gather catnip, then
 *  refine surplus catnip → wood above the winter hold-back. Rates scale with `dt`
 *  so a coarse `tickDelta` (the balance methodology's 1–5s for minute-scale
 *  events) keeps the same per-second manual cadence at a fraction of the wall
 *  cost. The automation module drives everything else through its own `onTick`. */
function stepManual(mods: ArcModules, dt: number): void {
  const { buildings, resources } = mods;
  const gathers = Math.max(1, Math.round(GATHERS_PER_SEC * dt));
  const refines = Math.max(1, Math.round(REFINES_PER_SEC * dt));
  for (let i = 0; i < gathers; i++) buildings.gatherCatnip();
  const catnip = resources.resources.catnip;
  const catnipCap = N(resources.bag.remainingCapacityForType('catnip')) + N(catnip.value);
  const hold = catnipCap * CATNIP_HOLD_FRACTION;
  for (let i = 0; i < refines; i++) {
    if (N(catnip.value) <= hold + buildings.refineCatnipCost) break;
    if (!buildings.refineCatnip()) break;
  }
}

// ─── Beats + runner ───────────────────────────────────────────────────────────
export interface Beat {
  id: number;
  label: string;
  fired: (mods: ArcModules) => boolean;
}

/** Arc beats — timeline anchors, NOT tuning targets (measure-and-record). Each is
 *  a predicate marking a shape-change in the arc; the runner records when it first
 *  fires. Predicates are pure module-state reads, agnostic to what drove the
 *  state — so the shipping-automation run yields the same beats the retired bot's
 *  did (where it reached them). */
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
  logHouses: number;
  fields: number;
  science: number;
  catnip: number;
  wood: number;
  minerals: number;
  iron: number;
  megalith: number;
  done: string;
}

export interface ArcRunOptions {
  maxSimTime: number;
  tickDelta?: number;
  sampleEvery?: number;
  stopWhen?: (mods: ArcModules) => boolean;
}

/** Mutable recorder threaded through both the sync and async runners so the
 *  per-tick body (manual openers + beat/architecture/trajectory capture) lives in
 *  exactly one place. */
interface ArcRecorder {
  beatFireTimes: Record<number, number | null>;
  architectureAt: number | null;
  trajectory: TrajectorySample[];
  lastSample: number;
}

function newRecorder(): ArcRecorder {
  const beatFireTimes: Record<number, number | null> = {};
  for (const b of ARC_BEATS) beatFireTimes[b.id] = null;
  return { beatFireTimes, architectureAt: null, trajectory: [], lastSample: -1 };
}

/** One tick's worth of harness work: pump the manual openers, then record beats,
 *  architecture, and trajectory at `simTime`. Returns whether the run should stop
 *  (caller `stopWhen`, or arc closure at beat 7). Evaluated BEFORE the engine
 *  advances, matching `runUntil` predicate semantics. */
function recordTick(
  rec: ArcRecorder,
  mods: ArcModules,
  simTime: number,
  opts: ArcRunOptions,
): boolean {
  stepManual(mods, opts.tickDelta ?? 1);
  for (const b of ARC_BEATS) {
    if (rec.beatFireTimes[b.id] === null && b.fired(mods)) rec.beatFireTimes[b.id] = simTime;
  }
  if (rec.architectureAt === null && mods.sciences.scienceCompleted('architecture')) {
    rec.architectureAt = simTime;
  }
  const sampleEvery = opts.sampleEvery ?? 0;
  if (sampleEvery > 0) {
    const bucket = Math.floor(simTime / sampleEvery);
    if (bucket !== rec.lastSample) {
      rec.lastSample = bucket;
      rec.trajectory.push(sample(mods, simTime));
    }
  }
  if (opts.stopWhen && opts.stopWhen(mods)) return true;
  return rec.beatFireTimes[7] !== null;
}

function finalize(rec: ArcRecorder, mods: ArcModules, finalSimTime: number): ArcResult {
  return {
    beatFireTimes: rec.beatFireTimes,
    architectureAt: rec.architectureAt,
    finalSimTime,
    reachedClosure: rec.beatFireTimes[7] !== null,
    final: sampleToRecord(sample(mods, finalSimTime)),
    trajectory: rec.trajectory,
  };
}

/** Drive the shipping automation to closure (beat 7), a caller `stopWhen`, or the
 *  sim-time budget — whichever is first — recording beat fire-times. `sampleEvery`
 *  (seconds) enables trajectory capture; `stopWhen` lets a lock halt at its
 *  checkpoint (e.g. architecture completion) instead of burning the whole budget.
 *  Synchronous — used by `balance/probes.ts` scripts and the fast beat locks. */
export function runArc(opts: ArcRunOptions = { maxSimTime: 60000 }): ArcResult {
  const { mods, engine } = buildArcEngine();
  const rec = newRecorder();
  const tickDelta = opts.tickDelta ?? 1;
  const result = runUntil({
    engine,
    until: ({ simTime }) => recordTick(rec, mods, simTime, opts),
    maxSimTime: opts.maxSimTime,
    tickDelta,
  });
  return finalize(rec, mods, result.elapsedSimulated);
}

/** Same trajectory as {@link runArc}, driven by a manual `simulateTick` loop that
 *  yields to the event loop every {@link YIELD_EVERY} ticks. Deep-arc locks run
 *  ~100k+ ticks (tens of seconds of synchronous work); yielding keeps the Vitest
 *  worker's RPC heartbeat alive so a long lock doesn't trip an `onTaskUpdate`
 *  timeout. Identical results to `runArc` (same per-tick body, same tickDelta). */
export async function runArcAsync(opts: ArcRunOptions = { maxSimTime: 60000 }): Promise<ArcResult> {
  const { mods, engine } = buildArcEngine();
  const rec = newRecorder();
  const tickDelta = opts.tickDelta ?? 1;
  let simTime = 0;
  let ticks = 0;
  while (simTime < opts.maxSimTime) {
    if (recordTick(rec, mods, simTime, opts)) break;
    engine.tickDriver.simulateTick(tickDelta);
    simTime += tickDelta;
    if (++ticks % YIELD_EVERY === 0) await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  return finalize(rec, mods, simTime);
}

/** Ticks between event-loop yields in {@link runArcAsync}. Large enough that the
 *  yield overhead is negligible against the arc's ~100k ticks, small enough that
 *  the RPC heartbeat never starves. */
const YIELD_EVERY = 2000;

function sample(mods: ArcModules, t: number): TrajectorySample {
  const done = SCIENCE_ORDER.filter((s) => mods.sciences.scienceCompleted(s)).join(',') || 'none';
  return {
    t,
    kittens: N(mods.resources.resources.kittens.value),
    huts: mods.buildings.buildingCount('hut'),
    logHouses: mods.buildings.buildingCount('logHouse'),
    fields: mods.buildings.buildingCount('field'),
    science: N(mods.resources.resources.science.value),
    catnip: N(mods.resources.resources.catnip.value),
    wood: N(mods.resources.resources.wood.value),
    minerals: N(mods.resources.resources.minerals.value),
    iron: N(mods.resources.resources.iron.value),
    megalith: N(mods.resources.resources.megalith.value),
    done,
  };
}
function sampleToRecord(s: TrajectorySample): Record<string, number> {
  return {
    kittens: s.kittens,
    huts: s.huts,
    logHouses: s.logHouses,
    fields: s.fields,
    science: s.science,
    catnip: s.catnip,
    wood: s.wood,
    minerals: s.minerals,
    iron: s.iron,
    megalith: s.megalith,
  };
}
