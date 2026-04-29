import type { ComputedRef } from 'vue';
import {
  Decimal,
  createBooleanRequirement,
  createPurchasableCategory,
  setupAutoPurchase,
  tunable,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type OverrideRegistry,
  type PurchasableCategory,
} from 'open-loop-engine';
import type { AmbientData, UnlockDef } from '../data/types';
import {
  AmbientTuningRegistryKey,
  PrimaryLifetimeKey,
  type AmbientTunables,
} from './auto-producers';

export const UnlocksKey: InjectionKey<PurchasableCategory<UnlockDef>> = Symbol(
  'ambient/unlocks',
) as InjectionKey<PurchasableCategory<UnlockDef>>;

// Unlocks whose threshold is registered with the tuning registry. Mirrors
// auto-producers' opt-in baseCost wrapping — the solver bisects against
// these threshold knobs to land beats 3 and 5 in window without rebuilding
// the engine. Other unlocks pass their threshold through unchanged.
const TUNABLE_THRESHOLD_IDS = new Set<string>(['coop-built', 'spring-arrives', 'year-cycles']);

type Threshold = DecimalSource | ComputedRef<DecimalSource>;

function wrapThreshold(registry: OverrideRegistry<AmbientTunables>, def: UnlockDef): Threshold {
  if (!TUNABLE_THRESHOLD_IDS.has(def.id)) return def.threshold;
  const key = `unlocks/${def.id}/threshold`;
  return tunable<DecimalSource>(registry, key, () => def.threshold);
}

const readThreshold = (threshold: Threshold): DecimalSource =>
  typeof threshold === 'object' && threshold !== null && 'value' in threshold
    ? threshold.value
    : threshold;

/**
 * Visibility unlocks gate on cumulative produced (lifetime), not the current
 * resource value — spending sprouts on producers must not re-hide unlocked
 * content. Each unlock is a `Purchasable` whose only requirement is a
 * boolean lifetime threshold; `setupAutoPurchase` flips `bought.value = true`
 * the first tick the requirement is met. No cost is charged — soft reveal,
 * not hard gate.
 *
 * Once `bought.value` flips, sibling modules read it directly:
 * - `arc.ts` reads `unlocks.getPurchasable(deepestUnlockId).bought.value` for
 *   beat-7 closure detection.
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
          const threshold = wrapThreshold(tuningRegistry, def);
          return {
            display: { title: def.label, description: def.description ?? def.label },
            requirements: createBooleanRequirement({
              requirement: () => Decimal.gte(lifetime.value, readThreshold(threshold)),
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
      setupAutoPurchase(
        unlocks.getAll().map((entry) => entry.purchasable),
        () => true,
        ctx.onTick,
      );

      ctx.provide(UnlocksKey, unlocks);
    },
  };
}
