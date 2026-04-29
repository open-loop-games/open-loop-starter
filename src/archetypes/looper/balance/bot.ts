/**
 * Looper sim-bot — phase-conditioned plan generator + engine-systems substrate.
 *
 * Wires three layers:
 *   1. **Planner** (`./planner.ts`) — closed-form backward-induction over
 *      visible actions, parameterized by `PlannerParams`. Produces a queue
 *      plan on every `loop.afterRestart`.
 *   2. **LoopLog** — per-loop deltas (`manaAdded`, `goldAccumulated`,
 *      `talentLevelSum`) feeding solver verification + BestOf.
 *   3. **BestOf** — per-metric high-water marks with `captureStrategy`
 *      returning the planner-params snapshot that produced the run.
 *
 * Goal-strategies + RecommendationSystem are deferred to leaf 3b. The 3a
 * canonical bot ships with a single planner-params set (`DEFAULT_PARAMS`)
 * stored as a Persistent ref in the bot module's namespace; the solver
 * perturbs values via `pushScope('bot/params/...')` and the snapshot
 * captures the perturbed values for replay arbitration when 3b lands.
 *
 * Persistence layout:
 *
 * ```
 * balance-bot/
 *   plannerParams: PlannerParams  // baseline = DEFAULT_PARAMS
 * balance-bot/best-of/
 *   store: Record<metricKey, SerializedBestOfEntry>
 * balance-bot/loop-log/
 *   (uses LoopLog's internal in-memory ring; no persistent state)
 * ```
 *
 * Each `buildLooperSimEngine()` call gets a unique `persistenceNamespace`
 * so parallel matrix-cell sims don't collide in storage. Mirrors Ambient.
 */

import {
  Decimal,
  createBestOf,
  createLoopLog,
  persistent,
  withPersistentContext,
  type BestOf,
  type DecimalSource,
  type Engine,
  type EngineModule,
  type InjectionKey,
  type LoopLog,
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
      // has shifted (talent compounded, progressVar levels persisted), so
      // the planner sees richer content and produces a better plan.
      loop.on('afterRestart', () => {
        applyPlan?.();
      });

      ctx.provide(BalanceBotLoopLogKey, loopLog);
      ctx.provide(BalanceBotBestOfKey, bestOf);
      ctx.provide(BalanceBotParamsKey, paramsHandle);
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
