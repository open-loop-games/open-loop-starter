import type { ArchetypeManifest } from '@/types';

const API = 'open-loop-engine/docs/api/INDEX.md';

/**
 * Beat windows are RECORDED by `balance/beats.ts`, never authored as targets: each window
 * is the range of a beat's fire time over the runs that file spans. `pnpm beats` checks
 * them against today's game, and `pnpm beats --write` re-records them.
 */
export const manifest: ArchetypeManifest = {
  id: 'interlocker',
  displayName: 'Interlocker — The Aluminium Empire',
  primitives: [
    { name: 'createProducerCategory', sourceLayer: 'systems', path: API },
    { name: 'createPurchasableCategory', sourceLayer: 'systems', path: API },
    { name: 'createGateRequirement', sourceLayer: 'systems', path: API },
    { name: 'createCostRequirement', sourceLayer: 'core', path: API },
    { name: 'createConversion', sourceLayer: 'systems', path: API },
    { name: 'createResourceBag', sourceLayer: 'core', path: API },
    { name: 'createModifierChain', sourceLayer: 'core', path: API },
    { name: 'createCycle', sourceLayer: 'systems', path: API },
    { name: 'createResource', sourceLayer: 'core', path: API },
    { name: 'createTuningRegistry', sourceLayer: 'core', path: API },
    { name: 'createAutomationTiers', sourceLayer: 'systems', path: API },
    { name: 'createTimeSystem', sourceLayer: 'systems', path: API },
    { name: 'createSeededRNG', sourceLayer: 'primitives', path: API },
  ],
  beats: [
    { n: 1, label: 'The first timber yard raised', recordedFireTimeRange: [35, 36] },
    { n: 2, label: 'The Sawpit Guild patented', recordedFireTimeRange: [118, 120] },
    { n: 3, label: 'Les Baux Concession: pits and drifts', recordedFireTimeRange: [218, 222] },
    { n: 4, label: "Deville's reduction furnace", recordedFireTimeRange: [287, 292] },
    { n: 5, label: 'Bonded Warehousing', recordedFireTimeRange: [337, 354] },
    { n: 6, label: 'The Light Steam Engine', recordedFireTimeRange: [378, 388] },
    { n: 7, label: 'The first Boiler House', recordedFireTimeRange: [387, 398] },
    { n: 8, label: 'Monoplane Rigging', recordedFireTimeRange: [538, 542] },
    { n: 9, label: 'The first aeroplane', recordedFireTimeRange: [544, 546] },
    { n: 10, label: 'The first Exposition', recordedFireTimeRange: [797, 824] },
    { n: 11, label: 'The first Ministry order delivered', recordedFireTimeRange: [903, 1056] },
    { n: 12, label: 'Every charter held', recordedFireTimeRange: [1835.5, 1922] },
    { n: 13, label: 'Le Contremaître employed', recordedFireTimeRange: [2246.5, 2340] },
    { n: 14, label: 'The tenth Exposition', recordedFireTimeRange: [4500, 4576] },
    { n: 15, label: 'The Grand Prix', recordedFireTimeRange: [6167, 6956.5] },
  ],
  shell: 'ColumnShell · left + right',
  formFactor: 'desktop',
};
