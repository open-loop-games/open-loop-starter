import type { DefenderBalance, DefenderProgression } from './types';

// ─── Skeleton ──────────────────────────────────────────────────────────────
// `PRESTIGE_MODE` is a structural fork decision — editing this changes
// run-lifecycle behaviour, not just tuning. Three first-class shapes:
//   'none'       — single run, no cross-run persistence (Desktop Tower Defense).
//   'run-reset'  — run-end meta-currency grants permanent upgrades (BTD6 Monkey Knowledge, Kingdom Rush stars).
//   'campaign'   — campaign-map progression with persistent node unlocks (GemCraft wizard levels).
// Default: 'run-reset' — modern commercial Defender expectation. Forks
// change by editing this file in place.

export const PRESTIGE_MODE: DefenderProgression['prestigeMode'] = 'run-reset';

export const DEFAULT_PROGRESSION: DefenderProgression = {
  prestigeMode: PRESTIGE_MODE,
  metaUpgradeNodeCount: 6,
  // campaignNodeCount only consulted when prestigeMode === 'campaign'.
};

// ─── Balance ───────────────────────────────────────────────────────────────
// Cross-cutting economic constants. `adjacencyAuraStack` controls how
// multiple auras overlap on the same tower (see § 3 stress axis 2).

export const DEFAULT_BALANCE: DefenderBalance = {
  waveEndBountyBonus: 40,
  stageClearMetaReward: 3, // stars or equivalent
  upgradeCostScaling: 2.5,
  adjacencyAuraStack: 'multiplicative',
};
