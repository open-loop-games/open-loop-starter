/**
 * The player's own automation: the shared policy, scoped by automation tier.
 * Each contract won hires one more lieutenant. Each lieutenant has a switch,
 * read beside the tier where the policy acts.
 */
import {
  createAutomationTiers,
  createThrottle,
  persistent,
  type AutomationTiers,
  type EngineModule,
  type InjectionKey,
  type Persistent,
} from '@open-loop/engine';
import { createModuleApi } from '@/modules/module-api';
import { PLAYER_PERSONA } from '../data/contracts';
import { playCommand, playEconomy, type PolicyScope } from './policy';
import { CareerKey } from './career';
import { MatchKey } from './match';

export type CrewTier = 'none' | 'fixer' | 'quartermaster' | 'tactician';

/** Which policy scope each lieutenant runs. */
export const TIER_SCOPE: Record<Exclude<CrewTier, 'none'>, PolicyScope> = {
  fixer: 'econ',
  quartermaster: 'build',
  tactician: 'command',
};

export interface Lieutenant {
  tier: Exclude<CrewTier, 'none'>;
  name: string;
  does: string;
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
  dependencies: ['skirmish/match', 'skirmish/career'],
  install(ctx) {
    const match = ctx.inject(MatchKey);
    const career = ctx.inject(CareerKey);
    const tiers = createAutomationTiers({
      tiers: [
        { id: 'none', displayName: 'Running it yourself', order: 0 },
        { id: 'fixer', displayName: 'Fixer', order: 1, unlockWhen: () => career.wins.value >= 1 },
        {
          id: 'quartermaster',
          displayName: 'Quartermaster',
          order: 2,
          unlockWhen: () => career.wins.value >= 2,
        },
        {
          id: 'tactician',
          displayName: 'Tactician',
          order: 3,
          unlockWhen: () => career.wins.value >= 3,
        },
      ],
    });
    const lieutenants: Lieutenant[] = [
      {
        tier: 'fixer',
        name: 'Moth, your fixer',
        does: 'hires hustlers, sinks ley taps, rents squats; never spends what your next training floor costs',
        enabled: persistent(true, { id: 'auto-fixer' }),
      },
      {
        tier: 'quartermaster',
        name: 'Old Brass, quartermaster',
        does: 'builds training floors, buys research, runs the training switches',
        enabled: persistent(true, { id: 'auto-quartermaster' }),
      },
      {
        tier: 'tactician',
        name: 'Saint Ivo, tactician',
        does: 'deploys, focuses fire, pulls back and calls assaults',
        enabled: persistent(true, { id: 'auto-tactician' }),
      },
    ];
    const think = createThrottle({ interval: 1 });
    ctx.onTick((dt) => {
      if (match.phase.value !== 'live' || !think.ready(dt)) return;
      // isUnlocked, not hasReached: each lieutenant is its own hire.
      const scopes = new Set<PolicyScope>();
      for (const l of lieutenants)
        if (tiers.isUnlocked(l.tier) && l.enabled.value) scopes.add(TIER_SCOPE[l.tier]);
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
