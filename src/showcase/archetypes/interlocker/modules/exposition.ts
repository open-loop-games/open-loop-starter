import {
  addResource,
  computed,
  createCycle,
  toNumber,
  tunable,
  type ComputedRef,
  type Cycle,
  type EngineModule,
  type InjectionKey,
} from '@open-loop/engine';
import { CHARTER_EFFECTS, EXPO_THRESHOLD, PATENT_POOL, RAW, renownFor } from '../data';
import { EmpireKey } from './empire';
import { TelegraphKey } from './telegraph';
import { InterlockerTuningRegistryKey } from './tuning';
import { WORKS_CONTEXT, WorksKey } from './works';

/**
 * Exposition module — the prestige. Staging an Exposition turns the aeroplanes in the
 * hangar into renown and clears the works; the Patent Pool keeps the founding patents,
 * and Crédit Mobilier's stake opens the next run.
 * A run is the engine's Cycle: its count is the Expositions staged, and its clock is
 * how long these works have stood.
 */

export interface ExpositionApi {
  cycle: Cycle;
  /** aeroplanes in the hangar an Exposition needs */
  threshold: ComputedRef<number>;
  /** renown staging now would earn */
  gain: ComputedRef<number>;
  canStage: ComputedRef<boolean>;
  /** stage the Exposition; returns the renown earned, 0 when the hangar is short */
  stage(): number;
}

export const ExpositionKey: InjectionKey<ExpositionApi> = Symbol(
  'interlocker/exposition',
) as InjectionKey<ExpositionApi>;

let api: ExpositionApi;

export function getExposition(): ExpositionApi {
  return api;
}

export function createExpositionModule(): EngineModule {
  return {
    id: 'interlocker/exposition',
    dependencies: ['interlocker/empire', WORKS_CONTEXT],
    install(ctx) {
      const registry = ctx.inject(InterlockerTuningRegistryKey);
      const empire = ctx.inject(EmpireKey);
      const works = ctx.inject(WorksKey);
      const telegraph = ctx.inject(TelegraphKey);

      const threshold = tunable(registry, 'expo/threshold', () => EXPO_THRESHOLD);
      const planes = computed(() => toNumber(works.res.aeroplanes.value));
      const gain = computed(() => renownFor(planes.value, threshold.value));
      const canStage = computed(() => gain.value > 0);

      let earned = 0;
      const cycle = createCycle({
        resetPersistentContexts: [WORKS_CONTEXT],
        // The Patent Pool: the founding patents survive when the charter is held.
        retain: new Map(
          PATENT_POOL.map((id) => [
            works.research.getPurchasable(id)!.count,
            (v: unknown) => (empire.holds('patents').value ? v : 0),
          ]),
        ),
        registerTick: ctx.onTick,
        onBeforeEnd: () => {
          if (!canStage.value) return false;
          earned = gain.value;
        },
      });
      // The renown is paid once the reset has returned, so it reaches `cumulative`.
      // Crédit Mobilier's stake opens every run. A charter is petitioned once a run has
      // already opened, so the petition pays the stake into that run too.
      const advance = () => {
        for (const r of RAW) addResource(works.res[r], CHARTER_EFFECTS.stake);
      };
      empire.charters.getPurchasable('credit')!.on('purchased', advance);
      cycle.on('afterEnd', () => {
        if (empire.holds('credit').value) advance();
        addResource(empire.renown, earned);
        telegraph.send(`Exposition Universelle — ${earned} renown`, 'expo');
      });
      cycle.resume();

      api = {
        cycle,
        threshold,
        gain,
        canStage,
        stage: () => (cycle.end() ? earned : 0),
      };
      ctx.provide(ExpositionKey, api);
    },
  };
}
