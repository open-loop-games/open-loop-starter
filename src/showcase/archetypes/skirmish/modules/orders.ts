/**
 * The orders a seat gives its units. The UI calls these for the player; the
 * shared policy calls them for automation and the rival. One code path.
 */
import { Decimal, toNumber } from '@open-loop/engine';
import { UNIT_KINDS, type UnitKind } from '../data/units';
import type { Focus, Side, Stance } from './side';

/** Whole units waiting at the safehouse; the fraction left behind is still in training. */
export function readyUnits(side: Side, kind: UnitKind): number {
  return Math.floor(toNumber(side.reserve[kind].value) + 1e-9);
}

/**
 * Send up to `n` ready units of a kind from the safehouse into a district.
 * Subtract first: both pools are in one supply bag, and an add before the
 * subtract would be clamped by the cap.
 */
export function deploy(side: Side, kind: UnitKind, district: number, n = Infinity): number {
  const moved = Math.min(readyUnits(side, kind), n);
  if (moved <= 0) return 0;
  side.reserve[kind].value = Decimal.sub(side.reserve[kind].value, moved);
  side.squads[district][kind].value = Decimal.add(side.squads[district][kind].value, moved);
  return moved;
}

export function deployAll(side: Side, district: number): number {
  let moved = 0;
  for (const k of UNIT_KINDS) moved += deploy(side, k, district);
  return moved;
}

/** Pull every unit in a district back to the safehouse. */
export function retreat(side: Side, district: number): number {
  let moved = 0;
  for (const k of UNIT_KINDS) {
    const n = side.squads[district][k].value;
    if (!Decimal.gt(n, 0)) continue;
    side.squads[district][k].value = Decimal.dZero;
    side.reserve[k].value = Decimal.add(side.reserve[k].value, n);
    moved += toNumber(n);
  }
  side.stance[district].value = 'hold';
  return moved;
}

/** Move a whole squad from one district to another. */
export function redeploy(side: Side, from: number, to: number): void {
  if (from === to) return;
  for (const k of UNIT_KINDS) {
    const n = side.squads[from][k].value;
    if (!Decimal.gt(n, 0)) continue;
    side.squads[from][k].value = Decimal.dZero;
    side.squads[to][k].value = Decimal.add(side.squads[to][k].value, n);
  }
  side.stance[from].value = 'hold';
}

export function setStance(side: Side, district: number, stance: Stance): void {
  side.stance[district].value = stance;
}

export function setFocus(side: Side, district: number, focus: Focus): void {
  side.focus[district].value = focus;
}
