import type { ArchetypeManifest } from '@/types';

export const manifest: ArchetypeManifest = {
  id: 'ambient',
  name: 'Cozy Farm',
  status: 'canonical',
  primitives: [
    { name: 'createResource', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'runHeadless', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    {
      name: 'createProducerCategory',
      layer: 'systems',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    { name: 'createLoop', layer: 'systems', path: 'open-loop-engine/docs/api/INDEX.md' },
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
    { name: 'createReset', layer: 'systems', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'runMatrix', layer: 'harness', path: 'open-loop-engine/docs/api/INDEX.md' },
  ],
  beats: [
    { n: 1, label: 'First passive production visible', targetSimRange: [0, 30] },
    { n: 2, label: 'First auto-producer purchased (T1)', targetSimRange: [60, 180] },
    { n: 3, label: 'First visibility unlock revealed', targetSimRange: [1800, 5400] },
    { n: 4, label: 'Glance-check value proposition proven', targetSimRange: [5400, 10800] },
    { n: 5, label: 'Mid-arc scene diversification', targetSimRange: [10800, 18000] },
    { n: 6, label: 'First low-urgency achievement multiplier', targetSimRange: [18000, 28800] },
  ],
  themes: [{ name: 'Cozy Farm', isDefault: true }],
  shell: 'SingleColumnShell',
  formFactor: 'desktop',
  exemplars: [
    {
      title: 'Cookie Clicker',
      analysisPath: 'open-loop-research/analyses/complete/cookie-clicker-analysis.md',
    },
    {
      title: 'Candy Box',
      analysisPath: 'open-loop-research/analyses/complete/candy-box-analysis.md',
    },
    {
      title: 'A Dark Room',
      analysisPath: 'open-loop-research/analyses/complete/a-dark-room-analysis.md',
    },
    {
      title: 'Trimps',
      analysisPath: 'open-loop-research/analyses/complete/trimps-analysis.md',
    },
    {
      title: 'Realm Grinder',
      analysisPath: 'open-loop-research/analyses/complete/realm-grinder-analysis.md',
    },
  ],
};
