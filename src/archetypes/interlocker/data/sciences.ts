// 6 science defs, verbatim costs + prereq cascade from
// `open-loop-research/reference-code/kittensgame/js/science.js:14-260`.
//
// Cascade (each arrow = `prerequisite`):
//   calendar (30) → agriculture (100) → mining (500) → metal (900)
//                                                    → construction (1300)
//                                                                  → architecture (42000)
//
// ARC-1 DEPARTURE: `architecture` canonically also requires `compedium: 10`
// (science.js:253-254). Compedium is a tier-3 craft requiring `manuscript`,
// `parchment`, `science 10000` per workshop.js:2146-2154 — manuscript +
// parchment depend on `culture`, `furs` which are out-of-arc-1 scope. Arc-1
// drops the compedium requirement and gates architecture on science cost
// alone. Phase 5 balance may revise.
//
// Prerequisite shape simplification: Kittens canon uses an `unlocks.tech` graph
// where one science can unlock multiple downstream sciences (mining unlocks
// metal AND construction). Arc-1's linear `prerequisite` field captures the
// DAG's primary spine; visibility-cascade logic in modules/sciences.ts handles
// the branching by checking the predecessor explicitly.

import type { ScienceSpec } from './types';

export const SCIENCES: ScienceSpec[] = [
  // science.js:13-24 — calendar. Free starter science.
  { id: 'calendar', name: 'Calendar', baseCost: 30, prerequisite: null },
  // science.js:25-37 — agriculture. Unlocks barn, farmer.
  { id: 'agriculture', name: 'Agriculture', baseCost: 100, prerequisite: 'calendar' },
  // science.js:50-61 — mining. Unlocks mine, workshop, metal.
  { id: 'mining', name: 'Mining', baseCost: 500, prerequisite: 'agriculture' },
  // science.js:62-72 — metal. Unlocks smelter.
  { id: 'metal', name: 'Metallurgy', baseCost: 900, prerequisite: 'mining' },
  // science.js:115-129 — construction. Unlocks warehouse, lumberMill.
  { id: 'construction', name: 'Construction', baseCost: 1300, prerequisite: 'mining' },
  // science.js:247-260 — architecture. Arc-1 closure; canonical 42000 sci
  // (compedium requirement dropped — see top-of-file note).
  { id: 'architecture', name: 'Architecture', baseCost: 42000, prerequisite: 'construction' },
];
