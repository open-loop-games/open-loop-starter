import {
  Decimal,
  computed,
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
import { ANCHORS, HIGH_TIER_FROM, TIERS, type TierDef } from '../data';
import { CoreKey } from './core';
import { ScalerTuningRegistryKey, type ScalerTunableKey } from './tuning';

/**
 * The run: Justice and the hero corps. Every hero earns Justice on its own, and
 * each recruit of a tier costs more than the last. A Reboot wipes this module's
 * whole context, so everything here lasts one timeline.
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
  /** Start counting `runEarned` from now; a reset calls it once it settles. */
  markRunStart(): void;
}

export const RunKey: InjectionKey<RunApi> = Symbol('scaler/run') as InjectionKey<RunApi>;

let api: RunApi;

export function getRun(): RunApi {
  return api;
}

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
      // TODO(expansion): a run-scoped cumulative. Resource.cumulative is lifetime-only, so
      // "earned since my layer last reset" is a mark written after each reset and subtracted
      // on read; `./legacy.ts` does the same for Legacy earned since the last Rewrite.
      const runMark = persistent<DecimalSource>(ANCHORS.startJustice, {
        id: 'run-mark',
        decimal: true,
      });
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

      ctx.onTick((dt) => {
        runSeconds.value += dt;
      });

      api = {
        justice,
        heroes,
        priceRatio,
        runSeconds,
        runEarned: computed(() => Decimal.sub(justice.cumulative!.value, runMark.value)),
        totalRate: computed(() => Decimal.fromValue(heroes.getTotalRate(justice))),
        markRunStart: () => {
          runMark.value = justice.cumulative!.value;
        },
      };
      ctx.provide(RunKey, api);
    },
  };
}
