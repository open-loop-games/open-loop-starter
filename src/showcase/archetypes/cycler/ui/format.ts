import { format, toNumber, type DecimalSource } from '@open-loop/engine';
import type { PieceKind } from '../data';

/** Whole numbers with separators below a million, the engine's notation above. */
export function n(v: DecimalSource): string {
  const x = toNumber(v);
  return x < 1e6 ? Math.floor(x).toLocaleString('en-GB') : format(v, 2);
}

export function mmss(seconds: number): string {
  const m = Math.floor(seconds / 60);
  return `${m}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

/** What a click on the rock does: haul a net, place a piece, or take one up. */
export type Tool = 'haul' | 'clear' | PieceKind;
