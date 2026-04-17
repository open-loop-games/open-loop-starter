/**
 * Tiny Civilization — pure data tables.
 *
 * No engine imports. Zone defs and starting constants for the 5b skeleton.
 * Later subtasks grow this file with building defs (5d), recipe defs (5e),
 * and tech defs (5f).
 *
 * Source posture: synthesis archetype. No external fidelity anchor — all
 * constants are tunable in-place during 5b–5f playtest.
 */

/**
 * Zone roster across all three eras. Matches the engine's `ZoneDef` shape
 * (`id`, `name`, `order`) — descriptions live in {@link ZONE_DESCRIPTIONS}
 * so the registry stays on the engine-typed contract.
 *
 * The 5b skeleton unlocks `camp` and `forest`; `hills` is registered but
 * locked (visible-but-locked per plan). Era-2 and era-3 zones (mines,
 * marsh) are deferred to 5f.
 */
export interface TinyCivZoneDef {
  id: string;
  name: string;
  order: number;
}

export const zoneDefs: TinyCivZoneDef[] = [
  { id: 'camp', name: 'Camp', order: 0 },
  { id: 'forest', name: 'Forest', order: 1 },
  { id: 'hills', name: 'Hills', order: 2 },
];

/** Short hints shown under each zone name in the picker. */
export const ZONE_DESCRIPTIONS: Record<string, string> = {
  camp: 'Home base. Gather food from nearby fields.',
  forest: 'Dense woodland. Wood and stone await harvest.',
  hills: 'Rocky uplands. Agriculture unlocks access.',
};

/** Zones unlocked on a fresh game. */
export const INITIAL_UNLOCKED_ZONES = ['camp', 'forest'] as const;

/** Starting amount for every resource on a fresh game. */
export const STARTING_RESOURCE = 0;

/**
 * Food granted by a single click of the placeholder gather button. Survives
 * later subtasks as a minor manual path — not intended to dominate pacing
 * once workers (5c) and farms (5d) land.
 */
export const CLICK_GATHER_FOOD = 1;

/**
 * Bounty types the player can post to the shared pool. Each entry in the pool
 * is just the type — instances of the same type are interchangeable, so pool
 * state is a plain `BountyType[]` rather than a list of structured instances.
 * Static per-type spec lives in {@link BOUNTY_DEFS}; the pool is resolved
 * to a spec via `getTask(type)` inside the worker subsystem.
 */
export type BountyType = 'gather-food' | 'gather-wood' | 'gather-stone' | 'explore-zone';

/**
 * Immutable spec for a bounty or pin task. Reward magnitudes live separately in
 * {@link BOUNTY_REWARD_SPECS} / {@link PIN_TASK_REWARDS} so the reward
 * side-effect can be resolved by the worker subsystem without putting closures
 * into a serialized structure.
 *
 * `id` is typed as `string` because both bounty types and pin task ids share
 * this shape and live in sibling tables; narrowing happens at dispatch time.
 */
export interface BountyDef {
  id: string;
  label: string;
  /** Seconds to complete at speed = 1. */
  durationSec: number;
}

export const BOUNTY_DEFS: Record<BountyType, BountyDef> = {
  'gather-food': { id: 'gather-food', label: 'Gather food', durationSec: 5 },
  'gather-wood': { id: 'gather-wood', label: 'Gather wood', durationSec: 6 },
  'gather-stone': { id: 'gather-stone', label: 'Gather stone', durationSec: 8 },
  'explore-zone': { id: 'explore-zone', label: 'Explore zone', durationSec: 15 },
};

/**
 * Reward magnitudes applied when a bounty completes. `explore-zone` yields no
 * resource in 5c — its real effect (zone progression) lands in 5f era
 * transitions; for now it's a flavor verb that ticks through its duration
 * and applies no payoff.
 */
export const BOUNTY_REWARDS: Record<BountyType, number> = {
  'gather-food': 3,
  'gather-wood': 3,
  'gather-stone': 2,
  'explore-zone': 0,
};

/**
 * Fixed roster of worker identities. 5c hardcodes three; dynamic scaling lands
 * alongside era transitions in 5f.
 */
export const WORKER_IDS = ['worker-0', 'worker-1', 'worker-2'] as const;

