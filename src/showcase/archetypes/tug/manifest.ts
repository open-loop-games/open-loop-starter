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
    { n: 3, label: "Grubb's Ford falls: the first victory", recordedFireTimeRange: [193, 193] },
    { n: 4, label: 'The bowmen take the field at the Mudhole', recordedFireTimeRange: [385, 385] },
    { n: 5, label: 'Fire-pots on the walls', recordedFireTimeRange: [1777, 1777] },
    { n: 6, label: 'Lady Vesk, who answers every horn', recordedFireTimeRange: [2240, 2240] },
    {
      n: 7,
      label: 'The Stolen Throne falls: the ending',
      recordedFireTimeRange: [6381, 6381],
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
