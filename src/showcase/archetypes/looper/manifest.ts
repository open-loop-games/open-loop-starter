import type { ArchetypeManifest } from '@/types';

const API = 'open-loop-engine/docs/api/INDEX.md';

/**
 * Beat windows are RECORDED by `balance/beats.ts`, never authored as targets: each window
 * is the range of a beat's fire time over the runs that file spans. `pnpm beats` checks
 * them against today's game, and `pnpm beats --write` re-records them. The clock is
 * sim-seconds from the first night.
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
    { n: 1, label: 'Out of the cell', recordedFireTimeRange: [25, 25] },
    { n: 2, label: 'First note bought', recordedFireTimeRange: [150, 150] },
    { n: 3, label: 'Into the laundry', recordedFireTimeRange: [244, 244] },
    { n: 4, label: 'Into the yard', recordedFireTimeRange: [485.5, 485.5] },
    { n: 5, label: 'Routine takes the restart', recordedFireTimeRange: [500.5, 500.5] },
    { n: 6, label: 'Over the wall', recordedFireTimeRange: [922, 922] },
    { n: 7, label: 'Discipline takes the turn-in', recordedFireTimeRange: [929.5, 929.5] },
    { n: 8, label: 'Into the rail yard', recordedFireTimeRange: [1846.5, 1846.5] },
    { n: 9, label: 'On the freight', recordedFireTimeRange: [2772.5, 2772.5] },
  ],
  shell: 'ColumnShell · left + right',
  formFactor: 'desktop',
};
