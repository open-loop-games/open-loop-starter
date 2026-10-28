import type { ArchetypeManifest } from '@/types';

/**
 * Beat windows are RECORDED by `balance/beats.ts`, never authored as targets: each window
 * is the range of a beat's fire time over the runs that file spans. `pnpm beats` checks
 * them against today's game, and `pnpm beats --write` re-records them.
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
      recordedFireTimeRange: [23, 23],
    },
    { n: 2, label: 'The engineers arrive: the first mangonel', recordedFireTimeRange: [130, 130] },
    { n: 3, label: "Grubb's Ford falls: the first victory", recordedFireTimeRange: [193.5, 193.5] },
    {
      n: 4,
      label: 'The bowmen take the field at the Mudhole',
      recordedFireTimeRange: [967.5, 967.5],
    },
    { n: 5, label: 'Fire-pots on the walls', recordedFireTimeRange: [2121.5, 2121.5] },
    { n: 6, label: 'Lady Vesk, who answers every horn', recordedFireTimeRange: [2847, 2847] },
    {
      n: 7,
      label: 'The Stolen Throne falls: the ending',
      recordedFireTimeRange: [7120, 7120],
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
