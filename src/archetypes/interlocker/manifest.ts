import type { ArchetypeManifest } from '@/types';

export const manifest: ArchetypeManifest = {
  id: 'interlocker',
  name: 'Interlocker — Kittens',
  primitives: [
    { name: 'createResource', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'createResourceBag', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'createModifierChain', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'chain.bind', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'withPersistentContext', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'tunable', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'createTuningRegistry', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    {
      name: 'createPurchasableCategory',
      layer: 'systems',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    { name: 'createConversion', layer: 'systems', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'createCategoryBase', layer: 'systems', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'runHeadless', layer: 'harness', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'runMatrixUntil', layer: 'harness', path: 'open-loop-engine/docs/api/INDEX.md' },
  ],
  // Target ranges are calibration-pending (OL-1079 step 3): the canonical early
  // arc is bootstrapped by manual gather/refine, so beat timings emerge from a
  // reference bot policy, not a closed form. Probe-4 under a crude greedy bot
  // currently lands beat-1 ≈1s, beat-2 ≈408s (first kitten is housing-gated:
  // gather → refine catnip→wood → hut → 0.05/sec growth, NOT flat-from-t0).
  beats: [
    { n: 1, label: 'First catnip field built', targetSimRange: [0, 60] },
    { n: 2, label: 'First kitten arrives', targetSimRange: [60, 600] },
    { n: 3, label: 'First science: calendar', targetSimRange: [300, 600] },
    {
      n: 4,
      label: 'Workshop unlocked (mining researched + workshop built)',
      targetSimRange: [600, 1500],
    },
    {
      n: 5,
      label: 'First megalith crafted (architecture researched)',
      targetSimRange: [3000, 5400],
    },
    { n: 6, label: 'Arc closure — architecture + megalith owned', targetSimRange: [3000, 7200] },
  ],
  shell: 'SidebarMainShell',
  formFactor: 'desktop',
  exemplars: [
    {
      title: 'Kittens Game',
      analysisPath: 'open-loop-research/reference-code/kittensgame/',
    },
  ],
};
