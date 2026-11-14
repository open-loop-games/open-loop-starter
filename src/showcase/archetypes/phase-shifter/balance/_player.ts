/**
 * The spine's reference player, one wall step at a time, through the game's
 * own verbs. The arc probe times its beats; the games site's beat script
 * saves at them.
 *
 * - the box: clicks at the anchors' click rate, hires every clerk the moment
 *   it is affordable;
 * - the board: pins each card from the inbox at its `bestCell` the moment it
 *   arrives, never rearranges, and clears wall the moment it is affordable;
 * - the night: at every dawn buys roster places while affordable, then
 *   insomnia once an alibi holds, then plans the night with `planWatches`;
 * - opens each door the moment its record holds, and reads the last page.
 *
 * `seatPlayer` runs it on the engine's tick driver, one step per wall step, after the
 * caller's opening step.
 */
import type { Engine } from '@open-loop/engine';
import { ANCHORS, bestCell, planWatches, type DoorId } from '../data';
import { getBoard, getBox, getCase, getNight } from '../modules';

const DOORS: DoorId[] = ['pin-board', 'reconstruct', 'box-returns'];

/** What one step did that a probe times: the doors it opened, and the last page. */
export interface PlayerStep {
  opened: DoorId[];
  readLast: boolean;
}

/** Binds the player to the running engine's modules; `step` takes one wall step's turn. */
export function createReferencePlayer(wallStep: number): { step: () => PlayerStep } {
  const { life } = getCase();
  const box = getBox();
  const board = getBoard();
  const night = getNight();
  let clickDebt = 0;
  let lastNight = -1;

  /** The dawn: roster, then insomnia, then the night's plan. */
  function dawn(): void {
    while (night.rosterPlace.canPurchase.value) night.rosterPlace.purchase(1);
    if (night.held.value.length > 0 && night.insomnia.canPurchase.value) night.insomnia.purchase(1);
    night.setPlan(planWatches(night.view(true)));
  }

  function step(): PlayerStep {
    clickDebt += ANCHORS.clickRate * wallStep;
    while (clickDebt >= 1) {
      clickDebt -= 1;
      box.read();
    }
    while (box.clerk.canPurchase.value) box.clerk.purchase(1);
    while (board.inbox.value.length) {
      const id = board.inbox.value[0];
      const cell = bestCell(board.pins.value, board.side.value, id);
      if (!cell || !board.pin(id, cell.x, cell.y)) break;
    }
    if (board.wall.canPurchase.value) board.wall.purchase(1);
    if (life.isLive('watch').value && night.cycle.count.value !== lastNight) {
      lastNight = night.cycle.count.value;
      dawn();
    }
    const opened = DOORS.filter((door) => life.open(door));
    return { opened, readLast: box.readLast() };
  }

  return { step };
}

/**
 * Seats the reference player on the engine's tick driver: it takes one step every tick, after
 * the modules' own tick handlers. The player paces a human in wall time, so its cadence is the
 * caller's: drive one tick per wall step through `processInterval(wallStep)`, the live path, so
 * insomnia's game speed applies. One interval stays one tick while `wallStep` times the game
 * speed is at most the driver's `maxDeltaTime`; a longer one splits, and the player would step
 * once per part.
 *
 * The seat's first step is inside the first tick. The caller takes the opening step before it,
 * through `player.step`, so the turn at the end of tick N sits where a step before tick N+1 did.
 *
 * @param engine - the running engine whose modules the player works
 * @param player - the player `createReferencePlayer` bound, which the caller's opening step shares
 * @param onTurn - receives what each step did, for a probe to record
 * @returns the function that unseats the player; call it when the run ends.
 */
export function seatPlayer(
  engine: Engine,
  player: { step: () => PlayerStep },
  onTurn?: (step: PlayerStep) => void,
): () => void {
  return engine.tickDriver.onTick(() => {
    const step = player.step();
    onTurn?.(step);
  });
}
