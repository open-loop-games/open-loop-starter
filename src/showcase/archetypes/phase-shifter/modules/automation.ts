import {
  Decimal,
  createAutomationTiers,
  tunable,
  type AutomationTiers,
  type EngineModule,
  type InjectionKey,
} from '@open-loop/engine';
import { ANCHORS, shouldFileWitness } from '../data';
import { CaseKey } from './case';
import { NightKey } from './night';
import { PhaseShifterTuningRegistryKey } from './tuning';

/**
 * Automation module — the clerks' last job. Once three nights have replayed,
 * the filing tier opens and the clerks file witness accounts at every dawn by
 * the spine's own policy, `shouldFileWitness`. Before it opens the player
 * files by hand; the policy is the same either way, so the prediction holds.
 */

/** Automation tier ids in ladder order. Policies are typed against this union. */
export type PhaseShifterAutomationTier = 'by-hand' | 'filing';

export interface AutomationApi {
  tiers: AutomationTiers;
  /** One dawn of the filing policy; returns accounts filed. Runs by hand or from the tier. */
  fileAtDawn(): number;
}

export const AutomationKey: InjectionKey<AutomationApi> = Symbol(
  'phase-shifter/automation',
) as InjectionKey<AutomationApi>;

let api: AutomationApi;

export function getAutomation(): AutomationApi {
  return api;
}

const FILING: PhaseShifterAutomationTier = 'filing';

export function createAutomationModule(): EngineModule {
  return {
    id: 'phase-shifter/automation',
    install(ctx) {
      const registry = ctx.inject(PhaseShifterTuningRegistryKey);
      const { life, write } = ctx.inject(CaseKey);
      const night = ctx.inject(NightKey);
      const witnessShare = tunable(
        registry,
        'night/clerks/witnessShare',
        () => ANCHORS.witnessShare,
      );

      const tiers = createAutomationTiers({
        id: 'clerk-automation',
        tiers: [
          { id: 'by-hand', displayName: 'By hand', order: 0 },
          {
            id: FILING,
            displayName: 'Clerks file accounts',
            order: 1,
            unlockWhen: () => night.cycle.count.value >= ANCHORS.filingTierNights,
          },
        ],
      });
      tiers.on('unlocked', (tier) => {
        if (tier === FILING) {
          write('Your clerks have learned the model. They start filing witness accounts at dawn.');
        }
      });

      function fileAtDawn(): number {
        let filed = 0;
        const p = night.witness.repeatable!;
        while (
          p.canPurchase.value &&
          shouldFileWitness(
            new Decimal(p.getCost(1)).toNumber(),
            new Decimal(night.contradictions.value).toNumber(),
            witnessShare.value,
          )
        ) {
          p.purchase(1);
          filed++;
        }
        return filed;
      }

      const fileLive = life.isLive('clerk-file');
      night.cycle.on('afterEnd', () => {
        if (fileLive.value && tiers.hasReached(FILING)) fileAtDawn();
      });

      api = { tiers, fileAtDawn };
      ctx.provide(AutomationKey, api);
    },
  };
}
