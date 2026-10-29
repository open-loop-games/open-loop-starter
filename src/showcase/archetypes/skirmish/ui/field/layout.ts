/**
 * Where things stand on the field: each place's spot, the roads between them, and the
 * figures a squad shows. Pure geometry in field units on the ground plane, `x` across
 * the map and `z` toward the camera, so the frame reader and its tests import no three.
 *
 * The map is laid out as a high road and a low road: your safehouse west, the rival's
 * east, the Narrows and the Steps on the high road (the flank), the Docks low on the
 * waterfront (the direct route), and cross-streets from the high road down to the Docks.
 */
import type { Place } from '../../data/map';
import { UNIT_KINDS } from '../../data/units';
import { noCounts, wholeUnits, type Counts } from '../../modules/battle';

export interface Spot {
  x: number;
  z: number;
}

const SPOTS: Record<string, Spot> = {
  p: { x: -12, z: 0 },
  0: { x: -5, z: -5 },
  1: { x: 0, z: 5 },
  2: { x: 5, z: -5 },
  e: { x: 12, z: 0 },
};

/** The map's extent around its places, which the camera keeps in view. */
export const BOUNDS = { minX: -15, maxX: 15, minZ: -8, maxZ: 8 };

/** A place's spot on the field. */
export const spotOf = (place: Place): Spot => SPOTS[String(place)]!;

/** The point a share `t` of the way along the road from one place to the next. */
export function alongRoad(from: Place, to: Place, t: number): Spot {
  const a = spotOf(from);
  const b = spotOf(to);
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
}

// ─── Figures ───────────────────────────────────────────────────────────────

/** The most figures one squad or convoy shows; a count tag carries the rest. */
export const FIGURE_CAP = 12;

/**
 * Figures per kind for a squad: one per whole unit while the squad is small; past the cap
 * the cap is shared by each kind's size, and every kind present keeps one.
 */
export function figureCounts(counts: Counts, cap = FIGURE_CAP): Counts {
  const shown = noCounts();
  let sum = 0;
  for (const k of UNIT_KINDS) {
    shown[k] = wholeUnits(counts[k]);
    sum += shown[k];
  }
  if (sum <= cap) return shown;
  const share = UNIT_KINDS.filter((k) => shown[k] > 0).map((k) => ({
    k,
    exact: (shown[k] * cap) / sum,
  }));
  let left = cap;
  for (const s of share) {
    shown[s.k] = Math.max(1, Math.floor(s.exact));
    left -= shown[s.k];
  }
  // Largest remainders take what is left; a kind floored up to one gives back first.
  share.sort((a, b) => (b.exact % 1) - (a.exact % 1));
  for (let i = 0; left > 0; i = (i + 1) % share.length, left--) shown[share[i]!.k] += 1;
  share.sort((a, b) => shown[b.k] - shown[a.k]);
  for (let i = 0; left < 0; left++) {
    while (shown[share[i]!.k] <= 1) i++;
    shown[share[i]!.k] -= 1;
  }
  return shown;
}

/** Figures stand in rows of this many, a pace apart. */
const ROW = 4;
const PACE = 0.8;

/**
 * Where the `i`th figure of a squad stands: in a district your squad west of the centre
 * and the rival's east, so a fight reads as two lines facing each other; at a safehouse,
 * out front toward the map.
 */
export function squadSlot(place: Place, side: 'p' | 'e', i: number): Spot {
  const c = spotOf(place);
  const dir = place === 'p' ? 1 : place === 'e' ? -1 : side === 'p' ? -1 : 1;
  const col = Math.floor(i / ROW);
  const row = i % ROW;
  return { x: c.x + dir * (0.9 + col * PACE), z: c.z + (row - (ROW - 1) / 2) * PACE };
}

/** Where the `i`th figure of a convoy walks: in a column behind its head, back along the road. */
export function columnSlot(head: Spot, back: Spot, i: number): Spot {
  const dx = back.x - head.x;
  const dz = back.z - head.z;
  const len = Math.hypot(dx, dz) || 1;
  const step = (0.45 * (i + 1)) / len;
  const side = i % 2 === 0 ? 0.18 : -0.18;
  return { x: head.x + dx * step - (dz / len) * side, z: head.z + dz * step + (dx / len) * side };
}
