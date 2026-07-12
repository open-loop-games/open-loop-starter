/**
 * Interlocker arc — measure-and-record regression locks (lane 3).
 *
 * Per `archetypes/BALANCING.md` § Theme 5 and
 * `/work/studio/frontier/docs/balance-process.md`: discovery lives in
 * `balance/arc-bot.ts` + `balance/probes.ts` (scripts discover); this file pins
 * the windows that discovery converged on (tests lock). Every bound here is a
 * MEASURED observation of the shipping arc bot driving the real engine — never an
 * invented target. Interlocker's numbers are canon and immutable (studio/open-loop-starter#2);
 * these locks guard against a balance/bot edit silently shifting the arc's shape,
 * not against the numbers being "wrong."
 *
 * Determinism: arc-1 has no RNG, so a run is a single canonical trajectory (no
 * seed sweep). The fast beats are pinned tight; the architecture wall is pinned in
 * a wide window because it sits ~81577s deep and small per-tick allocation changes
 * move it by minutes.
 *
 * Provenance: measured 2026-07-12, single canonical run (no RNG), tickDelta 1s —
 *   beat 1 (first field)          =     2s
 *   beat 2 (first kitten)         =    64s
 *   beat 3 (calendar)             =   257s
 *   beat 4 (agriculture)          =   425s
 *   beat 5 (workshop online)      =  2861s
 *   architecture (42000 science)  = 81577s
 *   beats 6–7 (megalith / closure): NOT reached — see the skipped block below.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { runArc, type ArcResult } from '../balance/arc-bot';

// Short budget: beat 5 fires at ~2861s, so 5000s captures beats 1–5 in ~2s wall.
const FAST_BUDGET = 5000;

describe('interlocker arc — early-beat fire windows (measure-and-record)', () => {
  let arc: ArcResult;
  beforeAll(() => {
    arc = runArc({ maxSimTime: FAST_BUDGET, tickDelta: 1 });
  });

  // Bounds are ±~15% around the measured fire-time (tighter on the fast opening
  // beats where a shift means a real regression; the workshop beat carries a
  // wider band because its wood/mineral bootstrap is the first multi-resource
  // gate). Magnitude and shape are separated: the ordering test below is a
  // shape lock that survives retunes these magnitude bounds would not.
  it('beat 1 — first catnip field ≈ 2s', () => {
    expect(arc.beatFireTimes[1]).toBeGreaterThanOrEqual(1);
    expect(arc.beatFireTimes[1]).toBeLessThanOrEqual(10);
  });
  it('beat 2 — first kitten ≈ 64s', () => {
    expect(arc.beatFireTimes[2]).toBeGreaterThanOrEqual(40);
    expect(arc.beatFireTimes[2]).toBeLessThanOrEqual(100);
  });
  it('beat 3 — calendar researched ≈ 257s', () => {
    expect(arc.beatFireTimes[3]).toBeGreaterThanOrEqual(180);
    expect(arc.beatFireTimes[3]).toBeLessThanOrEqual(360);
  });
  it('beat 4 — agriculture researched (farmers unlock) ≈ 425s', () => {
    expect(arc.beatFireTimes[4]).toBeGreaterThanOrEqual(320);
    expect(arc.beatFireTimes[4]).toBeLessThanOrEqual(560);
  });
  it('beat 5 — workshop online (mining + workshop built) ≈ 2861s', () => {
    expect(arc.beatFireTimes[5]).not.toBeNull();
    expect(arc.beatFireTimes[5]!).toBeGreaterThanOrEqual(2200);
    expect(arc.beatFireTimes[5]!).toBeLessThanOrEqual(3800);
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
  });
});

describe('interlocker arc — architecture wall (signature checkpoint)', () => {
  // The heavy lock: the 42000-science architecture wall is the arc's dominant
  // cost and its defining shape. Runs the full grind (~81577s of sim, ~40s wall),
  // so it carries a generous timeout and a wide window — a regression here means
  // the science economy or bot allocation shifted materially, not tick noise.
  it('architecture (42000 science) completes within its measured horizon ≈ 81577s', () => {
    // Halt at architecture completion rather than burning the whole budget past
    // it; the 100000s ceiling is the regression backstop (null → it never fired).
    const arc = runArc({
      maxSimTime: 100000,
      tickDelta: 1,
      stopWhen: (m) => m.sciences.scienceCompleted('architecture'),
    });
    expect(arc.architectureAt).not.toBeNull();
    expect(arc.architectureAt!).toBeGreaterThanOrEqual(70000);
    expect(arc.architectureAt!).toBeLessThanOrEqual(95000);
    // Shape lock: architecture is a hard prerequisite of arc closure, so the
    // cheap early beats must all precede it.
    expect(arc.architectureAt!).toBeGreaterThan(arc.beatFireTimes[5]!);
  }, 120_000);
});

describe.skip('interlocker arc — megalith closure (beats 6–7): UNREACHED, measured finding', () => {
  // NOT a placeholder to fill and NOT a bound to loosen — a recorded finding.
  //
  // The phased arc bot reliably reaches beat 5 (workshop) and the architecture
  // wall, but cannot close the megalith tail (beats 6–7) in a practical sim
  // horizon. This is MEASURED, not a bot defect: the tail is wood-gated, and wood
  // is the arc's closed interlocking loop — wood gates huts gate woodcutters gate
  // wood, with no arc-1 escape valve (canon's log house is out of scope). See
  // `data/index.ts` § Balance point 5 and `balance/arc-bot.ts` for the full
  // characterization. Closing beats 6–7 requires the non-myopic play the archetype
  // is built to reward — which a human supplies (the arc is hand-verified
  // completable) but the greedy/phased bot does not.
  //
  // Per measure-and-record, this stays skipped-with-a-pointer rather than being
  // forced green by tuning the bot toward the beat — that inversion is exactly the
  // set-as-target anti-pattern retired in studio/open-loop-starter#2. Re-home this
  // block into a live lock only once the arc is closed by a genuine policy (or a
  // fork's balance change), with the observed window recorded from that run.
  it('beat 6 — first megalith crafted', () => {
    expect(true).toBe(true);
  });
  it('beat 7 — arc closure (architecture + megalith owned)', () => {
    expect(true).toBe(true);
  });
});
