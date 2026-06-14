// 6 craft defs, verbatim recipes from
// `open-loop-research/reference-code/kittensgame/js/workshop.js:1994-2185`.
//
// Recipe sources (workshop.js line refs):
//   wood:     1995 — catnip 100 → wood 1
//   beam:     2005 — wood 175 → beam 1
//   slab:     2013 — minerals 250 → slab 1
//   plate:    2023 — iron 125 → plate 1
//   scaffold: 2081 — beam 50 → scaffold 1
//   megalith: 2175 — beam 25 + slab 50 + plate 5 → megalith 1
//
// Canonical Kittens applies a `craftRatio` modifier to output (workshop building
// grants +6%). Arc-1 surfaces this via the `craft-output` rate chain — the
// craft module reads it when fulfilling outputs. The `outputAmount` field
// captures the base; the chain layer applies multipliers.
//
// Visibility cascade:
//   wood / beam / slab / plate — visible once `workshop` is owned (workshop
//     building unlocks via mining science). Arc-1 keys these as
//     `unlockedByScience: 'mining'` for uniformity; the building-ownership
//     check rides on top in modules/workshop.ts.
//   scaffold — visible once `construction` is researched (canonical Kittens
//     surfaces scaffold alongside warehouse + lumberMill).
//   megalith — visible once `architecture` is researched. The signature
//     arc-closure craft.

import type { CraftSpec } from './types';

export const CRAFTS: CraftSpec[] = [
  // workshop.js:1995-2003 — wood. Catnip → wood. Tier-1.
  {
    id: 'wood',
    name: 'Wood (craft)',
    inputs: [{ resource: 'catnip', amount: 100 }],
    outputResource: 'wood',
    outputAmount: 1,
    unlockedByScience: 'mining',
  },
  // workshop.js:2005-2012 — beam. Wood → beam. Tier-1.
  {
    id: 'beam',
    name: 'Beam',
    inputs: [{ resource: 'wood', amount: 175 }],
    outputResource: 'beam',
    outputAmount: 1,
    unlockedByScience: 'mining',
  },
  // workshop.js:2013-2021 — slab. Minerals → slab. Tier-1.
  {
    id: 'slab',
    name: 'Slab',
    inputs: [{ resource: 'minerals', amount: 250 }],
    outputResource: 'slab',
    outputAmount: 1,
    unlockedByScience: 'mining',
  },
  // workshop.js:2023-2030 — plate. Iron → plate. Tier-1.
  {
    id: 'plate',
    name: 'Plate',
    inputs: [{ resource: 'iron', amount: 125 }],
    outputResource: 'plate',
    outputAmount: 1,
    unlockedByScience: 'mining',
  },
  // workshop.js:2081-2088 — scaffold. Beam → scaffold. Tier-2.
  {
    id: 'scaffold',
    name: 'Scaffold',
    inputs: [{ resource: 'beam', amount: 50 }],
    outputResource: 'scaffold',
    outputAmount: 1,
    unlockedByScience: 'construction',
  },
  // workshop.js:2175-2184 — megalith. Multi-input: beam + slab + plate.
  // The canonical multi-input recipe; the signature Interlocker craft within
  // arc-1's resource scope.
  {
    id: 'megalith',
    name: 'Megalith',
    inputs: [
      { resource: 'beam', amount: 25 },
      { resource: 'slab', amount: 50 },
      { resource: 'plate', amount: 5 },
    ],
    outputResource: 'megalith',
    outputAmount: 1,
    unlockedByScience: 'architecture',
  },
];
