/**
 * The floor's effect animations, kept apart from the sim's effect list. The sim records each
 * instant with a short life (a kill pop a quarter second) and drops it when the life runs out;
 * an animation drawn from it runs two or three times longer. So the field starts a burst the
 * first time it sees an effect object, by identity (the sim ages its entries in place and
 * keeps them until they expire), and plays it to its last frame on the wall clock, after the
 * sim entry is gone. The sim is never written to.
 */

/** The effect packs' animation rate. */
export const BURST_FPS = 15;

export interface Burst<S> {
  /** The sim's effect entry that started it, read for where and how it draws. */
  source: S;
  frames: number;
  born: number;
  /** The frame to draw now; set by `advance`. */
  frame: number;
}

export interface Bursts<S extends object> {
  /** Starts a burst of `frames` frames for `source`, unless one already played for it. */
  start(source: S, frames: number, now: number): void;
  /** The live bursts at wall-clock `now`, oldest first, each at its frame; finished ones drop. */
  advance(now: number): readonly Burst<S>[];
}

/**
 * Bursts for one layer of the floor, at most `cap` alive: past it the oldest gives way, so a
 * full floor's kill rate cannot grow the sprite count without bound.
 */
export function createBursts<S extends object>(cap: number): Bursts<S> {
  const seen = new WeakSet<S>();
  let live: Burst<S>[] = [];
  return {
    start(source, frames, now) {
      if (seen.has(source)) return;
      seen.add(source);
      if (live.length >= cap) live.shift();
      live.push({ source, frames, born: now, frame: 0 });
    },
    advance(now) {
      for (const b of live) b.frame = Math.floor((now - b.born) * BURST_FPS);
      live = live.filter((b) => b.frame < b.frames);
      return live;
    },
  };
}
