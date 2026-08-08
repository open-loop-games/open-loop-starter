import type { GridCoord, SpatialGrid } from '@open-loop/engine';
import { ARENA_BALANCE } from '../../data/arena';
import type { ArenaParams, ArenaState, Vec2 } from './types';

// TODO(expansion): weighted utility over composed influence readers is a parked
// engine primitive (`candidate-primitives.md` § Spatial utility steering, N=1
// primordial) whose convergence signal names "a bot layer" — this is it. The
// divergence to carry into the dive: primordial scores GRID CELLS, this scores a
// continuous position sampled onto a nav grid, and the threat term is peaked at
// an orbit distance rather than monotone.

/** Nav-grid cell size in sim units. Coarse: steering, not collision. */
export const NAV_CELL = 100;

export interface NavGrid {
  grid: SpatialGrid<number>;
  cols: number;
  rows: number;
}

/** Map a continuous position onto its nav cell. */
export function toCell(pos: Vec2, nav: NavGrid): GridCoord {
  return {
    x: Math.min(nav.cols - 1, Math.max(0, Math.floor(pos.x / NAV_CELL))),
    y: Math.min(nav.rows - 1, Math.max(0, Math.floor(pos.y / NAV_CELL))),
  };
}

/**
 * Distance-from-threat and distance-to-motes fields, recomputed on a slow
 * cadence and reused between refreshes. Two `distanceField` calls, not one per
 * tick: at 20 Hz the field barely changes between steps, and the engine's own
 * docs warn the cost function must not re-enter `distanceField` on the same grid.
 */
export interface Fields {
  threat: Float64Array;
  motes: Float64Array;
  /** Specimens per nav cell. Traversal is about crowding, not presence. */
  crowd: Uint16Array;
  computedAt: number;
}

/**
 * Specimens in one nav cell at which it stops being walkable. A cell is 100×100
 * units and the operator is a point, so ONE body in it blocks nothing — the
 * first version of this treated any occupied cell as impassable and reported
 * traversal collapse the moment the horde got close, which is the normal state
 * of this game rather than a loss condition.
 */
export const BLOCKING_CROWD = 4;

/** Reachable cells below which the operator genuinely has nowhere to go. */
export const ESCAPE_FLOOR = 12;

const UNIT_COST = () => 1;

export function computeFields(state: ArenaState, nav: NavGrid, now: number): Fields {
  const threatSources: GridCoord[] = state.specimens.map((s) => toCell(s, nav));
  const moteSources: GridCoord[] = state.motes.map((m) => toCell(m, nav));
  const crowd = new Uint16Array(nav.cols * nav.rows);
  for (const c of threatSources) crowd[c.y * nav.cols + c.x] += 1;
  return {
    threat: nav.grid.distanceField(threatSources, UNIT_COST),
    motes: nav.grid.distanceField(moteSources, UNIT_COST),
    crowd,
    computedAt: now,
  };
}

const at = (field: Float64Array, nav: NavGrid, c: GridCoord): number => field[c.y * nav.cols + c.x];

/**
 * The orbit the seat wants to hold, in sim units: the distance from the nearest
 * specimen at which it is "dancing on the edge". A high-`engage` seat sits inside
 * the kill radius and eats more contact; a low-`engage` seat hovers outside it and
 * banks less. This single number is how a seat's movement policy differs.
 */
export function orbitRadius(params: ArenaParams): number {
  return ARENA_BALANCE.killRadius * (1.35 - 0.75 * params.engage);
}

/** Eight compass headings; the candidate set the arg-max runs over. */
const HEADINGS: Vec2[] = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2;
  return { x: Math.cos(a), y: Math.sin(a) };
});

/**
 * Choose a heading by weighted utility over the composed fields — the kernel the
 * parked primitive describes, with a continuous candidate set.
 *
 * Three terms, and the first is why this is not simply "flee":
 *
 *  - **threat**, peaked at `orbitRadius` rather than monotone. Running away is as
 *    wrong as standing still, because distance is zero damage and zero income.
 *  - **motes**, pulling toward uncollected income. The dive back through cleared
 *    space is this term winning over the threat term.
 *  - **walls**, a hard penalty. Corners are where a monotone flee-policy kills
 *    itself, which is why the threat term is peaked and the wall term is separate.
 */
export function chooseHeading(
  state: ArenaState,
  nav: NavGrid,
  fields: Fields,
  params: ArenaParams,
): Vec2 {
  const lookahead = NAV_CELL;
  const { mapWidth, mapHeight } = ARENA_BALANCE;

  let best = state.operator.heading;
  let bestScore = -Infinity;

  for (const h of HEADINGS) {
    const px = state.operator.x + h.x * lookahead;
    const py = state.operator.y + h.y * lookahead;

    // Wall term: a hard reject outside, a ramp near the edge.
    const margin = Math.min(px, py, mapWidth - px, mapHeight - py);
    if (margin < 0) continue;
    const wallPenalty = margin < NAV_CELL * 2 ? (NAV_CELL * 2 - margin) / NAV_CELL : 0;

    const cell = toCell({ x: px, y: py }, nav);
    const moteDist = at(fields.motes, nav, cell);

    // NEAR field, exact and continuous. The nav grid is 100 units to a cell and
    // contact happens at 22, so a grid-sampled threat distance cannot see the
    // thing that kills you — steering on it alone let specimens walk into contact
    // while the field still read "correct orbit". This is the term that actually
    // holds the edge; the grid keeps the jobs it is good at (routing to motes,
    // reachability), which is the division of labour, not a workaround.
    let nearest = Number.POSITIVE_INFINITY;
    for (const s of state.specimens) {
      const d2 = (s.x - px) * (s.x - px) + (s.y - py) * (s.y - py);
      if (d2 < nearest) nearest = d2;
    }
    nearest = Math.sqrt(nearest);

    // Peaked at the orbit: being far is penalised as much as being close, in sim
    // units so the peak sits where the kill radius actually is.
    const orbit = orbitRadius(params);
    const offset = Number.isFinite(nearest) ? (nearest - orbit) / orbit : 1;
    let threatTerm = -(offset * offset) * 40;

    // Contact is a cliff, not a slope. Below the contact radius nothing else in
    // the score should be able to outvote getting out.
    if (nearest < ARENA_BALANCE.contactRadius * 2.5) threatTerm -= 400;

    const moteTerm = Number.isFinite(moteDist) ? -moteDist : -nav.cols;

    // η is the seat's appetite for the dive; it is exactly the weight on income.
    const score = threatTerm + params.eta * 2.5 * moteTerm - wallPenalty * 8;

    if (score > bestScore) {
      bestScore = score;
      best = h;
    }
  }
  return best;
}

/**
 * Whether the operator has a way out of its local threat mass. Reachability, not
 * distance — this is the traversal-collapse detector, and it is the reason the
 * `bfs` surface earns its place rather than being defensive code.
 */
export function hasEscape(state: ArenaState, nav: NavGrid, fields: Fields): boolean {
  if (state.specimens.length === 0) return true;
  const here = toCell(state.operator, nav);
  const reachable = nav.grid.bfs(
    here,
    (_, x, y) => fields.crowd[y * nav.cols + x] < BLOCKING_CROWD,
  );
  return reachable.size >= ESCAPE_FLOOR;
}
