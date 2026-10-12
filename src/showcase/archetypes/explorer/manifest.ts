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
    { n: 1, label: 'First lodge purchase', recordedFireTimeRange: [25, 25] },
    { n: 2, label: 'Into the Fen', recordedFireTimeRange: [976, 1164] },
    { n: 3, label: 'Onto the Snowfield', recordedFireTimeRange: [1614, 1846] },
    { n: 4, label: 'Under the Deepwood', recordedFireTimeRange: [2122, 2266] },
    { n: 5, label: 'The Pale Hart', recordedFireTimeRange: [2637, 2794] },
  ],
  shell: 'ThreePanelShell',
  formFactor: 'desktop',
};
