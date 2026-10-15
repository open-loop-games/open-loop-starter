import { Decimal, formatWhole, type DecimalSource } from '@open-loop/engine';
import { formatClock } from '@/composables/useFormatting';

/** A stock figure: whole units, engine notation past the thousands. */
export const stock = (v: DecimalSource): string => formatWhole(Decimal.floor(new Decimal(v)));

/** A signed per-second rate; a hair either side of zero reads as zero. */
export function rate(v: number): string {
  if (Math.abs(v) < 0.005) return '±0';
  const a = Math.abs(v);
  const s = a >= 100 ? a.toFixed(0) : a.toFixed(a < 1 ? 2 : 1);
  return `${v > 0 ? '+' : '−'}${s}`;
}

/** Seconds still to run, as a clock: rounds up, so it reads 0:00 only once it is due. */
export const countdown = (t: number): string => formatClock(Math.ceil(t));

/** A multiplier, to two places where it needs them: ×1.5, ×0.25, ×1. */
export const times = (v: number): string => `×${+v.toFixed(2)}`;
