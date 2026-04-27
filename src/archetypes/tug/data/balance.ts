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
  baseIncomeRate: 5,
  matchTimeLimitMinutes: 30,
  // Calibrated against the sim default pair (counter player vs greed AI)
  // by `pnpm balance:tune:tug` — bisection converged on 0.711 with
  // playerScore = 0.500 (matches stalemate to time-limit at 50% rate;
  // deterministic bots produce a step transition through this band).
  // OL-711 closure 2026-04-27. Production AI runs `counter` persona at
  // this multiplier — counter-vs-human play has not been simulated, so
  // this value is a difficulty-knob baseline, not a tuned target.
  aiIncomeMultiplier: 0.711,
  aiSendCadenceSec: 4,
  metaProgressionEnabled: false,
  spendableAbilitiesEnabled: true,
  spatialMode: 'pure-routing',
  laneCount: 1,
  opponentPersona: { player: 'counter', ai: 'counter' },
  matchMode: 'pve',
  unitArchetypeCount: 6,
  incomeUpgradeTiers: 3,
};

// ─── Costume ───
// Theme C SciFi Armada: minerals as the resource, Terran/Protoss as the
// faction labels, Nexus as the fortress. Forks override via
// `applyTugOverrides({ theme: { ... } })`.

export const TUG_THEME: TugTheme = {
  resourceName: { singular: 'mineral', plural: 'minerals' },
  factionNames: ['Terran', 'Protoss'],
  fortressName: 'Nexus',
};
