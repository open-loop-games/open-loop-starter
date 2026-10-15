/**
 * The arrangement evaluator: a pure function from an occupancy view to every module's
 * firepower and contribution. It holds no module state and no reactivity, so the live
 * board, the hover preview and the probe's fitter all run the same code.
 *
 * Per weapon, one expression owns its firepower:
 *   dps × (1 + Σ booster links × booster amplification) × (1 + Σ beacon stamps)
 * Each family sums inside; the two families multiply, and the global firepower chain
 * multiplies the board total downstream of it.
 */
import { PIECE_BY_ID, type PieceId, type RelationId } from '../data';

export interface Coord {
  x: number;
  y: number;
}

export interface Occupant {
  id: string;
  type: PieceId;
}

// TODO(expansion): the OccupancyView seam with an overlay preview — the evaluator reads a view,
// and a preview is the same evaluator over a view answering with one hypothetical change.
// candidate-primitives.md § OccupancyView + overlay-preview; candidate-recipes.md § Placement-adjacency.
/** What the evaluator reads: who sits where, and which cells a relation reaches. */
export interface OccupancyView {
  occupantAt(x: number, y: number): Occupant | null;
  /** In-bounds cells reached from (x, y) by a relation. */
  reach(x: number, y: number, relation: RelationId): Iterable<Coord>;
  /** Every occupied cell. */
  occupied(): Iterable<Coord & Occupant>;
}

export interface LayoutParams {
  dps: Record<'pulse' | 'rail', number>;
  boost: Record<'capacitor' | 'targeting', number>;
  beaconGain: number;
  coolantGain: number;
}

/** One term in a weapon's firepower expression, attributed to the piece that supplied it. */
export interface Term {
  fromId: string;
  fromType: PieceId;
  /** `link` terms sum into the boost family, `stamp` terms into the beacon family. */
  kind: 'link' | 'stamp';
  value: number;
}

export interface PieceResult {
  id: string;
  type: PieceId;
  x: number;
  y: number;
  /** Weapons only: the composed firepower before the global stack. */
  firepower: number;
  /** Weapons only: the terms that reached it. */
  terms: Term[];
  /** Boosters only: the amplification on every link it gives out. */
  amp: number;
  /** Board firepower lost if this piece were pulled — its whole contribution. */
  marginal: number;
}

export interface LayoutResult {
  /** Board firepower (dps) before the global stack. */
  total: number;
  /** Per weapon type, the summed firepower — what each weapon producer counts. */
  firepowerByType: Record<'pulse' | 'rail', number>;
  pieces: Map<string, PieceResult>;
}

const key = (x: number, y: number) => `${x},${y}`;

// TODO(expansion): a per-entity term stack with attribution for pieces created and destroyed at
// runtime. A ModifierChain per piece would auto-register with no unregister path, so the two
// families are folded by hand here and attributed through `Term`.
function compose(view: OccupancyView, p: LayoutParams, skipId?: string) {
  const amp = new Map<string, number>();
  const terms = new Map<string, Term[]>();
  const all = [...view.occupied()].filter((o) => o.id !== skipId);
  const at = (x: number, y: number) => {
    const o = view.occupantAt(x, y);
    return o && o.id !== skipId ? o : null;
  };

  for (const o of all) {
    if (PIECE_BY_ID[o.type].role === 'weapon') terms.set(o.id, []);
    if (PIECE_BY_ID[o.type].role === 'booster') amp.set(o.id, 1);
  }
  // Amplifiers first: a booster's links carry its amplification.
  for (const o of all) {
    const def = PIECE_BY_ID[o.type];
    if (def.role !== 'amplifier') continue;
    for (const c of view.reach(o.x, o.y, def.relation)) {
      const t = at(c.x, c.y);
      if (t && amp.has(t.id)) amp.set(t.id, amp.get(t.id)! + p.coolantGain);
    }
  }
  for (const o of all) {
    const def = PIECE_BY_ID[o.type];
    if (def.role !== 'booster' && def.role !== 'beacon') continue;
    for (const c of view.reach(o.x, o.y, def.relation)) {
      const t = at(c.x, c.y);
      if (!t || !terms.has(t.id)) continue;
      terms.get(t.id)!.push(
        def.role === 'booster'
          ? {
              fromId: o.id,
              fromType: o.type,
              kind: 'link',
              value: p.boost[o.type as 'capacitor' | 'targeting'] * amp.get(o.id)!,
            }
          : { fromId: o.id, fromType: o.type, kind: 'stamp', value: p.beaconGain },
      );
    }
  }

  const firepower = new Map<string, number>();
  const firepowerByType = { pulse: 0, rail: 0 };
  let total = 0;
  for (const o of all) {
    const ts = terms.get(o.id);
    if (!ts) continue;
    let links = 0;
    let stamps = 0;
    for (const t of ts) {
      if (t.kind === 'link') links += t.value;
      else stamps += t.value;
    }
    const fp = p.dps[o.type as 'pulse' | 'rail'] * (1 + links) * (1 + stamps);
    firepower.set(o.id, fp);
    firepowerByType[o.type as 'pulse' | 'rail'] += fp;
    total += fp;
  }
  return { all, amp, terms, firepower, firepowerByType, total };
}

