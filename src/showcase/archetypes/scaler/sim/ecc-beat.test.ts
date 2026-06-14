/**
 * Regression locks for the Scaler ECC piecewise softcap — `eccTranscend`
 * vs the spec walker's regime-splice expression, exact match at every
 * sample point.
 *
 * Per `archetypes/BALANCING.md` § Theme 3 #2 (Piecewise variant): two
 * independent closed-form expressions of the same canonical math; drift
 * means one regime expression mutated. Both sides compute in IEEE 754
 * over `number`, so equality is exact — no `toBeCloseTo` slack.
 *
 * Sample points span both regime breakpoints (100 and 1000) ± 1, plus
 * interior points to exercise within-regime interpolation:
 *
 *   linear regime  : 0, 1, 50, 99, 100
 *   soft  regime   : 101, 500, 999, 1000
 *   hard  regime   : 1001, 1500, 2000
 *
 * Predictor-tight: the closure value is the canonical `Challenges.ts:599-617`
 * piecewise; any drift surfaces here before any sim path is needed.
 */

import { describe, it, expect } from 'vitest';
import { eccTranscend } from '../modules';
import { ECC_SAMPLE_COMPLETIONS } from '../balance/balance';
import { specEccTranscend } from '../balance/spec';

describe('scaler ECC piecewise lock — spec walker matches engine exactly', () => {
  for (const completions of ECC_SAMPLE_COMPLETIONS) {
    it(`completions=${completions} matches`, () => {
      expect(specEccTranscend(completions)).toBe(eccTranscend(completions));
    });
  }

  // Closure values pinned independently — catches the case where spec walker
  // and engine drift together (both edited at once). The math is canonical
  // per `Challenges.ts:599-617`; these values come from hand-computing the
  // regime sum at each breakpoint.
  it('pins canonical regime-breakpoint values', () => {
    expect(eccTranscend(0)).toBe(0);
    expect(eccTranscend(100)).toBe(100);
    expect(eccTranscend(101)).toBe(100.05);
    expect(eccTranscend(500)).toBe(120);
    expect(eccTranscend(1000)).toBe(145);
    expect(eccTranscend(1001)).toBe(145.01);
    expect(eccTranscend(2000)).toBe(155);
  });
});
