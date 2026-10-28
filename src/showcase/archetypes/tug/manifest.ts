import type { ArchetypeManifest } from '@/types';

/**
 * Beat windows are RECORDED from `balance/career-probe.ts` (seed 1) under the reference
 * marshal, never authored as targets; the first three are from that run's first battle. One
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
      label: "The opening horn: Fairhold tithes, and the Mire's yeomen pin the line",
      recordedFireTimeRange: [22, 22],
    },
    { n: 2, label: 'The engineers arrive: the first mangonel', recordedFireTimeRange: [130, 130] },
    { n: 3, label: "Grubb's Ford falls: the first victory", recordedFireTimeRange: [193, 193] },
    { n: 4, label: 'The bowmen take the field at the Mudhole', recordedFireTimeRange: [967, 967] },
    { n: 5, label: 'Fire-pots on the walls', recordedFireTimeRange: [2121, 2121] },
    { n: 6, label: 'Lady Vesk, who answers every horn', recordedFireTimeRange: [2846, 2846] },
    {
      n: 7,
      label: 'The Stolen Throne falls: the ending',
      recordedFireTimeRange: [7119, 7119],
    },
  ],
  shell: 'ColumnShell · topBar',
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
