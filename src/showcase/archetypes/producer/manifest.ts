import type { ArchetypeManifest } from '@/types';

/**
 * Beat windows are RECORDED from `balance/arc-probe.ts` under the reference
 * player on seeds 1, 2 and 3 (tips are drawn): the min/max across the three, never
 * authored as targets. Re-record them after any spine change.
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
    { n: 3, label: 'Acquisitions desk hired', recordedFireTimeRange: [266, 266] },
    { n: 4, label: 'Board of Directors hired', recordedFireTimeRange: [537, 565] },
    { n: 5, label: 'The top tier: first savings bank', recordedFireTimeRange: [730, 767] },
    { n: 6, label: 'The Consolidated Building offered', recordedFireTimeRange: [12912, 12996] },
    { n: 7, label: 'The Consolidated Building bought', recordedFireTimeRange: [13685, 13799] },
  ],

  shell: 'ThreePanelShell',
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
