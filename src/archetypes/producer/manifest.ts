import type { ArchetypeManifest } from '@/types';

export const manifest: ArchetypeManifest = {
  id: 'producer',
  name: 'Bakery',
  primitives: [
    { name: 'createResource', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'createModifierChain', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'calculateMaxAffordable', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    {
      name: 'createProducerCategory',
      layer: 'systems',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    {
      name: 'createPurchasableCategory',
      layer: 'systems',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    {
      name: 'createAchievementCategory',
      layer: 'systems',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    {
      name: 'createTieredAchievement',
      layer: 'systems',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    {
      name: 'getCombinedAchievementEffect',
      layer: 'systems',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    { name: 'runHeadless', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'runMatrix', layer: 'harness', path: 'open-loop-engine/docs/api/INDEX.md' },
  ],
  beats: [
    { n: 1, label: 'First click production visible', recordedSimRange: [0, 30] },
    { n: 2, label: 'First producer purchased (T1)', recordedSimRange: [60, 180] },
    { n: 3, label: 'Second-tier producer purchased (T2)', recordedSimRange: [300, 600] },
    { n: 4, label: 'First multiplier upgrade', recordedSimRange: [720, 1200] },
    { n: 5, label: 'First achievement-driven multiplier', recordedSimRange: [1500, 2400] },
    { n: 6, label: 'Bulk-buy becomes meaningful', recordedSimRange: [2400, 3900] },
    { n: 7, label: 'Deep modifier chain visible', recordedSimRange: [3900, 5700] },
  ],
  shell: 'ThreePanelShell',
  formFactor: 'desktop',
  exemplars: [
    {
      title: 'Cookie Clicker',
      analysisPath: 'open-loop-research/analyses/complete/cookie-clicker-analysis.md',
    },
    {
      title: 'AdVenture Capitalist',
      analysisPath: 'open-loop-research/analyses/complete/adventure-capitalist-analysis.md',
    },
    {
      title: 'Derivative Clicker',
      analysisPath: 'open-loop-research/analyses/complete/derivative-clicker-analysis.md',
    },
  ],
};
