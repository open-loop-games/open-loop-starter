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

  // Default multiplicative grant per achievement into headline chain.
  // Synergism applies achievement rewards via `awardAchievement` → reward
  // function → modifier-chain factor (per-achievement reward varies; this
  // is the slim-port default for milestone-only achievements).
  achievementMultiplier: 1.02,

  // Default multiplicative grant per challenge completion. Synergism's
  // CalcECC at Challenges.ts:541 applies linear-stacking-with-softcap;
  // this is the per-completion linear factor at the slim-port scale.
  challengeCompletionMultiplier: 1.05,
};
