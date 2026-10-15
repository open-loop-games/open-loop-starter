/**
 * Shared probe fixture — not runnable on its own.
 *
 * Builds a real packer engine and plays the arc under a greedy fitter. The fitter is
 * balance-harness tooling, not a mechanic: Hardpoint ships no automation. It stands in for
 * the spine's reference player, so its rules are the spine's assumptions:
 * - every tick it buys each hull section and refit it can afford, and recommissions as
 *   soon as the next ship can be commissioned;
 * - it fits for salvage while saving, and for firepower once the sector's carrier can be
 *   engaged. In the fight it engages as soon as a window's fire covers the hull; if no
 *   affordable change gets there, it goes back to saving until the board next changes;
 * - a fitting pass fills empty cells from the bay or the fabricator by best gain per
 *   salvage, swaps or lifts a fitted module when that pays back within the time to the
 *   next structural purchase (at least `MIN_PAYBACK_S`), turns each Fire Director to its
 *   best facing, and trades cells between nearby modules while the score rises;
 * - when the board's stage or its objective changes, it steers toward the stage's claimed
 *   board (`PACKING_BOARDS`, keyed by search spec), the spine's assumption about what the
 *   stage fields; a stage with no claim gets a cheap seeded search instead. Steering
 *   toward a known best board is deliberately unrealistic: it measures the spine's
 *   packing, not a player's skill;
 * - it runs a pass when the stage or the objective changes, and otherwise only once
 *   salvage reaches the cheapest change the last pass wanted and could not afford;
 * - when a carrier holds that the board falls short of, and nothing is left to plate or
 *   refit, it buys a calibration level.
 *
 * This is not a duplicate of `../sim/harness.ts`. That boots the module list for
 * tick-by-tick behavioral specs; this plays an arc and records magnitudes.
 */

import { Decimal, toNumber, type Purchasable } from '@open-loop/engine';
import { bootTestEngine } from '@/test/bootTestEngine';
import { sharedBase } from '@/modules';
import {
  CARRIER_WINDOW_S,
  CARRIERS,
  HULL_H,
  HULL_W,
  PIECE_BY_ID,
  PACKING_BOARDS,
  PIECES,
  carrierBefore,
  type PieceId,
} from '../data';
import { bestPacking, decodeBoard, specKey, type Board } from './_search';
import {
  PIECE_INDEX,
  compileLattice,
  createPackerModules,
  emptyFit,
  getBoard,
  getFleet,
  getLine,
  getYard,
  latticeTotals,
  type Lattice,
  type LatticeFit,
  type Placed,
} from '../modules';

/** Sim-seconds per tick. */
export const DT = 1;

/** Shortest payback horizon a swap is judged against; longer while saving for structure. */
const MIN_PAYBACK_S = 60;
/** Farthest apart (Chebyshev) two modules may be for the fitter to try trading their cells. */
const TRADE_REACH = 2;

/** A beat or event as the fitter met it. */
export interface BeatRecord {
  id: string;
  /** sim-seconds from a cold start */
  t: number;
  /** salvage a second when it fired */
  income: number;
  /** firepower when it fired */
  firepower: number;
}

export interface ArcRecord {
  beats: BeatRecord[];
  /** sim-seconds when the run stopped */
  endedAt: number;
  /** why the run stopped: the story's end, a non-finite value, or the time limit */
  ended: 'story' | 'anomaly' | 'time';
  anomaly?: string;
  counts: {
    passes: number;
    steers: number;
    /** steers toward a claimed board, rather than a search's */
    claimed: number;
    fits: number;
    swaps: number;
    trades: number;
    engagements: number;
    withdrawals: number;
    calibrations: number;
  };
  /** the board when each ship was relieved, one string a row */
  boards: { ship: string; rows: string[]; fitted: Partial<Record<PieceId, number>> }[];
  trace: string[];
}

export interface ArcOptions {
  dt?: number;
  maxSimSeconds?: number;
  /** add a line every 60 s */
  trace?: boolean;
}

type Objective = 'salvage' | 'firepower';
interface Fit {
  type: PieceId;
  facing: number;
}

