import { computed, unref, type Ref } from 'vue';
import {
  Decimal,
  createMultiplicativeModifier,
  createProducerCategory,
  createResource,
  persistent,
  tunable,
  type DecimalSource,
  type EngineModule,
  type InjectionKey,
  type Producer,
  type ProducerCategory,
  type Resource,
} from '@open-loop/engine';
import type { ProbeClassDef, ProbeClassId, ProducerData, ProducerGameState } from '../data/types';
import { CLICK_BASE_YIELD, COST_RATIO, GENERATION_STEP } from '../data/curve';
import { ProducerTuningRegistryKey } from './tuning';

/**
 * Swarm module — mass, the eight probe classes, and the hand-launch.
 *
 * Owns three of the four chains' anchor points: every class's `rateChain` is
 * where `refinements`, `revisions` and `generation` land (the other modules
 * bind onto chains this module created). The click keeps a chain of its own
 * that nothing global binds to — see `../data/refinements.ts` § Balance for
 * why that separation is load-bearing rather than tidy.
 */

export const MassLifetimeKey: InjectionKey<Ref<DecimalSource>> = Symbol(
  'producer/mass-lifetime',
) as InjectionKey<Ref<DecimalSource>>;

// Module-scope handles set during install. Sibling modules, composables and UI
// import the typed accessors below; only one producer engine is active per
// process, which is the same assumption the other archetypes make.
let mass: Resource<DecimalSource>;
let classes: ProducerCategory<ProbeClassDef>;
let launcher: Producer;
let launchCount: Ref<DecimalSource>;

export function getMass(): Resource<DecimalSource> {
  return mass;
}

export function getClasses(): ProducerCategory<ProbeClassDef> {
  return classes;
}

/** The manual-trigger producer behind `launch()`. UI should call `launch()`. */
export function getLauncher(): Producer {
  return launcher;
}

/** Hand-launches performed this save. Drives the click refinement gates. */
export function getLaunchCount(): Ref<DecimalSource> {
  return launchCount;
}

/** Fire one hand-launch: produce mass and count it. The A+C activity. */
export function launch(): void {
  launcher.activate?.();
  launchCount.value = Decimal.add(launchCount.value, 1);
}

/** Aggregate mass/sec across every continuous class. Excludes the launcher. */
export function getHeadlineRate(): DecimalSource {
  return classes.getTotalRate(mass);
}

/**
 * The read view `data/*.ts` predicates close over. Every method is a count or
 * a lifetime total — see `../data/types.ts` for why that is a spine
 * constraint and not a convention.
 */
export function buildProducerGameState(data: ProducerData): ProducerGameState {
  const lifetime = mass.cumulative!;

  // Hoisted, not per-call: these back every revision and refinement predicate,
  // each of which is itself lowered into a `computed`. Rebuilding them inside
  // the predicate would allocate a fresh computed per evaluation and cache
  // nothing.
  const fleetSize = computed<DecimalSource>(() =>
    data.classes.reduce<DecimalSource>(
      (total, def) => Decimal.add(total, classes.getProducer(def.id)?.ownedCount.value ?? 0),
      0,
    ),
  );
  const distinctClasses = computed(
    () =>
      data.classes.filter((def) =>
        Decimal.gte(classes.getProducer(def.id)?.ownedCount.value ?? 0, 1),
      ).length,
  );

  return {
    classCountAtLeast: (id, count) => {
      const producer = classes.getProducer(id);
      return producer ? Decimal.gte(producer.ownedCount.value, count) : false;
    },
    fleetSizeAtLeast: (count) => Decimal.gte(fleetSize.value, count),
    distinctClassesAtLeast: (count) => distinctClasses.value >= count,
    lifetimeMassAtLeast: (amount) => Decimal.gte(lifetime.value, amount),
    launchesAtLeast: (count) => Decimal.gte(launchCount.value, count),
  };
}

