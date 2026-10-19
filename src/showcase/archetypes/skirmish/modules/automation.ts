/**
 * The player's own automation: the shared policy, scoped by automation tier.
 * Each lieutenant is a hire on the player's seat (`Side.crew`), in order, for
 * scrip the army does not get; it unlocks its tier, and leaves when the match
 * does. Each has a switch, read beside the tier where the policy acts.
 */
import {
  createAutomationTiers,
  createThrottle,
  persistent,
  type AutomationTiers,
  type EngineModule,
  type InjectionKey,
  type Persistent,
  type Purchasable,
} from '@open-loop/engine';
import { createModuleApi } from '@/modules/module-api';
import { PLAYER_PERSONA } from '../data/contracts';
import { LIEUTENANTS, type CrewTier, type LieutenantDef } from '../data/crew';
import { playCommand, playEconomy, type PolicyScope } from './policy';
import { MatchKey } from './match';

export type { CrewTier } from '../data/crew';

export interface Lieutenant {
  def: LieutenantDef;
  /** The hire on the player's seat: one-shot, in scrip, open once the lieutenant before is hired. */
  hire: Purchasable;
  enabled: Persistent<boolean>;
}

export interface AutomationApi {
  readonly tiers: AutomationTiers;
  readonly lieutenants: Lieutenant[];
  isUnlocked(tier: CrewTier): boolean;
}

export const AutomationKey: InjectionKey<AutomationApi> = Symbol('skirmish/automation');

const automationApi = createModuleApi(AutomationKey);
/** The automation API the newest live engine published. */
export const getAutomation = automationApi.get;

export const automationModule: EngineModule = {
  id: 'skirmish/automation',
  dependencies: ['skirmish/match'],
  install(ctx) {
    const match = ctx.inject(MatchKey);
    const lieutenants: Lieutenant[] = LIEUTENANTS.map((def) => ({
      def,
      hire: match.p.crew.getPurchasable(def.id)!,
      enabled: persistent(true, { id: `auto-${def.id}` }),
    }));
    const tiers = createAutomationTiers({
      tiers: [
        { id: 'none', displayName: 'Running it yourself', order: 0 },
        ...lieutenants.map((l, i) => ({
          id: l.def.id,
          displayName: l.def.name,
          order: i + 1,
          unlockWhen: () => l.hire.active.value,
        })),
      ],
    });

    // The match reset lets the hires go; the tiers they unlocked and their switches follow.
    match.onReset('afterReset', () => {
      tiers.resetUnlocks();
      for (const l of lieutenants) l.enabled.value = true;
    });

    const think = createThrottle({ interval: 1 });
    ctx.onTick((dt) => {
      if (match.phase.value !== 'live' || !think.ready(dt)) return;
      // isUnlocked, not hasReached: each lieutenant is its own hire.
      const scopes = new Set<PolicyScope>();
      for (const l of lieutenants)
        if (tiers.isUnlocked(l.def.id) && l.enabled.value) scopes.add(l.def.scope);
      if (scopes.size === 0) return;
      const persona = PLAYER_PERSONA;
      if (scopes.has('econ') || scopes.has('build'))
        playEconomy(match.situation('p'), persona, scopes);
      if (scopes.has('command')) {
        // The tactician keeps the map lit: a scout whenever one is ready and affordable.
        if (match.scoutCooldown.value <= 0) match.scout();
        playCommand(match.situation('p'), persona);
      }
    });
    automationApi.publish(ctx, {
      tiers,
      lieutenants,
      isUnlocked: (t) => tiers.isUnlocked(t),
    });
  },
};
