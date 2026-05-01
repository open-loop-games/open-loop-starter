import type { ProgressVarDef } from './types';

// ─── Skeleton ───
// 4 progressVars (2 per zone). Each is a persistent exploration track that
// survives the loop reset (kept by retention policy). Module-side via a second
// `createSkillCategory<ProgressVarDef, …>` instance that mirrors stats'
// shape but with a different role: progressVar level NEVER multiplies cost or
// XP rate — it sizes per-loop pools (regularVar `total`s) via the `scales`
// table. Vanilla idle-loops Wander-shape, generalized.
//
// Multi-axis scaling demo: `herbs.total = forest.level × 5 + shortcut.level × 2`.
// Both `forest` and `shortcut` carry a `herbs` entry in their `scales` arrays;
// the regularVars module sums all contributors on any contributor's level-up.
//
// ─── Balance ───
// `expMult: 1` uniform — matches vanilla all-`expMult:1` for town-0/town-1
// progress actions. `perLevel` magnitudes are vanilla canonical from
// `idle-loops-ng/src/modules/zones.ts`:
//   wander × 5  → pots         setRegularTotal('Pots', level * 5)        :427
//   wander × 1  → locks        setRegularTotal('Locks', level)           :428
//   forest × 5  → wild-mana    setRegularTotal('WildMana', level * 5)    :439
//   forest × 5  → herbs        setRegularTotal('Herbs', level * 5
//   + shortcut × 2               + getProgressLevel('Shortcut') * 2)     :441,445
//
// Met has no `scales` entry — vanilla Met sizes SQuests = met × 1 fed by
// Short Quest (`vanilla-actions.ts:166`, regularVar 'SQuests'); the slim
// demo doesn't include Short Quest, so Met stays pool-less.

export const PROGRESS_VARS: ProgressVarDef[] = [
  {
    id: 'wander',
    name: 'Wander',
    description: 'Wander the village edges. Pots in the brush, paths into the wood.',
    zoneId: 'beginnersville',
    expMult: 1,
    scales: [
      { regularVarId: 'pots', perLevel: 5 },
      { regularVarId: 'locks', perLevel: 1 },
    ],
  },
  {
    id: 'met',
    name: 'Met',
    description: 'Sit with neighbours. Names settle, errands surface.',
    zoneId: 'beginnersville',
    expMult: 1,
    scales: [],
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Read the deer-paths. Each loop shows you another stride of forest.',
    zoneId: 'forest-path',
    expMult: 1,
    scales: [
      { regularVarId: 'wild-mana', perLevel: 5 },
      { regularVarId: 'herbs', perLevel: 5 },
    ],
  },
  {
    id: 'shortcut',
    name: 'Shortcut',
    description: 'Sense the leylines. Where the threads cross, the forest yields.',
    zoneId: 'forest-path',
    expMult: 1,
    scales: [{ regularVarId: 'herbs', perLevel: 2 }],
  },
];
