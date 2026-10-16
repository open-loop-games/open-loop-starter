/**
 * Shared probe fixture, not runnable on its own. Builds a real cycler engine and plays it
 * under the reference keeper: a player, working only the verbs a player works by hand.
 *   - By day: hauls every net, takes a find (oakum when the tower is hurt), mends below 60%,
 *     then moves what stands in the wrong place for tonight's forecast (refunds are full, so
 *     moving costs nothing) and buys in a fixed order: two nets, the struck side's walls,
 *     the backing side's walls, four nets, the yard behind the struck side (screens on a
 *     spray night, buttresses on a gale), one winch, seven nets. It saves for the next piece
 *     in that order rather than buying past it, and rows out to a sighted wreck once it is
 *     saving, coming home with time to spare before dusk.
 *   - By night: shores up tonight's quarter while its storm would come through and a breaker
 *     is left.
 *   - On the closing posting: signals the relief at the first dawn the board is built and
 *     the forecast carries no spray, or at the crossing night regardless.
 *   - Between watches: saves for the road to the closing posting (stone to the posting's
 *     storm, then each charter in turn), buys whatever is affordable once it is bought, and
 *     takes the closing posting once it is open.
 * `KeeperPolicy` switches the night and day risks off one at a time, so a probe can measure
 * what each adds above the spine.
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
  yardQuartersOf,
  type Cell,
  type LogbookApi,
  type WatchApi,
} from '../modules';
import {
  ANCHORS,
  SEA,
  type FindId,
  type KnowledgeId,
  type PieceKind,
  type PostingId,
  type Quarter,
} from '../data';

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

/** A side's shore cells, middle first, so each new wall is braced by the last. */
function sideCells(q: Quarter): Cell[] {
  return SHORE_CELLS.filter((c) => quartersOf(c.x, c.y).includes(q)).sort(
    (a, b) => Math.abs(a.x - 2) + Math.abs(a.y - 2) - (Math.abs(b.x - 2) + Math.abs(b.y - 2)),
  );
}

/** The yard cells behind a side, the middle one first. */
function yardBehind(q: Quarter): Cell[] {
  const cells: Cell[] = [];
  for (let y = 1; y < SIZE - 1; y++)
    for (let x = 1; x < SIZE - 1; x++)
      if (groundAt(x, y) === 'yard' && yardQuartersOf(x, y).includes(q)) cells.push({ x, y });
  return cells.sort((a, b) => yardQuartersOf(a.x, a.y).length - yardQuartersOf(b.x, b.y).length);
}

const has = (cells: readonly Cell[], x: number, y: number) =>
  cells.some((c) => c.x === x && c.y === y);

/** The order finds are taken in: a policy parameter, swept with brass and without. */
export const TAKES_BRASS: readonly FindId[] = ['brass', 'timbers', 'oakum', 'cork', 'glass'];
export const DECLINES_BRASS: readonly FindId[] = ['timbers', 'oakum', 'cork', 'glass'];

export interface KeeperPolicy {
  findPreference: readonly FindId[];
  /** Whether the keeper shores up at night. Off, the night is the spine's sum alone. */
  shores: boolean;
  /** Whether the keeper rows out to wrecks. */
  rows: boolean;
}

export const REFERENCE_POLICY: KeeperPolicy = {
  findPreference: TAKES_BRASS,
  shores: true,
  rows: true,
};

/** Seconds of day the keeper keeps in hand when rowing home. */
const ROW_MARGIN = 5;

