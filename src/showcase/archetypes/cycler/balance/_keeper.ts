/**
 * Shared probe fixture, not runnable on its own. Builds a real cycler engine and plays it
 * under the reference keeper: a player, working only the verbs a player works by hand.
 *   - By day: hauls every net, takes a find (oakum when the tower is hurt), mends below 60%,
 *     then moves what stands in the wrong place for tonight's quarter (refunds are full, so
 *     moving costs nothing) and buys in a fixed order: two nets, the struck side's walls,
 *     four nets, the buttresses behind the wall, one winch, seven nets. It saves for the
 *     next piece in that order rather than buying past it.
 *   - By night: shores up while tonight's storm would come through and a breaker is left.
 *     `KeeperPolicy.shores` switches it off, and the find order can decline Brass fittings,
 *     so a probe can measure what each adds above the spine.
 *   - Between watches: buys knowledge in a fixed order until nothing is affordable.
 *
 * The game ships no automation but the winch, so the keeper is probe-side. This is not a
 * duplicate of `../sim/harness.ts`: that boots the module list for tick-by-tick behavioral
 * specs; this plays whole watches and reads magnitudes.
 */

import { seedRNG, toNumber, type Engine } from '@open-loop/engine';
import { bootTestEngine } from '@/test/bootTestEngine';
import { sharedBase } from '@/modules';
import {
  LogbookKey,
  WatchKey,
  createCyclerModules,
  groundAt,
  quartersOf,
  SHORE_CELLS,
  SIZE,
  type Cell,
  type LogbookApi,
  type WatchApi,
} from '../modules';
import type { FindId, KnowledgeId, PieceKind, PostingId, Quarter } from '../data';

/** Sim seconds per runner step. */
export const DT = 1;
export const INTERVAL_RATE = 4;

export interface Game {
  engine: Engine;
  logbook: LogbookApi;
  watch: WatchApi;
  dispose(): void;
}

/** A fresh engine, seeded, in the setup phase before any watch. */
export function buildGame(seed: number): Game {
  const handle = bootTestEngine({
    modules: [...sharedBase, ...createCyclerModules()],
    persistenceNamespacePrefix: 'cycler-probe',
    intervalRate: INTERVAL_RATE,
  });
  seedRNG(seed);
  const { engine } = handle;
  return {
    engine,
    logbook: engine.tryInject(LogbookKey)!,
    watch: engine.tryInject(WatchKey)!,
    dispose: handle.dispose,
  };
}

/** Opens a posting without buying its charter: the probe asks about the posting. */
export function forcePosting(g: Game, id: PostingId): void {
  const charter = `charter-${id}` as KnowledgeId;
  if (id !== 'haven') g.logbook.knowledge.getPurchasable(charter)!.count.value = 1;
  g.logbook.posting.select(id);
}

// ─── The reference keeper ───

const OPPOSITE: Record<Quarter, Quarter> = { N: 'S', S: 'N', E: 'W', W: 'E' };

/** The struck side's shore cells, middle first, so each new wall is braced by the last. */
function sideCells(q: Quarter): Cell[] {
  return SHORE_CELLS.filter((c) => quartersOf(c.x, c.y).includes(q)).sort(
    (a, b) => Math.abs(a.x - 2) + Math.abs(a.y - 2) - (Math.abs(b.x - 2) + Math.abs(b.y - 2)),
  );
}

/** The yard cells behind a side, the middle one first. */
function yardBehind(q: Quarter): Cell[] {
  const cells = [{ N: { x: 2, y: 1 }, S: { x: 2, y: 3 }, W: { x: 1, y: 2 }, E: { x: 3, y: 2 } }[q]];
  for (let y = 1; y < SIZE - 1; y++)
    for (let x = 1; x < SIZE - 1; x++) {
      if (groundAt(x, y) !== 'yard') continue;
      const touches = { N: y === 1, S: y === 3, W: x === 1, E: x === 3 }[q];
      if (touches && !cells.some((c) => c.x === x && c.y === y)) cells.push({ x, y });
    }
  return cells;
}

