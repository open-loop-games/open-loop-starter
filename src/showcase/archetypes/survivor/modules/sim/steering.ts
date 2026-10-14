/**
 * The star's movement policy: what an improvising star does with the only input there is.
 * Pure over the arena state, so the take module and the probes run the same function.
 *
 * Movement is a triangle: away from bodies, toward bodies, toward reels. Good play crosses
 * the T: sweep the crowd at just under a right angle, close enough to hold it in reach, then
 * swing back through the wake where the reels are lying. The policy is an arg-max over
 * sixteen candidate headings, each scored as a sum of terms (`HeadingScore`), then a
 * rate-limited swing toward the winner.
 *
 * An arg-max is decided by the spread of a term across the candidates, never by its level.
 * A term that reads the same on all sixteen drops out of the decision however large it is,
 * which is why `HeadingScore` keeps the terms apart: `../../balance/steering-probe.ts` reads
 * their spreads.
 */

// TODO(expansion): weighted utility over composed influence readers
// (candidate-primitives.md § Spatial utility steering). This scores a continuous position
// sampled onto a nav grid, where primordial scores grid cells, and its threat term is
// peaked at an orbit rather than monotone.

import {
  ORTHOGONAL_OFFSETS,
  createSpatialGrid,
  type GridCoord,
  type SpatialGrid,
} from '@open-loop/engine';
import { LEVEL_GAIN, contactDps, type Instinct } from '../../data';
import {
  WORLD_HALF,
  contactRange,
  currentScene,
  inCone,
  type ArenaInput,
  type ArenaMods,
  type ArenaState,
  type Extra,
} from './arena';

interface Vec2 {
  x: number;
  y: number;
}

// ─── The nav grid ───

/** Nav-grid cell size in world units. Coarse: routing, not collision. */
export const NAV_CELL = 100;

/** Seconds a computed reel field stays in use. The field barely moves between ticks. */
export const FIELD_REFRESH_SECONDS = 0.25;

/**
 * Extra cost, in cells, of entering a cell per body standing in it, capped at
 * `BLOCKING_CROWD` bodies. A cell at the cap costs five, so a detour of up to four clear
 * cells beats crossing it. Never `Infinity`: an unreachable reel would turn the whole field
 * to `Infinity` and the route term would go constant.
 */
export const CROWD_TRAVEL_COST = 1;
export const BLOCKING_CROWD = 4;

export interface NavGrid {
  grid: SpatialGrid<number>;
  cols: number;
  rows: number;
}

export function buildNav(): NavGrid {
  const cols = Math.ceil((WORLD_HALF * 2) / NAV_CELL);
  const rows = cols;
  return {
    cols,
    rows,
    grid: createSpatialGrid<number>({
      width: cols,
      height: rows,
      initializer: () => 0,
      neighborhood: ORTHOGONAL_OFFSETS,
    }),
  };
}

export function toCell(pos: Vec2, nav: NavGrid): GridCoord {
  return {
    x: Math.min(nav.cols - 1, Math.max(0, Math.floor((pos.x + WORLD_HALF) / NAV_CELL))),
    y: Math.min(nav.rows - 1, Math.max(0, Math.floor((pos.y + WORLD_HALF) / NAV_CELL))),
  };
}

const cellCentre = (c: GridCoord): Vec2 => ({
  x: (c.x + 0.5) * NAV_CELL - WORLD_HALF,
  y: (c.y + 0.5) * NAV_CELL - WORLD_HALF,
});

/** Distance from every cell to the nearest reel, costed by the crowd on the way. */
export interface Fields {
  reels: Float64Array;
  computedAt: number;
}

export function computeFields(s: ArenaState, nav: NavGrid): Fields {
  const crowd = new Uint16Array(nav.cols * nav.rows);
  for (const e of s.extras) {
    const c = toCell(e, nav);
    crowd[c.y * nav.cols + c.x]! += 1;
  }
  const cost = (_cell: number, x: number, y: number): number =>
    1 + Math.min(crowd[y * nav.cols + x]!, BLOCKING_CROWD) * CROWD_TRAVEL_COST;
  return {
    reels: nav.grid.distanceField(
      s.reels.map((r) => toCell(r, nav)),
      cost,
    ),
    computedAt: s.t,
  };
}

/**
 * Walks a distance field downhill from a cell, one neighbour at a time, and returns the
 * route. The engine's `distanceField` contract leaves the descent to the consumer, so this
 * is the adoption, not a bypass. Stops at a strict local minimum, so it cannot cycle.
 */
