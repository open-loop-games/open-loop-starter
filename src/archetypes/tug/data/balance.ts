import type { TugBalance, TugTheme } from './types';

// ─── Skeleton ───
// `metaProgressionEnabled: false` is the Direct Strike skeleton-default
// posture. `opponentPersona.ai: 'counter'` matches the meta-default (PvE
// against a reactive composition-picker). `spatialMode: 'pure-routing'`
// and `laneCount: 1` pin the Direct Strike geometry; the with-placement-
// grid (Legion TD 2) and multi-lane (Warfare 1944) variants are fork
// toggles.
//
// `unitArchetypeCount` and `incomeUpgradeTiers` are length-of-array
// invariants — must match `units.ts` and `income.ts` array lengths.

// ─── Balance ───
// First-cut placeholders for ratio shape. Leaf 6 retunes via the Tier-C
// tuner against player-win-rate ∈ [0.4, 0.6] across 20-seed Monte Carlo
// (`ai-difficulty-symmetry` probe). Don't hand-tune here — every value
// below is a tuner perturbation surface.

export const TUG_BALANCE: TugBalance = {
  baseIncomeRate: 8,
  matchTimeLimitMinutes: 30,
  // Side-symmetric default. Player-facing difficulty knob, not a balance
  // lever — the AI's *behavior* (persona, decision quality) is the
  // difficulty axis, not its income.
  aiIncomeMultiplier: 1.0,
  aiSendCadenceSec: 4,
  metaProgressionEnabled: false,
  spendableAbilitiesEnabled: true,
  spatialMode: 'pure-routing',
  laneCount: 1,
  opponentPersona: { player: 'counter', ai: 'counter' },
  // Production is fully deterministic — predictable AI for the human
  // player. Sim builds (`buildTugSimEngine`) override to non-zero values
  // to break parameterized-vs-parameterized mirror stalemates per
  // composition-cookbook § Believability-calibration discipline.
  believability: { suboptimalityRate: 0, cadenceJitterScale: 0 },
  matchMode: 'pve',
  unitArchetypeCount: 6,
  incomeUpgradeTiers: 3,
};

// ─── Costume ───
// Theme C SciFi Armada: minerals as the resource, Terran/Protoss as the
// faction labels, Nexus as the fortress. Forks edit this constant in place.

export const TUG_THEME: TugTheme = {
  resourceName: { singular: 'mineral', plural: 'minerals' },
  factionNames: ['Terran', 'Protoss'],
  fortressName: 'Nexus',
};
