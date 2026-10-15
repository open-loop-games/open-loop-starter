import { format, type DecimalSource } from '@open-loop/engine';

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