export function descendRoute(
  field: Float64Array,
  nav: NavGrid,
  from: GridCoord,
  maxSteps: number,
): GridCoord[] {
  const route: GridCoord[] = [];
  let here = from;
  let value = field[here.y * nav.cols + here.x]!;
  if (!Number.isFinite(value)) return route;
  for (let step = 0; step < maxSteps && value > 0; step++) {
    let best: GridCoord | undefined;
    let bestValue = value;
    for (const d of ORTHOGONAL_OFFSETS) {
      const x = here.x + d.dx;
      const y = here.y + d.dy;
      if (x < 0 || y < 0 || x >= nav.cols || y >= nav.rows) continue;
      const v = field[y * nav.cols + x]!;
      if (v < bestValue) {
        bestValue = v;
        best = { x, y };
      }
    }
    if (!best) break;
    route.push(best);
    here = best;
    value = bestValue;
  }
  return route;
}

// ─── The score's weights ───
// Each weight is sized against the terms it competes with, in score units.

/** World units a candidate looks ahead. */
export const LOOKAHEAD = NAV_CELL;

/**
 * Penalty for a full reversal, ramping linearly with turn angle. An arg-max has no memory,
 * so without it two crossing candidates swap the heading every tick. A one-candidate turn
 * (22.5°) costs about what one cell of reel distance pays.
 */
export const TURN_COST = 18;

/** How fast an improvising star swings its heading: an about-face in about 0.43 s. */
export const MAX_TURN_RATE = (420 * Math.PI) / 180;

/** Weight per body held in a rig's reach, before the star's `engage` scales it. */
export const ENGAGE_WEIGHT = 9;
/** Bodies in reach past which more add nothing but risk. */
export const ENGAGE_SATURATION = 8;

/**
 * The peaked threat term's two sides. Further from the crowd than the orbit costs
 * `FAR_WEIGHT`: distance is zero damage and zero income. Nearer costs only `NEAR_WEIGHT`,
 * because closeness is costed properly by `CONTACT_WEIGHT`, in the currency it is paid in.
 */
export const FAR_WEIGHT = 40;
export const NEAR_WEIGHT = 25;

/**
 * Seconds ahead the contact cost looks. A cost that speaks only once a body touches is
 * zero on every candidate outside contact range, which is where the decision is made.
 */
export const CONTACT_HORIZON = 1.5;

/**
 * Score per unit of "share of remaining health a second" a candidate would cost in contact.
 * Normalised by remaining health, so the same crowd is a cheap trade at full health and a
 * lethal one at a fifth of it: caution comes from the take's state, not a constant.
 */
export const CONTACT_WEIGHT = 900;

/**
 * Score per body a heading-bound rig would catch, weighted by how soon it fires. A rig
 * three seconds from firing is worth nothing to face; one about to fire is worth turning
 * for. So the star kites, swings the cone onto the crowd as it comes ready, fires, and the
 * term collapses again.
 */
export const CONNECT_WEIGHT = 25;
export const CONNECT_HORIZON = 1.2;

/** Exact near-field reel pull: score per world unit closed, inside the radius. */
export const REEL_NEAR_WEIGHT = 0.15;
export const REEL_NEAR_RADIUS = NAV_CELL * 3;

/** Score per world unit closed on the route waypoint: the crowd-aware bearing toward reels. */
export const REEL_ROUTE_WEIGHT = 0.15;
/** Cells along the descended route the waypoint is taken: it smooths the grid's staircase. */
export const ROUTE_WAYPOINT_CELLS = 3;

/**
 * The wall term: a ramp over the last two cells before the floor's edge. At the edge it costs
 * about three reversals, enough to turn a star off a wall the crowd is pressing it toward and
 * not enough to outvote contact. A weaker wall let the Veteran take 60–71% of its damage
 * within two cells of the edge (take-probe seeds 1–3, G and PG).
 */
const WALL_MARGIN = NAV_CELL * 2;
const WALL_WEIGHT = 30;

const HEADINGS: Vec2[] = Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * Math.PI * 2;
  return { x: Math.cos(a), y: Math.sin(a) };
});

// ─── The loadout's reach ───

/** Each rig's share of the loadout's damage: base damage is equal by construction, so the level decides. */
export function damageShares(s: ArenaState): number[] {
  const w = s.rigs.map((r) => LEVEL_GAIN ** (r.level - 1));
  const total = w.reduce((a, b) => a + b, 0);
  return w.map((x) => x / total);
}

/**
 * The distance from the nearest body the star wants to hold. The loadout's reach, weighted
 * by each rig's share of the damage, pulled in by `engage`: every orbit sits inside the
 * reach, so a star that hangs back still has its rigs in range.
 */
