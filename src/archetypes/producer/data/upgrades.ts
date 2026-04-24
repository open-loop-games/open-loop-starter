import type { UpgradeDef } from './types';
import {
  PRODUCERS,
  PRODUCER_BALANCE,
  CONTINUOUS_PRODUCER_IDS,
  CLICK_PRODUCER_ID,
} from './producers';

// ─── Balance ───────────────────────────────────────────────────────────────
// Per-producer upgrade costs scale with the producer's baseCost × cost-multiplier.
// baseCost is derived from PRODUCERS (single source of truth) so workbench
// perturbations of producer cost flow through to upgrade cost automatically.
// Each tier has its own rate multiplier — tier-ii is ×3 (the "big upgrade"
// rung), the others ×2.
//
// Tier-i's multiplier lives in PRODUCER_BALANCE.tier1UpgradeMultiplier — it's
// the balance-solver's knob for beat-4. Runtime scope-push retunes it via
// `tunable('balance/tier1UpgradeMultiplier', ...)` inside
// `modules/upgrades.ts`; the static cost here is the default / data-file view.
//
// Tiers in-arc: i, ii, iia. Tier-iii is post-arc per producer.md § 4.

const PER_PRODUCER_TIERS = [
  { suffix: 'i', costMul: Number(PRODUCER_BALANCE.tier1UpgradeMultiplier), rateMul: 2 },
  { suffix: 'ii', costMul: 2000, rateMul: 3 },
  { suffix: 'iia', costMul: 20_000, rateMul: 2 },
  { suffix: 'iii', costMul: 200_000, rateMul: 2 },
];

// ─── Costume + Skeleton ────────────────────────────────────────────────────
// 28 per-producer upgrades (4 tiers × 7 producers) + 8 global upgrades.
// Top-producer rateChain ceiling with full in-arc set:
//   per-producer (i+ii+iia) = 2 × 3 × 2 = 12×
//   globals on production   = 2 × 3 × 4 × 4 × 5 = 480×
//   milestones (bonus 5, 3 tiers fired at count 25) = 5³ = 125×
//   achievements            ≈ 1.5× (partial set in-arc)
//   total ≈ 1.08M× — matches beat-7's 1e6× signature.

function buildPerProducerUpgrades(): UpgradeDef[] {
  const upgrades: UpgradeDef[] = [];
  for (const p of PRODUCERS) {
    if (p.trigger !== 'continuous' || !p.purchase) continue;
    const baseCost = Number(p.purchase.baseCost);
    for (const { suffix, costMul, rateMul } of PER_PRODUCER_TIERS) {
      upgrades.push({
        id: `${p.id}-boost-${suffix}`,
        name: `${p.name} Boost ${suffix.toUpperCase()}`,
        description: `${p.name} production ×${rateMul}`,
        cost: baseCost * costMul,
        targetProducerId: p.id,
        multiplier: rateMul,
      });
    }
  }
  return upgrades;
}

const PER_PRODUCER_UPGRADES: UpgradeDef[] = buildPerProducerUpgrades();

const GLOBAL_UPGRADES: UpgradeDef[] = [
  // Click ladder — each rung ×2 click yield. Not on production chain.
  {
    id: 'click-x2',
    name: 'Golden Whisk',
    description: 'Click yield ×2',
    cost: 100,
    targetProducerId: CLICK_PRODUCER_ID,
    multiplier: 2,
  },
  {
    id: 'click-x4',
    name: 'Silver Tray',
    description: 'Click yield ×2',
    cost: 10_000,
    targetProducerId: CLICK_PRODUCER_ID,
    multiplier: 2,
  },
  {
    id: 'click-x8',
    name: 'Obsidian Rolling Pin',
    description: 'Click yield ×2',
    cost: 1_000_000,
    targetProducerId: CLICK_PRODUCER_ID,
    multiplier: 2,
  },
  // Global-production ladder. Rate multiplier grows with cost — late rungs
  // are the archetype-signature big compounding moments. Cumulative factor
  // on top producer: 2 × 3 × 4 × 4 × 5 = 480×. Suffix on id is cumulative.
  {
    id: 'global-x2',
    name: 'Family Recipe',
    description: 'All production ×2',
    cost: 100_000,
    targetProducerId: null,
    multiplier: 2,
  },
  {
    id: 'global-x6',
    name: 'Heirloom Oven',
    description: 'All production ×3',
    cost: 10_000_000,
    targetProducerId: null,
    multiplier: 3,
  },
  {
    id: 'global-x24',
    name: 'Eternal Hearth',
    description: 'All production ×4',
    cost: 1_000_000_000,
    targetProducerId: null,
    multiplier: 4,
  },
  {
    id: 'global-x96',
    name: 'Celestial Dough',
    description: 'All production ×4',
    cost: 100_000_000_000,
    targetProducerId: null,
    multiplier: 4,
  },
  {
    id: 'global-x480',
    name: 'Cosmic Yeast',
    description: 'All production ×5',
    // Capstone cost — gates beat-8 (ArcKey.complete) past beat-7's headline
    // climax. At current plateau rate the jump from global-x96 (100B) buys
    // 15–30min of post-climax accumulation before the arc closes, matching
    // producer.md § 4's 95–120min window.
    cost: 100_000_000_000_000,
    targetProducerId: null,
    multiplier: 5,
  },
];

export const UPGRADES: UpgradeDef[] = [...PER_PRODUCER_UPGRADES, ...GLOBAL_UPGRADES];

/** T1 per-producer upgrades (first rung per producer) — used by the
 *  "all tier-1 upgrades bought" hidden achievement. */
export const TIER1_UPGRADE_IDS: string[] = CONTINUOUS_PRODUCER_IDS.map((id) => `${id}-boost-i`);
