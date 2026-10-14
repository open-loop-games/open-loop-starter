/**
 * How a breaker resolves: pure functions over the board's wards, so the watch module, the
 * reckoning and the probes read the same arithmetic. A breaker carries an equal share of
 * tonight's storm. Its spray share goes over the walls and is turned only by the screens
 * facing its side; the rest is turned by that side's walls and shoring.
 */
import { SEA, type Quarter } from '../data';
import { groundAt, SIZE, type OccupancyView, type WardFactors } from './rock';

/** Quarters a yard cell faces: the side or sides it stands behind. Corners face two. */
export function yardQuartersOf(x: number, y: number): Quarter[] {
  if (groundAt(x, y) !== 'yard') return [];
  const q: Quarter[] = [];
  if (y === 1) q.push('N');
  if (y === SIZE - 2) q.push('S');
  if (x === 1) q.push('W');
  if (x === SIZE - 2) q.push('E');
  return q;
}

/** Spray the screens behind one side turn per night. */
export function screenWard(
  view: OccupancyView,
  q: Quarter,
  f: WardFactors,
  screenUnit: number,
): number {
  let screens = 0;
  for (let y = 1; y < SIZE - 1; y++)
    for (let x = 1; x < SIZE - 1; x++)
      if (view.at(x, y) === 'screen' && yardQuartersOf(x, y).includes(q)) screens++;
  return screens * f.wardPerWall * screenUnit * f.mult;
}

export function screenWards(
  view: OccupancyView,
  f: WardFactors,
  screenUnit: number,
): Record<Quarter, number> {
  return {
    N: screenWard(view, 'N', f, screenUnit),
    E: screenWard(view, 'E', f, screenUnit),
    S: screenWard(view, 'S', f, screenUnit),
    W: screenWard(view, 'W', f, screenUnit),
  };
}

export interface BreakerInput {
  /** The breaker's whole force. */
  force: number;
  /** Share of it that is spray. */
  spray: number;
  /** The struck side's wall ward and shoring, per breaker. */
  walls: number;
  /** The struck side's screen ward, per breaker. */
  screens: number;
}

/** What comes through to the tower from one breaker. */
export function breakerLeak(b: BreakerInput): number {
  const sea = (1 - b.spray) * b.force;
  const spray = b.spray * b.force;
  return Math.max(0, sea - b.walls) + Math.max(0, spray - b.screens);
}

/** The backing odds for the next breaker, after this one backed or held true. */
export function nextBackingOdds(odds: number, backed: boolean): number {
  return backed ? odds / 2 : Math.min(SEA.backingOdds, odds + SEA.backingRecover);
}

/** The quarters either side of one, clockwise first. */
export function neighbours(q: Quarter): [Quarter, Quarter] {
  const ring: Quarter[] = ['N', 'E', 'S', 'W'];
  const i = ring.indexOf(q);
  return [ring[(i + 1) % 4], ring[(i + 3) % 4]];
}
