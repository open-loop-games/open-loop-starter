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
  { id: 'mines', name: 'Mines', order: 3 },
  { id: 'marsh', name: 'Marsh', order: 4 },
];

/** Short hints shown under each zone name in the picker. */
export const ZONE_DESCRIPTIONS: Record<string, string> = {
  camp: 'Home base. Gather food from nearby fields.',
  forest: 'Dense woodland. Wood and stone await harvest.',
  hills: 'Rocky uplands. Agriculture unlocks access.',
  mines: 'Deep cuts into the rock. Masonry opens the way.',
  marsh: 'Salt-rich wetlands. Currency marks their charting.',
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
 *
 * Gather bounties split into ungated (food/wood/stone/herbs) and zone-bound
 * (hide requires forest, salt requires hills). See {@link BountyDef.requiresZone}.
 */
export type BountyType =
  | 'gather-food'
  | 'gather-wood'
  | 'gather-stone'
  | 'gather-hide'
  | 'gather-herbs'
  | 'gather-salt'
  | 'explore-zone';

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
  /**
   * If set, the UI disables the post button unless this zone is unlocked.
   * Worker execution is unchanged — pool-driven as always — so enforcement is
   * purely at post-time. Unused by pin tasks.
   */
  requiresZone?: string;
}

export const BOUNTY_DEFS: Record<BountyType, BountyDef> = {
  'gather-food': { id: 'gather-food', label: 'Gather food', durationSec: 5 },
  'gather-wood': { id: 'gather-wood', label: 'Gather wood', durationSec: 6 },
  'gather-stone': { id: 'gather-stone', label: 'Gather stone', durationSec: 8 },
  'gather-hide': {
    id: 'gather-hide',
    label: 'Hunt for hide',
    durationSec: 9,
    requiresZone: 'forest',
  },
  'gather-herbs': { id: 'gather-herbs', label: 'Gather herbs', durationSec: 6 },
  'gather-salt': {
    id: 'gather-salt',
    label: 'Mine salt',
    durationSec: 10,
    requiresZone: 'hills',
  },
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
  'gather-hide': 2,
  'gather-herbs': 2,
  'gather-salt': 2,
  'explore-zone': 0,
};

/**
 * Full roster of worker identities. Three are active from the start; the 4th
 * activates at era 1 (Settlement) with at least one hut, and the 5th at era 2
 * (Commerce) with at least two huts. All five are *registered* at install —
 * the activation predicate in workers.ts gates which sequencers can claim
 * tasks. Keeping the registry static avoids mid-run `withPersistentContext`
 * re-entry for the added workers.
 */
export const WORKER_IDS = [
  'worker-0',
  'worker-1',
  'worker-2',
  'worker-3',
  'worker-4',
] as const;

export type WorkerId = (typeof WORKER_IDS)[number];

/**
 * Activation requirement per worker. A worker is active iff the current era
 * meets {@link WorkerRequirement.era} AND the current pop cap (huts built)
 * meets {@link WorkerRequirement.hutsRequired}. Workers 0–2 are baseline:
 * always active, no requirements. Workers 3–4 gate on era + huts.
 *
 * Era is the *authorization*, huts are the *physical housing*. Both must
 * clear for the worker to pull bounties or run pin tasks.
 */
export interface WorkerRequirement {
  /** Minimum era (0/1/2) the tech tree must have reached. */
  era: EraId;
  /** Number of huts that must exist before this worker activates. */
  hutsRequired: number;
}

export const WORKER_REQUIREMENTS: Record<WorkerId, WorkerRequirement> = {
  'worker-0': { era: 0, hutsRequired: 0 },
  'worker-1': { era: 0, hutsRequired: 0 },
  'worker-2': { era: 0, hutsRequired: 0 },
  'worker-3': { era: 1, hutsRequired: 1 },
  'worker-4': { era: 2, hutsRequired: 2 },
};

/**
 * Continuous building-bound tasks a pinned worker can loop on. Distinct from
 * {@link BountyType} because pin tasks aren't poolable — there's always exactly
 * one target (the pinned building) and the task just keeps firing.
 */
export type PinTaskId = 'farm-work';

