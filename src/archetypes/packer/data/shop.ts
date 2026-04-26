import type { ShopConfig } from './types';

// ─── Balance ───────────────────────────────────────────────────────────────
// Shop constants. Slot counts and reroll-cost schedule follow the Backpack
// Battles shape — 5–6 slots baseline, reroll escalating 1 → 2 → 3 within a
// single round. Sell-back at half of purchase price is the corpus standard.
//
// Packer's skeleton deliberately leaves `interestPerUnit` unset: the
// interest-bearing round economy is Auto-battler's distinguishing mechanic;
// Packer forks that want Backpack Battles' small interest variant
// can set `interestPerUnit: 3` and `interestCap: 2` or similar.

export const DEFAULT_SLOTS_PER_ROUND = [4, 5, 5, 6, 6];
export const DEFAULT_REROLL_COST_SCHEDULE = [1, 2, 3];
export const DEFAULT_SELL_VALUE_FRACTION = 0.5;

// ─── Skeleton ──────────────────────────────────────────────────────────────
// Single ShopConfig — the skeleton ships one shop shape. Forks override
// per-field (slots-per-round, reroll-cost-schedule, sell-value-fraction) in
// place to retune acquisition pacing without touching the module layer.

export const DEFAULT_SHOP: ShopConfig = {
  slotsPerRound: DEFAULT_SLOTS_PER_ROUND,
  rerollCostSchedule: DEFAULT_REROLL_COST_SCHEDULE,
  sellValueFraction: DEFAULT_SELL_VALUE_FRACTION,
  // interestPerUnit / interestCap deliberately unset for skeleton parity
  // with Auto-battler separation (see comment above).
};
