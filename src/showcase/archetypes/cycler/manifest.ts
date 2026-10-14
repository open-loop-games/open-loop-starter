import type { ArchetypeManifest } from '@/types';

/**
 * Beat windows are RECORDED from `balance/watch-probe.ts` (seed 1) and
 * `balance/career-probe.ts` (seed 2) under the reference keeper, never authored as targets.
 * One seeded run is the measurement, so most windows are a single time. Re-record them after
 * any spine change.
 */
export const manifest: ArchetypeManifest = {
  id: 'cycler',
  displayName: 'Cycler — Skerry Light',
  primitives: [
    { name: 'createCycle', sourceLayer: 'systems', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'TickDriver', sourceLayer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'createResource', sourceLayer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    {
      name: 'createPurchasableCategory',
      sourceLayer: 'systems',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    { name: 'createInventory', sourceLayer: 'systems', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'createLoadout', sourceLayer: 'systems', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'createSpatialGrid', sourceLayer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    {
      name: 'createModifierChain',
      sourceLayer: 'core',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    { name: 'weightedPick', sourceLayer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'integerRoot', sourceLayer: 'primitives', path: 'open-loop-engine/docs/api/INDEX.md' },
  ],
  beats: [
    { n: 1, label: 'Night one: the first gale', recordedFireTimeRange: [120, 120] },
    {
      n: 2,
      label: 'A buttress behind the struck wall',
      recordedFireTimeRange: [415, 415],
    },
    { n: 3, label: 'A winch: the nets haul themselves', recordedFireTimeRange: [674, 674] },
    {
      n: 4,
      label: 'The crossing: the storm passes the wall and the tower takes water',
      recordedFireTimeRange: [1128, 1177],
    },
    {
      n: 5,
      label: 'The light goes out: the logbook pays',
      recordedFireTimeRange: [1491, 1491],
    },
    {
      n: 6,
      label: 'The Storm almanac: a watch one night longer',
      recordedFireTimeRange: [4463, 4463],
    },
  ],
  shell: 'SidebarMainShell',
  formFactor: 'responsive',
  exemplars: [
    {
      title: 'Dome Keeper',
      analysisPath: 'open-loop-research/analyses/complete/dome-keeper-analysis.md',
    },
    {
      title: 'Thronefall',
      analysisPath: 'open-loop-research/analyses/complete/thronefall-analysis.md',
    },
    {
      title: 'Kingdom Two Crowns',
      analysisPath: 'open-loop-research/analyses/complete/kingdom-two-crowns-analysis.md',
    },
  ],
};
