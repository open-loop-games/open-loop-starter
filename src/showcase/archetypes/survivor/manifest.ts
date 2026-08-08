import type { ArchetypeManifest } from '@/types';

/**
 * Survivor — Wave Escalation + Cooldown-Rotation + Run-Scoped Upgrade Tree +
 * Cross-Run Meta. See `IDENTITY.md` for the composition and the spine.
 *
 * `beats` stays empty until the probes measure it: a beat window is recorded
 * from a run, never authored as a tuning target (`@/types` § BeatRef).
 * `primitives` lists only surfaces the archetype actually reaches; it grows as
 * the modules land.
 */
export const manifest: ArchetypeManifest = {
  id: 'survivor',
  name: 'Survivor',
  primitives: [
    { name: 'createSpatialGrid', layer: 'core', path: 'open-loop-engine/src/core/spatial/grid.ts' },
    {
      name: 'createTuningRegistry',
      layer: 'core',
      path: 'open-loop-engine/src/core/override-registry.ts',
    },
    { name: 'createResource', layer: 'core', path: 'open-loop-engine/src/core/resource.ts' },
    {
      name: 'createCostRequirement',
      layer: 'core',
      path: 'open-loop-engine/src/core/requirements.ts',
    },
    {
      name: 'createPurchasableCategory',
      layer: 'systems',
      path: 'open-loop-engine/src/systems/purchasable-category.ts',
    },
    {
      name: 'createSeededRNG',
      layer: 'primitives',
      path: 'open-loop-engine/src/primitives/rng.ts',
    },
  ],
  // Windows are RECORDED from a probe run, never authored as tuning targets
  // (`@/types` § BeatRef). The arena probe currently reports runs finishing 5–19
  // beats short of the authored schedule, so recording windows now would pin a
  // calibration that is still moving. They land when the spread settles.
  beats: [],
  shell: 'SingleColumnShell',
  formFactor: 'desktop',
  exemplars: [
    {
      title: 'Vampire Survivors',
      analysisPath: 'open-loop-research/analyses/complete/vampire-survivors-analysis.md',
    },
    {
      title: 'Brotato',
      analysisPath: 'open-loop-research/analyses/complete/brotato-analysis.md',
    },
    {
      title: 'Halls of Torment',
      analysisPath: 'open-loop-research/analyses/complete/halls-of-torment-analysis.md',
    },
  ],
};