export function createSwarmModule(data: ProducerData): EngineModule {
  return {
    id: 'producer/swarm',
    dependencies: ['producer/tuning'],
    install(ctx) {
      const registry = ctx.inject(ProducerTuningRegistryKey);

      mass = createResource<DecimalSource>(0, {
        displayName: 'Mass',
        precision: 0,
        id: 'mass',
      });

      launchCount = persistent<DecimalSource>(0, { name: 'launchCount' });

      // ── The ladder ──────────────────────────────────────────────────────
      // `costScaling` takes the derived `m` straight from data. It is NOT
      // routed through the tuning registry: the field is a static
      // `DecimalSource` read once at registration, so a knob here would be a
      // dead key. Rationale and the alternative in `./tuning.ts`.
      classes = createProducerCategory<ProbeClassDef>({
        id: 'producer/classes',
        registerTick: ctx.onTick,
        mapProducer: (def) => ({
          resource: mass,
          baseRate: def.baseRate,
          trigger: 'continuous',
          display: def.name,
          purchase: {
            costResource: mass,
            baseCost: tunable(
              registry,
              `classes/${def.id as ProbeClassId}/baseCost`,
              () => def.baseCost,
            ),
            costScaling: COST_RATIO,
            bulkPurchase: true,
          },
        }),
      });
      classes.register(data.classes);

      // ── The hand-launch ─────────────────────────────────────────────────
      // A manual-trigger producer with no purchase config, so `count` is 1 and
      // one activation yields `baseRate × its own chain`. Deliberately a
      // Producer rather than a bespoke click handler: it gets the same rate
      // chain, attribution and introspection every class has, which is what
      // makes the click-vs-ladder crossover measurable on one axis.
      const launchers = createProducerCategory<{ id: string; name: string }>({
        id: 'producer/launcher',
        registerTick: ctx.onTick,
        mapProducer: (def) => ({
          resource: mass,
          baseRate: CLICK_BASE_YIELD,
          trigger: 'manual',
          display: def.name,
        }),
      });
      launchers.register({ id: 'hand-launch', name: 'Hand-launch' });
      launcher = launchers.getProducer('hand-launch')!;

      // ── The `generation` chain ──────────────────────────────────────────
      // Breadth, not depth: (1 + step)^(distinct classes deployed). Discrete
      // in a count, so it splices rather than breaking the product rule —
      // same constraint the revisions chain is under.
      const generationStep = tunable<DecimalSource>(
        registry,
        'balance/generationStep',
        () => GENERATION_STEP,
      );
      const deployedClasses = computed(
        () =>
          data.classes.filter((def) =>
            Decimal.gte(classes.getProducer(def.id)?.ownedCount.value ?? 0, 1),
          ).length,
      );
      const generationFactor = computed(() =>
        Decimal.pow(Decimal.add(1, unref(generationStep)), deployedClasses.value),
      );

      // ── The perturbation stand-in for a static `baseRate` ───────────────
      const classRateScale = tunable<DecimalSource>(registry, 'balance/classRateScale', () => 1);

      for (const def of data.classes) {
        const producer = classes.getProducer(def.id);
        if (!producer) continue;
        producer.rateChain.bind({
          id: `generation/${def.id}`,
          modifier: createMultiplicativeModifier({
            multiplier: () => generationFactor.value,
            description: 'Generation',
          }),
        });
        producer.rateChain.bind({
          id: `tuning/classRateScale/${def.id}`,
          modifier: createMultiplicativeModifier({
            multiplier: classRateScale,
            description: 'Class rate scale',
          }),
        });
      }

      const clickYieldScale = tunable<DecimalSource>(registry, 'balance/clickYieldScale', () => 1);
      launcher.rateChain.bind({
        id: 'tuning/clickYieldScale',
        modifier: createMultiplicativeModifier({
          multiplier: clickYieldScale,
          description: 'Launch yield scale',
        }),
      });

      ctx.provide(MassLifetimeKey, mass.cumulative!);
    },
  };
}
