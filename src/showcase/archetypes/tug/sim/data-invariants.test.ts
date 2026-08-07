import { describe, it, expect } from 'vitest';
import { DEFAULT_TUG_DATA } from '../data';

/**
 * Structural relationships that must hold across any retune of the default
 * SciFi Armada data. Shape only, no magnitudes — the matrix has to stay square
 * against the roster and identity on its diagonal no matter what the cells are
 * tuned to.
 */

const { units, counterMatrix } = DEFAULT_TUG_DATA;

describe('data invariants — counter-matrix shape', () => {
  it('counter-matrix is square and matches roster size', () => {
    expect(counterMatrix.length).toBe(units.length);
    for (const row of counterMatrix) expect(row.length).toBe(units.length);
  });

  it('counter-matrix diagonal is identity (1.0 vs self)', () => {
    for (let i = 0; i < counterMatrix.length; i++) {
      expect(counterMatrix[i][i]).toBe(1.0);
    }
  });
});
