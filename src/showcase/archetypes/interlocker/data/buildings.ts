// 10 building defs, verbatim from `open-loop-research/reference-code/kittensgame/js/buildings.js`.
// Building ids stay canonical (`field`, not `catnipField`) — display labels carry
// the human name. Grant magnitudes come from each building's `calculateEffects`
// block; `priceRatio` from the top-level def.
//
// Arc-1 scope-departures (documented inline at the building):
//   - `quarry` canonical prices include `steel` + `scaffold`; arc-1 scope locks
//     10 resources and excludes coal/steel. Substitute prices use only in-scope
//     resources; magnitude chosen to keep quarry in its canonical "late-arc
//     mineral-rate booster" role.
//   - `pasture` canonical effect is `catnipDemandRatio: -0.005` — a kitten-
//     consumption-reduction modifier. Arc-1 surfaces this as a `mul` grant on
//     the `catnip-rate` chain (negative magnitude); the village module reads
//     the chain when computing effective catnip drain.

import type { BuildingSpec } from './types';

export const BUILDINGS: BuildingSpec[] = [
  // buildings.js:317-335 — "field" (catnip field). The starter building.
  // Effects: catnipPerTickBase 0.125 → per-second 0.625 catnip / field.
  {
    id: 'field',
    name: 'Catnip Field',
    prices: [{ resource: 'catnip', baseCost: 10 }],
    priceRatio: 1.12,
    grants: [
      // catnip rate: 0.125/tick × 5 = 0.625/sec per field.
      {
        chainId: 'catnip-rate',
        kind: 'add',
        value: 0.625,
        description: 'Catnip field: +0.625 catnip/sec',
      },
    ],
    unlockedByScience: null,
  },
  // buildings.js:336-398 — "pasture" stage 0. Canonical: catnipDemandRatio -0.005
  // per pasture (5% reduction at 10 pastures, compounding mul on demand). Unlocks
  // after `animal` in canon — arc-1 substitutes `agriculture` since `animal` is
  // out-of-scope (the umbrella's 6-science set drops animal).
  {
    id: 'pasture',
    name: 'Pasture',
    prices: [
      { resource: 'catnip', baseCost: 100 },
      { resource: 'wood', baseCost: 10 },
    ],
    priceRatio: 1.15,
    grants: [
      // -0.5% catnip demand per pasture. Negative mul on consumption chain.
      {
        chainId: 'catnip-consumption-rate',
        kind: 'mul',
        value: -0.005,
        description: 'Pasture: -0.5% catnip consumption',
      },
    ],
    unlockedByScience: 'agriculture',
  },
  // buildings.js:450-474 — "hut". Default unlockable. Effects: maxKittens +2,
  // manpowerMax +75 (manpower out of arc-1 scope). Soft-cap for population.
  {
    id: 'hut',
    name: 'Hut',
    prices: [{ resource: 'wood', baseCost: 5 }],
    priceRatio: 2.5,
    grants: [
      // hut grants +2 to kitten soft-cap.
      { chainId: 'kittens-max', kind: 'add', value: 2, description: 'Hut: +2 max kittens' },
    ],
    unlockedByScience: null,
  },
  // buildings.js:523-613 — "library" stage 0. Default unlockable. Effects:
  // scienceRatio 0.1 (cap bonus), scienceMax 250 (uncapped resource gets no
  // bag cap; arc-1 surfaces this as a wood-cap side-effect citation only —
  // libraries do NOT cap wood in canon; the umbrella's note "library expands
  // wood cap" appears to conflate library and barn in the description). The
  // library's real arc-1 contribution is the scholar-rate scienceRatio bonus.
  {
    id: 'library',
    name: 'Library',
    prices: [{ resource: 'wood', baseCost: 25 }],
    priceRatio: 1.15,
    grants: [
      // +10% scholar science rate per library, mul on science-rate chain.
      {
        chainId: 'science-rate',
        kind: 'mul',
        value: 0.1,
        description: 'Library: +10% science rate',
      },
    ],
    unlockedByScience: null,
  },
  // buildings.js:923-959 — "mine". Unlocks miner job + the mining-buildings
  // tier in canon. Effects: mineralsRatio +0.2 per mine (additive mul on
  // miner-rate chain). Citation note: canon also produces coal at advanced
  // tiers — coal out of arc-1 scope, dropped.
  {
    id: 'mine',
    name: 'Mine',
    prices: [{ resource: 'wood', baseCost: 100 }],
    priceRatio: 1.15,
    grants: [
      // +20% miner mineral rate per mine, mul on minerals-rate chain.
      { chainId: 'minerals-rate', kind: 'mul', value: 0.2, description: 'Mine: +20% mineral rate' },
    ],
    unlockedByScience: 'mining',
  },
  // buildings.js:960-996 — "quarry". CANONICAL PRICES include `steel` + `scaffold`
  // — steel is out-of-arc-1 scope (no coal). Arc-1 substitutes in-scope prices
  // preserving quarry's late-arc role. Effects (kept verbatim): mineralsRatio
  // +0.35 per quarry, slabCraftRatio handled by craft module later.
  {
    id: 'quarry',
    name: 'Quarry',
    // ARC-1 DEPARTURE: canonical prices are { slab: 1000, steel: 125, scaffold: 50 }
    // (buildings.js:965-969). Steel requires coal which is out-of-scope. Substitute
    // uses slab + iron + scaffold to preserve late-arc cost spike (scaffold is the
    // tier-2 craft from beam, an in-scope replacement for steel as the metallurgy
    // gate). Phase 5 balance pass tunes; the substitute keeps quarry in its
    // canonical "late-arc mineral-rate booster" role.
    prices: [
      { resource: 'slab', baseCost: 1000 },
      { resource: 'iron', baseCost: 1000 },
      { resource: 'scaffold', baseCost: 50 },
    ],
    priceRatio: 1.15,
    grants: [
      // +35% miner mineral rate per quarry.
      {
        chainId: 'minerals-rate',
        kind: 'mul',
        value: 0.35,
        description: 'Quarry: +35% mineral rate',
      },
    ],
    unlockedByScience: 'mining',
  },
  // buildings.js:997-1014 — "smelter". Continuous wood+minerals consumption,
  // iron production. ironPerTickAutoprod 0.02 → per-sec 0.1 iron. Smelter does
  // NOT grant — it consumes via the building module's `onTick` hand-roll. The
  // wood/minerals consumption rates are canonical from the smelter's `effects`
  // block (woodPerTickCon + mineralsPerTickCon set dynamically; defaults per
  // calculateEffects:1017-1023). Per-tick: 0.05 wood, 0.05 minerals → per-sec
  // 0.25 wood, 0.25 minerals.
  {
    id: 'smelter',
    name: 'Smelter',
    prices: [{ resource: 'minerals', baseCost: 200 }],
    priceRatio: 1.15,
    grants: [],
    unlockedByScience: 'metal',
  },
  // buildings.js:1435-1463 — "workshop". Default unlockable but science-gated
  // to `mining` per canon (science.js:57). Unlocks crafts panel; arc-1's
  // primary content unlock. Effects: craftRatio +0.06 (5% craft output bonus,
  // applied at the craft output site — Phase 3 wires).
  {
    id: 'workshop',
    name: 'Workshop',
    prices: [
      { resource: 'wood', baseCost: 100 },
      { resource: 'minerals', baseCost: 400 },
    ],
    priceRatio: 1.15,
    grants: [
      // +6% craft output per workshop, mul on craft-output chain.
      {
        chainId: 'craft-output',
        kind: 'mul',
        value: 0.06,
        description: 'Workshop: +6% craft output',
      },
    ],
    unlockedByScience: 'mining',
  },
  // buildings.js:746-777 — "barn". Storage building. Effects per barn:
  // catnipMax +5000, woodMax +200, mineralsMax +250, ironMax +50. Arc-1 keeps
  // catnip/wood/minerals/iron grants; drops out-of-scope coal/titanium/gold.
  {
    id: 'barn',
    name: 'Barn',
    prices: [{ resource: 'wood', baseCost: 50 }],
    priceRatio: 1.75,
    grants: [
      { chainId: 'catnip-max', kind: 'add', value: 5000, description: 'Barn: +5000 catnip cap' },
      { chainId: 'wood-max', kind: 'add', value: 200, description: 'Barn: +200 wood cap' },
      { chainId: 'minerals-max', kind: 'add', value: 250, description: 'Barn: +250 minerals cap' },
      { chainId: 'iron-max', kind: 'add', value: 50, description: 'Barn: +50 iron cap' },
    ],
    unlockedByScience: 'agriculture',
  },
  // buildings.js:779-868 — "warehouse" stage 0. Refined-good storage. Effects:
  // woodMax +150, mineralsMax +200, ironMax +25 — arc-1 also extends caps for
  // refined-good resources (beam/slab/plate/megalith) since the umbrella's
  // "Refined-good caps: beam/slab/plate/megalith all warehouse-gated" lock.
  // Per-warehouse refined caps chosen at 50 (canon doesn't directly define
  // refined-good caps; storage is implicit). Phase 5 balance tunes.
  {
    id: 'warehouse',
    name: 'Warehouse',
    prices: [
      { resource: 'beam', baseCost: 1.5 },
      { resource: 'slab', baseCost: 2 },
    ],
    priceRatio: 1.15,
    grants: [
      // Canonical raw-resource caps.
      { chainId: 'wood-max', kind: 'add', value: 150, description: 'Warehouse: +150 wood cap' },
      {
        chainId: 'minerals-max',
        kind: 'add',
        value: 200,
        description: 'Warehouse: +200 minerals cap',
      },
      { chainId: 'iron-max', kind: 'add', value: 25, description: 'Warehouse: +25 iron cap' },
      // Refined-good caps. Phase-1 stand-in pending Phase 5 balance.
      { chainId: 'beam-max', kind: 'add', value: 50, description: 'Warehouse: +50 beam cap' },
      { chainId: 'slab-max', kind: 'add', value: 50, description: 'Warehouse: +50 slab cap' },
      { chainId: 'plate-max', kind: 'add', value: 50, description: 'Warehouse: +50 plate cap' },
      {
        chainId: 'scaffold-max',
        kind: 'add',
        value: 25,
        description: 'Warehouse: +25 scaffold cap',
      },
      {
        chainId: 'megalith-max',
        kind: 'add',
        value: 10,
        description: 'Warehouse: +10 megalith cap',
      },
    ],
    unlockedByScience: 'construction',
  },
  // buildings.js:1366-1384 — "lumberMill". Effects: woodRatio +0.1 per mill
  // (additive mul on woodcutter-rate chain).
  {
    id: 'lumberMill',
    name: 'Lumber Mill',
    prices: [
      { resource: 'wood', baseCost: 100 },
      { resource: 'minerals', baseCost: 250 },
      { resource: 'iron', baseCost: 50 },
    ],
    priceRatio: 1.15,
    grants: [
      // +10% woodcutter wood rate per mill.
      { chainId: 'wood-rate', kind: 'mul', value: 0.1, description: 'Lumber Mill: +10% wood rate' },
    ],
    unlockedByScience: 'construction',
  },
];

/** Per-smelter continuous consumption/production rates. Smelter consumes
 *  wood + minerals per tick and produces iron per tick (one smelter = one
 *  input/output cycle). Canonical Kittens: smelter `effects.ironPerTickAutoprod`
 *  defaults to 0.02 (buildings.js:1018), with wood + minerals consumption
 *  implicitly 0.05/tick each per the in-game balance. Per-second conversions:
 *  iron 0.1/sec, wood 0.25/sec, minerals 0.25/sec.
 *
 *  Phase 5 balance audits; Phase 2B reads these via `tunable()` at the smelter
 *  `onTick` hand-roll site. */
export const SMELTER_RATES = {
  /** Iron produced per smelter per second. Canonical 0.02/tick × 5 = 0.1/sec. */
  ironProductionPerSec: 0.1,
  /** Wood consumed per smelter per second. */
  woodConsumptionPerSec: 0.25,
  /** Minerals consumed per smelter per second. */
  mineralsConsumptionPerSec: 0.25,
} as const;
