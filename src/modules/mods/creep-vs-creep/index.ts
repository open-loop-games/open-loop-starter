/**
 * Creep-vs-Creep — mini-RTS demo mod (OL-504 umbrella).
 *
 * State shape:
 *   - `'creep-warfare-map'` — single SpatialGrid snapshot ref
 *
 * Combat chains (OL-507): 8 chains total, `creep-warfare/{faction}/attack`
 * and `creep-warfare/{faction}/defense`, auto-registered via the engine's
 * chain registry so balance-workbench and OL-510's purchasable binds can
 * discover and push modifiers into them.
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

export interface CreepWarfareState {
  grid: CreepGrid;
  spread: SpreadSystem;
  combat: CombatSystem;
  chains: {
    attack: Record<FactionId, ModifierChain>;
    defense: Record<FactionId, ModifierChain>;
  };
  factions: readonly FactionId[];
}

export const CreepWarfareKey: InjectionKey<CreepWarfareState> = Symbol(
  'creep-warfare',
) as InjectionKey<CreepWarfareState>;

function buildFactionChains(kind: 'attack' | 'defense'): Record<FactionId, ModifierChain> {
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

      // Bridge plain-data grid mutations into the persistent snapshot ref.
      // The grid mutates in place during ticks; without this, the engine's
      // autosave would only see the fresh-game snapshot from grid.ts.
      ctx.onSave(() => grid.commit());
      ctx.onLoad(() => grid.hydrate());

      const attack = buildFactionChains('attack');
      const defense = buildFactionChains('defense');
      const combatChains: CombatChains = { attack, defense };

      const spread = createSpreadSystem(grid.grid);
      const combat = createCombatSystem(grid.grid, combatChains);
      ctx.onTick((dt) => {
        spread.onEngineTick(dt);
        combat.onEngineTick(dt);
      });

      const state: CreepWarfareState = {
        grid,
        spread,
        combat,
        chains: { attack, defense },
        factions: FACTION_IDS,
      };
      ctx.provide(CreepWarfareKey, state);
    },
  };
}

export const creepWarfareModule: EngineModule = createCreepWarfareModule();
