/**
 * Interlocker arc — measure-and-record regression locks (lane 3).
 *
 * Per `archetypes/BALANCING.md` § Theme 5 and
 * `/work/studio/frontier/docs/balance-process.md`: discovery lives in
 * `balance/arc-run.ts` + `balance/probes.ts` (scripts discover); this file pins
 * the windows that discovery converged on (tests lock). Every bound here is a
 * MEASURED observation of the SHIPPING automation (`modules/automation.ts` under
 * the canonical `DEFAULT_AUTOMATION_PROFILE`, all tiers force-unlocked) driving
 * the real engine — never an invented target. Interlocker's numbers are canon and
 * immutable (studio/open-loop-starter#2); these locks guard against an
 * automation/profile edit silently shifting the arc's shape, not against the
 * numbers being "wrong."
 *
 * Determinism: arc-1 has no RNG, so a run is a single canonical trajectory (no
 * seed sweep). The fast beats are pinned tight; the deep checkpoints (architecture,
 * megalith closure) carry wide windows because they sit ~100k+ s deep and small
 * per-tick allocation changes move them by minutes.
 *
 * Provenance: measured 2026-07-12, single canonical run (no RNG), tickDelta 1s,
 * shipping automation + canonical profile (studio/open-loop-starter#8) —
 *   beat 1 (first field)          =       1s
 *   beat 2 (first kitten)         =     142s
 *   beat 3 (calendar)             =     345s
 *   beat 4 (agriculture)          =     579s
 *   beat 5 (workshop online)      =    5266s
 *   architecture (42000 science)  =  101045s
 *   beat 6 (first megalith)       =  121945s
 *   beat 7 (arc closure)          =  121945s
 *   final population              =      29 kittens (7 huts + 15 log houses)
 *
 * The full arc CLOSES under the canonical automation — the retired bespoke bot
 * (studio/open-loop-starter#8) reached only architecture and never the megalith
 * tail (its pop-8 ceiling was a bot artifact). The log house + KS-patterned
 * automation lift the population past that ceiling and close beats 6–7.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { runArc, runArcAsync, type ArcResult } from '../balance/arc-run';

// Beat 5 (workshop) fires at ~5266s, so 8000s captures beats 1–5 in ~4s wall.
const FAST_BUDGET = 8000;

describe('interlocker arc — early-beat fire windows (measure-and-record)', () => {
  let arc: ArcResult;
  beforeAll(() => {
    arc = runArc({ maxSimTime: FAST_BUDGET, tickDelta: 1 });
  });

  // Bounds are ±~40% around the measured fire-time (tighter on the immediate
  // opening beat). Magnitude and shape are separated: the ordering test below is
  // a shape lock that survives retunes these magnitude bounds would not.
  it('beat 1 — first catnip field ≈ 1s', () => {
    expect(arc.beatFireTimes[1]).toBeGreaterThanOrEqual(1);
    expect(arc.beatFireTimes[1]).toBeLessThanOrEqual(20);
  });
  it('beat 2 — first kitten ≈ 142s', () => {
    expect(arc.beatFireTimes[2]).toBeGreaterThanOrEqual(90);
    expect(arc.beatFireTimes[2]).toBeLessThanOrEqual(220);
  });
  it('beat 3 — calendar researched ≈ 345s', () => {
    expect(arc.beatFireTimes[3]).toBeGreaterThanOrEqual(240);
    expect(arc.beatFireTimes[3]).toBeLessThanOrEqual(500);
  });
  it('beat 4 — agriculture researched (farmers unlock) ≈ 579s', () => {
    expect(arc.beatFireTimes[4]).toBeGreaterThanOrEqual(400);
    expect(arc.beatFireTimes[4]).toBeLessThanOrEqual(820);
  });
  it('beat 5 — workshop online (mining + workshop built) ≈ 5266s', () => {
    expect(arc.beatFireTimes[5]).not.toBeNull();
    expect(arc.beatFireTimes[5]!).toBeGreaterThanOrEqual(3800);
    expect(arc.beatFireTimes[5]!).toBeLessThanOrEqual(7200);
  });

  it('beats fire in ascending arc order (shape lock, magnitude-independent)', () => {
    const t = [1, 2, 3, 4, 5].map((i) => arc.beatFireTimes[i]);
    expect(t.every((x) => x !== null)).toBe(true);
    for (let i = 1; i < t.length; i++) {
      expect(t[i]!).toBeGreaterThanOrEqual(t[i - 1]!);
    }
  });
});

describe('interlocker arc — determinism (no RNG → single canonical trajectory)', () => {
  it('two independent runs produce identical early-beat fire-times', () => {
    const a = runArc({ maxSimTime: FAST_BUDGET, tickDelta: 1 });
    const b = runArc({ maxSimTime: FAST_BUDGET, tickDelta: 1 });
    for (const id of [1, 2, 3, 4, 5]) {
      expect(a.beatFireTimes[id]).toBe(b.beatFireTimes[id]);
    }
  }, 30_000);
});

describe('interlocker arc — full closure (architecture + megalith, signature checkpoint)', () => {
  // The heavy lock: one full run to arc closure (beat 7), ~122000s of sim
  // (~85s wall), so it carries a generous timeout and wide windows. This is the
  // arc's defining shape — the canonical automation closes the megalith tail the
  // retired bot could not, so this checkpoint guards that closure, not tick noise.
  let arc: ArcResult;
  beforeAll(async () => {
    // runArcAsync halts at beat 7; the 200000s ceiling is the regression backstop
    // (a null beat 7 → the arc failed to close). Async so the ~100k-tick run
    // yields to the event loop and doesn't starve the Vitest worker RPC.
    arc = await runArcAsync({ maxSimTime: 200000, tickDelta: 1 });
  }, 240_000);

  it('architecture (42000 science) completes within its measured horizon ≈ 101045s', () => {
    expect(arc.architectureAt).not.toBeNull();
    expect(arc.architectureAt!).toBeGreaterThanOrEqual(85000);
    expect(arc.architectureAt!).toBeLessThanOrEqual(120000);
  });

  it('beat 6 — first megalith crafted ≈ 121945s', () => {
    expect(arc.beatFireTimes[6]).not.toBeNull();
    expect(arc.beatFireTimes[6]!).toBeGreaterThanOrEqual(95000);
    expect(arc.beatFireTimes[6]!).toBeLessThanOrEqual(155000);
  });

  it('beat 7 — arc closure (architecture + megalith owned) reached', () => {
    expect(arc.reachedClosure).toBe(true);
    expect(arc.beatFireTimes[7]).not.toBeNull();
    // Shape locks: closure follows architecture, and both follow the early arc.
    expect(arc.beatFireTimes[7]!).toBeGreaterThanOrEqual(arc.architectureAt!);
    expect(arc.beatFireTimes[7]!).toBeGreaterThanOrEqual(arc.beatFireTimes[6]!);
    expect(arc.architectureAt!).toBeGreaterThan(arc.beatFireTimes[5]!);
  });

  it('population grows past the retired bot’s pop-8 ceiling', () => {
    // The log house + KS automation lift population well past the artifact cap;
    // a regression that re-caps population would fail here.
    expect(arc.final.kittens).toBeGreaterThanOrEqual(20);
    expect(arc.final.logHouses).toBeGreaterThanOrEqual(1);
  });
}, 240_000);
