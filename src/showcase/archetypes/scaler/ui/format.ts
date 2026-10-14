/**
 * Paragon's notation: whole numbers below a thousand, the engine's notation
 * above. Rates keep one decimal while small, so the first recruits read.
 */
import { Decimal, format, formatWhole, type DecimalSource } from '@open-loop/engine';

/** Justice, Legacy, Continuity and counts. */
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
