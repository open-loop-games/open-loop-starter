// ─── Port Citation ───────────────────────────────────────────────────────────
// Canonical: open-loop-research/reference-code/SynergismOfficial/src/Variables.ts
//   Variables.ts:15             runeexpbase (per-rune EXP-per-level schedule)
//   Variables.ts:44             costDivisor
//   Variables.ts:50             acceleratorPower (1.10)
//   Variables.ts:57             multiplierPower (2)
// Canonical: open-loop-research/reference-code/SynergismOfficial/src/Synergism.ts
//   Synergism.ts:3563-3565      prestigePointGain = floor((coinsThisPrestige / 1e12)^prestigePow)
//   Synergism.ts:3620           prestige threshold disjunction (1e16 OR PP gain ≥ 100)
// Canonical: open-loop-research/reference-code/SynergismOfficial/src/Reset.ts
//   Reset.ts:406                resetOfferings call site (every reset from first prestige onward)
// Canonical: open-loop-research/reference-code/SynergismOfficial/src/Calculate.ts
//   Calculate.ts:114-142        calculateOfferings shape (base + later-arc modifiers).
//                               First-arc port collapses to a constant base × SI.offeringMult.
// ─────────────────────────────────────────────────────────────────────────────

import type { ScalerBalance } from './types';

export const SCALER_BALANCE: ScalerBalance = {
  costDivisor: 1,
  acceleratorPower: 1.1,
  multiplierPower: 2,
  prestigeDivisor: 1e12,
  prestigePow: 0.5,
  prestigeThreshold: 1e16,
  prestigeGainFloor: 100,
  // Constant trickle of offerings per reset. Canonical sums an extensive
  // base (allBaseOfferingStats — challenge tiers, achievement rewards,
  // shop upgrades, ascension counter, etc.) — first-arc collapses to a
  // stand-in floor that the SI rune scales. Tuned for the discovery sim
  // to reach first sacrifice → first rune level inside the regression
  // budget; revisit when more of the canonical base gets ported.
  offeringBaseGain: 2,
  runeexpbase: [1, 4, 9, 16, 1000],
};
