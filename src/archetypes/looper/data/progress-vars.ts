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
// `expMult: 1` uniform — matches vanilla all-`expMult:1` for town-0/town-1
// progress actions. `perLevel` magnitudes are vanilla canonical:
//   roam × 5  → cache       mirrors vanilla pots = wander × 5
//                            (actionList.js:195-197).
//   roam × 1  → latch       mirrors vanilla locks = wander × 1
//                            (actionList.js:198-200).
//   trail × 5 → wellspring  mirrors vanilla wildMana = forest × 5 + thicket × 5
//                            (slim demo: only forest-contributor; trail × 5)
//                            (actionList.js:1119-1121).
//   trail × 5 → forage      mirrors vanilla herbs = forest × 5 + shortcut × 2
//   + mark × 2                + flowers × 13 (slim demo: forest + shortcut;
//                              trail × 5 + mark × 2) (actionList.js:1125-1127).
//
// Acquaint has no `scales` entry — vanilla Met is a pure progress track that
// sizes sQuests = met × 1 fed by Short Quest (actionList.js:389-391); the
// slim demo doesn't include Short Quest, so Met-equivalent acquaint stays
// pool-less. (Pre-reground we had errand = acquaint × 1 fed by Run, which
// was an invented action; both are removed per OL-804.)

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
    scales: [],
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
