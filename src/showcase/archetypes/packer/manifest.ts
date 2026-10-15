import type { ArchetypeManifest } from '@/types';

const API = 'open-loop-engine/docs/api/INDEX.md';

/**
 * Beat windows are RECORDED from `balance/arc-probe.ts`, never authored as
 * targets. A window is sim-seconds of play from a cold start, the range over
 * the probe at tick sizes 0.25 s to 2 s.
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
    { name: 'createTuningRegistry', sourceLayer: 'core', path: API },
  ],
  beats: [
    { n: 1, label: 'The corvette core fully fitted', recordedFireTimeRange: [41, 46] },
    { n: 2, label: 'Targeting Array schematic recovered', recordedFireTimeRange: [83, 88] },
    { n: 3, label: 'Midship spars plated', recordedFireTimeRange: [132, 136] },
    { n: 4, label: 'Bow plating', recordedFireTimeRange: [179, 184] },
    { n: 5, label: 'Fire-Control Uplink refit', recordedFireTimeRange: [237, 242] },
    { n: 6, label: 'Arc Beacon schematic recovered', recordedFireTimeRange: [302, 306] },
    { n: 7, label: 'Flank bulkheads plated', recordedFireTimeRange: [373, 378] },
    { n: 8, label: 'Railgun schematic recovered', recordedFireTimeRange: [460, 466] },
    { n: 9, label: 'Aft nacelles plated', recordedFireTimeRange: [534, 542] },
    { n: 10, label: 'Coolant Manifold schematic recovered', recordedFireTimeRange: [664, 672] },
    { n: 11, label: 'Overcharged Feeds refit', recordedFireTimeRange: [763, 770] },
    { n: 12, label: 'Wing hardpoints plated', recordedFireTimeRange: [888, 896] },
    { n: 13, label: 'The hull fully fitted', recordedFireTimeRange: [1036, 1044] },
  ],
  shell: 'ThreePanelShell',
  formFactor: 'desktop',
};
