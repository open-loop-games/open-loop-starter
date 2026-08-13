import type { ArchetypeManifest } from '@/types';

/**
 * Beat windows are RECORDED from `balance/allocation-probe.ts` — the min/max
 * across its three allocation rules over an 8h run — never authored as targets.
 * They are listed here in the order the beats are numbered, which is NOT the
 * order they land: beat 4 arrives before beat 3, and beat 2 lands fifth.
 */
export const manifest: ArchetypeManifest = {
  id: 'producer',
  name: 'Producer — Probe Swarm',
  primitives: [
    { name: 'createResource', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
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
    { name: 'createModifierChain', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    {
      name: 'createMultiplicativeModifier',
      layer: 'core',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    { name: 'createAutomationTiers', layer: 'systems', path: 'open-loop-engine/docs/api/INDEX.md' },
    {
      name: 'setupPolicyAutoPurchase',
      layer: 'systems',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    { name: 'selectionHybridPayback', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'classifyFlowChannel', layer: 'harness', path: 'open-loop-engine/docs/api/INDEX.md' },
  ],
  beats: [
    { n: 1, label: 'First probe deployed', recordedSimRange: [7, 7] },
    {
      n: 2,
      label: 'Ladder passes the click ceiling',
      recordedSimRange: [1664, 1723],
    },
    { n: 3, label: 'First refinement bought', recordedSimRange: [248, 248] },
    { n: 4, label: 'First revision earned', recordedSimRange: [121, 121] },
    { n: 5, label: 'Dispatch opens', recordedSimRange: [507, 507] },
    { n: 6, label: 'Managed dispatch', recordedSimRange: [5179, 5241] },
    { n: 7, label: 'The frontier — top class deployed', recordedSimRange: [13194, 13354] },
  ],
  shell: 'SidebarMainShell',
  formFactor: 'responsive',
  exemplars: [
    {
      title: 'Cookie Clicker',
      analysisPath: 'open-loop-research/analyses/complete/cookie-clicker-analysis.md',
    },
    {
      title: 'Antimatter Dimensions',
      analysisPath: 'open-loop-research/analyses/complete/antimatter-dimensions-analysis.md',
    },
    {
      title: 'AdVenture Capitalist',
      analysisPath: 'open-loop-research/analyses/complete/adventure-capitalist-analysis.md',
    },
    {
      title: 'Universal Paperclips',
      analysisPath: 'open-loop-research/analyses/complete/universal-paperclips-analysis.md',
    },
  ],
};
