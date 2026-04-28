import type { ZoneDef } from './types';

// ─── Skeleton ───
// 2 zones. UI grouping only — zones do NOT gate content in the canonical
// shape; per-action `prereqs` handle visibility. The cursor-walked queue is
// not zone-aware. Forks that want zone-level unlocks layer extra prereqs onto
// each zone's entry actions instead of reviving a `requires` field.
//
// 2-zone consolidation (was 4): Hearth + Wilds densify with manapot frame +
// gold↔mana exchange + alt-manapot in zone 2. Market + Spire dropped — they
// were content-padding without canonical demonstration; the converged minimum
// fits in two zones with multi-axis regularVar scaling.

// ─── Costume ───
// Theme-fresh progression: Hearth (starting safety) → Wilds (transit, rural).
// Generic enough to retheme as inn → road, ground floor → upper levels,
// home base → field, etc. Forks raise cardinality in `data/zones.ts` without
// touching modules.

export const ZONES: ZoneDef[] = [
  {
    id: 'hearth',
    name: 'Hearth',
    description: 'A small home and the village around it. Where every loop begins.',
  },
  {
    id: 'wilds',
    name: 'Wilds',
    description: 'Open road, deer trails, leyline-thin places between settlements.',
  },
];
