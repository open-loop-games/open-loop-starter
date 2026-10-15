/**
 * Shared probe fixture — not runnable on its own.
 *
 * The packing search: the best arrangement of a board stage, found by local search on the
 * shipping evaluator (`../modules/layout.ts`). The packing probe measures the spine's
 * claims with it, and the reference fitter steers toward its result. It ignores prices:
 * what it finds is what the stage can field, not what a purse can buy.
 *
 * From a seed board and from random boards, it changes one cell's module or facing, or
 * trades two cells' modules, while the score rises. It scores on the hull's lattice
 * (`compileLattice`), the evaluator's dense form. A seeded RNG keeps runs repeatable.
 */

import {
  BEACON_GAIN,
  COOLANT_GAIN,
  DIRECTOR_BOOST,
  DIRECTOR_REACH,
  HULL_H,
  HULL_W,
  LANCE_DPS,
  LINK_BOOST,
  PIECE_BY_ID,
  PIECES,
  PULSE_DPS,
  RAIL_DPS,
  TRACTOR_GAIN,
  sectionAt,
  tagsAt,
  type ConditionId,
  type PieceId,
  type ShipId,
} from '../data';
import {
  FACING_STEP,
  PIECE_INDEX,
  RELATION_OFFSETS,
  compileLattice,
  emptyFit,
  latticeTotals,
  underConditions,
  type Coord,
  type Lattice,
  type LatticeFit,
  type LayoutParams,
  type OccupancyView,
} from '../modules';

/** A director's glyph by facing: bow, starboard, stern, port. */
const DIRECTOR_GLYPH = ['^', '>', 'v', '<'];

/**
 * A board as the rows `STAGE_PACKING` stores: '.' off the plated hull, '_' an empty cell, a
 * module's glyph, and a Fire Director as the arrow of its facing.
 */
export function encodeBoard(board: Board): string[] {
  const rows: string[] = [];
  for (let y = 0; y < HULL_H; y++) {
    let row = '';
    for (let x = 0; x < HULL_W; x++) {
      const k = `${x},${y}`;
      const f = board.get(k);
      row += !board.has(k)
        ? '.'
        : !f
          ? '_'
          : PIECE_BY_ID[f.type].turns
            ? DIRECTOR_GLYPH[f.facing]!
            : PIECE_BY_ID[f.type].glyph;
    }
    rows.push(row);
  }
  while (rows.length && /^\.*$/.test(rows[rows.length - 1]!)) rows.pop();
  return rows;
}

/**
 * The board a stored claim's rows describe, on a spec's hull; null when its cells are not
 * the hull's open cells, as after a reshaped map.
 */
export function decodeBoard(spec: SearchSpec, rows: readonly string[]): Board | null {
  const board: Board = new Map();
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      const facing = DIRECTOR_GLYPH.indexOf(ch);
      const type = facing >= 0 ? 'director' : PIECES.find((p) => p.glyph === ch)?.id;
      board.set(`${x},${y}`, ch === '_' || !type ? null : { type, facing: Math.max(0, facing) });
    }),
  );
  const open = openCells(spec.ship, spec.sections);
  return open.length === board.size && open.every((c) => board.has(keyOf(c))) ? board : null;
}

/**
 * What a stored board is keyed by: the hull, the types, the conditions and what it scores.
 * Refits and honours scale a board without changing which board is best, so stages that
 * differ only in those share one.
 */
export const specKey = (spec: SearchSpec, score: Objective) =>
  [
    spec.ship,
    spec.sections,
    [...spec.types].sort().join('+'),
    [...spec.conditions].sort().join('+') || 'calm',
    score,
  ].join(' ');

/** What a search packs: a ship's plated hull, the types it may field, and the sector's conditions. */
export interface SearchSpec {
  ship: ShipId;
  sections: number;
  types: readonly PieceId[];
  conditions: readonly ConditionId[];
}

/** A cell's content: a module and its facing, or empty. */
export type Fit = { type: PieceId; facing: number } | null;
export type Board = Map<string, Fit>;
export type Objective = 'salvage' | 'firepower';

/** The default strengths under a sector's conditions. */
export const paramsFor = (
  conditions: readonly ConditionId[],
  coolantGain = COOLANT_GAIN,
): LayoutParams =>
  underConditions(
    {
      dps: { pulse: PULSE_DPS, rail: RAIL_DPS, lance: LANCE_DPS },
      boost: { capacitor: LINK_BOOST, targeting: LINK_BOOST, director: DIRECTOR_BOOST },
      beaconGain: BEACON_GAIN,
      coolantGain,
      tractorGain: TRACTOR_GAIN,
      rayRange: DIRECTOR_REACH,
      closeQuarters: false,
    },
    conditions,
  );

