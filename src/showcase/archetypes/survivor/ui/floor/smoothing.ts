/**
 * Smoothing for the floor. The sim steps 30 times a second and a display draws 60 or more,
 * so a drawn position read straight off the sim moves in 33 ms steps. Two answers, chosen by
 * what the value drives:
 *
 * - The double is the body the player steers, and the camera is pinned to it, so it is dead
 *   reckoned: carried forward on the velocity of its last two samples, corrected toward each
 *   new one. A chase on it would lag the steering by a step.
 * - Every other body is decoration, so it chases its latest sample. The chase hides the steps
 *   at the cost of a few frames' lag, which nobody steers by.
 *
 * Every rate here runs on wall-clock seconds, never game seconds: at a higher game speed each
 * sample moves further, and the drawing must keep up with that, not slow down with it.
 */

/** Moves `current` toward `goal` by an exponential chase at rate `k` per wall-clock second. */
export function chase(current: number, goal: number, k: number, dt: number): number {
  return current + (goal - current) * (1 - Math.exp(-k * dt));
}

/** How hard the drawn double pulls toward its reckoned position, per second. */
const CORRECT = 30;
/** The furthest the reckoning runs past the last sample, in sim steps. */
const LEAD_STEPS = 1;
/** Wall seconds without a sample after which the floor is taken as paused, and the lead dropped. */
const STALL = 0.15;
/** A sample this far from the last one is a jump, drawn at once rather than glided across. */
const JUMP = 400;

export interface Reckoner {
  /** Feeds the sim's position at game time `t`, first seen at wall-clock `now` in seconds. */
  sample(x: number, y: number, t: number, now: number): void;
  /** The drawn position at wall-clock `now`, `dt` wall seconds after the last call. */
  at(now: number, dt: number): Readonly<{ x: number; y: number }>;
  /** Starts over at a position with no history, as a new take does. */
  reset(x: number, y: number, t: number, now: number): void;
}

/** Dead reckoning for the steered double; see the file header. */
export function createReckoner(): Reckoner {
  const drawn = { x: 0, y: 0 };
  let sx = 0;
  let sy = 0;
  let st = 0;
  let sNow = 0;
  let vx = 0;
  let vy = 0;
  /** Game seconds per wall second, as the samples arrive: the game speed, measured. */
  let rate = 1;
  /** Game seconds the last step covered. */
  let step = 0;

  function reset(x: number, y: number, t: number, now: number): void {
    drawn.x = sx = x;
    drawn.y = sy = y;
    st = t;
    sNow = now;
    vx = vy = 0;
    step = 0;
  }

  return {
    reset,
    sample(x, y, t, now) {
      const dt = t - st;
      if (dt < 0 || Math.hypot(x - sx, y - sy) > JUMP) return reset(x, y, t, now);
      if (dt === 0) return;
      vx = (x - sx) / dt;
      vy = (y - sy) / dt;
      const wall = now - sNow;
      if (wall > 0) rate = chase(rate, dt / wall, 8, wall);
      step = dt;
      sx = x;
      sy = y;
      st = t;
      sNow = now;
    },
    at(now, dt) {
      const elapsed = now - sNow;
      const lead = elapsed > STALL ? 0 : Math.min(elapsed * rate, step * LEAD_STEPS);
      drawn.x = chase(drawn.x, sx + vx * lead, CORRECT, dt);
      drawn.y = chase(drawn.y, sy + vy * lead, CORRECT, dt);
      return drawn;
    },
  };
}
