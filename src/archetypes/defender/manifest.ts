import type { ArchetypeManifest } from '@/types';

export const manifest: ArchetypeManifest = {
  id: 'defender',
  name: 'Defender — Bloons',
  primitives: [
    { name: 'createResource', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'chain.bind', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'createSequencer', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'createSpatialGrid', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'withPersistentContext', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'createReset', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'tunable', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'createTuningRegistry', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    {
      name: 'createPurchasableCategory',
      layer: 'systems',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    { name: 'runHeadless', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'runMatrixUntil', layer: 'harness', path: 'open-loop-engine/docs/api/INDEX.md' },
  ],
  beats: [
    { n: 1, label: 'First tower placed', targetSimRange: [0, 30] },
    { n: 2, label: 'Round 1 cleared (12 reds defeated)', targetSimRange: [30, 90] },
    {
      n: 3,
      label: 'First second-type tower bought (Tack / Bomb / Ice)',
      targetSimRange: [90, 300],
    },
    { n: 4, label: 'First blue-shed observed (round 3 onward)', targetSimRange: [180, 420] },
    {
      n: 5,
      label: 'Round 6 cleared — 10 greens, first non-red-shed wave',
      targetSimRange: [600, 1200],
    },
    {
      n: 6,
      label: 'Arc closure — round 10 cleared OR defeat at round 7+',
      targetSimRange: [1200, 2400],
    },
  ],
  shell: 'SidebarMainShell',
  formFactor: 'desktop',
  exemplars: [
    {
      title: 'Bloons TD 1',
      analysisPath: 'open-loop-research/reference-code/bloons-td-1/',
    },
  ],
};
