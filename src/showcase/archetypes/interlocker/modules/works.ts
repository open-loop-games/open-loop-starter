import {
  computed,
  createConversion,
  createCostRequirement,
  createGateRequirement,
  createModifierChain,
  createMultiplicativeModifier,
  createProducerCategory,
  createPurchasableCategory,
  createResource,
  createResourceBag,
  Decimal,
  Formula,
  reactive,
  ref,
  toNumber,
  tunable,
  type ComputedRef,
  type Conversion,
  type EngineModule,
  type InjectionKey,
  type ModifierChain,
  type PurchasableCategory,
  type Ref,
  type Requirement,
  type Resource,
} from '@open-loop/engine';
import {
  BASE_WORKERS,
  BUILDINGS,
  COKING_MULT,
  CREDIT_CAP_MULT,
  ECOLE_LABOUR_MULT,
  PATRONAGE_WORKERS,
  RECIPES,
  RENOWN_OUTPUT_STEP,
  RESEARCH,
  RESOURCES,
  RHO,
  RHO_WORKER,
  ROLES,
  ROLLING_MULT,
  T_FILL,
  UPKEEP_PER_WORKER,
  WAREHOUSE_CAP_STEP,
  WORKERS_PER_CITE,
  baseCapacity,
  recipeDraw,
  type BuildingDef,
  type BuildingId,
  type Cost,
  type ResearchDef,
  type ResearchId,
  type ResourceId,
  type RoleId,
} from '../data';
import { EmpireKey } from './empire';
import { TelegraphKey } from './telegraph';
import { InterlockerTuningRegistryKey } from './tuning';

/**
 * Works module — everything an Exposition clears: the stock and its bins, the estate's
 * buildings, the Académie's patents, the compagnons seated at each trade, and the
 * workshop recipes that turn stock into aeroplanes. Its persistent context is the
 * Exposition's reset scope.
 */

/** What held a workshop back on the last tick: the bottleneck the schematic paints. */
export type Limit =
  | 'locked'
  | 'unstaffed'
  | 'labour'
  | 'storage'
  | 'hunger'
  | `input:${ResourceId}`;

export interface RoleStatus {
  /** cycles per second actually run last tick */
  cyclesPerSec: number;
  /** cycles per second the seated crew could run on full inputs */
  capacityPerSec: number;
  limit: Limit;
}

export interface WorksApi {
  res: Record<ResourceId, Resource<Decimal>>;
  /** each stock's bin */
  cap: Record<ResourceId, ComputedRef<number>>;
  /** net change per second last tick, across every channel: buildings, workshops, rations, bins */
  net: Record<ResourceId, number>;
  buildings: PurchasableCategory<BuildingDef>;
  research: PurchasableCategory<ResearchDef>;
  /** compagnons seated at each trade */
  crew: Record<RoleId, Resource<Decimal>>;
  roleStatus: Record<RoleId, RoleStatus>;
  roleOpen: Record<RoleId, ComputedRef<boolean>>;
  workersTotal: ComputedRef<number>;
  workersIdle: ComputedRef<number>;
  /** share of the compagnons' ration met last tick, 0..1 */
  fed: Ref<number>;
  /** seat (positive) or withdraw (negative) compagnons at a trade; returns how many moved */
  assign(role: RoleId, delta: number): number;
  researched(id: ResearchId): ComputedRef<boolean>;
  owned(id: BuildingId): number;
  /** raw units a second one building of this kind yields now; 0 for a support building */
  yieldEach(id: BuildingId): number;
}

export const WorksKey: InjectionKey<WorksApi> = Symbol(
  'interlocker/works',
) as InjectionKey<WorksApi>;

/** The works' persistent context: what an Exposition clears. */
export const WORKS_CONTEXT = 'interlocker/works';

let api: WorksApi;

export function getWorks(): WorksApi {
  return api;
}

