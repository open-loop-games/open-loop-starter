/**
 * Looper sim-bot — phase-conditioned plan generator + engine-systems substrate.
 *
 * Wires four layers:
 *   1. **Planner** (`./planner.ts`) — closed-form backward-induction over
 *      visible actions, parameterized by `PlannerParams`. Produces a queue
 *      plan on every `loop.afterRestart`.
 *   2. **LoopLog** — per-loop deltas (`manaAdded`, `goldAccumulated`,
 *      `talentLevelSum`) feeding solver verification + BestOf.
 *   3. **BestOf** — per-metric high-water marks with `captureStrategy`
 *      returning the planner-params snapshot that produced the run.
 *   4. **RecommendationSystem** — per-loop strategy arbitration on
 *      `loop.afterRestart`. autoApply pushes the winning strategy's
 *      planner-param snapshot into `paramsHandle`, so the next loop's
 *      `applyPlan` reads the recommended params.
 *
 * Strategy roster (3b — minimum-viable 1+1; expansion tracked in OL-756):
 *   - `farm-mana-pool` (bespoke override) — phase-gated to loops 1–4.
 *      Biases progression toward mana-feeding progressVars (roam→cache,
 *      trail→wellspring); skips errand-feeding acquaint and trail-prereq'd
 *      mark. Drives exploration of the mana-pool growth axis.
 *   - `best-replay:manaAdded` (engine-native via `createBestReplayStrategy`)
 *     — phase-gated to loops 5+ via `minLoops: 5`. Replays the snapshot
 *      that produced the highest `manaAdded` so far. Cavernous II shape
 *      lifted to params-replay (the planner regenerates the plan against
 *      richer state, so replay improves monotonically).
 *
 * **Why bespoke for the override strategy:** the engine's
 * `createGoalStrategy` is per-metric best-replay (`recommend()` returns
 * `entry.strategySnapshot`), not fixed-params override. To force "use
 * THESE specific params next loop" we author a `RecommendationStrategyDef`
 * directly with a custom `recommend()` returning the override snapshot.
 *
 * Persistence layout:
 *
 * ```
 * balance-bot/
 *   plannerParams: PlannerParams  // baseline = DEFAULT_PARAMS, mutated
 *                                 //   by RecommendationSystem.applySnapshot
 * balance-bot/best-of/
 *   store: Record<metricKey, SerializedBestOfEntry>
 * balance-bot/recommendation-system/  (auto-namespaced)
 *   storedRecommendation, autoApply: true
 * ```
 *
 * Each `buildLooperSimEngine()` call gets a unique `persistenceNamespace`
 * so parallel matrix-cell sims don't collide in storage. Mirrors Ambient.
 */

import {
  Decimal,
  createBestOf,
  createBestReplayStrategy,
  createLoopLog,
  createRecommendationSystem,
  persistent,
  withPersistentContext,
  type BestOf,
  type DecimalSource,
  type Engine,
  type EngineModule,
  type InjectionKey,
  type LoopLog,
  type RecommendationContext,
  type RecommendationStrategyDef,
  type RecommendationSystem,
  type State,
} from 'open-loop-engine';
import {
  ActionsKey,
  CapabilitiesKey,
  GoldKey,
  LoopKey,
  ManaAddedKey,
  QueueKey,
  type QueueItemMeta,
} from '../modules';
import { createLooperEngine, type LooperEngineOptions } from '../boot';
import type { LooperOverrides } from '../data/overrides';
import { DEFAULT_PARAMS, generatePlan, type PlannerParams } from './planner';

// ─── Discovery keys (sim-time introspection) ──────────────────────────────

export const BalanceBotLoopLogKey: InjectionKey<LoopLog> = Symbol(
  'looper/balance-bot/loop-log',
) as InjectionKey<LoopLog>;

export const BalanceBotBestOfKey: InjectionKey<BestOf> = Symbol(
  'looper/balance-bot/best-of',
) as InjectionKey<BestOf>;

/**
 * Sim-time accessor over the persistent planner-params ref. Solver +
 * smoke-tests read/write via this so they don't need to import the
 * persistence machinery directly.
 */
