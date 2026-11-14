/**
 * The arc runner: plays the shipping game from a cold start to the closed case under the
 * spine's reference player (`_player.ts`) and records the sim-second each beat first held.
 * The arc probe and the beat recording both play through it.
 */
import { Decimal, type DecimalSource, type Engine } from '@open-loop/engine';
import { bootTestEngine } from '@/test/bootTestEngine';
import { sharedBase } from '@/modules';
import { RECONSTRUCT_LEADS, SUSPECTS } from '../data';
import {
  createPhaseShifterModules,
  getAutomation,
  getBoard,
  getBox,
  getCase,
  getNight,
} from '../modules';
import { createReferencePlayer, seatPlayer, type PlayerStep } from './_player';

/** Wall-seconds per interval the runner feeds the driver. */
export const WALL_STEP = 0.5;
export const MAX_WALL = 3600;
export const STALL_WALL = 600;

export const num = (x: { value: DecimalSource }) => new Decimal(x.value).toNumber();

export interface ArcBeat {
  wall: number;
  sim: number;
}

/** The live arc handed to `onStep` at each read, after the read's beats are recorded. */
export interface ArcState {
  engine: Engine;
  beats: Record<string, ArcBeat>;
}

export function runArc(onStep?: (state: ArcState) => void) {
  const engine: Engine = bootTestEngine({
    modules: [...sharedBase, ...createPhaseShifterModules()],
    persistenceNamespacePrefix: 'phase-shifter-arc',
  }).engine;
  const kase = getCase();
  const box = getBox();
  const board = getBoard();
  const night = getNight();
  const automation = getAutomation();

  const beats: Record<string, ArcBeat> = {};
  let wall = 0;
  let sim = 0;
  let lastBeatWall = 0;
  let broken = 0;
  night.cycle.on('beforeEnd', () => {
    if (night.broken.value) broken++;
  });

  function beat(name: string, cond: boolean): void {
    if (cond && !beats[name]) {
      beats[name] = { wall, sim };
      lastBeatWall = wall;
    }
  }

  // A step's doors and last page wait for the next read, and take its stamp, as a read of the
  // state that step left. The opening step comes before the first tick, as the seat's first
  // step is inside it.
  const player = createReferencePlayer(WALL_STEP);
  const steps: PlayerStep[] = [player.step()];
  const unseat = seatPlayer(engine, player, (step) => steps.push(step));
  let terminated = 'maxWall';
  // A hand loop on purpose: insomnia is game speed, which only `processInterval` applies.
  // `runUntil` advances by `advanceTime`, which ignores `speedMultiplier`, so the arc past
  // insomnia would run at 1×. `replayLive` applies it, but sets `speedMultiplier` itself and
  // restores it on exit, over the game's own write; and it has no predicate to stop on.
  try {
    while (wall < MAX_WALL) {
      for (const { opened, readLast } of steps.splice(0)) {
        for (const door of opened) beat(`door: ${door}`, true);
        if (readLast) beat('last page', true);
      }
      beat('first clerk', num(box.clerk.count) >= 1);
      beat('box empty', num(box.pages) <= 0);
      beat('board 4×4', board.side.value >= 4);
      beat('board 5×5', board.side.value >= 5);
      beat('reconstruct threshold', num(board.leads.cumulative!) >= RECONSTRUCT_LEADS);
      beat('night 1 filed', night.cycle.count.value >= 1);
      beat('clerks plan (tier)', automation.tiers.hasReached('planning'));
      beat('insomnia', night.insomnia.active.value);
      for (let i = 1; i <= SUSPECTS.length; i++) beat(`alibi ${i}`, night.held.value.length >= i);

      onStep?.({ engine, beats });

      if (kase.closed.value) {
        terminated = 'closed';
        break;
      }
      if (wall - lastBeatWall > STALL_WALL) {
        terminated = `stall: no beat for ${STALL_WALL}s`;
        break;
      }

      // Read before the interval: the player can buy insomnia inside it, and the interval
      // already runs at the speed it began with.
      const speed = engine.tickDriver.speedMultiplier;
      engine.tickDriver.processInterval(WALL_STEP);
      wall += WALL_STEP;
      sim += WALL_STEP * speed;
    }
  } finally {
    unseat();
  }

  return { engine, beats, wall, sim, terminated, broken };
}