/** Sites tonight's board and buys toward it; true when every piece on it is built. */
function siteBoard(w: WatchApi): boolean {
  const q = w.quarter.value;
  const b = w.backQuarter.value;
  const yardPiece: PieceKind = w.kind.value === 'spray' ? 'screen' : 'buttress';
  const walls = [...sideCells(q), ...(b ? sideCells(b) : [])];
  const yard = yardBehind(q);
  const struck = (x: number, y: number) =>
    quartersOf(x, y).includes(q) || (b !== null && quartersOf(x, y).includes(b));
  const kindAt = (x: number, y: number) => w.placed.value.find((p) => p.x === x && p.y === y)?.kind;
  for (const p of [...w.placed.value]) {
    const yardWrong =
      (p.kind === 'buttress' || p.kind === 'screen') &&
      (p.kind !== yardPiece || !has(yard, p.x, p.y));
    if (p.kind === 'breakwater' && !struck(p.x, p.y)) w.clear(p.x, p.y);
    if (p.kind === 'net' && struck(p.x, p.y)) w.clear(p.x, p.y);
    if (yardWrong) w.clear(p.x, p.y);
    if (p.kind === 'winch' && has(yard, p.x, p.y)) w.clear(p.x, p.y);
  }
  const count = (k: PieceKind) => w.placed.value.filter((p) => p.kind === k).length;
  const netCells = [
    ...sideCells(OPPOSITE[q]),
    ...SHORE_CELLS.filter((c) => !quartersOf(c.x, c.y).includes(q)),
  ].filter((c) => !struck(c.x, c.y));
  const firstFree = (cells: readonly Cell[]) => cells.find((c) => !kindAt(c.x, c.y));
  const winchCell = yardBehind(OPPOSITE[q]).find((c) => !has(yard, c.x, c.y))!;

  const wants: [PieceKind, () => Cell | undefined][] = [
    ['net', () => (count('net') < 2 ? firstFree(netCells) : undefined)],
    ['breakwater', () => firstFree(sideCells(q))],
    ['breakwater', () => firstFree(walls)],
    ['net', () => (count('net') < 4 ? firstFree(netCells) : undefined)],
    [yardPiece, () => firstFree(yard)],
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
      if (!w.build(kind, cell.x, cell.y)) return false;
      cell = where();
    }
  }
  return true;
}

export function keeperDay(w: WatchApi, policy: KeeperPolicy): void {
  const left = w.phaseLength.value - w.clock.value;
  if (w.boat.value === 'out') {
    if (w.wreck.value <= 0 || left <= SEA.rowSeconds + ROW_MARGIN) w.rowHome();
    return;
  }
  if (!w.home.value) return;
  w.haulAll();
  const hurt = () => toNumber(w.integrity.value) < 0.6 * w.integrityMax.value;
  if (w.offer.value.length) {
    const pick =
      (hurt() && w.offer.value.includes('oakum') ? 'oakum' : undefined) ??
      policy.findPreference.find((f) => w.offer.value.includes(f));
    if (pick) w.take(pick);
  }
  if (hurt()) w.mend(w.integrityMax.value);
  const built = siteBoard(w);
  // Waits for a built board and a gale without spray, until the crossing night; after it the
  // final gale only grows.
  const crossing = w.night.value >= ANCHORS.crossNightRef;
  if (w.canSignal.value && ((built && w.kind.value === 'gale') || crossing)) w.signalRelief();
  if (policy.rows && w.wreck.value > 0 && left > 2 * SEA.rowSeconds + ROW_MARGIN + 10) w.rowOut();
}

export function keeperNight(w: WatchApi, policy: KeeperPolicy): void {
  if (!policy.shores) return;
  const q = w.quarter.value;
  const leakTonight = w.storm.value - (w.wards.value[q] + w.shored.value[q]);
  if (
    leakTonight > 0 &&
    w.struck.value < w.breakers.value - 1 &&
    toNumber(w.salvage.value) >= w.shoreCost.value
  )
    w.shoreUp();
}

/** The road to the closing posting, bought in order, saving for each step. */
const ROAD: readonly [KnowledgeId, number][] = [
  ['stone', ANCHORS.closingStone],
  ['charter-skerry', 1],
  ['charter-wrath', 1],
  ['charter-flannans', 1],
];
/** Then whatever is affordable, in this order. */
const AFTER: readonly KnowledgeId[] = ['almanac', 'stone', 'tides', 'stores'];

