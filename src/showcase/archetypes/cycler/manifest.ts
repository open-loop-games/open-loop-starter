import type { ArchetypeManifest } from '@/types';

/**
 * Cycler — a forward pattern-language composition (Phase-Alternation + Time
 * Systems + Placement-Adjacency + Wave-Escalation over shared state), carried by
 * a pegged-saturation rate-function spine. NOT a subtractive port; see
 * `IDENTITY.md` for the identity line and the load-bearing spine, and the
 * `studio/open-loop-starter#6` umbrella for the growth-port history.
 *
 * `beats` record the intra-run phase windows measured from the tier-0 probe (the
 * authored N* ≈ 16 min at H=4, g=2, T_g=6, τ_setup=4). The cross-run Reach arc
 * carries no single-run window — it is a per-merge cadence, not a clock range —
 * so it is listed without `recordedSimRange` (honest, not incomplete).
 */
export const manifest: ArchetypeManifest = {
  id: 'cycler',
  name: 'Cycler — Containment',
  primitives: [
    { name: 'persistent', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'createResource', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'integerRoot', layer: 'primitives', path: 'open-loop-engine/docs/api/INDEX.md' },
    {
      name: 'createPurchasableCategory',
      layer: 'systems',
      path: 'open-loop-engine/docs/api/INDEX.md',
    },
    { name: 'createCostRequirement', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
    { name: 'createBooleanRequirement', layer: 'core', path: 'open-loop-engine/docs/api/INDEX.md' },
  ],
  beats: [
    {
      n: 1,
      label: 'Setup — rebuild in the grace window; the burn has not bitten',
      recordedSimRange: [0, 240],
    },
    {
      n: 2,
      label: 'Comfortable — capacity clears the burn with margin',
      recordedSimRange: [240, 600],
    },
    {
      n: 3,
      label: 'First bite — burn crosses ~half the ceiling; rearrangement matters',
      recordedSimRange: [600, 876],
    },
    {
      n: 4,
      label: 'Under review — burn approaches the ceiling; the tension peak',
      recordedSimRange: [876, 960],
    },
    {
      n: 5,
      label: 'Merge bell — burn overtakes D_max; the run ends and pays out',
      recordedSimRange: [960, 960],
    },
    { n: 6, label: 'Reach — prestige re-pegs at higher D_max; deeper content, same run length' },
  ],
  shell: 'SidebarMainShell',
  formFactor: 'responsive',
  exemplars: [
    {
      title: 'Thronefall',
      analysisPath: 'open-loop-research/analyses/complete/thronefall-analysis.md',
    },
    {
      title: 'Kingdom Two Crowns',
      analysisPath: 'open-loop-research/analyses/complete/kingdom-two-crowns-analysis.md',
    },
    {
      title: 'Increlution',
      analysisPath: 'open-loop-research/analyses/complete/increlution-analysis.md',
    },
  ],
};
