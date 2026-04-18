/**
 * Goal-slot system (OL-508).
 *
 * Per-faction fixed-N slots via the engine `slot` system. Each active goal
 * binds a flat {@link GOAL_MULT} multiplier onto the faction's own attack /
 * defense / spread chain (routing depends on the goal type). The slot's
 * `onSelect` / `onDeselect` hooks drive `chain.bind` / unbind so that
 * removing or swapping a goal releases its grant automatically.
 *
 * Goal routing:
 *   claim:hotspot-*     → spread  chain (faction grows faster toward the node)
 *   defend:sector-*     → defense chain (faction's cells tank harder)
 *   pressure:faction-*  → attack  chain (faction hits the pressured foe — and
 *                                        everyone else — harder)
 *
 * Attribution: each binding's id derives from `{scope}/{description}` where
 * `scope` is the ambient persistent context (`creep-warfare/goals/{faction}`)
 * and `description` is the goal id itself. That produces stable, unique,
 * legible ids visible through `chain.bindings()` and BalanceWorkbench.
 *
 * Post-load: `Slot.restore()` bulk-sets selected ids without firing
 * `onSelect`. Consumers must call {@link GoalSystem.rebindAll} after
 * `grid.hydrate()` so the chain bindings come back in sync with the
 * restored slot state.
 */

import { createMultiplicativeModifier, createSlot, withPersistentContext } from 'open-loop-engine';
import type { ModifierChain, Slot } from 'open-loop-engine';
import { ref, type Ref } from 'vue';
import {
  FACTION_IDS,
  GOAL_MULT,
  SECTOR_IDS,
  STARTING_GOAL_SLOTS,
  type FactionId,
  type GoalId,
  type HotspotDef,
} from './content';

export interface GoalChains {
  attack: Record<FactionId, ModifierChain>;
  defense: Record<FactionId, ModifierChain>;
  spread: Record<FactionId, ModifierChain>;
}

export interface GoalSystem {
  /** One slot per faction. `selected.value` holds the active goal ids. */
  readonly slots: Record<FactionId, Slot>;
  /** Shared capacity driving every faction's `maxSelections`. OL-511 ratchets this. */
  readonly capacity: Ref<number>;
  /** Full pool of valid goal ids for the given faction. Stable order for UI. */
  goalPoolFor(faction: FactionId): readonly GoalId[];
  /**
   * Re-drive `onSelect` for every currently-selected goal on every faction.
   * Required after save/load: `Slot.restore` sets internal selections without
   * firing `onSelect`, so chain bindings have to be re-installed explicitly.
   */
  rebindAll(): void;
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

function resolveGoalTarget(
  faction: FactionId,
  goalId: string,
  chains: GoalChains,
): ModifierChain {
  if (goalId.startsWith('claim:hotspot-')) return chains.spread[faction];
  if (goalId.startsWith('defend:sector-')) return chains.defense[faction];
  if (goalId.startsWith('pressure:faction-')) return chains.attack[faction];
  throw new Error(`goals: unknown goal id "${goalId}"`);
}

export function createGoalSystem(
  chains: GoalChains,
  hotspots: readonly HotspotDef[],
): GoalSystem {
  const capacity = ref(STARTING_GOAL_SLOTS);
  const slots = {} as Record<FactionId, Slot>;
  const activeBinds: Record<FactionId, Map<string, () => void>> = {
    red: new Map(),
    blue: new Map(),
    green: new Map(),
    yellow: new Map(),
  };

  function bindOne(faction: FactionId, goalId: string): void {
    if (activeBinds[faction].has(goalId)) return;
    const chain = resolveGoalTarget(faction, goalId, chains);
    // Run bind under the per-faction persistent context so chain.bind
    // auto-derives attribution id `creep-warfare/goals/{faction}/{goalId}`.
    // The slot callback fires long after createSlot returned, so we have to
    // re-enter the context explicitly here.
    const unbind = withPersistentContext(`creep-warfare/goals/${faction}`, () =>
      chain.bind({
        modifier: createMultiplicativeModifier({ multiplier: GOAL_MULT, description: goalId }),
      }),
    );
    activeBinds[faction].set(goalId, unbind);
  }

  function unbindOne(faction: FactionId, goalId: string): void {
    const unbind = activeBinds[faction].get(goalId);
    if (unbind == null) return;
    unbind();
    activeBinds[faction].delete(goalId);
  }

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
      onSelect: (goalId) => bindOne(faction, goalId),
      onDeselect: (goalId) => unbindOne(faction, goalId),
    });
  }

  return {
    slots,
    capacity,
    goalPoolFor: (faction) => goalPool(faction, hotspots),
    rebindAll: () => {
      for (const faction of FACTION_IDS) {
        for (const goalId of slots[faction].selected.value) {
          bindOne(faction, goalId);
        }
      }
    },
  };
}