/**
 * Every resource kind TC tracks. Split conceptually into three groups used by
 * the left-column resource table and by the crafting subsystem:
 *
 *   - **Basic** (food/wood/stone) — sourced by click-gather and the three
 *     ungated gather bounties; food is uncapped, wood/stone are
 *     Inventory-linked.
 *   - **Material** (hide/herbs/salt) — side resources sourced by gather
 *     bounties. Hide and salt are zone-bound; herbs ungated.
 *   - **Craft** (tools/leather/medicine) — outputs deposited by
 *     {@link RECIPE_DEFS}; era-1 roster.
 */
export type ResourceKind =
  | 'food'
  | 'wood'
  | 'stone'
  | 'hide'
  | 'herbs'
  | 'salt'
  | 'tools'
  | 'leather'
  | 'medicine'
  | 'iron'
  | 'gold'
  | 'manuscripts';

/** Ordered enumeration for registry iteration and row ordering in the UI. */
export const RESOURCE_KINDS: readonly ResourceKind[] = [
  'food',
  'wood',
  'stone',
  'hide',
  'herbs',
  'salt',
  'tools',
  'leather',
  'medicine',
  'iron',
  'gold',
  'manuscripts',
] as const;

export interface ResourceDisplay {
  id: ResourceKind;
  name: string;
  icon: string;
  /** Row grouping for the left-column resource table. */
  group: 'basic' | 'material' | 'craft' | 'advanced';
}

export const RESOURCE_DISPLAY: Record<ResourceKind, ResourceDisplay> = {
  food: { id: 'food', name: 'Food', icon: '🌾', group: 'basic' },
  wood: { id: 'wood', name: 'Wood', icon: '🪵', group: 'basic' },
  stone: { id: 'stone', name: 'Stone', icon: '🪨', group: 'basic' },
  hide: { id: 'hide', name: 'Hide', icon: '🦌', group: 'material' },
  herbs: { id: 'herbs', name: 'Herbs', icon: '🌿', group: 'material' },
  salt: { id: 'salt', name: 'Salt', icon: '🧂', group: 'material' },
  tools: { id: 'tools', name: 'Tools', icon: '🔧', group: 'craft' },
  leather: { id: 'leather', name: 'Leather', icon: '🟫', group: 'craft' },
  medicine: { id: 'medicine', name: 'Medicine', icon: '💊', group: 'craft' },
  iron: { id: 'iron', name: 'Iron', icon: '⛏️', group: 'advanced' },
  gold: { id: 'gold', name: 'Gold', icon: '🪙', group: 'advanced' },
  manuscripts: {
    id: 'manuscripts',
    name: 'Manuscripts',
    icon: '📜',
    group: 'advanced',
  },
};

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
  'gather-hide': { resource: 'hide', amount: BOUNTY_REWARDS['gather-hide'] },
  'gather-herbs': { resource: 'herbs', amount: BOUNTY_REWARDS['gather-herbs'] },
  'gather-salt': { resource: 'salt', amount: BOUNTY_REWARDS['gather-salt'] },
  'explore-zone': null,
};

/**
 * Era-1 buildings. Each has a scaling cost (multiple resources allowed) and a
 * static effect bound once at module install. Effects land via modifier chains
 * (farm passive production, storage cap) or via direct flag refs consumed by
 * later subtasks (hut popCap → 5f; workshop hasWorkshop → 5e).
 */
export type BuildingId =
  | 'hut'
  | 'farm'
  | 'workshop'
  | 'storage'
  | 'mines'
  | 'marketplace'
  | 'library';

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
  /**
   * Tech prerequisite. When set, the building's requirements array includes a
   * {@link createBooleanRequirement} pointing at the tech's `bought.value`.
   * Left undefined on baseline era-0 buildings (hut, farm, workshop, storage).
   */
  requiresTech?: TechId;
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
  {
    id: 'mines',
    name: 'Mines',
    description: 'Cuts iron from the rock. Passive income once built.',
    priceRatio: 1.15,
    baseCosts: [
      { resource: 'wood', amount: 40 },
      { resource: 'stone', amount: 30 },
    ],
    pinnable: false,
    icon: '⛏️',
    requiresTech: 'masonry',
  },
  {
    id: 'marketplace',
    name: 'Marketplace',
    description: 'Trade flows through. Generates gold over time.',
    priceRatio: 1.15,
    baseCosts: [
      { resource: 'wood', amount: 60 },
      { resource: 'stone', amount: 50 },
      { resource: 'iron', amount: 20 },
    ],
    pinnable: false,
    icon: '🏪',
    requiresTech: 'currency',
  },
  {
    id: 'library',
    name: 'Library',
    description: 'Scribes at work. Passive manuscripts.',
    priceRatio: 1.15,
    baseCosts: [
      { resource: 'wood', amount: 80 },
      { resource: 'stone', amount: 60 },
      { resource: 'tools', amount: 30 },
    ],
    pinnable: false,
    icon: '📚',
    requiresTech: 'currency',
  },
];

