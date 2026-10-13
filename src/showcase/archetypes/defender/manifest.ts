import type { ArchetypeManifest } from '@/types';

const API = 'open-loop-engine/docs/api/INDEX.md';

/**
 * Beat windows are RECORDED from `balance/arc-probe.ts`, never authored as
 * targets. A window is sim-seconds of play from a cold start; the reference
 * gardener is deterministic, so each window is one point.
 */
export const manifest: ArchetypeManifest = {
  id: 'defender',
  displayName: 'Defender — The Walled Garden',
  primitives: [
    { name: 'createSpatialGrid', sourceLayer: 'core', path: API },
    { name: 'createZoneSystem', sourceLayer: 'systems', path: API },
    { name: 'createBestOf', sourceLayer: 'systems', path: API },
    { name: 'createPurchasableCategory', sourceLayer: 'systems', path: API },
    { name: 'createCostRequirement', sourceLayer: 'systems', path: API },
    { name: 'createReset', sourceLayer: 'systems', path: API },
    { name: 'createModifierChain', sourceLayer: 'core', path: API },
    { name: 'createResource', sourceLayer: 'core', path: API },
    { name: 'createTuningRegistry', sourceLayer: 'core', path: API },
  ],
  beats: [
    { n: 1, label: 'The Herb Border held', recordedFireTimeRange: [113, 113] },
    { n: 2, label: 'The Bean Rows held', recordedFireTimeRange: [430, 430] },
    { n: 3, label: 'The Old Orchard held', recordedFireTimeRange: [693, 693] },
  ],
  shell: 'SingleColumnShell',
  formFactor: 'desktop',
};
