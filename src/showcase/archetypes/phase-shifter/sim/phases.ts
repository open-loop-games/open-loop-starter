/**
 * Step helpers for the behavioral suites: walk a fresh game through its doors
 * by meeting each record directly, so a spec starts in the phase it is about.
 */
import { addResource } from '@open-loop/engine';
import { BOX_PAGES, RECONSTRUCT_LEADS } from '../data';
import { getBoard, getBox, getCase } from '../modules';

/** Empty the box onto the record, as the reading would. */
export function emptyBox(): void {
  const box = getBox();
  box.pages.value = 0;
  addResource(box.pagesRead, BOX_PAGES);
}

/** Open the board: the box emptied, the first door opened. */
export function toBoard(): void {
  emptyBox();
  getCase().life.open('pin-board');
}

/** Open the night: the board's record met, the second door opened. */
export function toNight(): void {
  toBoard();
  addResource(getBoard().leads, RECONSTRUCT_LEADS);
  getCase().life.open('reconstruct');
}
