import type { ArchetypeManifest } from '@/types';

export const manifest: ArchetypeManifest = {
  id: 'scaler',
  name: 'Antimatter Physics',
  status: 'candidate',
  pitch:
    'Scaler is the archetype where the game you played an hour ago becomes a footnote. Buy producers, watch costs scale, hit a prestige threshold, ascend — every tier compresses the one below it until what took an hour takes seconds. The pull is watching the headline multiplier scroll past 1e12×, then 1e120×, knowing every digit came from a deliberate composition of layers, challenges, and upgrades you designed.',
  patterns: {
    required: [
      {
        label: 'Prestige Systems',
        path: 'open-loop-research/patterns/tier-1-foundation/prestige-systems.md',
        tier: 'tier-1-foundation',
      },
      {
        label: 'Challenge Systems',
        path: 'open-loop-research/patterns/tier-3-moderate/challenge-systems.md',
        tier: 'tier-3-moderate',
      },
      {
        label: 'Activity Systems (A+C hybrid)',
        path: 'open-loop-research/patterns/tier-0-universal/activity-systems/',
        tier: 'tier-0-universal',
      },
      {
        label: 'Progression Systems',
        path: 'open-loop-research/patterns/tier-0-universal/progression-systems.md',
        tier: 'tier-0-universal',
      },
    ],
    crossProperties: [
      {
        label: 'Modifier Chains',
        path: 'open-loop-research/patterns/cross-pattern-properties/modifier-chains.md',
        tier: 'cross-pattern-property',
      },
      {
        label: 'Cost Scaling',
        path: 'open-loop-research/patterns/cross-pattern-properties/cost-scaling.md',
        tier: 'cross-pattern-property',
      },
      {
        label: 'Scaling Formulas',
        path: 'open-loop-research/patterns/cross-pattern-properties/scaling-formulas.md',
        tier: 'cross-pattern-property',
      },
      {
        label: 'Softcapping',
        path: 'open-loop-research/patterns/cross-pattern-properties/softcapping.md',
        tier: 'cross-pattern-property',
      },
      {
        label: 'Purchase Mechanics',
        path: 'open-loop-research/patterns/cross-pattern-properties/purchase-mechanics.md',
        tier: 'cross-pattern-property',
      },
    ],
  },
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
  themes: [
    { name: 'Antimatter Physics', isDefault: true, status: 'baked' },
    { name: 'Dreaming Lucidity', isDefault: false, status: 'spec-only' },
    { name: 'Civilisation Cycle', isDefault: false, status: 'spec-only' },
    { name: 'Signal Depth', isDefault: false, status: 'spec-only' },
  ],
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
  docPath: 'archetypes/scaler.md',
};
