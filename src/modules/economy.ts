/**
 * Economy domain — producers, upgrades, equipment, and production modifiers.
 *
 * Engine systems demonstrated:
 *   - createProducerCategory (batch producer registration with rate chains)
 *   - createScalingPurchasable (exponential-cost upgrades with additive effects)
 *   - createPersistentEffectSystem (conditional modifier bindings with attribution)
 *   - createModifierChain (surface-wide chain for balance-sim tools)
 *
 * Upgrades use createScalingPurchasable (not the purchasable category) because
 * scaling costs depend on the amount ref that createPurchasable manages
 * internally — the category's mapPurchasable runs before that ref exists.
 * Use createPurchasableCategory for fixed-cost or one-shot purchasables.
 *
 * Folds the former equipment mod's persistent-effect pattern into this module
 * as the idiomatic approach for "item X boosts production Y".
 *
 * Cross-references:
 *   - gathering.ts provides resources consumed by upgrade costs / producer outputs
 *   - gathering.ts exports woodYieldMult / stoneYieldMult — bound here to upgrade effects
 *   - prestige mod pushes a renown modifier onto producer rate chains
 */
import { ref, watchSyncEffect } from 'vue';
import {
  Decimal,
  createProducerCategory,
  createScalingPurchasable,
  createPurchasableGroup,
  createPersistentEffectSystem,
  createModifierChain,
  createMultiplicativeModifier,
  additiveEffect,
  beginPersistentContext,
  endPersistentContext,
  type EngineModule,
  type EngineContext,
  type Resource,
  type DecimalSource,
  type ProducerCategory,
  type Purchasable,
  type PurchasableGroup,
  type PersistentEffectSystem,
  type ModifierChain,
} from 'open-loop-engine';
import { gatheringState, woodYieldMult, stoneYieldMult } from './gathering';

// ============================================================================
// Types
// ============================================================================

interface ProducerDef {
  id: string;
  name: string;
  baseRate: number;
  resource: Resource<DecimalSource>;
  costResource: Resource<DecimalSource>;
  baseCost: number;
  costScaling: number;
}

export interface EconomyState {
  producers: ProducerCategory<ProducerDef>;
  upgrades: {
    sharpAxe: Purchasable;
    ironPickaxe: Purchasable;
    foreman: Purchasable;
    group: PurchasableGroup;
  };
  /** Surface-wide chain — other modules can push modifiers onto this */
  productionChain: ModifierChain;
  /** Effect system — enumerate via EffectSystemRegistry for balance-sim */
  effects: PersistentEffectSystem;
}

export let economyState: EconomyState | null = null;

// ============================================================================
// Module
// ============================================================================

