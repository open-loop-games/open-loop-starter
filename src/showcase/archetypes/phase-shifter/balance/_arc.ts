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
import { createReferencePlayer } from './_player';

/** Wall-seconds per interval the runner feeds the driver. */
export const WALL_STEP = 0.5;
export const MAX_WALL = 3600;
export const STALL_WALL = 600;

export const num = (x: { value: DecimalSource }) => new Decimal(x.value).toNumber();

export interface ArcBeat {
  wall: number;
  sim: number;
}

/** The live arc handed to `onStep`, after that step's beats are recorded. */
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

  const player = createReferencePlayer(WALL_STEP);
  let terminated = 'maxWall';
  while (wall < MAX_WALL) {
    const { opened, readLast } = player.step();
    for (const door of opened) beat(`door: ${door}`, true);
    if (readLast) beat('last page', true);

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

    const speed = engine.tickDriver.speedMultiplier;
    engine.tickDriver.processInterval(WALL_STEP);
    wall += WALL_STEP;
    sim += WALL_STEP * speed;
  }

  return { engine, beats, wall, sim, terminated, broken };
}
