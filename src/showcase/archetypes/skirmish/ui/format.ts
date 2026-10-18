/** Presentation for the deck: number shapes, unit glyphs and the matchup line a tooltip shows. */
import { Decimal, format, formatWhole, type DecimalSource } from '@open-loop/engine';
import { formatClock } from '@/composables/useFormatting';
import { UNITS, UNIT_KINDS, effectiveness, type UnitKind } from '../data/units';

/** Whole units held: floored, since `formatWhole` still prints a fraction under one. */
export function whole(x: DecimalSource): string {
  return formatWhole(Decimal.floor(x));
}

/** A rate: one decimal under ten, none above. */
export function rate(x: number): string {
  return x < 10 ? x.toFixed(1) : format(x, 0);
}

/** Match seconds as m:ss. */
export const clock = formatClock;

/** Rounded up, with separators: a price you will actually pay, integrity left standing. */
export function grouped(x: number): string {
  return Math.ceil(x).toLocaleString('en-US');
}

export const GLYPH: Record<UnitKind, string> = {
  razor: '⟋',
  hexer: '✶',
  rigger: '⌖',
  enforcer: '▣',
};

/** "beats Hexers · falls to Riggers", read from the pairing relation. */
export function matchup(kind: UnitKind): string {
  const beats = UNIT_KINDS.filter((b) => b !== kind && effectiveness(kind, b) > 1.2).map(
    (b) => UNITS[b].name,
  );
  const falls = UNIT_KINDS.filter((b) => b !== kind && effectiveness(b, kind) > 1.2).map(
    (b) => UNITS[b].name,
  );
  const parts: string[] = [];
  if (beats.length) parts.push(`beats ${beats.join(', ')}`);
  if (falls.length) parts.push(`falls to ${falls.join(', ')}`);
  return parts.join(' · ') || 'even against everything';
}
