import {
  Decimal,
  computed,
  createBestOf,
  createCostRequirement,
  createModifierChain,
  createPurchasableCategory,
  createReset,
  createResource,
  createZoneSystem,
  persistent,
  tunable,
  watch,
  type BestOf,
  type ComputedRef,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type ModifierChain,
  type Persistent,
  type PurchasableCategory,
  type Resource,
  type ZoneSystem,
} from '@open-loop/engine';
import {
  ANCHORS,
  LESSONS,
  LESSON_MAX,
  LESSON_STEP,
  PLOTS,
  gardenerLevel,
  plantSpecs,
  type LessonDef,
  type PlantId,
  type PlantSpec,
  type SpineAnchors,
} from '../data';
import { DefenderTuningRegistryKey, type DefenderTunableKey } from './tuning';

/**
 * Garden module — everything that outlasts a plot: which plots are open, the
 * best score each plot has given (the record the gardener's level reads), the
 * almanac notes that level grants and the lessons they buy, and the modifier
 * chains those lessons feed.
 */
export interface GardenApi {
  /** The spine's anchors, each read through its `tunable()` key. */
  anchors: ComputedRef<SpineAnchors>;
  specs: ComputedRef<Record<PlantId, PlantSpec>>;
  plots: ZoneSystem;
  records: BestOf;
  /** Plots ever held: a set-once record. Holding a plot opens the next. */
  held: Persistent<string[]>;
  /** Experience: the sum of every plot's best score. */
  xp: ComputedRef<number>;
  level: ComputedRef<number>;
  /** Almanac notes unspent: the level less the lessons bought. */
  notes: Resource<DecimalSource>;
  lessons: PurchasableCategory<LessonDef>;
  /** Take back every lesson, free. */
  relearn(): void;
  chains: Record<'damage' | 'range' | 'startCompost' | 'seedlings' | 'earlyCall', ModifierChain>;
  isPlantUnlocked(id: PlantId): boolean;
}

export const GardenKey: InjectionKey<GardenApi> = Symbol(
  'defender/garden',
) as InjectionKey<GardenApi>;

let api: GardenApi;

export function getGarden(): GardenApi {
  return api;
}

const num = (v: DecimalSource) => new Decimal(v).toNumber();

export function createGardenModule(): EngineModule {
  return {
    id: 'defender/garden',
    install(ctx) {
      const tuning = ctx.inject(DefenderTuningRegistryKey);
      const anchorRefs = (Object.keys(ANCHORS) as (keyof SpineAnchors)[]).map(
        (k) =>
          [
            k,
            tunable(tuning, `spine/${k}` satisfies DefenderTunableKey, () => ANCHORS[k]),
          ] as const,
      );
      const anchors = computed(
        () =>
          Object.fromEntries(
            anchorRefs.map(([k, r]) => [k, Number(r.value)]),
          ) as unknown as SpineAnchors,
      );
      const specs = computed(() => plantSpecs(anchors.value));

      const plots = createZoneSystem({
        zones: PLOTS.map((p, i) => ({ id: p.id, displayName: p.displayName, order: i })),
        initiallyUnlocked: [PLOTS[0].id],
      });
      const records = createBestOf({
        id: 'records',
        metrics: Object.fromEntries(PLOTS.map((p) => [p.id, { mode: 'absolute' as const }])),
      });
      const held = persistent<string[]>([], { id: 'held' });

      const xp = computed(() =>
        Object.values(records.entries.value).reduce((s, e) => s + (e ? e.value.toNumber() : 0), 0),
      );
      const level = computed(() => gardenerLevel(xp.value));

      const chains = {
        damage: createModifierChain('damage'),
        range: createModifierChain('range'),
        startCompost: createModifierChain('start-compost'),
        seedlings: createModifierChain('seedlings'),
        earlyCall: createModifierChain('early-call'),
      };

      const notes = createResource<DecimalSource>(0, { id: 'notes', displayName: 'Almanac notes' });
      const levelOf = (id: LessonDef['id']) => () =>
        num(lessons.getPurchasable(id)?.count.value ?? 0);
      const lessons: PurchasableCategory<LessonDef> = createPurchasableCategory<LessonDef>({
        id: 'almanac',
        mapPurchasable: (def) => {
          const lv = levelOf(def.id);
          const step = LESSON_STEP[def.id];
          const grant = {
            'well-fed': { chain: chains.damage, multiplier: () => 1 + step * lv() },
            bins: { chain: chains.startCompost, multiplier: () => 1 + step * lv() },
            perches: { chain: chains.range, add: () => step * lv() },
            cloches: { chain: chains.seedlings, add: () => step * lv() },
            'early-riser': { chain: chains.earlyCall, multiplier: () => 1 + step * lv() },
          }[def.id];
          return {
            display: { title: def.displayName, description: def.description },
            requirements: createCostRequirement({ resource: notes, cost: 1 }),
            limit: LESSON_MAX,
            grants: [{ ...grant, description: def.displayName }],
          };
        },
      });
      lessons.register(LESSONS);

      // Notes are a budget, not a stock: the level less the lessons bought. Recomputed
      // from both sides, so a load, a relearn or a new best all settle it the same way.
      watch(
        [level, lessons.totalCount],
        ([lv, spent]) => {
          notes.value = Math.max(0, lv - num(spent));
        },
        // Sync: a headless driver reads notes in the same synchronous turn they change.
        { immediate: true, flush: 'sync' },
      );
      const relearnReset = createReset({ thingsToReset: [lessons] });

      api = {
        anchors,
        specs,
        plots,
        records,
        held,
        xp,
        level,
        notes,
        lessons,
        relearn: () => relearnReset.reset(),
        chains,
        isPlantUnlocked: (id) => level.value >= specs.value[id].unlockLevel,
      };
      ctx.provide(GardenKey, api);
    },
  };
}