/** The order finds are taken in: a policy parameter, swept with brass and without. */
export const TAKES_BRASS: readonly FindId[] = ['brass', 'timbers', 'oakum', 'cork', 'glass'];
export const DECLINES_BRASS: readonly FindId[] = ['timbers', 'oakum', 'cork', 'glass'];

export interface KeeperPolicy {
  findPreference: readonly FindId[];
  /** Whether the keeper shores up at night. Off, the night is the spine's sum alone. */
  shores: boolean;
}

export const REFERENCE_POLICY: KeeperPolicy = { findPreference: TAKES_BRASS, shores: true };

export function keeperDay(w: WatchApi, policy: KeeperPolicy): void {
  const q = w.quarter.value;
  w.haulAll();
  const hurt = () => toNumber(w.integrity.value) < 0.6 * w.integrityMax.value;
  if (w.offer.value.length) {
    const pick =
      (hurt() && w.offer.value.includes('oakum') ? 'oakum' : undefined) ??
      policy.findPreference.find((f) => w.offer.value.includes(f));
    if (pick) w.take(pick);
  }
  if (hurt()) w.mend(w.integrityMax.value);

  const walls = sideCells(q);
  const butts = yardBehind(q);
  const lee = sideCells(OPPOSITE[q]);
  const kindAt = (x: number, y: number) => w.placed.value.find((p) => p.x === x && p.y === y)?.kind;
  for (const p of [...w.placed.value]) {
    const onSide = quartersOf(p.x, p.y).includes(q);
    const behind = butts.some((c) => c.x === p.x && c.y === p.y);
    if (p.kind === 'breakwater' && !onSide) w.clear(p.x, p.y);
    if (p.kind === 'net' && onSide) w.clear(p.x, p.y);
    if (p.kind === 'buttress' && !behind) w.clear(p.x, p.y);
    if (p.kind === 'winch' && behind) w.clear(p.x, p.y);
  }
  const count = (k: PieceKind) => w.placed.value.filter((p) => p.kind === k).length;
  const netCells = [...lee, ...SHORE_CELLS.filter((c) => !quartersOf(c.x, c.y).includes(q))];
  const firstFree = (cells: readonly Cell[]) => cells.find((c) => !kindAt(c.x, c.y));
  const winchCell = { N: { x: 2, y: 3 }, S: { x: 2, y: 1 }, W: { x: 3, y: 2 }, E: { x: 1, y: 2 } }[
    q
  ];

  const wants: [PieceKind, () => Cell | undefined][] = [
    ['net', () => (count('net') < 2 ? firstFree(netCells) : undefined)],
    ['breakwater', () => firstFree(walls)],
    ['net', () => (count('net') < 4 ? firstFree(netCells) : undefined)],
    ['buttress', () => firstFree(butts)],
    [
      'winch',
      () => (count('winch') < 1 && !kindAt(winchCell.x, winchCell.y) ? winchCell : undefined),
    ],
    ['net', () => (count('net') < 7 ? firstFree(netCells) : undefined)],
  ];
  for (const [kind, where] of wants) {
    let cell = where();
    while (cell) {
      // Save up for this piece before anything later in the order.
      if (!w.build(kind, cell.x, cell.y)) return;
      cell = where();
    }
  }
}

export function keeperNight(w: WatchApi, policy: KeeperPolicy): void {
  if (!policy.shores) return;
  const leakTonight = w.storm.value - (w.wards.value[w.quarter.value] + w.shored.value);
  if (
    leakTonight > 0 &&
    w.struck.value < w.breakers.value - 1 &&
    toNumber(w.salvage.value) >= w.shoreCost.value
  )
    w.shoreUp();
}

const KNOWLEDGE_ORDER: readonly KnowledgeId[] = [
  'almanac',
  'stone',
  'tides',
  'charter-skerry',
  'charter-wrath',
  'stores',
];

