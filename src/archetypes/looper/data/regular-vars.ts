import type { RegularVarDef } from './types';

// ─── Skeleton ───
// 5 regularVars (per-loop pools). Each carries a `total` derived from the sum
// of contributing progressVars' `level × perLevel` (set by progressVar
// level-up callbacks; `total` is persistent across loops as a cached derived
// value). Per-loop counters `checked` and `good` live on the module side and
// reset via `thingsToReset`.
//
// The 5-pool set covers all canonical frames:
//   manapot (Hearth):     cache       — `add-mana 100`, rewardRatio 10
//   gold pool (Hearth):   latch       — `add-gold 10`,  rewardRatio 10
//   gold pool (social):   errand      — `add-gold 20`,  rewardRatio 5
//   alt-manapot (Wilds):  wellspring  — `add-mana 250`, rewardRatio 10
//   multi-axis pool:      forage      — `add-mana 50` + `add-gold 5`, rewardRatio 5
//
// `rewardRatio` and `rewardEffect` payloads live on the regular-type ACTION
// def (not here) — multiple actions can target the same regularVar with
// different reward shapes. The regularVarDef carries identity + zone tag only.
//
// ─── Costume ───
// Theme-fresh names: cache (the pots-equivalent), latch (the locks-
// equivalent), errand (social-channel gold), wellspring (alt-manapot pool),
// forage (multi-axis-scaled reagent pool). Forks rename freely.

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
    id: 'errand',
    name: 'Errand',
    description: 'Neighbour-asks: deliveries, witnessings, fetchings.',
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
