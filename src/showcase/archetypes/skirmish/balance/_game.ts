/**
 * Shared probe fixture, not runnable on its own. Builds a real skirmish engine whose player
 * seat is the reference player: the shipping policy (`../modules/policy.ts`) under
 * `PLAYER_PERSONA`, run by lieutenants it hires at their price as soon as each is
 * affordable, as the rival hires its own. Hiring is the one manual opener it works.
 *
 * This is not a duplicate of `../sim/harness.ts`: that boots the module list for
 * tick-by-tick behavioral specs; this plays whole matches and reads magnitudes.
 */

import type { Engine } from '@open-loop/engine';
import { bootTestEngine } from '@/test/bootTestEngine';
import { sharedBase } from '@/modules';
import {
  AutomationKey,
  MatchKey,
  RosterKey,
  createSkirmishModules,
  type AutomationApi,
  type MatchApi,
  type RosterApi,
} from '../modules';
import { hireNext } from '../modules/policy';

/** Sim seconds per probe step. Minute-scale matches need no finer clock. */
export const TICK = 0.5;
/** A match still live after this long is a stall. */
export const MAX_MATCH_S = 1800;

export interface Game {
  engine: Engine;
  match: MatchApi;
  roster: RosterApi;
  automation: AutomationApi;
  dispose(): void;
}

/** A fresh engine at the briefing of the first contract. */
export function buildGame(): Game {
  const handle = bootTestEngine({
    modules: [...sharedBase, ...createSkirmishModules()],
    persistenceNamespacePrefix: 'skirmish-probe',
  });
  const { engine } = handle;
  return {
    engine,
    match: engine.tryInject(MatchKey)!,
    roster: engine.tryInject(RosterKey)!,
    automation: engine.tryInject(AutomationKey)!,
    dispose: handle.dispose,
  };
}

/**
 * The reference player's one manual opener: hire the next lieutenant as soon as its price is
 * in the purse, by the rival's own rule (`hireNext`). Call each tick of a live match; returns
 * the hire just made.
 */
export function staffMatch(game: Pick<Game, 'match'>): string | undefined {
  return hireNext(game.match.p)?.id;
}
