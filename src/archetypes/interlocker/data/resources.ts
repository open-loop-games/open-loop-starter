// 10 resource defs, verbatim from `open-loop-research/reference-code/kittensgame/js/resources.js`.
// Stockpile resources (catnip / wood / minerals / iron) and refined craftables
// (beam / slab / plate / megalith) are storage-capped — buildings push grants
// onto per-resource max-chains. Science and kittens are uncapped (Kittens canon:
// `calculatePerTick: true` resources have no intrinsic cap; kittens canon is
// soft-capped via huts at the module level, not a bag cap).
//
// Base capacities at zero for capped resources — building purchases (barn /
// warehouse / hut / library / pasture) push the actual cap values onto the
// per-resource max-chains; the bag reads through `() => chain.apply(0)`.

import type { ResourceSpec } from './types';

export const RESOURCES: ResourceSpec[] = [
  // resources.js:23 — base stockpile, food.
  { id: 'catnip', name: 'Catnip', baseCapacity: 0, craftable: false },
  // resources.js:30 — base stockpile, lumber.
  { id: 'wood', name: 'Wood', baseCapacity: 0, craftable: false },
  // resources.js:38 — base stockpile, miner output.
  { id: 'minerals', name: 'Minerals', baseCapacity: 0, craftable: false },
  // resources.js:52 — base stockpile, smelter output.
  { id: 'iron', name: 'Iron', baseCapacity: 0, craftable: false },
  // resources.js (scholar / library output) — uncapped by Kittens canon.
  { id: 'science', name: 'Science', baseCapacity: null, craftable: false },
  // village.js:3 — `kittens: 0`. Uncapped by bag; hut-soft-capped at the module
  // layer (huts grant `maxKittens`; village.ts gates growth on the soft cap).
  { id: 'kittens', name: 'Kittens', baseCapacity: null, craftable: false },
  // workshop.js:2005 — beam. Refined-good, warehouse-gated.
  { id: 'beam', name: 'Beam', baseCapacity: 0, craftable: true },
  // workshop.js:2013 — slab. Refined-good, warehouse-gated.
  { id: 'slab', name: 'Slab', baseCapacity: 0, craftable: true },
  // workshop.js:2023 — plate. Refined-good, warehouse-gated.
  { id: 'plate', name: 'Plate', baseCapacity: 0, craftable: true },
  // workshop.js:2081 — scaffold. Tier-2 craft (consumes beam). Per umbrella
  // OL-1056 description: scaffold appears in the 6-craft list but was omitted
  // from the resource list — added here so the craft output graph closes and
  // quarry's substitute price has a valid resource handle.
  { id: 'scaffold', name: 'Scaffold', baseCapacity: 0, craftable: true },
  // workshop.js:2175 — megalith. Multi-input centerpiece of arc 1.
  { id: 'megalith', name: 'Megalith', baseCapacity: 0, craftable: true },
];
