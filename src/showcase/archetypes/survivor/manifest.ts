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
  // Declared invention, like tug's `TugFrameLayout` — a fullscreen floor with
  // the readouts pinned over it, and the between-runs record sheet as a
  // full-screen overlay. `subgenre-shell-mapping-2026.md` puts survivor-like at
  // `free-form` (2/2 classifiable; formally insufficient-corpus at that N, and
  // the third exemplar is consistent), so no `src/lib/shells/` entry fits.
  shell: 'ContainmentFloor',
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
