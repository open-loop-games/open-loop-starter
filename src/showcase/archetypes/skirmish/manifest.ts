import type { ArchetypeManifest } from '@/types';

/**
 * Beat windows are RECORDED by `balance/beats.ts`, never authored as targets: each window
 * is the range of a beat's fire time over the runs that file spans. `pnpm beats` checks
 * them against today's game, and `pnpm beats --write` re-records them.
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
    { n: 2, label: 'The first training floor: the Chop shop', recordedFireTimeRange: [51, 51] },
    { n: 3, label: 'The first Razorboy hits the street', recordedFireTimeRange: [71, 71] },
    { n: 4, label: 'Neon Narrows answers to your crew', recordedFireTimeRange: [131, 131] },
    { n: 5, label: 'The first clash in the districts', recordedFireTimeRange: [158, 158] },
    { n: 6, label: 'Your first assault on their safehouse', recordedFireTimeRange: [418.5, 418.5] },
    { n: 7, label: 'The Gutter Saints’ safehouse burns', recordedFireTimeRange: [487, 487] },
  ],
  shell: 'ColumnShell · topBar + left + right · fixed',
  formFactor: 'responsive',
};
