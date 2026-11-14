/**
 * Shared probe fixture, not runnable on its own. Builds a real skirmish engine whose player
 * seat is the reference player: the shipping policy (`../modules/policy.ts`) under
 * `PLAYER_PERSONA`, run by lieutenants it hires at their price as soon as each is
 * affordable, as the rival hires its own. Hiring is the one manual opener it works.
 *
 * This is not a duplicate of `../sim/harness.ts`: that boots the module list for
 * tick-by-tick behavioral specs; this plays whole matches and reads magnitudes.
 */

import { createThrottle, type Engine } from '@open-loop/engine';
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
 * One turn of the reference player's one manual opener: hire the next lieutenant whose price
 * is in the purse, by the rival's own rule (`hireNext`).
 *
 * @param game - the match whose player seat it staffs
 * @returns the lieutenant this turn hired, or `undefined`
 */
export function playerTurn(game: Pick<Game, 'match'>): string | undefined {
  return hireNext(game.match.p)?.id;
}

/** Game seconds between the reference player's turns. */
export const PLAYER_EVERY = 0.5;

/**
 * Seats the reference player on the engine's tick driver: it takes a `playerTurn` every
 * `PLAYER_EVERY` game seconds. The cadence holds while no tick is longer than
 * `PLAYER_EVERY`, whatever `tickDelta` the runner steps by, and a runner's `until` stays a
 * read.
 *
 * The seat registers after every module, so a turn at the end of one tick sits where a turn
 * before the next tick would. A run takes its opening turn with `playerTurn` before it
 * starts, because no tick precedes the match's first second.
 *
 * @param game - the engine and the match whose player seat it staffs
 * @param onTurn - receives the lieutenant each turn hired, or `undefined`, for a probe to record
 * @returns the function that unseats the player; call it when the run ends.
 */
export function seatPlayer(
  game: Pick<Game, 'engine' | 'match'>,
  onTurn?: (hired: string | undefined) => void,
): () => void {
  const turn = createThrottle({ interval: PLAYER_EVERY });
  return game.engine.tickDriver.onTick((dt) => {
    if (!turn.ready(dt)) return;
    const hired = playerTurn(game);
    onTurn?.(hired);
  });
}
