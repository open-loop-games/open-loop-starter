import { beforeEach, describe, expect, it } from 'vitest';
import { Decimal, toNumber } from '@open-loop/engine';
import { boot } from '../sim/harness';
import { getMatch } from '../modules/match';
import { destination } from '../modules/travel';
import { createSelection, moveSelection } from './command';

const NARROWS = 0;
const DOCKS = 1;
const STEPS = 2;

describe('a move order on the selection', () => {
  beforeEach(() => {
    boot();
    getMatch().start();
  });

  it('sends every selected squad toward the place', () => {
    const { p } = getMatch();
    p.squads[NARROWS]!.razor.value = new Decimal(2);
    p.squads[DOCKS]!.hexer.value = new Decimal(3);
    const sel = createSelection();
    sel.picks.push({ kind: 'squad', place: NARROWS }, { kind: 'squad', place: DOCKS });
    expect(moveSelection(p, sel, STEPS)).toBe(2);
    expect(p.convoys.value.map(destination)).toEqual([STEPS, STEPS]);
  });

  it('moves only the kinds toggled on', () => {
    const { p } = getMatch();
    p.reserve.razor.value = new Decimal(4);
    p.reserve.hexer.value = new Decimal(4);
    const sel = createSelection();
    sel.picks.push({ kind: 'squad', place: 'p' });
    sel.kinds.hexer = false;
    moveSelection(p, sel, DOCKS);
    expect(toNumber(p.reserve.razor.value)).toBe(0);
    expect(toNumber(p.reserve.hexer.value)).toBe(4);
  });

  it('walks through the queued waypoints', () => {
    const { p } = getMatch();
    p.reserve.razor.value = new Decimal(4);
    const sel = createSelection();
    sel.picks.push({ kind: 'squad', place: 'p' });
    sel.via.push(NARROWS);
    moveSelection(p, sel, STEPS);
    expect(p.convoys.value[0]!.path).toEqual([NARROWS, STEPS]);
  });

  it('turns a selected convoy on the road', () => {
    const { p } = getMatch();
    p.squads[NARROWS]!.razor.value = new Decimal(2);
    const sel = createSelection();
    sel.picks.push({ kind: 'squad', place: NARROWS });
    moveSelection(p, sel, STEPS);
    const id = p.convoys.value[0]!.id;
    sel.picks.splice(0, 1, { kind: 'convoy', id });
    moveSelection(p, sel, 'p');
    expect(destination(p.convoys.value[0]!)).toBe('p');
  });

  it("never sends units into the rival's safehouse", () => {
    const { p } = getMatch();
    p.squads[STEPS]!.razor.value = new Decimal(2);
    const sel = createSelection();
    sel.picks.push({ kind: 'squad', place: STEPS });
    expect(moveSelection(p, sel, 'e')).toBe(0);
    expect(p.convoys.value).toEqual([]);
  });
});
