import type { ProgressVarDef } from './types';

// ─── Skeleton ───
// 4 progressVars (2 per zone). Each is a persistent exploration track that
// survives the loop reset (kept by retention policy). Module-side via a second
// `createSkillCategory<ProgressVarDef, …>` instance that mirrors capabilities'
// shape but with a different role: progressVar level NEVER multiplies cost or
// XP rate — it sizes per-loop pools (regularVar `total`s) via the `scales`
// table. Vanilla idle-loops Wander-shape, generalized.
//
// Multi-axis scaling demo: `forage.total = trail.level × 5 + mark.level × 2`.
// Both `trail` and `mark` carry a `forage` entry in their `scales` arrays;
// the regularVars module sums all contributors on any contributor's level-up.
//
// ─── Costume ───
// Theme-fresh names — short verbs over noun-phrases for queue legibility.
// Roam (the explore-equivalent in Hearth) ; Acquaint (the social-equivalent);
// Trail (the explore-equivalent in Wilds); Mark (the leyline-equivalent).
// Forks rename freely.
//
// ─── Balance ───
// `expMult: 1` uniform — solver may retune per-progressVar in OL-746.
// `perLevel` magnitudes are vanilla-canonical placeholders:
//   roam × 5 → cache    mirrors vanilla Wander × 5 → Pots
//   roam × 1 → latch    secondary contribution (gold pool sizing)
//   acquaint × 1 → errand   social-channel gold pool
//   trail × 5 → wellspring  alt-manapot (mirrors Forest × 5 → WildMana)
//   trail × 5 + mark × 2 → forage  multi-axis (mirrors Forest×5 + Shortcut×2 → Herbs)

export const PROGRESS_VARS: ProgressVarDef[] = [
  {
    id: 'roam',
    name: 'Roam',
    description: 'Wander the village edges. Pots in the brush, paths into the wood.',
    zoneId: 'hearth',
    expMult: 1,
    scales: [
      { regularVarId: 'cache', perLevel: 5 },
      { regularVarId: 'latch', perLevel: 1 },
    ],
  },
  {
    id: 'acquaint',
    name: 'Acquaint',
    description: 'Sit with neighbours. Names settle, errands surface.',
    zoneId: 'hearth',
    expMult: 1,
    scales: [{ regularVarId: 'errand', perLevel: 1 }],
  },
  {
    id: 'trail',
    name: 'Trail',
    description: 'Read the deer-paths. Each loop shows you another stride of forest.',
    zoneId: 'wilds',
    expMult: 1,
    scales: [
      { regularVarId: 'wellspring', perLevel: 5 },
      { regularVarId: 'forage', perLevel: 5 },
    ],
  },
  {
    id: 'mark',
    name: 'Mark',
    description: 'Sense the leylines. Where the threads cross, the forest yields.',
    zoneId: 'wilds',
    expMult: 1,
    scales: [{ regularVarId: 'forage', perLevel: 2 }],
  },
];
