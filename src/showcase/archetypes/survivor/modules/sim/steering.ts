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

/**
 * The candidate set the arg-max runs over. Sixteen rather than eight: at 45°
 * quantisation the operator cannot aim at a mote, only near one, and a 70-unit
 * collect radius is narrower than the error that introduces at the 100-unit
 * lookahead. Sixteen is 22.5°, which is inside the aperture.
 */
const HEADINGS: Vec2[] = Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * Math.PI * 2;
  return { x: Math.cos(a), y: Math.sin(a) };
});

/**
 * Score penalty for a full 180° reversal, ramping linearly with turn angle.
 *
 * An arg-max has no memory: two candidates whose scores cross swap the heading
 * every step for as long as the crossing lasts, at no cost, and the operator
 * vibrates in place instead of moving. Measured before this term existed
 * (`../../balance/steering-probe.ts`): 775°/s of mean turn and 4 reversals a
 * second on the baseline seat — more than two full rotations per second of
 * heading change, none of it a decision.
 *
 * Sized against the score terms it competes with rather than picked: a
 * one-candidate turn (22.5°) costs 2.25, about what a single nav cell of mote
 * distance buys, so the policy still chases income; a reversal costs 18, which
 * only the contact cliff (-400) and a real threat gradient can pay.
 */
export const TURN_COST = 18;

/**
 * How fast the operator can swing its heading, in radians per second.
 *
 * The turn cost stops the policy *choosing* to flail; this stops the body
 * following even a legitimate reversal instantly. 420°/s puts a full about-face
 * at ~0.43s — long enough to read as a turn, short enough that a specimen
 * closing from behind is still escapable. It is also what makes the render-side
 * heading pip mean something: a pip that teleports is decoration, one that
 * sweeps is a tell.
 */
export const MAX_TURN_RATE = (420 * Math.PI) / 180;

/**
 * Weight on holding bodies inside `r_kill`, per body, before the seat's `engage`
 * scales it.
 *
 * `engage` is DEFINED as the share of spawns brought inside `r_kill`
 * (`../../data/arena.ts` § Density), and until this term it reached the movement
 * policy only by moving the orbit DISTANCE — a proxy for the quantity, never the
 * quantity itself. The proxy held only because the un-damped arg-max thrashed the
 * operator back and forth through the mass; with the heading steady it collapses,
 * because the operator moves at 120 units/s against specimens at 38–70 and a
 * clean path is a permanent escape. Measured: removing the jitter alone dropped
 * the baseline seat from 1.12 kills/s to 0.56 against a closed form asking 2.59.
 *
 * So this is the channel `engage` was always supposed to have, and the peaked
 * threat term is what keeps it from becoming "stand in the crowd": that term
 * still prices being too close, and the contact cliff still overrules everything.
 *
 * Swept at 4 / 6 / 9 against the arc probe. Schedule delta across the four seats
 * runs (−5, −16, +2, −8) at 4, (−5, −10, +1, −7) at 6, and (−2, −7, +2, −5) at 9,
 * where the binding causes also stop being one cause in four costumes. Nothing in
 * `../../data/` moved to get there: the ladder is the target and the pilot is what
 * was corrected toward it.
 */
export const ENGAGE_WEIGHT = 9;

/**
 * Bodies inside `r_kill` past which more stop being worth anything. The widest
 * device takes 24 targets but the rest cap at 1–6 (`../../data/devices.ts`), so
 * past this the operator is buying contact risk without buying DPS.
 */
export const ENGAGE_SATURATION = 8;

/**
 * Rotate `current` toward `desired` by at most the step's turn budget.
 *
 * Separating the DECISION (a global arg-max over all sixteen headings) from its
 * EXECUTION (a rate-limited swing) is what keeps the policy able to see the best
 * direction anywhere on the compass while still moving like something with mass.
 * A slew-limited candidate cone would have coupled the two and left the operator
 * unable to turn around at all.
 */
export function slewHeading(current: Vec2, desired: Vec2, dt: number): Vec2 {
  const cross = current.x * desired.y - current.y * desired.x;
  const dot = current.x * desired.x + current.y * desired.y;
  const delta = Math.atan2(cross, dot);
  const budget = MAX_TURN_RATE * dt;
  if (Math.abs(delta) <= budget) return desired;
  const step = delta > 0 ? budget : -budget;
  const cos = Math.cos(step);
  const sin = Math.sin(step);
  return {
    x: current.x * cos - current.y * sin,
    y: current.x * sin + current.y * cos,
  };
}

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
 *  - **turn cost**, the memory an arg-max otherwise has none of. See `TURN_COST`.
 *
 * The heading this returns is what the operator WANTS; `slewHeading` decides how
 * much of it the step can deliver.
 */
export function chooseHeading(
  state: ArenaState,
  nav: NavGrid,
  fields: Fields,
  params: ArenaParams,
): Vec2 {
  const lookahead = NAV_CELL;
  const { mapWidth, mapHeight, killRadius } = ARENA_BALANCE;
  const killRadius2 = killRadius * killRadius;
  const orbit = orbitRadius(params);
  const current = state.operator.heading;

  // Only specimens this far out can change the near-field term: past it every
  // candidate reads the same saturated `offset > 1`, which is the branch a floor
  // with no specimens on it already takes. Filtering once is one pass over the
  // census instead of one per candidate heading.
  const relevant: { x: number; y: number }[] = [];
  const reach = lookahead + orbit * 3;
  const reach2 = reach * reach;
  for (const s of state.specimens) {
    const dx = s.x - state.operator.x;
    const dy = s.y - state.operator.y;
    if (dx * dx + dy * dy <= reach2) relevant.push(s);
  }

  let best = current;
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
    let inKill = 0;
    for (const s of relevant) {
      const d2 = (s.x - px) * (s.x - px) + (s.y - py) * (s.y - py);
      if (d2 < nearest) nearest = d2;
      if (d2 <= killRadius2) inKill++;
    }
    nearest = Math.sqrt(nearest);

    // Peaked at the orbit: being far is penalised as much as being close, in sim
    // units so the peak sits where the kill radius actually is.
    const offset = Number.isFinite(nearest) ? (nearest - orbit) / orbit : 1;
    let threatTerm = -(offset * offset) * 40;

    // Contact is a cliff, not a slope. Below the contact radius nothing else in
    // the score should be able to outvote getting out.
    if (nearest < ARENA_BALANCE.contactRadius * 2.5) threatTerm -= 400;

    const moteTerm = Number.isFinite(moteDist) ? -moteDist : -nav.cols;

    // Turning is not free. `dot` with the current heading is 1 straight ahead and
    // −1 behind, so this is a linear ramp from nothing to a full `TURN_COST`.
    const turnCost = TURN_COST * 0.5 * (1 - (h.x * current.x + h.y * current.y));

    // The seat's appetite for the fight — see `ENGAGE_WEIGHT`.
    const engageTerm = params.engage * ENGAGE_WEIGHT * Math.min(inKill, ENGAGE_SATURATION);

    // η is the seat's appetite for the dive; it is exactly the weight on income.
    const score =
      threatTerm + engageTerm + params.eta * 2.5 * moteTerm - wallPenalty * 8 - turnCost;

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
