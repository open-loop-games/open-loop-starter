import type { ArchetypeManifest } from '@/types';

const API = 'open-loop-engine/docs/api/INDEX.md';

/**
 * Beat windows are RECORDED from `balance/arc-probe.ts`, never authored as
 * targets. A window is sim-seconds of play from a cold start, the range over
 * the probe at tick sizes 0.25 s to 2 s.
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
    { n: 3, label: 'Les Baux Concession: pits and drifts', recordedFireTimeRange: [221, 224] },
    { n: 4, label: "Deville's reduction furnace", recordedFireTimeRange: [283, 288] },
    { n: 5, label: 'Bonded Warehousing', recordedFireTimeRange: [302, 309] },
    { n: 6, label: 'The Light Steam Engine', recordedFireTimeRange: [353, 370] },
    { n: 7, label: 'The first Boiler House', recordedFireTimeRange: [362, 380] },
    { n: 8, label: 'Monoplane Rigging', recordedFireTimeRange: [511, 535] },
    { n: 9, label: 'The first aeroplane', recordedFireTimeRange: [517, 546] },
    { n: 10, label: 'The first Exposition', recordedFireTimeRange: [806, 877] },
    { n: 11, label: 'The first Ministry order delivered', recordedFireTimeRange: [912, 1178] },
    { n: 12, label: 'Every charter held', recordedFireTimeRange: [1997, 2024] },
    { n: 13, label: 'Le Contremaître employed', recordedFireTimeRange: [2409, 2434] },
    { n: 14, label: 'The tenth Exposition', recordedFireTimeRange: [4635, 4674] },
    { n: 15, label: 'The Grand Prix', recordedFireTimeRange: [6357, 7342] },
  ],
  shell: 'ThreePanelShell',
  formFactor: 'desktop',
};
