// 10 resource defs, verbatim from `open-loop-research/reference-code/kittensgame/js/resources.js`.
// Stockpile resources (catnip / wood / minerals / iron) and refined craftables
// (beam / slab / plate / megalith) are storage-capped — buildings push grants
// onto per-resource max-chains. Science and kittens are uncapped (Kittens canon:
// `calculatePerTick: true` resources have no intrinsic cap; kittens canon is
// soft-capped via huts at the module level, not a bag cap).
//
// Base stockpile caps are canon's intrinsic maxes (buildings.js:2245
// `effectsBase`): catnip 5000, wood 200, minerals 250, iron 50 — present from
// the start, before any building. Barns/warehouses push ADDITIONAL cap onto the
// per-resource max-chains (a barn grants +5000 catnip etc., buildings.js:756-767),
// stacking on top of the base. The bag reads `() => chain.apply(base)`.
//
// Refined goods (beam/slab/plate/scaffold/megalith) have no intrinsic max, so
// per canon `resources.js` `addRes` (`maxValue || MAX_VALUE`) they are UNCAPPED
// until a warehouse grant lands. The resources module applies that zero→uncapped
// rule for non-`hardCap` resources.
//
// Starting stockpiles are zero — the opening loop bootstraps through canon's
// manual actions: gather catnip (+1) and refine catnip→wood (100 catnip → 1).

import type { ResourceSpec } from './types';

export const RESOURCES: ResourceSpec[] = [
  // resources.js:23 — food stockpile. effectsBase catnipMax 5000.
  { id: 'catnip', name: 'Catnip', baseCapacity: 5000, craftable: false },
  // resources.js:30 — lumber stockpile. effectsBase woodMax 200.
  { id: 'wood', name: 'Wood', baseCapacity: 200, craftable: false },
  // resources.js:38 — miner output. effectsBase mineralsMax 250.
  { id: 'minerals', name: 'Minerals', baseCapacity: 250, craftable: false },
  // resources.js:52 — smelter output. effectsBase ironMax 50.
  { id: 'iron', name: 'Iron', baseCapacity: 50, craftable: false },
  // resources.js (scholar / library output). Canon caps science at 250 base
  // (effectsBase scienceMax 250); arc-1 leaves it uncapped — a documented
  // simplification (library science-cap grants are out of the arc-1 surface).
  { id: 'science', name: 'Science', baseCapacity: null, craftable: false },
  // village.js:3,5 — `kittens: 0`, `maxKittens: 0`. Population, not a stockpile:
  // hard-capped at base 0 with huts granting `+2` onto the `kittens-max` chain
  // (canon hut `maxKittens: 2`, buildings.js:469). `hardCap` keeps a zero chain
  // meaning zero housing (no canon `|| MAX_VALUE` uncap). The village growth
  // loop reads the bag's kitten room, bounding population at the housing total.
  { id: 'kittens', name: 'Kittens', baseCapacity: 0, craftable: false, hardCap: true },
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
