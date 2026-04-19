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
 *
 * OL-605 layered vars over the mod: mechanical tuning moves to
 * `vars/{archetype,theme,balance}.ts` against the Director archetype
 * default set. `install()` resolves vars once and passes slices to each
 * sub-system constructor.
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
import type { DirectorVars } from '@/archetypes/director';
import {
  FACTION_IDS,
  UPGRADE_DEFS,
  metaUpgradeDefs,
  type FactionId,
} from './content';
import {
  createCombatSystem,
  type CombatChains,
  type CombatSystem,
} from './combat';
import { createCreepGrid, type CreepGrid } from './grid';
import { createSpreadSystem, type SpreadSystem } from './spread';
import { createFlowField, type FlowField } from './flow';
import { createGoalSystem, type GoalSystem } from './goals';
import { createAiSystem, type AiSystem } from './ai';
import { createHotspotSystem, type HotspotSystem } from './hotspots';
import { createUpgradeSystem, type UpgradeSystem } from './upgrades';
import { createRoundSystem, type RoundSystem } from './round';
import { createMetaSystem, type MetaSystem } from './meta';
import { createAchievementSystem, type AchievementSystem } from './achievements';
import { loadCreepVsCreepVars } from './vars';
import { setSlot } from '@/modules/ui-registry';
import CreepWarfareLayout from '@/ui/layouts/CreepWarfareLayout.vue';

export interface CreepWarfareState {
  grid: CreepGrid;
  spread: SpreadSystem;
  flow: FlowField;
  combat: CombatSystem;
  goals: GoalSystem;
  ai: AiSystem;
  hotspots: HotspotSystem;
  upgrades: UpgradeSystem;
  round: RoundSystem;
  meta: MetaSystem;
  achievements: AchievementSystem;
  essence: Record<FactionId, Resource<DecimalSource>>;
  chains: {
    attack: Record<FactionId, ModifierChain>;
    defense: Record<FactionId, ModifierChain>;
    spread: Record<FactionId, ModifierChain>;
    yield: Record<FactionId, ModifierChain>;
  };
  factions: readonly FactionId[];
  /** Merged Director vars the sub-systems are running against. */
  vars: DirectorVars;
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
      const vars = loadCreepVsCreepVars();
      const grid = withPersistentContext('creep-warfare-map', () => createCreepGrid(vars));

      const attack = buildFactionChains('attack');
      const defense = buildFactionChains('defense');
      const spreadChains = buildFactionChains('spread');
      const yieldChains = buildFactionChains('yield');
      const combatChains: CombatChains = { attack, defense };

      const essence = withPersistentContext('creep-warfare-essence', () => {
        const out = {} as Record<FactionId, Resource<DecimalSource>>;
        for (const f of FACTION_IDS) {
          out[f] = createResource<DecimalSource>(0, {
            displayName: vars.theme.factionEssenceNames[f],
          });
        }
        return out;
      });

      const pes = createPersistentEffectSystem({ id: 'creep-warfare-effects' });

      const flow = createFlowField({
        grid: grid.grid,
        balance: {
          flowDecayPerSec: vars.balance.flowDecayPerSec,
          flowReinforcementPerTick: vars.balance.flowReinforcementPerTick,
        },
      });
      const spread = createSpreadSystem({
        grid: grid.grid,
        chains: spreadChains,
        baseHp: vars.balance.baseHp,
        flow,
        flowToSpreadWeight: vars.balance.flowToSpreadWeight,
      });
      const combat = createCombatSystem({
        grid: grid.grid,
        chains: combatChains,
        baseHp: vars.balance.baseHp,
        baseAttack: vars.balance.baseAttack,
        baseDefense: vars.balance.baseDefense,
        flow,
        flowToDefenseModifier: vars.balance.flowToDefenseModifier,
      });
      const goals = createGoalSystem({
        pes,
        chains: { attack, defense, spread: spreadChains },
        hotspots: grid.blueprint.hotspots,
        grid: grid.grid,
        startingGoalSlots: vars.archetype.startingGoalSlots,
        goalMultiplier: vars.balance.goalMultiplier,
      });
      const tierYieldMul = {
        near: vars.balance.nearHotspotYieldMul,
        natural: vars.balance.naturalHotspotYieldMul,
        contested: vars.balance.contestedHotspotYieldMul,
        center: vars.balance.centerHotspotYieldMul,
      };
      const ai = createAiSystem({
        grid: grid.grid,
        goals,
        hotspots: grid.blueprint.hotspots,
        spawns: () => grid.blueprint.spawns,
        playerFaction: vars.archetype.playerFaction,
        factionPersonalities: vars.balance.factionPersonalities,
        aiIntervalSec: vars.balance.aiIntervalSec,
        tierYieldMul,
      });
      const hotspots = createHotspotSystem({
        grid: grid.grid,
        hotspots: grid.blueprint.hotspots,
        essence,
        yieldChains,
        regenPerSec: vars.balance.hotspotRegenPerSec,
        tierYieldMul,
      });
      const upgrades = createUpgradeSystem({
        essence,
        chains: {
          yield: yieldChains,
          spread: spreadChains,
          attack,
          defense,
        },
        maxLevel: vars.balance.essenceUpgradeMaxLevel,
      });

