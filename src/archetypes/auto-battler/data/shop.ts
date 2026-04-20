import type { ShopConfig, InterestConfig } from './types';

// ─── Balance ───────────────────────────────────────────────────────────────
// Shop + interest constants. The interest-rate schedule is Auto-battler's
// distinguishing economic mechanic (absent in Packer / Defender / Survivor
// / Cycler skeletons) — +1 gold per 10 held, cap +5, matching the DAC / TFT
// canonical formula. SAP's +1-per-3-held variant is a per-fork override.
// `tier-gate-schedule` and `interest-rate-schedule` probes in
// auto-battler.md § 6 perturb these constants.

export const DEFAULT_SLOTS_PER_TIER = [3, 4, 4, 5, 5, 6];
export const DEFAULT_REROLL_COST = 2;
export const DEFAULT_SELL_VALUE_FRACTION = 0.5;
export const DEFAULT_SELL_STAR_BONUS = 1;
export const DEFAULT_INTEREST_PER_UNIT = 10;
export const DEFAULT_INTEREST_CAP = 5;

// Player-level XP gates. DAC canonical: [4, 8, 12, 18, 26, 36, 48, 64, 80].
// Each entry is the XP required to reach level N+1 from level N. Player
// levels gate unit-count-on-board.
const LEVEL_UP_XP_GATES: number[] = [4, 8, 12, 18, 26, 36, 48, 64, 80];

// Shared-pool copy depth per tier. DAC canonical ratios (rounded): tier-1
// ~45 copies, tier-2 ~30, tier-3 ~25, tier-4 ~15, tier-5 ~10, tier-6 ~5.
// Ignored when poolMode === 'private'.
const SHARED_POOL_DEPTH: number[] = [45, 30, 25, 15, 10, 5];

// ─── Skeleton ──────────────────────────────────────────────────────────────
// Single ShopConfig + InterestConfig — the skeleton ships one shape. Forks
// override per-field (slots-per-tier / reroll-cost / interest-rate) in
// place to retune economic pacing.

export const DEFAULT_SHOP: ShopConfig = {
  slotsPerTier: DEFAULT_SLOTS_PER_TIER,
  rerollCost: DEFAULT_REROLL_COST,
  sellValueFraction: DEFAULT_SELL_VALUE_FRACTION,
  sellStarBonus: DEFAULT_SELL_STAR_BONUS,
  levelUpXpGates: LEVEL_UP_XP_GATES,
  sharedPoolDepthByTier: SHARED_POOL_DEPTH,
};

export const DEFAULT_INTEREST: InterestConfig = {
  mode: 'streak-bonuses',
  goldPerInterestUnit: DEFAULT_INTEREST_PER_UNIT,
  cap: DEFAULT_INTEREST_CAP,
  // DAC win/loss streak bonuses — 2-streak +1, 5-streak +2, 10-streak +3.
  winStreakSchedule: [1, 2, 3],
  lossStreakSchedule: [1, 2, 3],
};