/** Kicks a search makes by default. */
export const KICKS = 40;
/** Cells past a kick's block its descent sweeps. */
const KICK_MARGIN = 2;
/** Farthest apart (Chebyshev) two cells may be for a trade. */
const TRADE_REACH = 2;

/** mulberry32 */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The reach a ship's hull gives each relation: a ray walks its facing until the hull ends. */
export function hullView(ship: ShipId): OccupancyView {
  const inHull = (x: number, y: number) => sectionAt(ship, x, y) >= 0;
  return {
    occupantAt: () => null,
    *reach(x, y, relation, facing = 0) {
      if (relation === 'ray') {
        const { dx, dy } = FACING_STEP[facing]!;
        for (let cx = x + dx, cy = y + dy; inHull(cx, cy); cx += dx, cy += dy)
          yield { x: cx, y: cy };
        return;
      }
      for (const o of RELATION_OFFSETS[relation]) yield { x: x + o.dx, y: y + o.dy };
    },
    *occupied() {},
    isOpen: inHull,
  };
}

/** The open cells of a ship with this many sections plated. */
export const openCells = (ship: ShipId, sections: number) => {
  const out: Coord[] = [];
  for (let y = 0; y < HULL_H; y++)
    for (let x = 0; x < HULL_W; x++) {
      const s = sectionAt(ship, x, y);
      if (s >= 0 && s <= sections) out.push({ x, y });
    }
  return out;
};

const keyOf = (c: Coord) => `${c.x},${c.y}`;

/** A lattice board as a search board. */
export function boardOf(lattice: Lattice, fit: LatticeFit): Board {
  const b: Board = new Map();
  lattice.cells.forEach((c, i) =>
    b.set(
      keyOf(c),
      fit.piece[i]! < 0 ? null : { type: PIECES[fit.piece[i]!]!.id, facing: fit.facing[i]! },
    ),
  );
  return b;
}

export const sameFit = (a: Fit, b: Fit) =>
  a?.type === b?.type && (a?.facing ?? 0) === (b?.facing ?? 0);

/** A board's totals and counts on a spec's hull, before the firepower chain. */
export function scoreBoard(spec: SearchSpec, board: Board, params?: LayoutParams): Packing {
  const cells = openCells(spec.ship, spec.sections);
  const lattice = compileLattice(hullView(spec.ship), cells);
  const fit = emptyFit(lattice);
  const counts: Partial<Record<PieceId, number>> = {};
  cells.forEach((c, i) => {
    const f = board.get(keyOf(c));
    if (!f) return;
    fit.piece[i] = PIECE_INDEX[f.type];
    fit.facing[i] = f.facing;
    counts[f.type] = (counts[f.type] ?? 0) + 1;
  });
  return { ...latticeTotals(lattice, fit, params ?? paramsFor(spec.conditions)), board, counts };
}

export interface Packing {
  firepower: number;
  salvage: number;
  board: Board;
  counts: Partial<Record<PieceId, number>>;
}

/**
 * The best board found for a stage, scored on salvage or on firepower.
 * Each seed board is one start; `restarts` adds random starts, by default fewer for larger
 * hulls. `kicks` re-rolls a block of the best board that many times, keeping each that
 * descends higher.
 */
