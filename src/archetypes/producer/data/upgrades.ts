import type { UpgradeDef } from './types';
import { PRODUCERS, CONTINUOUS_PRODUCER_IDS, CLICK_PRODUCER_ID } from './producers';

// ─── Balance ───────────────────────────────────────────────────────────────
// Per-producer upgrade costs scale with the producer's baseCost × tier multiplier.
// baseCost is derived from PRODUCERS (single source of truth) so workbench
// perturbations of producer cost flow through to upgrade cost automatically.
// Every upgrade grants ×2 on its target's rateChain (or headline, for globals).

const PER_PRODUCER_TIERS = [
  { suffix: 'i', multiplier: 20 },
  { suffix: 'ii', multiplier: 2000 },
  { suffix: 'iii', multiplier: 200_000 },
] as const;

// ─── Costume + Skeleton ────────────────────────────────────────────────────
// 21 per-producer upgrades + 6 global upgrades.

function buildPerProducerUpgrades(): UpgradeDef[] {
  const upgrades: UpgradeDef[] = [];
  for (const p of PRODUCERS) {
    if (p.trigger !== 'continuous' || !p.purchase) continue;
    const baseCost = Number(p.purchase.baseCost);
    for (const { suffix, multiplier } of PER_PRODUCER_TIERS) {
      upgrades.push({
        id: `${p.id}-boost-${suffix}`,
        name: `${p.name} Boost ${suffix.toUpperCase()}`,
        description: `${p.name} production ×2`,
        cost: baseCost * multiplier,
        targetProducerId: p.id,
        multiplier: 2,
      });
    }
  }
  return upgrades;
}

const PER_PRODUCER_UPGRADES: UpgradeDef[] = buildPerProducerUpgrades();

const GLOBAL_UPGRADES: UpgradeDef[] = [
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
  {
    id: 'global-x2',
    name: 'Family Recipe',
    description: 'All production ×2',
    cost: 1_000_000,
    targetProducerId: null,
    multiplier: 2,
  },
  {
    id: 'global-x4',
    name: 'Heirloom Oven',
    description: 'All production ×2',
    cost: 1_000_000_000,
    targetProducerId: null,
    multiplier: 2,
  },
  {
    id: 'global-x8',
    name: 'Eternal Hearth',
    description: 'All production ×2',
    cost: 1_000_000_000_000,
    targetProducerId: null,
    multiplier: 2,
  },
];

export const UPGRADES: UpgradeDef[] = [...PER_PRODUCER_UPGRADES, ...GLOBAL_UPGRADES];

/** T1 per-producer upgrades (first rung per producer) — used by the
 *  "all tier-1 upgrades bought" hidden achievement. */
export const TIER1_UPGRADE_IDS: string[] = CONTINUOUS_PRODUCER_IDS.map((id) => `${id}-boost-i`);
