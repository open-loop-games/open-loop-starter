import type { ArchetypeManifest } from '@/types';

export const manifest: ArchetypeManifest = {
  id: 'scaler',
  name: 'Antimatter Physics',
  status: 'canonical',
  primitives: [
    { name: 'createResource', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    {
      name: 'createMultiplicativeModifier',
      layer: 'core',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    {
      name: 'createProducerCategory',
      layer: 'systems',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    {
      name: 'createPurchasableCategory',
      layer: 'systems',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    { name: 'createCostRequirement', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'createReset', layer: 'systems', path: 'open-loop-engine/docs/api/INDEX.md' },
  ],
  beats: [
    {
      n: 1,
      label: 'Coin producer ladder buyable + Accelerator/Multiplier + Upgrades 1–20 reachable',
      targetSimRange: [0, 600],
    },
    {
      n: 2,
      label: 'First prestige; first prestigePoints + first Diamond producer',
      targetSimRange: [600, 1800],
    },
    {
      n: 3,
      label: 'Runes tab unlocks; first sacrifice raises Speed rune',
      targetSimRange: [1800, 3600],
    },
    {
      n: 4,
      label: 'Crystal upgrades + prestige Upgrades 21–40 buys',
      targetSimRange: [3600, 5400],
    },
    { n: 5, label: 'First transcend; transcend challenge attempt', targetSimRange: [5400, 7200] },
    { n: 6, label: 'Mythos producer + transcend Upgrades 41–60', targetSimRange: [7200, 10800] },
    {
      n: 7,
      label: 'Cross-tier modifier-chain readout (achievements × crystals × challenges × runes)',
      targetSimRange: [10800, 14400],
    },
    { n: 8, label: 'Arc closure: every challenge maxed', targetSimRange: [14400, 21600] },
  ],
  themes: [{ name: 'Antimatter Physics', isDefault: true }],
  shell: 'TabsBarShell',
  formFactor: 'desktop',
  exemplars: [
    {
      title: 'Synergism',
      analysisPath: 'open-loop-research/analyses/complete/synergism-analysis.md',
    },
    {
      title: 'Antimatter Dimensions',
      analysisPath: 'open-loop-research/analyses/complete/antimatter-dimensions-analysis.md',
    },
    {
      title: 'NGU Idle',
      analysisPath: 'open-loop-research/analyses/complete/ngu-idle-analysis.md',
    },
  ],
};