export function bestPacking(
  spec: SearchSpec,
  score: Objective,
  options: {
    seeds?: readonly Board[];
    restarts?: number;
    kicks?: number;
    params?: LayoutParams;
  } = {},
): Packing {
  const { ship } = spec;
  const p = options.params ?? paramsFor(spec.conditions);
  const cells = openCells(ship, spec.sections);
  const lattice = compileLattice(hullView(ship), cells);
  const n = cells.length;
  // Each cell's candidates as (piece, facing) pairs, empty first.
  const cand = cells.map((c) => {
    const tags = tagsAt(ship, c.x, c.y);
    const out: [number, number][] = [[-1, 0]];
    for (const t of spec.types) {
      const def = PIECE_BY_ID[t];
      if (def.mount && !tags.includes(def.mount)) continue;
      for (let f = 0; f < (def.turns ? 4 : 1); f++) out.push([PIECE_INDEX[t], f]);
    }
    return out;
  });
  const mounts = cells.map((c) => tagsAt(ship, c.x, c.y));
  const takes = (i: number, piece: number) => {
    if (piece < 0) return true;
    const mount = PIECES[piece]!.mount;
    return !mount || mounts[i]!.includes(mount);
  };
  // Trades are tried between cells near each other.
  const pairs: [number, number][] = [];
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++)
      if (
        Math.max(Math.abs(cells[a]!.x - cells[b]!.x), Math.abs(cells[a]!.y - cells[b]!.y)) <=
        TRADE_REACH
      )
        pairs.push([a, b]);
  const random = rng(n * 131 + spec.types.length * 7 + spec.conditions.length);
  const restarts = options.restarts ?? (n > 50 ? 6 : n > 30 ? 10 : 16);
  const kicks = options.kicks ?? KICKS;
  const value = (fit: LatticeFit) => latticeTotals(lattice, fit, p)[score];
  const randomize = (fit: LatticeFit, i: number) => {
    const choices = cand[i]!;
    const [pc, fc] = choices[1 + Math.floor(random() * (choices.length - 1))] ?? choices[0]!;
    fit.piece[i] = pc;
    fit.facing[i] = fc;
  };
  /**
   * Local descent: single-cell changes, then trades, while any raises the score. A kick's
   * descent sweeps only the cells near it.
   */
  const descend = (
    fit: LatticeFit,
    over: readonly number[],
    trades: readonly [number, number][],
  ) => {
    let v = value(fit);
    for (let improved = true; improved;) {
      improved = false;
      for (const i of over)
        for (const [pc, fc] of cand[i]!) {
          const op = fit.piece[i]!;
          const of = fit.facing[i]!;
          if (op === pc && (pc < 0 || of === fc)) continue;
          fit.piece[i] = pc;
          fit.facing[i] = fc;
          const next = value(fit);
          if (next > v + 1e-9) {
            v = next;
            improved = true;
          } else {
            fit.piece[i] = op;
            fit.facing[i] = of;
          }
        }
      for (const [a, b] of trades) {
        const pa = fit.piece[a]!;
        const pb = fit.piece[b]!;
        const fa = fit.facing[a]!;
        const fb = fit.facing[b]!;
        if ((pa === pb && fa === fb) || !takes(a, pb) || !takes(b, pa)) continue;
        fit.piece[a] = pb;
        fit.facing[a] = fb;
        fit.piece[b] = pa;
        fit.facing[b] = fa;
        const next = value(fit);
        if (next > v + 1e-9) {
          v = next;
          improved = true;
        } else {
          fit.piece[a] = pa;
          fit.facing[a] = fa;
          fit.piece[b] = pb;
          fit.facing[b] = fb;
        }
      }
    }
    return v;
  };
  const all = cells.map((_, i) => i);
  const dist = (a: number, b: number) =>
    Math.max(Math.abs(cells[a]!.x - cells[b]!.x), Math.abs(cells[a]!.y - cells[b]!.y));
  const copy = (fit: LatticeFit) => ({ piece: fit.piece.slice(), facing: fit.facing.slice() });
  const seeds = options.seeds ?? [];
  const seeded = (seed: Board, i: number) => {
    const f = seed.get(keyOf(cells[i]!));
    if (f === undefined) return undefined;
    return cand[i]!.find(([pc, fc]) =>
      f ? pc === PIECE_INDEX[f.type] && fc === f.facing : pc < 0,
    );
  };
  let best = { value: -1, fit: emptyFit(lattice) };
  for (let r = 0; r < seeds.length + restarts || r === 0; r++) {
    const fit = emptyFit(lattice);
    for (let i = 0; i < n; i++) {
      const seed = r < seeds.length ? seeded(seeds[r]!, i) : undefined;
      if (seed) {
        fit.piece[i] = seed[0];
        fit.facing[i] = seed[1];
      } else randomize(fit, i);
    }
    const v = descend(fit, all, pairs);
    if (v > best.value) best = { value: v, fit: copy(fit) };
  }
  // Kicks: re-roll a block of the best board around a random cell, descend, keep a gain.
  for (let k = 0; k < kicks && n > 0; k++) {
    const fit = copy(best.fit);
    const centre = cells[Math.floor(random() * n)]!;
    const radius = 1 + Math.floor(random() * 2);
    const c = all.find((i) => cells[i] === centre)!;
    for (const i of all) if (dist(i, c) <= radius) randomize(fit, i);
    const near = all.filter((i) => dist(i, c) <= radius + KICK_MARGIN);
    const v = descend(
      fit,
      near,
      pairs.filter(
        ([x, y]) => dist(x, c) <= radius + KICK_MARGIN && dist(y, c) <= radius + KICK_MARGIN,
      ),
    );
    if (v > best.value + 1e-9) best = { value: v, fit };
  }
  const counts: Partial<Record<PieceId, number>> = {};
  for (const pc of best.fit.piece)
    if (pc >= 0) counts[PIECES[pc]!.id] = (counts[PIECES[pc]!.id] ?? 0) + 1;
  return { ...latticeTotals(lattice, best.fit, p), board: boardOf(lattice, best.fit), counts };
}
