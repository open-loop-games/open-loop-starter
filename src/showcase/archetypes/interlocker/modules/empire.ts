import {
  computed,
  createCostRequirement,
  createPurchasableCategory,
  createResource,
  Decimal,
  toNumber,
  type ComputedRef,
  type EngineModule,
  type InjectionKey,
  type PurchasableCategory,
  type Resource,
} from '@open-loop/engine';
import { CHARTERS, type CharterDef, type CharterId } from '../data';

/**
 * Empire module — what an Exposition never clears: the Emperor's renown and the
 * charters it buys. The works read it; it reads nothing of theirs.
 */

export interface EmpireApi {
  renown: Resource<Decimal>;
  /** renown ever earned; the raw-output bonus reads it */
  lifetimeRenown: ComputedRef<number>;
  charters: PurchasableCategory<CharterDef>;
  holds(id: CharterId): ComputedRef<boolean>;
}

export const EmpireKey: InjectionKey<EmpireApi> = Symbol(
  'interlocker/empire',
) as InjectionKey<EmpireApi>;

let api: EmpireApi;

export function getEmpire(): EmpireApi {
  return api;
}

export function createEmpireModule(): EngineModule {
  return {
    id: 'interlocker/empire',
    install(ctx) {
      const renown = createResource<Decimal>(Decimal.dZero, {
        id: 'renown',
        displayName: 'Renown',
      });
      const charters = createPurchasableCategory<CharterDef>({
        id: 'charters',
        mapPurchasable: (def) => ({
          display: { title: def.name, description: def.blurb },
          requirements: createCostRequirement({ resource: renown, cost: def.cost }),
          limit: 1,
        }),
      });
      charters.register(CHARTERS);

      api = {
        renown,
        lifetimeRenown: computed(() => toNumber(renown.cumulative!.value)),
        charters,
        holds: (id) => charters.getPurchasable(id)!.active,
      };
      ctx.provide(EmpireKey, api);
    },
  };
}
