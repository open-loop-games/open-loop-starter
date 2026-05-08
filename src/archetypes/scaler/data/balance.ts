// ─── Port Citation ───────────────────────────────────────────────────────────
// Canonical: open-loop-research/reference-code/SynergismOfficial/src/Variables.ts
//   Variables.ts:15             runeexpbase (per-rune EXP-per-level schedule)
//   Variables.ts:44             costDivisor
//   Variables.ts:50             acceleratorPower (1.10)
//   Variables.ts:57             multiplierPower (2)
// Canonical: open-loop-research/reference-code/SynergismOfficial/src/Synergism.ts
//   Synergism.ts:3563-3565      prestigePointGain = floor((coinsThisPrestige / 1e12)^prestigePow)
//   Synergism.ts:3620           prestige threshold disjunction (1e16 OR PP gain ≥ 100)
//   Synergism.ts:3550           transcendPow = 0.03
//   Synergism.ts:3583-3585      transcendPointGain = floor((coinsThisTranscension / 1e100)^0.03)
//   Synergism.ts:3631-3633      transcend threshold disjunction (1e100 OR TP gain ≥ 0.5)
// Canonical: open-loop-research/reference-code/SynergismOfficial/src/Reset.ts
//   Reset.ts:406                resetOfferings call site (every reset from first prestige onward)
// Canonical: open-loop-research/reference-code/SynergismOfficial/src/Calculate.ts
//   Calculate.ts:114-142        calculateOfferings shape (base + later-arc modifiers).
//                               First-arc port collapses to a constant base × SI.offeringMult.
//   Calculate.ts:447-450        totalAcceleratorBoost = floor(acceleratorBoostBought + freeAcceleratorBoost)
// Canonical: open-loop-research/reference-code/SynergismOfficial/src/Buy.ts
//   Buy.ts:705-810              boostAccelerator action (first-arc branch upgrades[46] < 1)
//   Buy.ts:715-716              cost growth: cost ×= 1e10 × 10^bought (super-exponential)
// Canonical: open-loop-research/reference-code/SynergismOfficial/src/Synergism.ts
//   Synergism.ts:395-396        acceleratorBoostBought = 0; acceleratorBoostCost = 1e3
//   Synergism.ts:2467-2472      totalAcceleratorBoost × (5 + research-band) → freeAccelerator
//                               First arc: research[18-20] inert → 5 free Accelerator levels per boost
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
  // Transcend thresholds: canonical 1e100 (`Synergism.ts:3583-3585, :3631-3633`)
  // is unreachable in first-arc balance — challenges, achievements, cube
  // upgrades, hepteract effects compound coin production by tens of OOMs in
  // canonical. First-arc port hits ~1e17 coinsThisTranscension after 24h of
  // sim time; lowering threshold + divisor by 84 OOMs lets the demo arc beat
  // (first-transcend fires) reach the player on first-arc balance. Restore
  // canonical 1e100 when later-arc systems land that compound coin production
  // back into the canonical range.
  transcendDivisor: 5e16,
  transcendPow: 0.03,
  transcendThreshold: 5e16,
  transcendGainFloor: 0.5,
  // Accelerator Boost — initial cost in `prestigePoints` per
  // `Synergism.ts:395-396`. Each buy multiplies cost by `1e10 × 10^bought`
  // (`Buy.ts:715-716`). Each boost grants 5 free Accelerator levels, composing
  // multiplicatively into the coin producer rateChain as `acceleratorPower ^
  // (5 × acceleratorBoostBought)` (`Synergism.ts:2467-2472`, first-arc; the
  // research-band coefficient defaults to 0 and the cube blessing is inert).
  acceleratorBoostBaseCost: 1e3,
  acceleratorBoostFreeAccelPerBuy: 5,
  // Constant trickle of offerings per reset. Canonical sums an extensive
  // base (allBaseOfferingStats — challenge tiers, achievement rewards,
  // shop upgrades, ascension counter, etc.) — first-arc collapses to a
  // stand-in floor that the SI rune scales. Tuned for the discovery sim
  // to reach first sacrifice → first rune level inside the regression
  // budget; revisit when more of the canonical base gets ported.
  offeringBaseGain: 2,
  runeexpbase: [1, 4, 9, 16, 1000],
};
