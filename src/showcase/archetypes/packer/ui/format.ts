import { Decimal, format, type DecimalSource } from '@open-loop/engine';

/** A live counter: `small` decimals below 10, whole numbers to 1000, engine notation above. */
export function fmt(n: number | DecimalSource, small = 1): string {
  const v = typeof n === 'number' ? n : Decimal.fromValue(n).toNumber();
  if (Math.abs(v) < 10) return v.toFixed(small);
  if (Math.abs(v) < 1000) return v.toFixed(0);
  return format(v, 2);
}

/** A firing-solution delta, signed with a true minus. */
export const signed = (n: number): string => (n >= 0 ? '+' : '−') + fmt(Math.abs(n));

/** A multiplier: ×1.50. */
export const times = (n: number): string => `×${fmt(n, 2)}`;
