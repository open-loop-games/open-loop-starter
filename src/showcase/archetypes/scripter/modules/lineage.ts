import {
  Decimal,
  Formula,
  computed,
  createCostRequirement,
  createModifierChain,
  createMultiplicativeModifier,
  createPurchasableCategory,
  createResource,
  persistent,
  tunable,
  type ComputedRef,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type ModifierChain,
  type Persistent,
  type PurchasableCategory,
  type Resource,
} from '@open-loop/engine';
import { createEventLog, type EventLog } from '@/modules/event-log';
import { createModuleApi } from '@/modules/module-api';
import {
  ANCHORS,
  META,
  SCROLLS,
  danMultiplier,
  type ChallengerId,
  type ScrollDef,
  type ScrollId,
} from '../data';
import { ScripterTuningRegistryKey, type ScripterTunableKey } from './tuning';

/**
 * What survives graduation: Insight and the old master's scrolls it buys, the dojo's
 * records, which challengers have come and which the dojo has beaten, the Ki chain every
 * multiplier binds into, and the journal. Graduation resets the dojo, never this module.
 */

export type JournalTone = 'buy' | 'fumble' | 'learn' | 'rite' | 'gate' | 'win' | 'loss' | 'ink';

export interface LineageApi {
  insight: Resource;
  scrolls: PurchasableCategory<ScrollDef>;
  /** A scroll's level. */
  level(id: ScrollId): number;
  /** Every Ki multiplier: Dan, Ancestral Breath, standing. */
  kiChain: ModifierChain;
  danMultiplier: ComputedRef<number>;
  /** All Ki × this for each challenger the dojo has beaten. */
  standing: ComputedRef<number>;
  playSeconds: Persistent<number>;
  beats: Persistent<number>;
  strikes: Persistent<number>;
  fumbles: Persistent<number>;
  graduations: Persistent<number>;
  /** Challengers who have stepped through the gate, in order of arrival. */
  arrived: Persistent<ChallengerId[]>;
  /** Challengers the dojo has beaten, in order of first win. */
  beaten: Persistent<ChallengerId[]>;
  /** The journal, stamped in play-seconds: a session log, so a load empties it. */
  journal: EventLog<JournalTone>;
  say(tone: JournalTone, text: string): void;
}

export const LineageKey: InjectionKey<LineageApi> = Symbol(
  'scripter/lineage',
) as InjectionKey<LineageApi>;

const lineageApi = createModuleApi(LineageKey);

/** What outlasts the student: Insight, records and the journal. Read it after the engine starts. */
export const getLineage = lineageApi.get;

const JOURNAL_LENGTH = 80;

export function createLineageModule(): EngineModule {
  return {
    id: 'scripter/lineage',
    dependencies: ['scripter/tuning'],
    install(ctx) {
      const tuning = ctx.inject(ScripterTuningRegistryKey);
      const insight = createResource<DecimalSource>(0, { id: 'insight', displayName: 'Insight' });
      const kiChain = createModifierChain('ki');
      // Read lazily: the Ancestral Breath grant below calls it once the category exists.
      const level = (id: ScrollId): number => Number(scrolls.getPurchasable(id)?.count.value ?? 0);

      const scrolls: PurchasableCategory<ScrollDef> = createPurchasableCategory<ScrollDef>({
        id: 'scrolls',
        mapPurchasable: (def) => {
          const m = META[def.id];
          return {
            display: { title: def.displayName, description: def.lore },
            requirements: (n) =>
              createCostRequirement({
                resource: insight,
                cost: Formula.exponential(n, m.base, m.growth),
              }),
            limit: m.limit,
            grants:
              def.id === 'ancestral-breath'
                ? [
                    {
                      chain: kiChain,
                      multiplier: (): Decimal => Decimal.pow(m.effect, level('ancestral-breath')),
                      description: def.displayName,
                    },
                  ]
                : [],
          };
        },
      });
      scrolls.register(SCROLLS);

      const playSeconds = persistent<number>(0, { id: 'play-seconds' });
      const beats = persistent<number>(0, { id: 'beats' });
      const strikes = persistent<number>(0, { id: 'strikes' });
      const fumbles = persistent<number>(0, { id: 'fumbles' });
      const graduations = persistent<number>(0, { id: 'graduations' });
      const arrived = persistent<ChallengerId[]>([], { id: 'arrived' });
      const beaten = persistent<ChallengerId[]>([], { id: 'beaten' });
      ctx.onTick((dt) => {
        playSeconds.value += dt;
      });

      // Lifetime Insight counts in full up to the knee, then at its square root.
      const dan = computed(() =>
        danMultiplier(Decimal.fromValue(insight.cumulative!.value).toNumber()),
      );
      kiChain.add(
        createMultiplicativeModifier({ multiplier: () => dan.value, description: 'Dan' }),
      );
      const perChallenger = tunable(
        tuning,
        'gate/standing' satisfies ScripterTunableKey,
        () => ANCHORS.standingPerChallenger,
      );
      const standing = computed(() => Math.pow(Number(perChallenger.value), beaten.value.length));
      kiChain.add(
        createMultiplicativeModifier({ multiplier: () => standing.value, description: 'Standing' }),
      );

      const journal = createEventLog<JournalTone>(ctx, {
        cap: JOURNAL_LENGTH,
        clock: () => playSeconds.value,
      });

      lineageApi.publish(ctx, {
        insight,
        scrolls,
        level,
        kiChain,
        danMultiplier: dan,
        standing,
        playSeconds,
        beats,
        strikes,
        fumbles,
        graduations,
        arrived,
        beaten,
        journal,
        say: (tone, text) => journal.post(text, tone),
      });
    },
  };
}