export function keeperBetweenWatches(l: LogbookApi): void {
  for (let bought = true; bought;) {
    bought = false;
    for (const id of KNOWLEDGE_ORDER) {
      const p = l.knowledge.getPurchasable(id)!;
      if (p.canPurchase.value && toNumber(p.purchase(1)) > 0) bought = true;
    }
  }
}

// ─── Playing a watch ───

export interface WatchBeat {
  at: number;
  text: string;
}

export interface WatchResult {
  nights: number;
  entries: number;
  weathered: number;
  gathered: number;
  /** Seconds from the watch's start to the light going out. */
  seconds: number;
  beats: WatchBeat[];
}

const fixed = (x: number) => x.toFixed(1);

/**
 * Plays the watch in progress to the wreck under the keeper, recording beats: each dusk and
 * dawn, each first piece, the first find. Returns null if the tower still stands at
 * `maxSeconds`.
 */
export function playWatch(
  g: Game,
  policy: KeeperPolicy = REFERENCE_POLICY,
  maxSeconds = 4 * 3600,
): WatchResult | null {
  const w = g.watch;
  const keptBefore = w.cycle.count.value;
  const beats: WatchBeat[] = [];
  let t = 0;
  const beat = (text: string) => beats.push({ at: t, text });
  let lastPhase = w.phase.value;
  const seenKinds = new Set<PieceKind>();
  let sawFind = false;
  let lastIntegrity = toNumber(w.integrity.value);
  let nightLeak = 0;
  let nightShored = 0;
  beat(
    `watch begins at ${w.posting.value.name}, g ${w.g.value.toFixed(3)}, W0 ${fixed(w.storm.value)}, ` +
      `integrity ${lastIntegrity.toFixed(0)}, salvage ${toNumber(w.salvage.value).toFixed(0)}`,
  );

  while (t < maxSeconds) {
    g.engine.tickDriver.advanceTime(DT);
    t += DT;
    if (w.cycle.count.value > keptBefore) break;
    const integrity = toNumber(w.integrity.value);
    if (integrity < lastIntegrity) nightLeak += lastIntegrity - integrity;
    nightShored = Math.max(nightShored, w.shored.value);
    lastIntegrity = integrity;
    if (w.phase.value !== lastPhase) {
      const q = w.quarter.value;
      if (w.phase.value === 'night') {
        beat(
          `dusk → night ${w.night.value}: storm ${fixed(w.storm.value)} from ${q}, ` +
            `ward ${fixed(w.wards.value[q])}, salvage ${toNumber(w.salvage.value).toFixed(0)}, ` +
            `pieces ${w.placed.value.length}`,
        );
        nightLeak = 0;
        nightShored = 0;
      } else if (w.phase.value === 'day') {
        beat(
          `dawn → day ${w.night.value}: night leaked ${fixed(nightLeak)}, ` +
            `tower ${integrity.toFixed(0)}/${w.integrityMax.value.toFixed(0)}, ` +
            `shored +${nightShored.toFixed(0)} ward`,
        );
      }
      lastPhase = w.phase.value;
    }
    for (const p of w.placed.value)
      if (!seenKinds.has(p.kind)) {
        seenKinds.add(p.kind);
        beat(`first ${p.kind} placed`);
      }
    if (!sawFind && w.offer.value.length === 0 && w.night.value > 1 && w.phase.value === 'day') {
      sawFind = true;
      beat('first find taken from the tideline');
    }
    if (w.phase.value === 'day') keeperDay(w, policy);
    if (w.phase.value === 'night') keeperNight(w, policy);
  }
  if (w.cycle.count.value === keptBefore) return null;
  const s = g.logbook.lastWatch.value!;
  beat(
    `the light goes out: ${s.nights} nights kept, weathered ${s.weathered.toFixed(0)}, ` +
      `gathered ${s.gathered.toFixed(0)} → ${s.entries} logbook entries`,
  );
  return {
    nights: s.nights,
    entries: s.entries,
    weathered: s.weathered,
    gathered: s.gathered,
    seconds: t,
    beats,
  };
}

export function clock(t: number): string {
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = Math.floor(t % 60);
  return h
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}
