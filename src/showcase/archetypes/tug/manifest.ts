import type { ArchetypeManifest } from '@/types';

export const manifest: ArchetypeManifest = {
  id: 'tug',
  name: 'Tug — SciFi Armada',
  primitives: [
    { name: 'createResource', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'chain.bind', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'calculateCost', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'createSequencer', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'runHeadless', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'withPersistentContext', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'createReset', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'tunable', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'createTuningRegistry', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'createCycle', layer: 'systems', path: 'open-loop-engine/docs/api/INDEX.md' },
    {
      name: 'createPurchasableCategory',
      layer: 'systems',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    {
      name: 'createChallengeCategory',
      layer: 'systems',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    { name: 'runMatrixUntil', layer: 'harness', path: 'open-loop-engine/docs/api/INDEX.md' },
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
