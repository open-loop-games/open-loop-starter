import {
  Decimal,
  Formula,
  TickDriverKey,
  addResource,
  computed,
  createCostRequirement,
  createCycle,
  createMultiplicativeModifier,
  createProducerCategory,
  createPurchasableCategory,
  createResource,
  tunable,
  watch,
  type ComputedRef,
  type Cycle,
  type EngineModule,
  type InjectionKey,
  type Producer,
  type Purchasable,
  type Resource,
} from '@open-loop/engine';
import {
  ANCHORS,
  ELIMINATION_BASE_COST,
  ELIMINATION_RATIO,
  IDS,
  INSOMNIA_COST,
  NIGHT_BASE_RATE,
  SUSPECTS,
  WITNESS_BASE_COST,
  fidelity as fidelityOf,
} from '../data';
import { BoardKey } from './board';
import { CaseKey } from './case';
import { PhaseShifterTuningRegistryKey } from './tuning';

/**
 * Night module — Phase III. The board becomes a model of Harrow Mill on the
 * night Ada Larkspur disappeared, and the model replays that night over and
 * over. Each replay is bounded by the clock, 18:00 → 06:00; what it turns up is
 * held as unfiled contradictions and banked only at dawn. Banked
 * contradictions buy witness accounts (a richer model) and, one suspect at a
 * time, the alibis that clear them.
 */
export interface NightApi {
  unfiled: Resource;
  contradictions: Resource;
  /** The board's lifetime lead record, read as the model's multiplier. */
  fidelity: ComputedRef<number>;
  base: Producer;
  witness: Producer;
  cycle: Cycle;
  eliminate: Purchasable;
  insomnia: Purchasable;
  /** Contradictions/s the model turns up right now. */
  rate: ComputedRef<Decimal>;
  /** Night clock, 0 → 1 across 18:00 → 06:00. */
  progress: ComputedRef<number>;
  /** Suspects still standing, in elimination order. */
  standing: ComputedRef<typeof SUSPECTS>;
}

export const NightKey: InjectionKey<NightApi> = Symbol(
  'phase-shifter/night',
) as InjectionKey<NightApi>;

let api: NightApi;

export function getNight(): NightApi {
  return api;
}

interface ModelDef {
  id: 'base' | 'witness';
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
      const baseRate = tunable(registry, 'night/baseRate', () => NIGHT_BASE_RATE);
      const witnessBase = tunable(registry, 'night/witness/baseCost', () => WITNESS_BASE_COST);
      const growth = tunable(registry, 'ladders/growth', () => ANCHORS.growth);
      const elimBase = tunable(registry, 'night/eliminate/baseCost', () => ELIMINATION_BASE_COST);
      const elimRatio = tunable(registry, 'night/eliminate/ratio', () => ELIMINATION_RATIO);
      const insomniaCost = tunable(registry, 'night/insomnia/cost', () => INSOMNIA_COST);
      const insomniaSpeed = tunable(registry, 'night/insomnia/speed', () => ANCHORS.insomniaSpeed);

      const unfiled = createResource<Decimal>(Decimal.dZero, {
        id: 'unfiled',
        displayName: 'unfiled',
      });
      const contradictions = createResource<Decimal>(Decimal.dZero, {
        id: 'contradictions',
        displayName: 'contradictions',
      });

      // The board's lifetime record, absorbed: everything ever pinned sets the model's fidelity.
      const fidelity = computed(() =>
        fidelityOf(new Decimal(board.leads.cumulative!.value).toNumber()),
      );

      const model = createProducerCategory<ModelDef>({
        id: 'model',
        registerTick: ctx.onTick,
        mapProducer: (def) =>
          def.id === 'base'
            ? { resource: unfiled, baseRate: baseRate.value, trigger: 'continuous' }
            : {
                resource: unfiled,
                baseRate: baseRate.value,
                trigger: 'continuous',
                display: 'File a witness account',
                purchase: {
                  costResource: contradictions,
                  baseCost: witnessBase,
                  costRatio: growth,
                  visible: life.liveGate('witness'),
                },
              },
        mapState: (_def, producer) => {
          producer.rateChain.bind({
            text: 'Board fidelity',
            modifier: () =>
              createMultiplicativeModifier({ multiplier: fidelity, description: 'Board fidelity' }),
          });
        },
      });
      model.register([{ id: 'base' }, { id: 'witness' }]);
      const base = model.getProducer('base')!;
      const witness = model.getProducer('witness')!;
      life.scope('night', [base.rateChain, witness.rateChain]);

      const cycle = createCycle({
        id: 'night-replay',
        registerTick: ctx.onTick,
        endCondition: () => cycle.elapsed.value >= nightS.value,
        thingsToReset: [unfiled],
        onBeforeEnd: () => {
          const found = new Decimal(unfiled.value);
          addResource(contradictions, found);
          write(
            `06:00. Night ${cycle.count.value + 1} replayed; ${found.floor().toString()} contradictions filed.`,
          );
        },
      });

      // The replay runs exactly while the night mechanism is live. `running` is not saved.
      const nightLive = life.isLive('night');
      const syncRunning = () => (nightLive.value ? cycle.resume() : cycle.pause());
      watch(nightLive, syncRunning, { immediate: true, flush: 'sync' });
      ctx.onLoad(syncRunning);

      const accusations = createPurchasableCategory<{ id: typeof IDS.eliminate }>({
        id: IDS.eliminations,
        mapPurchasable: () => ({
          display: {
            title: 'Clear a suspect',
            description: 'Spend contradictions until an alibi holds.',
          },
          requirements: (level) =>
            createCostRequirement({
              resource: contradictions,
              cost: Formula.exponential(level, elimBase, elimRatio),
              maxBulkCount: 1,
            }),
          limit: SUSPECTS.length - 1,
          visible: life.liveGate('eliminate'),
        }),
      });
      accusations.register({ id: IDS.eliminate });
      const eliminate = accusations.getPurchasable(IDS.eliminate)!;
      eliminate.on('purchased', () => {
        const cleared = SUSPECTS[new Decimal(eliminate.count.value).toNumber() - 1];
        if (cleared) write(cleared.alibi);
      });

      const extras = createPurchasableCategory<{ id: 'insomnia' }>({
        id: 'night-extras',
        mapPurchasable: () => ({
          display: {
            title: 'Stop sleeping',
            description: 'Coffee, cold water, the radiator off. Everything runs twice as fast.',
          },
          requirements: createCostRequirement({ resource: contradictions, cost: insomniaCost }),
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

      api = {
        unfiled,
        contradictions,
        fidelity,
        base,
        witness,
        cycle,
        eliminate,
        insomnia,
        rate: computed(() => new Decimal(model.getTotalRate(unfiled))),
        progress: computed(() => Math.min(1, cycle.elapsed.value / nightS.value)),
        standing: computed(() => SUSPECTS.slice(new Decimal(eliminate.count.value).toNumber())),
      };
      ctx.provide(NightKey, api);
    },
  };
}
