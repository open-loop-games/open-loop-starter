import type { ZoneDef } from './types';

// ─── Skeleton ───
// 2 zones. UI grouping only — zones do NOT gate content in the canonical
// shape; per-action `prereqs` handle visibility. The cursor-walked queue is
// not zone-aware. Forks that want zone-level unlocks layer extra prereqs onto
// each zone's entry actions instead of reviving a `requires` field.
//
// 2-zone slim slice: ids carried 1:1 from
// `idle-loops-ng/src/data/zones.ts:17` `vanillaZones` constant. Vanilla
// idle-loops-ng ships 3 zones (Beginnersville + Forest Path + Merchanton);
// the slim demo carries the first two unchanged. Forks raise cardinality
// in `data/zones.ts` without touching modules.

export const ZONES: ZoneDef[] = [
  {
    id: 'beginnersville',
    name: 'Beginnersville',
    description: 'A small home and the village around it. Where every loop begins.',
  },
  {
    id: 'forest-path',
    name: 'Forest Path',
    description: 'Open road, deer trails, leyline-thin places between settlements.',
  },
];
