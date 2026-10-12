import { computed } from 'vue';
import {
  createBooleanRequirement,
  createCostRequirement,
  createPurchasableCategory,
  type EngineModule,
  type Grant,
  type ModifierChain,
  type PurchasableCategory,
} from '@open-loop/engine';
import type { ProducerData, ProducerGameState, RefinementDef } from '../data/types';
import { buildProducerGameState, getClasses, getLauncher, getMass } from './swarm';

/**
 * Refinements — the purchased chain. One-shot purchasables whose `grants` bind a
 * multiplicative modifier onto the chains their scope names, for as long as
 * they are owned.
 *
 * `grants` is doing real work here: the engine lowers each entry to a
 * `chain.bind` with the purchasable's own `active` as the implicit predicate,
 * so ownership, attribution and the modifier all come from one declaration.
 * Binding them by hand would be the same behavior with three places to drift.
 */

let refinements: PurchasableCategory<RefinementDef>;
let gameState: ProducerGameState;

export function getRefinements(): PurchasableCategory<RefinementDef> {
  return refinements;
}

/**
 * The shared predicate view. Built once here because refinements is the first
 * module that needs it; revisions injects the same instance rather than
 * building a second one over the same state.
 */
export function getProducerGameState(): ProducerGameState {
  return gameState;
}

export function createRefinementsModule(data: ProducerData): EngineModule {
  return {
    id: 'producer/refinements',
    dependencies: ['producer/tuning', 'producer/swarm'],
    install() {
      const classes = getClasses();
      const mass = getMass();
      gameState = buildProducerGameState(data);

      const classChain = (id: string): ModifierChain | undefined =>
        classes.getProducer(id)?.rateChain;

      const everyClassChain = (): ModifierChain[] =>
        data.classes
          .map((def) => classChain(def.id))
          .filter((chain): chain is ModifierChain => chain !== undefined);

      refinements = createPurchasableCategory<RefinementDef>({
        id: 'producer/refinements',
        mapPurchasable: (def) => {
          const chains =
            def.scope.kind === 'class'
              ? [classChain(def.scope.classId)]
              : def.scope.kind === 'global'
                ? everyClassChain()
                : [getLauncher().rateChain];
          const bound = chains.filter((c): c is ModifierChain => c !== undefined);

          const grants: Grant[] = bound.length
            ? [{ chain: bound, multiplier: def.multiplier, description: def.displayName }]
            : [];

          return {
            display: { title: def.displayName, description: def.description },
            requirements: [
              createCostRequirement({
                resource: mass,
                cost: def.cost,
                description: def.displayName,
              }),
              createBooleanRequirement({
                met: computed(() => def.unlockWhen(gameState)),
                description: def.description,
              }),
            ],
            limit: 1,
            // Owned-only, no partial reveal: a refinement the player cannot
            // yet unlock stays out of the grid entirely, so the grid reads as
            // "what can I purchase" rather than as a catalogue of locked rows.
            visible: computed(() => def.unlockWhen(gameState)),
            grants,
          };
        },
      });
      refinements.register(data.refinements);
    },
  };
}
