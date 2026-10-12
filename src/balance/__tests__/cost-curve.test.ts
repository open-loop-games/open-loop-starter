import { describe, expect, it } from 'vitest';
import { Decimal } from '@open-loop/engine';
import { costCurve } from '../cost-curve';

const at = (curve: ReturnType<typeof costCurve>) => Decimal.fromValue(curve.evaluate()).toNumber();

describe('costCurve', () => {
  it('multiplies by the cost ratio per purchase when no family is named', () => {
    expect(at(costCurve(3, { baseCost: 10, costRatio: 2 }))).toBeCloseTo(80);
  });

  it('adds coef per purchase on the linear family', () => {
    expect(at(costCurve(3, { family: 'linear', baseCost: 10, coef: 4 }))).toBeCloseTo(22);
  });

  it('raises the purchase count to the exponent on the polynomial family', () => {
    expect(at(costCurve(3, { family: 'polynomial', baseCost: 10, exponent: 2 }))).toBeCloseTo(90);
  });
});