/** Starting per-resource cap. Storage building extends these. */
export const BASE_WOOD_CAP = 50;
export const BASE_STONE_CAP = 50;
/** Additional capacity (wood AND stone) granted per Storage copy. */
export const STORAGE_CAP_PER_COPY = 25;

/** Food/sec passive production per farm copy. Layered via modifier chain. */
export const FARM_BASE_RATE = 0.2;

/** Iron/sec per mines copy (era 1, Masonry-gated). */
export const MINES_BASE_RATE = 0.3;

/** Gold/sec per marketplace copy (era 2, Currency-gated). */
export const MARKETPLACE_BASE_RATE = 0.2;

/** Manuscripts/sec per library copy (era 2, Currency-gated). */
export const LIBRARY_BASE_RATE = 0.1;

/** Pop cap increment per hut copy. Huts AND era gate worker-3/worker-4. */
export const HUT_POP_PER_COPY = 1;

/**
 * Era-1 recipes. Each recipe is a purchasable with a multi-resource cost array
 * (the `inputs`) and an {@link createPurchasable} `onPurchase` handler that
 * deposits `output.amount × n` into the output resource. Unlike buildings,
 * recipes carry no persistent state beyond their `amount` ref (i.e. craft
 * counter) and no scaling — every copy costs the same inputs.
 *
 * One recipe, `leather`, requires salt — a {@link BountyType} gated behind the
 * locked hills zone (era-2). It ships visible but uncompletable until 5f
 * unlocks the zone, demonstrating the zone-gated input pattern that era-2+
 * recipes will reuse.
 */
export type RecipeId = 'tools' | 'leather' | 'medicine';

export interface RecipeInput {
  resource: ResourceKind;
  amount: number;
}

export interface RecipeDef {
  id: RecipeId;
  name: string;
  description: string;
  inputs: RecipeInput[];
  output: { resource: ResourceKind; amount: number };
  icon: string;
}

export const RECIPE_DEFS: RecipeDef[] = [
  {
    id: 'tools',
    name: 'Forge Tools',
    description: 'Shape wood and stone into working tools.',
    inputs: [
      { resource: 'wood', amount: 3 },
      { resource: 'stone', amount: 2 },
    ],
    output: { resource: 'tools', amount: 1 },
    icon: '🔧',
  },
  {
    id: 'leather',
    name: 'Tan Leather',
    description: 'Cure hide with salt to make durable leather.',
    inputs: [
      { resource: 'hide', amount: 2 },
      { resource: 'salt', amount: 1 },
    ],
    output: { resource: 'leather', amount: 1 },
    icon: '🟫',
  },
  {
    id: 'medicine',
    name: 'Brew Medicine',
    description: 'Boil gathered herbs into healing tonics.',
    inputs: [{ resource: 'herbs', amount: 3 }],
    output: { resource: 'medicine', amount: 1 },
    icon: '💊',
  },
];

// ---------------------------------------------------------------------------
// Tech tree (5f)
// ---------------------------------------------------------------------------

/**
 * Era identifiers derived from which gateway techs have been bought. Era 0 is
 * the starting Gathering era; era 1 (Settlement) entered by buying Agriculture;
 * era 2 (Commerce) entered by buying Currency. Techs carry a {@link TechDef.tier}
 * for DAG layout; "era" is computed separately and is not equivalent to tier.
 */
export type EraId = 0 | 1 | 2;

export const ERA_NAMES: Record<EraId, string> = {
  0: 'Gathering',
  1: 'Settlement',
  2: 'Commerce',
};

/**
 * All nine techs across three tiers. Two are gateways (Agriculture, Currency);
 * the rest each bind one modifier-chain effect. Effects themselves are not
 * encoded here — they live in tech.ts's `bindEffects` where the target chains
 * are known — but costs and prereqs are pure data.
 */
export type TechId =
  | 'pottery'
  | 'hunting'
  | 'agriculture'
  | 'masonry'
  | 'animal-husbandry'
  | 'currency'
  | 'mathematics'
  | 'engineering'
  | 'writing';

