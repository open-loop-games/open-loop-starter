import type { ArchetypeManifest } from '@/types';

/**
 * Beat windows are RECORDED by `balance/beats.ts`, never authored as targets: each window
 * is the range of a beat's fire time over the runs that file spans. `pnpm beats` checks
 * them against today's game, and `pnpm beats --write` re-records them.
 */
export const manifest: ArchetypeManifest = {
  id: 'survivor',
  displayName: 'Survivor — One More Take',
  primitives: [
    { name: 'createResource', sourceLayer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    {
      name: 'createPurchasableCategory',
      sourceLayer: 'systems',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    { name: 'createSkill', sourceLayer: 'systems', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'createReset', sourceLayer: 'systems', path: 'open-loop-engine/docs/api/INDEX.md' },
    {
      name: 'createModifierChain',
      sourceLayer: 'core',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    { name: 'createSpatialGrid', sourceLayer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'tunable', sourceLayer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'weightedPick', sourceLayer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
  ],
  beats: [
    { n: 1, label: 'The first rewrite', recordedFireTimeRange: [16.5, 16.5] },
    { n: 2, label: 'The Pyro signs', recordedFireTimeRange: [550, 550] },
    { n: 3, label: 'CUT: the first lead falls', recordedFireTimeRange: [1053, 1053] },
    { n: 4, label: 'PG opens', recordedFireTimeRange: [1513.5, 1513.5] },
    { n: 5, label: 'PG-13 opens', recordedFireTimeRange: [2897.5, 2897.5] },
    {
      n: 6,
      label: 'R opens, with two stars wrapped at PG-13',
      recordedFireTimeRange: [6815.5, 6815.5],
    },
    { n: 7, label: 'The picture wraps: the Big Bad falls', recordedFireTimeRange: [7272, 7272] },
  ],
  shell: 'StageShell · floats; ColumnShell between takes',
  formFactor: 'responsive',
  exemplars: [
    {
      title: 'Vampire Survivors',
      analysisPath: 'open-loop-research/analyses/complete/vampire-survivors-analysis.md',
    },
    {
      title: 'Brotato',
      analysisPath: 'open-loop-research/analyses/complete/brotato-analysis.md',
    },
    {
      title: 'Halls of Torment',
      analysisPath: 'open-loop-research/analyses/complete/halls-of-torment-analysis.md',
    },
  ],
};
