import type { ArchetypeManifest } from '@/types';

/**
 * Beat windows are RECORDED by `balance/beats.ts`, never authored as targets: each window
 * is the range of a beat's fire time over the runs that file spans. `pnpm beats` checks
 * them against today's game, and `pnpm beats --write` re-records them.
 */
export const manifest: ArchetypeManifest = {
  id: 'producer',
  displayName: 'Producer — Consolidated Holdings',
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
      name: 'createAchievementCategory',
      sourceLayer: 'systems',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
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
      name: 'setupPolicyAutoPurchase',
      sourceLayer: 'systems',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    {
      name: 'setupSweepAutoPurchase',
      sourceLayer: 'systems',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    {
      name: 'selectionPaybackPeriod',
      sourceLayer: 'core',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    { name: 'processOfflineTime', sourceLayer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    {
      name: 'classifyFlowChannel',
      sourceLayer: 'harness',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
  ],
  beats: [
    { n: 1, label: 'First pushcart', recordedFireTimeRange: [5, 5] },
    { n: 2, label: 'Sales desk hired', recordedFireTimeRange: [151, 151] },
    { n: 3, label: 'Acquisitions desk hired', recordedFireTimeRange: [266.5, 266.5] },
    { n: 4, label: 'Board of Directors hired', recordedFireTimeRange: [536.5, 565] },
    { n: 5, label: 'The top tier: first savings bank', recordedFireTimeRange: [729.5, 767] },
    { n: 6, label: 'The Consolidated Building offered', recordedFireTimeRange: [12996, 13481.5] },
    { n: 7, label: 'The Consolidated Building bought', recordedFireTimeRange: [13727.5, 14347.5] },
  ],

  shell: 'ColumnShell · left + right',
  formFactor: 'responsive',
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
      title: 'Antimatter Dimensions',
      analysisPath: 'open-loop-research/analyses/complete/antimatter-dimensions-analysis.md',
    },
    {
      title: 'Universal Paperclips',
      analysisPath: 'open-loop-research/analyses/complete/universal-paperclips-analysis.md',
    },
  ],
};
