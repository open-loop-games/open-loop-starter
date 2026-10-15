import {
  computed,
  createCostRequirement,
  createGateRequirement,
  createPurchasableCategory,
  createResource,
  Decimal,
  persistent,
  toNumber,
  type ComputedRef,
  type EngineModule,
  type InjectionKey,
  type Persistent,
  type PurchasableCategory,
  type Resource,
} from '@open-loop/engine';
import { createModuleApi } from '@/modules/module-api';
import {
  BUREAUX,
  CHARTERS,
  STEAM_DRAWS,
  type BureauDef,
  type BureauId,
  type CharterDef,
  type CharterId,
  type SteamDraw,
} from '../data';

/**
 * Empire module — what an Exposition never clears: the Emperor's renown, the charters and
 * the foreman's bureaux it buys, the order steam is shed in, and the Grand Prix once won.
 * The bureaux are bought in order, because each unlocks the next automation tier. The
 * works read it; it reads nothing of theirs.
 */

export interface EmpireApi {
  renown: Resource<Decimal>;
  /** renown ever earned; the raw-output and labour bonus reads it */
  lifetimeRenown: ComputedRef<number>;
  charters: PurchasableCategory<CharterDef>;
  holds(id: CharterId): ComputedRef<boolean>;
  /** the foreman's bureaux; each opens once every charter is held */
  bureaux: PurchasableCategory<BureauDef>;
  employs(id: BureauId): ComputedRef<boolean>;
  /** what draws steam, first served first: the last is shed first when the boilers fall short */
  shedOrder: Persistent<SteamDraw[]>;
  /** whether the 1867 Exposition's Grand Prix has been won */
  grandPrix: Persistent<boolean>;
}

export const EmpireKey: InjectionKey<EmpireApi> = Symbol(
  'interlocker/empire',
) as InjectionKey<EmpireApi>;

const empireApi = createModuleApi(EmpireKey);

/** What an Exposition never clears. Read it after the engine starts. */
export const getEmpire = empireApi.get;

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
      const holds = (id: CharterId) => charters.getPurchasable(id)!.active;
      const chartered = computed(() => CHARTERS.every((c) => holds(c.id).value));

      // The bureaux unlock a ladder of automation tiers, so each is bought after the last.
      const bureaux = createPurchasableCategory<BureauDef>({
        id: 'bureaux',
        mapPurchasable: (def) => {
          const before = BUREAUX[BUREAUX.findIndex((b) => b.id === def.id) - 1];
          return {
            display: { title: def.name, description: def.blurb },
            requirements: [
              ...(before
                ? [
                    createGateRequirement({
                      gate: { kind: 'active', category: 'bureaux', entry: before.id },
                    }),
                  ]
                : []),
              createCostRequirement({ resource: renown, cost: def.cost }),
            ],
            visible: () => chartered.value,
            limit: 1,
          };
        },
      });
      bureaux.register(BUREAUX);

      const api: EmpireApi = {
        renown,
        lifetimeRenown: computed(() => toNumber(renown.cumulative!.value)),
        charters,
        holds,
        bureaux,
        employs: (id) => bureaux.getPurchasable(id)!.active,
        shedOrder: persistent<SteamDraw[]>(
          STEAM_DRAWS.map((d) => d.id),
          { id: 'shedOrder' },
        ),
        grandPrix: persistent(false, { id: 'grandPrix' }),
      };
      empireApi.publish(ctx, api);
    },
  };
}
