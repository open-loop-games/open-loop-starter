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
import { createModuleApi } from '@/modules/module-api';
import {
  CHARTER_EFFECTS,
  EXHIBITED,
  EXPO_THRESHOLD,
  GRAND_PRIX,
  JURY_SITTING,
  PATENT_POOL,
  RAW,
  exhibitScore,
  renownFor,
  type Cost,
} from '../data';
import { EmpireKey } from './empire';
import { MINISTRY_CONTEXT, MinistryKey } from './ministry';
import { TelegraphKey } from './telegraph';
import { InterlockerTuningRegistryKey } from './tuning';
import { WORKS_CONTEXT, WorksKey } from './works';

/**
 * Exposition module — the prestige. The jury scores the worked goods held and the
 * Ministry's dossier, and staging an Exposition turns the score into renown, a concave
 * medal, and clears the works. The hangar must hold the threshold's aeroplanes, and the
 * jury sits no sooner than JURY_SITTING after the last Exposition. The Patent Pool keeps
 * the founding patents, and Crédit Mobilier's stake opens the next run. Staging the Grand
 * Prix's medal wins the 1867 Exposition, and play goes on.
 * A run is the engine's Cycle: its count is the Expositions staged, and its clock is
 * how long these works have stood.
 */

export interface ExpositionApi {
  cycle: Cycle;
  /** aeroplanes in the hangar an Exposition needs */
  threshold: ComputedRef<number>;
  /** the jury's score now: the exhibit and the dossier */
  score: ComputedRef<number>;
  /** renown staging now would earn */
  gain: ComputedRef<number>;
  /** seconds until the jury sits again */
  juryIn: ComputedRef<number>;
  canStage: ComputedRef<boolean>;
  /** stage the Exposition; returns the renown earned, 0 when the hangar is short */
  stage(): number;
}

export const ExpositionKey: InjectionKey<ExpositionApi> = Symbol(
  'interlocker/exposition',
) as InjectionKey<ExpositionApi>;

const expositionApi = createModuleApi(ExpositionKey);

/** The prestige: the jury, the medal and the staging. Read it after the engine starts. */
export const getExposition = expositionApi.get;

export function createExpositionModule(): EngineModule {
  return {
    id: 'interlocker/exposition',
    dependencies: ['interlocker/empire', WORKS_CONTEXT, MINISTRY_CONTEXT],
    install(ctx) {
      const registry = ctx.inject(InterlockerTuningRegistryKey);
      const empire = ctx.inject(EmpireKey);
      const works = ctx.inject(WorksKey);
      const ministry = ctx.inject(MinistryKey);
      const telegraph = ctx.inject(TelegraphKey);

      const threshold = tunable(registry, 'expo/threshold', () => EXPO_THRESHOLD);
      const sitting = tunable(registry, 'expo/jurySitting', () => JURY_SITTING);
      const planes = computed(() => toNumber(works.res.aeroplanes.value));
      const score = computed(
        () =>
          exhibitScore(
            Object.fromEntries(EXHIBITED.map((r) => [r, toNumber(works.res[r].value)])) as Cost,
          ) + ministry.dossier.value,
      );
      const gain = computed(() => (planes.value >= threshold.value ? renownFor(score.value) : 0));

      let earned = 0;
      const cycle: Cycle = createCycle({
        resetPersistentContexts: [WORKS_CONTEXT, MINISTRY_CONTEXT],
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
      const juryIn = computed(() => Math.max(0, sitting.value - cycle.elapsed.value));
      const canStage = computed(() => gain.value > 0 && juryIn.value <= 0);
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
        if (earned >= GRAND_PRIX && !empire.grandPrix.value) {
          empire.grandPrix.value = true;
          telegraph.send('Paris — the Grand Prix to the Imperial Aeroworks', 'expo');
        }
      });
      cycle.resume();

      const api: ExpositionApi = {
        cycle,
        threshold,
        score,
        gain,
        juryIn,
        canStage,
        stage: () => (cycle.end() ? earned : 0),
      };
      expositionApi.publish(ctx, api);
    },
  };
}
