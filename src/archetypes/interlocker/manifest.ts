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
  beats: [
    { n: 1, label: 'First catnip field built', targetSimRange: [0, 60] },
    { n: 2, label: 'First kitten arrives (catnip 5000)', targetSimRange: [60, 300] },
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
