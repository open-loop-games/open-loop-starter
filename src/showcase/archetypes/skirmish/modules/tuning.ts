import { createTuningRegistry, type EngineModule, type InjectionKey } from '@open-loop/engine';
import { createModuleApi } from '@/modules/module-api';
import { createTunables, type Tunables } from './tunables';

export const TunablesKey: InjectionKey<Tunables> = Symbol('skirmish/tunables');

const tunablesApi = createModuleApi(TunablesKey);
/** The tuning API the newest live engine published. */
export const getTunables = tunablesApi.get;

/** Builds the tuning registry in install, so the picker and a balance workbench find it. */
export const tuningModule: EngineModule = {
  id: 'skirmish/tuning',
  install(ctx) {
    tunablesApi.publish(ctx, createTunables(createTuningRegistry('skirmish-tuning')));
  },
};
