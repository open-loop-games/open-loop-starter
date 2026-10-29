/**
 * The roads: units moving between places walk as convoys. A convoy fights nobody on the
 * road. It stops at the first place on its way where the other seat stands, a squad or a
 * sentry nest, and joins the fight there; otherwise it joins the squad where it is going,
 * or the reserve at its own safehouse.
 *
 * Every function here mutates a seat's convoys in place; the match tick calls `stepTravel`.
 */
import { Decimal, toNumber, type Resource } from '@open-loop/engine';
import { hops, plan, type Place } from '../data/map';
import { UNIT_KINDS, type UnitKind } from '../data/units';
import { PRESENCE, countsOf, total, type Counts } from './battle';
import type { Side } from './side';

export interface Convoy {
  /** Stable while the convoy is on the road, so a re-order can name it. */
  id: number;
  /** Units by kind. Fractional where the squad it left had taken losses. */
  counts: Counts;
  /** The place the convoy last left. */
  from: Place;
  /** The places still ahead, the next first; the last is where the convoy is going. */
  path: Place[];
  /** How far along the road from `from` to `path[0]`, from 0 to 1. */
  progress: number;
}

/** Where a convoy is going. */
export const destination = (c: Convoy): Place => c.path[c.path.length - 1]!;

/** Roads a convoy has left on its route, the part of this one walked taken off. */
export const roadsLeft = (c: Convoy): number => c.path.length - c.progress;

/** Units a seat has on the road. They hold bunks, so the supply bag's room shrinks by them. */
export function onRoad(side: Pick<Side, 'convoys'>): number {
  let n = 0;
  for (const c of side.convoys.value) n += total(c.counts);
  return n;
}

/** A seat's units standing at a place: the reserve at its own safehouse, else the squad there. */
function poolAt(side: Side, place: Place): Record<UnitKind, Resource> {
  if (place === side.id) return side.reserve;
  if (typeof place !== 'number') throw new Error(`${side.id} has no units at ${place}'s safehouse`);
  return side.squads[place]!;
}

/** Whether a seat stands at a district: a squad present, or a sentry nest standing. */
export function presentAt(side: Side, place: Place): boolean {
  if (typeof place !== 'number') return false;
  return (
    total(countsOf(side.squads[place]!)) > PRESENCE || toNumber(side.nests[place]!.hp.value) > 0
  );
}

/**
 * Put units on the road from `from` along `path`. The caller has already taken them out of
 * the place they left: a bunk freed there is the bunk the road takes. Units leaving the same
 * place on the same route in the same tick walk as one convoy.
 */
export function launch(side: Side, counts: Counts, from: Place, path: Place[]): Convoy | undefined {
  if (total(counts) <= 0 || path.length === 0) return undefined;
  const same = side.convoys.value.find(
    (c) => c.progress === 0 && c.from === from && c.path.join() === path.join(),
  );
  if (same) {
    for (const k of UNIT_KINDS) same.counts[k] += counts[k];
    return same;
  }
  const convoy: Convoy = {
    id: side.convoyIds.value++,
    counts: { ...counts },
    from,
    path,
    progress: 0,
  };
  side.convoys.value.push(convoy);
  return convoy;
}

/** Take the convoy off the road, then stand its units at a place. */
function arrive(side: Side, convoy: Convoy, place: Place): void {
  const list = side.convoys.value;
  list.splice(list.indexOf(convoy), 1);
  const pool = poolAt(side, place);
  for (const k of UNIT_KINDS)
    if (convoy.counts[k] > 0) pool[k].value = Decimal.add(pool[k].value, convoy.counts[k]);
}

/** Walk every convoy of `own` for `dt` seconds of a road that takes `hopS`. */
export function stepTravel(own: Side, other: Side, dt: number, hopS: number): void {
  for (const convoy of [...own.convoys.value]) {
    convoy.progress += dt / hopS;
    // The tolerance absorbs the drift of summing tick fractions.
    while (convoy.progress >= 1 - 1e-9) {
      const at = convoy.path.shift()!;
      if (convoy.path.length === 0 || presentAt(other, at)) {
        arrive(own, convoy, at);
        break;
      }
      convoy.from = at;
      convoy.progress = Math.max(0, convoy.progress - 1);
    }
  }
}

/** Roads a convoy has left to walk to a place, turning back along its road if that is shorter. */
export function convoyHops(convoy: Convoy, to: Place): number {
  const ahead = convoy.path[0]!;
  return Math.min(1 - convoy.progress + hops(ahead, to), convoy.progress + hops(convoy.from, to));
}

/**
 * Send a convoy somewhere else, through the waypoints in `via`. It keeps its place on the
 * road: it walks on, or turns back along the road it is on when that way is shorter. It
 * never cuts across the map.
 */
export function reroute(convoy: Convoy, to: Place, via: readonly Place[] = []): void {
  const ahead = convoy.path[0]!;
  const onward = plan(ahead, to, via);
  const back = plan(convoy.from, to, via);
  if (convoy.progress + back.length < 1 - convoy.progress + onward.length) {
    convoy.path = [convoy.from, ...back];
    convoy.from = ahead;
    convoy.progress = 1 - convoy.progress;
  } else {
    convoy.path = [ahead, ...onward];
  }
}
