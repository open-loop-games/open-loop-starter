/**
 * Creep-vs-Creep — mini-RTS demo mod (OL-504 umbrella).
 *
 * State shape:
 *   - `'creep-warfare-map'` — single SpatialGrid snapshot ref
 *   - `'slot:creep-warfare/goals/{faction}'` — per-faction goal selection
 *   - `'creep-warfare-essence'` — per-faction yield resources
 *
 * Chains: 16 total, `creep-warfare/{faction}/{attack|defense|spread|yield}`,
 * auto-registered via the engine's chain registry so balance-workbench,
 * goal grants (OL-508/OL-509), and OL-510 purchasable binds can discover
 * and push modifiers into them.
 *
 * Goal bindings route through a `PersistentEffectSystem` so their lifecycle
 * is driven by completion predicates, not by slot callbacks — load
 * reconstruction is implicit and stale goals drop their multiplier the
 * tick they complete.
 */

import {
  createModifierChain,
  createPersistentEffectSystem,
  createResource,
  withPersistentContext,
  type DecimalSource,
  type EngineContext,
  type EngineModule,
  type InjectionKey,
  type ModifierChain,
  type Resource,
} from 'open-loop-engine';
import { FACTION_ESSENCE_NAMES, FACTION_IDS, type FactionId } from './content';
import {
  createCombatSystem,
  type CombatChains,
  type CombatSystem,
} from './combat';
import { createCreepGrid, type CreepGrid } from './grid';
import { createSpreadSystem, type SpreadSystem } from './spread';
import { createGoalSystem, type GoalSystem } from './goals';
import { createAiSystem, type AiSystem } from './ai';
import { createHotspotSystem, type HotspotSystem } from './hotspots';
import { createUpgradeSystem, type UpgradeSystem } from './upgrades';

export interface CreepWarfareState {
  grid: CreepGrid;
  spread: SpreadSystem;
  combat: CombatSystem;
  goals: GoalSystem;
  ai: AiSystem;
  hotspots: HotspotSystem;
  upgrades: UpgradeSystem;
  essence: Record<FactionId, Resource<DecimalSource>>;
  chains: {
    attack: Record<FactionId, ModifierChain>;
    defense: Record<FactionId, ModifierChain>;
    spread: Record<FactionId, ModifierChain>;
    yield: Record<FactionId, ModifierChain>;
  };
  factions: readonly FactionId[];
}

export const CreepWarfareKey: InjectionKey<CreepWarfareState> = Symbol(
  'creep-warfare',
) as InjectionKey<CreepWarfareState>;

function buildFactionChains(
  kind: 'attack' | 'defense' | 'spread' | 'yield',
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
      const yieldChains = buildFactionChains('yield');
      const combatChains: CombatChains = { attack, defense };

      const essence = withPersistentContext('creep-warfare-essence', () => {
        const out = {} as Record<FactionId, Resource<DecimalSource>>;
        for (const f of FACTION_IDS) {
          out[f] = createResource<DecimalSource>(0, {
            displayName: FACTION_ESSENCE_NAMES[f],
          });
        }
        return out;
      });

      const pes = createPersistentEffectSystem({ id: 'creep-warfare-effects' });

      const spread = createSpreadSystem(grid.grid, spreadChains);
      const combat = createCombatSystem(grid.grid, combatChains);
      const goals = createGoalSystem(
        pes,
        { attack, defense, spread: spreadChains },
        grid.blueprint.hotspots,
        grid.grid,
      );
      const ai = createAiSystem({
        grid: grid.grid,
        goals,
        hotspots: grid.blueprint.hotspots,
        spawns: grid.blueprint.spawns,
      });
      const hotspots = createHotspotSystem({
        grid: grid.grid,
        hotspots: grid.blueprint.hotspots,
        essence,
        yieldChains,
      });
      const upgrades = createUpgradeSystem({
        essence,
        chains: {
          yield: yieldChains,
          spread: spreadChains,
          attack,
          defense,
        },
      });

      // Bridge plain-data grid mutations into the persistent snapshot ref.
      // The grid mutates in place during ticks; without this, the engine's
      // autosave would only see the fresh-game snapshot from grid.ts.
      ctx.onSave(() => grid.commit());
      ctx.onLoad(() => grid.hydrate());

      ctx.onTick((dt) => {
        spread.onEngineTick(dt);
        combat.onEngineTick(dt);
        ai.onEngineTick(dt);
        hotspots.onEngineTick(dt);
      });

      const state: CreepWarfareState = {
        grid,
        spread,
        combat,
        goals,
        ai,
        hotspots,
        upgrades,
        essence,
        chains: { attack, defense, spread: spreadChains, yield: yieldChains },
        factions: FACTION_IDS,
      };
      ctx.provide(CreepWarfareKey, state);
    },
  };
}

export const creepWarfareModule: EngineModule = createCreepWarfareModule();
