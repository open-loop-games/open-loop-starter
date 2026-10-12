import {
  createAutomationTiers,
  persistent,
  type AutomationTiers,
  type EngineModule,
  type InjectionKey,
  type Persistent,
} from '@open-loop/engine';
import { MetaKey } from './meta';
import { NightKey } from './night';

/**
 * Automation module — the player-facing ladder. Routine begins the next night
 * once the summary has been seen; Discipline turns in when the plan is spent.
 * Each policy is a pure function over game state, inert until its automation
 * tier is reached and the player's toggle is on. The arc probe drives this same
 * module, so the policy it measures is the policy the game ships.
 */

/** Automation tier ids in ladder order. Policies are typed against this union. */
export type LooperAutomationTier = 'manual' | 'routine' | 'discipline';

// === POLICIES ===

export interface RoutineState {
  /** the Routine tier is reached and the player left its toggle on */
  enabled: boolean;
  nightActive: boolean;
  /** game-seconds since the last night ended */
  sinceNightEnded: number;
}

/** Seconds the night summary holds the screen before Routine starts the next night. */
export const ROUTINE_DWELL = 3;

/** Routine: begin the next night once the last one's summary has been seen. */
export function shouldBeginNight(s: RoutineState): boolean {
  return s.enabled && !s.nightActive && s.sinceNightEnded >= ROUTINE_DWELL;
}

export interface DisciplineState {
  /** the Discipline tier is reached and the player left its toggle on */
  enabled: boolean;
  nightActive: boolean;
  /** nothing running, nothing held, cursor past the last planned action */
  planExhausted: boolean;
}

/** Discipline: turn in as soon as the plan is spent instead of standing in the dark. */
export function shouldTurnIn(s: DisciplineState): boolean {
  return s.enabled && s.nightActive && s.planExhausted;
}

// === MODULE ===

export interface AutomationApi {
  tiers: AutomationTiers;
  /** player toggle under Routine */
  autoBegin: Persistent<boolean>;
  /** player toggle under Discipline */
  autoTurnIn: Persistent<boolean>;
  hasReached(tier: LooperAutomationTier): boolean;
}

export const AutomationKey: InjectionKey<AutomationApi> = Symbol(
  'looper/automation',
) as InjectionKey<AutomationApi>;

let api: AutomationApi;

export function getAutomation(): AutomationApi {
  return api;
}

export function createAutomationModule(): EngineModule {
  return {
    id: 'looper/automation',
    dependencies: ['looper/meta', 'looper/night'],
    install(ctx) {
      const meta = ctx.inject(MetaKey);
      const night = ctx.inject(NightKey);

      const tiers = createAutomationTiers({
        id: 'looper-automation',
        tiers: [
          { id: 'manual', displayName: 'By hand', order: 0 },
          {
            id: 'routine',
            displayName: 'Routine',
            order: 1,
            unlockWhen: () => meta.owned('routine') > 0,
          },
          {
            id: 'discipline',
            displayName: 'Discipline',
            order: 2,
            unlockWhen: () => meta.owned('discipline') > 0,
          },
        ],
      });
      const autoBegin = persistent(true, { id: 'autoBegin' });
      const autoTurnIn = persistent(true, { id: 'autoTurnIn' });
      const hasReached = (tier: LooperAutomationTier) => tiers.hasReached(tier);

      ctx.onTick((dt) => {
        if (!night.nightActive.value) night.sinceNightEnded.value += dt;
        if (
          shouldTurnIn({
            enabled: hasReached('discipline') && autoTurnIn.value,
            nightActive: night.nightActive.value,
            planExhausted: night.planExhausted.value,
          })
        ) {
          // Flag only: the cycle's own tick ends the night, outside this handler.
          night.nightOver.value = 'turned-in';
        } else if (
          shouldBeginNight({
            enabled: hasReached('routine') && autoBegin.value,
            nightActive: night.nightActive.value,
            sinceNightEnded: night.sinceNightEnded.value,
          })
        ) {
          night.beginNight();
        }
      });

      api = { tiers, autoBegin, autoTurnIn, hasReached };
      ctx.provide(AutomationKey, api);
    },
  };
}
