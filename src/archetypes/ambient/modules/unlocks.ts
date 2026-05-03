import { unref } from 'vue';
import {
  Decimal,
  createBooleanRequirement,
  createPurchasableCategory,
  setupSweepAutoPurchase,
  tunable,
  type EngineModule,
  type InjectionKey,
  type PurchasableCategory,
} from 'open-loop-engine';
import type { AmbientData, UnlockDef } from '../data/types';
import { AmbientTuningRegistryKey, PrimaryLifetimeKey } from './auto-producers';

export const UnlocksKey: InjectionKey<PurchasableCategory<UnlockDef>> = Symbol(
  'ambient/unlocks',
) as InjectionKey<PurchasableCategory<UnlockDef>>;

// Unlocks whose threshold is registered with the tuning registry. Mirrors
// auto-producers' opt-in baseCost wrapping — the solver bisects against
// these threshold knobs to land beats 3 and 5 in window without rebuilding
// the engine. Other unlocks pass their threshold through unchanged.
const TUNABLE_THRESHOLD_IDS = new Set<string>(['coop-built', 'spring-arrives', 'year-cycles']);

/**
 * Visibility unlocks gate on cumulative produced (lifetime), not the current
 * resource value — spending sprouts on producers must not re-hide unlocked
 * content. Each unlock is a `Purchasable` whose only requirement is a
 * boolean lifetime threshold; `setupSweepAutoPurchase` flips `active.value =
 * true` the first tick the requirement is met. No cost is charged — soft
 * reveal, not hard gate.
 *
 * Once `active.value` flips, sibling modules read it directly:
 * - `scene.ts` watches scene-variant-reveal entries and bridges to ZoneSystem.
 * - `achievements.ts`'s `unlockVisible(id)` predicate routes through the
 *   category, not a hand-rolled visibility map.
 */
export function createUnlocksModule(data: AmbientData): EngineModule {
  return {
    id: 'ambient/unlocks',
    dependencies: ['ambient/auto-producers'],
    install(ctx) {
      const lifetime = ctx.inject(PrimaryLifetimeKey);
      const tuningRegistry = ctx.inject(AmbientTuningRegistryKey);

      const unlocks = createPurchasableCategory<UnlockDef>({
        id: 'ambient/unlocks',
        mapPurchasable: (def) => {
          const threshold = TUNABLE_THRESHOLD_IDS.has(def.id)
            ? tunable(tuningRegistry, `unlocks/${def.id}/threshold`, () => def.threshold)
            : def.threshold;
          return {
            display: { title: def.label, description: def.description ?? def.label },
            requirements: createBooleanRequirement({
              requirement: () => Decimal.gte(lifetime.value, unref(threshold)),
              description: def.description ?? def.label,
            }),
            limit: 1,
          };
        },
      });
      unlocks.register(data.unlocks);

      // Auto-purchase on every tick when affordable (i.e. requirement met).
      // `enabled: () => true` because unlocks have no opt-out — they reveal
      // unconditionally on threshold cross. Boolean requirements set
      // `requiresPay: false`, so no resource is consumed.
      setupSweepAutoPurchase(
        unlocks.getAll().map((entry) => entry.purchasable),
        () => true,
        ctx.onTick,
      );

      ctx.provide(UnlocksKey, unlocks);
    },
  };
}
