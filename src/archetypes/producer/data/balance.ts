// ─── Balance ─────────────────────────────────────────────────────────────────
// Sources:
//   - `defaultCostScaling = 1.15`     → `priceFunc` closure on
//                                       `Game.Object` constructor
//                                       (`main.js:7982`).
//   - `tieredUpgradeMultiplier = 2`   → `Game.MakeTiered` wires ×2 into the
//                                       building's rate function on upgrade
//                                       purchase (`main.js:10145–10155`).
//   - `milestoneThresholds`           → Canonical non-cursor building tier
//                                       achievements fire at 1 / 50 / 100 /
//                                       … via the `productionAchievs[]`
//                                       system. Tighter byte anchoring lands
//                                       at leaf 2 when building callbacks
//                                       integrate.
//
// Declared inventions:
//   - `achievementRewardMultiplier`   → Direct per-achievement multiplier
//                                       (×1.02) in place of the canonical
//                                       milk/kitten chain (`main.js:5240`,
//                                       `:5256–5271`). Per spec § 5: the
//                                       full chain ports if kitten upgrades
//                                       enter first-arc scope. Default is
//                                       the conservative "every achievement
//                                       adds 2% to the headline" shape.
//   - `milestoneBonusPerTier`         → Per-tier multiplicative bonus the
//                                       per-building milestone series binds
//                                       into each producer's rateChain
//                                       (×1.10 per tier). Stand-in for the
//                                       canonical milk/kitten composition
//                                       at the per-producer scope.
// ─────────────────────────────────────────────────────────────────────────────

import type { ProducerBalance } from './types';

export const PRODUCER_BALANCE: ProducerBalance = {
  defaultCostScaling: 1.15,
  tieredUpgradeMultiplier: 2,
  achievementRewardMultiplier: 1.02,
  milestoneThresholds: [1, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600],
  milestoneBonusPerTier: 1.1,
};
