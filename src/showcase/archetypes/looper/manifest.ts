import type { ArchetypeManifest } from '@/types';

const API = 'open-loop-engine/docs/api/INDEX.md';

/**
 * Beat windows are RECORDED from `balance/arc-probe.ts`, never authored as
 * targets. A window is sim-seconds of play from the first night. The probe is
 * deterministic, so each window is one run's point.
 */
export const manifest: ArchetypeManifest = {
  id: 'looper',
  displayName: 'Looper — Lights Out',
  primitives: [
    { name: 'createActionCategory', sourceLayer: 'systems', path: API },
    { name: 'createSkillCategory', sourceLayer: 'systems', path: API },
    { name: 'createCycle', sourceLayer: 'systems', path: API },
    { name: 'createCycleLog', sourceLayer: 'systems', path: API },
    { name: 'createZoneSystem', sourceLayer: 'systems', path: API },
    { name: 'createPurchasableCategory', sourceLayer: 'systems', path: API },
    { name: 'createAutomationTiers', sourceLayer: 'systems', path: API },
    { name: 'createModifierChain', sourceLayer: 'core', path: API },
    { name: 'createMultiplicativeModifier', sourceLayer: 'core', path: API },
    { name: 'createResource', sourceLayer: 'core', path: API },
    { name: 'createTuningRegistry', sourceLayer: 'core', path: API },
    { name: 'Formula', sourceLayer: 'core', path: API },
  ],
  beats: [
    { n: 1, label: 'Out of the cell', recordedFireTimeRange: [25.2, 25.2] },
    { n: 2, label: 'First note bought', recordedFireTimeRange: [150, 150] },
    { n: 3, label: 'Into the laundry', recordedFireTimeRange: [244, 244] },
    { n: 4, label: 'Into the yard', recordedFireTimeRange: [485.4, 485.4] },
    { n: 5, label: 'Routine takes the restart', recordedFireTimeRange: [500.3, 500.3] },
    { n: 6, label: 'Over the wall', recordedFireTimeRange: [922.2, 922.2] },
    { n: 7, label: 'Discipline takes the turn-in', recordedFireTimeRange: [929.3, 929.3] },
    { n: 8, label: 'Into the rail yard', recordedFireTimeRange: [1846.4, 1846.4] },
    { n: 9, label: 'On the freight', recordedFireTimeRange: [2772.4, 2772.4] },
  ],
  shell: 'ColumnShell · left + right',
  formFactor: 'desktop',
};
