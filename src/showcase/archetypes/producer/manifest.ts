import type { ArchetypeManifest } from '@/types';

/**
 * Beat windows are RECORDED from `balance/_engine.ts` `runArc` under the
 * shipping desks, with the hand dealing at 2, 4 and 8 deals a second: the
 * min/max across the three, never authored as targets. Re-record them after any
 * spine change.
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
    { n: 1, label: 'First pushcart', recordedFireTimeRange: [3, 10] },
    { n: 2, label: 'Subsidiaries out-earn the hand', recordedFireTimeRange: [17, 45] },
    { n: 3, label: 'Sales desk hired', recordedFireTimeRange: [164, 251] },
    { n: 4, label: 'Acquisitions desk hired', recordedFireTimeRange: [292, 380] },
    { n: 5, label: 'Credit grade AAA', recordedFireTimeRange: [630, 719] },
    { n: 6, label: 'Board of Directors hired', recordedFireTimeRange: [638, 727] },
    { n: 7, label: 'The top tier: first savings bank', recordedFireTimeRange: [1186, 1275] },
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