      // Round-scoped per-faction essence upgrade amounts (OL-510). The
      // engine's category-base creates its per-def contexts as registry
      // roots rather than children of the outer category context, so listing
      // `creep-warfare-upgrades-{faction}` in `resetModules` finds nothing.
      // Passing the `amount` persistent refs directly side-steps that quirk
      // and keeps the reset narrow — we only wipe what we actually mean to.
      const upgradeAmounts = FACTION_IDS.flatMap((f) => {
        const cat = upgrades.categoriesByFaction[f];
        return UPGRADE_DEFS.map((def) => cat.getPurchasable(def.id)!.amount);
      });

      const round = createRoundSystem({
        grid: grid.grid,
        creepGrid: grid,
        flow,
        hotspots: grid.blueprint.hotspots,
        extraResettables: upgradeAmounts,
        roundLengthSec: vars.archetype.roundLengthSec,
        endOfRoundCountdownSec: vars.archetype.endOfRoundCountdownSec,
        metaCurrencyPerCell: vars.balance.metaCurrencyPerCell,
        metaCurrencyPerHotspot: vars.balance.metaCurrencyPerHotspot,
        metaCurrencyName: vars.theme.metaCurrencyName,
        playerFaction: vars.archetype.playerFaction,
      });

      const meta = createMetaSystem({
        metaCurrency: round.metaCurrency,
        chains: {
          yield: yieldChains,
          spread: spreadChains,
          attack,
          defense,
        },
        slotCapacity: goals.capacity,
        playerFaction: vars.archetype.playerFaction,
        maxGoalSlots: vars.archetype.maxGoalSlots,
        metaUpgradeDefs: metaUpgradeDefs(
          vars.archetype.maxGoalSlots,
          vars.archetype.startingGoalSlots,
        ),
      });

      const achievements = createAchievementSystem({
        grid: grid.grid,
        hotspots: grid.blueprint.hotspots,
        round,
        playerFaction: vars.archetype.playerFaction,
      });

      // Bridge plain-data grid mutations into the persistent snapshot ref.
      // The grid mutates in place during ticks; without this, the engine's
      // autosave would only see the fresh-game snapshot from grid.ts.
      ctx.onSave(() => grid.commit());
      ctx.onLoad(() => grid.hydrate());

      ctx.onTick((dt) => {
        // round.onEngineTick always runs — it owns the active→ended transition
        // and the end-of-round countdown. Sim systems freeze once the round
        // ends, so players can spend meta-currency without the world moving.
        round.onEngineTick(dt);
        if (round.phase.value === 'active') {
          spread.onEngineTick(dt);
          flow.onEngineTick(dt);
          combat.onEngineTick(dt);
          ai.onEngineTick(dt);
          hotspots.onEngineTick(dt);
        }
        // achievements.onEngineTick runs regardless of phase so the
        // total-dominance hold-timer drains cleanly on round end.
        achievements.onEngineTick(dt);
      });

      const state: CreepWarfareState = {
        grid,
        spread,
        flow,
        combat,
        goals,
        ai,
        hotspots,
        upgrades,
        round,
        meta,
        achievements,
        essence,
        chains: { attack, defense, spread: spreadChains, yield: yieldChains },
        factions: FACTION_IDS,
        vars,
      };
      ctx.provide(CreepWarfareKey, state);
      setSlot('game-layout', CreepWarfareLayout);
    },
  };
}

export const creepWarfareModule: EngineModule = createCreepWarfareModule();
