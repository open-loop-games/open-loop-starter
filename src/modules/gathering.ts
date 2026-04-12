/**
 * Gathering domain — resources, zones, actions, skills, queue, and runner.
 *
 * Engine systems demonstrated:
 *   - createActionCategory (batch action registration with content registry)
 *   - createSkillCategory (batch skill registration with XP bridge)
 *   - createZoneSystem (progressive zone unlocking)
 *   - createActionQueue + createActionRunner (queue-driven execution)
 *
 * This is the foundation module: every other domain module depends on
 * gathering for shared resources and the action execution pipeline.
 * Skills live here (not in progression) because actions grant XP directly
 * via skills.addXP — tight coupling that would invert the dependency graph
 * if skills were in a downstream module.
 *
 * Cross-references:
 *   - economy.ts binds woodYieldMult / stoneYieldMult to upgrade effects
 *   - progression.ts reads skills for achievement conditions
 *   - loop.ts resets resources + skills each loop cycle
 */
import { computed, ref, type Ref } from 'vue';
import {
  Decimal,
  Formula,
  createResource,
  createZoneSystem,
  createSkillCategory,
  createActionCategory,
  createActionQueue,
  createActionRunner,
  beginPersistentContext,
  endPersistentContext,
  type EngineModule,
  type EngineContext,
  type Resource,
  type DecimalSource,
  type ActionQueue,
  type ActionRunner,
  type ZoneSystem,
  type SkillCategory,
  type ActionCategory,
} from 'open-loop-engine';
import { useAutomation, type UseAutomationReturn } from '@/composables/useAutomation';

// ============================================================================
// Types
// ============================================================================

interface GatheringSkillDef {
  id: string;
  description: string;
  /** XP per level — higher means slower leveling */
  xpDivisor: number;
  /** Fraction of level retained per loop (accumulator mode) */
  retentionRate: number;
}

interface GatheringActionDef {
  id: string;
  display: string;
  duration: number;
  zone: string;
  onComplete: () => void;
}

export interface GatheringState {
  resources: {
    wood: Resource<DecimalSource>;
    stone: Resource<DecimalSource>;
    gold: Resource<DecimalSource>;
  };
  skills: SkillCategory<GatheringSkillDef>;
  zones: ZoneSystem;
  actions: ActionCategory<GatheringActionDef>;
  /** Zone lookup for UI — derived from action defs at registration time */
  actionZones: Map<string, string>;
  queue: ActionQueue;
  runner: ActionRunner;
  automation: UseAutomationReturn;
}

export let gatheringState: GatheringState | null = null;

/**
 * Yield multiplier refs — economy.ts (OL-362) binds these to upgrade effects.
 * Gathering's gain helpers multiply by these so upgrades apply without a
 * hard dependency from gathering → economy.
 */
export const woodYieldMult: Ref<DecimalSource> = ref(Decimal.dOne);
export const stoneYieldMult: Ref<DecimalSource> = ref(Decimal.dOne);

/**
 * Earned-achievement count getter — progression.ts (OL-361) sets this via
 * setEarnedAchievementCount once achievements are created.
 * Drives automation tier unlocks.
 */
let _getEarnedAchievementCount: () => number = () => 0;
export function getEarnedAchievementCount(): number { return _getEarnedAchievementCount(); }
export function setEarnedAchievementCount(fn: () => number) { _getEarnedAchievementCount = fn; }

// ============================================================================
// Module
// ============================================================================

