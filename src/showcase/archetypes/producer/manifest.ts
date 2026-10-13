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
    { n: 2, label: 'Sales desk hired', recordedFireTimeRange: [245, 245] },
    { n: 3, label: 'Acquisitions desk hired', recordedFireTimeRange: [431, 431] },
    { n: 4, label: 'Board of Directors hired', recordedFireTimeRange: [477, 891] },
    { n: 5, label: 'The top tier: first savings bank', recordedFireTimeRange: [495, 904] },
    { n: 6, label: 'The Consolidated Building offered', recordedFireTimeRange: [12542, 13463] },
    { n: 7, label: 'The Consolidated Building bought', recordedFireTimeRange: [13516, 14578] },
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
