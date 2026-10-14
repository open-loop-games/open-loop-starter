import { format, toNumber, type DecimalSource } from '@open-loop/engine';

/** Whole numbers with separators below a million, the engine's notation above. */
export function n(v: DecimalSource): string {
  const x = toNumber(v);
  return x < 1e6 ? Math.floor(x).toLocaleString('en-GB') : format(v, 2);
}

export function mmss(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** A name that opens a sentence: "the Abbot of Dunmarrow" → "The Abbot of Dunmarrow". */
export function opening(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}
