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

/** Seconds on the engagement clock: whole seconds, a tenth under ten. */
export const secs = (s: number): string => `${s < 10 ? s.toFixed(1) : Math.round(s)} s`;

/** A share as a whole percentage. */
export const pct = (f: number): string => `${Math.round(f * 100)}%`;

/** An act's number in the story: the six acts in Roman numerals. */
export const roman = (n: number): string => ['I', 'II', 'III', 'IV', 'V', 'VI'][n - 1] ?? String(n);

const CELL_SUFFIXES = ['', 'k', 'M', 'B', 'T'];

/** A figure inside a hull cell: three significant digits and a suffix, so it fits the plate. */
export function cell(n: number): string {
  const a = Math.abs(n);
  if (a < 1000) return fmt(n);
  const tier = Math.floor(Math.log10(a) / 3);
  if (tier >= CELL_SUFFIXES.length) return format(n, 1);
  return (n / Math.pow(1000, tier)).toPrecision(3).replace(/\.0+$/, '') + CELL_SUFFIXES[tier];
}

/** A cell figure with its sign. */
export const signedCell = (n: number): string => (n >= 0 ? '+' : '−') + cell(Math.abs(n));
