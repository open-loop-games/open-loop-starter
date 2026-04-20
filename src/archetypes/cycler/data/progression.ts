import type { CyclerBalance, CyclerProgression } from './types';

// ─── Skeleton ──────────────────────────────────────────────────────────────
// Three structural forks live here — editing any of these changes
// archetype-level behaviour, not just tuning. Forks edit this file in
// place.
//
//   PHASE_CYCLE_MODE
//     'day-night'           — diegetic day/night timer (Kingdom, Kingdom Two
//                             Crowns, 7 Days to Die calendar).
//     'round-timer'         — explicit round counter with build/defend labels
//                             (Thronefall, Dome Keeper, The Last Spell).
//     'continuous-interrupt'— soft phase boundary; enemies simply begin
//                             spawning while build continues (They Are
//                             Billions, The Riftbreaker, The King is
//                             Watching).
//
//   ENDGAME_MODE
//     'open-ended'          — cyclical forever until the fortress falls
//                             (Kingdom Classic, Thronefall free-play).
//     'campaign-closure'    — one-way macro terminator on top of the
//                             cyclical micro-loop; final wave ends the run
//                             (They Are Billions, 7 Days to Die, campaign
//                             Thronefall). Remains Cycler, not Phase-shifter.
//
//   PRESTIGE_MODE
//     'none'                — single run, no cross-run persistence.
//     'run-reset'           — run-end meta-currency grants permanent upgrades.
//     'campaign'            — persistent campaign-map node unlocks
//                             (Kingdom Two Crowns multi-playthrough arc).
//
// Default: round-timer / open-ended / run-reset — closest to the modern
// Thronefall-shape distilled exemplar.

export const PHASE_CYCLE_MODE: CyclerProgression['phaseCycleMode'] = 'round-timer';
export const ENDGAME_MODE: CyclerProgression['endgameMode'] = 'open-ended';
export const PRESTIGE_MODE: CyclerProgression['prestigeMode'] = 'run-reset';

export const DEFAULT_PROGRESSION: CyclerProgression = {
  phaseCycleMode: PHASE_CYCLE_MODE,
  endgameMode: ENDGAME_MODE,
  prestigeMode: PRESTIGE_MODE,
  metaUpgradeNodeCount: 6,
};

// ─── Balance ───────────────────────────────────────────────────────────────
// Cross-cutting economic + pacing constants. The phase-duration pair is
// the archetype's signature tuning lever (see cycler.md § 6
// `phase-duration-ratio` probe).

export const DEFAULT_BALANCE: CyclerBalance = {
  buildPhaseDurationSec: 90,
  defendPhaseDurationSec: 60,
  perCycleIncomeGrowth: 1.05,
  perCycleEnemyHpGrowth: 1.12,
  upgradeCostScaling: 2.5,
  adjacencyAuraStack: 'multiplicative',
  // campaignClosureCycle only consulted when endgameMode === 'campaign-closure'.
};
