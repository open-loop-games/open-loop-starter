/**
 * Diagnostic — per-round trajectories for the failing beat-5 and beat-7 tests.
 * Run with `SIM_PROBES=1` to capture; not part of the regular suite.
 */
import { describe, it } from 'vitest';
import { runUntil } from 'open-loop-engine/harness';
import {
  buildDirectorEngine,
  metaLevel,
  minutes,
  setupAutoMetaGreedy,
  setupAutoMetaSingle,
  setupAutoPlayerGoals,
  simProbesEnabled,
  territoryShare,
} from './helpers';

describe.skipIf(!simProbesEnabled())('diagnostic', () => {
  it('beat 5 trajectory — round-by-round player share, meta-stack', { timeout: 180_000 }, () => {
    const { engine, state } = buildDirectorEngine();
    setupAutoPlayerGoals(state, engine);
    setupAutoMetaGreedy(state, engine);

    let lastSeed = state.round.seed.value;
    const log: string[] = ['round | sim-min | player-share | meta(y/s/a/d/sc) | meta-currency'];

    runUntil({
      engine,
      until: ({ simTime }) => {
        if (state.round.phase.value === 'ended' && state.round.seed.value === lastSeed) {
          const share = territoryShare(state)[state.vars.archetype.playerFaction];
          const meta = `${metaLevel(state, 'yield')}/${metaLevel(state, 'spread')}/${metaLevel(state, 'attack')}/${metaLevel(state, 'defense')}/${metaLevel(state, 'slot-capacity')}`;
          const cur = Number(state.round.metaCurrency.value).toFixed(0);
          log.push(
            `${state.round.seed.value.toString().padStart(5)} | ${(simTime / 60).toFixed(1).padStart(7)} | ${share.toFixed(3).padStart(12)} | ${meta.padStart(11)} | ${cur}`,
          );
          lastSeed = state.round.seed.value + 1;
        }
        return false;
      },
      maxSimTime: minutes(80),
      seed: 42,
    });

    console.log('\n--- beat 5 trajectory ---');
    for (const line of log) console.log(line);
  });

  it('beat 7 trajectory — slot-capacity-only saver', { timeout: 180_000 }, () => {
    const { engine, state } = buildDirectorEngine();
    setupAutoPlayerGoals(state, engine);
    setupAutoMetaSingle(state, engine, 'slot-capacity');

    let lastSeed = state.round.seed.value;
    const log: string[] = ['round | sim-min | player-share | slot-cap | meta-currency'];

    runUntil({
      engine,
      until: ({ simTime }) => {
        if (state.round.phase.value === 'ended' && state.round.seed.value === lastSeed) {
          const share = territoryShare(state)[state.vars.archetype.playerFaction];
          const cap = metaLevel(state, 'slot-capacity');
          const cur = Number(state.round.metaCurrency.value).toFixed(0);
          log.push(
            `${state.round.seed.value.toString().padStart(5)} | ${(simTime / 60).toFixed(1).padStart(7)} | ${share.toFixed(3).padStart(12)} | ${cap.toString().padStart(8)} | ${cur}`,
          );
          lastSeed = state.round.seed.value + 1;
        }
        return false;
      },
      maxSimTime: minutes(150),
      seed: 42,
    });

    console.log('\n--- beat 7 trajectory ---');
    for (const line of log) console.log(line);
  });
});
