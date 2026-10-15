import {
  Decimal,
  computed,
  createMultiplicativeModifier,
  createProducerCategory,
  createResource,
  persistent,
  tunable,
  type ComputedRef,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type Persistent,
  type ProducerCategory,
  type Resource,
} from '@open-loop/engine';
import { createModuleApi } from '@/modules/module-api';
import { ANCHORS, HIGH_TIER_FROM, NETWORK, TIERS, type TierDef } from '../data';
import { CoreKey } from './core';
import { ScalerTuningRegistryKey, type ScalerTunableKey } from './tuning';

/**
 * The run: Justice and the hero corps. Every hero earns Justice on its own, and
 * each recruit of a tier costs more than the last. A Reboot wipes this module's
 * whole context, so everything here lasts one timeline: Hope too, and the
 * Informants and Safehouses the Network has made this timeline. The Network's
 * bought units belong to Legacy (`./legacy.ts`) and outlast a Reboot.
 */

export interface RunApi {
  justice: Resource;
  heroes: ProducerCategory<TierDef>;
  /** The per-unit price growth in force: the tunable base through the price-ratio chain. */
  priceRatio: ComputedRef<DecimalSource>;
  /** Seconds since this timeline began. */
  runSeconds: Persistent<number>;
  /** Justice earned this timeline, spent or not. */
  runEarned: ComputedRef<Decimal>;
  /** Justice per second across the corps. */
  totalRate: ComputedRef<Decimal>;
  /** Hope, which the Network makes this timeline; heroes ×(1 + Hope)^power. */
  hope: Resource;
  /** Informants and Safehouses the Network has made this timeline, by chain tier 1 and 2. */
  networkMade: [Resource, Resource];
}

export const RunKey: InjectionKey<RunApi> = Symbol('scaler/run') as InjectionKey<RunApi>;

const runApi = createModuleApi(RunKey);
export const getRun = runApi.get;

export const HEROES = 'heroes';
export const JUSTICE = 'justice';

export function createRunModule(): EngineModule {
  return {
    id: 'scaler/run',
    dependencies: ['scaler/tuning', 'scaler/core'],
    install(ctx) {
      const tuning = ctx.inject(ScalerTuningRegistryKey);
      const core = ctx.inject(CoreKey);

      const justice = createResource<DecimalSource>(ANCHORS.startJustice, {
        id: JUSTICE,
        displayName: 'Justice',
      });
      // TODO(expansion): a run-scoped cumulative. Resource.cumulative is lifetime-only, and a
      // mark subtracted from it fails past 9e15: break_eternity drops a gain under ~1e-13 of the
      // total. So the run counts its own earnings, and the Reboot's wipe zeroes the count.
      const earned = persistent<DecimalSource>(0, { id: 'run-earned', decimal: true });
      const runSeconds = persistent<number>(0, { id: 'run-seconds' });
      const baseRatio = tunable(
        tuning,
        'heroes/priceRatio' satisfies ScalerTunableKey,
        () => ANCHORS.priceRatio,
      );
      const priceRatio = computed(() => core.priceRatio.apply(baseRatio.value));

      const heroes = createProducerCategory<TierDef>({
        id: HEROES,
        registerTick: ctx.onTick,
        mapProducer: (def) => ({
          resource: justice,
          baseRate: def.baseRate,
          trigger: 'continuous',
          display: def.displayName,
          purchase: {
            costResource: justice,
            baseCost: tunable(
              tuning,
              `heroes/${def.id}/baseCost` satisfies ScalerTunableKey,
              () => def.baseCost,
            ),
            costRatio: priceRatio,
          },
        }),
        mapState: (def, producer) => {
          producer.rateChain.bind({ modifier: core.output, text: 'Output' });
          const band = def.tier >= HIGH_TIER_FROM ? core.high : core.street;
          producer.rateChain.bind({ modifier: band, text: band.id });
        },
      });
      heroes.register(TIERS);

      const hope = createResource<DecimalSource>(0, { id: 'hope', displayName: 'Hope' });
      const networkMade: [Resource, Resource] = [
        createResource<DecimalSource>(0, { id: 'informants-made' }),
        createResource<DecimalSource>(0, { id: 'safehouses-made' }),
      ];
      core.output.bind({
        modifier: createMultiplicativeModifier({
          multiplier: () => Decimal.add(1, hope.value).pow(NETWORK.power),
          description: 'Hope',
        }),
        text: 'Hope',
      });

      const totalRate = computed(() => Decimal.fromValue(heroes.getTotalRate(justice)));
      ctx.onTick((dt) => {
        runSeconds.value += dt;
        earned.value = Decimal.mul(totalRate.value, dt).add(earned.value);
      });

      const api: RunApi = {
        justice,
        heroes,
        priceRatio,
        runSeconds,
        hope,
        networkMade,
        runEarned: computed(() => Decimal.fromValue(earned.value)),
        totalRate,
      };
      runApi.publish(ctx, api);
    },
  };
}
