import type { ZoneDef } from './types';

// ─── Skeleton ───
// 4 zones. UI grouping only — zones do NOT gate content in the canonical
// shape; per-action `prereqs` handle visibility. The cursor-walked queue is
// not zone-aware. Forks that want zone-level unlocks layer extra prereqs onto
// each zone's entry actions instead of reviving a `requires` field.

// ─── Costume ───
// Theme-fresh progression: Hearth (starting safety) → Wilds (transit, rural)
// → Market (urban, social) → Spire (high-stakes endgame). Generic enough to
// retheme as a city tour, dungeon descent, planar climb, etc.

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
  {
    id: 'market',
    name: 'Market',
    description: 'A city of guilds, contracts, gossip, and apprenticeships.',
  },
  {
    id: 'spire',
    name: 'Spire',
    description: 'A tower of ruined work — old wards, restless echoes, deepest secrets.',
  },
];
