/**
 * Inkfist's notation: whole numbers below a thousand, the engine's notation above. Rates
 * keep one decimal while small, so the first students read.
 */
import { Decimal, format, formatWhole, type DecimalSource } from '@open-loop/engine';

/** Ki, Insight and counts. */
export function fmt(x: DecimalSource): string {
  return Decimal.lt(x, 1000) ? formatWhole(x) : format(x, 2);
}

/** A per-second rate. */
export function fmtRate(x: DecimalSource): string {
  return Decimal.lt(x, 100) ? format(x, 1) : fmt(x);
}

/** A multiplier. */
export function fmtMult(x: DecimalSource): string {
  return `×${Decimal.lt(x, 100) ? format(x, 2) : fmt(x)}`;
}

/** Seconds as m:ss. */
export function fmtClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
