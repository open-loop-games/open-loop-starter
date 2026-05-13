import type { ArchetypeManifest } from '@/types';

export const manifest: ArchetypeManifest = {
  id: 'looper',
  name: 'Classic Adventuring',
  status: 'canonical',
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
  themes: [{ name: 'Classic Adventuring', isDefault: true }],
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
