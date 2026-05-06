import type { ScalerBalance } from './types';

// ─── Balance ───────────────────────────────────────────────────────────────
// Cross-tier numeric anchors. Per-tier numbers (producer baseCosts, crystal
// upgrade cost arrays, challenge thresholds) live in their tier's file —
// keep this file to constants that reach across all 3 tiers.
//
// All values cited from Synergism source. Slim-port preserves canonical
// magnitudes 1:1; per `BALANCING.md § Canonical numbers are not tunable`,
// these are not solver-perturbation surface.

export const SCALER_BALANCE: ScalerBalance = {
  // vanilla canonical: SynergismOfficial/src/Calculate.ts:2454
  // prestigePointGain = floor(log(prestigePoints + 1, 1e25))
  prestigeConversionLog: 1e25,

  // vanilla canonical: SynergismOfficial/src/Calculate.ts:2460
  // transcendPointGain = floor(log(transcendShards + 1, 10))
  transcendConversionLog: 10,

  // Multiplicative grant per achievement into the per-tier rate chain
  // (modules/achievements.ts folds the active set via
  // `getCombinedAchievementEffect`). Declared-invention surface per
  // `balance/shape.ts` SCALER_SUBSYSTEMS antimatter inventionKnobs;
  // calibrated by sub-leaf C's solver pass against the autobuyer-driven
  // sim (beat-2 lands at 1m08s in the 15s-2min window). The magnitude is
  // large because the autobuyer's producer-vs-upgrade competition forces
  // a high per-achievement reward to land beat-2 in window — see
  // `archetypes/scaler.balance.md` for the structural finding.
  achievementMultiplier: 42.347,

  // Default multiplicative grant per challenge completion. Synergism's
  // CalcECC at Challenges.ts:541 applies linear-stacking-with-softcap;
  // this is the per-completion linear factor at the slim-port scale.
  // Sub-leaf E (ECC softcap) calibrates this against the autobuyer-driven
  // sim; sub-leaf C leaves it at the unperturbed default.
  challengeCompletionMultiplier: 1.05,
};
