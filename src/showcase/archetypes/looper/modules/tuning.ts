import {
  createTuningRegistry,
  type EngineModule,
  type InjectionKey,
  type TuningRegistry,
} from '@open-loop/engine';
import type { NoteId } from '../data';

/**
 * The `tunable()` key registry — the one perturbation path. Balance probes
 * perturb these keys through `registry.pushOverrides`; each default closure
 * reads `../data/spine.ts`. `BALANCING.md` § The tunables says what each moves.
 *
 * Key prefixes:
 *   - `nerve/*` — the run budget: the base night, its refills and the ride
 *   - `patrol/step` — Slip the Patrol's share removed per kept patrol level
 *   - `skills/*` — the talent and mastery curves of the parallel track
 *   - `actions/<id>/seconds` — an action's base duration
 *   - `notes/<id>/*` — a note's price, and Grapevine and Steel Nerves effects
 */
export type LooperTunableKey =
  | 'nerve/base'
  | 'nerve/coffee'
  | 'nerve/hamper'
  | 'nerve/ride'
  | 'nerve/rideDeadline'
  | 'patrol/step'
  | 'skills/xpPerLevelSq'
  | 'skills/talentPerLevel'
  | 'skills/masteryPerLevel'
  | 'skills/masteryKnee'
  | `actions/${string}/seconds`
  | `notes/${NoteId}/baseCost`
  | `notes/${NoteId}/costRatio`
  | 'notes/grapevine/speedPerLevel'
  | 'notes/steel-nerves/nervePerLevel';

export const LooperTuningRegistryKey: InjectionKey<TuningRegistry> = Symbol(
  'looper/tuning-registry',
) as InjectionKey<TuningRegistry>;

/** Creates the registry every `tunable()` reader binds into. Runs first. */
export function createTuningModule(): EngineModule {
  return {
    id: 'looper/tuning',
    install(ctx) {
      ctx.provide(LooperTuningRegistryKey, createTuningRegistry('looper-tuning'));
    },
  };
}
