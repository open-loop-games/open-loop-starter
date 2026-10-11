import type { ArchetypeManifest } from '@/types';

/**
 * Survivor — Wave Escalation + Cooldown-Rotation + Run-Scoped Upgrade Tree +
 * Cross-Run Meta. See `IDENTITY.md` for the composition and the spine.
 *
 * `beats` are measured, not authored: each window is the observed range across a
 * seed batch (`@/types` § BeatRef). `primitives` lists only surfaces the
 * archetype actually reaches; it grows as the modules land.
 */
export const manifest: ArchetypeManifest = {
  id: 'survivor',
  displayName: 'Survivor',
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
  // RECORDED from `balance/spread-probe.ts` § Beat windows — 16 seeds x 4 seats,
  // the full observed range across all 64 runs, never authored as tuning targets
  // (`@/types` § BeatRef). Definitions and the order's own correction are in
  // `balance/beats.ts`; re-record after anything that moves the escalation curve.
  beats: [
    {
      n: 1,
      label: 'Opening — the apparatus fires into an empty floor; the first draft commits nothing',
      recordedSimRange: [0, 0],
    },
    {
      n: 2,
      label: 'First contact — the floor gets a hand on you before the loadout is a loadout',
      recordedSimRange: [13, 49],
    },
    {
      n: 3,
      label: 'The loadout commits — a device is deep enough to be the one the run is about',
      recordedSimRange: [120, 360],
    },
    {
      n: 4,
      label: 'Halfway down — attrition has taken half the bar and disengaging starts to look right',
      recordedSimRange: [294, 1606],
    },
    {
      n: 5,
      label: 'The floor fills — bodies outpace the kill radius and collection starts costing',
      recordedSimRange: [780, 1560],
    },
    {
      n: 6,
      label: 'The floor closes — the run ends and the notes bank',
      recordedSimRange: [1145, 1800],
    },
  ],
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
