/** @type {import('@open-loop/engine/scripts/lib/domain-extract.mjs').DomainMapConfig} */
export default {
  scope: ['data/*.ts'],
  defSuffixes: ['Def', 'Balance', 'Tier'],
  title: 'Cycler — domain language',
  description:
    'Phase-alternation over shared state: a saturating capacity ceiling D_max races an exogenous, time-scheduled burn W(t). The run ends — and pays out — at the crossing; prestige re-pegs W₀ = D_max/H so run length stays authored while reach climbs.',
  curated: [
    {
      term: 'burn',
      note: 'The exogenous pressure W(t) = W₀·g^((t−τ_setup)/T_g) — a pure function of run-time, never derived from within-run state. Its crossing of D_max ends the run.',
    },
    {
      term: 'the peg',
      note: 'W₀ = D_max / H. Because D_max/W₀ = H always, run length N* = τ_setup + T_g·log_g(H) is directly authored; a power upgrade re-baselines W₀ and adds zero run length (reach, not pacing).',
    },
    {
      term: 'headroom',
      note: 'H = D_max / W₀ — the difficulty constant. Sets run length directly; the peg holds it constant as D_max climbs.',
    },
    {
      term: 'burn tier',
      note: 'A reach-locked pace preset overriding (g, T_g). Deeper tiers raise g — a steeper escalation, a shorter/sharper run. The g-bender upgrade is the mirror lever that bends g back toward 1.',
    },
    {
      term: 'merge',
      note: 'The prestige boundary: on the crossing the run auto-banks sublinear Fragments (⌊∛production⌋ + ⌊∛endurance⌋), the player spends between runs, and the merge re-pegs for the next run.',
    },
  ],
};
