/**
 * Loop mod — mana-driven loop cycle with per-run history and timed buffs.
 *
 * Engine systems demonstrated:
 *   - createLoop (mana drain → reset cycle with retention)
 *   - createRetentionPolicy (keep permanent skill bonuses across resets)
 *   - createLoopLog (per-run delta tracking with ring buffer history)
 *   - createTemporaryEffectSystem (duration-based buffs that expire per-run)
 *
 * When mana hits zero, the loop restarts: resources and actions reset,
 * but skill permanent bonuses + producers + upgrades + achievements persist.
 * Loop-log captures per-run deltas for wood/stone/gold/levels. Temporary
 * effects (e.g. "2× production for 30s after leveling up") expire within
 * a single run and are cleared on restart.
 *
 * Cross-references:
 *   - gathering.ts provides resources, skills, actions reset by the loop
 *   - economy.ts provides productionChain for temporary buff bindings
 *   - progression.ts best-of could integrate with loop-log (future OL-363+)
 */
import {
  Decimal,
  createResource,
  createLoop,
  createLoopLog,
  createTemporaryEffectSystem,
  createMultiplicativeModifier,
  SaveManagerKey,
  type InjectionKey,
  type EngineModule,
  type EngineContext,
  type Resource,
  type DecimalSource,
  type Persistent,
  type Loop,
  type LoopLog,
  type TemporaryEffectSystem,
} from 'open-loop-engine';
import { GatheringKey } from '@/modules/gathering';
import { EconomyKey } from '@/modules/economy';
import { setSlot } from '@/modules/ui-registry';
import VanillaLayout from '@/ui/layouts/VanillaLayout.vue';

const MAX_MANA = new Decimal(100);
const MANA_DRAIN_PER_SEC = 2;

export interface LoopState {
  mana: Resource<DecimalSource>;
  maxMana: Decimal;
  loop: Loop;
  loopLog: LoopLog;
  tempEffects: TemporaryEffectSystem;
}

export const LoopKey: InjectionKey<LoopState> = Symbol('loop') as InjectionKey<LoopState>;

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/** Callback that resolves LoopLog metric getters from the engine context at install time. */
export type LoopLogMetricsProvider =
  (ctx: EngineContext) => Record<string, Persistent<DecimalSource> | (() => DecimalSource)>;

export interface CreateLoopModuleOptions {
  /** Provides the named metric getters passed to `createLoopLog`. */
  loopLogMetrics: LoopLogMetricsProvider;
  /** Maximum unpinned entries in the ring buffer. Default: 10. */
  maxLogs?: number;
}

/** Create a loop module with caller-supplied LoopLog metrics. */
export function createLoopModule(opts: CreateLoopModuleOptions): EngineModule {
  return {
    id: 'loop',
    dependencies: ['gathering', 'economy'],
    install(ctx: EngineContext) {
      const g = ctx.inject(GatheringKey);
      const economy = ctx.inject(EconomyKey);

      const woodcutting = g.skills.getSkill('woodcutting')!;
      const mining = g.skills.getSkill('mining')!;

      const mana = createResource<DecimalSource>(MAX_MANA, { displayName: 'Mana' });

      // Drain mana while the loop is running
      ctx.onTick((dt: number) => {
        if (loop.running.value) {
          const drain = Decimal.mul(MANA_DRAIN_PER_SEC, dt);
          mana.value = Decimal.max(Decimal.sub(mana.value, drain), 0);
        }
      });

      const loop = createLoop({
        id: 'main-loop',
        endCondition: () => Decimal.lte(mana.value, 0),
        resetModules: ['gathering'],
        keep: [woodcutting.permanentBonus!, mining.permanentBonus!],
        thingsToReset: [mana],
        onBeforeRestart() {
          woodcutting.accumulateBonus!();
          mining.accumulateBonus!();
        },
        onRestart() {
          mana.value = MAX_MANA;
          // Clear all temporary effects on loop restart — buffs are per-run
          tempEffects.dispelAll();
        },
        registerTick: ctx.onTick,
      });

      // --- Loop log (per-run history) -----------------------------------------
      // Tracks deltas for key metrics each loop. Ring buffer keeps last N runs.
      // Integrates automatically via loop.on('beforeRestart'/'afterRestart').
      const loopLog = createLoopLog({
        loop,
        metrics: opts.loopLogMetrics(ctx),
        maxLogs: opts.maxLogs ?? 10,
      });

      // --- Temporary effects (timed buffs) ------------------------------------
      // Duration-based buffs that expire within a single run. Cleared on restart.
      // Example: "2× production for 30s" triggered when a skill levels up.
      const tempEffects = createTemporaryEffectSystem({
        id: 'loop-temp-effects',
        registerTick: ctx.onTick,
      });

      // Register buff definitions — these declare what a buff does, not when
      // it fires. Call tempEffects.apply('production-surge') to activate one.
      tempEffects.register({
        id: 'production-surge',
        duration: 30,
        maxStacks: 1,
        stackBehavior: 'refresh',
        modifiers: [{
          chain: economy.productionChain,
          modifier: () => createMultiplicativeModifier({
            multiplier: 2,
            description: 'Production Surge (temp)',
          }),
        }],
      });

      tempEffects.register({
        id: 'gathering-rush',
        duration: 15,
        maxStacks: 3,
        stackBehavior: 'independent',
        modifiers: [{
          chain: economy.productionChain,
          modifier: () => createMultiplicativeModifier({
            multiplier: 1.5,
            description: 'Gathering Rush (temp)',
          }),
        }],
      });

      // Trigger production-surge when a skill levels up during this run
      woodcutting.on('levelUp', () => tempEffects.apply('production-surge'));
      mining.on('levelUp', () => tempEffects.apply('production-surge'));

      loop.run();

      // Save metadata for slot cards
      const saveManager = ctx.tryInject(SaveManagerKey);
      if (saveManager) {
        saveManager.setMetadataProvider(() => ({
          loopCount: loop.count.value,
          playtime: loop.elapsed.value,
        }));
      }

      const state: LoopState = { mana, maxMana: MAX_MANA, loop, loopLog, tempEffects };
      ctx.provide(LoopKey, state);

      // Register the default layout
      setSlot('game-layout', VanillaLayout);
    },
  };
}

// ---------------------------------------------------------------------------
// Village-gatherer default — backward-compatible constant
// ---------------------------------------------------------------------------

export const loopModule: EngineModule = createLoopModule({
  loopLogMetrics: (ctx) => {
    const g = ctx.inject(GatheringKey);
    const woodcutting = g.skills.getSkill('woodcutting')!;
    const mining = g.skills.getSkill('mining')!;
    return {
      wood: () => g.resources.wood.value,
      stone: () => g.resources.stone.value,
      gold: () => g.resources.gold.value,
      'woodcutting-xp': woodcutting.xp,
      'mining-xp': mining.xp,
    };
  },
});
