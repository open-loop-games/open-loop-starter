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
  // Beat labels only — no recorded windows yet. The earlier ranges were
  // calibration-pending targets read off a greedy reference bot that never
  // reached the late beats; per the archetype's measure-and-record rule
  // (ARCHETYPES.md § Dev-loop) we don't carry set-as-target windows. Timings
  // get a `recordedSimRange` once measured from a real harness run.
  beats: [
    { n: 1, label: 'First catnip field built' },
    { n: 2, label: 'First kitten arrives' },
    { n: 3, label: 'First science: calendar' },
    { n: 4, label: 'Workshop unlocked (mining researched + workshop built)' },
    { n: 5, label: 'First megalith crafted (architecture researched)' },
    { n: 6, label: 'Arc closure — architecture + megalith owned' },
  ],
  shell: 'ThreePanelShell',
  formFactor: 'desktop',
  exemplars: [
    {
      title: 'Kittens Game',
      analysisPath: 'open-loop-research/reference-code/kittensgame/',
    },
  ],
};
