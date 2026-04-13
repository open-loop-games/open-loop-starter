/**
 * Gathering domain — resources, zones, skills, and the dispatcher-owned
 * action surface.
 *
 * Engine systems demonstrated:
 *   - createResource / createSkillCategory / createZoneSystem
 *   - createSequencer (shared queue, automation-driven fill)
 *   - withPersistentContext (per-def action state, namespaced saves)
 *   - Dispatcher pattern: a named `dispatchTick` consumed by `ctx.onTick`
 *     resolves `queue.currentItem` to a per-def handler. Today there is
 *     exactly one content type (gathering actions), so the dispatch path
 *     is a direct lookup. Forks that introduce a second content type add
 *     a `metadata.type` branch here; per-type handlers move into dedicated
 *     modules. See incloneution `src/modules/actions.ts` for the multi-type
 *     shape.
 *
 * This is the foundation module: every other domain module depends on
 * gathering for shared resources and the action execution surface.
 * Skills live here (not in progression) because actions grant XP directly
 * via skills.addXP — tight coupling that would invert the dependency graph
 * if skills were in a downstream module.
 *
 * Cross-references:
 *   - economy.ts binds woodYieldMult / stoneYieldMult to upgrade effects
 *   - progression.ts reads skills for achievement conditions
 *   - loop.ts resets resources + skills each loop cycle
 */
