/**
 * Shared probe fixture — not runnable on its own.
 *
 * Builds a real packer engine and plays the arc under a greedy fitter. The fitter is
 * balance-harness tooling, not a mechanic: Hardpoint ships no automation. It stands in for
 * the spine's reference player, so its rules are the spine's assumptions. After every tick:
 * - it buys every hull section and refit it can afford;
 * - while a cell is empty, it fits a module from the bay where it gains most, or else buys
 *   the module with the best firepower gained per salvage and fits that;
 * - on a full board, it swaps a fitted module for a better type when the swap pays back
 *   within the time to the next structural purchase (at least `MIN_PAYBACK_S`);
 * - with no swap worth making, it trades cells between fitted modules while that raises
 *   board firepower, because rearranging is free.
 *
 * This is not a duplicate of `../sim/harness.ts`. That boots the module list for
 * tick-by-tick behavioral specs; this plays an arc and records magnitudes.
 */

import { Decimal, toNumber, type Purchasable } from '@open-loop/engine';
import { bootTestEngine } from '@/test/bootTestEngine';
import { sharedBase } from '@/modules';
import { CORE_CELLS, FULL_CELLS, HULL_H, HULL_W, PIECES, type PieceId } from '../data';
import { createPackerModules, getBoard, getYard, type Placed } from '../modules';

/** Sim-seconds per tick. The arc is tick-robust: 0.25 s to 2 s moves the full hull by under 1%. */
export const DT = 1;

/** Shortest payback horizon a swap is judged against; longer while saving for structure. */
const MIN_PAYBACK_S = 60;

/** A beat as the fitter met it. */
export interface BeatRecord {
  id: string;
  /** sim-seconds from a cold start */
  t: number;
  /** salvage a second when it fired */
  income: number;
}

export interface ArcRecord {
  beats: BeatRecord[];
  /** sim-seconds when the run stopped */
  endedAt: number;
  /** why the run stopped: the hull fully fitted, a non-finite value, or the time limit */
  ended: 'fitted' | 'anomaly' | 'time';
  anomaly?: string;
  counts: { fits: number; swaps: number; rearranges: number };
  salvage: number;
  rate: number;
  firepower: number;
  /** the finished board's packing, beside the spine's claims */
  packing: {
    weaponShare: number;
    railShare: number;
    weaponMult: number;
    linksPerWeapon: number;
    stampsPerWeapon: number;
    globalMult: number;
  };
  /** the board, one string a row: a module's glyph, `_` an empty open cell, space a closed one */
  board: string[];
  trace: string[];
}

export interface ArcOptions {
  dt?: number;
  maxSimSeconds?: number;
  /** add a line every 30 s */
  trace?: boolean;
}

