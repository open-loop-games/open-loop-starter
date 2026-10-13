import { beforeEach, describe, expect, it } from 'vitest';
import { toNumber } from '@open-loop/engine';
import { BOARD_PRICES, CARD_BY_ID, DECK, stringStrength } from '../data';
import { boot, tick } from '../sim/harness';
import { toBoard } from '../sim/phases';
import { getBoard } from './board';

const num = (r: { value: unknown }) => toNumber(r.value as number);

/** Two cards from the deck that share a fact, and one that shares none with the first. */
function pairAndStranger(): [string, string, string] {
  const a = DECK[0];
  const b = DECK.find((c) => c !== a && stringStrength(a, c) > 0)!;
  const z = DECK.find((c) => stringStrength(a, c) === 0)!;
  return [a.id, b.id, z.id];
}

describe('the board', () => {
  beforeEach(() => {
    boot();
    toBoard();
  });

  it('runs string between neighbours that share a fact, and the string earns leads', async () => {
    const board = getBoard();
    const [a, b, z] = pairAndStranger();
    board.inbox.value = [a, b, z];

    board.pin(a, 0, 0);
    board.pin(z, 1, 0);
    expect(board.strength.value).toBe(0);

    board.unpin(1, 0);
    board.pin(b, 1, 0);
    expect(board.strength.value).toBe(stringStrength(CARD_BY_ID[a], CARD_BY_ID[b]));

    const leads = num(board.leads);
    await tick(40);
    expect(num(board.leads)).toBeGreaterThan(leads);
  });

  it('pins only on open wall, and clearing wall opens the next ring', () => {
    const board = getBoard();
    const [a] = pairAndStranger();
    board.inbox.value = [a];
    expect(board.pin(a, 3, 3)).toBe(false);

    board.leads.value = BOARD_PRICES[0];
    board.wall.purchase(1);
    expect(board.side.value).toBe(4);
    expect(board.pin(a, 3, 3)).toBe(true);
  });

  it('sends an unpinned card back to the inbox', () => {
    const board = getBoard();
    const [a] = pairAndStranger();
    board.inbox.value = [a];
    board.pin(a, 0, 0);
    expect(board.inbox.value).not.toContain(a);
    board.unpin(0, 0);
    expect(board.inbox.value).toContain(a);
    expect(board.pins.value[0]).toBeNull();
  });

  it('fills from the phone’s notes written up into cards, even with no clerks', async () => {
    const board = getBoard();
    const written = board.written.value;
    await tick(20 * 120);
    expect(board.written.value).toBeGreaterThan(written);
  });
});
