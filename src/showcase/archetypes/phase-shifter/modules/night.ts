import {
  Decimal,
  Formula,
  TickDriverKey,
  addResource,
  computed,
  createCostRequirement,
  createCycle,
  createPurchasableCategory,
  createResource,
  persistent,
  ref,
  tunable,
  watch,
  type ComputedRef,
  type Cycle,
  type EngineModule,
  type InjectionKey,
  type Persistent,
  type Purchasable,
  type Ref,
  type Resource,
} from '@open-loop/engine';
import {
  ANCHORS,
  HOURS,
  IDS,
  INSOMNIA_COST,
  ROSTER_BASE_COST,
  ROSTER_RATIO,
  SUSPECTS,
  SUSPECT_AT,
  SUSPECT_CARDS,
  hintsOf,
  strainCapacity,
  watchKey,
  type PersonId,
  type StakeoutView,
} from '../data';
import { BoardKey } from './board';
import { CaseKey } from './case';
import { PhaseShifterTuningRegistryKey } from './tuning';

/**
 * Night module — Phase III. The board comes down and becomes a model of
 * Harrow Mill, replayed 18:00 to 06:00. The player posts clerks on watches —
 * a place at an hour — and the replay resolves each hour as the clock passes
 * it. A watch that sees a suspect files an account and corroborates that hour
 * of their alibi; a watch that sees nobody adds strain, and once strain
 * reaches what the roster can carry, the model breaks: the night ends there
 * and nothing it found is filed. What a night finds banks only at dawn.
 */
export interface NightApi {
  accounts: Resource;
  /** Accounts tonight has turned up, banked at dawn. */
  unfiled: Resource;
  cycle: Cycle;
  /** The watches the clerks keep, every night until changed. */
  plan: Persistent<string[]>;
  /** Banked sightings per watch. */
  seen: Persistent<Record<string, number>>;
  /** Tonight's sightings, filed at dawn unless the model breaks. */
  tonight: Persistent<string[]>;
  /** Watches known to hold nobody: what a search learns, kept even when the night breaks. */
  empty: Persistent<string[]>;
  strain: Persistent<number>;
  /** Whether tonight's model has broken. */
  broken: Ref<boolean>;
  /** Watches the night can staff. */
  roster: ComputedRef<number>;
  /** Empty watches that break tonight's model. */
  strainCap: ComputedRef<number>;
  rosterPlace: Purchasable;
  insomnia: Purchasable;
  /** Watches the board's pinned cards point at. */
  hints: ComputedRef<Set<string>>;
  /** Suspects whose alibis hold, in the order they held. */
  held: Persistent<PersonId[]>;
  /** Alibis held: the record the last door reads. */
  alibis: Resource;
  /** Hours of the night already resolved, 0 to 6. */
  resolved: Persistent<number>;
  /** Night clock, 0 → 1 across 18:00 → 06:00. */
  progress: ComputedRef<number>;
  /** Post a clerk on a watch, or call one off. False when the roster is full or the night is not live. */
  toggle(key: string): boolean;
  /** Replace the plan, trimmed to the roster. */
  setPlan(keys: string[]): void;
  /** What a planner can see of the stakeout now. */
  view(search: boolean): StakeoutView;
}

export const NightKey: InjectionKey<NightApi> = Symbol(
  'phase-shifter/night',
) as InjectionKey<NightApi>;

let api: NightApi;

export function getNight(): NightApi {
  return api;
}

