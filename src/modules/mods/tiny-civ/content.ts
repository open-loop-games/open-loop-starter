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
 * Immutable spec for a bounty type. Shared by every pool entry of that type.
 * Reward magnitudes live separately in {@link BOUNTY_REWARDS} so the reward
 * side-effect can be resolved by the worker subsystem without putting closures
 * into a serialized structure.
 */
export interface BountyDef {
  id: BountyType;
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
