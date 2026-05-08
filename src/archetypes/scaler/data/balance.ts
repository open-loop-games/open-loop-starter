// ─── Port Citation ───────────────────────────────────────────────────────────
// Canonical: open-loop-research/reference-code/SynergismOfficial/src/Variables.ts
//   Variables.ts:44             costDivisor
//   Variables.ts:50             acceleratorPower (1.10)
//   Variables.ts:57             multiplierPower (2)
// Canonical: open-loop-research/reference-code/SynergismOfficial/src/Synergism.ts
//   Synergism.ts:3563-3565      prestigePointGain = floor((coinsThisPrestige / 1e12)^prestigePow)
//   Synergism.ts:3620           prestige threshold disjunction (1e16 OR PP gain ≥ 100)
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
};
