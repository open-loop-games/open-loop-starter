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