export interface BalanceBotParamsHandle {
  read(): PlannerParams;
  write(next: PlannerParams): void;
}

export const BalanceBotParamsKey: InjectionKey<BalanceBotParamsHandle> = Symbol(
  'looper/balance-bot/params',
) as InjectionKey<BalanceBotParamsHandle>;

export const BalanceBotRecommendationKey: InjectionKey<RecommendationSystem> = Symbol(
  'looper/balance-bot/recommendation',
) as InjectionKey<RecommendationSystem>;

// ─── Strategy override params ─────────────────────────────────────────────

/**
 * `farm-mana-pool` override — bias progression toward mana-feeding
 * progressVars (roam → cache, trail → wellspring + forage), skip the
 * errand-feeding acquaint track. Stretches the mana-pool growth axis
 * across early loops so subsequent loops have productive manapot pools.
 *
 * `acquaint: 0` and `mark: 0` skip those progressVars entirely (the
 * planner's `if (targetDelta <= 0) continue;` branch). `mark` is
 * trail-prereq'd anyway in the canonical content set so it usually
 * isn't visible during this strategy's phase, but the explicit zero
 * makes the intent legible and survives content reshapes.
 *
 * Setting `manaUpOversupplyFactor` higher would just add slack to the
 * static-cost budget cap — orthogonal to mana-pool farming. Stays at
 * 1.0; if probes show benefit from slack here, perturb separately via
 * solver pushScope.
 */
const FARM_MANA_POOL_PARAMS: PlannerParams = {
  progressionTarget: { roam: 2, trail: 2, acquaint: 0, mark: 0 },
  manaUpOversupplyFactor: 1.0,
  tradeThreshold: 100,
};

// ─── Strategy factories ───────────────────────────────────────────────────

/**
 * Phase-gate boundaries for the 3b roster. Hardcoded first-cut constants
 * — refinement (and possible promotion to a tunable surface) tracked in
 * OL-756. The numbers are picked so farm-mana-pool's exploration window
 * is disjoint from best-replay's exploitation window: no overlap, no
 * magnitude conflict between fixed-score override strategies and
 * best-replay's metric-perSecond score.
 */
const PHASE_FARM_MANA_POOL_MAX_LOOP = 4;
const PHASE_BEST_REPLAY_MIN_LOOPS = 5;

/**
 * Bespoke override strategy: recommends a fixed `PlannerParams` snapshot
 * during a phase-gated window. Not engine-native (`createGoalStrategy`
 * replays best-of-metric snapshots, doesn't override) — written directly
 * against `RecommendationStrategyDef` so we can return arbitrary params.
 *
 * `score: () => 100` is a fixed weight chosen below typical best-replay
 * `entry.perSecond.toNumber()` magnitudes; combined with disjoint phase
 * gates it's belt-and-suspenders against accidental overlap.
 */
function createFarmManaPoolStrategy(): RecommendationStrategyDef {
  const params = FARM_MANA_POOL_PARAMS;
  return {
    id: 'farm-mana-pool',
    canApply(ctx: RecommendationContext) {
      return ctx.loop.count.value >= 1 && ctx.loop.count.value <= PHASE_FARM_MANA_POOL_MAX_LOOP;
    },
    score: () => 100,
    recommend(ctx: RecommendationContext) {
      const lastEntry = ctx.loopLog.history.value[ctx.loopLog.history.value.length - 1];
      const lastManaAdded = lastEntry?.deltas.find((d) => d.key === 'manaAdded');
      const current = lastManaAdded?.delta ?? Decimal.dZero;
      return {
        snapshot: { plannerParams: params } as unknown as State,
        rationale: {
          strategyId: 'farm-mana-pool',
          metrics: {
            manaAdded: { current, projected: current, delta: Decimal.dZero },
          },
          summary: 'Bias progression to mana-feeding progressVars; skip errand track.',
        },
      };
    },
  };
}

// ─── EngineModule factory ─────────────────────────────────────────────────

