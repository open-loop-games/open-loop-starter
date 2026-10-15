import {
  createAutomationTiers,
  type AutomationTiers,
  type EngineModule,
  type InjectionKey,
} from '@open-loop/engine';
import { createModuleApi } from '@/modules/module-api';
import { ANCHORS, planWatches } from '../data';
import { CaseKey } from './case';
import { NightKey } from './night';

/**
 * Automation module — the clerks' last job. Once enough nights have replayed,
 * the planning tier opens: at every dawn the clerks fill the watches the
 * player left empty, with known suspects first, by the spine's own
 * `planWatches`. They never search; where to look for the unknown stays the
 * player's call, and so does the risk of breaking the model.
 */

/** Automation tier ids in ladder order. Policies are typed against this union. */
export type PhaseShifterAutomationTier = 'by-hand' | 'planning';

export interface AutomationApi {
  tiers: AutomationTiers;
  /** Fill the plan's empty watches without searching; returns watches added. */
  fillWatches(): number;
}

export const AutomationKey: InjectionKey<AutomationApi> = Symbol(
  'phase-shifter/automation',
) as InjectionKey<AutomationApi>;

const automationApi = createModuleApi(AutomationKey);

/** The automation tiers and the clerks' planning. Read it after the engine starts. */
export const getAutomation = automationApi.get;

const PLANNING: PhaseShifterAutomationTier = 'planning';

export function createAutomationModule(): EngineModule {
  return {
    id: 'phase-shifter/automation',
    install(ctx) {
      const { life, write } = ctx.inject(CaseKey);
      const night = ctx.inject(NightKey);

      const tiers = createAutomationTiers({
        id: 'clerk-automation',
        tiers: [
          { id: 'by-hand', displayName: 'By hand', order: 0 },
          {
            id: PLANNING,
            displayName: 'Clerks plan the watch',
            order: 1,
            unlockWhen: () => night.cycle.count.value >= ANCHORS.planningTierNights,
          },
        ],
      });
      tiers.on('unlocked', (tier) => {
        if (tier === PLANNING) {
          write(
            'Your clerks have learned the model. At dawn they fill the watches you leave empty.',
          );
        }
      });

      function fillWatches(): number {
        const before = night.plan.value.length;
        const kept = planWatches({ ...night.view(false), roster: night.roster.value });
        night.setPlan([...night.plan.value, ...kept]);
        return night.plan.value.length - before;
      }

      const planLive = life.isLive('clerk-plan');
      night.cycle.on('afterEnd', () => {
        if (planLive.value && tiers.hasReached(PLANNING)) fillWatches();
      });

      const api: AutomationApi = { tiers, fillWatches };
      automationApi.publish(ctx, api);
    },
  };
}
