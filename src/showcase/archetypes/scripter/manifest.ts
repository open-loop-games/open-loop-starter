import type { ArchetypeManifest } from '@/types';

/**
 * Beat windows are RECORDED from `balance/arc-probe.ts` under the reference sensei, never
 * authored as targets. Bouts are seeded from the save, so one run is the measurement and
 * each window is a single time. Re-record them after any spine change.
 */
export const manifest: ArchetypeManifest = {
  id: 'scripter',
  displayName: 'Scripter — Inkfist Dojo',
  primitives: [
    { name: 'createSequencer', sourceLayer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'createResource', sourceLayer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    {
      name: 'createProducerCategory',
      sourceLayer: 'systems',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    {
      name: 'createPurchasableCategory',
      sourceLayer: 'systems',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    {
      name: 'createScalingPurchasable',
      sourceLayer: 'systems',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    {
      name: 'createAutomationTiers',
      sourceLayer: 'systems',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    { name: 'createReset', sourceLayer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    {
      name: 'createModifierChain',
      sourceLayer: 'core',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    { name: 'Formula', sourceLayer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
  ],
  beats: [
    { n: 1, label: 'The Straw Post bows', recordedFireTimeRange: [89, 89] },
    { n: 2, label: 'Ox-Hide Ren beaten: the fist is tempered', recordedFireTimeRange: [755, 755] },
    {
      n: 3,
      label: 'Sister Wen beaten: the scroll reads its breath',
      recordedFireTimeRange: [1806, 1806],
    },
    { n: 4, label: 'First graduation', recordedFireTimeRange: [1909, 1909] },
    { n: 5, label: 'Brother Gang parried', recordedFireTimeRange: [2250, 2250] },
    {
      n: 6,
      label: 'Iron-Shell Ma beaten: the student waits for the moment',
      recordedFireTimeRange: [3109, 3109],
    },
    { n: 7, label: 'Master Lu beaten: the forms alternate', recordedFireTimeRange: [5278, 5278] },
    { n: 8, label: 'The Envoy’s Gauntlet: the end beat', recordedFireTimeRange: [7342, 7342] },
  ],
  shell: 'SidebarMainShell',
  formFactor: 'responsive',
  exemplars: [
    {
      title: 'Bitburner',
      analysisPath: 'open-loop-research/analyses/complete/bitburner-analysis.md',
    },
    {
      title: 'Cavernous II',
      analysisPath: 'open-loop-research/analyses/complete/cavernous-ii-analysis.md',
    },
    {
      title: 'Points Progression',
      analysisPath: 'open-loop-research/analyses/complete/points-progression-analysis.md',
    },
  ],
};
