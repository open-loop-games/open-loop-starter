import {
  bn,
  format,
  formatSmall,
  formatWhole,
  formatTime,
  Decimal,
  type DecimalSource,
} from 'open-loop-engine';

const INFINITY_LABEL = '∞';

function isFinite(n: DecimalSource): boolean {
  return Decimal.isFinite(n);
}

/** 0.05 → "5%". Pass `signed: true` for "+5%" / "-5%". */
export function formatPercent(value: DecimalSource, precision = 1, signed = false): string {
  if (!isFinite(value)) return INFINITY_LABEL;
  const pct = Decimal.times(value, 100);
  const body = format(pct, precision);
  if (signed && Decimal.gte(pct, 0)) return `+${body}%`;
  return `${body}%`;
}

/** 1.05 → "×1.05". Use for multiplicative modifiers. */
export function formatX(value: DecimalSource, precision = 2): string {
  if (!isFinite(value)) return `×${INFINITY_LABEL}`;
  return `×${format(value, precision)}`;
}

/** Signed absolute: 5 → "+5", -3 → "-3". Useful for deltas. */
export function formatPlus(value: DecimalSource, precision = 2): string {
  if (!isFinite(value)) return Decimal.gte(value, 0) ? `+${INFINITY_LABEL}` : `-${INFINITY_LABEL}`;
  const body = format(value, precision);
  return Decimal.gte(value, 0) ? `+${body}` : body;
}

/** Rate with per-unit suffix: 5 → "+5/s". Default unit is "s". */
export function formatGain(value: DecimalSource, unit = 's', precision = 2): string {
  return `${formatPlus(value, precision)}/${unit}`;
}

/** Exponent notation: 2 → "^2". */
export function formatPow(exponent: DecimalSource, precision = 2): string {
  if (!isFinite(exponent)) return `^${INFINITY_LABEL}`;
  return `^${format(exponent, precision)}`;
}

/**
 * Thin composable exposing engine formatters plus a handful of small helpers
 * validated across incremental game reference codebases.
 */
export function useFormatting() {
  return {
    bn,
    Decimal,
    format,
    formatSmall,
    formatWhole,
    formatTime,
    formatPercent,
    formatX,
    formatPlus,
    formatGain,
    formatPow,
  };
}
