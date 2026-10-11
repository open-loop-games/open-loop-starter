import type { ArchetypeManifest } from '@/types';

export const manifest: ArchetypeManifest = {
  id: 'tug',
  displayName: 'Tug — SciFi Armada',
  primitives: [
    { name: 'createResource', sourceLayer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'chain.bind', sourceLayer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'calculateCost', sourceLayer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'createSequencer', sourceLayer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'runHeadless', sourceLayer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    {
      name: 'withPersistentContext',
      sourceLayer: 'core',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    { name: 'createReset', sourceLayer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'tunable', sourceLayer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    {
      name: 'createTuningRegistry',
      sourceLayer: 'core',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    { name: 'createCycle', sourceLayer: 'systems', path: 'open-loop-engine/docs/api/INDEX.md' },
    {
      name: 'createPurchasableCategory',
      sourceLayer: 'systems',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    {
      name: 'createChallengeCategory',
      sourceLayer: 'systems',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    { name: 'runMatrixUntil', sourceLayer: 'harness', path: 'open-loop-engine/docs/api/INDEX.md' },
  ],
  beats: [
    { n: 1, label: 'First unit purchased', recordedSimRange: [0, 60] },
    { n: 2, label: 'First auto-resolve combat observed', recordedSimRange: [60, 180] },
    { n: 3, label: 'First counter-pivot', recordedSimRange: [300, 900] },
    { n: 4, label: 'First match completion', recordedSimRange: [900, 1800] },
    { n: 5, label: 'Second-match composition pivot', recordedSimRange: [1800, 3000] },
    { n: 6, label: 'Counter-type mastery demonstrated', recordedSimRange: [2700, 4500] },
  ],
  shell: 'TugFrameLayout',
  formFactor: 'desktop',
  exemplars: [
    {
      title: 'Direct Strike',
      analysisPath: 'open-loop-research/analyses/complete/direct-strike-analysis.md',
    },
    {
      title: 'Warfare 1917',
      analysisPath: 'open-loop-research/analyses/complete/warfare-1917-analysis.md',
    },
    {
      title: 'Legion TD 2',
      analysisPath: 'open-loop-research/analyses/complete/legion-td-2-analysis.md',
    },
  ],
};
