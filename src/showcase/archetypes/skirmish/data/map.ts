/**
 * The map: five places joined by roads. Each seat's safehouse is at one end, and the three
 * districts lie between them. A road takes `HOP_S` to walk, whichever road it is.
 */
import type { SideId } from './buildings';

// ─── Skeleton ──────────────────────────────────────────────────────────────

/** A place on the map: a district, by its index in `DISTRICTS`, or a seat's safehouse. */
export type Place = number | SideId;

/**
 * The roads. Neon Narrows is the player's near district, Spire Steps the rival's, and
 * Ashfall Docks the middle one, a road from both safehouses. A siege leaves only from a
 * district with a road to the safehouse it hits, so a seat's near district is safe income
 * that cannot siege.
 */
export const ROADS: readonly [Place, Place][] = [
  ['p', 0],
  ['p', 1],
  [0, 1],
  [0, 2],
  [1, 2],
  [1, 'e'],
  [2, 'e'],
];

// ─── Balance ───────────────────────────────────────────────────────────────
// Every road is one `HOP_S`, so a route's length is its road count. Between the
// safehouses the direct route (through the Docks) is two roads and the flank (through
// the Narrows and the Steps) three: route choice trades time for what stands on the way,
// with no per-road tuning.

/** Whether a road joins two places. */
export function adjacent(a: Place, b: Place): boolean {
  return ROADS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

/** The places one road away. */
export function neighbours(place: Place): Place[] {
  const out: Place[] = [];
  for (const [x, y] of ROADS) {
    if (x === place) out.push(y);
    else if (y === place) out.push(x);
  }
  return out;
}

const isSafehouse = (place: Place): place is SideId => typeof place === 'string';

const routeCache = new Map<string, readonly (readonly Place[])[]>();

/**
 * Every route from one place to another that visits no place twice and passes through no
 * safehouse, shortest first. A route lists the places after `from`, ending at `to`; ties
 * keep the order of `ROADS`. Two places that are the same have one empty route.
 */
export function routes(from: Place, to: Place): readonly (readonly Place[])[] {
  const key = `${from}>${to}`;
  const cached = routeCache.get(key);
  if (cached) return cached;
  const out: Place[][] = [];
  const walk = (at: Place, path: Place[]) => {
    for (const next of neighbours(at)) {
      if (next === from || path.includes(next)) continue;
      if (next === to) out.push([...path, next]);
      else if (!isSafehouse(next)) walk(next, [...path, next]);
    }
  };
  if (from === to) out.push([]);
  else walk(from, []);
  out.sort((a, b) => a.length - b.length);
  routeCache.set(key, out);
  return out;
}

/** Roads on the shortest route between two places. */
export function hops(from: Place, to: Place): number {
  return routes(from, to)[0]!.length;
}

/** The shortest route from `from` through each waypoint in turn to `to`. */
export function plan(from: Place, to: Place, via: readonly Place[] = []): Place[] {
  const out: Place[] = [];
  let at = from;
  for (const stop of [...via, to]) {
    out.push(...routes(at, stop)[0]!);
    at = stop;
  }
  return out;
}
