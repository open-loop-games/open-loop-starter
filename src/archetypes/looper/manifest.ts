import type { ArchetypeManifest } from '@/types';

export const manifest: ArchetypeManifest = {
  id: 'looper',
  name: 'Classic Adventuring',
  status: 'canonical',
  pitch:
    "Looper is the archetype where a run feels like a rehearsal. You queue up a sequence of actions inside a strictly limited time budget, watch the budget drain, and when it's gone the run ends — most of what you built resets, and a thin layer of permanent mastery carries to the next run. The compulsion loop is *next run I'll do it faster and further*, and over six or eight runs you start doing things you couldn't even reach on run one. The game is the diff between those runs.",
  patterns: {
    required: [
      {
        label: 'Loop/Cycle Systems',
        path: 'open-loop-research/patterns/tier-4-specialized/loop-mechanics/',
        tier: 'tier-4-specialized',
      },
      {
        label: 'Mastery Systems',
        path: 'open-loop-research/patterns/tier-3-moderate/mastery-systems.md',
        tier: 'tier-3-moderate',
      },
      {
        label: 'Activity Systems (duration-based variation)',
        path: 'open-loop-research/patterns/tier-0-universal/activity-systems/variations/',
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
        label: 'Unlock Requirements',
        path: 'open-loop-research/patterns/cross-pattern-properties/unlock-requirements.md',
        tier: 'cross-pattern-property',
      },
    ],
  },
  primitives: [
    { name: 'createResource', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'createSequencer', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'createSkillCategory', layer: 'systems', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'createZoneSystem', layer: 'systems', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'createLoop', layer: 'systems', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'createRetentionPolicy', layer: 'systems', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'createTimeSystem', layer: 'systems', path: 'open-loop-engine/docs/api/INDEX.md' },
  ],
  beats: [
    { n: 1, label: 'First action ticking, time budget visibly draining', targetSimRange: [0, 30] },
    { n: 2, label: 'First loop ends', targetSimRange: [120, 360] },
    { n: 3, label: 'First skill level within a run', targetSimRange: [360, 720] },
    { n: 4, label: 'First permanent retention visible between runs', targetSimRange: [720, 1320] },
    { n: 5, label: 'First zone unlock', targetSimRange: [1080, 1920] },
    {
      n: 6,
      label: 'First action-queue reorder to exploit retention',
      targetSimRange: [1920, 3300],
    },
    { n: 7, label: 'First automation tier unlock', targetSimRange: [3300, 5100] },
    {
      n: 8,
      label: 'Arc closure: retention compounding + final zone reachable',
      targetSimRange: [5100, 7200],
    },
  ],
  themes: [
    { name: 'Classic Adventuring', isDefault: true, status: 'baked' },
    { name: 'Dreaming Lucidity', isDefault: false, status: 'spec-only' },
    { name: 'Reincarnation', isDefault: false, status: 'spec-only' },
    { name: 'Groundhog Detective', isDefault: false, status: 'spec-only' },
  ],
  shell: 'ThreePanelShell',
  formFactor: 'desktop',
  exemplars: [
    {
      title: 'Idle Loops',
      analysisPath: 'open-loop-research/analyses/complete/idle-loops-analysis.md',
    },
    {
      title: 'Omsi Loops',
      analysisPath: 'open-loop-research/analyses/complete/omsi-loops-analysis.md',
    },
    {
      title: 'Increlution',
      analysisPath: 'open-loop-research/analyses/complete/increlution-analysis.md',
    },
    {
      title: 'Cavernous II',
      analysisPath: 'open-loop-research/analyses/complete/cavernous-ii-analysis.md',
    },
    {
      title: 'Progress Knight 2',
      analysisPath: 'open-loop-research/analyses/complete/progress-knight-2-analysis.md',
    },
  ],
};
