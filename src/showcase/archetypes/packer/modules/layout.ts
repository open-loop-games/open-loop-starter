/**
 * The arrangement evaluator: a pure function from an occupancy view to every module's
 * firepower and contribution. It holds no module state and no reactivity, so the live
 * board, the hover preview and the probe's fitter all run the same code.
 *
 * Per weapon, one expression owns its firepower, and one more its salvage:
 *   firepower = dps × (1 + Σ booster links × booster amplification) × (1 + Σ beacon stamps)
 *   salvage   = firepower × (1 + Σ tractor yield)
 * Each family sums inside and the families multiply. Carriers test firepower; salvage is
 * income. The global firepower chain multiplies both board totals downstream.
 */
import { PIECE_BY_ID, PIECES, type ConditionId, type PieceId, type RelationId } from '../data';

export interface Coord {
  x: number;
  y: number;
}

export interface Occupant {
  id: string;
  type: PieceId;
  /** 0 bow, 1 starboard, 2 stern, 3 port: what a turning piece faces */
  facing?: number;
}

// TODO(expansion): the OccupancyView seam with an overlay preview — the evaluator reads a view,
// and a preview is the same evaluator over a view answering with one hypothetical change.
// candidate-engine-api.md § OccupancyView + overlay-preview; candidate-recipes.md § Placement-adjacency.
/** What the evaluator reads: who sits where, and which cells a relation reaches. */
export interface OccupancyView {
  occupantAt(x: number, y: number): Occupant | null;
  /** Hull cells reached from (x, y) by a relation; a ray yields in order along its facing. */
  reach(x: number, y: number, relation: RelationId, facing?: number): Iterable<Coord>;
  /** Every occupied cell. */
  occupied(): Iterable<Coord & Occupant>;
  /** Whether a cell is plated and fittable. */
  isOpen(x: number, y: number): boolean;
}

export type WeaponId = 'pulse' | 'rail' | 'lance';
export type LinkBoosterId = 'capacitor' | 'targeting' | 'director';

export interface LayoutParams {
  dps: Record<WeaponId, number>;
  boost: Record<LinkBoosterId, number>;
  beaconGain: number;
  coolantGain: number;
  tractorGain: number;
  /** cells a ray reaches before it stops */
  rayRange: number;
  /** a booster with no empty open cell on an edge gives nothing */
  closeQuarters: boolean;
}

/** The params a sector's conditions leave: each rewrites one relation while it holds. */
export function underConditions(
  params: LayoutParams,
  conditions: readonly ConditionId[],
): LayoutParams {
  const p = { ...params, boost: { ...params.boost } };
  for (const c of conditions) {
    if (c === 'ion-storm') p.boost.targeting = 0;
    else if (c === 'jamming') p.beaconGain /= 2;
    else if (c === 'coolant-leak') p.coolantGain = 0;
    else if (c === 'shear') p.rayRange = Math.min(p.rayRange, 2);
    else p.closeQuarters = true;
  }
  return p;
}

/** Whether a module at (x, y) runs cold: close quarters hold, and no open cell on its edges is empty. */
export function runsCold(
  view: OccupancyView,
  p: LayoutParams,
  x: number,
  y: number,
  occupied: (x: number, y: number) => boolean = (cx, cy) => !!view.occupantAt(cx, cy),
): boolean {
  if (!p.closeQuarters) return false;
  for (const c of view.reach(x, y, 'orthogonal'))
    if (view.isOpen(c.x, c.y) && !occupied(c.x, c.y)) return false;
  return true;
}

/** One term in a weapon's firepower expression, attributed to the piece that supplied it. */
export interface Term {
  fromId: string;
  fromType: PieceId;
  /** `link` terms sum into the boost family, `stamp` into the beacon family, `yield` into salvage. */
  kind: 'link' | 'stamp' | 'yield';
  value: number;
}

export interface PieceResult {
  id: string;
  type: PieceId;
  x: number;
  y: number;
  /** Weapons only: the composed firepower before the global stack. */
  firepower: number;
  /** Weapons only: the salvage it recovers a second before the global stack. */
  salvage: number;
  /** Weapons only: the terms that reached it. */
  terms: Term[];
  /** Boosters only: the amplification on every link it gives out. */
  amp: number;
  /** Board firepower lost if this piece were pulled — its whole contribution. */
  marginal: number;
  /** Board salvage lost if this piece were pulled. */
  salvageMarginal: number;
}

export interface LayoutResult {
  /** Board firepower (dps) before the global stack: what a carrier is tested against. */
  total: number;
  /** Board salvage a second before the global stack: income. */
  salvageTotal: number;
  /** Per weapon type, the summed salvage — what each weapon producer pays. */
  salvageByType: Record<WeaponId, number>;
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
  const cold = (x: number, y: number) => runsCold(view, p, x, y, (cx, cy) => !!at(cx, cy));

