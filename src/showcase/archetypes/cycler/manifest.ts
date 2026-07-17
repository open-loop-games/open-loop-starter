import type { ArchetypeManifest } from '@/types';

/**
 * Cycler — a forward pattern-language composition (Phase-Alternation + Time
 * Systems + Placement-Adjacency + Wave-Escalation over shared state), carried by
 * a pegged-saturation rate-function spine. NOT a subtractive port; see
 * `IDENTITY.md` for the identity line and the load-bearing spine, and the
 * `studio/open-loop-starter#6` umbrella for the growth-port history.
 *
 * `beats` record the intra-run phase windows of the wave-indexed spine (Defense
 * Command): STANDBY↔INBOUND cycling to an OVERRUN breach, authored N*_waves =
 * log_g(H) + Δ_wall ≈ 7 waves at H=16, g=1.6/wave, 2 min/wave (~14 min, measured on
 * the reference forward-line board). The cross-run Reach arc carries no single-run
 * window — it is a per-Redeploy cadence, not a clock range — so it is listed without
 * `recordedSimRange` (honest, not incomplete).
 */
export const manifest: ArchetypeManifest = {
  id: 'cycler',
  name: 'Cycler — Defense Command',
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
      label: 'Standby — rebuild the grid in the grace window; the salvo has not bitten',
      recordedSimRange: [0, 120],
    },
    {
      n: 2,
      label: 'Comfortable — early salvos clear with margin; the Lances outpace the wave',
      recordedSimRange: [120, 480],
    },
    {
      n: 3,
      label: 'First bite — the salvo nears the clear-rate C; rearrangement starts to matter',
      recordedSimRange: [480, 720],
    },
    {
      n: 4,
      label:
        'Under review — leak-through drains the line buffer (the Δ_wall tail); the tension peak',
      recordedSimRange: [720, 840],
    },
    {
      n: 5,
      label: 'Overrun — the salvo breaches the line; the run ends and pays out (Redeploy)',
      recordedSimRange: [840, 840],
    },
    {
      n: 6,
      label: 'Reach — Redeploy re-pegs W₀=C/H at higher reach; deeper content, same run length',
    },
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
