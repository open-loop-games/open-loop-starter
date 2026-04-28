import { watch, type WatchStopHandle } from 'vue';
import {
  Decimal,
  createZoneSystem,
  type EngineModule,
  type InjectionKey,
  type ZoneSystem,
} from 'open-loop-engine';
import type { LooperData, ZoneRequirement } from '../data/types';
import { SkillsKey } from './skills';
import { ActionsKey } from './actions';
import { LoopKey } from './loop';

export const ZonesKey: InjectionKey<ZoneSystem> = Symbol(
  'looper/zones',
) as InjectionKey<ZoneSystem>;

const ZONES_CONTEXT_ID = 'looper/zones';

/**
 * Watch-and-bridge zone unlocks. The engine's `createZoneSystem` owns the
 * unlocked-state registry; this module watches each zone's `requires`
 * predicate against live module refs and calls `zones.unlock(id)` on rising
 * edge.
 *
 * The watch pattern (vs `setupAutoPurchase`) is chosen so the predicate
 * evaluation lives in one canonical place — predicates that span action
 * counts AND skill levels AND loop counts don't fit `setupAutoPurchase`'s
 * cost-requirement shape cleanly. Each requirement entry is its own watch
 * inside the same module, so a fork extending `ZoneRequirement` adds an
 * `evaluateRequirement` branch and a watcher.
 *
 * Cumulative-across-loops tracking: `actions.timesCompleted` and
 * `skill.instinct.xp` both persist across loops via the retention policy
 * (instinct) or by being kept out of `thingsToReset` (action counts). Zone
 * unlocks therefore latch — once unlocked, they stay unlocked.
 *
 * The skill-level predicate's `tier === 'gen'` branch evaluates against
 * gen-level which DOES reset, so a `'gen'`-gated zone unlock is "must reach
 * level N within a single loop." Demo's Ruined Keep gates on
 * `combat / gen / 25` — that's the design intent.
 */
export function createZonesModule(data: LooperData): EngineModule {
  return {
    id: 'looper/zones',
    dependencies: ['looper/skills', 'looper/actions', 'looper/loop'],
    install(ctx) {
      const skills = ctx.inject(SkillsKey);
      const actions = ctx.inject(ActionsKey);
      const loop = ctx.inject(LoopKey);

      const zones = createZoneSystem({
        id: ZONES_CONTEXT_ID,
        zones: data.zones.map((z, index) => ({
          id: z.id,
          name: z.name,
          order: index,
        })),
        initiallyUnlocked: [data.zones[0].id],
      });

      const stops: WatchStopHandle[] = [];

      function evaluateRequirement(req: ZoneRequirement): boolean {
        switch (req.trigger) {
          case 'action-completion-count': {
            const count = actions.getTimesCompleted(req.actionId);
            return Decimal.gte(count, req.value);
          }
          case 'skill-level': {
            const state = skills.getState(req.skillId);
            if (!state) return false;
            const tier = req.tier === 'gen' ? state.gen : state.instinct;
            return Decimal.gte(tier.level.value, req.value);
          }
          case 'loop-count':
            return loop.count.value >= req.value;
        }
      }

      for (const def of data.zones) {
        if (def.requires.length === 0) continue;
        const stop = watch(
          () => def.requires.every((req) => evaluateRequirement(req)),
          (ready) => {
            if (ready) zones.unlock(def.id);
          },
          { immediate: true },
        );
        stops.push(stop);
      }

      ctx.provide(ZonesKey, zones);
    },
  };
}
