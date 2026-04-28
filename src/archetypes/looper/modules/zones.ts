import { watch, type Ref, type WatchStopHandle } from 'vue';
import {
  Decimal,
  createZoneSystem,
  tunable,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type ZoneSystem,
} from 'open-loop-engine';
import type { LooperData, ZoneRequirement } from '../data/types';
import { SkillsKey } from './skills';
import { ActionsKey } from './actions';
import { LoopKey } from './loop';
import { LooperTuningRegistryKey } from './mana';

export const ZonesKey: InjectionKey<ZoneSystem> = Symbol(
  'looper/zones',
) as InjectionKey<ZoneSystem>;

const ZONES_CONTEXT_ID = 'looper/zones';

// Zones whose primary unlock threshold is registered with the tuning registry.
// Mirrors `ambient/modules/unlocks.ts wrapThreshold`. Pre-wrapped so OL-737's
// solver has push-targets for any non-zone-0 zone (B5 forest-path, B7
// ruined-keep, plus merchanton for completeness). Other zones pass-through.
const TUNABLE_ZONE_THRESHOLD_IDS = new Set<string>(['forest-path', 'merchanton', 'ruined-keep']);

type Ref2<T> = { value: T };
const asRef = <T>(r: Ref2<T>): Ref<T> => r as unknown as Ref<T>;

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
    dependencies: ['looper/mana', 'looper/skills', 'looper/actions', 'looper/loop'],
    install(ctx) {
      const skills = ctx.inject(SkillsKey);
      const actions = ctx.inject(ActionsKey);
      const loop = ctx.inject(LoopKey);
      const tuningRegistry = ctx.inject(LooperTuningRegistryKey);

      const zones = createZoneSystem({
        id: ZONES_CONTEXT_ID,
        zones: data.zones.map((z, index) => ({
          id: z.id,
          name: z.name,
          order: index,
        })),
        initiallyUnlocked: [data.zones[0].id],
      });

      // Per-zone canonical-threshold wrap. The wrap canonicalizes "this
      // zone's first-requirement threshold" regardless of trigger type — for
      // demo zones with a single requires entry that's the only knob; for
      // hypothetical multi-requirement zones, additional entries pass their
      // literal req.value through (option (a) per OL-738 uncertainty 3).
      const wrappedThresholds = new Map<string, Ref<DecimalSource>>();
      for (const def of data.zones) {
        if (def.requires.length === 0) continue;
        if (!TUNABLE_ZONE_THRESHOLD_IDS.has(def.id)) continue;
        wrappedThresholds.set(
          def.id,
          asRef(
            tunable<DecimalSource>(
              tuningRegistry,
              `zones/${def.id}/unlockThreshold`,
              () => def.requires[0].value,
            ),
          ),
        );
      }

      const stops: WatchStopHandle[] = [];

      function evaluateRequirement(req: ZoneRequirement, threshold: DecimalSource): boolean {
        switch (req.trigger) {
          case 'action-completion-count': {
            const count = actions.getTimesCompleted(req.actionId);
            return Decimal.gte(count, threshold);
          }
          case 'skill-level': {
            const state = skills.getState(req.skillId);
            if (!state) return false;
            const tier = req.tier === 'gen' ? state.gen : state.instinct;
            return Decimal.gte(tier.level.value, threshold);
          }
          case 'loop-count':
            return Decimal.gte(loop.count.value, threshold);
        }
      }

      for (const def of data.zones) {
        if (def.requires.length === 0) continue;
        const wrapped = wrappedThresholds.get(def.id);
        const stop = watch(
          () =>
            def.requires.every((req, idx) => {
              // Only requires[0] reads through the per-zone wrap; later
              // entries in a multi-requirement zone use literal req.value.
              const threshold = idx === 0 && wrapped ? wrapped.value : req.value;
              return evaluateRequirement(req, threshold);
            }),
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