export type WorkerId = (typeof WORKER_IDS)[number];

/**
 * Continuous building-bound tasks a pinned worker can loop on. Distinct from
 * {@link BountyType} because pin tasks aren't poolable — there's always exactly
 * one target (the pinned building) and the task just keeps firing.
 */
export type PinTaskId = 'farm-work';

/** Kind of resource a task reward deposits into. */
export type ResourceKind = 'food' | 'wood' | 'stone';

/** Unified shape used by both bounties and pin tasks for reward dispatch. */
export interface TaskReward {
  resource: ResourceKind;
  amount: number;
}

export const PIN_TASK_DEFS: Record<PinTaskId, BountyDef> = {
  'farm-work': { id: 'farm-work', label: 'Tend the farm', durationSec: 4 },
};

export const PIN_TASK_REWARDS: Record<PinTaskId, TaskReward> = {
  'farm-work': { resource: 'food', amount: 5 },
};

/** Reward shape unified across bounty and pin tasks — see workers.ts reward dispatch. */
export const BOUNTY_REWARD_SPECS: Record<BountyType, TaskReward | null> = {
  'gather-food': { resource: 'food', amount: BOUNTY_REWARDS['gather-food'] },
  'gather-wood': { resource: 'wood', amount: BOUNTY_REWARDS['gather-wood'] },
  'gather-stone': { resource: 'stone', amount: BOUNTY_REWARDS['gather-stone'] },
  'explore-zone': null,
};

/**
 * Era-1 buildings. Each has a scaling cost (multiple resources allowed) and a
 * static effect bound once at module install. Effects land via modifier chains
 * (farm passive production, storage cap) or via direct flag refs consumed by
 * later subtasks (hut popCap → 5f; workshop hasWorkshop → 5e).
 */
export type BuildingId = 'hut' | 'farm' | 'workshop' | 'storage';

export interface BuildingCost {
  resource: ResourceKind;
  amount: number;
}

export interface BuildingDef {
  id: BuildingId;
  name: string;
  description: string;
  /** Cost multiplier per copy owned. Matches Kittens-style price ratios. */
  priceRatio: number;
  baseCosts: BuildingCost[];
  /** Era-1: only `farm` is pinnable. Extensible for era-2+ mines, etc. */
  pinnable: boolean;
  /** Icon glyph for the layout row. */
  icon: string;
}

export const BUILDING_DEFS: BuildingDef[] = [
  {
    id: 'hut',
    name: 'Hut',
    description: 'Shelter for another worker. (Pop cap consumed in a later era.)',
    priceRatio: 2.5,
    baseCosts: [{ resource: 'wood', amount: 5 }],
    pinnable: false,
    icon: '🛖',
  },
  {
    id: 'farm',
    name: 'Farm',
    description: 'Passive food income. Pin a worker for faster harvests.',
    priceRatio: 1.15,
    baseCosts: [
      { resource: 'wood', amount: 10 },
      { resource: 'stone', amount: 5 },
    ],
    pinnable: true,
    icon: '🌾',
  },
  {
    id: 'workshop',
    name: 'Workshop',
    description: 'Enables crafting. (Recipes unlock in a later step.)',
    priceRatio: 1.15,
    baseCosts: [
      { resource: 'wood', amount: 30 },
      { resource: 'stone', amount: 20 },
    ],
    pinnable: false,
    icon: '🔨',
  },
  {
    id: 'storage',
    name: 'Storage',
    description: 'Extends wood and stone capacity.',
    priceRatio: 1.15,
    baseCosts: [
      { resource: 'wood', amount: 20 },
      { resource: 'stone', amount: 15 },
    ],
    pinnable: false,
    icon: '📦',
  },
];

/** Starting per-resource cap. Storage building extends these. */
export const BASE_WOOD_CAP = 50;
export const BASE_STONE_CAP = 50;
/** Additional capacity (wood AND stone) granted per Storage copy. */
export const STORAGE_CAP_PER_COPY = 25;

/** Food/sec passive production per farm copy. Layered via modifier chain. */
export const FARM_BASE_RATE = 0.2;

/** Pop cap increment per hut copy. Consumed by 5f era transitions. */
export const HUT_POP_PER_COPY = 1;