export function createWorksModule(): EngineModule {
  return {
    id: WORKS_CONTEXT,
    dependencies: ['interlocker/empire'],
    install(ctx) {
      const registry = ctx.inject(InterlockerTuningRegistryKey);
      const empire = ctx.inject(EmpireKey);
      const telegraph = ctx.inject(TelegraphKey);

      const rho = tunable(registry, 'works/rho', () => RHO);
      const workerRate = tunable(registry, 'works/workerRate', () => RHO_WORKER);
      const upkeep = tunable(registry, 'works/upkeepPerWorker', () => UPKEEP_PER_WORKER);
      const fillSeconds = tunable(registry, 'storage/fillSeconds', () => T_FILL);
      const warehouseStep = tunable(registry, 'storage/warehouseStep', () => WAREHOUSE_CAP_STEP);
      const outputStep = tunable(registry, 'renown/outputStep', () => RENOWN_OUTPUT_STEP);

      const res = {} as Record<ResourceId, Resource<Decimal>>;
      for (const def of RESOURCES) {
        res[def.id] = createResource<Decimal>(new Decimal(def.start), {
          id: def.id,
          displayName: def.name,
          decimals: 0,
        });
      }

      // ── patents: a prerequisite graph ──
      // Each patent's requirements carry one Gate per predecessor beside its price: an edge
      // that deducts nothing.
      const costReqs = (
        cost: Cost,
        level?: Parameters<typeof Formula.exponential>[0],
        growth?: number,
      ): Requirement[] =>
        Object.entries(cost).map(([id, base]) =>
          createCostRequirement({
            resource: res[id as ResourceId],
            cost: level === undefined ? base : Formula.exponential(level, base, growth!),
          }),
        );
      const edge = (entry: ResearchId) =>
        createGateRequirement({ gate: { kind: 'active', category: 'research', entry } });

      const research = createPurchasableCategory<ResearchDef>({
        id: 'research',
        mapPurchasable: (def) => ({
          display: { title: def.name, description: def.blurb },
          requirements: [...def.requires.map(edge), ...costReqs(def.cost)],
          limit: 1,
          onPurchase: () => telegraph.send(`${def.year} — ${def.name}`, 'research'),
        }),
      });
      research.register(RESEARCH);
      const researched = (id: ResearchId) => research.getPurchasable(id)!.active;

      // ── the estate: multi-resource geometric ladders, opened by patents ──
      const buildings = createPurchasableCategory<BuildingDef>({
        id: 'buildings',
        mapPurchasable: (def) => ({
          display: { title: def.name, description: def.blurb },
          requirements: (level) => [
            ...(def.opensWith ? [edge(def.opensWith)] : []),
            ...costReqs(def.cost, level, def.growth),
          ],
          initialCount: def.start,
          visible: def.opensWith
            ? { kind: 'active', category: 'research', entry: def.opensWith }
            : true,
          // The telegraph carries the first of each kind per run; the rest is ledger noise.
          onPurchase: () => {
            if (owned(def.id) === def.start + 1)
              telegraph.send(`First ${def.name} raised`, 'build');
          },
        }),
      });
      buildings.register(BUILDINGS);
      const owned = (id: BuildingId) => toNumber(buildings.getPurchasable(id)!.count.value);

      // ── storage: one chain widens every bin; a bag clamps each stock to its bin ──
      const storage = createModifierChain('storage');
      storage.bind({
        text: 'Bonded warehouses',
        modifier: createMultiplicativeModifier({
          multiplier: () => 1 + warehouseStep.value * owned('warehouse'),
          description: 'Bonded warehouses',
        }),
      });
      storage.bind({
        text: 'Crédit Mobilier',
        active: empire.holds('credit'),
        modifier: createMultiplicativeModifier({
          multiplier: CREDIT_CAP_MULT,
          description: 'Crédit Mobilier',
        }),
      });
      const cap = {} as Record<ResourceId, ComputedRef<number>>;
      const capacityPerType: Record<string, () => number> = {};
      for (const def of RESOURCES) {
        cap[def.id] = computed(() =>
          toNumber(storage.apply(baseCapacity(def.id, fillSeconds.value))),
        );
        capacityPerType[def.id] = () => cap[def.id].value;
      }
      const bins = createResourceBag({ capacityPerType, overflow: 'discard', displayName: 'bins' });
      for (const def of RESOURCES) bins.link(def.id, res[def.id]);

      // ── raw production: producers whose count is the building ladder's level ──
      const output = createModifierChain('raw-output');
      output.bind({
        text: 'Renown',
        modifier: createMultiplicativeModifier({
          multiplier: () => 1 + outputStep.value * empire.lifetimeRenown.value,
          description: 'Renown',
        }),
      });
      const raw = createProducerCategory<BuildingDef>({
        id: 'raw',
        registerTick: ctx.onTick,
        mapProducer: (def) => ({
          resource: res[def.yields!],
          baseRate: rho,
          trigger: 'continuous',
          extraCount: () => buildings.getPurchasable(def.id)!.count.value,
        }),
        mapState: (def, producer) => {
          producer.rateChain.bind({ text: 'Raw output', modifier: output });
          if (def.id === 'pit') {
            producer.rateChain.bind({
              text: 'Coking ovens',
              active: researched('coking'),
              modifier: createMultiplicativeModifier({
                multiplier: COKING_MULT,
                description: 'Coking ovens',
              }),
            });
          }
        },
      });
      raw.register(BUILDINGS.filter((b) => b.yields));

      // ── the compagnons: a fixed headcount divided among the trades ──
      // The bag's total capacity is the headcount, and each trade's seats are a resource
      // linked into it. Seating is an add the ceiling can refuse; withdrawing frees the
      // compagnon for another trade.
      const workersTotal = computed(
        () =>
          BASE_WORKERS +
          WORKERS_PER_CITE * owned('cite') +
          (empire.holds('patronage').value ? PATRONAGE_WORKERS : 0),
      );
      const seats = createResourceBag({
        capacity: () => workersTotal.value,
        overflow: 'block',
        displayName: 'crew',
      });
      const crew = {} as Record<RoleId, Resource<Decimal>>;
      const roleOpen = {} as Record<RoleId, ComputedRef<boolean>>;
      for (const role of ROLES) {
        crew[role.id] = createResource<Decimal>(Decimal.dZero, {
          id: `crew-${role.id}`,
          displayName: role.name,
        });
        seats.link(role.id, crew[role.id]);
        roleOpen[role.id] = researched(role.opensWith);
      }
      const workersIdle = computed(() => toNumber(seats.remainingCapacity()));

      // ── upkeep: every compagnon eats, seated or idle ──
      // A producer with a negative rate draws the bread; a shortfall throttles every
      // workshop to the share fed (`fed`, in the tick below).
      const rations = createProducerCategory<{ id: string }>({
        id: 'rations',
        registerTick: ctx.onTick,
        mapProducer: () => ({
          resource: res.bread,
          baseRate: () => -upkeep.value,
          trigger: 'continuous',
          extraCount: () => workersTotal.value,
        }),
      });
      rations.register({ id: 'rations' });

      // ── the workshops: one chain per trade scales its labour rate ──
      const labour = {} as Record<RoleId, ModifierChain>;
      for (const role of ROLES) {
        labour[role.id] = createModifierChain(`labour/${role.id}`);
        labour[role.id].bind({
          text: 'École Centrale',
          active: empire.holds('ecole'),
          modifier: createMultiplicativeModifier({
            multiplier: ECOLE_LABOUR_MULT,
            description: 'École Centrale',
          }),
        });
      }
      labour.smelter.bind({
        text: 'Sheet rolling mill',
        active: researched('rolling'),
        modifier: createMultiplicativeModifier({
          multiplier: ROLLING_MULT,
          description: 'Sheet rolling mill',
        }),
      });

      // Each workshop's exchange is an engine conversion whose costs read a per-tick batch:
      // the conversion keeps the debit and the credit atomic, and the batch is sized outside it.
      const batch = {} as Record<RoleId, Ref<number>>;
      const exchange = {} as Record<RoleId, Conversion>;
      for (const role of ROLES) {
        const rec = RECIPES[role.id];
        const b = ref(0);
        batch[role.id] = b;
        exchange[role.id] = createConversion({
          inputs: Object.fromEntries(
            Object.entries(rec.inputs).map(([id, qty]) => [
              id,
              createCostRequirement({ resource: res[id as ResourceId], cost: () => b.value * qty }),
            ]),
          ),
          outputs: { out: { resource: res[rec.output], amount: () => b.value * rec.yields } },
        });
      }
      const roleStatus = reactive(
        Object.fromEntries(
          ROLES.map((r) => [r.id, { cyclesPerSec: 0, capacityPerSec: 0, limit: 'locked' }]),
        ),
      ) as Record<RoleId, RoleStatus>;

      // TODO(expansion): a flow ledger. getTotalRate sees producers only, not conversions
      // or a bag's clamp, so the true net rate is the stock delta across a whole tick.
      const net = reactive(Object.fromEntries(RESOURCES.map((r) => [r.id, 0]))) as Record<
        ResourceId,
        number
      >;
      const before = {} as Record<ResourceId, number>;
      // Snapshot at the end of each tick and diff at the end of the next, so the producer
      // categories' ticks, which run first, are inside the window.
      const snapshot = () => {
        for (const def of RESOURCES) before[def.id] = toNumber(res[def.id].value);
      };
      snapshot();

      const fed = ref(1);
      let warnedHunger = false;
      ctx.onTick((dt) => {
        // Producers have already run this tick, so an empty larder means the gardens'
        // inflow is all the compagnons got.
        // TODO(expansion): an upkeep shortfall. A negative-rate producer floors its stock
        // at zero but reports no shortfall to throttle on, so the share fed is recomputed here.
        const demand = workersTotal.value * upkeep.value;
        const gardens = toNumber(raw.getTotalRate(res.bread));
        fed.value =
          toNumber(res.bread.value) > demand * dt || demand === 0
            ? 1
            : Math.min(1, gardens / demand);
        if (fed.value < 1 && !warnedHunger) {
          telegraph.send('The larder is empty — workshops slow to what the gardens feed', 'warn');
          warnedHunger = true;
        }
        if (fed.value >= 1) warnedHunger = false;

        // TODO(expansion): continuous converter (candidate-primitives.md). A workshop's
        // throughput is the minimum over crew × rate × fed, each input's stock, and the
        // output bin's room; createConversion is one-shot, so the batch is sized here.
        for (const role of ROLES) {
          const st = roleStatus[role.id];
          const rec = RECIPES[role.id];
          if (!roleOpen[role.id].value) {
            Object.assign(st, { cyclesPerSec: 0, capacityPerSec: 0, limit: 'locked' });
            continue;
          }
          const seated = toNumber(crew[role.id].value);
          if (seated === 0) {
            Object.assign(st, { cyclesPerSec: 0, capacityPerSec: 0, limit: 'unstaffed' });
            continue;
          }
          const perSec =
            seated * toNumber(labour[role.id].apply(workerRate.value / recipeDraw(role.id)));
          let cycles = perSec * fed.value * dt;
          let limit: Limit = fed.value < 1 ? 'hunger' : 'labour';
          for (const [id, qty] of Object.entries(rec.inputs)) {
            const afford = toNumber(res[id as ResourceId].value) / qty;
            if (afford < cycles) {
              cycles = afford;
              limit = `input:${id as ResourceId}`;
            }
          }
          const room = (cap[rec.output].value - toNumber(res[rec.output].value)) / rec.yields;
          if (room < cycles) {
            cycles = Math.max(0, room);
            limit = 'storage';
          }
          // Shave a hair so float error in stock/qty never fails the affordability check.
          cycles *= 1 - 1e-9;
          if (cycles > 1e-12) {
            batch[role.id].value = cycles;
            exchange[role.id].convert();
          }
          Object.assign(st, { cyclesPerSec: cycles / dt, capacityPerSec: perSec, limit });
        }

        for (const def of RESOURCES)
          net[def.id] = (toNumber(res[def.id].value) - before[def.id]) / dt;
        snapshot();
      });
      ctx.onLoad(snapshot);

      api = {
        res,
        cap,
        net,
        buildings,
        research,
        crew,
        roleStatus,
        roleOpen,
        workersTotal,
        workersIdle,
        fed,
        assign(role, delta) {
          if (!roleOpen[role].value) return 0;
          return delta > 0
            ? toNumber(seats.add(role, delta))
            : -toNumber(seats.subtract(role, -delta));
        },
        researched,
        owned,
        yieldEach: (id) => {
          const p = raw.getProducer(id);
          return p ? toNumber(p.computedRate.value) : 0;
        },
      };
      ctx.provide(WorksKey, api);
    },
  };
}
