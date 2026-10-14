import type { ArchetypeManifest } from '@/types';

/**
 * Beat windows are RECORDED from `balance/career-probe.ts` under the stars' instincts, never
 * authored as targets. One seeded career is the measurement, so each window is a single
 * time. Re-record them after any spine change.
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
    { n: 1, label: 'The first rewrite', recordedFireTimeRange: [16, 16] },
    { n: 2, label: 'The Pyro signs', recordedFireTimeRange: [549, 549] },
    { n: 3, label: 'CUT: the first lead falls', recordedFireTimeRange: [1052, 1052] },
    { n: 4, label: 'PG opens', recordedFireTimeRange: [1513, 1513] },
    { n: 5, label: 'PG-13 opens', recordedFireTimeRange: [2897, 2897] },
    {
      n: 6,
      label: 'R opens, with two stars wrapped at PG-13',
      recordedFireTimeRange: [6815, 6815],
    },
    { n: 7, label: 'The picture wraps: the Big Bad falls', recordedFireTimeRange: [7271, 7271] },
  ],
  shell: 'Soundstage',
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