  for (const o of all) {
    if (PIECE_BY_ID[o.type].role === 'weapon') terms.set(o.id, []);
    if (PIECE_BY_ID[o.type].role === 'booster') amp.set(o.id, 1);
  }
  // Amplifiers first: a booster's links carry its amplification.
  for (const o of all) {
    const def = PIECE_BY_ID[o.type];
    if (def.role !== 'amplifier' || cold(o.x, o.y)) continue;
    for (const c of view.reach(o.x, o.y, def.relation)) {
      const t = at(c.x, c.y);
      if (t && amp.has(t.id)) amp.set(t.id, amp.get(t.id)! + p.coolantGain);
    }
  }
  for (const o of all) {
    const def = PIECE_BY_ID[o.type];
    if (def.role === 'weapon' || def.role === 'amplifier' || cold(o.x, o.y)) continue;
    let reached = 0;
    for (const c of view.reach(o.x, o.y, def.relation, o.facing)) {
      if (def.relation === 'ray' && ++reached > p.rayRange) break;
      const t = at(c.x, c.y);
      if (!t || !terms.has(t.id)) continue;
      const value =
        def.role === 'booster'
          ? p.boost[o.type as LinkBoosterId] * amp.get(o.id)!
          : def.role === 'beacon'
            ? p.beaconGain
            : p.tractorGain;
      const kind = def.role === 'booster' ? 'link' : def.role === 'beacon' ? 'stamp' : 'yield';
      terms.get(t.id)!.push({ fromId: o.id, fromType: o.type, kind, value });
    }
  }

  const firepower = new Map<string, number>();
  const salvage = new Map<string, number>();
  const salvageByType: Record<WeaponId, number> = { pulse: 0, rail: 0, lance: 0 };
  let total = 0;
  let salvageTotal = 0;
  for (const o of all) {
    const ts = terms.get(o.id);
    if (!ts) continue;
    let links = 0;
    let stamps = 0;
    let yields = 0;
    for (const t of ts) {
      if (t.kind === 'link') links += t.value;
      else if (t.kind === 'stamp') stamps += t.value;
      else yields += t.value;
    }
    const fp = p.dps[o.type as WeaponId] * (1 + links) * (1 + stamps);
    const sv = fp * (1 + yields);
    firepower.set(o.id, fp);
    salvage.set(o.id, sv);
    salvageByType[o.type as WeaponId] += sv;
    total += fp;
    salvageTotal += sv;
  }
  return { all, amp, terms, firepower, salvage, salvageByType, total, salvageTotal };
}

// ─── Lattice: the dense form a search scores ───

type FixedRelation = Exclude<RelationId, 'none' | 'ray'>;

/**
 * A hull's open cells with every relation's reach resolved to cell indices once, so a board
 * on it scores on flat arrays. A search scores thousands of boards on one lattice.
 */
export interface Lattice {
  cells: readonly Coord[];
  /** per relation, per cell: the open cells it reaches */
  fixed: Record<FixedRelation, Int16Array[]>;
  /** per facing, per cell: the hull cells down the ray in order, -1 for one not plated */
  ray: Int16Array[][];
}

/** A board on a lattice: each cell's module as an index into PIECES (-1 empty), and its facing. */
export interface LatticeFit {
  piece: Int8Array;
  facing: Int8Array;
}

/** Each piece's role and relation by its index in PIECES. */
const ROLE_CODE = { weapon: 0, booster: 1, beacon: 2, amplifier: 3, tractor: 4 } as const;
const PIECE_ROLE = Int8Array.from(PIECES.map((d) => ROLE_CODE[d.role]));
const PIECE_RELATION = PIECES.map((d) => d.relation);
export const PIECE_INDEX = Object.fromEntries(PIECES.map((d, i) => [d.id, i])) as Record<
  PieceId,
  number
>;

/** Resolve a view's reach over these cells: the lattice a board on them scores on. */
export function compileLattice(view: OccupancyView, cells: readonly Coord[]): Lattice {
  const index = new Map(cells.map((c, i) => [key(c.x, c.y), i]));
  const resolve = (coords: Iterable<Coord>, keepClosed: boolean) => {
    const out: number[] = [];
    for (const c of coords) {
      const i = index.get(key(c.x, c.y));
      if (i !== undefined) out.push(i);
      else if (keepClosed) out.push(-1);
    }
    return Int16Array.from(out);
  };
  const fixedOf = (r: FixedRelation) => cells.map((c) => resolve(view.reach(c.x, c.y, r), false));
  return {
    cells,
    fixed: {
      orthogonal: fixedOf('orthogonal'),
      corners: fixedOf('corners'),
      knight: fixedOf('knight'),
    },
    ray: [0, 1, 2, 3].map((f) => cells.map((c) => resolve(view.reach(c.x, c.y, 'ray', f), true))),
  };
}

/** An empty board on a lattice. */
export const emptyFit = (lattice: Lattice): LatticeFit => ({
  piece: new Int8Array(lattice.cells.length).fill(-1),
  facing: new Int8Array(lattice.cells.length),
});

let scratch = new Float64Array(0);

/**
 * Board firepower and salvage (before the firepower chain) of a board on a lattice: the
 * same expression as `evaluateLayout`, without attribution.
 */
