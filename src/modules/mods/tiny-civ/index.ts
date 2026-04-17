/**
 * Tiny Civilization — total-conversion archetype mod.
 *
 * 5b skeleton (OL-479): three resources (food/wood/stone), a ZoneSystem
 * covering camp + forest + hills with camp/forest unlocked, and a
 * placeholder click-gather-food action. No workers, buildings, crafting,
 * or tech — those land in 5c..5f.
 *
 * State shape:
 *   - `'tiny-civ-layer0'` — food/wood/stone amounts (one persistent context
 *                            for all 5b state)
 *   - `'tiny-civ-zones'`  — ZoneSystem's own `unlocked` + `current` refs
 *                            (own context per the `createZoneSystem` id
 *                            convention idle-loops uses for `'il-zones'`)
 */
import {
  Decimal,
  addResource,
  createResource,
  createZoneSystem,
  withPersistentContext,
  type InjectionKey,
  type EngineModule,
  type EngineContext,
  type Resource,
  type DecimalSource,
  type ZoneSystem,
} from 'open-loop-engine';
import { setSlot } from '@/modules/ui-registry';
import TinyCivLayout from '@/ui/layouts/TinyCivLayout.vue';
import {
  zoneDefs,
  INITIAL_UNLOCKED_ZONES,
  STARTING_RESOURCE,
  CLICK_GATHER_FOOD,
} from './content';

export interface TinyCivState {
  food: Resource<DecimalSource>;
  wood: Resource<DecimalSource>;
  stone: Resource<DecimalSource>;
  zones: ZoneSystem;
  /** Adds {@link CLICK_GATHER_FOOD} to `food`. Placeholder mechanic for 5b. */
  gatherFood: () => void;
}

export const TinyCivKey: InjectionKey<TinyCivState> =
  Symbol('tiny-civ') as InjectionKey<TinyCivState>;

export function createTinyCivModule(): EngineModule {
  return {
    id: 'tiny-civ',
    dependencies: ['settings', 'ui-registry'],
    install(ctx: EngineContext) {
      const { food, wood, stone } = withPersistentContext('tiny-civ-layer0', () => ({
        food: createResource<DecimalSource>(STARTING_RESOURCE, { displayName: 'Food' }),
        wood: createResource<DecimalSource>(STARTING_RESOURCE, { displayName: 'Wood' }),
        stone: createResource<DecimalSource>(STARTING_RESOURCE, { displayName: 'Stone' }),
      }));

      const zones = createZoneSystem({
        id: 'tiny-civ-zones',
        zones: zoneDefs,
        initiallyUnlocked: [...INITIAL_UNLOCKED_ZONES],
      });

      const gatherFood = () => {
        addResource(food, new Decimal(CLICK_GATHER_FOOD));
      };

      const state: TinyCivState = { food, wood, stone, zones, gatherFood };
      ctx.provide(TinyCivKey, state);

      setSlot('game-layout', TinyCivLayout);
    },
  };
}

export const tinyCivModule: EngineModule = createTinyCivModule();
