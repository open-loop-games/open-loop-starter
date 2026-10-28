/**
 * The manifest's beat recording: the arc probe's first attempt at the first contract, under
 * the reference player (`_game.ts`), read for each beat's fire time. `pnpm beats skirmish`
 * plays it beside the recorded windows.
 *
 * The game has no RNG, so one run is the measurement. The probe's match loop is inline, so
 * this plays the match itself; each beat's condition is the probe's `beat(...)` call for it,
 * and a change to one is a change to both.
 */
import { toNumber } from '@open-loop/engine';
import { runUntil } from '@open-loop/engine/harness';
import { DISTRICTS } from '../data/contracts';
import { UNIT_KINDS } from '../data/units';
import { PRESENCE, countsOf, total } from '../modules/battle';
import { readyUnits } from '../modules/orders';
import type { Side } from '../modules/side';
import { MAX_MATCH_S, TICK, buildGame, staffMatch } from './_game';

/** The runs one recording spans: one deterministic run, the first contract's first attempt. */
export const runs = [{ contract: 0 }];

function armySize(s: Side): number {
  let n = 0;
  for (const k of UNIT_KINDS) {
    n += toNumber(s.reserve[k].value);
    for (const sq of s.squads) n += toNumber(sq[k].value);
  }
  return n;
}

/** Plays one run; each manifest beat's fire time in sim-seconds, by beat number. */
export function record(run: (typeof runs)[number]): Record<number, number | null> {
  const game = buildGame();
  const { match, roster } = game;
  roster.choose(run.contract);
  match.start();
  const { p, e } = match;
  const fired: Record<number, number> = {};
  const fire = (n: number, cond: boolean) => {
    if (cond && !(n in fired)) fired[n] = match.clock.value;
  };
  const taken = DISTRICTS.findIndex((d) => d.name === 'Neon Narrows');
  const result = runUntil({
    engine: game.engine,
    tickDelta: TICK,
    maxSimTime: MAX_MATCH_S,
    until: () => {
      fire(1, staffMatch(game) !== undefined);
      fire(2, p.floorCount() > 0);
      fire(3, UNIT_KINDS.some((k) => readyUnits(p, k) > 0) || armySize(p) >= 1);
      fire(4, match.control[taken].value >= 1);
      fire(
        5,
        DISTRICTS.some(
          (_, i) =>
            total(countsOf(p.squads[i])) > PRESENCE && total(countsOf(e.squads[i])) > PRESENCE,
        ),
      );
      fire(6, toNumber(e.hq.value) < match.tune.hqIntegrity.value);
      return match.phase.value === 'won' || match.phase.value === 'lost';
    },
  });
  if (result.terminated === 'predicate') fire(7, match.phase.value === 'won');
  game.dispose();
  return Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((n) => [n, fired[n] ?? null]));
}
