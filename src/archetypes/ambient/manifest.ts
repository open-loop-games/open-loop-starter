import type { ArchetypeManifest } from '@/types';

export const manifest: ArchetypeManifest = {
  id: 'ambient',
  name: 'Cozy Farm',
  status: 'candidate',
  pitch:
    "Ambient is the archetype the player does not play so much as keep. You open it once in the morning, glance at it while a pot boils, check it on the way back from a meeting, let it run at the edge of a monitor for an afternoon. Resources accumulate whether you are watching or not. Nothing expires. No wave is about to overrun your defenses. No cooldown queue is about to waste. The game has committed mechanically to never punishing absence — Loop 9 (Enemy Scaling) and strict Loop 14 (Cooldown urgency) are deliberately missing, not merely absent. What remains is Loop 2 (Idle Production) and Loop 7 (Auto-Production), a slowly unfolding unlock tree, and optional softened prestige. The player's relationship to the game is companionship, not engagement: the game lives on the desktop the way a plant lives on a desk.",
  patterns: {
    required: [
      {
        label: 'Ambient Progression',
        path: 'open-loop-research/patterns/tier-3-moderate/ambient-progression.md',
        tier: 'tier-3-moderate',
      },
      {
        label: 'Activity Systems (auto-production variation)',
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
        label: 'Automation',
        path: 'open-loop-research/patterns/cross-pattern-properties/automation.md',
        tier: 'cross-pattern-property',
      },
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
        label: 'Quantity Tracking',
        path: 'open-loop-research/patterns/cross-pattern-properties/quantity-tracking.md',
        tier: 'cross-pattern-property',
      },
    ],
    optional: [
      {
        label: 'Softened single-tier Prestige',
        path: 'open-loop-research/LIBRARY.md',
        tier: 'tier-1-foundation',
      },
      {
        label: 'Time Systems',
        path: 'open-loop-research/patterns/tier-1-foundation/time-systems.md',
        tier: 'tier-1-foundation',
      },
    ],
  },
  primitives: [
    { name: 'createResource', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'runHeadless', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    {
      name: 'createProducerCategory',
      layer: 'systems',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    { name: 'createLoop', layer: 'systems', path: 'open-loop-engine/docs/api/INDEX.md' },
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
    { name: 'createReset', layer: 'systems', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'runMatrix', layer: 'harness', path: 'open-loop-engine/docs/api/INDEX.md' },
  ],
  beats: [
    { n: 1, label: 'First passive production visible', targetSimRange: [0, 30] },
    { n: 2, label: 'First auto-producer purchased (T1)', targetSimRange: [60, 180] },
    { n: 3, label: 'First visibility unlock revealed', targetSimRange: [1800, 5400] },
    { n: 4, label: 'Glance-check value proposition proven', targetSimRange: [5400, 10800] },
    { n: 5, label: 'Mid-arc scene diversification', targetSimRange: [10800, 18000] },
    { n: 6, label: 'First low-urgency achievement multiplier', targetSimRange: [18000, 28800] },
  ],
  themes: [
    { name: 'Cozy Farm', isDefault: true, status: 'baked' },
    { name: 'Aquarium', isDefault: false, status: 'spec-only' },
    { name: 'Lo-Fi Companion', isDefault: false, status: 'spec-only' },
    { name: 'Minimalist Text', isDefault: false, status: 'spec-only' },
  ],
  shell: 'SingleColumnShell',
  formFactor: 'desktop',
  exemplars: [
    {
      title: 'Cookie Clicker',
      analysisPath: 'open-loop-research/analyses/complete/cookie-clicker-analysis.md',
    },
    {
      title: 'Candy Box',
      analysisPath: 'open-loop-research/analyses/complete/candy-box-analysis.md',
    },
    {
      title: 'A Dark Room',
      analysisPath: 'open-loop-research/analyses/complete/a-dark-room-analysis.md',
    },
    {
      title: 'Trimps',
      analysisPath: 'open-loop-research/analyses/complete/trimps-analysis.md',
    },
    {
      title: 'Realm Grinder',
      analysisPath: 'open-loop-research/analyses/complete/realm-grinder-analysis.md',
    },
  ],
  docPath: 'archetypes/ambient.md',
};