/**
 * Bot module — installs LoopLog + BestOf + the per-restart planner trigger.
 *
 * Dependencies span the full looper module stack because the planner reads
 * action vectors / progressVar levels / regularVar pools / capabilities to
 * build the plan. This is heavier than Ambient's bot (which only depends
 * on `ambient/auto-producers`) but every dependency is load-bearing for
 * plan correctness — the planner can't reason about content it can't see.
 */
export function createBalanceBotModule(): EngineModule {
  // Per-instance closure — applyPlan is defined in install() and called
  // from connect(). Hoisting it out of install() lets the connect() phase
  // call the function created during that same module instance's install,
  // without leaking across parallel sim engines (each createBalanceBotModule
  // invocation gets its own closure).
  let applyPlan: (() => void) | undefined;
  return {
    id: 'looper/balance-bot',
    dependencies: [
      'looper/actions',
      'looper/capabilities',
      'looper/progress-vars',
      'looper/regular-vars',
      'looper/mana',
      'looper/gold',
      'looper/loop',
      'looper/queue',
    ],
    install(ctx) {
      const queue = ctx.inject(QueueKey);
      const loop = ctx.inject(LoopKey);
      const capabilities = ctx.inject(CapabilitiesKey);
      const manaAdded = ctx.inject(ManaAddedKey);
      const gold = ctx.inject(GoldKey);
      // Touch ActionsKey early so a missing-dep error surfaces at install.
      ctx.inject(ActionsKey);

      // Persistent planner-params — survives importSave round-trips.
      const { plannerParams } = withPersistentContext('balance-bot', () => ({
        plannerParams: persistent<PlannerParams>(DEFAULT_PARAMS, {
          name: 'plannerParams',
        }),
      }));

      const paramsHandle: BalanceBotParamsHandle = {
        read: () => plannerParams.value,
        write: (next) => {
          plannerParams.value = next;
        },
      };

      // LoopLog — per-loop deltas. `manaAdded` and `gold` are persistent refs
      // (zero each restart, so delta = end value); `talentLevelSum` is a
      // computed-by-callback metric (sum across capabilities at snapshot time).
      const loopLog = createLoopLog({
        loop,
        metrics: {
          manaAdded,
          goldAccumulated: () => gold.value,
          talentLevelSum: () => {
            let total = new Decimal(0);
            for (const entry of capabilities.getAll()) {
              total = total.add(entry.state.talent.level.value);
            }
            return total as DecimalSource;
          },
          loopElapsed: () => new Decimal(loop.elapsed.value) as DecimalSource,
        },
        maxLogs: 32,
      });

      // BestOf — high-water marks per metric. captureStrategy snapshots the
      // current planner-params so the future leaf-3b best-replay strategy
      // has the exact param-set to restore. State blob is intentionally
      // opaque (engine doesn't introspect it).
      const bestOf = createBestOf({
        id: 'balance-bot/best-of',
        metrics: {
          manaAdded: { mode: 'absolute' },
          goldAccumulated: { mode: 'absolute' },
          talentLevelSum: { mode: 'absolute' },
          loopElapsed: { mode: 'absolute' },
        },
        loopLog,
        captureStrategy: () => ({ plannerParams: plannerParams.value }),
      });

      // RecommendationSystem — composes LoopLog + BestOf + Loop into
      // strategy arbitration on `loop.afterRestart`. Subscribes to the loop
      // INSIDE its constructor (recommendation.ts:466), so the order of
      // operations on each restart becomes:
      //
      //   1. loop emits afterRestart
      //   2. RecommendationSystem.evaluate() picks winner, applySnapshot
      //      writes new params via paramsHandle (autoApply = true)
      //   3. Bot's afterRestart subscriber (registered AFTER, below) fires
      //      applyPlan → reads the (possibly updated) params → writes new
      //      queue plan
      //
      // Order is load-bearing: if applyPlan ran before evaluate, the plan
      // would use stale params for the loop the recommendation was meant
      // to influence.
      const recommendation = createRecommendationSystem({
        id: 'balance-bot/recommendation',
        loop,
        loopLog,
        bestOf,
        getCurrentSnapshot: () => ({ plannerParams: plannerParams.value }) as unknown as State,
        applySnapshot: (snap: State) => {
          // Snapshot shape: { plannerParams: PlannerParams }. Engine treats
          // State as opaque; we trust our own captureStrategy + strategy
          // recommend() to put plannerParams at the expected path.
          const next = (snap as unknown as { plannerParams?: PlannerParams }).plannerParams;
          if (next) plannerParams.value = next;
        },
        strategies: [
          createFarmManaPoolStrategy(),
          createBestReplayStrategy('manaAdded', { minLoops: PHASE_BEST_REPLAY_MIN_LOOPS }),
        ],
      });
      // Sim-bot mode: auto-apply the winning recommendation. Production
      // play-assist would surface advisorily and let the player apply.
      recommendation.autoApply.value = true;

      // Plan trigger — fire after each restart. The fresh restart has
      // already run thingsToReset + onRestart in loop.ts, so action
      // adjustedTicks now reflects the post-retention state. Generate plan
      // against THAT view, then write to queue.
      applyPlan = (): void => {
        const items = generatePlan(ctx, plannerParams.value);
        queue.clear();
        for (const item of items) {
          queue.enqueue({
            id: item.actionId,
            metadata: {
              loops: item.loops,
              loopsLeft: item.loops,
            } as QueueItemMeta,
          });
        }
      };

      // Subsequent-loop trigger: regenerate on every afterRestart. State
      // has shifted (talent compounded, progressVar levels persisted) AND
      // RecommendationSystem may have just rewritten plannerParams, so
      // the planner reads the latest view.
      loop.on('afterRestart', () => {
        applyPlan?.();
      });

      ctx.provide(BalanceBotLoopLogKey, loopLog);
      ctx.provide(BalanceBotBestOfKey, bestOf);
      ctx.provide(BalanceBotParamsKey, paramsHandle);
      ctx.provide(BalanceBotRecommendationKey, recommendation);
    },
    connect() {
      // Initial plan — fires after all module connects have run, so the
      // looper/loop module's queue.on('start') → loop.run() subscription
      // is already wired. The first enqueue here promotes the paused loop
      // to running, kicking off loop 1. install() can't do this safely:
      // bot installs after loop, but loop's queue→loop.run wiring is in
      // loop's connect(), which doesn't run until all installs complete.
      applyPlan?.();
    },
  };
}