export const gatheringModule: EngineModule = {
  id: 'gathering',
  dependencies: ['settings', 'ui-registry'],
  install(ctx: EngineContext) {
    // --- Resources ------------------------------------------------------------
    // Context ID kept as 'core-resources' for save compatibility
    beginPersistentContext('core-resources');
    const wood = createResource<DecimalSource>(Decimal.dZero, { displayName: 'Wood' });
    const stone = createResource<DecimalSource>(Decimal.dZero, { displayName: 'Stone' });
    const gold = createResource<DecimalSource>(Decimal.dZero, { displayName: 'Gold' });
    endPersistentContext();

    // --- Skills (via category) ------------------------------------------------
    // Accumulator mode: XP → level, permanent bonus retained across loops.
    // Actions grant XP via skills.addXP() in their onComplete callbacks.
    // Defs carry tuning constants; mapSkill applies the shared curve template.
    // Accumulator mode: XP → level via floor(xp / divisor), retention per loop.
    const skills = createSkillCategory<GatheringSkillDef>({
      id: 'gathering-skills',
      mapSkill: (def) => ({
        xpToLevel: (xp) => Formula.variable(xp).div(def.xpDivisor).floor(),
        retentionFormula: (level) => Formula.variable(level).mul(def.retentionRate),
        description: def.description,
      }),
    });

    skills.register([
      { id: 'woodcutting', description: 'Woodcutting', xpDivisor: 10, retentionRate: 0.1 },
      { id: 'mining', description: 'Mining', xpDivisor: 12, retentionRate: 0.1 },
    ]);

    // --- Zones ----------------------------------------------------------------
    const zones = createZoneSystem({
      id: 'zones',
      zones: [
        { id: 'village', name: 'Village', order: 0 },
        { id: 'forest', name: 'Forest', order: 1 },
        { id: 'quarry', name: 'Quarry', order: 2 },
      ],
      initiallyUnlocked: ['village'],
    });

    // --- Resource gain helpers ------------------------------------------------
    // Multiplied by yield refs that economy.ts binds to upgrade effects.
    function gainWood(base: DecimalSource) {
      wood.value = Decimal.add(wood.value, Decimal.mul(base, woodYieldMult.value));
    }
    function gainStone(base: DecimalSource) {
      stone.value = Decimal.add(stone.value, Decimal.mul(base, stoneYieldMult.value));
    }
    function gainGold(base: DecimalSource) {
      gold.value = Decimal.add(gold.value, base);
    }

    // --- Actions (via category) -----------------------------------------------
    // Each def carries its zone for the actionZones lookup map.
    // mapAction strips zone (not an ActionOptions field) and passes the rest.
    const actions = createActionCategory<GatheringActionDef>({
      id: 'gathering-actions',
      registerTick: ctx.onTick,
      mapAction: (def) => ({
        display: def.display,
        duration: def.duration,
        onComplete: def.onComplete,
      }),
    });

    actions.register([
      {
        id: 'gather-sticks',
        display: 'Gather Sticks',
        duration: 1.5,
        zone: 'village',
        onComplete() {
          gainWood(1);
          skills.addXP('woodcutting', 2);
        },
      },
      {
        id: 'gather-wood',
        display: 'Gather Wood',
        duration: 3,
        zone: 'village',
        onComplete() {
          gainWood(3);
          skills.addXP('woodcutting', 5);
        },
      },
      {
        id: 'chop-tree',
        display: 'Chop Tree',
        duration: 5,
        zone: 'forest',
        onComplete() {
          gainWood(8);
          skills.addXP('woodcutting', 15);
        },
      },
      {
        id: 'gather-stone',
        display: 'Gather Loose Stones',
        duration: 3,
        zone: 'quarry',
        onComplete() {
          gainStone(2);
          skills.addXP('mining', 5);
        },
      },
      {
        id: 'mine-ore',
        display: 'Mine Ore',
        duration: 6,
        zone: 'quarry',
        onComplete() {
          gainStone(5);
          gainGold(1);
          skills.addXP('mining', 12);
        },
      },
      {
        id: 'barter',
        display: 'Barter at Market',
        duration: 4,
        zone: 'village',
        onComplete() {
          const cost = new Decimal(3);
          if (Decimal.gte(wood.value, cost)) {
            wood.value = Decimal.sub(wood.value, cost);
            gainGold(2);
          }
        },
      },
    ]);

    // Derive zone lookup from registered defs
    const actionZones = new Map<string, string>();
    for (const entry of actions.getAll()) {
      actionZones.set(entry.def.id, entry.def.zone);
    }

    // --- Action queue + automation tiers -------------------------------------
    // Tiers unlock as the player earns achievements. The earned count comes
    // from progression.ts via earnedAchievementCount ref — starts at 0 until
    // progression wires it.
    const earnedCount = computed(() => getEarnedAchievementCount());

    const queue = createActionQueue({
      id: 'core-queue',
      mode: 'queue',
    });

    const automation = useAutomation({
      id: 'core-automation',
      tiers: [
        { id: 'manual', name: 'Manual', order: 0 },
        {
          id: 'sequencer',
          name: 'Sequencer',
          order: 1,
          requirement: () => earnedCount.value >= 1,
        },
        {
          id: 'conditionals',
          name: 'Conditionals',
          order: 2,
          requirement: () => earnedCount.value >= 3,
        },
        {
          id: 'priorities',
          name: 'Priorities',
          order: 3,
          requirement: () => earnedCount.value >= 5,
        },
      ],
      conditionalTier: 'conditionals',
      priorityTier: 'priorities',
      getRules: () => [],
      getCandidates: () => [],
      throttleInterval: 0.5,
    });

    queue.fillStrategy = automation.strategy;

    const runner = createActionRunner({
      queue,
      getAction: (item) => actions.getAction(item.id),
      registerTick: ctx.onTick,
    });

    // --- Zone unlock + auto-fill tick ----------------------------------------
    ctx.onTick((dt) => {
      queue.resetAdvanceCount();

      if (!zones.isUnlocked('forest') && Decimal.gte(wood.value, 10)) {
        zones.unlock('forest');
      }
      if (!zones.isUnlocked('quarry')) {
        const woodcutting = skills.getSkill('woodcutting');
        if (woodcutting && Decimal.gte(woodcutting.level.value, 2)) {
          zones.unlock('quarry');
        }
      }

      // Pull from fill strategy when idle
      if (
        automation.shouldAutoBuy(dt) &&
        !queue.currentItem &&
        queue.items.value.length === 0
      ) {
        queue.dequeueNext();
      }
    });

    // --- Expose state ---------------------------------------------------------
    gatheringState = {
      resources: { wood, stone, gold },
      skills,
      zones,
      actions,
      actionZones,
      queue,
      runner,
      automation,
    };
  },
};
