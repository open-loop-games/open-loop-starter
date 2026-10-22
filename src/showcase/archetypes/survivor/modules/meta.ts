import {
  Formula,
  createBooleanRequirement,
  createCostRequirement,
  createModifierChain,
  createPurchasableCategory,
  createResource,
  persistent,
  setupSweepAutoPurchase,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type ModifierChain,
  type Persistent,
  type PurchasableCategory,
  type Resource,
} from '@open-loop/engine';
import { createModuleApi } from '@/modules/module-api';
import {
  AGENCY,
  AGENCY_GROWTH,
  BASE_OFFER,
  RATINGS,
  STARS,
  type AgencyDef,
  type ChainId,
  type RatingDef,
  type StarDef,
} from '../data';

/** What outlasts a take, and the record it keeps. */
export interface TakeRecord {
  takes: Persistent<number>;
  bestSeconds: Persistent<number>;
  /** Index of the harshest rating taken to CUT; −1 before the first CUT. */
  bestRatingCleared: Persistent<number>;
  totalKills: Persistent<number>;
  /** The ledger: each star's harshest rating wrapped, −1 before its first. */
  wrapped: Record<StarDef['id'], Persistent<number>>;
  /** True once R's lead has fallen: the picture is wrapped. */
  pictureWrapped: Persistent<boolean>;
}

export interface MetaApi {
  clout: Resource<DecimalSource>;
  /** One chain a quantity: the agency and the rewrite perks both bind into these. */
  chains: Record<ChainId, ModifierChain>;
  agency: PurchasableCategory<AgencyDef>;
  stars: PurchasableCategory<StarDef>;
  ratings: PurchasableCategory<RatingDef>;
  record: TakeRecord;
  /** Pages a rewrite offers: three, and a fourth with Script Doctor. */
  offerSize(): number;
  /** Stars that have wrapped a rating or harsher. */
  starsWrapped(rating: number): number;
}

export const MetaKey: InjectionKey<MetaApi> = Symbol('survivor/meta') as InjectionKey<MetaApi>;

const metaApi = createModuleApi(MetaKey);

export const getMeta = metaApi.get;

/**
 * What survives a take: clout, the agency, the signed stars, the open ratings and the
 * record. No take reset names this module. It builds the chains, because the agency binds
 * into them here and the take module binds the rewrite perks into the same ones.
 */
export function createMetaModule(): EngineModule {
  return {
    id: 'survivor/meta',
    dependencies: ['survivor/tuning'],
    install(ctx) {
      const chains: Record<ChainId, ModifierChain> = {
        damage: createModifierChain('rig-damage'),
        fireRate: createModifierChain('rig-fire-rate'),
        maxHp: createModifierChain('max-hp'),
        moveSpeed: createModifierChain('move-speed'),
        pickup: createModifierChain('pickup-reach'),
      };
      const clout = createResource<DecimalSource>(0, { id: 'clout', displayName: 'Clout' });
      const record: TakeRecord = {
        takes: persistent(0, { id: 'takes', lifetime: true }),
        bestSeconds: persistent(0, { id: 'bestSeconds', lifetime: true }),
        bestRatingCleared: persistent(-1, { id: 'bestRatingCleared', lifetime: true }),
        totalKills: persistent(0, { id: 'totalKills', lifetime: true }),
        wrapped: Object.fromEntries(
          STARS.map((s) => [s.id, persistent(-1, { id: `wrapped-${s.id}`, lifetime: true })]),
        ) as TakeRecord['wrapped'],
        pictureWrapped: persistent(false, { id: 'pictureWrapped', lifetime: true }),
      };
      const starsWrapped = (rating: number) =>
        STARS.filter((s) => record.wrapped[s.id].value >= rating).length;

      const agency: PurchasableCategory<AgencyDef> = createPurchasableCategory<AgencyDef>({
        id: 'agency',
        mapPurchasable: (def) => ({
          display: { title: def.name, description: def.blurb },
          requirements: (count) =>
            createCostRequirement({
              resource: clout,
              cost: Formula.exponential(count, def.baseCost, AGENCY_GROWTH).floor(),
            }),
          limit: def.maxLevel,
          grants:
            def.chain && def.step
              ? [
                  {
                    chain: chains[def.chain],
                    // TODO(ergonomics): a grant that scales on its own purchasable's count
                    // reads it back out of the category; `requirements` gets the count, grants don't.
                    multiplier: () =>
                      1 + def.step! * Number(agency.getPurchasable(def.id)?.count.value ?? 0),
                    description: `Agency: ${def.name}`,
                  },
                ]
              : [],
        }),
      });
      agency.register(AGENCY);

      const stars = createPurchasableCategory<StarDef>({
        id: 'stars',
        mapPurchasable: (def) => ({
          display: { title: def.name, description: def.blurb },
          requirements: createCostRequirement({ resource: clout, cost: def.cost }),
          limit: 1,
          initialCount: def.cost === 0 ? 1 : 0,
        }),
      });
      stars.register(STARS);

      // A rating opens once enough stars have wrapped the one below it. Nothing is charged;
      // the sweep buys it on the first tick the ledger allows.
      const ratings = createPurchasableCategory<RatingDef>({
        id: 'ratings',
        mapPurchasable: (def) => ({
          display: { title: def.label, description: def.blurb },
          requirements: createBooleanRequirement({
            met: () => def.index === 0 || starsWrapped(def.index - 1) >= def.gate,
            description:
              def.index === 0
                ? 'Open'
                : `Wrap ${RATINGS[def.index - 1]!.label} with ${def.gate === 1 ? 'a star' : `${def.gate} stars`}`,
          }),
          limit: 1,
          initialCount: def.index === 0 ? 1 : 0,
        }),
      });
      ratings.register(RATINGS);
      setupSweepAutoPurchase(ratings, { enabled: true }, ctx.onTick);

      const api: MetaApi = {
        clout,
        chains,
        agency,
        stars,
        ratings,
        record,
        starsWrapped,
        offerSize: () =>
          BASE_OFFER + Number(agency.getPurchasable('script-doctor')?.count.value ?? 0),
      };
      metaApi.publish(ctx, api);
    },
  };
}
