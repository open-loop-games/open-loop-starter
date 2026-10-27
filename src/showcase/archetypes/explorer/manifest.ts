import type { ArchetypeManifest } from '@/types';

const API = 'open-loop-engine/docs/api/INDEX.md';

/**
 * Beat windows are RECORDED from `balance/arc-probe.ts`, never authored as
 * targets. A window is sim-seconds of play from a cold start, the range over
 * the probe's default seeds.
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
    { n: 3, label: 'Into the Fen', recordedFireTimeRange: [692, 816] },
    { n: 4, label: 'The Old Tusker: the mattock', recordedFireTimeRange: [873, 915] },
    { n: 5, label: 'The Mere Wolf: the coracle', recordedFireTimeRange: [947, 1055] },
    { n: 6, label: 'Onto the Snowfield', recordedFireTimeRange: [1075, 1237] },
    { n: 7, label: 'The White Bear: the sledge', recordedFireTimeRange: [1304, 1403] },
    { n: 8, label: 'Under the Deepwood', recordedFireTimeRange: [1426, 1516] },
    { n: 9, label: 'The Pale Hart', recordedFireTimeRange: [1784, 1987] },
  ],
  shell: 'ColumnShell · left + right',
  formFactor: 'desktop',
};