/** Play the arc under the fitter until the Dreadnought falls, or `maxSimSeconds`. */
export function runArc(options: ArcOptions = {}): ArcRecord {
  const { dt = DT, maxSimSeconds = 4 * 3600, trace = false } = options;
  const handle = bootTestEngine({
    modules: [...sharedBase, ...createPackerModules()],
    persistenceNamespacePrefix: 'packer-probe',
    intervalRate: 1 / dt,
  });
  const yard = getYard();
  const board = getBoard();
  const fleet = getFleet();
  const line = getLine();
  const num = (v: unknown) => toNumber(Decimal.fromValue(v as never));
  const price = (p: Purchasable) => num(p.getCost(1));
  const counts = {
    passes: 0,
    steers: 0,
    claimed: 0,
    fits: 0,
    swaps: 0,
    trades: 0,
    engagements: 0,
    withdrawals: 0,
    calibrations: 0,
  };

  const cells = () => {
    const out: { x: number; y: number }[] = [];
    for (let y = 0; y < HULL_H; y++)
      for (let x = 0; x < HULL_W; x++) if (board.isOpen(x, y)) out.push({ x, y });
    return out;
  };
  const variants = (types: PieceId[]): Fit[] =>
    types.flatMap((type) =>
      Array.from({ length: PIECE_BY_ID[type].turns ? 4 : 1 }, (_, facing) => ({ type, facing })),
    );

  let objective: Objective = 'salvage';
  // The board scores on its hull's lattice, compiled again only when a plate opens cells.
  let lattice: Lattice | null = null;
  let latticeKey = '';
  let cellIndex = new Map<string, number>();
  const live = (): LatticeFit => {
    const k = `${fleet.ship.value}|${board.openCells.value}`;
    if (!lattice || k !== latticeKey) {
      const open = cells();
      lattice = compileLattice(board.view, open);
      cellIndex = new Map(open.map((c, i) => [`${c.x},${c.y}`, i]));
      latticeKey = k;
    }
    const fit = emptyFit(lattice);
    for (const p of board.placed.value) {
      const i = cellIndex.get(`${p.x},${p.y}`)!;
      fit.piece[i] = PIECE_INDEX[p.type];
      fit.facing[i] = p.facing;
    }
    return fit;
  };
  const indexOf = (at: { x: number; y: number }) => cellIndex.get(`${at.x},${at.y}`)!;
  const scoreOf = (fit: LatticeFit) => {
    const t = latticeTotals(lattice!, fit, board.params.value);
    return objective === 'salvage' ? t.salvage : t.firepower;
  };
  /** The score of `fit` if one cell held `f` (or nothing) instead; `fit` is left as it was. */
  const scoreWith = (fit: LatticeFit, at: { x: number; y: number }, f: Fit | null) => {
    const i = indexOf(at);
    const piece = fit.piece[i]!;
    const facing = fit.facing[i]!;
    fit.piece[i] = f ? PIECE_INDEX[f.type] : -1;
    fit.facing[i] = f?.facing ?? 0;
    const v = scoreOf(fit);
    fit.piece[i] = piece;
    fit.facing[i] = facing;
    return v;
  };

  /** Salvage the last pass wanted and could not afford; the next pass waits for it. */
  let wantSalvage = Infinity;

  function structure() {
    for (const cat of [yard.hull, yard.refits])
      for (const { purchasable } of cat.getAll())
        if (purchasable.visible.value && purchasable.canPurchase.value) purchasable.purchase(1);
  }

  /** The live board as a search board: every open cell, fitted or empty. */
  const liveBoard = (): Board => {
    const b: Board = new Map();
    for (const c of cells()) {
      const o = board.occupantAt(c.x, c.y);
      b.set(`${c.x},${c.y}`, o ? { type: o.type, facing: o.facing } : null);
    }
    return b;
  };
  const platedSections = () =>
    yard.hull.getAll().filter((e) => e.def.ship === fleet.ship.value && e.purchasable.active.value)
      .length;

  /**
   * Steer toward the stage's claimed board (`PACKING_BOARDS`), or a seeded search's when the
   * stage has none. When the bay and the purse cover the whole board and it scores higher,
   * refit to it at once; otherwise take the change toward it that gains most, one cell at
   * a time, while one gains and can be paid for.
   */
  function steer() {
    const spec = {
      ship: fleet.ship.value,
      sections: platedSections(),
      types: PIECES.filter((p) => yard.unlocked(p.id)).map((p) => p.id),
      conditions: fleet.conditions.value,
    };
    const rows = PACKING_BOARDS[specKey(spec, objective)];
    const claimed = rows ? decodeBoard(spec, rows) : null;
    const target =
      claimed ??
      bestPacking(spec, objective, {
        seeds: [liveBoard()],
        restarts: 0,
        kicks: 0,
        params: board.params.value,
      }).board;
    if (claimed) counts.claimed++;
    const at = (k: string) => k.split(',').map(Number) as [number, number];

    // Wholesale: every copy the target needs beyond those owned, if the purse covers it.
    const need: Partial<Record<PieceId, number>> = {};
    for (const f of target.values()) if (f) need[f.type] = (need[f.type] ?? 0) + 1;
    let cost = 0;
    for (const [type, n] of Object.entries(need) as [PieceId, number][]) {
      const extra = n - yard.owned(type);
      if (extra > 0) cost += num(yard.fabricator.getPurchasable(type)!.getCost(extra));
    }
    const fit = live();
    const targetFit = emptyFit(lattice!);
    for (const [k, f] of target) {
      if (!f) continue;
      const i = cellIndex.get(k)!;
      targetFit.piece[i] = PIECE_INDEX[f.type];
      targetFit.facing[i] = f.facing;
    }
    if (cost <= num(yard.salvage.value) && scoreOf(targetFit) > scoreOf(fit) + 1e-9) {
      for (const p of [...board.placed.value]) board.remove(p.id);
      for (const [type, n] of Object.entries(need) as [PieceId, number][]) {
        // A fabricator purchase takes one copy; the purse was checked for the whole board.
        for (let k = yard.owned(type); k < n; k++)
          yard.fabricator.getPurchasable(type)!.purchase(1);
      }
      for (const [k, f] of target) if (f && board.place(f.type, ...at(k), f.facing)) counts.fits++;
      counts.steers++;
      return;
    }

    // By gain: the single-cell change toward the target that raises the score most.
    for (let guard = 0; guard < 200; guard++) {
      const now = live();
      const base = scoreOf(now);
      let best: { k: string; f: Fit | null; gain: number } | null = null;
      for (const [k, f] of target) {
        const o = board.occupantAt(...at(k));
        if (o ? f && o.type === f.type && o.facing === f.facing : !f) continue;
        if (f && (!o || o.type !== f.type) && board.stock(f.type) === 0) {
          const fab = yard.fabricator.getPurchasable(f.type)!;
          if (!fab.canPurchase.value) {
            wantSalvage = Math.min(wantSalvage, price(fab));
            continue;
          }
        }
        const gain = scoreWith(now, { x: at(k)[0], y: at(k)[1] }, f) - base;
        if (gain > 1e-9 && (!best || gain > best.gain)) best = { k, f, gain };
      }
      if (!best) break;
      const [x, y] = at(best.k);
      const o = board.occupantAt(x, y);
      const f = best.f;
      if (o && f && o.type === f.type) {
        while (board.occupantAt(x, y)!.facing !== f.facing) board.turn(o.id);
      } else {
        if (f && board.stock(f.type) === 0 && (!o || o.type !== f.type))
          yard.fabricator.getPurchasable(f.type)!.purchase(1);
        if (o) board.remove(o.id);
        if (f && board.place(f.type, x, y, f.facing)) counts.fits++;
      }
    }
    fillFromBay();
    counts.steers++;
  }

  /** Fit bay stock into empty cells where it gains most, while anything gains. */
  function fillFromBay() {
    for (let guard = 0; guard < 100; guard++) {
      const fit = live();
      const base = scoreOf(fit);
      let best: { fit: Fit; at: { x: number; y: number }; gain: number } | null = null;
      for (const c of cells()) {
        if (board.occupantAt(c.x, c.y)) continue;
        for (const type of PIECES.map((p) => p.id)) {
          if (board.stock(type) === 0 || !board.takes(type, c.x, c.y)) continue;
          for (let facing = 0; facing < (PIECE_BY_ID[type].turns ? 4 : 1); facing++) {
            const gain = scoreWith(fit, c, { type, facing }) - base;
            if (gain > 1e-9 && (!best || gain > best.gain))
              best = { fit: { type, facing }, at: c, gain };
          }
        }
      }
      if (!best) return;
      board.place(best.fit.type, best.at.x, best.at.y, best.fit.facing);
    }
  }

  /** One fitting pass toward the current objective; a stage change steers first. */
  function pass(stageChanged: boolean) {
    counts.passes++;
    wantSalvage = Infinity;
    if (stageChanged) steer();
    const mult = yard.globalMult.value;
    const types = PIECES.filter((p) => yard.unlocked(p.id)).map((p) => p.id);
    const all = variants(types);
    const affordable = (type: PieceId) =>
      board.stock(type) > 0 || yard.fabricator.getPurchasable(type)!.canPurchase.value;
    const want = (type: PieceId) => {
      if (board.stock(type) === 0)
        wantSalvage = Math.min(wantSalvage, price(yard.fabricator.getPurchasable(type)!));
    };
    const acquire = (type: PieceId) => {
      if (board.stock(type) > 0) return true;
      return toNumber(yard.fabricator.getPurchasable(type)!.purchase(1)) === 1;
    };

    for (let guard = 0; guard < 200; guard++) {
      const fit = live();
      const base = scoreOf(fit);
      // Fill: the best (cell, module) for any empty cell; stock first, then gain per salvage.
      const empty = cells().filter((c) => !board.occupantAt(c.x, c.y));
      let pick: { fit: Fit; at: { x: number; y: number }; value: number } | null = null;
      for (const c of empty)
        for (const f of all) {
          if (!board.takes(f.type, c.x, c.y)) continue;
          const gain = scoreWith(fit, c, f) - base;
          if (gain <= 1e-9) continue;
          if (!affordable(f.type)) {
            want(f.type);
            continue;
          }
          const cost = board.stock(f.type) > 0 ? 0 : price(yard.fabricator.getPurchasable(f.type)!);
          const value = cost === 0 ? Infinity : gain / cost;
          if (!pick || value > pick.value) pick = { fit: f, at: c, value };
        }
      if (pick) {
        if (
          acquire(pick.fit.type) &&
          board.place(pick.fit.type, pick.at.x, pick.at.y, pick.fit.facing)
        )
          counts.fits++;
        continue;
      }
      // Swap or lift: a fitted module replaced by a better variant, or by nothing.
      const nextStructure = [...yard.hull.getAll(), ...yard.refits.getAll()]
        .map((e) => e.purchasable)
        .filter((p) => p.visible.value && !p.maxed.value)
        .map(price);
      const toNext = nextStructure.length
        ? (Math.min(...nextStructure) - num(yard.salvage.value)) /
          Math.max(1e-9, board.salvageRate.value)
        : Infinity;
      const horizon = Math.max(MIN_PAYBACK_S, toNext);
      let swap: { p: Placed; fit: Fit | null; value: number } | null = null;
      for (const p of board.placed.value) {
        for (const f of [null, ...all]) {
          if (f && f.type === p.type && f.facing === p.facing) continue;
          if (f && f.type !== p.type && !board.takes(f.type, p.x, p.y)) continue;
          const gain = (scoreWith(fit, p, f) - base) * mult;
          if (gain <= 1e-9) continue;
          const turning = f && f.type === p.type;
          if (f && !turning && !affordable(f.type)) {
            want(f.type);
            continue;
          }
          const cost =
            !f || turning || board.stock(f.type) > 0
              ? 0
              : price(yard.fabricator.getPurchasable(f.type)!);
          if (cost / gain > horizon) continue;
          const value = cost === 0 ? Infinity : gain / cost;
          if (!swap || value > swap.value) swap = { p, fit: f, value };
        }
      }
      if (swap) {
        const { p, fit: to } = swap;
        if (to && to.type === p.type) {
          while (board.occupantAt(p.x, p.y)!.facing !== to.facing) board.turn(p.id);
        } else if (!to || acquire(to.type)) {
          board.remove(p.id);
          if (to) board.place(to.type, p.x, p.y, to.facing);
        }
        counts.swaps++;
        continue;
      }
      break;
    }
    trade();
  }

  /** Trade two nearby fitted modules' cells while that raises the score. */
  function trade() {
    for (let round = 0; round < 3; round++) {
      let best: { a: Placed; b: Placed; gain: number } | null = null;
      const ps = board.placed.value;
      const fit = live();
      const base = scoreOf(fit);
      for (let i = 0; i < ps.length; i++)
        for (let j = i + 1; j < ps.length; j++) {
          const a = ps[i]!;
          const b = ps[j]!;
          if (a.type === b.type) continue;
          if (Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) > TRADE_REACH) continue;
          if (!board.takes(a.type, b.x, b.y) || !board.takes(b.type, a.x, a.y)) continue;
          const ia = indexOf(a);
          const ib = indexOf(b);
          fit.piece[ia] = PIECE_INDEX[b.type];
          fit.facing[ia] = b.facing;
          fit.piece[ib] = PIECE_INDEX[a.type];
          fit.facing[ib] = a.facing;
          const gain = scoreOf(fit) - base;
          fit.piece[ia] = PIECE_INDEX[a.type];
          fit.facing[ia] = a.facing;
          fit.piece[ib] = PIECE_INDEX[b.type];
          fit.facing[ib] = b.facing;
          if (gain > 1e-9 && (!best || gain > best.gain)) best = { a, b, gain };
        }
      if (!best) return;
      const { a, b } = best;
      board.remove(a.id);
      board.remove(b.id);
      board.place(a.type, b.x, b.y, a.facing);
      board.place(b.type, a.x, a.y, b.facing);
      counts.trades++;
    }
  }

  /** Whether a section waits on a carrier still holding: the fitter cannot buy past it. */
  const gated = (section: string) => {
    const c = carrierBefore(section);
    return !!c && fleet.authoredFallen.value <= CARRIERS.indexOf(c);
  };

  // ── beats ──
  const beats: BeatRecord[] = [];
  const seen = new Set<string>();
  const mark = (id: string, t: number) => {
    if (seen.has(id)) return;
    seen.add(id);
    beats.push({ id, t, income: board.salvageRate.value, firepower: board.firepower.value });
  };
  const lines: string[] = [];
  const boards: ArcRecord['boards'] = [];
  const snapshot = () => {
    const rows: string[] = [];
    for (let y = 0; y < HULL_H; y++) {
      let row = '';
      for (let x = 0; x < HULL_W; x++) {
        const o = board.occupantAt(x, y);
        row += o ? PIECE_BY_ID[o.type].glyph : board.isOpen(x, y) ? '_' : ' ';
      }
      rows.push(row);
    }
    const fitted: Partial<Record<PieceId, number>> = {};
    for (const p of board.placed.value) fitted[p.type] = (fitted[p.type] ?? 0) + 1;
    boards.push({ ship: fleet.ship.value, rows, fitted });
  };

  let ended: ArcRecord['ended'] = 'time';
  let anomaly: string | undefined;
  let sim = 0;
  let signature = '';
  let gaveUp = '';
  let retryAt = Infinity;
  while (sim < maxSimSeconds) {
    handle.engine.tickDriver.tickOnce();
    sim += dt;
    const t = sim;
    const e = line.engagement.value;
    if (!e && line.last.value === 'withdrew') {
      counts.withdrawals++;
      line.last.value = null;
    }
    structure();
    if (line.canRecommission.value) {
      snapshot();
      line.recommission();
      mark(`${fleet.ship.value}:commissioned`, t);
    }
    // The objective: firepower while the sector's carrier can be engaged and has not been given up on.
    const stage = `${fleet.ship.value}|${yard.hull.getAll().filter((x) => x.purchasable.active.value).length}|${yard.refits.getAll().filter((x) => x.purchasable.active.value).length}|${PIECES.filter((p) => yard.unlocked(p.id)).length}|${fleet.honours.value}|${fleet.conditions.value.join('+')}`;
    // A fight given up on is tried again once salvage reaches what it wanted.
    if (gaveUp === stage && num(yard.salvage.value) >= retryAt) gaveUp = '';
    const fight = line.canEngage.value && gaveUp !== stage;
    const want: Objective = fight || e ? 'firepower' : 'salvage';
    const sig = `${stage}|${want}`;
    if (!e && (sig !== signature || num(yard.salvage.value) >= wantSalvage)) {
      objective = want;
      const changed = sig !== signature;
      signature = sig;
      pass(changed);
    }
    // A carrier the board falls short of is outlasted: calibrate when nothing else is left to buy.
    const c = fleet.carrier.value;
    const blocked =
      !!c &&
      !e &&
      (line.canEngage.value || fleet.shipDone.value) &&
      board.firepower.value * CARRIER_WINDOW_S < line.hullOf(c) &&
      !yard.hull
        .getAll()
        .some(
          (x) => x.purchasable.visible.value && !x.purchasable.maxed.value && !gated(x.def.id),
        ) &&
      !yard.refits.getAll().some((x) => x.purchasable.visible.value && !x.purchasable.maxed.value);
    if (blocked && line.canEngage.value) {
      const cal = yard.calibration.getPurchasable('calibration')!;
      if (cal.canPurchase.value) {
        cal.purchase(1);
        counts.calibrations++;
        signature = '';
      }
    }
    // Past the Dreadnought the run is over; a raised carrier is not the reference arc.
    if (fight && !e && !fleet.storyEnded.value) {
      if (board.firepower.value * CARRIER_WINDOW_S >= line.hullOf(c!)) {
        if (line.engage()) counts.engagements++;
      } else if (num(yard.salvage.value) < wantSalvage && !blocked) {
        gaveUp = stage;
        retryAt = wantSalvage;
      }
    }
    const s = num(yard.salvage.value);
    if (!Number.isFinite(s) || !Number.isFinite(board.salvageRate.value)) {
      anomaly = `non-finite at t=${t}: salvage=${s} rate=${board.salvageRate.value}`;
      ended = 'anomaly';
      break;
    }
    if (num(yard.fabricator.totalCount.value) >= 1) mark(`${fleet.ship.value}:first purchase`, t);
    for (const p of PIECES) if (p.unlock && yard.unlocked(p.id)) mark(p.unlock, t);
    for (const { def, purchasable } of yard.hull.getAll())
      if (purchasable.active.value) mark(def.id, t);
    for (const { def, purchasable } of yard.refits.getAll())
      if (purchasable.active.value) mark(def.id.replace(':', ':refit:'), t);
    if (fleet.authoredFallen.value > 0) {
      // A fallen authored carrier is marked by id, in breach-line order.
      for (let i = 0; i < fleet.authoredFallen.value; i++) mark(CARRIERS[i]!.id, t);
    }
    if (trace && t % 60 === 0) {
      lines.push(
        `t=${t} ${fleet.ship.value} salvage=${s.toExponential(2)} rate=${board.salvageRate.value.toExponential(2)} fp=${board.firepower.value.toExponential(2)} cells=${board.placed.value.length}/${board.openCells.value} obj=${objective} ${fleet.conditions.value.join('+') || 'calm'}${e ? ` ENGAGED ${e.remaining.toExponential(2)}` : ''}`,
      );
    }
    if (fleet.storyEnded.value) {
      snapshot();
      ended = 'story';
      break;
    }
  }
  if (ended === 'time') snapshot();
  const record: ArcRecord = { beats, endedAt: sim, ended, anomaly, counts, boards, trace: lines };
  handle.dispose();
  return record;
}
