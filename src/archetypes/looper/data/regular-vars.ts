import type { RegularVarDef } from './types';

// ─── Skeleton ───
// 4 regularVars (per-loop pools). Each carries a `total` derived from the sum
// of contributing progressVars' `level × perLevel` (set by progressVar
// level-up callbacks; `total` is persistent across loops as a cached derived
// value). Per-loop counters `checked` and `good` live on the module side and
// reset via `thingsToReset`.
//
// Pool roster anchored to vanilla idle-loops-ng (the live engine port):
//   manapot (Beginnersville):  pots       — pool = Wander × 5
//                                            (idle-loops-ng/src/modules/zones.ts:427).
//                                            Drained by Smash Pots
//                                            (mana +100 / rewardRatio 10).
//   gold pool (Beginnersville): locks     — pool = Wander × 1
//                                            (idle-loops-ng/src/modules/zones.ts:428).
//                                            Drained by Pick Locks
//                                            (gold +10 / rewardRatio 10).
//   alt-manapot (Forest Path): wild-mana  — pool = Forest × 5
//                                            (idle-loops-ng/src/modules/zones.ts:439).
//                                            Drained by Wild Mana
//                                            (mana +250 / rewardRatio 10).
//   multi-axis pool            herbs      — pool = Forest × 5 + Shortcut × 2
//   (Forest Path):                          (idle-loops-ng/src/modules/zones.ts
//                                            :441,445).
//                                            Drained by Gather Herbs (multi-
//                                            axis mana +50 + gold +5 /
//                                            rewardRatio 10 — declared
//                                            invention; vanilla grants 1 herb
//                                            per reward, an inventory resource
//                                            the first-arc port doesn't model).
//
// `rewardRatio` and `rewardEffect` payloads live on the regular-type ACTION
// def (not here) — multiple actions can target the same regularVar with
// different reward shapes. The regularVarDef carries identity + zone tag only.

export const REGULAR_VARS: RegularVarDef[] = [
  {
    id: 'pots',
    name: 'Pots',
    description: 'Hidden stores in the village brush — small, easy, manapot-shaped.',
    zoneId: 'beginnersville',
  },
  {
    id: 'locks',
    name: 'Locks',
    description: 'Loose latches and unattended boxes around the village.',
    zoneId: 'beginnersville',
  },
  {
    id: 'wild-mana',
    name: 'Wild Mana',
    description: 'Aether-thin spots in the wilds. Drinking from them refills the pool.',
    zoneId: 'forest-path',
  },
  {
    id: 'herbs',
    name: 'Herbs',
    description: 'Reagent finds in the understory — moss, root, bark, the right kind of bone.',
    zoneId: 'forest-path',
  },
];