/** Buys knowledge, then picks the next posting: the closing one once the road is bought. */
export function keeperBetweenWatches(l: LogbookApi): void {
  for (const [id, levels] of ROAD)
    while (l.level(id) < levels) {
      const p = l.knowledge.getPurchasable(id)!;
      if (!p.purchase(1)) break;
    }
  const onRoad = ROAD.some(([id, levels]) => l.level(id) < levels);
  for (let bought = !onRoad; bought;) {
    bought = false;
    for (const id of AFTER) {
      const p = l.knowledge.getPurchasable(id)!;
      if (p.purchase(1)) bought = true;
    }
  }
  const ready = l.level('charter-flannans') >= 1 && l.level('stone') >= ANCHORS.closingStone;
  l.posting.select(ready ? 'flannans' : 'haven');
}

// ─── Playing a watch ───

export interface WatchBeat {
  at: number;
  text: string;
}

export interface WatchResult {
  posting: PostingId;
  nights: number;
  entries: number;
  weathered: number;
  gathered: number;
  relief: 'held' | 'lost' | null;
  /** Seconds from the watch's start to its end. */
  seconds: number;
  /** Wrecks rowed to, and nights caught out. */
  rows: number;
  caught: number;
  beats: WatchBeat[];
}

const fixed = (x: number) => x.toFixed(1);

/**
 * Plays the watch in progress to its end under the keeper, recording beats: each dusk and
 * dawn, each first piece, the first find, the relief. Returns null if the tower still stands
 * at `maxSeconds`.
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
  let lastBoat = w.boat.value;
  const seenKinds = new Set<PieceKind>();
  let sawFind = false;
  let signalled = false;
  let rows = 0;
  let caught = 0;
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
    nightShored = Math.max(nightShored, w.shored.value[w.quarter.value]);
    lastIntegrity = integrity;
    if (w.boat.value !== lastBoat) {
      if (w.boat.value === 'out') rows++;
      lastBoat = w.boat.value;
    }
    if (w.phase.value !== lastPhase) {
      const q = w.quarter.value;
      if (w.phase.value === 'night') {
        if (w.caughtOut.value) caught++;
        const kind = w.spray.value ? ` spray ${Math.round(w.spray.value * 100)}%` : '';
        const back = w.backQuarter.value ? ` backing ${w.backQuarter.value}` : '';
        beat(
          `dusk → night ${w.night.value}: storm ${fixed(w.storm.value)} from ${q}${back}${kind}, ` +
            `ward ${fixed(w.wards.value[q])} + screens ${fixed(w.screens.value[q])}, ` +
            `salvage ${toNumber(w.salvage.value).toFixed(0)}, pieces ${w.placed.value.length}` +
            (w.caughtOut.value ? ', caught out' : ''),
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
    if (w.relief.value && !signalled) {
      signalled = true;
      beat(`the relief is signalled on day ${w.night.value}: the final gale tonight`);
    }
    if (w.phase.value === 'day') keeperDay(w, policy);
    if (w.phase.value === 'night') keeperNight(w, policy);
  }
  if (w.cycle.count.value === keptBefore) return null;
  const s = g.logbook.lastWatch.value!;
  const end =
    s.relief === 'held'
      ? 'the light held through the final gale'
      : s.relief === 'lost'
        ? 'the light went out under the final gale'
        : 'the light goes out';
  beat(
    `${end}: ${s.nights} nights kept, weathered ${s.weathered.toFixed(0)}, ` +
      `gathered ${s.gathered.toFixed(0)} → ${s.entries} logbook entries`,
  );
  return {
    posting: s.posting,
    nights: s.nights,
    entries: s.entries,
    weathered: s.weathered,
    gathered: s.gathered,
    relief: s.relief,
    seconds: t,
    rows,
    caught,
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