/** Play the arc under the fitter until the hull is fully fitted, or `maxSimSeconds`. */
export function runArc(options: ArcOptions = {}): ArcRecord {
  const { dt = DT, maxSimSeconds = 3600, trace = false } = options;
  const handle = bootTestEngine({
    modules: [...sharedBase, ...createPackerModules()],
    persistenceNamespacePrefix: 'packer-probe',
    intervalRate: 1 / dt,
  });
  const yard = getYard();
  const board = getBoard();
  const num = (v: unknown) => toNumber(Decimal.fromValue(v as never));
  const price = (p: Purchasable) => num(p.getCost(1));
  const counts = { fits: 0, swaps: 0, rearranges: 0 };

  const cells = () => {
    const out: { x: number; y: number }[] = [];
    for (let y = 0; y < HULL_H; y++)
      for (let x = 0; x < HULL_W; x++) if (board.isOpen(x, y)) out.push({ x, y });
    return out;
  };

  /** Best cell and gain for a type over the given cells, by board-firepower delta. */
  function bestCell(type: PieceId, among: { x: number; y: number }[]) {
    let best: { x: number; y: number; gain: number } | null = null;
    for (const c of among) {
      const gain = board.preview(type, c.x, c.y).delta;
      if (!best || gain > best.gain) best = { ...c, gain };
    }
    return best;
  }

  /** Trade two fitted modules' cells while that raises board firepower. */
  function rearrange() {
    for (let pass = 0; pass < 8; pass++) {
      let best: { a: Placed; b: Placed; gain: number } | null = null;
      const ps = board.placed.value;
      for (let i = 0; i < ps.length; i++)
        for (let j = i + 1; j < ps.length; j++) {
          if (ps[i]!.type === ps[j]!.type) continue;
          const gain = board.previewSwap(ps[i]!, ps[j]!).delta;
          if (gain > 1e-9 && (!best || gain > best.gain)) best = { a: ps[i]!, b: ps[j]!, gain };
        }
      if (!best) return;
      const { a, b } = best;
      board.remove(a.id);
      board.remove(b.id);
      board.place(a.type, b.x, b.y);
      board.place(b.type, a.x, a.y);
      counts.rearranges++;
    }
  }

  function fit() {
    // Structure first: sections and refits as soon as they are affordable.
    for (const cat of [yard.hull, yard.refits])
      for (const { purchasable } of cat.getAll())
        if (purchasable.visible.value && purchasable.canPurchase.value) purchasable.purchase();

    const unlockedTypes = PIECES.filter((p) => yard.unlocked(p.id)).map((p) => p.id);
    for (let guard = 0; guard < 64; guard++) {
      const empty = cells().filter((c) => !board.occupantAt(c.x, c.y));
      if (empty.length > 0) {
        // Fit stock first, then buy the best gain-per-salvage module for an empty cell.
        let pick: { type: PieceId; x: number; y: number; score: number; buy: boolean } | null =
          null;
        for (const type of unlockedTypes) {
          const b = bestCell(type, empty);
          if (!b || b.gain <= 0) continue;
          const inStock = board.stock(type) > 0;
          const fab = yard.fabricator.getPurchasable(type)!;
          if (!inStock && !fab.canPurchase.value) continue;
          const score = inStock ? Infinity : b.gain / price(fab);
          if (!pick || score > pick.score) pick = { type, x: b.x, y: b.y, score, buy: !inStock };
        }
        if (!pick) break;
        if (pick.buy) yard.fabricator.getPurchasable(pick.type)!.purchase(1);
        if (board.place(pick.type, pick.x, pick.y)) counts.fits++;
        continue;
      }
      // Board full: swap a fitted module for a better type when it pays back before the
      // next structural purchase would have been affordable anyway.
      const nextStructure = [...yard.hull.getAll(), ...yard.refits.getAll()]
        .map((e) => e.purchasable)
        .filter((p) => p.visible.value && !p.maxed.value)
        .map(price);
      const toNext = nextStructure.length
        ? (Math.min(...nextStructure) - num(yard.salvage.value)) /
          Math.max(1e-9, board.salvageRate.value)
        : Infinity;
      const horizon = Math.max(MIN_PAYBACK_S, toNext);
      let swap: {
        id: string;
        type: PieceId;
        x: number;
        y: number;
        score: number;
        buy: boolean;
      } | null = null;
      for (const p of board.placed.value) {
        for (const type of unlockedTypes) {
          if (type === p.type) continue;
          const gain = board.preview(type, p.x, p.y).delta * yard.globalMult.value;
          if (gain <= 0) continue;
          const inStock = board.stock(type) > 0;
          const fab = yard.fabricator.getPurchasable(type)!;
          if (!inStock && !fab.canPurchase.value) continue;
          const cost = inStock ? 0 : price(fab);
          if (cost / gain > horizon) continue;
          const score = cost === 0 ? Infinity : gain / cost;
          if (!swap || score > swap.score)
            swap = { id: p.id, type, x: p.x, y: p.y, score, buy: !inStock };
        }
      }
      if (!swap) {
        rearrange();
        break;
      }
      if (swap.buy) yard.fabricator.getPurchasable(swap.type)!.purchase(1);
      board.remove(swap.id);
      board.place(swap.type, swap.x, swap.y);
      counts.swaps++;
    }
  }

  // ── beats ──
  const beats: BeatRecord[] = [];
  const seen = new Set<string>();
  const mark = (id: string, t: number) => {
    if (seen.has(id)) return;
    seen.add(id);
    beats.push({ id, t, income: board.salvageRate.value });
  };
  const lines: string[] = [];

  let ended: ArcRecord['ended'] = 'time';
  let anomaly: string | undefined;
  let sim = 0;
  while (sim < maxSimSeconds) {
    handle.engine.tickDriver.tickOnce();
    fit();
    sim += dt;
    const t = sim;
    const s = num(yard.salvage.value);
    if (!Number.isFinite(s) || !Number.isFinite(board.salvageRate.value)) {
      anomaly = `non-finite at t=${t}: salvage=${s} rate=${board.salvageRate.value}`;
      ended = 'anomaly';
      break;
    }
    if (num(yard.fabricator.totalCount.value) >= 1) mark('first purchase', t);
    if (board.placed.value.length >= 1) mark('first fit', t);
    for (const p of PIECES) if (p.unlock && yard.unlocked(p.id)) mark(p.unlock, t);
    for (const { def, purchasable } of yard.hull.getAll())
      if (purchasable.active.value) mark(def.beat, t);
    for (const { def, purchasable } of yard.refits.getAll())
      if (purchasable.active.value) mark(def.beat, t);
    if (board.openCells.value === CORE_CELLS && board.placed.value.length === CORE_CELLS)
      mark('corvette fitted', t);
    if (trace && t % 30 === 0) {
      const emptyCells = board.openCells.value - board.placed.value.length;
      const owned = PIECES.map(
        (p) => `${p.glyph}${yard.unlocked(p.id) ? yard.owned(p.id) : '-'}`,
      ).join(' ');
      const next = yard.hull.getAll().find((e) => !e.purchasable.active.value);
      lines.push(
        `t=${t} salvage=${s.toFixed(0)} rate=${board.salvageRate.value.toFixed(1)} empty=${emptyCells} owned[${owned}] next=${next ? `${next.def.id}@${price(next.purchasable).toFixed(0)}` : '-'}`,
      );
    }
    if (board.openCells.value === FULL_CELLS && board.placed.value.length === FULL_CELLS) {
      mark('arc complete: hull fully fitted', t);
      ended = 'fitted';
      break;
    }
  }

  // ── the finished board ──
  const L = board.layout.value;
  const weapons = [...L.pieces.values()].filter((p) => p.type === 'pulse' || p.type === 'rail');
  const rails = weapons.filter((w) => w.type === 'rail').length;
  const links = weapons.reduce((n, w) => n + w.terms.filter((x) => x.kind === 'link').length, 0);
  const stamps = weapons.reduce((n, w) => n + w.terms.filter((x) => x.kind === 'stamp').length, 0);
  const dpsSum = weapons.reduce(
    (n, w) => n + board.params.value.dps[w.type as 'pulse' | 'rail'],
    0,
  );
  const fpSum = weapons.reduce((n, w) => n + w.firepower, 0);
  const rows: string[] = [];
  for (let y = 0; y < HULL_H; y++) {
    let row = '';
    for (let x = 0; x < HULL_W; x++) {
      const o = board.occupantAt(x, y);
      row += o ? PIECES.find((p) => p.id === o.type)!.glyph : board.isOpen(x, y) ? '_' : ' ';
    }
    rows.push(row);
  }
  const record: ArcRecord = {
    beats,
    endedAt: sim,
    ended,
    anomaly,
    counts,
    salvage: num(yard.salvage.value),
    rate: board.salvageRate.value,
    firepower: board.firepower.value,
    packing: {
      weaponShare: weapons.length / Math.max(1, L.pieces.size),
      railShare: rails / Math.max(1, weapons.length),
      weaponMult: fpSum / Math.max(1, dpsSum),
      linksPerWeapon: links / Math.max(1, weapons.length),
      stampsPerWeapon: stamps / Math.max(1, weapons.length),
      globalMult: yard.globalMult.value,
    },
    board: rows,
    trace: lines,
  };
  handle.dispose();
  return record;
}
