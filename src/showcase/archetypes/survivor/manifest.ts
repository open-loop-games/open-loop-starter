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
    { n: 1, label: 'The first rewrite', recordedFireTimeRange: [18, 18] },
    { n: 2, label: 'CUT: the first take survives', recordedFireTimeRange: [420, 420] },
    { n: 3, label: 'The Pyro signs, and PG opens', recordedFireTimeRange: [840, 840] },
    { n: 4, label: 'CUT at PG', recordedFireTimeRange: [1670, 1670] },
    { n: 5, label: 'R opens', recordedFireTimeRange: [2135, 2135] },
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
