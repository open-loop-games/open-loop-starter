import type { ArchetypeManifest } from '@/types';

const API = 'open-loop-engine/docs/api/INDEX.md';

/**
 * Beat windows are RECORDED from `balance/arc-probe.ts`, never authored as
 * targets. A window is sim-seconds of play from a cold start, the range over
 * the probe at tick sizes 0.5 s to 2 s.
 */
export const manifest: ArchetypeManifest = {
  id: 'packer',
  displayName: 'Packer — Hardpoint',
  primitives: [
    { name: 'createSpatialGrid', sourceLayer: 'core', path: API },
    { name: 'createPurchasableCategory', sourceLayer: 'systems', path: API },
    { name: 'createProducerCategory', sourceLayer: 'systems', path: API },
    { name: 'createGateRequirement', sourceLayer: 'systems', path: API },
    { name: 'createCostRequirement', sourceLayer: 'core', path: API },
    { name: 'createModifierChain', sourceLayer: 'core', path: API },
    { name: 'createResource', sourceLayer: 'core', path: API },
    { name: 'createCycle', sourceLayer: 'systems', path: API },
    { name: 'createBooleanRequirement', sourceLayer: 'core', path: API },
    { name: 'createTuningRegistry', sourceLayer: 'core', path: API },
  ],
  beats: [
    { n: 1, label: 'Railgun schematic recovered', recordedFireTimeRange: [457, 462] },
    { n: 2, label: 'The frigate fully plated', recordedFireTimeRange: [1058, 1062] },
    {
      n: 3,
      label: 'The cruiser keel plated: the breach line opens',
      recordedFireTimeRange: [1199, 1207],
    },
    { n: 4, label: 'Fire Director schematic recovered', recordedFireTimeRange: [1388, 1399] },
    { n: 5, label: 'The Brood Carrier destroyed', recordedFireTimeRange: [1573, 1583] },
    { n: 6, label: 'The Lamprey Tender destroyed', recordedFireTimeRange: [2279, 2324] },
    { n: 7, label: 'Longreach commissioned', recordedFireTimeRange: [2279, 2324] },
    { n: 8, label: 'Spinal Lance schematic recovered', recordedFireTimeRange: [2473, 2517] },
    { n: 9, label: 'The Siege Hive destroyed', recordedFireTimeRange: [2903, 2951] },
    { n: 10, label: 'The Maw destroyed', recordedFireTimeRange: [3239, 3287] },
    { n: 11, label: 'Salvage Tractor schematic recovered', recordedFireTimeRange: [3618, 3666] },
    { n: 12, label: 'The Shrike Nest destroyed', recordedFireTimeRange: [4081, 4129] },
    { n: 13, label: 'The Swarm Warden destroyed', recordedFireTimeRange: [5228, 5276] },
    { n: 14, label: 'Sovereign commissioned', recordedFireTimeRange: [5228, 5276] },
    { n: 15, label: 'The Hive Mother destroyed', recordedFireTimeRange: [5919, 5958] },
    { n: 16, label: 'The Null Ark destroyed', recordedFireTimeRange: [6656, 6712] },
    { n: 17, label: 'The Breach Mother destroyed', recordedFireTimeRange: [7427, 7510] },
    { n: 18, label: 'The Dreadnought destroyed', recordedFireTimeRange: [8984, 9074] },
  ],
  shell: 'ThreePanelShell',
  formFactor: 'desktop',
};
