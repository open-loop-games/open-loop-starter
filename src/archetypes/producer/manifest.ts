import type { ArchetypeManifest } from '@/types';

export const manifest: ArchetypeManifest = {
  id: 'producer',
  name: 'Bakery',
  status: 'canonical',
  pitch:
    "Producer is the archetype every incremental player already understands within thirty seconds. You click a thing. A number goes up. You spend the number on something that increases the number by itself. Before long you stop clicking and watch the number grow, checking in to buy the next producer tier and the next multiplier upgrade. The texture of play is pacing against a curve: costs rise faster than production, so each tier feels unreachable until it isn't, and then it's trivial and you're already saving for the next one.",
  patterns: {
    required: [
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
      {
        label: 'Achievement Systems',
        path: 'open-loop-research/patterns/tier-1-foundation/achievement-systems.md',
        tier: 'tier-1-foundation',
      },
    ],
    crossProperties: [
      {
        label: 'Purchase Mechanics',
        path: 'open-loop-research/patterns/cross-pattern-properties/purchase-mechanics.md',
        tier: 'cross-pattern-property',
      },
      {
        label: 'Cost Scaling',
        path: 'open-loop-research/patterns/cross-pattern-properties/cost-scaling.md',
        tier: 'cross-pattern-property',
      },
      {
        label: 'Modifier Chains',
        path: 'open-loop-research/patterns/cross-pattern-properties/modifier-chains.md',
        tier: 'cross-pattern-property',
      },
      {
        label: 'Quantity Tracking',
        path: 'open-loop-research/patterns/cross-pattern-properties/quantity-tracking.md',
        tier: 'cross-pattern-property',
      },
      {
        label: 'Scaling Formulas',
        path: 'open-loop-research/patterns/cross-pattern-properties/scaling-formulas.md',
        tier: 'cross-pattern-property',
      },
    ],
    optional: [
      {
        label: 'Single-tier Prestige',
        path: 'open-loop-research/LIBRARY.md',
        tier: 'tier-1-foundation',
      },
      {
        label: 'Softcapping',
        path: 'open-loop-research/patterns/cross-pattern-properties/softcapping.md',
        tier: 'cross-pattern-property',
      },
    ],
  },
  primitives: [
    { name: 'createResource', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'createModifierChain', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'calculateMaxAffordable', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
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
      name: 'createAchievementCategory',
      layer: 'systems',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    {
      name: 'createTieredAchievement',
      layer: 'systems',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    {
      name: 'getCombinedAchievementEffect',
      layer: 'systems',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    { name: 'runHeadless', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'runMatrix', layer: 'harness', path: 'open-loop-engine/docs/api/INDEX.md' },
  ],
  beats: [
    { n: 1, label: 'First click production visible', targetSimRange: [0, 30] },
    { n: 2, label: 'First producer purchased (T1)', targetSimRange: [60, 180] },
    { n: 3, label: 'Second-tier producer purchased (T2)', targetSimRange: [300, 600] },
    { n: 4, label: 'First multiplier upgrade', targetSimRange: [720, 1200] },
    { n: 5, label: 'First achievement-driven multiplier', targetSimRange: [1500, 2400] },
    { n: 6, label: 'Bulk-buy becomes meaningful', targetSimRange: [2400, 3900] },
    { n: 7, label: 'Deep modifier chain visible', targetSimRange: [3900, 5700] },
  ],
  themes: [
    { name: 'Bakery', isDefault: true, status: 'baked' },
    { name: 'Reef Reclamation', isDefault: false, status: 'spec-only' },
    { name: 'Signal Farm', isDefault: false, status: 'spec-only' },
    { name: 'Paper Mill', isDefault: false, status: 'spec-only' },
  ],
  shell: 'ThreePanelShell',
  formFactor: 'desktop',
  exemplars: [
    {
      title: 'Cookie Clicker',
      analysisPath: 'open-loop-research/analyses/complete/cookie-clicker-analysis.md',
    },
    {
      title: 'AdVenture Capitalist',
      analysisPath: 'open-loop-research/analyses/complete/adventure-capitalist-analysis.md',
    },
    {
      title: 'Derivative Clicker',
      analysisPath: 'open-loop-research/analyses/complete/derivative-clicker-analysis.md',
    },
  ],
  docPath: 'archetypes/producer.md',
};
