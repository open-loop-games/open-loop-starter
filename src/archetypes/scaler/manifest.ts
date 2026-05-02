import type { ArchetypeManifest } from '@/types';

export const manifest: ArchetypeManifest = {
  id: 'scaler',
  name: 'Scaler',
  status: 'candidate',
  pitch:
    'Scaler is the archetype where the game you played an hour ago becomes a footnote. You buy producers, costs scale, a number climbs — familiar Producer shape. Then you hit a prestige threshold and ascend: everything you built resets, and in exchange you get a new currency, a new upgrade tree, and a multiplier that makes your next run minutes instead of hours. A few runs later there is a second layer on top of the first, with its own currency and its own reset scope that wipes the first layer too. Eventually a third. Each layer compresses the one below it until what took an hour takes seconds, and the headline multiplier scrolls past 1e12, then 1e120, every digit a deliberate composition you designed yourself.',
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
    { name: 'createModifierChain', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    {
      name: 'createMultiplicativeModifier',
      layer: 'core',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    { name: 'createReset', layer: 'systems', path: 'open-loop-engine/docs/api/INDEX.md' },
    {
      name: 'createCumulativeConversion',
      layer: 'systems',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    { name: 'createLogFormula', layer: 'systems', path: 'open-loop-engine/docs/api/INDEX.md' },
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
    {
      name: 'createScalingPurchasable',
      layer: 'systems',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    {
      name: 'createAchievementCategory',
      layer: 'systems',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    {
      name: 'createChallengeCategory',
      layer: 'systems',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
  ],
  beats: [
    { n: 1, label: 'First antimatter producer purchased', targetSimRange: [0, 60] },
    { n: 2, label: 'First Accelerator level', targetSimRange: [60, 240] },
    { n: 3, label: 'First Prestige', targetSimRange: [600, 1200] },
    { n: 4, label: 'First Crystal upgrade', targetSimRange: [1200, 1800] },
    { n: 5, label: 'First diamond producer purchased', targetSimRange: [1800, 2700] },
    { n: 6, label: 'First Transcend', targetSimRange: [3000, 4500] },
    { n: 7, label: 'First Challenge entered', targetSimRange: [4500, 5400] },
    { n: 8, label: 'Three-layer chain visible (10+ factors)', targetSimRange: [5400, 7200] },
  ],
  themes: [{ name: 'Synergism (slim port)', isDefault: true, status: 'baked' }],
  shell: 'SidebarMainShell',
  formFactor: 'desktop',
  exemplars: [
    {
      title: 'Antimatter Dimensions',
      analysisPath: 'open-loop-research/analyses/complete/antimatter-dimensions-analysis.md',
    },
    {
      title: 'Synergism',
      analysisPath: 'open-loop-research/analyses/complete/synergism-analysis.md',
    },
    {
      title: 'NGU Idle',
      analysisPath: 'open-loop-research/analyses/complete/ngu-idle-analysis.md',
    },
  ],
  docPath: 'archetypes/scaler.md',
};
