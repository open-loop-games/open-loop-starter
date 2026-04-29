import {
  Decimal,
  GameLoopKey,
  createLoop,
  createRetentionPolicy,
  type EngineModule,
  type EngineRef,
  type GameLoop,
  type InjectionKey,
  type Loop,
  type Persistent,
  type RetentionPolicy,
  type Sequencer,
} from 'open-loop-engine';
import type { LooperData } from '../data/types';
import { ActionsKey, getActionProgressRefs, getActionTimesCompletedRefs } from './actions';
import { CapabilitiesKey, getTalentXpRefs } from './capabilities';
import { GoldModuleKey } from './gold';
import { ManaKey, ManaModuleKey } from './mana';
import { ProgressVarsKey, getProgressVarXpRefs } from './progress-vars';
import { RegularVarsKey, getRegularVarPerLoopRefs, getRegularVarTotalRefs } from './regular-vars';
import {
  QueueKey,
  QueueModuleKey,
  QueueShouldRestartKey,
  type LooperQueueModule,
  type QueueItemMeta,
} from './queue';

export const LoopKey: InjectionKey<Loop> = Symbol('looper/loop') as InjectionKey<Loop>;

/**
 * Loop orchestration — engine `createLoop` + `createRetentionPolicy`.
 *
 * Boot is paused (no `loop.run()` at install). The first time the queue
 * dispatches an item, the queue's `'start'` event flips the loop on (wired
 * in `connect()`). When the queue plan exhausts or the player clears it
 * mid-run, the queue sets `shouldRestart`; the loop's `endCondition` reads
 * that alongside `mana <= 0`, so "empty queue ⇒ loop ends" matches vanilla
 * idle-loops `actions.js:103-108`.
 *
 * Per-tick (only while running): drain mana `round(tickRate × dt)` per tick.
 * At engine 20 TPS that's 1 mana per engine tick — the canonical "1 mana =
 * 1 tick" coupling that makes manaCost directly comparable to the pool.
 *
 * Restart sequence:
 *   onBeforeRestart — snapshot retention (Talent XP, action timesCompleted)
 *   reset.execute  — zero Level XP, action progress (mana refilled in onRestart)
 *   onRestart      — restore retention, reset mana to initialMana, reset
 *                     queue (per-item loopsLeft, cursor → 0, shouldRestart
 *                     cleared); if the queue is empty, pause the loop so it
 *                     waits for the next enqueue.
 *
 * The retention policy is built lazily on first reset (idle-loops-ng's
 * pattern). The reason: Talent refs only exist after `capabilities.install`
 * runs; building lazily on the first `onBeforeRestart` is the safe choice.
 */
