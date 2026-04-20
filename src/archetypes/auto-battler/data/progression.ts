import type { AutoBattlerBalance, AutoBattlerProgression } from './types';

// ─── Skeleton ──────────────────────────────────────────────────────────────
// Six structural forks live here — editing any of these changes
// archetype-level behaviour, not just tuning. Forks edit this file in
// place.
//
//   GRID_MODE
//     '2d-hex'              — Dota Auto Chess origin geometry; 8×8 hex with
//                             lower 4 ranks player-owned.
//     '2d-rect'             — TFT / Dota Underlords / Teamfight Manager /
//                             Mechabellum.
//     '1d-slot'             — Super Auto Pets degenerate case; single
//                             ordered sequence.
//
//   POOL_MODE
//     'shared'              — competitive acquisition from one lobby-wide
//                             pool (DAC / TFT / Underlords).
//     'private'             — per-player independent shops (SAP /
//                             Mechabellum single-player).
//
//   COMBAT_MODE
//     'pvp'                 — default; 8-player bracket.
//     'pve'                 — scripted encounters (Hadean Tactics, Dragon
//                             Cliff roguelites).
//     'hybrid'              — PvE creep interrupts mixed into a PvP match
//                             (original DAC / TFT); campaign mode
//                             (Mechabellum).
//
//   COMBINE_MODE
//     'three-tier'          — 3→2star, 3→3star (canonical).
//     'two-tier'            — cap at 2-star (Auto Gladiators shorter
//                             matches).
//     'flat'                — no combine-up; boundary toward Tug.
//
//   ACQUISITION_MODE
//     'shop'                — default — per-round shop offers.
//     'deck-draw'           — cards drawn from a deck (Storybook Brawl).
//     'hybrid-shop-draw'    — both shop + deck (The Bazaar).
//
//   PRESTIGE_MODE
//     'none'                — single match only, no persistence.
//     'run-reset'           — trophy / rank persistence on match end.
//     'continuous-accumulator' — SAP trophies through wins and losses.
//     'campaign'            — campaign-map / node-unlock persistence
//                             (Hadean Tactics).
//
// Default: 2d-hex / shared / pvp / three-tier / shop / run-reset — closest
// to the Dota Auto Chess origin form.

export const GRID_MODE: AutoBattlerProgression['gridMode'] = '2d-hex';
export const POOL_MODE: AutoBattlerProgression['poolMode'] = 'shared';
export const COMBAT_MODE: AutoBattlerProgression['combatMode'] = 'pvp';
export const COMBINE_MODE: AutoBattlerProgression['combineMode'] = 'three-tier';
export const ACQUISITION_MODE: AutoBattlerProgression['acquisitionMode'] = 'shop';
export const PRESTIGE_MODE: AutoBattlerProgression['prestigeMode'] = 'run-reset';

export const DEFAULT_PROGRESSION: AutoBattlerProgression = {
  gridMode: GRID_MODE,
  poolMode: POOL_MODE,
  combatMode: COMBAT_MODE,
  combineMode: COMBINE_MODE,
  acquisitionMode: ACQUISITION_MODE,
  prestigeMode: PRESTIGE_MODE,
  metaUnlockNodeCount: 10,
  heroCount: 3,
};

// ─── Balance ───────────────────────────────────────────────────────────────
// Cross-cutting player-level + shop-tier constants. The
// `shopTierUnlockLevel` schedule is the DAC canonical — higher-tier units
// unlock as the player pays for level-ups through the match. Probe
// `tier-gate-schedule` in auto-battler.md § 6 perturbs this.

export const DEFAULT_BALANCE: AutoBattlerBalance = {
  starMultiplier: [1.0, 2.0, 3.5],
  maxPlayerLevel: 10,
  maxShopTier: 6,
  // Canonical DAC schedule — shop tier K unlocks at player level K
  // (indices 0-based, so index 0 = tier 1 at level 1, index 5 = tier 6 at
  // level 7+).
  shopTierUnlockLevel: [1, 2, 3, 4, 5, 7],
  eliminationHp: 0,
};
