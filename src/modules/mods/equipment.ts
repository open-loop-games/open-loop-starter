/**
 * Equipment mod — worked example of surface-wide chains + persistent-effect
 * conditional modifiers.
 *
 * Demonstrates the idiomatic engine pattern for "item X boosts action Y":
 *
 * 1. Create a surface-wide {@link createModifierChain} shared across modules
 * 2. Bind conditional modifiers via {@link createPersistentEffectSystem}
 * 3. Enumerate all modifier sources via EffectSystemRegistry + ChainRegistry
 *
 * This is a reference for new consumers — copy the pattern, replace the
 * content. See OL-346 for the design rationale.
 */
import { ref } from 'vue';
import {
  Decimal,
  createModifierChain,
  createMultiplicativeModifier,
  createPersistentEffectSystem,
  beginPersistentContext,
  endPersistentContext,
  type EngineModule,
  type EngineContext,
  type ModifierChain,
  type PersistentEffectSystem,
  type DecimalSource,
} from 'open-loop-engine';
import { coreState } from '@/modules/core';

// ============================================================================
// Types
// ============================================================================

export interface EquipmentState {
  /** Whether each piece of equipment is owned */
  owned: {
    glasses: { value: boolean };
    pickaxe: { value: boolean };
    compass: { value: boolean };
  };
  /** Surface-wide chain other modules can also push modifiers onto */
  productionChain: ModifierChain;
  /** Effect system — enumerate via EffectSystemRegistry for balance-sim */
  effects: PersistentEffectSystem;
}

export let equipmentState: EquipmentState | null = null;

// ============================================================================
// Module
// ============================================================================

export const equipmentModule: EngineModule = {
  id: 'equipment',
  dependencies: ['core'],
  install(_ctx: EngineContext) {
    const core = coreState!;

    // -- Surface-wide chain ---------------------------------------------------
    // Auto-registers into ChainRegistry for discovery by balance tools.
    // Any module can push modifiers onto this chain.
    const productionChain = createModifierChain('production');

    // -- Persistent equipment state -------------------------------------------
    beginPersistentContext('equipment');
    const glasses = ref(false);
    const pickaxe = ref(false);
    const compass = ref(false);
    endPersistentContext();

    // -- Persistent effect system ---------------------------------------------
    // Auto-registers into EffectSystemRegistry. Each registered effect
    // declares its source id, activation condition, and modifier bindings.
    // Balance-sim tools walk EffectSystemRegistry.all() → allDefs() →
    // modifiers to trace every modifier back to its source.
    const effects = createPersistentEffectSystem({ id: 'equipment-effects' });

    effects.register([
      {
        id: 'affected-by:production:glasses',
        active: () => glasses.value,
        modifiers: [
          {
            chain: productionChain,
            modifier: () =>
              createMultiplicativeModifier({
                multiplier: 1.5,
                description: 'Glasses',
              }),
          },
        ],
      },
      {
        id: 'affected-by:production:pickaxe',
        active: () => pickaxe.value,
        modifiers: [
          {
            chain: productionChain,
            modifier: () =>
              createMultiplicativeModifier({
                multiplier: 2,
                description: 'Pickaxe',
              }),
          },
        ],
      },
      {
        id: 'affected-by:production:compass',
        active: () => compass.value,
        modifiers: [
          {
            chain: productionChain,
            modifier: () =>
              createMultiplicativeModifier({
                multiplier: 1.25,
                description: 'Compass',
              }),
          },
        ],
      },
    ]);

    // -- Wire the chain into existing producer rates --------------------------
    // The chain acts as a Modifier, so it composes directly onto rate chains.
    for (const entry of core.producers.getAll()) {
      entry.producer.rateChain.add(productionChain);
    }

    // -- Grant equipment based on achievements (placeholder triggers) ---------
    // In a real game these would be driven by game events, shops, drops, etc.
    // Here we auto-grant based on gold thresholds for demonstration.
    effects.register([
      {
        id: 'auto-grant:glasses',
        active: () => Decimal.gte(core.resources.gold.value, 5 as DecimalSource),
        onActivate: () => {
          glasses.value = true;
        },
      },
      {
        id: 'auto-grant:pickaxe',
        active: () => Decimal.gte(core.resources.stone.value, 25 as DecimalSource),
        onActivate: () => {
          pickaxe.value = true;
        },
      },
      {
        id: 'auto-grant:compass',
        active: () => Decimal.gte(core.resources.wood.value, 50 as DecimalSource),
        onActivate: () => {
          compass.value = true;
        },
      },
    ]);

    equipmentState = {
      owned: { glasses, pickaxe, compass },
      productionChain,
      effects,
    };
  },
};
