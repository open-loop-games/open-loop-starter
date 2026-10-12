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
    { n: 1, label: 'First lodge purchase', recordedFireTimeRange: [110, 116] },
    { n: 2, label: 'The forest kit: first camp raised', recordedFireTimeRange: [282, 365] },
    { n: 3, label: 'Into the Fen', recordedFireTimeRange: [563, 578] },
    { n: 4, label: 'Onto the Snowfield', recordedFireTimeRange: [1030, 1061] },
    { n: 5, label: 'Under the Deepwood', recordedFireTimeRange: [1396, 1428] },
    { n: 6, label: 'The Pale Hart', recordedFireTimeRange: [1781, 1842] },
  ],
  shell: 'ThreePanelShell',
  formFactor: 'desktop',
};
