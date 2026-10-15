import { format, toNumber, type DecimalSource } from '@open-loop/engine';
import { formatClock } from '@/composables/useFormatting';

/** Whole numbers with separators below a million, the engine's notation above. */
export function n(v: DecimalSource): string {
  const x = toNumber(v);
  // A purse spent to the last coin can sit a hair under zero; never print "-0".
  return x < 1e6 ? Math.max(0, Math.floor(x)).toLocaleString('en-GB') : format(v, 2);
}

/** A clock that counts a part second as whole, so a countdown reads 0:00 only when it is done. */
export function mmss(seconds: number): string {
  return formatClock(Math.ceil(seconds));
}

/** A name that opens a sentence: "the Abbot of Dunmarrow" → "The Abbot of Dunmarrow". */
export function opening(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}
