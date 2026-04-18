/**
 * Idle Loops mod — loop-runner archetype.
 *
 * Self-contained game: RPG stats, 2 zones, 12 actions, mana-drained loop
 * with skill retention. Demonstrates list-mode Sequencer, BestOf with
 * captureStrategy, and RecommendationSystem wiring.
 *
 * Follows the cookie-factory pattern: single EngineModule, no dependency
 * on the village-gatherer bundle.
 */
import { computed, ref } from 'vue';
import {
  Decimal,
  createSequencer,
  createAchievementCategory,
  buildSensitivityCell,
  persistent,
  SaveManagerKey,
  type InjectionKey,
  type EngineModule,
  type EngineContext,
  type Engine,
  type Resource,
  type DecimalSource,
  type Sequencer,
  type SkillCategory,
  type ZoneSystem,
  type AchievementCategory,
  type BestOf,
  type Loop,
  type LoopLog,
  type RecommendationSystem,
  type Analyzer,
  type AnalyzerResult,
  type Cell,
  type Persistent,
} from 'open-loop-engine';
import { settingsModule } from '@/modules/settings';
import { uiRegistryModule } from '@/modules/ui-registry';
import { useAutomation, type UseAutomationReturn } from '@/composables/useAutomation';
import { setSlot } from '@/modules/ui-registry';
import IdleLoopsLayout from '@/ui/layouts/IdleLoopsLayout.vue';
import {
  statDefs,
  zoneDefs,
  actionDefs,
  achievementDefs,
  seedQueue,
  type StatDef,
  type AchievementDef,
} from './content';
import { createIdleLoopsStats } from './stats';
import { createIdleLoopsZones } from './zones';
import { createIdleLoopsActions, type IdleLoopsActions } from './actions';
import { createIdleLoopsLoop } from './loop';
import type { MutateBestHandle } from './workbench/mutate-best-strategy';
import { RECOMMENDATION_TIERS } from './tiers';

export {
  RECOMMENDATION_TIERS,
  currentRecommendationTier,
  nextRecommendationTier,
  type RecommendationTierDef,
} from './tiers';

const SENSITIVITY_THRESHOLD = RECOMMENDATION_TIERS.find(
  (t) => t.id === 'il-mutate-best-sensitivity',
)!.achievementsRequired;

// ============================================================================
// Exported state
// ============================================================================

export interface IdleLoopsState {
  stats: SkillCategory<StatDef>;
  zones: ZoneSystem;
  actions: IdleLoopsActions;
  queue: Sequencer;
  mana: Resource<DecimalSource>;
  maxMana: Decimal;
  loop: Loop;
  loopLog: LoopLog;
  bestOf: BestOf;
  recommendations: RecommendationSystem;
  /** Handle for the MutateBest strategy — setSensitivity is called during connect() to install Tier 3b. */
  mutateBest: MutateBestHandle;
  /** Tier 4: player-selectable goal metric driving the GoalStrategy. Defaults to 'str-xp'. */
  selectedGoalMetric: Persistent<string>;
  achievements: AchievementCategory<AchievementDef>;
  automation: UseAutomationReturn;
}

export const IdleLoopsKey: InjectionKey<IdleLoopsState> =
  Symbol('idle-loops') as InjectionKey<IdleLoopsState>;

// ============================================================================
// Module
// ============================================================================

/**
 * Factory for the idle-loops module. Returns a fresh EngineModule on each
 * call — needed so the Tier 3b sensitivity path can spin up scratch engines
 * with independent module instances. The default export `idleLoopsModule`
 * calls this factory once.
 */
