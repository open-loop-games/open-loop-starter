/**
 * The rival seat: the contract's persona plays the shared policy once a
 * second. An AI opponent is not automation the player unlocks, so no
 * automation tier blocks it.
 */
import { createThrottle, type EngineModule } from '@open-loop/engine';
import { playCommand, playEconomy, type PolicyScope } from './policy';
import { MatchKey } from './match';

const ALL: ReadonlySet<PolicyScope> = new Set(['econ', 'build', 'command']);

export const rivalModule: EngineModule = {
  id: 'skirmish/rival',
  dependencies: ['skirmish/match'],
  install(ctx) {
    const match = ctx.inject(MatchKey);
    const think = createThrottle({ interval: 1 });
    ctx.onTick((dt) => {
      if (match.phase.value !== 'live' || !think.ready(dt)) return;
      const persona = match.contract.value.persona;
      playEconomy(match.situation('e'), persona, ALL);
      playCommand(match.situation('e'), persona);
    });
  },
};