export function orbitRadius(s: ArenaState, instinct: Instinct): number {
  const shares = damageShares(s);
  const reach = s.rigs.reduce((a, r, i) => a + shares[i]! * r.def.reach, 0);
  return reach * (0.95 - 0.45 * instinct.engage);
}

// ─── The score ───

/** One candidate heading's score, broken into the terms that produced it. */
export interface HeadingScore {
  heading: Vec2;
  /** Peaked orbit term, costed contact included. */
  threat: number;
  /** Whether this candidate would touch anything within the horizon. */
  contact: boolean;
  engage: number;
  connect: number;
  /** Distance closed on the route waypoint, unweighted; `total` applies `eta` and the weight. */
  route: number;
  /** Near-field reel pull, unweighted by `eta`. */
  near: number;
  wall: number;
  turn: number;
  total: number;
}

/**
 * Scores every candidate heading that stays on the floor. Candidates that leave it are
 * omitted, so the returned set is what the arg-max chose between.
 */
export function scoreHeadings(
  s: ArenaState,
  mods: ArenaMods,
  instinct: Instinct,
  nav: NavGrid,
  fields: Fields,
): HeadingScore[] {
  const p = s.player;
  const current = { x: Math.cos(p.facing), y: Math.sin(p.facing) };
  const orbit = orbitRadius(s, instinct);
  const shares = damageShares(s);
  const reach2 = s.rigs.map((r) => r.def.reach * r.def.reach);
  const touchDps = contactDps(currentScene(s)) * mods.contact;
  const nearR2 = REEL_NEAR_RADIUS * REEL_NEAR_RADIUS;

  // Only bodies this close can change a term; past it every candidate reads the same. What
  // does not depend on the candidate is read once per body.
  const relevantR2 = (LOOKAHEAD + Math.max(orbit * 3, 400)) ** 2;
  const relevant: Extra[] = [];
  for (const e of s.extras) {
    const dx = e.x - p.x;
    const dy = e.y - p.y;
    if (dx * dx + dy * dy <= relevantR2) relevant.push(e);
  }
  const n = relevant.length;
  const ex = new Float64Array(n);
  const ey = new Float64Array(n);
  const close = new Float64Array(n);
  const band = new Float64Array(n);
  const outside = new Uint8Array(n);
  for (let j = 0; j < n; j++) {
    const e = relevant[j]!;
    ex[j] = e.x;
    ey[j] = e.y;
    close[j] = e.kind.speed * CONTACT_HORIZON;
    band[j] = contactRange(e) + close[j]!;
    const rx = e.x - p.x;
    const ry = e.y - p.y;
    outside[j] = rx * rx + ry * ry > band[j]! * band[j]! ? 1 : 0;
  }

  let waypoint: Vec2 | undefined;
  if (s.reels.length > 0) {
    const route = descendRoute(fields.reels, nav, toCell(p, nav), ROUTE_WAYPOINT_CELLS);
    if (route.length > 0) waypoint = cellCentre(route[route.length - 1]!);
  }

  const cones = s.rigs.filter((r) => r.def.shape === 'heading-cone');
  const scored: HeadingScore[] = [];
  for (const h of HEADINGS) {
    const px = p.x + h.x * LOOKAHEAD;
    const py = p.y + h.y * LOOKAHEAD;
    const margin = Math.min(px + WORLD_HALF, WORLD_HALF - px, py + WORLD_HALF, WORLD_HALF - py);
    if (margin < 0) continue;
    const wall = margin < WALL_MARGIN ? -((WALL_MARGIN - margin) / NAV_CELL) * WALL_WEIGHT : 0;

    let nearest2 = Infinity;
    const inReach = s.rigs.map(() => 0);
    let expectedTouching = 0;
    for (let j = 0; j < n; j++) {
      const dx = ex[j]! - px;
      const dy = ey[j]! - py;
      const d2 = dx * dx + dy * dy;
      if (d2 < nearest2) nearest2 = d2;
      for (let i = 0; i < reach2.length; i++) if (d2 <= reach2[i]!) inReach[i]!++;

      // Expected contact over the horizon: the share of it a closing body would spend
      // touching. A body outside the band now is costed off the swept segment, so a path
      // that grazes it pays; one already inside the band is costed where it will be, since
      // it reads the same on every candidate otherwise.
      let priced2 = d2;
      if (outside[j]) {
        const rx = ex[j]! - p.x;
        const ry = ey[j]! - p.y;
        const t = Math.max(0, Math.min(LOOKAHEAD, rx * h.x + ry * h.y));
        const gx = rx - h.x * t;
        const gy = ry - h.y * t;
        const g2 = gx * gx + gy * gy;
        if (g2 < priced2) priced2 = g2;
      }
      const b = band[j]!;
      if (priced2 <= b * b)
        expectedTouching += Math.min(1, Math.max(0, (b - Math.sqrt(priced2)) / close[j]!));
    }

    const nearest = Math.sqrt(nearest2);
    const offset = Number.isFinite(nearest) ? (nearest - orbit) / orbit : 1;
    let threat = -(offset * offset) * (offset > 0 ? FAR_WEIGHT : NEAR_WEIGHT);
    const contact = expectedTouching > 0;
    if (contact) threat -= (CONTACT_WEIGHT * touchDps * expectedTouching) / Math.max(1, p.hp);

    let engage = 0;
    for (let i = 0; i < inReach.length; i++)
      engage += shares[i]! * Math.min(inReach[i]!, ENGAGE_SATURATION);
    engage *= instinct.engage * ENGAGE_WEIGHT;

    let connect = 0;
    for (const slot of cones) {
      const imminence = 1 - Math.min(1, Math.max(0, slot.cd) / CONNECT_HORIZON);
      if (imminence <= 0) continue;
      const caught = inCone(relevant, p, Math.atan2(h.y, h.x), slot.def.reach).length;
      connect += CONNECT_WEIGHT * caught * imminence;
    }

    const route = waypoint ? -Math.sqrt((px - waypoint.x) ** 2 + (py - waypoint.y) ** 2) : 0;
    let nearestReel2 = Infinity;
    for (const r of s.reels) {
      const d2 = (r.x - px) ** 2 + (r.y - py) ** 2;
      if (d2 < nearestReel2) nearestReel2 = d2;
    }
    const near =
      nearestReel2 <= nearR2 ? (REEL_NEAR_RADIUS - Math.sqrt(nearestReel2)) * REEL_NEAR_WEIGHT : 0;

    const turn = -TURN_COST * 0.5 * (1 - (h.x * current.x + h.y * current.y));
    const total =
      threat + engage + connect + instinct.eta * (REEL_ROUTE_WEIGHT * route + near) + wall + turn;
    scored.push({ heading: h, threat, contact, engage, connect, route, near, wall, turn, total });
  }
  return scored;
}

