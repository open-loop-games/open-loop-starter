import { Decimal, format, formatWhole, type DecimalSource } from '@open-loop/engine';

/** Whole counts in full below a million, so a page count reads as a page count; notation above. */
export function whole(x: DecimalSource): string {
  const d = new Decimal(x).floor();
  return d.lt(1e6) ? d.toNumber().toLocaleString('en-US') : formatWhole(d);
}

/** A per-second rate, one decimal. */
export function rate(x: DecimalSource): string {
  return format(x, 1);
}

/** The night clock: 18:00 at progress 0, 06:00 at progress 1. */
export function nightClock(progress: number): string {
  const minutes = Math.floor(progress * 12 * 60);
  const h = (18 + Math.floor(minutes / 60)) % 24;
  return `${String(h).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