export function createLoopModule(_data: LooperData): EngineModule {
  // Cross-module refs assigned in connect() (queue installs after loop, so
  // these can't be injected during install — endCondition / onRestart
  // closures read them lazily at tick time).
  let shouldRestart: EngineRef<boolean> | null = null;
  let queueModule: LooperQueueModule | null = null;
  let queueSequencer: Sequencer<QueueItemMeta> | null = null;
  let createdLoop: Loop | null = null;

  return {
    id: 'looper/loop',
    dependencies: [
      'looper/mana',
      'looper/gold',
      'looper/capabilities',
      'looper/progress-vars',
      'looper/regular-vars',
      'looper/actions',
    ],
    install(ctx) {
      const mana = ctx.inject(ManaKey);
      const manaModule = ctx.inject(ManaModuleKey);
      const goldModule = ctx.inject(GoldModuleKey);
      const capabilities = ctx.inject(CapabilitiesKey);
      const progressVars = ctx.inject(ProgressVarsKey);
      const regularVars = ctx.inject(RegularVarsKey);
      const actions = ctx.inject(ActionsKey);
      const gameLoop: GameLoop = ctx.inject(GameLoopKey);

      let retention: RetentionPolicy | null = null;
      let retentionBuilt = false;

      function ensureRetention(): RetentionPolicy {
        if (!retentionBuilt) {
          // Persists across loops: capability Talent XP, action
          // timesCompleted (action-completion-count prereqs), progressVar XP
          // (Wander-shape persistent exploration), regularVar `total`
          // (derived from progressVar levels — cached so save/load doesn't
          // need to walk the level-up emitter pre-rehydration).
          // Per-loop refs (capability Level XP, action progress, regularVar
          // checked/good, gold, mana) clear via thingsToReset / onRestart.
          const keep: Persistent[] = [
            ...getTalentXpRefs(capabilities),
            ...getActionTimesCompletedRefs(actions),
            ...getProgressVarXpRefs(progressVars),
            ...getRegularVarTotalRefs(regularVars),
          ];
          retention = createRetentionPolicy({ keep });
          retentionBuilt = true;
        }
        return retention!;
      }

      const loop = createLoop({
        id: 'looper/loop',
        endCondition: () => Decimal.lte(mana.value, 0) || shouldRestart?.value === true,

        // Per-loop reset scope. Capability Level XP zeros (Talent survives via
        // retention); action progress zeros; regularVar checked/good zero
        // (`total` survives via retention). Action timesCompleted is also
        // pushed here AND kept in retention — the engine snapshots-then-
        // restores from the retention `keep` list, so the reset+restore
        // round-trip preserves it. Gold and mana clear via onRestart's
        // imperative resets, NOT here, so save-reset (zero out) and
        // loop-restart (refill / zero) stay distinguishable.
        thingsToReset: () => {
          const things: unknown[] = [];
          for (const entry of capabilities.getAll()) {
            things.push(entry.state.level.xp);
          }
          for (const ref of getActionProgressRefs(actions)) {
            things.push(ref);
          }
          for (const ref of getActionTimesCompletedRefs(actions)) {
            things.push(ref);
          }
          for (const ref of getRegularVarPerLoopRefs(regularVars)) {
            things.push(ref);
          }
          return things;
        },

        onBeforeRestart: () => {
          ensureRetention().snapshot();
        },

        onRestart: () => {
          ensureRetention().restore();
          // Reset mana to initialMana, clear manaAdded, and zero gold BEFORE
          // the queue auto-dispatches — the queue's `canRun` checks mana, so
          // this order matters. Gold resets to 0 (vanilla idle-loops shape:
          // per-loop currency, no cross-loop compounding).
          manaModule.resetMana();
          goldModule.resetGold();
          // Walk per-item loopsLeft → loops, cursor → 0, clear
          // shouldRestart. resetCursor auto-dispatches if items[0] is
          // runnable; if empty, dispatch is a no-op.
          queueModule?.resetForLoop();
          // Empty-plan boot/restart: park the loop until the player
          // enqueues something. The 'start' event subscription (connect)
          // resumes us when the next dispatch fires.
          if (queueSequencer && queueSequencer.items.value.length === 0) {
            loop.pause();
          }
        },

        registerTick: ctx.onTick,
      });

      // Mana drain — `round(tickRate × dt)` per tick, only while loop is
      // running. Gated here so an empty queue with the loop paused (boot,
      // post-restart) does NOT drain mana.
      ctx.onTick((dt: number) => {
        if (!loop.running.value) return;
        if (Decimal.lte(mana.value, 0)) return;
        const drainAmount = Math.round(gameLoop.tickRate * dt);
        if (drainAmount <= 0) return;
        manaModule.drainMana(drainAmount);
      });

      createdLoop = loop;
      ctx.provide(LoopKey, loop);
    },
    connect(ctx) {
      shouldRestart = ctx.inject(QueueShouldRestartKey);
      queueModule = ctx.inject(QueueModuleKey);
      queueSequencer = ctx.inject(QueueKey);

      // Auto-start on first dispatch. Sequencer fires 'start' whenever it
      // transitions an item to current — first enqueue from idle, mana
      // refill resolving 'notNow', cursor advance into a runnable item.
      // Calling run() on an already-running loop is a no-op; calling it
      // after a paused boot/restart is what kicks the loop back on.
      queueSequencer.on('start', () => {
        if (createdLoop && !createdLoop.running.value) {
          createdLoop.run();
        }
      });
    },
  };
}
