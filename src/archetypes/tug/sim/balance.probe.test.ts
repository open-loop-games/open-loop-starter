import { describe, it, expect } from 'vitest';
import { DEFAULT_TUG_DATA } from '../data';

/**
 * Balance regression probe — math-only placeholder receipts on the default
 * SciFi Armada data. Replaced wholesale by leaf 6 with the Tier-C
 * distribution-statistic locks (`runMatrixUntil`-driven win-rate /
 * match-length pins, plus the math-only `income-rate-baseline` and
 * `unit-cost-scaling` locks).
 *
 * Forbidden by archetype doc § 7: any sim driver. This file does not
 * import from `open-loop-engine/harness`.
 */

const { balance, units, counterMatrix } = DEFAULT_TUG_DATA;

describe('balance probe — placeholder receipts (leaf-5)', () => {
  it('roster has unitArchetypeCount entries', () => {
    expect(units.length).toBe(balance.unitArchetypeCount);
  });

  it('counter-matrix is square and matches roster size', () => {
    expect(counterMatrix.length).toBe(units.length);
    for (const row of counterMatrix) expect(row.length).toBe(units.length);
  });

  it('counter-matrix diagonal is identity (1.0 vs self)', () => {
    for (let i = 0; i < counterMatrix.length; i++) {
      expect(counterMatrix[i][i]).toBe(1.0);
    }
  });

  it('aiIncomeMultiplier sits at symmetric default (1.0)', () => {
    expect(balance.aiIncomeMultiplier).toBe(1.0);
  });

  it('matchTimeLimitMinutes is set so the match-duration probe has a ceiling', () => {
    expect(balance.matchTimeLimitMinutes).toBeGreaterThan(0);
  });
});
