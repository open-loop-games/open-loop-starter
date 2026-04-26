import type { ArchetypeManifest } from '@/types';

/**
 * Tug skeleton default is `metaProgressionEnabled: false` (Direct Strike
 * shape). Beat 7 reflects the counter-mastery-invariant branch of the doc's
 * bimodal closure; the meta-on `factionsUnlocked > 0` alternate is doc-side
 * authorial content for forks that flip the var.
 */
export const manifest: ArchetypeManifest = {
  id: 'tug',
  name: 'Tug — SciFi Armada',
  status: 'candidate',
  pitch:
    "Tug is the archetype where you and the opponent feed the same lane. You spend income on unit production; the units auto-walk toward the opponent's base; theirs auto-walk toward yours; when the two streams meet somewhere in the middle they resolve combat without commands, and the survivors keep walking. The front-line position drifts toward whichever side is losing DPS races, and the match ends when one base's HP reaches zero. The player's decisions are composition (what unit types to buy), timing (send now or bank for a larger wave), counter-reading (opponent just massed light armor — pivot to splash damage), and upgrade allocation (income upgrades now delay presence now but pay off later). Moment-to-moment APM is low by design; strategic depth lives in the composition decision space and in reading the opponent's output, since every unit they send is visible evidence of their intentions.",
  patterns: {
    required: [
      {
        label: 'Routing-Traversal',
        path: 'open-loop-research/patterns/tier-4-specialized/routing-traversal.md',
        tier: 'tier-4-specialized',
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
        label: 'Purchase Mechanics',
        path: 'open-loop-research/patterns/cross-pattern-properties/purchase-mechanics.md',
        tier: 'cross-pattern-property',
      },
    ],
    optional: [
      {
        label: 'Placement-Adjacency secondary axis',
        path: 'open-loop-research/patterns/tier-4-specialized/placement-adjacency.md',
        tier: 'tier-4-specialized',
      },
      {
        label: 'Defender hybrid (Hero Line Wars variant)',
        path: 'open-loop-research/LIBRARY.md',
        tier: 'tier-4-specialized',
      },
      {
        label: 'Meta-progression layer',
        path: 'open-loop-research/patterns/tier-0-universal/progression-systems.md',
        tier: 'tier-0-universal',
      },
    ],
  },
  primitives: [
    { name: 'createResource', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'chain.bind', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'calculateCost', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'createSequencer', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'runHeadless', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'withPersistentContext', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'createReset', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'tunable', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'createOverrideRegistry', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'createLoop', layer: 'systems', path: 'open-loop-engine/docs/api/INDEX.md' },
    {
      name: 'createPurchasableCategory',
      layer: 'systems',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    {
      name: 'createChallengeCategory',
      layer: 'systems',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    { name: 'runMatrixUntil', layer: 'harness', path: 'open-loop-engine/docs/api/INDEX.md' },
  ],
  beats: [
    { n: 1, label: 'First unit purchased', targetSimRange: [0, 60] },
    { n: 2, label: 'First auto-resolve combat observed', targetSimRange: [60, 180] },
    { n: 3, label: 'First counter-pivot', targetSimRange: [300, 900] },
    { n: 4, label: 'First match completion', targetSimRange: [900, 1800] },
    { n: 5, label: 'Second-match composition pivot', targetSimRange: [1800, 3000] },
    { n: 6, label: 'Counter-type mastery demonstrated', targetSimRange: [2700, 4500] },
    { n: 7, label: 'Counter-mastery invariant (arc closure)', targetSimRange: [3600, 7200] },
  ],
  themes: [
    { name: 'SciFi Armada', isDefault: true, status: 'baked' },
    { name: 'Fantasy Legion', isDefault: false, status: 'spec-only' },
    { name: 'Historical Warfare', isDefault: false, status: 'spec-only' },
    { name: 'Minimalist Abstract', isDefault: false, status: 'spec-only' },
  ],
  shell: 'TugFrameLayout',
  formFactor: 'desktop',
  exemplars: [
    {
      title: 'Direct Strike',
      analysisPath: 'open-loop-research/analyses/complete/direct-strike-analysis.md',
    },
    {
      title: 'Warfare 1917',
      analysisPath: 'open-loop-research/analyses/complete/warfare-1917-analysis.md',
    },
    {
      title: 'Legion TD 2',
      analysisPath: 'open-loop-research/analyses/complete/legion-td-2-analysis.md',
    },
  ],
  docPath: 'archetypes/tug.md',
};
