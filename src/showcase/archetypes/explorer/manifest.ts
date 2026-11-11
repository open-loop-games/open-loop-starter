import type { ArchetypeManifest } from '@/types';

const API = 'open-loop-engine/docs/api/INDEX.md';

/**
 * Beat windows are RECORDED by `balance/beats.ts`, never authored as targets: each window
 * is the range of a beat's fire time over the runs that file spans. `pnpm beats` checks
 * them against today's game, and `pnpm beats --write` re-records them.
 */
export const manifest: ArchetypeManifest = {
  id: 'explorer',
  displayName: 'Explorer — Spoor',
  primitives: [
    { name: 'createSpatialGrid', sourceLayer: 'core', path: API },
    { name: 'createZoneSystem', sourceLayer: 'systems', path: API },
    { name: 'createProducerCategory', sourceLayer: 'systems', path: API },
    { name: 'createScalingPurchasable', sourceLayer: 'systems', path: API },
    { name: 'createPurchasableCategory', sourceLayer: 'systems', path: API },
    { name: 'createAchievementCategory', sourceLayer: 'systems', path: API },
    { name: 'createSkill', sourceLayer: 'systems', path: API },
    { name: 'createTimedProgress', sourceLayer: 'core', path: API },
    { name: 'createResourceBag', sourceLayer: 'core', path: API },
    { name: 'createModifierChain', sourceLayer: 'core', path: API },
    { name: 'createResource', sourceLayer: 'core', path: API },
    { name: 'createTuningRegistry', sourceLayer: 'core', path: API },
  ],
  beats: [
    { n: 1, label: 'First lodge purchase', recordedFireTimeRange: [107, 109] },
    { n: 2, label: 'The forest kit: first camp raised', recordedFireTimeRange: [347, 443] },
    { n: 3, label: 'Into the Fen', recordedFireTimeRange: [692, 784] },
    { n: 4, label: 'The Old Tusker: the mattock', recordedFireTimeRange: [875, 916] },
    { n: 5, label: 'The Mere Wolf: the coracle', recordedFireTimeRange: [970, 999] },
    { n: 6, label: 'Onto the Snowfield', recordedFireTimeRange: [1074, 1177] },
    { n: 7, label: 'The White Bear: the sledge', recordedFireTimeRange: [1371, 1438] },
    { n: 8, label: 'Under the Deepwood', recordedFireTimeRange: [1451, 1545] },
    { n: 9, label: 'The Pale Hart', recordedFireTimeRange: [1833, 1986] },
  ],
  shell: 'ColumnShell · left + right',
  formFactor: 'desktop',
};
