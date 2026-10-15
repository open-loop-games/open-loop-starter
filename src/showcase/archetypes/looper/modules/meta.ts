import {
  computed,
  createCostRequirement,
  createModifierChain,
  createPurchasableCategory,
  createResource,
  createZoneSystem,
  Decimal,
  Formula,
  persistent,
  TickDriverKey,
  tunable,
  watch,
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
import { createModuleApi } from '@/modules/module-api';
import {
  DEFAULT_PLAN,
  GRAPEVINE_PER_LEVEL,
  NOTE_PRICES,
  NOTES,
  SPEED_STEPS,
  ZONES,
  type NoteDef,
  type NoteId,
} from '../data';
import { LooperTuningRegistryKey } from './tuning';

/**
 * Meta module — what survives a night: Intel, the plan, the ground discovered,
 * the notes Intel buys, the patrol learned, the global speed stack, the
 * game-speed rung and the splits record. The night module resets every night; this one never does.
 */

/** One line of the player's plan: an action and how many times to run it. */
export interface PlanRow {
  id: string;
  times: number;
}

export interface MetaApi {
  intel: Resource<DecimalSource>;
  /** the authored policy: an ordered list the night's executor walks */
  plan: Persistent<PlanRow[]>;
  zones: ZoneSystem;
  notes: PurchasableCategory<NoteDef>;
  /** levels owned of a note */
  owned(id: NoteId): number;
  /** the open-ended speed stack every action's rate chain folds in */
  speedChain: ModifierChain;
  /** index into `speedSteps` the player chose */
  chosenSpeed: Persistent<number>;
  /** game-speed rungs Déjà Vu has unlocked so far */
  speedSteps: ComputedRef<number[]>;
  /** lowest night-seconds to reach each landmark, keyed by depth */
  bestSplits: Persistent<Record<string, number>>;
  /** kept patrol-knowledge level: each one shortens Slip the Patrol on every later night */
  patrolKnowledge: Persistent<number>;
  /** the last finished night's splits, the diff the night strip ghosts */
  lastSplits: Persistent<Record<string, number>>;
  escapes: Persistent<number>;
}

export const MetaKey: InjectionKey<MetaApi> = Symbol('looper/meta') as InjectionKey<MetaApi>;

const metaApi = createModuleApi(MetaKey);
export const getMeta = metaApi.get;

// === PLAN VERBS ===
// Every edit replaces the persisted array, so it saves and re-renders. An edit
// made during a night applies to the next night.

/** Append an action; a repeat of the last row's action bumps its count instead. */
export function addToPlan(id: string): void {
  const { plan } = getMeta();
  const rows = [...plan.value];
  const last = rows[rows.length - 1];
  if (last?.id === id) rows[rows.length - 1] = { id, times: last.times + 1 };
  else rows.push({ id, times: 1 });
  plan.value = rows;
}

/** Change a row's repeat count, never below one. */
export function bumpTimes(index: number, by: number): void {
  const { plan } = getMeta();
  const rows = [...plan.value];
  rows[index] = { ...rows[index], times: Math.max(1, rows[index].times + by) };
  plan.value = rows;
}

/** Swap a row with its neighbour above (-1) or below (+1). */
export function moveRow(index: number, by: -1 | 1): void {
  const { plan } = getMeta();
  const to = index + by;
  if (to < 0 || to >= plan.value.length) return;
  const rows = [...plan.value];
  [rows[index], rows[to]] = [rows[to], rows[index]];
  plan.value = rows;
}

export function removeRow(index: number): void {
  const { plan } = getMeta();
  plan.value = plan.value.filter((_, i) => i !== index);
}

export function createMetaModule(): EngineModule {
  return {
    id: 'looper/meta',
    dependencies: ['looper/tuning'],
    install(ctx) {
      const registry = ctx.inject(LooperTuningRegistryKey);

      const intel = createResource<DecimalSource>(0, { id: 'intel', displayName: 'Intel' });
      const zones = createZoneSystem({
        zones: ZONES.map((z) => ({ id: z.id, displayName: z.displayName, order: z.order })),
        initiallyUnlocked: [ZONES[0].id],
      });

      const plan = persistent<PlanRow[]>(DEFAULT_PLAN, { id: 'plan' });
      const chosenSpeed = persistent(0, { id: 'chosenSpeed' });
      const bestSplits = persistent<Record<string, number>>({}, { id: 'bestSplits' });
      const lastSplits = persistent<Record<string, number>>({}, { id: 'lastSplits' });
      const escapes = persistent(0, { id: 'escapes' });
      const patrolKnowledge = persistent(0, { id: 'patrolKnowledge' });

      const speedChain = createModifierChain('looper/speed');
      const grapevineStep = tunable(
        registry,
        'notes/grapevine/speedPerLevel',
        () => GRAPEVINE_PER_LEVEL,
      );

      const owned = (id: NoteId): number =>
        new Decimal(notes.getPurchasable(id)?.count.value ?? 0).toNumber();

      const notes = createPurchasableCategory<NoteDef>({
        id: 'looper-notes',
        mapPurchasable: (def) => {
          const price = NOTE_PRICES[def.id];
          const base = tunable(registry, `notes/${def.id}/baseCost`, () => price.base);
          const ratio = tunable(registry, `notes/${def.id}/costRatio`, () => price.ratio);
          return {
            display: { title: def.displayName, description: def.description },
            requirements: (level) =>
              createCostRequirement({
                resource: intel,
                cost: Formula.exponential(level, base, ratio),
              }),
            limit: price.limit,
            visible: def.after ? () => owned(def.after!) > 0 : true,
            grants:
              def.id === 'grapevine'
                ? [
                    {
                      chain: speedChain,
                      multiplier: () => 1 + grapevineStep.value * owned('grapevine'),
                      description: 'The Grapevine',
                    },
                  ]
                : undefined,
          };
        },
      });
      notes.register(NOTES);

      // Game speed: Déjà Vu levels unlock rungs and the player picks one. It is
      // set on the TickDriver, so every timed thing — Nerve, actions, Routine's
      // dwell — speeds up together.
      const speedSteps = computed(() => SPEED_STEPS.slice(0, 1 + owned('deja-vu')));
      const tickDriver = ctx.inject(TickDriverKey);
      watch(
        () => speedSteps.value[Math.min(chosenSpeed.value, speedSteps.value.length - 1)],
        (speed) => {
          tickDriver.speedMultiplier = speed;
        },
        { immediate: true },
      );

      const api: MetaApi = {
        intel,
        plan,
        zones,
        notes,
        owned,
        speedChain,
        chosenSpeed,
        speedSteps,
        bestSplits,
        lastSplits,
        escapes,
        patrolKnowledge,
      };
      metaApi.publish(ctx, api);
    },
  };
}
