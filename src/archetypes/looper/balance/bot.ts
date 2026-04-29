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
 * Strategy roster (3c — full canonical roster):
 *   - `farm-mana-pool` (bespoke override, score 100, loop-window gated) —
 *      Biases progression toward mana-feeding progressVars (roam→cache,
 *      trail→wellspring); skips errand-feeding acquaint and trail-prereq'd
 *      mark. Drives exploration of the mana-pool growth axis. Default
 *      window: loops 1–4.
 *   - `farm-gold-buffer` (bespoke override, score 100, loop-window gated) —
 *      Alternate harvest path: bias progression toward acquaint+roam
 *      (errand+latch pool growers), trade aggressively to convert gold
 *      bursts into mana. Differentiates from farm-mana-pool by harvest
 *      timing (gold→Trade burst vs cache→Crack stream). Default window:
 *      loops 5–9.
 *   - `farm-talent` (bespoke override, score 50, mana-headroom gated) —
 *      Self-gating gap-filler: applies whenever last loop's `manaAdded`
 *      exceeds `bot/manaOverflowTrigger`. Engages planner Pass 7
 *      (talent overflow) to soak excess mana into rotating capability
 *      trainers (expMult 4 basics: Stretch/Tend/Listen/Attune). Score 50
 *      means it loses arbitration to loop-window-gated farms when both
 *      apply — only fills phase gaps where no loop-gated farm is active.
 *   - `best-replay:manaAdded` (engine-native via `createBestReplayStrategy`)
 *      — phase-gated via `bot/phases/best-replay/minLoops`. Replays the
 *      snapshot that produced the highest `manaAdded`. Cavernous II shape
 *      lifted to params-replay (planner regenerates against richer state).
 *
 * **Why bespoke for the override strategies:** the engine's
 * `createGoalStrategy` is per-metric best-replay (`recommend()` returns
 * `entry.strategySnapshot`), not fixed-params override. To force "use
 * THESE specific params next loop" we author `RecommendationStrategyDef`
 * directly with a custom `recommend()` returning the override snapshot.
 *
 * **Phase boundaries are tunable.** Each strategy's `canApply` window
 * reads from the shared `looper-tuning` override registry via
 * `tunable('bot/phases/<strategy>/<bound>', ...)`. Solver `pushScope`
 * retunes partition boundaries without reboot. First-cut defaults are
 * placeholders pending probe telemetry — see leaf-4 (OL-746 solver) for
 * calibration; static-data derivation is the long-term goal.
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