export interface TechCost {
  resource: ResourceKind;
  amount: number;
}

export interface TechDef {
  id: TechId;
  /** DAG tier for UI grouping. Not the same as {@link EraId}. */
  tier: 0 | 1 | 2;
  name: string;
  /** Short flavor + mechanical summary shown in the rich tooltip. */
  description: string;
  icon: string;
  /** Required-already-bought tech ids. Empty array = no prereqs (starter techs). */
  prereqs: TechId[];
  costs: TechCost[];
  /**
   * True for the two gateway techs. Purchasing a gateway fires the era
   * transition bundle (banner + zone unlock). Drives the "strategic moment"
   * visual emphasis in the tech panel.
   */
  gateway?: boolean;
}

export const TECH_DEFS: TechDef[] = [
  {
    id: 'pottery',
    tier: 0,
    name: 'Pottery',
    description: 'Fired clay vessels keep the wood yard from overflowing.',
    icon: '🏺',
    prereqs: [],
    costs: [
      { resource: 'food', amount: 20 },
      { resource: 'wood', amount: 15 },
    ],
  },
  {
    id: 'hunting',
    tier: 0,
    name: 'Hunting',
    description: 'Skilled hunts yield more hide per outing.',
    icon: '🏹',
    prereqs: [],
    costs: [
      { resource: 'food', amount: 20 },
      { resource: 'stone', amount: 10 },
    ],
  },
  {
    id: 'agriculture',
    tier: 0,
    name: 'Agriculture',
    description: 'Tilled fields. Opens the Settlement era and the hills.',
    icon: '🌾',
    prereqs: ['pottery', 'hunting'],
    costs: [
      { resource: 'food', amount: 40 },
      { resource: 'wood', amount: 30 },
      { resource: 'stone', amount: 20 },
    ],
    gateway: true,
  },
  {
    id: 'masonry',
    tier: 1,
    name: 'Masonry',
    description: 'Stonework. Extends stone capacity and unlocks the mines.',
    icon: '🧱',
    prereqs: ['agriculture'],
    costs: [
      { resource: 'food', amount: 50 },
      { resource: 'stone', amount: 40 },
    ],
  },
  {
    id: 'animal-husbandry',
    tier: 1,
    name: 'Animal Husbandry',
    description: 'Livestock tended. Farms yield more food.',
    icon: '🐑',
    prereqs: ['agriculture'],
    costs: [
      { resource: 'food', amount: 60 },
      { resource: 'leather', amount: 30 },
    ],
  },
  {
    id: 'currency',
    tier: 1,
    name: 'Currency',
    description: 'Coin changes hands. Opens the Commerce era and the marsh.',
    icon: '💰',
    prereqs: ['masonry', 'animal-husbandry'],
    costs: [
      { resource: 'food', amount: 100 },
      { resource: 'tools', amount: 50 },
    ],
    gateway: true,
  },
  {
    id: 'mathematics',
    tier: 2,
    name: 'Mathematics',
    description: 'Precise measure. Crafters yield 25% more per recipe.',
    icon: '➕',
    prereqs: ['currency'],
    costs: [
      { resource: 'food', amount: 200 },
      { resource: 'tools', amount: 150 },
    ],
  },
  {
    id: 'engineering',
    tier: 2,
    name: 'Engineering',
    description: 'Reinforced stores. Wood and stone caps each gain +30.',
    icon: '⚙️',
    prereqs: ['currency'],
    costs: [
      { resource: 'food', amount: 200 },
      { resource: 'tools', amount: 200 },
    ],
  },
  {
    id: 'writing',
    tier: 2,
    name: 'Writing',
    description: 'Ledgered knowledge. Farms gain another +20% yield.',
    icon: '✍️',
    prereqs: ['currency'],
    costs: [
      { resource: 'food', amount: 300 },
      { resource: 'manuscripts', amount: 100 },
    ],
  },
];

/** Modifier strengths used by bindEffects; extracted here so they're scannable. */
export const TECH_EFFECTS = {
  potteryWoodCapBonus: 20,
  huntingHideMultiplier: 1.5,
  masonryStoneCapBonus: 25,
  animalHusbandryFarmMultiplier: 1.2,
  mathematicsCraftingMultiplier: 1.25,
  engineeringWoodCapBonus: 30,
  engineeringStoneCapBonus: 30,
  writingFarmMultiplier: 1.2,
} as const;
