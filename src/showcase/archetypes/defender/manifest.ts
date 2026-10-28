import type { ArchetypeManifest } from '@/types';

const API = 'open-loop-engine/docs/api/INDEX.md';

/**
 * Beat windows are RECORDED by `balance/beats.ts`, never authored as targets: each window
 * is the range of a beat's fire time over the runs that file spans. `pnpm beats` checks
 * them against today's game, and `pnpm beats --write` re-records them.
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
    { n: 2, label: 'The Bean Rows held', recordedFireTimeRange: [430.5, 430.5] },
    { n: 3, label: 'The Old Orchard held', recordedFireTimeRange: [693, 693] },
  ],
  shell: 'ColumnShell · topBar in a plot',
  formFactor: 'desktop',
};
