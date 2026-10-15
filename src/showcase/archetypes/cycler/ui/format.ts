import type { PieceKind } from '../data';

/** What a click on the rock does: haul a net, place a piece, or take one up. */
export type Tool = 'haul' | 'clear' | PieceKind;
