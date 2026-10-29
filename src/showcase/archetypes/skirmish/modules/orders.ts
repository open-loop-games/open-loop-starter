/**
 * The orders a seat gives its units. The UI calls these for the player; the
 * shared policy calls them for automation and the rival. One code path.
 */
import { Decimal, toNumber } from '@open-loop/engine';
import { plan, type Place } from '../data/map';
import { UNIT_KINDS, type UnitKind } from '../data/units';
import { countsOf, noCounts, total, wholeUnits } from './battle';
import type { Focus, Side, Stance } from './side';
import { launch, reroute } from './travel';

/** Whole units waiting at the safehouse; the fraction left behind is still in training. */
export function readyUnits(side: Side, kind: UnitKind): number {
  return wholeUnits(toNumber(side.reserve[kind].value));
}

/**
 * Send up to `n` ready units of a kind from the safehouse toward a district, by the
 * shortest route through the waypoints in `via`. They walk as a convoy.
 */
export function deploy(
  side: Side,
  kind: UnitKind,
  district: number,
  n = Infinity,
  via: readonly Place[] = [],
): number {
  const moved = Math.min(readyUnits(side, kind), n);
  if (moved <= 0) return 0;
  side.reserve[kind].value = Decimal.sub(side.reserve[kind].value, moved);
  const counts = noCounts();
  counts[kind] = moved;
  launch(side, counts, side.id, plan(side.id, district, via));
  return moved;
}

export function deployAll(side: Side, district: number, via: readonly Place[] = []): number {
  let moved = 0;
  for (const k of UNIT_KINDS) moved += deploy(side, k, district, Infinity, via);
  return moved;
}

/**
 * Send a convoy on the road somewhere else, through the waypoints in `via`. It walks on or
 * turns back along the road it is on, whichever is shorter. False if no such convoy is on
 * the road.
 */
export function redirect(
  side: Side,
  convoyId: number,
  to: Place,
  via: readonly Place[] = [],
): boolean {
  const convoy = side.convoys.value.find((c) => c.id === convoyId);
  if (!convoy) return false;
  reroute(convoy, to, via);
  return true;
}

/** Pull every unit in a district back to the safehouse, by the shortest route. */
export function retreat(side: Side, district: number): number {
  const moved = leave(side, district, side.id);
  side.stance[district].value = 'hold';
  return moved;
}

/**
 * Move a district's squad, or the kinds of it in `kinds`, to another place by the shortest
 * route through `via`. Returns the units that left.
 */
export function redeploy(
  side: Side,
  from: number,
  to: Place,
  via: readonly Place[] = [],
  kinds: readonly UnitKind[] = UNIT_KINDS,
): number {
  if (from === to && via.length === 0) return 0;
  const moved = leave(side, from, to, via, kinds);
  if (total(countsOf(side.squads[from]!)) <= 0) side.stance[from].value = 'hold';
  return moved;
}

/** Put a district's units of `kinds` on the road toward a place; returns the units that left. */
function leave(
  side: Side,
  district: number,
  to: Place,
  via: readonly Place[] = [],
  kinds: readonly UnitKind[] = UNIT_KINDS,
): number {
  const counts = noCounts();
  for (const k of kinds) {
    const n = toNumber(side.squads[district][k].value);
    if (n <= 0) continue;
    side.squads[district][k].value = Decimal.dZero;
    counts[k] = n;
  }
  launch(side, counts, district, plan(district, to, via));
  return total(counts);
}

export function setStance(side: Side, district: number, stance: Stance): void {
  side.stance[district].value = stance;
}

export function setFocus(side: Side, district: number, focus: Focus): void {
  side.focus[district].value = focus;
}

/**
 * Set a kind's weight in the floors' queue. The player steps whole weights; a fractional
 * weight the quartermaster left rounds to the nearest whole.
 */
export function setWeight(side: Side, kind: UnitKind, weight: number): void {
  side.queue[kind].value = Math.max(0, Math.round(weight));
}
