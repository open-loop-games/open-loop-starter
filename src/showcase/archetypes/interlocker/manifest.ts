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
  ],
  beats: [
    { n: 1, label: 'The first timber yard raised', recordedFireTimeRange: [63, 64] },
    { n: 2, label: 'The Sawpit Guild patented', recordedFireTimeRange: [145, 148] },
    { n: 3, label: 'Les Baux Concession: pits and drifts', recordedFireTimeRange: [244, 252] },
    { n: 4, label: "Deville's reduction furnace", recordedFireTimeRange: [314, 318] },
    { n: 5, label: 'Bonded Warehousing', recordedFireTimeRange: [361, 375] },
    { n: 6, label: 'The Light Steam Engine', recordedFireTimeRange: [393, 421] },
    { n: 7, label: 'Monoplane Rigging', recordedFireTimeRange: [524, 537] },
    { n: 8, label: 'The first aeroplane', recordedFireTimeRange: [527, 540] },
    { n: 9, label: 'The first Exposition', recordedFireTimeRange: [558, 572] },
    { n: 10, label: 'The third Exposition', recordedFireTimeRange: [1449, 1488] },
    { n: 11, label: 'The fifth Exposition', recordedFireTimeRange: [2070, 2142] },
  ],
  shell: 'ThreePanelShell',
  formFactor: 'desktop',
};
