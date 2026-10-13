import {
  createTuningRegistry,
  type EngineModule,
  type InjectionKey,
  type TuningRegistry,
} from '@open-loop/engine';

/**
 * The `tunable()` key registry — the one perturbation path. Balance probes
 * perturb these keys through `registry.pushOverrides`; each default closure
 * reads `../data/spine.ts`. `BALANCING.md` § The tunables says what each moves.
 *
 * Key prefixes:
 *   - `ladders/growth` — the cost ratio every repeatable ladder shares
 *   - `box/*` — Phase I: the box's size, the clerks' pace and price
 *   - `board/*` — Phase II: the note supply, the clerks' cross-referencing, the second shift
 *   - `night/*` — Phase III: the replay's length and yield, witnesses, eliminations, insomnia
 */
export type PhaseShifterTunableKey =
  | 'ladders/growth'
  | 'box/pages'
  | 'box/notesPerPage'
  | 'box/clerk/pagesPerS'
  | 'box/clerk/baseCost'
  | 'board/notesPerLead'
  | 'board/clerk/notesPerS'
  | 'board/tipline/notesPerS'
  | 'board/canvasser/notesPerS'
  | 'board/canvasser/baseCost'
  | 'board/secondShift/cost'
  | 'night/seconds'
  | 'night/baseRate'
  | 'night/witness/baseCost'
  | 'night/eliminate/baseCost'
  | 'night/eliminate/ratio'
  | 'night/insomnia/cost'
  | 'night/insomnia/speed'
  | 'night/clerks/witnessShare';

export const PhaseShifterTuningRegistryKey: InjectionKey<TuningRegistry> = Symbol(
  'phase-shifter/tuning-registry',
) as InjectionKey<TuningRegistry>;

/** Creates the registry every `tunable()` reader binds into. Runs first. */
export function createTuningModule(): EngineModule {
  return {
    id: 'phase-shifter/tuning',
    install(ctx) {
      ctx.provide(PhaseShifterTuningRegistryKey, createTuningRegistry('phase-shifter-tuning'));
    },
  };
}