// ─── Sim-engine factory ───────────────────────────────────────────────────

let engineCounter = 0;

export interface BuildLooperSimEngineOptions extends LooperEngineOptions {
  /** Planner-param overrides written into the persistent ref AFTER engine.start(). */
  plannerParamsOverride?: Partial<PlannerParams>;
}

/**
 * Build a started, sim-bot-driven Looper engine.
 *
 * Mirrors `buildAmbientSimEngine`'s shape — unique persistence namespace
 * per build (so parallel matrix-cell sims can't collide), bot module
 * registered via `extraModules`, engine `start()`ed and immediately
 * `stop()`ped so the real-time interval doesn't fire (caller drives via
 * `runUntil` / `engine.loop.simulateTick(tickDelta)`).
 */
export function buildLooperSimEngine(
  overrides?: LooperOverrides,
  options?: BuildLooperSimEngineOptions,
): Engine {
  const namespace = options?.persistenceNamespace ?? `balance-${++engineCounter}`;
  const { engine } = createLooperEngine(overrides, {
    persistenceNamespace: namespace,
    extraModules: [createBalanceBotModule(), ...(options?.extraModules ?? [])],
    maxDeltaTime: options?.maxDeltaTime,
  });
  // Mirror Producer/Ambient bot pattern: select the canonical mod, start
  // (which installs all modules + provides engine refs), stop the real-time
  // tick interval. Caller drives via `runUntil` / `loop.simulateTick`.
  engine.selectMod('classic-adventuring');
  engine.start();
  engine.stop();

  // Planner-param overrides after start so the persistent ref exists.
  if (options?.plannerParamsOverride) {
    const handle = engine.tryInject(BalanceBotParamsKey);
    if (handle) {
      handle.write({ ...handle.read(), ...options.plannerParamsOverride });
    }
  }

  return engine;
}
