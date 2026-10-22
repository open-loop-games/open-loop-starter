import {
  computed,
  createBooleanRequirement,
  createCostRequirement,
  createLoadout,
  createModifierChain,
  createPurchasableCategory,
  createResource,
  Formula,
  persistent,
  toNumber,
  tunable,
  type ComputedRef,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type Loadout,
  type ModifierChain,
  type Persistent,
  type PurchasableCategory,
  type Resource,
} from '@open-loop/engine';
import { createModuleApi } from '@/modules/module-api';
import {
  ANCHORS,
  KNOWLEDGE,
  KNOWLEDGE_EFFECT,
  POSTINGS,
  deriveSpine,
  type KnowledgeDef,
  type KnowledgeId,
  type PostingId,
  type Spine,
} from '../data';
import { CyclerTuningRegistryKey, type CyclerTunableKey } from './tuning';

/**
 * What outlasts a watch: the logbook, the keeper's knowledge it buys, the posting chosen
 * for the next watch, and the record of watches kept. The light going out resets the watch
 * module, never this one.
 */

/** How a watch under the relief ended: the light held through the final gale, or not. */
export type ReliefOutcome = 'held' | 'lost';

export interface WatchSummary {
  posting: PostingId;
  nights: number;
  weathered: number;
  gathered: number;
  entries: number;
  /** Set when the relief was signalled this watch. */
  relief: ReliefOutcome | null;
}

/** The career's close: none yet, the lesser (the light went out under the final gale), or held. */
export type Ending = 'none' | 'lesser' | 'held';

export interface LogbookApi {
  entries: Resource<DecimalSource>;
  knowledge: PurchasableCategory<KnowledgeDef>;
  level: (id: KnowledgeId) => number;
  /** Every breakwater's ward passes through it: Dressed stone, Brass fittings. */
  wardChain: ModifierChain;
  /** Every net's catch passes through it: Tide tables, the posting's wrack. */
  wrackChain: ModifierChain;
  /** Permanent ward power only: what the storm is pegged to. */
  permanentWard: ComputedRef<number>;
  spine: ComputedRef<Spine>;
  /** Anchors the watch reads directly, beside the spine derived from them. */
  wardPerWall: ComputedRef<number>;
  netRate: ComputedRef<number>;
  daySeconds: ComputedRef<number>;
  nightSeconds: ComputedRef<number>;
  posting: Loadout;
  /** The watch module names when a posting may change: only between watches. */
  setPostingOpen: (open: () => boolean) => void;
  bestNights: Persistent<number>;
  lastWatch: Persistent<WatchSummary | null>;
  /** The best close the career has reached. */
  ending: Persistent<Ending>;
  /** Records a watch under the relief; a held light outranks a lesser close. */
  recordRelief: (outcome: ReliefOutcome) => void;
}

export const LogbookKey: InjectionKey<LogbookApi> = Symbol('cycler/logbook');

const logbookApi = createModuleApi(LogbookKey);
export const getLogbook = logbookApi.get;

export function createLogbookModule(): EngineModule {
  return {
    id: 'cycler/logbook',
    dependencies: ['cycler/tuning'],
    install(ctx) {
      const tuning = ctx.inject(CyclerTuningRegistryKey);
      const t = (key: CyclerTunableKey, get: () => number) => tunable(tuning, key, get);

      const entries = createResource<DecimalSource>(0, {
        id: 'entries',
        displayName: 'Logbook entries',
      });
      const wardChain = createModifierChain('ward');
      const wrackChain = createModifierChain('wrack');

      const levels = new Map<KnowledgeId, ComputedRef<number>>();
      function level(id: KnowledgeId): number {
        let c = levels.get(id);
        if (!c) {
          c = computed(() => toNumber(knowledge.getPurchasable(id)!.count.value));
          levels.set(id, c);
        }
        return c.value;
      }
      const permanentWard = computed(() => KNOWLEDGE_EFFECT.stone ** level('stone'));

      const knowledge = createPurchasableCategory<KnowledgeDef>({
        id: 'knowledge',
        mapPurchasable: (def) => ({
          display: { title: def.name, description: def.blurb },
          limit: def.limit,
          requirements: (count) => {
            const cost = createCostRequirement({
              resource: entries,
              // Entries are whole: a page is written or it isn't.
              cost: Formula.exponential(count, def.baseCost, def.growth).ceil(),
            });
            const req = def.requires;
            if (!req) return cost;
            const prereq = KNOWLEDGE.find((k) => k.id === req.id)!;
            return [
              cost,
              createBooleanRequirement({
                met: () => level(req.id) >= req.levels,
                description: `${prereq.name} ${req.levels}`,
              }),
            ];
          },
          grants:
            def.id === 'stone'
              ? [
                  {
                    chain: wardChain,
                    multiplier: () => permanentWard.value,
                    description: 'Dressed stone',
                  },
                ]
              : def.id === 'tides'
                ? [
                    {
                      chain: wrackChain,
                      multiplier: () => KNOWLEDGE_EFFECT.tides ** level('tides'),
                      description: 'Tide tables',
                    },
                  ]
                : undefined,
        }),
      });
      knowledge.register(KNOWLEDGE);

      const wardPerWall = t('ward/perWall', () => ANCHORS.wardPerWall);
      const crossNight = t('peg/crossNight', () => ANCHORS.crossNightRef);
      const gRef = t('peg/g', () => ANCHORS.gRef);
      const netRate = t('wrack/netRate', () => ANCHORS.netRate);
      const daySeconds = t('phase/daySeconds', () => ANCHORS.daySeconds);
      const nightSeconds = t('phase/nightSeconds', () => ANCHORS.nightSeconds);
      const spine = computed(() =>
        deriveSpine({
          wardPerWall: wardPerWall.value,
          headroomNights: crossNight.value,
          gRef: gRef.value,
          netRate: netRate.value,
          daySeconds: daySeconds.value,
          nightSeconds: nightSeconds.value,
          wardPower: permanentWard.value,
        }),
      );

      let postingOpen: () => boolean = () => true;
      const posting = createLoadout({
        id: 'posting',
        mode: 'single',
        pool: () =>
          POSTINGS.filter((p) => !KNOWLEDGE.some((k) => k.opens === p.id && level(k.id) < 1)).map(
            (p) => p.id,
          ),
        canSelect: () => postingOpen(),
      });
      posting.select('haven');

      const ending = persistent<Ending>('none', { id: 'ending' });

      const api: LogbookApi = {
        entries,
        knowledge,
        level,
        wardChain,
        wrackChain,
        permanentWard,
        spine,
        wardPerWall,
        netRate,
        daySeconds,
        nightSeconds,
        posting,
        setPostingOpen: (open) => {
          postingOpen = open;
        },
        bestNights: persistent(0, { id: 'best-nights' }),
        lastWatch: persistent<WatchSummary | null>(null, { id: 'last-watch' }),
        ending,
        recordRelief: (outcome) => {
          if (outcome === 'held') ending.value = 'held';
          else if (ending.value === 'none') ending.value = 'lesser';
        },
      };
      logbookApi.publish(ctx, api);
    },
  };
}
