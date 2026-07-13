/**
 * Producer arc — measure-and-record regression locks (lane 3).
 *
 * Per `archetypes/README.md` § Balance — three lanes: discovery lives in
 * `balance/arc-probe.ts` (scripts discover); this file pins the windows that
 * discovery converged on (Vitest locks). Every bound here is a MEASURED
 * observation of the SHIPPING automation — the balance bot
 * (`balance/bot.ts`: human-then-autoclicker click model + the canonical
 * autobuyers under `modules/autobuyers/`, all forced active) driving the real
 * assembled engine — never an invented target.
 *
 * The arc is a "watch cookies-per-second scroll through powers of ten" ladder
 * (see `balance/beats.ts`): beats 1–3 are the opening structural moves (first
 * cookie, first cursor, first grandma); beats 4–7 are total CpS crossing
 * 1e3 → 1e6. Every beat is monotonic (counts never fall, CpS only grows), so
 * the arc has one canonical trajectory and each beat fires exactly once.
 *
 * Determinism: the bot has no RNG, so a run is a single canonical trajectory
 * (no seed sweep). Bounds are ~±30% around the measured fire-time — they guard
 * against a content or bot-model edit silently reshaping the arc, not against
 * the numbers being "wrong."
 *
 * Provenance: measured 2026-07-13, single canonical run, tickDelta 1s,
 * shipping bot + default Bakery content set (producer reserve 0.9, upgrades
 * greedy) —
 *   beat 1 (first cookie)   =      1s
 *   beat 2 (first cursor)   =     16s
 *   beat 3 (first grandma)  =     68s
 *   beat 4 (CpS ≥ 1e3)      =    782s
 *   beat 5 (CpS ≥ 1e4)      =   1716s
 *   beat 6 (CpS ≥ 1e5)      =   2733s
 *   beat 7 (CpS ≥ 1e6)      =   3805s
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ARC_BEATS } from '../balance/beats';
import { buildProducerSimEngine } from '../balance/bot';

const TICK_DELTA = 1;
const MAX_SIM_TIME = 80 * 60; // beat-7's window ends at 80m; stop there.

/** Drive the shipping bot over the real engine, recording each beat's first
 *  fire-time in sim-seconds (null if it never fires within the horizon). */
function runProducerArc(): Record<string, number | null> {
  const engine = buildProducerSimEngine();
  const fireAt: Record<string, number | null> = {};
  for (const b of ARC_BEATS) fireAt[b.id] = null;

  for (let t = 0; t <= MAX_SIM_TIME; t += TICK_DELTA) {
    for (const b of ARC_BEATS) {
      if (fireAt[b.id] === null && b.predicate(engine)) fireAt[b.id] = t;
    }
    engine.tickDriver.simulateTick(TICK_DELTA);
  }
  return fireAt;
}

describe('producer arc — beat fire windows (measure-and-record)', () => {
  let fireAt: Record<string, number | null>;
  beforeAll(() => {
    fireAt = runProducerArc();
  }, 120_000);

  // Explicit bounds pinned independent of BEAT_WINDOWS so a window edit can't
  // silently auto-pass the lock. Measured ± ~30%.
  const bounds: Record<string, [number, number]> = {
    'beat-1': [0, 20], // first cookie ≈ 1s
    'beat-2': [5, 60], // first cursor ≈ 16s
    'beat-3': [30, 150], // first grandma ≈ 68s
    'beat-4': [500, 1150], // CpS ≥ 1e3 ≈ 782s
    'beat-5': [1250, 2200], // CpS ≥ 1e4 ≈ 1716s
    'beat-6': [2150, 3300], // CpS ≥ 1e5 ≈ 2733s
    'beat-7': [3150, 4600], // CpS ≥ 1e6 ≈ 3805s
  };

  for (const [id, [lo, hi]] of Object.entries(bounds)) {
    it(`${id} fires in [${lo}s, ${hi}s]`, () => {
      const t = fireAt[id];
      expect(t, `${id} never fired within ${MAX_SIM_TIME}s`).not.toBeNull();
      expect(t!).toBeGreaterThanOrEqual(lo);
      expect(t!).toBeLessThanOrEqual(hi);
    });
  }

  it('beats fire in ascending arc order (shape lock, magnitude-independent)', () => {
    const times = ARC_BEATS.map((b) => fireAt[b.id]);
    expect(times.every((x) => x !== null)).toBe(true);
    for (let i = 1; i < times.length; i++) {
      expect(times[i]!).toBeGreaterThanOrEqual(times[i - 1]!);
    }
  });
});
