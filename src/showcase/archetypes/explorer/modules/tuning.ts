import {
  createTuningRegistry,
  type EngineModule,
  type InjectionKey,
  type TuningRegistry,
} from '@open-loop/engine';
import type { ProducerId } from '../data';

/**
 * The `tunable()` key registry — the one perturbation path. Balance probes
 * perturb these keys through `registry.pushOverrides`; each default closure
 * reads `../data/spine.ts`. `BALANCING.md` § The tunables says what each moves.
 *
 * Key prefixes:
 *   - `trip/*` — the reference trip's clock and jerky: seconds per step and per hunt, jerky per each
 *   - `water/*` — water drunk per step and per hunt
 *   - `lodge/*` — the producers' rates and prices
 *   - `racks/*` — the smokehouse: throughput, wood burned and price
 *   - `hounds/*` — what each hound adds to the pack, prowess and the walk's jerky
 *   - `herds/<band>/regrowSeconds` — seconds for a depleted herd to regrow one head
 *   - `hunt/*` — Huntcraft's step, the bestiary bonus and the Hart's trail
 */
export type ExplorerTunableKey =
  | 'trip/stepSeconds'
  | 'trip/huntSeconds'
  | 'trip/supplyPerStep'
  | 'trip/supplyPerHunt'
  | 'water/perStep'
  | 'water/perHunt'
  | `lodge/${ProducerId}/rate`
  | `lodge/${ProducerId}/baseCost`
  | 'lodge/costRatio'
  | 'racks/jerkyRate'
  | 'racks/woodPerJerky'
  | 'racks/baseCost'
  | 'racks/costRatio'
  | 'hounds/pack'
  | 'hounds/prowess'
  | 'hounds/supplyPerStep'
  | `herds/${number}/regrowSeconds`
  | 'hunt/skillStep'
  | 'hunt/bestiaryBonus'
  | 'hunt/hartTrailKills';

export const ExplorerTuningRegistryKey: InjectionKey<TuningRegistry> = Symbol(
  'explorer/tuning-registry',
) as InjectionKey<TuningRegistry>;

/** Creates the registry every `tunable()` reader binds into. Runs first. */
export function createTuningModule(): EngineModule {
  return {
    id: 'explorer/tuning',
    install(ctx) {
      ctx.provide(ExplorerTuningRegistryKey, createTuningRegistry('explorer-tuning'));
    },
  };
}
