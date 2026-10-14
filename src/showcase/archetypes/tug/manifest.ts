import type { ArchetypeManifest } from '@/types';

/**
 * Beat windows are RECORDED from `balance/career-probe.ts` (seed 1) under the reference
 * marshal, never authored as targets; the first two are from that run's first battle. One
 * seeded run is the measurement, so each window is a single time. Re-record them after any
 * spine change.
 */
export const manifest: ArchetypeManifest = {
  id: 'tug',
  displayName: 'Tug — Hold the Causeway',
  primitives: [
    { name: 'createResource', sourceLayer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    {
      name: 'createPurchasableCategory',
      sourceLayer: 'systems',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    { name: 'createReset', sourceLayer: 'systems', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'createSkill', sourceLayer: 'systems', path: 'open-loop-engine/docs/api/INDEX.md' },
    {
      name: 'createModifierChain',
      sourceLayer: 'core',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    { name: 'tunable', sourceLayer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'weightedPick', sourceLayer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
  ],
  beats: [
    {
      n: 1,
      label: 'The opening horn: the lines meet at the middle',
      recordedFireTimeRange: [20, 20],
    },
    { n: 2, label: 'The engineers arrive: the first mangonel', recordedFireTimeRange: [120, 120] },
    { n: 3, label: 'The Charter of the Longbow', recordedFireTimeRange: [910, 910] },
    {
      n: 4,
      label: "Lord Grubb's gate falls: the first victory",
      recordedFireTimeRange: [1166, 1166],
    },
    { n: 5, label: 'Lady Vesk, who answers every horn', recordedFireTimeRange: [1874, 1874] },
    {
      n: 6,
      label: 'The Stolen Throne falls: the ending',
      recordedFireTimeRange: [3597, 3597],
    },
  ],
  shell: 'SingleColumnShell',
  formFactor: 'responsive',
  exemplars: [
    {
      title: 'Warfare 1917',
      analysisPath: 'open-loop-research/analyses/complete/warfare-1917-analysis.md',
    },
    {
      title: 'Age of War',
      analysisPath: 'open-loop-research/analyses/complete/age-of-war-analysis.md',
    },
    {
      title: 'Legion TD 2',
      analysisPath: 'open-loop-research/analyses/complete/legion-td-2-analysis.md',
    },
    {
      title: 'Direct Strike',
      analysisPath: 'open-loop-research/analyses/complete/direct-strike-analysis.md',
    },
  ],
};