export function createNightModule(): EngineModule {
  return {
    id: 'phase-shifter/night',
    install(ctx) {
      const registry = ctx.inject(PhaseShifterTuningRegistryKey);
      const { life, write } = ctx.inject(CaseKey);
      const board = ctx.inject(BoardKey);
      const driver = ctx.inject(TickDriverKey);
      const nightS = tunable(registry, 'night/seconds', () => ANCHORS.nightSeconds);
      const need = tunable(registry, 'night/sightingsPerHour', () => ANCHORS.sightingsPerHour);
      const perSighting = tunable(
        registry,
        'night/accountsPerSighting',
        () => ANCHORS.accountsPerSighting,
      );
      const rosterBase = tunable(registry, 'night/roster/baseCost', () => ROSTER_BASE_COST);
      const rosterRatio = tunable(registry, 'night/roster/ratio', () => ROSTER_RATIO);
      const insomniaCost = tunable(registry, 'night/insomnia/cost', () => INSOMNIA_COST);
      const insomniaSpeed = tunable(registry, 'night/insomnia/speed', () => ANCHORS.insomniaSpeed);

      const accounts = createResource<Decimal>(Decimal.dZero, {
        id: 'accounts',
        displayName: 'accounts',
      });
      const unfiled = createResource<Decimal>(Decimal.dZero, {
        id: 'unfiled',
        displayName: 'unfiled',
      });
      const alibis = createResource<Decimal>(Decimal.dZero, {
        id: IDS.alibis,
        displayName: 'alibis',
      });
      const plan = persistent<string[]>([], { id: 'plan' });
      const seen = persistent<Record<string, number>>({}, { id: 'seen' });
      const tonight = persistent<string[]>([], { id: 'tonight' });
      const empty = persistent<string[]>([], { id: 'empty' });
      const strain = persistent(0, { id: 'strain' });
      const resolved = persistent(0, { id: 'resolved' });
      const held = persistent<PersonId[]>([], { id: 'held' });
      const broken = ref(false);

      const rosters = createPurchasableCategory<{ id: 'place' }>({
        id: 'roster',
        mapPurchasable: () => ({
          display: {
            title: 'Put another clerk on nights',
            description: 'One more watch a night, and a little more strain the model can carry.',
          },
          requirements: (count) =>
            createCostRequirement({
              resource: accounts,
              cost: Formula.exponential(count, rosterBase, rosterRatio),
              maxBulkCount: 1,
            }),
          visible: life.liveGate('roster'),
        }),
      });
      rosters.register({ id: 'place' });
      const rosterPlace = rosters.getPurchasable('place')!;
      const roster = computed(() => ANCHORS.rosterStart + Number(rosterPlace.count.value));
      const strainCap = computed(() => strainCapacity(roster.value));
      const hints = computed(() => hintsOf(board.pins.value));

      const hourOf = (key: string) => Number(key.split('@')[1]);

      function resolveHour(h: number): void {
        for (const key of plan.value) {
          if (hourOf(key) !== h) continue;
          if (SUSPECT_AT[key]) {
            if (!tonight.value.includes(key)) tonight.value = [...tonight.value, key];
            addResource(unfiled, perSighting.value);
          } else {
            if (!empty.value.includes(key)) empty.value = [...empty.value, key];
            strain.value += 1;
          }
        }
        if (strain.value >= strainCap.value) broken.value = true;
      }

      function resolveThrough(hours: number): void {
        while (resolved.value < Math.min(hours, HOURS.length) && !broken.value) {
          resolveHour(resolved.value);
          resolved.value += 1;
        }
      }

      const cycle = createCycle({
        id: 'night-replay',
        registerTick: ctx.onTick,
        endCondition: () => broken.value || cycle.elapsed.value >= nightS.value,
        thingsToReset: [unfiled],
        onBeforeEnd: () => {
          const night = cycle.count.value + 1;
          // Dawn resolves whatever hours the clock passed this tick.
          resolveThrough(HOURS.length);
          if (broken.value) {
            write(
              `${HOURS[resolved.value - 1] ?? HOURS[0]}. Too many empty watches: the model breaks. Nothing from night ${night} is filed.`,
            );
            return;
          }
          addResource(accounts, unfiled.value);
          const next = { ...seen.value };
          for (const key of tonight.value) next[key] = (next[key] ?? 0) + 1;
          seen.value = next;
          write(
            `06:00. Night ${night} replayed; ${tonight.value.length} sightings filed, ${new Decimal(unfiled.value).floor().toString()} accounts.`,
          );
          for (const s of SUSPECTS) {
            if (held.value.includes(s.id)) continue;
            const hours = SUSPECT_CARDS.filter((c) => c.who === s.id);
            if (hours.every((c) => (next[watchKey(c.where, c.when)] ?? 0) >= need.value)) {
              held.value = [...held.value, s.id];
              addResource(alibis, 1);
              write(s.alibi);
            }
          }
        },
      });
      cycle.on('afterEnd', () => {
        tonight.value = [];
        strain.value = 0;
        resolved.value = 0;
        broken.value = false;
      });

      // Resolve each hour as the night's clock passes the end of it.
      ctx.onTick(() => {
        if (!cycle.running.value) return;
        resolveThrough(Math.floor((cycle.elapsed.value / nightS.value) * HOURS.length));
      });

      // The replay runs exactly while the night mechanism is live. `running` is not saved.
      const nightLive = life.isLive('night');
      const syncRunning = () => (nightLive.value ? cycle.resume() : cycle.pause());
      watch(nightLive, syncRunning, { immediate: true, flush: 'sync' });
      ctx.onLoad(syncRunning);

      const extras = createPurchasableCategory<{ id: 'insomnia' }>({
        id: 'night-extras',
        mapPurchasable: () => ({
          display: {
            title: 'Stop sleeping',
            description: 'Coffee, cold water, the radiator off. Everything runs twice as fast.',
          },
          requirements: createCostRequirement({ resource: accounts, cost: insomniaCost }),
          limit: 1,
          visible: life.liveGate('insomnia'),
        }),
      });
      extras.register({ id: 'insomnia' });
      const insomnia = extras.getPurchasable('insomnia')!;
      // Game speed, set on the TickDriver: every tick consumer speeds up together.
      watch(
        () => insomnia.active.value,
        (on) => {
          driver.speedMultiplier = on ? insomniaSpeed.value : 1;
        },
        { immediate: true, flush: 'sync' },
      );

      const watchLive = life.isLive('watch');
      api = {
        accounts,
        unfiled,
        cycle,
        plan,
        seen,
        tonight,
        empty,
        strain,
        broken,
        roster,
        strainCap,
        rosterPlace,
        insomnia,
        hints,
        held,
        alibis,
        resolved,
        progress: computed(() => Math.min(1, cycle.elapsed.value / nightS.value)),
        toggle(key) {
          if (!watchLive.value) return false;
          if (plan.value.includes(key)) {
            plan.value = plan.value.filter((k) => k !== key);
            return true;
          }
          if (plan.value.length >= roster.value) return false;
          plan.value = [...plan.value, key];
          return true;
        },
        setPlan(keys) {
          if (!watchLive.value) return;
          plan.value = [...new Set(keys)].slice(0, roster.value);
        },
        view: (search) => ({
          roster: roster.value,
          seen: seen.value,
          empty: new Set(empty.value),
          hints: hints.value,
          need: need.value,
          strainCap: strainCap.value,
          search,
        }),
      };
      ctx.provide(NightKey, api);
    },
  };
}
