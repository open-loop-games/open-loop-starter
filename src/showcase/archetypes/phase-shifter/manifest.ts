import type { ArchetypeManifest } from '@/types';

const API = 'open-loop-engine/docs/api/INDEX.md';

/**
 * Beat windows are RECORDED by `balance/beats.ts`, never authored as targets: each window
 * is the range of a beat's fire time over the runs that file spans. `pnpm beats` checks
 * them against today's game, and `pnpm beats --write` re-records them.
 */
export const manifest: ArchetypeManifest = {
  id: 'phase-shifter',
  displayName: 'Phase-shifter — Night Clerk',
  primitives: [
    { name: 'createPurchasableCategory', sourceLayer: 'systems', path: API },
    { name: 'createConditionalEffectSystem', sourceLayer: 'systems', path: API },
    { name: 'createPredicateResolver', sourceLayer: 'systems', path: API },
    { name: 'createProducerCategory', sourceLayer: 'systems', path: API },
    { name: 'createCycle', sourceLayer: 'systems', path: API },
    { name: 'createAutomationTiers', sourceLayer: 'systems', path: API },
    { name: 'createAchievementCategory', sourceLayer: 'systems', path: API },
    { name: 'createModifierChain', sourceLayer: 'core', path: API },
    { name: 'createResource', sourceLayer: 'core', path: API },
    { name: 'createTuningRegistry', sourceLayer: 'core', path: API },
  ],
  beats: [
    { n: 1, label: 'First clerk', recordedFireTimeRange: [7.5, 7.5] },
    { n: 2, label: 'The box is empty: pin it to the wall', recordedFireTimeRange: [240.5, 240.5] },
    { n: 3, label: 'The board opens to 4×4', recordedFireTimeRange: [441.5, 441.5] },
    {
      n: 4,
      label: 'The board holds: reconstruct the night',
      recordedFireTimeRange: [661.5, 661.5],
    },
    { n: 5, label: 'First alibi holds', recordedFireTimeRange: [821.5, 821.5] },
    {
      n: 6,
      label: 'Sixth alibi holds: the box comes back',
      recordedFireTimeRange: [1181.5, 1181.5],
    },
  ],
  shell: 'ColumnShell',
  formFactor: 'desktop',
};
