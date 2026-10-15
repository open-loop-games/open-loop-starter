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
    { n: 2, label: 'Targeting Array schematic recovered', recordedFireTimeRange: [87, 92] },
    { n: 3, label: 'Midship spars plated', recordedFireTimeRange: [101, 106] },
    { n: 4, label: 'Bow plating', recordedFireTimeRange: [132, 136] },
    { n: 5, label: 'Fire-Control Uplink refit', recordedFireTimeRange: [193, 198] },
    { n: 6, label: 'Flank bulkheads plated', recordedFireTimeRange: [265, 270] },
    { n: 7, label: 'Arc Beacon schematic recovered', recordedFireTimeRange: [269, 274] },
    { n: 8, label: 'Railgun schematic recovered', recordedFireTimeRange: [361, 366] },
    { n: 9, label: 'Aft nacelles plated', recordedFireTimeRange: [423, 428] },
    { n: 10, label: 'Coolant Manifold schematic recovered', recordedFireTimeRange: [513, 520] },
    { n: 11, label: 'Overcharged Feeds refit', recordedFireTimeRange: [586, 592] },
    { n: 12, label: 'Wing hardpoints plated', recordedFireTimeRange: [647, 654] },
    { n: 13, label: 'The hull fully fitted', recordedFireTimeRange: [735, 742] },
  ],
  shell: 'ThreePanelShell',
  formFactor: 'desktop',
};