/** Board firepower (dps, before the firepower chain) alone: what a packing search scores. */
export function boardTotal(view: OccupancyView, params: LayoutParams): number {
  return compose(view, params).total;
}

/** Evaluate a board: every piece's firepower, terms and marginal contribution. */
export function evaluateLayout(view: OccupancyView, params: LayoutParams): LayoutResult {
  const base = compose(view, params);
  const pieces = new Map<string, PieceResult>();
  for (const o of base.all) {
    const without = compose(view, params, o.id).total;
    pieces.set(o.id, {
      id: o.id,
      type: o.type,
      x: o.x,
      y: o.y,
      firepower: base.firepower.get(o.id) ?? 0,
      terms: base.terms.get(o.id) ?? [],
      amp: base.amp.get(o.id) ?? 1,
      marginal: base.total - without,
    });
  }
  return { total: base.total, firepowerByType: base.firepowerByType, pieces };
}

/** The view with one cell's occupant overridden — the hypothetical a preview evaluates. */
export function overlayView(
  view: OccupancyView,
  at: Coord,
  occupant: Occupant | null,
): OccupancyView {
  return {
    occupantAt: (x, y) => (x === at.x && y === at.y ? occupant : view.occupantAt(x, y)),
    reach: view.reach,
    *occupied() {
      for (const o of view.occupied()) if (!(o.x === at.x && o.y === at.y)) yield o;
      if (occupant) yield { ...at, ...occupant };
    },
  };
}

export interface Preview {
  /** Change in board firepower (pre-global) if the hypothetical lands. */
  delta: number;
  /** Per-cell change in weapon firepower, the placed cell included. */
  cells: Map<string, number>;
}

/** One cell of a hypothetical board: what would sit there instead. */
export interface CellChange {
  at: Coord;
  occupant: Occupant | null;
}

/** Compare a hypothetical board against the current one, cell by cell. */
export function previewChange(
  view: OccupancyView,
  params: LayoutParams,
  changes: CellChange[],
): Preview {
  const before = compose(view, params);
  const hypo = changes.reduce((v, c) => overlayView(v, c.at, c.occupant), view);
  const after = compose(hypo, params);
  const cells = new Map<string, number>();
  const byCell = (r: ReturnType<typeof compose>) => {
    const m = new Map<string, number>();
    for (const o of r.all) m.set(key(o.x, o.y), r.firepower.get(o.id) ?? 0);
    return m;
  };
  const b = byCell(before);
  const a = byCell(after);
  for (const k of new Set([...b.keys(), ...a.keys()])) {
    const d = (a.get(k) ?? 0) - (b.get(k) ?? 0);
    if (Math.abs(d) > 1e-9) cells.set(k, d);
  }
  return { delta: after.total - before.total, cells };
}

export const cellKey = key;
