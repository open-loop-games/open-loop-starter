/**
 * Goal-slot system (OL-508, revised OL-509).
 *
 * Per-faction fixed-N slots via the engine `slot` system. Each goal carries
 * a **completion predicate** — when it flips true (hotspot claimed, sector
 * pacified, target faction no longer dominant), the goal's modifier drops
 * automatically via `createPersistentEffectSystem`, and a companion sweep
 * deselects the now-dead goal from its slot so the AI can fill the opening.
 *
 * Binding lifecycle: `PersistentEffectSystem` watches the predicate
 * `selected(goalId) && !completed(goalId)`. Rising edge applies a flat
 * {@link GOAL_MULT} modifier to the routed chain; falling edge removes it.
 * No `onSelect` / `onDeselect` hooks, no manual rebindAll — load
 * reconstruction is implicit (predicates re-evaluate after `slot.restore`).
 *
 * Attribution: each PES def id is `creep-warfare/goals/{faction}/{goalId}`.
 * BalanceWorkbench walks `EffectSystemRegistryKey` to enumerate these
 * rather than reading `chain.bindings()` — PES uses raw `chain.add` so the
 * chain-level bindings list is intentionally empty for goal contributions.
 *
 * Goal routing:
 *   claim:hotspot-*     → spread  chain (faction grows faster toward the node)
 *   defend:sector-*     → defense chain (faction's cells tank harder)
 *   pressure:faction-*  → attack  chain (faction hits the pressured foe harder)
 */

import {
  createMultiplicativeModifier,
  createSlot,
  persistent,
  withPersistentContext,
  type DecimalSource,
  type ModifierChain,
  type Persistent,
  type PersistentEffectSystem,
  type SpatialGrid,
  type Slot,
} from 'open-loop-engine';
import {
  FACTION_IDS,
  SECTOR_IDS,
  type CellState,
  type FactionId,
  type GoalId,
  type HotspotDef,
  type SectorId,
} from './content';

export interface GoalChains {
  attack: Record<FactionId, ModifierChain>;
  defense: Record<FactionId, ModifierChain>;
  spread: Record<FactionId, ModifierChain>;
}

export interface GoalSystem {
  /** One slot per faction. `selected.value` holds the active goal ids. */
  readonly slots: Record<FactionId, Slot>;
  /**
   * Shared capacity driving every faction's `maxSelections`. Persistent so the
   * meta-upgrade ratchet (OL-511) survives both round reset (via the retention
   * policy's `keep` list) and page reloads.
   */
  readonly capacity: Persistent<number>;
  /** Full pool of valid goal ids for the given faction. Stable order for UI. */
  goalPoolFor(faction: FactionId): readonly GoalId[];
  /** True if the goal's objective has been achieved or is moot for the faction. */
  isGoalCompleted(faction: FactionId, goalId: GoalId): boolean;
  /**
   * Deselect every currently-selected goal whose completion predicate is
   * true. Called by the AI at the top of each tick; completion itself is
   * already handled at the modifier layer by PES, this frees the slot.
   */
  sweepCompleted(): void;
}

export interface GoalSystemOptions {
  pes: PersistentEffectSystem;
  chains: GoalChains;
  hotspots: readonly HotspotDef[];
  grid: SpatialGrid<CellState>;
  startingGoalSlots: number;
  goalMultiplier: DecimalSource;
}

function goalPool(faction: FactionId, hotspots: readonly HotspotDef[]): GoalId[] {
  const out: GoalId[] = [];
  for (const h of hotspots) out.push(`claim:hotspot-${h.id}`);
  for (const s of SECTOR_IDS) out.push(`defend:sector-${s}`);
  for (const f of FACTION_IDS) {
    if (f !== faction) out.push(`pressure:faction-${f}`);
  }
  return out;
}

function resolveGoalChain(
  faction: FactionId,
  goalId: GoalId,
  chains: GoalChains,
): ModifierChain {
  if (goalId.startsWith('claim:hotspot-')) return chains.spread[faction];
  if (goalId.startsWith('defend:sector-')) return chains.defense[faction];
  if (goalId.startsWith('pressure:faction-')) return chains.attack[faction];
  throw new Error(`goals: unknown goal id "${goalId}"`);
}

