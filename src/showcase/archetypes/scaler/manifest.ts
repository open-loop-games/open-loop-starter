import type { ArchetypeManifest } from '@/types';

/**
 * Beat windows are RECORDED by `balance/beats.ts`, never authored as targets: each window
 * is the range of a beat's fire time over the runs that file spans. `pnpm beats` checks
 * them against today's game, and `pnpm beats --write` re-records them.
 */
export const manifest: ArchetypeManifest = {
  id: 'scaler',
  displayName: 'Scaler — Paragon',
  primitives: [
    { name: 'createResource', sourceLayer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    {
      name: 'createProducerCategory',
      sourceLayer: 'systems',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    {
      name: 'createPurchasableCategory',
      sourceLayer: 'systems',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    {
      name: 'createChallengeCategory',
      sourceLayer: 'systems',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    {
      name: 'createAchievementCategory',
      sourceLayer: 'systems',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    { name: 'createReset', sourceLayer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    {
      name: 'createModifierChain',
      sourceLayer: 'core',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    {
      name: 'createAutomationTiers',
      sourceLayer: 'systems',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    {
      name: 'selectionHybridPayback',
      sourceLayer: 'core',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    { name: 'Formula', sourceLayer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'integerRoot', sourceLayer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    {
      name: 'replacementGrants',
      sourceLayer: 'core',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
  ],
  beats: [
    { n: 1, label: 'First Night Patrol', recordedFireTimeRange: [0.5, 0.5] },
    { n: 2, label: 'First Reboot of the Timeline', recordedFireTimeRange: [227.5, 227.5] },
    { n: 3, label: 'Elseworld Protocols bought', recordedFireTimeRange: [484.5, 484.5] },
    { n: 4, label: 'First Elseworld tier resolved', recordedFireTimeRange: [1031.5, 1031.5] },
    { n: 5, label: 'First Rewrite of the Multiverse', recordedFireTimeRange: [1531.5, 1531.5] },
    {
      n: 6,
      label: 'The Silver Age: first Turn of the Age',
      recordedFireTimeRange: [6030.5, 6030.5],
    },
    { n: 7, label: 'The Bronze Age', recordedFireTimeRange: [9036, 9036] },
    { n: 8, label: 'The Dark Age', recordedFireTimeRange: [11527.5, 11527.5] },
    { n: 9, label: 'The Modern Age: the end beat', recordedFireTimeRange: [14144, 14144] },
  ],

  shell: 'ColumnShell · topBar + left',
  formFactor: 'responsive',
  exemplars: [
    {
      title: 'Antimatter Dimensions',
      analysisPath: 'open-loop-research/analyses/complete/antimatter-dimensions-analysis.md',
    },
    {
      title: 'The Prestige Tree',
      analysisPath: 'open-loop-research/analyses/complete/prestige-tree-analysis.md',
    },
    {
      title: 'Synergism',
      analysisPath: 'open-loop-research/analyses/complete/synergism-analysis.md',
    },
  ],
};
