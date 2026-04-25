import {
  Decimal,
  createBooleanRequirement,
  createPurchasableCategory,
  setupAutoPurchase,
  type EngineModule,
  type InjectionKey,
  type PurchasableCategory,
} from 'open-loop-engine';
import type { AmbientData, UnlockDef } from '../data/types';
import { PrimaryLifetimeKey } from './auto-producers';

export const UnlocksKey: InjectionKey<PurchasableCategory<UnlockDef>> = Symbol(
  'ambient/unlocks',
) as InjectionKey<PurchasableCategory<UnlockDef>>;

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

      const unlocks = createPurchasableCategory<UnlockDef>({
        id: 'ambient/unlocks',
        mapPurchasable: (def) => ({
          display: { title: def.label, description: def.description ?? def.label },
          requirements: createBooleanRequirement({
            requirement: () => Decimal.gte(lifetime.value, def.threshold),
            description: def.description ?? def.label,
          }),
          limit: 1,
        }),
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
