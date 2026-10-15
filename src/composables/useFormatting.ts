import {
  bn,
  format,
  formatSmall,
  formatWhole,
  formatTime,
  Decimal,
  type DecimalSource,
} from '@open-loop/engine';

const INFINITY_LABEL = '∞';

function isFinite(n: DecimalSource): boolean {
  return Decimal.isFinite(n);
}

/** 0.05 → "5%". Pass `signed: true` for "+5%" / "-5%". */
export function formatPercent(value: DecimalSource, decimals = 1, signed = false): string {
  if (!isFinite(value)) return INFINITY_LABEL;
  const pct = Decimal.times(value, 100);
  const body = format(pct, decimals);
  if (signed && Decimal.gte(pct, 0)) return `+${body}%`;
  return `${body}%`;
}

/** 1.05 → "×1.05". Use for multiplicative modifiers. */
export function formatX(value: DecimalSource, decimals = 2): string {
  if (!isFinite(value)) return `×${INFINITY_LABEL}`;
  return `×${format(value, decimals)}`;
}

/** Signed absolute: 5 → "+5", -3 → "-3". Useful for deltas. */
export function formatPlus(value: DecimalSource, decimals = 2): string {
  if (!isFinite(value)) return Decimal.gte(value, 0) ? `+${INFINITY_LABEL}` : `-${INFINITY_LABEL}`;
  const body = format(value, decimals);
  return Decimal.gte(value, 0) ? `+${body}` : body;
}

/** Rate with per-unit suffix: 5 → "+5/s". Default unit is "s". */
export function formatRate(value: DecimalSource, unit = 's', decimals = 2): string {
  return `${formatPlus(value, decimals)}/${unit}`;
}

/** Exponent notation: 2 → "^2". */
export function formatPow(exponent: DecimalSource, decimals = 2): string {
  if (!isFinite(exponent)) return `^${INFINITY_LABEL}`;
  return `^${format(exponent, decimals)}`;
}

/**
 * Formats a beat time, flipping to a per-second rate below one second.
 * Infinite or NaN beat times collapse to a shared "unaffordable" label — callers that
 * care about the distinction should check the value themselves.
 */
export function formatBeatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return 'unaffordable';
  if (seconds <= 0) return 'instant';
  if (seconds < 1) {
    const perSec = 1 / seconds;
    return `${formatSmall(perSec, 1)}/s`;
  }
  return `next in ${formatTime(seconds)}`;
}

/**
 * A count read as exact whole units with thousands separators, floored; from
 * `notationFrom` on, the engine's notation, so the player's notation setting holds.
 * 1234.9 → "1,234"; 2.5e6 → the notation's "2.50 M".
 */
export function formatGrouped(value: DecimalSource, notationFrom: DecimalSource = 1e6): string {
  const whole = Decimal.floor(value);
  if (whole.gte(notationFrom)) return formatWhole(whole);
  return whole.toNumber().toLocaleString('en-US');
}

/**
 * A clock: 65 → "1:05", 3725 → "1:02:05". The engine's `formatTime` writes a
 * duration ("1m 5.00s") instead.
 */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const pad = (n: number) => String(n).padStart(2, '0');
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/**
 * Thin composable exposing engine formatters plus a handful of small utilities
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
    formatRate,
    formatPow,
    formatBeatTime,
    formatGrouped,
    formatClock,
  };
}
