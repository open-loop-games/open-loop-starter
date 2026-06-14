// ─── Port Citation ───────────────────────────────────────────────────────────
// Canonical: open-loop-research/reference-code/SynergismOfficial/src/Buy.ts
//   Buy.ts:338             mythosAndParticleBuildingCosts: [1, 1e2, 1e4, 1e8, 1e16]
// Canonical: open-loop-research/reference-code/SynergismOfficial/src/Synergism.ts
//   Synergism.ts:309-329   firstProduceMythos..fifthProduceMythos
//                          [1, 0.01, 0.001, 0.0002, 0.00004] per 0.025s tick → ×40 per sec
//   Synergism.ts:3247-3293 mythos cascade math + transcendShards generator
//                          (cascade unconditional, no upgrade-band gate — contrast
//                          with coin tier `upgrades[101..105]`)
//   Synergism.ts:3274-3285 cascade per-tick: produceXMythos × dt/0.025 → (X-1)Generated
//   Synergism.ts:3348-3350 transcendShards += produceMythos × dt/0.025
// Canonical: open-loop-research/reference-code/SynergismOfficial/src/Reset.ts
//   Reset.ts:481-535       transcend reset baseline
//                          (firstOwnedDiamonds..fifthOwnedDiamonds + costs zero;
//                          firstGeneratedMythos..fifthGeneratedMythos zero;
//                          coinsThisTranscension = 100; prestigePoints = 0;
//                          transcendPoints += transcendPointGain; transcendShards = 0)
// ─────────────────────────────────────────────────────────────────────────────

import type { ProducerDef } from './types';

// ─── Skeleton ───
// Five mythos producers (1st..5th owned mythos per canonical naming). Only
// mythos-1 emits to `transcendShards` directly; mythos-2..5 are cascade-only
// (their tick-rate × dt feeds the next-lower-tier's `*GeneratedMythos` ref,
// which loops back as `extraCount` on the lower producer). Transcend module
// wires mythos-2..5 with `trigger: 'manual'` + a sibling `ctx.onTick` cascade
// handler so they don't double-emit transcendShards. Mirrors the diamond
// cascade shape from leaf 2 (`data/prestige.ts` + `modules/prestige.ts`).

// ─── Balance ───
// baseRate values lifted from canonical `Synergism.ts:309-329`
// (firstProduceMythos..fifthProduceMythos), normalized from per-0.025s-tick
// to per-second: ×40. Canonical chains: mythos-1 = 1 → 40/s; mythos-2 = 0.01
// → 0.4/s; mythos-3 = 0.001 → 0.04/s; mythos-4 = 0.0002 → 0.008/s; mythos-5
// = 0.00004 → 0.0016/s. Geometric per-buy scaling (10) mirrors the diamond
// tier's port — the canonical `getCostInternal` super-exponential is
// approximated as scaling=10 at first arc; later-arc balance tuning may
// revise. baseCosts lift verbatim from `Buy.ts:338`.

export const MYTHOS_PRODUCERS: ProducerDef[] = [
  {
    id: 'mythos-1',
    name: 'Mythos 1',
    tier: 'transcend',
    position: 1,
    baseRate: 40,
    baseCost: 1,
    costScaling: 10,
  },
  {
    id: 'mythos-2',
    name: 'Mythos 2',
    tier: 'transcend',
    position: 2,
    baseRate: 0.4,
    baseCost: 1e2,
    costScaling: 10,
  },
  {
    id: 'mythos-3',
    name: 'Mythos 3',
    tier: 'transcend',
    position: 3,
    baseRate: 0.04,
    baseCost: 1e4,
    costScaling: 10,
  },
  {
    id: 'mythos-4',
    name: 'Mythos 4',
    tier: 'transcend',
    position: 4,
    baseRate: 0.008,
    baseCost: 1e8,
    costScaling: 10,
  },
  {
    id: 'mythos-5',
    name: 'Mythos 5',
    tier: 'transcend',
    position: 5,
    baseRate: 0.0016,
    baseCost: 1e16,
    costScaling: 10,
  },
];