export function createIdleLoopsModule(): EngineModule {
  return {
    id: 'idle-loops',
    dependencies: ['settings', 'ui-registry'],
    install(ctx: EngineContext) {
    // 1. Stats (accumulator mode with retention)
    const stats = createIdleLoopsStats(statDefs);

    // 2. Zones
    const zones = createIdleLoopsZones(zoneDefs);

    // 3. Sequencer (list mode) + seed tier-0 queue
    const queue = createSequencer({
      id: 'il-queue',
      mode: 'list',
      registerTick: ctx.onTick,
    });
    for (const actionId of seedQueue) {
      queue.enqueue({ id: actionId, metadata: undefined });
    }

    // 4. Actions (ContentRegistry + single TimedProgress)
    const actions = createIdleLoopsActions({
      actionDefs,
      stats,
      queue,
      zones,
      registerTick: ctx.onTick,
    });

    // 5. Loop lifecycle (mana, loop, loopLog, bestOf, recommendations)
    // earnedCount is passed as a thunk so the recommendation strategies
    // registered inside createIdleLoopsLoop can gate on achievements that
    // aren't registered yet at this point in the install sequence.
    const selectedGoalMetric = persistent<string>('str-xp', { name: 'selectedGoalMetric' });
    const loopState = createIdleLoopsLoop({
      stats,
      queue,
      progress: actions.progress,
      currentManaCostRate: actions.currentManaCostRate,
      registerTick: ctx.onTick,
      earnedCount: () => achievements.earnedCount.value,
      actionPool: () => actionDefs.map((a) => a.id),
      selectedGoalMetric: () => selectedGoalMetric.value,
    });

    // 6. Achievements
    const dungeonCompleted = ref(false);
    queue.on('complete', (item) => {
      if (item.id === 'dungeon-sprint') dungeonCompleted.value = true;
    });

    const achievements = createAchievementCategory<AchievementDef>({
      id: 'il-achievements',
      mapAchievement: (def) => ({
        display: { title: def.title, description: def.description },
        requirement: () => {
          switch (def.id) {
            case 'first-loop':
              return Decimal.gte(loopState.loop.count.value, 1);
            case 'str-5':
              return Decimal.gte(stats.getSkill('str')!.level.value, 5);
            case 'all-stats-3':
              return statDefs.every((s) =>
                Decimal.gte(stats.getSkill(s.id)!.level.value, 3),
              );
            case 'forest-unlocked':
              return zones.isUnlocked('forest-path');
            case 'dungeon-clear':
              return dungeonCompleted.value;
            case 'loop-10':
              return Decimal.gte(loopState.loop.count.value, 10);
            case 'stat-10':
              return statDefs.some((s) =>
                Decimal.gte(stats.getSkill(s.id)!.level.value, 10),
              );
            case 'loop-25':
              return Decimal.gte(loopState.loop.count.value, 25);
            default:
              return false;
          }
        },
      }),
    });
    achievements.register(achievementDefs);

    // 7. Automation tiers (gated by earned achievement count)
    const earnedCount = computed(() => achievements.earnedCount.value);
    const automation = useAutomation({
      id: 'il-automation',
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

    // 8. Zone unlock tick + sequencer advance cap
    ctx.onTick(() => {
      queue.resetAdvanceCount();

      // Unlock Forest Path when Str >= 5
      if (!zones.isUnlocked('forest-path')) {
        const strSkill = stats.getSkill('str');
        if (strSkill && Decimal.gte(strSkill.level.value, 5)) {
          zones.unlock('forest-path');
        }
      }
    });

    // 9. Provide state
    const state: IdleLoopsState = {
      stats,
      zones,
      actions,
      queue,
      mana: loopState.mana,
      maxMana: loopState.maxMana,
      loop: loopState.loop,
      loopLog: loopState.loopLog,
      bestOf: loopState.bestOf,
      recommendations: loopState.recommendations,
      mutateBest: loopState.mutateBest,
      selectedGoalMetric,
      achievements,
      automation,
    };
    ctx.provide(IdleLoopsKey, state);

    // 10. Layout
    setSlot('game-layout', IdleLoopsLayout);
    },

    connect(ctx: EngineContext) {
      // Tier 3b wiring: install the sensitivity config on the MutateBest
      // handle now that SaveManager is available. Deferred to connect() so
      // the scratch-engine factory can read a fresh save blob each
      // recommend() call.
      const saveManager = ctx.tryInject(SaveManagerKey);
      if (!saveManager) return;
      const state = ctx.inject(IdleLoopsKey);

      const METRIC_NAME = 'str-xp';
      const ANALYZER_NAME = 'loop-log';

      const buildCell = (name: string, queueSnapshot: Array<{ id: string }>): Cell =>
        buildSensitivityCell({
          name,
          saveBlob: saveManager.exportSave(),
          modules: () => [settingsModule, uiRegistryModule, createIdleLoopsModule()],
          perturb: (engine: Engine, _ctx) => {
            const scratch = engine.tryInject(IdleLoopsKey);
            if (!scratch) return;
            scratch.queue.clear();
            for (const item of queueSnapshot) {
              scratch.queue.enqueue({ id: item.id, metadata: undefined });
            }
          },
          buildAnalyzers: (engine: Engine): Analyzer[] => {
            const scratch = engine.tryInject(IdleLoopsKey);
            if (!scratch) return [];
            let total = 0;
            let unsub: (() => void) | null = null;
            return [
              {
                name: ANALYZER_NAME,
                onStart() {
                  unsub = scratch.loopLog.on('finalize', (entry) => {
                    const d = entry.deltas.find((x) => x.key === METRIC_NAME);
                    if (d) total += new Decimal(d.delta).toNumber();
                  });
                },
                onEnd() {
                  unsub?.();
                },
                summarize(): AnalyzerResult {
                  return {
                    name: ANALYZER_NAME,
                    metrics: { [METRIC_NAME]: total },
                    issues: [],
                  };
                },
              },
            ];
          },
          tick: (engine: Engine, dt: number) => {
            engine.loop.simulateTick(dt);
          },
          ticks: 400,
          tickDelta: 0.05,
        });

      state.mutateBest.setSensitivity({
        threshold: SENSITIVITY_THRESHOLD,
        candidateCount: 4,
        seeds: [1, 2, 3],
        metricName: METRIC_NAME,
        buildCell,
      });
    },
  };
}

export const idleLoopsModule: EngineModule = createIdleLoopsModule();