import { computed, ref, type ComputedRef, type Ref } from 'vue';
import {
  Decimal,
  Formula,
  createResource,
  createZoneSystem,
  createSkillCategory,
  createSequencer,
  withPersistentContext,
  persistent,
  addResource,
  subtractResource,
  type InjectionKey,
  type EngineModule,
  type EngineContext,
  type Resource,
  type DecimalSource,
  type Sequencer,
  type ZoneSystem,
  type SkillCategory,
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

/** Per-def persistent state for a gathering action. */
interface GatheringActionState {
  /** Seconds of progress accumulated against `def.duration`. Persistent. */
  progress: ReturnType<typeof persistent<number>>;
}

/**
 * Runtime entry exposed to UI — what the old `Action` instance used to be.
 *
 * The display/active/percentComplete/start/cancel surface matches the shape
 * UI components already consume (`ActionsPanel`, `ClickerLayout`) so the
 * dispatcher rewrite stays contained to this module.
 */
export interface GatheringActionEntry {
  def: GatheringActionDef;
  state: GatheringActionState;
  display: { title: string };
  active: ComputedRef<boolean>;
  percentComplete: ComputedRef<number>;
  start: () => void;
  cancel: () => void;
}

/** Category shim — what sibling modules and UI see as `g.actions`. */
export interface GatheringActions {
  readonly size: number;
  getAction(id: string): GatheringActionEntry | undefined;
  getAll(): Array<{ def: GatheringActionDef; action: GatheringActionEntry }>;
}

export interface GatheringState {
  resources: {
    wood: Resource<DecimalSource>;
    stone: Resource<DecimalSource>;
    gold: Resource<DecimalSource>;
  };
  skills: SkillCategory<GatheringSkillDef>;
  zones: ZoneSystem;
  actions: GatheringActions;
  queue: Sequencer;
  automation: UseAutomationReturn;
  /**
   * Yield multiplier refs — downstream modules (economy) bind these to
   * upgrade effects. Gathering's gain helpers multiply by these so
   * upgrades apply without a hard dependency from gathering → economy.
   */
  woodYieldMult: Ref<DecimalSource>;
  stoneYieldMult: Ref<DecimalSource>;
  /**
   * Writable earned-achievement count — progression writes this after
   * creating achievements. Drives automation tier unlocks.
   */
  earnedAchievementCount: Ref<number>;
}

export const GatheringKey: InjectionKey<GatheringState> = Symbol('gathering') as InjectionKey<GatheringState>;

// ============================================================================
// Module
// ============================================================================

export const gatheringModule: EngineModule = {
  id: 'gathering',
  dependencies: ['settings', 'ui-registry'],
  install(ctx: EngineContext) {
    // --- Resources ------------------------------------------------------------
    const wood = createResource<DecimalSource>(Decimal.dZero, { displayName: 'Wood' });
    const stone = createResource<DecimalSource>(Decimal.dZero, { displayName: 'Stone' });
    const gold = createResource<DecimalSource>(Decimal.dZero, { displayName: 'Gold' });

    // --- Yield multiplier refs ------------------------------------------------
    // Economy binds these to upgrade effects via watchSyncEffect.
    const woodYieldMult: Ref<DecimalSource> = ref(Decimal.dOne);
    const stoneYieldMult: Ref<DecimalSource> = ref(Decimal.dOne);

    // --- Earned achievement count ---------------------------------------------
    // Progression writes this once achievements are created.
    const earnedAchievementCount = ref(0);

    // --- Skills (via category) ------------------------------------------------
    // Accumulator mode: XP → level via floor(xp / divisor), retention per loop.
    // Actions grant XP via skills.addXP() in their onComplete callbacks.
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
      addResource(wood, Decimal.mul(base, woodYieldMult.value));
    }
    function gainStone(base: DecimalSource) {
      addResource(stone, Decimal.mul(base, stoneYieldMult.value));
    }
    function gainGold(base: DecimalSource) {
      addResource(gold, base);
    }

    // --- Action queue ---------------------------------------------------------
    // Shared Sequencer for all gathering action items. Single content type
    // today; per-type metadata would route here in a multi-type fork.
    const queue = createSequencer({
      id: 'core-queue',
      mode: 'queue',
    });

    // --- Action defs + per-def persistent state -------------------------------
    // Each def lives in a plain Map; per-def progress gets its own nested
    // persistent context so saves stay namespaced per action. The outer
    // `gathering` context is already active — the engine wraps install() in
    // withPersistentContext using the module id.
    const defs: GatheringActionDef[] = [
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
          if (subtractResource(wood, 3)) {
            gainGold(2);
          }
        },
      },
    ];

    const entries = new Map<string, GatheringActionEntry>();

    for (const def of defs) {
      const state = withPersistentContext(`gathering-actions:${def.id}`, () => ({
        progress: persistent<number>(0, { name: 'progress' }),
      }));

      const active = computed(() => queue.currentItem?.id === def.id);
      const percentComplete = computed(() =>
        Math.min(1, Math.max(0, state.progress.value / def.duration)),
      );

      entries.set(def.id, {
        def,
        state,
        display: { title: def.display },
        active,
        percentComplete,
        start() {
          queue.enqueue({ id: def.id, metadata: undefined });
        },
        cancel() {
          if (queue.currentItem?.id === def.id) {
            state.progress.value = 0;
            queue.cancel();
            return;
          }
          const idx = queue.items.value.findIndex((it) => it.id === def.id);
          if (idx >= 0) queue.remove(idx);
        },
      });
    }

    const actions: GatheringActions = {
      get size() {
        return entries.size;
      },
      getAction(id) {
        return entries.get(id);
      },
      getAll() {
        return Array.from(entries.values(), (action) => ({ def: action.def, action }));
      },
    };

    // --- Automation tiers -----------------------------------------------------
    // Tiers unlock as the player earns achievements. The earned count comes
    // from progression.ts which writes to earnedAchievementCount after install.
    const earnedCount = computed(() => earnedAchievementCount.value);

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

    // --- Dispatcher -----------------------------------------------------------
    // Single content type today. A multi-type fork adds a switch on
    // `metadata.type` here (or extracts per-type handlers into sibling
    // modules, the incloneution pattern).
    function dispatchTick(dt: number) {
      const current = queue.currentItem;
      if (!current) return;
      const entry = entries.get(current.id);
      if (!entry) {
        // Orphaned queue item (def was removed) — drop it so the queue
        // can advance instead of stalling forever.
        queue.complete();
        return;
      }

      entry.state.progress.value += dt;
      if (entry.state.progress.value >= entry.def.duration) {
        entry.def.onComplete();
        entry.state.progress.value = 0;
        queue.complete();
      }
    }

    // --- Zone unlock + dispatch + auto-fill tick -----------------------------
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

      dispatchTick(dt);

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
    const state: GatheringState = {
      resources: { wood, stone, gold },
      skills,
      zones,
      actions,
      queue,
      automation,
      woodYieldMult,
      stoneYieldMult,
      earnedAchievementCount,
    };

    ctx.provide(GatheringKey, state);
  },
};
