import type { ArchetypeManifest } from '@/types';

const API = 'open-loop-engine/docs/api/INDEX.md';

/**
 * Beat windows are RECORDED from `balance/arc-probe.ts`, never authored as
 * targets. A window is sim-seconds of play from a cold start; the reference
 * player is deterministic, so each window is one point.
 */
export const manifest: ArchetypeManifest = {
  id: 'phase-shifter',
  displayName: 'Phase-shifter — Night Clerk',
  primitives: [
    { name: 'createPurchasableCategory', sourceLayer: 'systems', path: API },
    { name: 'createConditionalEffectSystem', sourceLayer: 'systems', path: API },
    { name: 'createPredicateResolver', sourceLayer: 'systems', path: API },
    { name: 'createProducerCategory', sourceLayer: 'systems', path: API },
    { name: 'createConversion', sourceLayer: 'systems', path: API },
    { name: 'createCycle', sourceLayer: 'systems', path: API },
    { name: 'createAutomationTiers', sourceLayer: 'systems', path: API },
    { name: 'createAchievementCategory', sourceLayer: 'systems', path: API },
    { name: 'createModifierChain', sourceLayer: 'core', path: API },
    { name: 'createResource', sourceLayer: 'core', path: API },
    { name: 'createTuningRegistry', sourceLayer: 'core', path: API },
  ],
  beats: [
    { n: 1, label: 'First clerk', recordedFireTimeRange: [8, 8] },
    { n: 2, label: 'The box is empty: pin it to the wall', recordedFireTimeRange: [241, 241] },
    { n: 3, label: 'The board holds: reconstruct the night', recordedFireTimeRange: [668, 668] },
    { n: 4, label: 'First alibi holds', recordedFireTimeRange: [828, 828] },
    { n: 5, label: 'Sixth alibi holds: the last account', recordedFireTimeRange: [1308, 1308] },
  ],
  shell: 'SingleColumnShell',
  formFactor: 'desktop',
};
