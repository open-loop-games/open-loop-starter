import { describe, expect, it } from 'vitest';
import { createReckoner } from './smoothing';

/** Drives a reckoner the way the field does: the sim steps at 30 Hz, the display draws at 60 Hz. */
function run(
  path: (t: number) => { x: number; y: number },
  seconds: number,
  reckoner = createReckoner(),
) {
  const STEP = 1 / 30;
  const FRAME = 1 / 60;
  let simT = 0;
  const out: { now: number; truth: { x: number; y: number }; drawn: { x: number; y: number } }[] =
    [];
  const p0 = path(0);
  reckoner.reset(p0.x, p0.y, 0, 0);
  for (let now = FRAME; now <= seconds; now += FRAME) {
    while (simT + STEP <= now + 1e-9) {
      simT += STEP;
      const p = path(simT);
      reckoner.sample(p.x, p.y, simT, now);
    }
    out.push({ now, truth: path(now), drawn: { ...reckoner.at(now, FRAME) } });
  }
  return out;
}

describe('createReckoner', () => {
  it('moves the double every display frame while the sim steps at half the rate', () => {
    const frames = run((t) => ({ x: 150 * t, y: 0 }), 2).slice(30);
    for (let i = 1; i < frames.length; i++)
      expect(frames[i]!.drawn.x).toBeGreaterThan(frames[i - 1]!.drawn.x);
  });

  it('keeps the drawn double within a step of the truth, turns included', () => {
    // Walking speed, swinging round a circle: the reckoning must not overshoot a turn.
    const frames = run((t) => ({ x: 120 * Math.cos(t * 1.25), y: 120 * Math.sin(t * 1.25) }), 4);
    const step = 150 / 30;
    for (const f of frames.slice(30))
      expect(Math.hypot(f.drawn.x - f.truth.x, f.drawn.y - f.truth.y)).toBeLessThan(step);
  });

  it('settles on the last sample when the double stops, with no overshoot', () => {
    const frames = run((t) => ({ x: 150 * Math.min(t, 1), y: 0 }), 2);
    const after = frames.filter((f) => f.now > 1.4);
    for (const f of after) expect(f.drawn.x).toBeLessThanOrEqual(150 + 1e-6);
    expect(after.at(-1)!.drawn.x).toBeCloseTo(150, 3);
  });

  it('drops its lead when samples stop arriving, as on a paused floor', () => {
    const r = createReckoner();
    r.reset(0, 0, 0, 0);
    r.sample(5, 0, 1 / 30, 1 / 30);
    let p = { x: 0, y: 0 };
    for (let now = 1 / 30; now < 1.5; now += 1 / 60) p = { ...r.at(now, 1 / 60) };
    expect(p.x).toBeCloseTo(5, 3);
  });

  it('jumps rather than glides across a teleport, and on time running back', () => {
    const r = createReckoner();
    r.reset(0, 0, 0, 0);
    r.sample(5, 0, 1 / 30, 1 / 30);
    r.sample(900, 0, 2 / 30, 2 / 30);
    expect(r.at(2 / 30, 1 / 60).x).toBe(900);
    r.sample(10, 10, 0, 3 / 30);
    expect(r.at(3 / 30, 1 / 60)).toEqual({ x: 10, y: 10 });
  });
});
