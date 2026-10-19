import type { ArchetypeManifest } from '@/types';

/**
 * Beat windows are RECORDED from `balance/arc-probe.ts` (contract 1, attempt 1) under the
 * reference player, never authored as targets. One run is the measurement, so each window
 * is a single time. Re-record them after any spine change.
 */
export const manifest: ArchetypeManifest = {
  id: 'skirmish',
  displayName: 'Skirmish — Chrome & Cantrip',
  primitives: [
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
    { name: 'createResourceBag', sourceLayer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'createReset', sourceLayer: 'systems', path: 'open-loop-engine/docs/api/INDEX.md' },
    {
      name: 'createAutomationTiers',
      sourceLayer: 'systems',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    {
      name: 'createModifierChain',
      sourceLayer: 'core',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    { name: 'tunable', sourceLayer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
  ],
  beats: [
    { n: 1, label: 'Moth, your fixer, takes the job', recordedFireTimeRange: [0, 0] },
    { n: 2, label: 'The first training floor: the Chop shop', recordedFireTimeRange: [112, 112] },
    { n: 3, label: 'The first Razorboy hits the street', recordedFireTimeRange: [132, 132] },
    { n: 4, label: 'Neon Narrows answers to your crew', recordedFireTimeRange: [177.5, 177.5] },
    { n: 5, label: 'The first clash in the districts', recordedFireTimeRange: [201, 201] },
    { n: 6, label: 'Your first assault on their safehouse', recordedFireTimeRange: [332.5, 332.5] },
    { n: 7, label: 'The Gutter Saints’ safehouse burns', recordedFireTimeRange: [392, 392] },
  ],
  shell: 'ThreePanelShell',
  formFactor: 'responsive',
};
