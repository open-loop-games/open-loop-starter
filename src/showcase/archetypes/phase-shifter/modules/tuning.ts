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
 *   - `board/*` — Phase II: the notes a card costs, the clerks' pace, the phone, what string earns, the wall
 *   - `night/*` — Phase III: the replay's length, what a sighting files, the roster, insomnia
 */
export type PhaseShifterTunableKey =
  | 'ladders/growth'
  | 'box/pages'
  | 'box/notesPerPage'
  | 'box/clerk/pagesPerS'
  | 'box/clerk/baseCost'
  | 'board/notesPerCard'
  | 'board/clerk/cardsPerS'
  | 'board/tipline/notesPerS'
  | 'board/leadsPerStrength'
  | `board/wall/${0 | 1 | 2}/cost`
  | 'night/seconds'
  | 'night/sightingsPerHour'
  | 'night/accountsPerSighting'
  | 'night/roster/baseCost'
  | 'night/roster/ratio'
  | 'night/insomnia/cost'
  | 'night/insomnia/speed';

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