/** Half-plane tests for quadrant membership. Matches map.ts's cross divider. */
function cellInSector(
  x: number,
  y: number,
  sector: SectorId,
  width: number,
  height: number,
): boolean {
  const midX = Math.floor(width / 2);
  const midY = Math.floor(height / 2);
  switch (sector) {
    case 'nw':
      return x < midX && y < midY;
    case 'ne':
      return x >= midX && y < midY;
    case 'sw':
      return x < midX && y >= midY;
    case 'se':
      return x >= midX && y >= midY;
  }
}

export function createGoalSystem(opts: GoalSystemOptions): GoalSystem {
  const { pes, chains, hotspots, grid, startingGoalSlots, goalMultiplier } = opts;

  const capacity = withPersistentContext('creep-warfare-goal-capacity', () =>
    persistent(startingGoalSlots),
  );
  const slots = {} as Record<FactionId, Slot>;
  const hotspotById = new Map<string, HotspotDef>();
  for (const h of hotspots) hotspotById.set(h.id, h);

  for (const faction of FACTION_IDS) {
    const pool = goalPool(faction, hotspots);
    // Per-faction slot id keeps each faction's persistent `selected` list
    // under a distinct `slot:goals-{faction}` context; sharing `id: 'goals'`
    // collides because withPersistentContext doesn't concatenate parent ids.
    slots[faction] = createSlot({
      id: `goals-${faction}`,
      mode: 'multi',
      maxSelections: () => capacity.value,
      pool: () => pool,
    });
  }

  function territoryCount(faction: FactionId): number {
    let count = 0;
    const w = grid.width;
    const h = grid.height;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (grid.at(x, y).owner === faction) count++;
      }
    }
    return count;
  }

  function sectorHasFrontier(faction: FactionId, sector: SectorId): boolean {
    const w = grid.width;
    const h = grid.height;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!cellInSector(x, y, sector, w, h)) continue;
        const cell = grid.at(x, y);
        if (cell.owner !== faction) continue;
        for (const n of grid.neighbors(x, y)) {
          const nOwner = grid.at(n.x, n.y).owner;
          if (nOwner !== null && nOwner !== faction) return true;
        }
      }
    }
    return false;
  }

  function isGoalCompleted(faction: FactionId, goalId: GoalId): boolean {
    if (goalId.startsWith('claim:hotspot-')) {
      const hid = goalId.slice('claim:hotspot-'.length);
      const h = hotspotById.get(hid);
      if (h == null) return true;
      // Self-ownership completes the claim. Enemy ownership leaves the goal
      // pursuable via conquest — Director-archetype expansion shouldn't be
      // gated by who happened to own a near-hotspot at gen time.
      return grid.at(h.x, h.y).owner === faction;
    }
    if (goalId.startsWith('defend:sector-')) {
      const sector = goalId.slice('defend:sector-'.length) as SectorId;
      return !sectorHasFrontier(faction, sector);
    }
    if (goalId.startsWith('pressure:faction-')) {
      const target = goalId.slice('pressure:faction-'.length) as FactionId;
      return territoryCount(target) <= territoryCount(faction);
    }
    return true;
  }

  for (const faction of FACTION_IDS) {
    const pool = goalPool(faction, hotspots);
    for (const goalId of pool) {
      const chain = resolveGoalChain(faction, goalId, chains);
      // Run register under the per-faction persistent context so attribution
      // ids land at `creep-warfare/goals/{faction}/{goalId}`. PES captures
      // the ambient context at registration; the watcher fires later but
      // the def id is already resolved.
      withPersistentContext(`creep-warfare/goals/${faction}`, () =>
        pes.register({
          id: `creep-warfare/goals/${faction}/${goalId}`,
          active: () =>
            slots[faction].isSelected(goalId) && !isGoalCompleted(faction, goalId),
          modifiers: [
            {
              chain,
              modifier: () =>
                createMultiplicativeModifier({ multiplier: goalMultiplier, description: goalId }),
            },
          ],
        }),
      );
    }
  }

  function sweepCompleted(): void {
    for (const faction of FACTION_IDS) {
      // Copy the list — deselect mutates the selected array during iteration.
      const selected = [...slots[faction].selected.value] as GoalId[];
      for (const goalId of selected) {
        if (isGoalCompleted(faction, goalId)) slots[faction].deselect(goalId);
      }
    }
  }

  return {
    slots,
    capacity,
    goalPoolFor: (faction) => goalPool(faction, hotspots),
    isGoalCompleted,
    sweepCompleted,
  };
}