import { computed, type ComputedRef } from 'vue';
import {
  Decimal,
  createBestOf,
  createBestReplayStrategy,
  createLoopLog,
  createRecommendationSystem,
  persistent,
  tunable,
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
  LooperTuningRegistryKey,
  ManaAddedKey,
  ManaModuleKey,
  QueueKey,
  type LooperTunables,
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
 * `farm-mana-pool` — bias progression toward mana-feeding progressVars
 * (roam → cache, trail → wellspring + forage), skip the errand-feeding
 * acquaint track. Stretches the mana-pool growth axis across early loops
 * so subsequent loops have productive manapot pools.
 *
 * `acquaint: 0` and `mark: 0` skip those progressVars entirely (the
 * planner's `if (targetDelta <= 0) continue;` branch).
 *
 * `progressionChunkSize: 4` splits each progressVar's target delta into
 * 4-loop pieces so Pass 6 can trim partially under tight initial budgets.
 * Without chunking, the canonical {roam:2, trail:2} target emits 16-loop
 * items that trim all-or-nothing — under the rung-1 budget the trim drops
 * everything, leaving the plan trainer-only and beat-3 unfireable. Chunked
 * trim drops trail-tail chunks first while keeping the leading roam chunk
 * intact, restoring beat-3 fire inside its [30s, 2m] window. Per OL-768.
 */
const FARM_MANA_POOL_PARAMS: PlannerParams = {
  progressionTarget: { roam: 2, trail: 2, acquaint: 0, mark: 0 },
  manaUpOversupplyFactor: 1.0,
  tradeThreshold: 100,
  talentOverflowThreshold: 0,
  progressionChunkSize: 4,
};

/**
 * `farm-gold-buffer` — alternate harvest path emphasizing the gold→mana
 * conversion route. Bias progression toward acquaint (errand pool) and
 * lightly toward roam (latch pool — roam scales latch×1 secondary). Trade
 * fires earlier (`tradeThreshold: 50`) than farm-mana-pool's 100 so the
 * gold-burst rhythm is the differentiator: cache→Crack drips mana every
 * 10th completion, gold→Trade dumps a single burst once the pouch is full.
 *
 * Skips trail+mark progression (Wilds content) — this strategy is
 * Hearth-anchored. By the time Wilds opens, best-replay's loop window
 * will be active anyway.
 *
 * Note on tradeThreshold semantics: `'never'` skips Pass 2 (gold accum)
 * AND Pass 4 (trade) entirely, which would make this strategy a no-op for
 * gold harvesting. Use `'never'` only when stockpiling gold for a
 * persistent-purchase fork (no consumer of that shape today).
 */
const FARM_GOLD_BUFFER_PARAMS: PlannerParams = {
  progressionTarget: { acquaint: 2, roam: 1, trail: 0, mark: 0 },
  manaUpOversupplyFactor: 1.0,
  tradeThreshold: 50,
  talentOverflowThreshold: 0,
};

/**
 * `farm-talent` — talent-soak mode for mana-rich loops. Engages planner
 * Pass 7: after the canonical plan completes, remaining budget headroom
 * is filled with rotating capability trainers (Stretch/Tend/Listen/Attune,
 * the four `expMult: 4` basics). Each trainer iteration grants
 * `weight × adjustedExp = 1 × 4 = 4` capability XP, all of which accrues
 * to Talent at `talentAccrualRatio` — the cross-loop slow-burn axis.
 *
 * `talentOverflowThreshold: 50` = "engage Pass 7 only if at least 50 mana
 * of headroom remains after the canonical plan." Below that the trainer
 * cycle wouldn't fit one full rotation. Tune via probe telemetry.
 *
 * Modest progression bias keeps the loop bootstrapping (without any
 * progression, mana-extending regulars never see their pools grow).
 */
const FARM_TALENT_PARAMS: PlannerParams = {
  progressionTarget: { roam: 1, acquaint: 1, trail: 0, mark: 0 },
  manaUpOversupplyFactor: 1.0,
  tradeThreshold: 100,
  talentOverflowThreshold: 50,
};

// ─── Phase-window tunables ────────────────────────────────────────────────

/**
 * Reactive handles to the four phase-window endpoints (and the mana-overflow
 * trigger) that strategy `canApply`/`recommend` predicates close over.
 * Wired at `install()` time against the shared `looper-tuning` registry.
 *
 * Defaults are first-cut placeholders. The "static-data determines these"
 * goal lives in OL-746 leaf-4 (solver) and a future planner-shape research
 * leaf — until then, probes converge them and pushScope perturbs them.
 */
interface PhaseRefs {
  farmManaPoolMaxLoop: ComputedRef<DecimalSource>;
  farmGoldBufferMinLoop: ComputedRef<DecimalSource>;
  farmGoldBufferMaxLoop: ComputedRef<DecimalSource>;
  bestReplayMinLoops: ComputedRef<DecimalSource>;
  manaOverflowTrigger: ComputedRef<DecimalSource>;
}

// ─── Strategy factories ───────────────────────────────────────────────────

/**
 * Bespoke loop-window override strategy. Recommends a fixed
 * `PlannerParams` snapshot when `loop.count` falls in `[minLoop, maxLoop]`.
 * `score: () => 100` is a fixed weight chosen below typical best-replay
 * `entry.perSecond.toNumber()` magnitudes; combined with disjoint phase
 * gates it's belt-and-suspenders against accidental overlap.
 *
 * Three loop-window override strategies share this shape (farm-mana-pool,
 * farm-gold-buffer, and any future loop-gated farm); the factory captures
 * the boilerplate so each strategy is a one-line registration.
 */
function createLoopWindowStrategy(
  id: string,
  params: PlannerParams,
  minLoop: ComputedRef<DecimalSource>,
  maxLoop: ComputedRef<DecimalSource>,
  summary: string,
): RecommendationStrategyDef {
  return {
    id,
    canApply(ctx: RecommendationContext) {
      const c = ctx.loop.count.value;
      return c >= Number(minLoop.value) && c <= Number(maxLoop.value);
    },
    score: () => 100,
    recommend(ctx: RecommendationContext) {
      const lastEntry = ctx.loopLog.history.value[ctx.loopLog.history.value.length - 1];
      const lastManaAdded = lastEntry?.deltas.find((d) => d.key === 'manaAdded');
      const current = lastManaAdded?.delta ?? Decimal.dZero;
      return {
        snapshot: { plannerParams: params } as unknown as State,
        rationale: {
          strategyId: id,
          metrics: {
            manaAdded: { current, projected: current, delta: Decimal.dZero },
          },
          summary,
        },
      };
    },
  };
}

/**
 * `farm-talent` factory — mana-headroom gating instead of loop-count.
 * Self-applies whenever the previous loop's `manaAdded` delta exceeds the
 * `bot/manaOverflowTrigger` tunable. `score: 50` means it loses arbitration
 * to any loop-window-gated farm (score 100) when both apply — only fills
 * gaps where no loop-gated strategy is active.
 *
 * The override engages planner Pass 7 via `talentOverflowThreshold > 0`,
 * which soaks remaining budget headroom into rotating trainer iterations.
 */
function createFarmTalentStrategy(trigger: ComputedRef<DecimalSource>): RecommendationStrategyDef {
  return {
    id: 'farm-talent',
    canApply(ctx: RecommendationContext) {
      const last = ctx.loopLog.history.value[ctx.loopLog.history.value.length - 1];
      const lastManaAdded = last?.deltas.find((d) => d.key === 'manaAdded')?.delta;
      if (!lastManaAdded) return false;
      return Decimal.gte(lastManaAdded, trigger.value);
    },
    score: () => 50,
    recommend(ctx: RecommendationContext) {
      const last = ctx.loopLog.history.value[ctx.loopLog.history.value.length - 1];
      const current = last?.deltas.find((d) => d.key === 'manaAdded')?.delta ?? Decimal.dZero;
      return {
        snapshot: { plannerParams: FARM_TALENT_PARAMS } as unknown as State,
        rationale: {
          strategyId: 'farm-talent',
          metrics: {
            manaAdded: { current, projected: current, delta: Decimal.dZero },
          },
          summary: 'Soak excess mana into rotating trainer iterations for talent gain.',
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
export function createBalanceBotModule(
  initialParams?: Partial<PlannerParams>,
  initialTuning?: Partial<LooperTunables>,
): EngineModule {
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
      const tuningRegistry = ctx.inject(LooperTuningRegistryKey);
      // Touch ActionsKey early so a missing-dep error surfaces at install.
      ctx.inject(ActionsKey);

      // Initial-tuning push — runs in install, BEFORE connect()'s applyPlan,
      // so loop 1's plan reflects the override. Scope persists for engine
      // lifetime (no cleanup); sim-engines are ephemeral and GC takes care
      // of teardown. The named scope is informational for `scopeDepth`
      // diagnostics.
      //
      // After pushing scope, re-sync mana via `manaModule.resetMana()`. The
      // mana module's install captured `Number(initialMana.value)` BEFORE
      // this scope was pushed (mana installs first per dep order), so its
      // resource starts at the data baseline — wrong if `initialTuning`
      // shifts `balance/initialMana`. resetMana reads `initialMana.value`
      // reactively, picking up the now-scoped value. Sim-only path; the
      // production game never sets `initialTuning`.
      if (initialTuning && Object.keys(initialTuning).length > 0) {
        tuningRegistry.pushScope('balance-bot/initial', initialTuning);
        const manaModule = ctx.inject(ManaModuleKey);
        manaModule.resetMana();
      }

      // Phase-window tunables — registered on the shared `looper-tuning`
      // registry so solver pushScope perturbs them alongside balance/...
      // and actions/<id>/... keys. Defaults are placeholders until probes
      // converge them.
      const phases: PhaseRefs = {
        farmManaPoolMaxLoop: tunable<DecimalSource>(
          tuningRegistry,
          'bot/phases/farm-mana-pool/maxLoop',
          () => 4,
        ),
        farmGoldBufferMinLoop: tunable<DecimalSource>(
          tuningRegistry,
          'bot/phases/farm-gold-buffer/minLoop',
          () => 5,
        ),
        farmGoldBufferMaxLoop: tunable<DecimalSource>(
          tuningRegistry,
          'bot/phases/farm-gold-buffer/maxLoop',
          () => 9,
        ),
        bestReplayMinLoops: tunable<DecimalSource>(
          tuningRegistry,
          'bot/phases/best-replay/minLoops',
          () => 10,
        ),
        manaOverflowTrigger: tunable<DecimalSource>(
          tuningRegistry,
          'bot/manaOverflowTrigger',
          () => 200,
        ),
      };

      // Persistent planner-params — survives importSave round-trips. The
      // initial value is captured BEFORE connect() runs applyPlan(), so
      // loop 1's queued plan reflects `initialParams`. Solvers/validators
      // pass per-strategy params here (rather than writing paramsHandle
      // post-start) — the post-start write would only affect loop 2+ since
      // connect() has already enqueued loop 1's plan from the persistent ref.
      const seedParams: PlannerParams = { ...DEFAULT_PARAMS, ...initialParams };
      const { plannerParams } = withPersistentContext('balance-bot', () => ({
        plannerParams: persistent<PlannerParams>(seedParams, {
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

      // best-replay with reactive minLoops gate. Engine-native factory
      // captures minLoops at construction; we delegate score+recommend to
      // it but override canApply to read the tunable reactively, so solver
      // pushScope on `bot/phases/best-replay/minLoops` retunes without
      // engine reboot.
      const innerBestReplay = createBestReplayStrategy('manaAdded', { minLoops: 0 });
      const bestReplayStrategy: RecommendationStrategyDef = {
        id: innerBestReplay.id,
        canApply(ctx: RecommendationContext) {
          if (ctx.loop.count.value < Number(phases.bestReplayMinLoops.value)) return false;
          return innerBestReplay.canApply(ctx);
        },
        score: innerBestReplay.score,
        recommend: innerBestReplay.recommend,
      };

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
          createLoopWindowStrategy(
            'farm-mana-pool',
            FARM_MANA_POOL_PARAMS,
            // farm-mana-pool's minLoop is a structural 1 (not solver-tuned);
            // only its maxLoop floats. A static computed keeps the factory
            // signature uniform across strategies without a tunable channel.
            computed(() => 1 as DecimalSource),
            phases.farmManaPoolMaxLoop,
            'Bias progression to mana-feeding progressVars; cache-stream harvest path.',
          ),
          createLoopWindowStrategy(
            'farm-gold-buffer',
            FARM_GOLD_BUFFER_PARAMS,
            phases.farmGoldBufferMinLoop,
            phases.farmGoldBufferMaxLoop,
            'Bias progression to gold-feeding progressVars; gold→Trade burst harvest path.',
          ),
          createFarmTalentStrategy(phases.manaOverflowTrigger),
          bestReplayStrategy,
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
  /**
   * Planner-param overrides seeded into the persistent ref BEFORE connect()
   * runs the initial applyPlan, so loop 1's queued plan reflects the
   * override. Equivalent to writing `paramsHandle` + rebuilding, but doesn't
   * require manual rebuild plumbing.
   */
  plannerParamsOverride?: Partial<PlannerParams>;
  /**
   * Tunable-scope overrides pushed onto `LooperTuningRegistryKey` during
   * the bot module's install — BEFORE connect()'s applyPlan and BEFORE the
   * loop module computes initial pool capacities. Same shape as
   * `LooperTuningRegistryKey.pushScope`'s second arg. Use this when loop 1
   * needs to see scoped values like `balance/initialMana`; post-start
   * `pushScope` only affects loop 2+ since loop 1's plan was built at
   * connect time.
   */
  tunableScope?: Partial<LooperTunables>;
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
    extraModules: [
      createBalanceBotModule(options?.plannerParamsOverride, options?.tunableScope),
      ...(options?.extraModules ?? []),
    ],
    maxDeltaTime: options?.maxDeltaTime,
  });
  // Mirror Producer/Ambient bot pattern: select the canonical mod, start
  // (which installs all modules + provides engine refs), stop the real-time
  // tick interval. Caller drives via `runUntil` / `loop.simulateTick`.
  engine.selectMod('classic-adventuring');
  engine.start();
  engine.stop();

  return engine;
}
