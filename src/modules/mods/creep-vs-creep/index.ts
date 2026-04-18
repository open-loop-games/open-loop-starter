/**
 * Creep-vs-Creep — mini-RTS demo mod (OL-504 umbrella).
 *
 * State shape:
 *   - `'creep-warfare-map'` — single SpatialGrid snapshot ref
 *   - `'slot:creep-warfare/goals/{faction}'` — per-faction goal selection
 *
 * Chains: 12 total, `creep-warfare/{faction}/{attack|defense|spread}`,
 * auto-registered via the engine's chain registry so balance-workbench,
 * OL-508 goal grants, and OL-510 purchasable binds can discover and push
 * modifiers into them.
 */

import {
  createModifierChain,
  withPersistentContext,
  type EngineContext,
  type EngineModule,
  type InjectionKey,
  type ModifierChain,
} from 'open-loop-engine';
import { FACTION_IDS, type FactionId } from './content';
import {
  createCombatSystem,
  type CombatChains,
  type CombatSystem,
} from './combat';
import { createCreepGrid, type CreepGrid } from './grid';
import { createSpreadSystem, type SpreadSystem } from './spread';
import { createGoalSystem, type GoalSystem } from './goals';

export interface CreepWarfareState {
  grid: CreepGrid;
  spread: SpreadSystem;
  combat: CombatSystem;
  goals: GoalSystem;
  chains: {
    attack: Record<FactionId, ModifierChain>;
    defense: Record<FactionId, ModifierChain>;
    spread: Record<FactionId, ModifierChain>;
  };
  factions: readonly FactionId[];
}

export const CreepWarfareKey: InjectionKey<CreepWarfareState> = Symbol(
  'creep-warfare',
) as InjectionKey<CreepWarfareState>;

function buildFactionChains(
  kind: 'attack' | 'defense' | 'spread',
): Record<FactionId, ModifierChain> {
  const out = {} as Record<FactionId, ModifierChain>;
  for (const f of FACTION_IDS) {
    out[f] = createModifierChain(`creep-warfare/${f}/${kind}`);
  }
  return out;
}

export function createCreepWarfareModule(): EngineModule {
  return {
    id: 'creep-warfare',
    dependencies: ['settings', 'ui-registry'],
    install(ctx: EngineContext) {
      const grid = withPersistentContext('creep-warfare-map', () => createCreepGrid());

      const attack = buildFactionChains('attack');
      const defense = buildFactionChains('defense');
      const spreadChains = buildFactionChains('spread');
      const combatChains: CombatChains = { attack, defense };

      const spread = createSpreadSystem(grid.grid, spreadChains);
      const combat = createCombatSystem(grid.grid, combatChains);
      const goals = createGoalSystem(
        { attack, defense, spread: spreadChains },
        grid.blueprint.hotspots,
      );

      // Bridge plain-data grid mutations into the persistent snapshot ref.
      // The grid mutates in place during ticks; without this, the engine's
      // autosave would only see the fresh-game snapshot from grid.ts.
      // Slot.restore() populates selected ids without firing onSelect, so
      // goal grants must be re-installed explicitly via rebindAll().
      ctx.onSave(() => grid.commit());
      ctx.onLoad(() => {
        grid.hydrate();
        goals.rebindAll();
      });

      ctx.onTick((dt) => {
        spread.onEngineTick(dt);
        combat.onEngineTick(dt);
      });

      const state: CreepWarfareState = {
        grid,
        spread,
        combat,
        goals,
        chains: { attack, defense, spread: spreadChains },
        factions: FACTION_IDS,
      };
      ctx.provide(CreepWarfareKey, state);
    },
  };
}

export const creepWarfareModule: EngineModule = createCreepWarfareModule();
