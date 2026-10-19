/**
 * The rival seat: the contract's persona plays the shared policy once a second,
 * through lieutenants it hires as the player does, at the same prices. An AI
 * opponent is not automation the player unlocks, so no automation tier blocks it;
 * its hires are what it plays.
 */
import { createThrottle, type EngineModule } from '@open-loop/engine';
import { hireNext, hiredScopes, playCommand, playEconomy } from './policy';
import { MatchKey } from './match';

export const rivalModule: EngineModule = {
  id: 'skirmish/rival',
  dependencies: ['skirmish/match'],
  install(ctx) {
    const match = ctx.inject(MatchKey);
    const think = createThrottle({ interval: 1 });
    ctx.onTick((dt) => {
      if (match.phase.value !== 'live' || !think.ready(dt)) return;
      const persona = match.contract.value.persona;
      hireNext(match.e);
      const scopes = hiredScopes(match.e);
      if (scopes.has('econ') || scopes.has('build'))
        playEconomy(match.situation('e'), persona, scopes);
      if (scopes.has('command')) playCommand(match.situation('e'), persona);
    });
  },
};
