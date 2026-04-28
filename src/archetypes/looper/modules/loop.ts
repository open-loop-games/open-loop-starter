import {
  Decimal,
  createLoop,
  createRetentionPolicy,
  type EngineModule,
  type InjectionKey,
  type Loop,
  type Persistent,
  type RetentionPolicy,
} from 'open-loop-engine';
import type { LooperData } from '../data/types';
import { ActionsKey, getActionProgressRefs } from './actions';
import { ManaKey, ManaPoolMaxKey } from './mana';
import { SkillsKey, getInstinctXpRefs } from './skills';

export const LoopKey: InjectionKey<Loop> = Symbol('looper/loop') as InjectionKey<Loop>;

/**
 * Loop orchestration — engine `createLoop` + `createRetentionPolicy`.
 *
 * Per-tick: drain mana at 1/sec, only while `loop.running.value`. Mana
 * exhaustion fires `endCondition`, which kicks the restart sequence.
 *
 * Restart sequence:
 *   onBeforeRestart — snapshot retention (instinct XP, zone unlocks, action
 *     timesCompleted)
 *   reset.execute  — zero gen XP, action progress, mana (then refill via
 *     onRestart)
 *   onRestart      — restore retention; refill mana to manaPoolMax
 *
 * The retention policy is built lazily on first reset (idle-loops-ng's
 * pattern). The reason: instinct refs only exist after `skills.install` runs,
 * and we want loop construction to not couple to skills' internal mapState
 * timing. Building lazily on the first `onBeforeRestart` is the safe choice.
 *
 * `thingsToReset` returns gen.xp refs for every skill (gen tier resets per
 * loop). Action `progress` refs are also reset. Action `timesCompleted` is
 * NOT in the reset scope (cumulative across loops by design).
 */
export function createLoopModule(_data: LooperData): EngineModule {
  return {
    id: 'looper/loop',
    dependencies: ['looper/mana', 'looper/skills', 'looper/actions'],
    install(ctx) {
      const mana = ctx.inject(ManaKey);
      const manaPoolMax = ctx.inject(ManaPoolMaxKey);
      const skills = ctx.inject(SkillsKey);
      const actions = ctx.inject(ActionsKey);

      let retention: RetentionPolicy | null = null;
      let retentionBuilt = false;

      function ensureRetention(): RetentionPolicy {
        if (!retentionBuilt) {
          const keep: Persistent[] = [...getInstinctXpRefs(skills)];
          retention = createRetentionPolicy({ keep });
          retentionBuilt = true;
        }
        return retention!;
      }

      const loop = createLoop({
        id: 'looper/loop',
        endCondition: () => Decimal.lte(mana.value, 0),

        // gen.xp resets each loop; instinct.xp survives via retention.
        // Action progress refs reset (the cumulative `timesCompleted` does
        // NOT — zone unlock predicates read across loops).
        thingsToReset: () => {
          const things: unknown[] = [];
          for (const entry of skills.getAll()) {
            things.push(entry.state.gen.xp);
          }
          for (const ref of getActionProgressRefs(actions)) {
            things.push(ref);
          }
          return things;
        },

        onBeforeRestart: () => {
          ensureRetention().snapshot();
        },

        onRestart: () => {
          ensureRetention().restore();
          // Refill mana to pool max after the reset zeroes it (the engine's
          // reset walker resets `mana.value` to its persistent default of 0,
          // not to pool max — refill is our responsibility).
          mana.value = manaPoolMax.value;
        },

        registerTick: ctx.onTick,
      });

      // Mana drain — 1/sec sim-time, only while loop is running.
      ctx.onTick((dt: number) => {
        if (!loop.running.value) return;
        if (Decimal.lte(mana.value, 0)) return;
        const next = Decimal.sub(mana.value, dt);
        mana.value = Decimal.max(next, 0);
      });

      // Auto-run on install. `loop.running` is non-persistent (refs are
      // lost across save/load), so every boot starts paused; we run here.
      // Forks adding pause-before-restart toggle this off conditionally.
      loop.run();

      ctx.provide(LoopKey, loop);
    },
  };
}
