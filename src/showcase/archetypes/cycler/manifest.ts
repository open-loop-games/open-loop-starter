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
      label: 'The first spray: screens behind the struck side',
      recordedFireTimeRange: [456, 456],
    },
    {
      n: 3,
      label: 'The gale backs: walls round the corner',
      recordedFireTimeRange: [624, 624],
    },
    {
      n: 4,
      label: 'The light goes out: the logbook pays',
      recordedFireTimeRange: [1491, 1491],
    },
    {
      n: 5,
      label: 'Posted to the Flannans',
      recordedFireTimeRange: [6815, 6815],
    },
    {
      n: 6,
      label: 'The relief signalled: a lesser close',
      recordedFireTimeRange: [7653, 7653],
    },
    {
      n: 7,
      label: 'The light holds through the final gale: the end beat',
      recordedFireTimeRange: [9326, 9326],
    },
  ],
  shell: 'ColumnShell · left',
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