export const economyModule: EngineModule = {
  id: 'economy',
  dependencies: ['settings', 'ui-registry', 'gathering'],
  install(ctx: EngineContext) {
    const g = gatheringState!;
    const { wood, stone, gold } = g.resources;

    // --- Upgrades (scaling purchasables) ------------------------------------
    // Scaling costs depend on the amount ref that createPurchasable manages
    // internally, so we use createScalingPurchasable directly rather than the
    // purchasable category. The category is better for fixed-cost items.
    beginPersistentContext('core-upgrades');
    const sharpAxe = createScalingPurchasable({
      id: 'sharp-axe',
      resource: wood,
      baseCost: 15,
      costScaling: 1.6,
      limit: 5,
      effect: additiveEffect(0.5, 1),
      title: 'Sharp Axe',
      description: '+50% wood yield per level',
    });

    const ironPickaxe = createScalingPurchasable({
      id: 'iron-pickaxe',
      resource: gold,
      baseCost: 8,
      costScaling: 1.7,
      limit: 5,
      effect: additiveEffect(0.5, 1),
      title: 'Iron Pickaxe',
      description: '+50% stone yield per level',
    });

    const foreman = createScalingPurchasable({
      id: 'foreman',
      resource: gold,
      baseCost: 25,
      costScaling: 2,
      limit: 10,
      effect: additiveEffect(0.25, 1),
      title: 'Foreman',
      description: '+25% producer rate per level',
    });
    endPersistentContext();

    const upgradeGroup = createPurchasableGroup({
      purchasables: [sharpAxe, ironPickaxe, foreman],
    });

    // Bind yield multipliers reactively — gathering's gain helpers pick up
    // the new effect values as the player buys upgrade levels.
    watchSyncEffect(() => { woodYieldMult.value = sharpAxe.effect.value; });
    watchSyncEffect(() => { stoneYieldMult.value = ironPickaxe.effect.value; });

    // --- Producers ----------------------------------------------------------
    beginPersistentContext('core-producers');
    const producers = createProducerCategory<ProducerDef>({
      id: 'producers',
      registerTick: ctx.onTick,
      mapProducer: (def) => ({
        resource: def.resource,
        trigger: 'continuous',
        baseRate: def.baseRate,
        display: def.name,
        purchase: {
          costResource: def.costResource,
          baseCost: def.baseCost,
          costScaling: def.costScaling,
        },
      }),
    });

    producers.register([
      {
        id: 'woodcutter',
        name: 'Woodcutter',
        baseRate: 0.4,
        resource: wood,
        costResource: wood,
        baseCost: 20,
        costScaling: 1.5,
      },
      {
        id: 'miner',
        name: 'Miner',
        baseRate: 0.2,
        resource: stone,
        costResource: gold,
        baseCost: 10,
        costScaling: 1.6,
      },
      {
        id: 'merchant-cart',
        name: 'Merchant Cart',
        baseRate: 0.1,
        resource: gold,
        costResource: stone,
        baseCost: 15,
        costScaling: 1.7,
      },
    ]);
    endPersistentContext();

    // Foreman multiplier applies to every producer's rate chain
    const foremanModifier = createMultiplicativeModifier({
      multiplier: () => foreman.effect.value,
      description: 'Foreman',
    });
    for (const entry of producers.getAll()) {
      entry.producer.rateChain.add(foremanModifier);
    }

    // --- Surface-wide production chain + persistent effects -----------------
    // The production chain is a modifier chain shared across modules.
    // Any module can push modifiers onto it (prestige, equipment, buffs).
    // Balance-sim tools walk EffectSystemRegistry to trace every modifier
    // back to its source.
    const productionChain = createModifierChain('production');

    // Wire the chain into every producer's rate
    for (const entry of producers.getAll()) {
      entry.producer.rateChain.add(productionChain);
    }

    // Persistent effect system — conditional modifier bindings with
    // full modifier→source attribution for balance-sim tools.
    const effects = createPersistentEffectSystem({ id: 'economy-effects' });

    // Equipment: auto-granted gear that conditionally boosts production.
    // In a real game these would be driven by drops, shops, or quests.
    // Here we auto-grant based on resource thresholds for demonstration.
    beginPersistentContext('equipment');
    const glasses = ref(false);
    const pickaxe = ref(false);
    const compass = ref(false);
    endPersistentContext();

    effects.register([
      // Conditional production modifiers (active when equipment is owned)
      {
        id: 'affected-by:production:glasses',
        active: () => glasses.value,
        modifiers: [{
          chain: productionChain,
          modifier: () => createMultiplicativeModifier({ multiplier: 1.5, description: 'Glasses' }),
        }],
      },
      {
        id: 'affected-by:production:pickaxe',
        active: () => pickaxe.value,
        modifiers: [{
          chain: productionChain,
          modifier: () => createMultiplicativeModifier({ multiplier: 2, description: 'Pickaxe' }),
        }],
      },
      {
        id: 'affected-by:production:compass',
        active: () => compass.value,
        modifiers: [{
          chain: productionChain,
          modifier: () => createMultiplicativeModifier({ multiplier: 1.25, description: 'Compass' }),
        }],
      },
      // Auto-grant triggers (placeholder for real game events)
      {
        id: 'auto-grant:glasses',
        active: () => Decimal.gte(gold.value, 5 as DecimalSource),
        onActivate: () => { glasses.value = true; },
      },
      {
        id: 'auto-grant:pickaxe',
        active: () => Decimal.gte(stone.value, 25 as DecimalSource),
        onActivate: () => { pickaxe.value = true; },
      },
      {
        id: 'auto-grant:compass',
        active: () => Decimal.gte(wood.value, 50 as DecimalSource),
        onActivate: () => { compass.value = true; },
      },
    ]);

    economyState = { producers, upgrades: { sharpAxe, ironPickaxe, foreman, group: upgradeGroup }, productionChain, effects };
  },
};