/** The arg-max over `scoreHeadings`: the heading the star wants. */
export function chooseHeading(
  s: ArenaState,
  mods: ArenaMods,
  instinct: Instinct,
  nav: NavGrid,
  fields: Fields,
): Vec2 {
  let best = { x: Math.cos(s.player.facing), y: Math.sin(s.player.facing) };
  let bestScore = -Infinity;
  for (const c of scoreHeadings(s, mods, instinct, nav, fields)) {
    if (c.total > bestScore) {
      bestScore = c.total;
      best = c.heading;
    }
  }
  return best;
}

/** Rotates `current` toward `desired` by at most the tick's turn budget. */
export function slewHeading(current: Vec2, desired: Vec2, dt: number): Vec2 {
  const delta = Math.atan2(
    current.x * desired.y - current.y * desired.x,
    current.x * desired.x + current.y * desired.y,
  );
  const budget = MAX_TURN_RATE * dt;
  if (Math.abs(delta) <= budget) return desired;
  const step = delta > 0 ? budget : -budget;
  return {
    x: current.x * Math.cos(step) - current.y * Math.sin(step),
    y: current.x * Math.sin(step) + current.y * Math.cos(step),
  };
}

/** The decision separated from its execution: a global arg-max, then a rate-limited swing. */
export interface Steerer {
  steer(s: ArenaState, mods: ArenaMods, instinct: Instinct, dt: number): ArenaInput;
  /** The fields the last decision read, for a probe reading the score. */
  fields(s: ArenaState): Fields;
  nav: NavGrid;
}

/** One improvising star's steering, with the reel field it refreshes on its own cadence. */
export function createSteerer(): Steerer {
  const nav = buildNav();
  let fields: Fields | undefined;
  const fresh = (s: ArenaState): Fields => {
    if (!fields || s.t < fields.computedAt || s.t - fields.computedAt >= FIELD_REFRESH_SECONDS)
      fields = computeFields(s, nav);
    return fields;
  };
  return {
    nav,
    fields: fresh,
    steer(s, mods, instinct, dt) {
      const want = chooseHeading(s, mods, instinct, nav, fresh(s));
      const current = { x: Math.cos(s.player.facing), y: Math.sin(s.player.facing) };
      const h = slewHeading(current, want, dt);
      return { mx: h.x, my: h.y };
    },
  };
}
