import type { PackerBalance, PackerProgression } from './types';

// ─── Skeleton ──────────────────────────────────────────────────────────────
// Three structural forks live here — editing any of these changes
// archetype-level behaviour, not just tuning. Forks edit this file in
// place.
//
//   SPATIAL_MODE
//     '2d-inventory'        — Backpack Battles pure form; heterogeneous
//                             footprints + rotation; 2D grid.
//     '1d-slot'             — Super Auto Pets degenerate case; single
//                             ordered sequence of slots; adjacency is only
//                             front / behind.
//     'gem-assignment'      — GemCraft / Gem TD lineage; items slotted by
//                             assignment into typed placement slots (tower /
//                             amplifier / trap / pylon); no spatial
//                             footprint.
//
//   COMBAT_SUBSTRATE
//     'none'                — score-only; Industry Idle building-grid form;
//                             no combat phase.
//     'wave-defender'       — enemies traverse a path past the arrangement;
//                             Defender × Packer hybrid; GemCraft, Gem TD.
//     'pvp-auto-resolve'    — two arrangements fight; HP-ladder attrition;
//                             Backpack Battles, Backpack Chess.
//
//   PRESTIGE_MODE
//     'none'                — single run, no cross-run persistence.
//     'run-reset'           — run-end meta-currency grants permanent
//                             upgrades (Backpack Battles trophy).
//     'campaign'            — persistent campaign-map / wizard-level unlocks
//                             (GemCraft campaign).
//
// Default: 2d-inventory / pvp-auto-resolve / run-reset — closest to the
// modern Backpack Battles-shape distilled exemplar.

export const SPATIAL_MODE: PackerProgression['spatialMode'] = '2d-inventory';
export const COMBAT_SUBSTRATE: PackerProgression['combatSubstrate'] = 'pvp-auto-resolve';
export const PRESTIGE_MODE: PackerProgression['prestigeMode'] = 'run-reset';

export const DEFAULT_PROGRESSION: PackerProgression = {
  spatialMode: SPATIAL_MODE,
  combatSubstrate: COMBAT_SUBSTRATE,
  prestigeMode: PRESTIGE_MODE,
  metaUpgradeNodeCount: 10,
  heroCount: 3,
};

// ─── Balance ───────────────────────────────────────────────────────────────
// Cross-cutting grid + adjacency + shop constants. The per-neighbour
// stacking mode (`adjacencyStackMode`) is the archetype's dominant balance
// lever per packer.md § 6 `per-neighbour-bonus` probe; multiplicative is
// the Industry Idle / Backpack Battles default, additive is the
// conservative-balance option.

export const DEFAULT_BALANCE: PackerBalance = {
  gridRows: 8,
  gridCols: 6,
  // slotCount consulted when spatialMode === '1d-slot'.
  slotCount: 5,
  // assignmentSlots consulted when spatialMode === 'gem-assignment'.
  assignmentSlots: [
    { type: 'tower', count: 6 },
    { type: 'amplifier', count: 4 },
    { type: 'trap', count: 3 },
  ],
  adjacencyStackMode: 'multiplicative',
  defaultMaxStack: 4,
  combineCopiesByGrade: [3, 3], // grade 1 → 2 needs 3 copies; grade 2 → 3 needs 3 grade-2s
  shopTierUnlockRound: [1, 2, 4, 6, 9],
};
