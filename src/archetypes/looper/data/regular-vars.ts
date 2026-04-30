import type { RegularVarDef } from './types';

// ─── Skeleton ───
// 4 regularVars (per-loop pools). Each carries a `total` derived from the sum
// of contributing progressVars' `level × perLevel` (set by progressVar
// level-up callbacks; `total` is persistent across loops as a cached derived
// value). Per-loop counters `checked` and `good` live on the module side and
// reset via `thingsToReset`.
//
// Pool roster reground per OL-802. Vanilla town-0 / town-1 source map:
//   manapot (Hearth):     cache       — vanilla Pots; pool = wander × 5
//                                       (actionList.js:195-197) → roam × 5.
//                                       Drained by Crack (mana +100 / 10).
//   gold pool (Hearth):   latch       — vanilla Locks; pool = wander × 1
//                                       (actionList.js:198-200) → roam × 1.
//                                       Drained by Slip (gold +10 / 10).
//   alt-manapot (Wilds):  wellspring  — vanilla Wild Mana; pool = forest × 5
//                                       + thicket × 5 (actionList.js:1119-1121)
//                                       → trail × 5 (slim demo drops thicket
//                                       contributor). Drained by Drink (mana
//                                       +250 / 10).
//   multi-axis pool       forage      — vanilla Herbs; pool = forest × 5 +
//   (Wilds):                            shortcut × 2 + flowers × 13
//                                       (actionList.js:1125-1127) → trail × 5
//                                       + mark × 2 (slim demo drops flowers
//                                       contributor). Drained by Gather
//                                       (multi-axis mana +50 + gold +5 / 10
//                                       — declared invention; vanilla grants
//                                       1 herb per reward, an inventory
//                                       resource the slim demo doesn't model).
//
// `rewardRatio` and `rewardEffect` payloads live on the regular-type ACTION
// def (not here) — multiple actions can target the same regularVar with
// different reward shapes. The regularVarDef carries identity + zone tag only.
//
// ─── Costume ───
// Theme-fresh names: cache (the pots-equivalent), latch (the locks-
// equivalent), wellspring (alt-manapot pool), forage (multi-axis-scaled
// reagent pool). Forks rename freely.

export const REGULAR_VARS: RegularVarDef[] = [
  {
    id: 'cache',
    name: 'Cache',
    description: 'Hidden stores in the village brush — small, easy, manapot-shaped.',
    zoneId: 'hearth',
  },
  {
    id: 'latch',
    name: 'Latch',
    description: 'Loose latches and unattended boxes around the village.',
    zoneId: 'hearth',
  },
  {
    id: 'wellspring',
    name: 'Wellspring',
    description: 'Aether-thin spots in the wilds. Drinking from them refills the pool.',
    zoneId: 'wilds',
  },
  {
    id: 'forage',
    name: 'Forage',
    description: 'Reagent finds in the understory — moss, root, bark, the right kind of bone.',
    zoneId: 'wilds',
  },
];