export function latticeTotals(
  lattice: Lattice,
  fit: LatticeFit,
  p: LayoutParams,
): { firepower: number; salvage: number } {
  const n = lattice.cells.length;
  if (scratch.length < 4 * n) scratch = new Float64Array(4 * n);
  const amp = scratch.subarray(0, n).fill(1);
  const links = scratch.subarray(n, 2 * n).fill(0);
  const stamps = scratch.subarray(2 * n, 3 * n).fill(0);
  const yields = scratch.subarray(3 * n, 4 * n).fill(0);
  const { piece, facing } = fit;
  const orth = lattice.fixed.orthogonal;
  const role = (i: number) => (piece[i]! < 0 ? -1 : PIECE_ROLE[piece[i]!]!);
  const cold = (i: number) => {
    if (!p.closeQuarters) return false;
    const ring = orth[i]!;
    for (let k = 0; k < ring.length; k++) if (piece[ring[k]!]! < 0) return false;
    return true;
  };
  for (let i = 0; i < n; i++) {
    if (role(i) !== ROLE_CODE.amplifier || cold(i)) continue;
    const reach = lattice.fixed[PIECE_RELATION[piece[i]!] as FixedRelation][i]!;
    for (let k = 0; k < reach.length; k++)
      if (role(reach[k]!) === ROLE_CODE.booster) amp[reach[k]!]! += p.coolantGain;
  }
  for (let i = 0; i < n; i++) {
    const r = role(i);
    if (r <= ROLE_CODE.weapon || r === ROLE_CODE.amplifier || cold(i)) continue;
    const def = PIECES[piece[i]!]!;
    const ray = def.relation === 'ray';
    const reach = ray
      ? lattice.ray[facing[i]!]![i]!
      : lattice.fixed[def.relation as FixedRelation][i]!;
    const value =
      r === ROLE_CODE.booster
        ? p.boost[def.id as LinkBoosterId] * amp[i]!
        : r === ROLE_CODE.beacon
          ? p.beaconGain
          : p.tractorGain;
    const into = r === ROLE_CODE.booster ? links : r === ROLE_CODE.beacon ? stamps : yields;
    const len = ray ? Math.min(reach.length, p.rayRange) : reach.length;
    for (let k = 0; k < len; k++) {
      const t = reach[k]!;
      if (t >= 0 && role(t) === ROLE_CODE.weapon) into[t]! += value;
    }
  }
  let firepower = 0;
  let salvage = 0;
  for (let i = 0; i < n; i++) {
    if (role(i) !== ROLE_CODE.weapon) continue;
    const fp = p.dps[PIECES[piece[i]!]!.id as WeaponId] * (1 + links[i]!) * (1 + stamps[i]!);
    firepower += fp;
    salvage += fp * (1 + yields[i]!);
  }
  return { firepower, salvage };
}

/** Evaluate a board: every piece's firepower, terms and marginal contribution. */
export function evaluateLayout(view: OccupancyView, params: LayoutParams): LayoutResult {
  const base = compose(view, params);
  const pieces = new Map<string, PieceResult>();
  for (const o of base.all) {
    const without = compose(view, params, o.id);
    pieces.set(o.id, {
      id: o.id,
      type: o.type,
      x: o.x,
      y: o.y,
      firepower: base.firepower.get(o.id) ?? 0,
      salvage: base.salvage.get(o.id) ?? 0,
      terms: base.terms.get(o.id) ?? [],
      amp: base.amp.get(o.id) ?? 1,
      marginal: base.total - without.total,
      salvageMarginal: base.salvageTotal - without.salvageTotal,
    });
  }
  return {
    total: base.total,
    salvageTotal: base.salvageTotal,
    salvageByType: base.salvageByType,
    pieces,
  };
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
    isOpen: view.isOpen,
    *occupied() {
      for (const o of view.occupied()) if (!(o.x === at.x && o.y === at.y)) yield o;
      if (occupant) yield { ...at, ...occupant };
    },
  };
}

export interface Preview {
  /** Change in board firepower (pre-global) if the hypothetical lands. */
  delta: number;
  /** Change in board salvage (pre-global). */
  salvageDelta: number;
  /** Per-cell change in weapon firepower, the placed cell included. */
  cells: Map<string, number>;
  /** Per-cell change in weapon salvage. */
  salvageCells: Map<string, number>;
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
  const diff = (pick: (r: ReturnType<typeof compose>) => Map<string, number>) => {
    const byCell = (r: ReturnType<typeof compose>) => {
      const m = new Map<string, number>();
      for (const o of r.all) m.set(key(o.x, o.y), pick(r).get(o.id) ?? 0);
      return m;
    };
    const b = byCell(before);
    const a = byCell(after);
    const cells = new Map<string, number>();
    for (const k of new Set([...b.keys(), ...a.keys()])) {
      const d = (a.get(k) ?? 0) - (b.get(k) ?? 0);
      if (Math.abs(d) > 1e-9) cells.set(k, d);
    }
    return cells;
  };
  return {
    delta: after.total - before.total,
    salvageDelta: after.salvageTotal - before.salvageTotal,
    cells: diff((r) => r.firepower),
    salvageCells: diff((r) => r.salvage),
  };
}

export const cellKey = key;
