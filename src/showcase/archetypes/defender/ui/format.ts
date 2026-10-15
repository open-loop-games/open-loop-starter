import type { DecimalSource } from '@open-loop/engine';
import { formatGrouped } from '@/composables/useFormatting';

/** A count the gardener reads: whole, with thousands grouped, never in notation. */
export function whole(v: DecimalSource): string {
  return formatGrouped(v, Infinity);
}

/** Seconds left on a clock, to the second. */
export function seconds(s: number): string {
  return `${Math.max(0, Math.ceil(s))}s`;
}

/** A plot's name mid-sentence: "The Bean Rows" reads "the Bean Rows". */
export function inSentence(name: string): string {
  return name.replace(/^The /, 'the ');
}
