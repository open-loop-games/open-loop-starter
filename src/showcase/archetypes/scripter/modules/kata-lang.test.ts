import { describe, expect, it } from 'vitest';
import { glossRow, parseKata } from './kata-lang';

const all = () => true;
const none = () => false;
const NAMES = ['post', 'ma', 'twins'];

describe('the kata language', () => {
  it('reads one move per line, with comments and blank rows free', () => {
    const r = parseKata('# open\nstrike\n\nrecruit', none, NAMES, 2);
    expect(r.errors).toEqual([]);
    expect(r.lines.map((l) => l.moves[0])).toEqual(['strike', 'recruit']);
    expect(r.moves).toBe(2);
  });

  it('refuses a word the dojo has not learned, naming the technique that teaches it', () => {
    const r = parseKata('if ready recruit: recruit', none, NAMES, 9);
    expect(r.lines).toEqual([]);
    expect(r.errors[0]).toMatchObject({ line: 1, technique: 'reading' });
  });

  it('says how to fix a misspelt test', () => {
    const r = parseKata('when foe opne: strike', all, NAMES, 9);
    expect(r.errors[0].message).toMatch(/foe winds, open, high, low/);
  });

  it('counts moves against the cap and refuses the ones past it', () => {
    const r = parseKata('strike\nstrike\nstrike', all, NAMES, 2);
    expect(r.lines).toHaveLength(2);
    expect(r.errors[0]).toMatchObject({ line: 3 });
  });

  it('gives a block head its test, and every line under it that test first', () => {
    const r = parseKata('if foe is ma:\n  when foe open: 3x strike\nstrike', all, NAMES, 9);
    expect(r.errors).toEqual([]);
    expect(r.lines[0].guards.map((g) => g.mode)).toEqual(['if', 'when']);
    expect(r.lines[0].reps).toBe(3);
    expect(r.lines[1].guards).toEqual([]);
  });

  it('turns the block above around for an else block at the same indent', () => {
    const r = parseKata('if foe is ma:\n  when foe open: strike\nelse:\n  kick', all, NAMES, 9);
    expect(r.errors).toEqual([]);
    expect(r.lines[1].guards).toEqual([
      { mode: 'if', test: { kind: 'foe-is', name: 'ma' }, negate: true },
    ]);
  });

  it('refuses an else with no block above it', () => {
    expect(parseKata('else:\n  kick', all, NAMES, 9).errors[0].message).toMatch(
      /follows an "if" block/,
    );
  });

  it('takes several moves in turn after alternate', () => {
    const r = parseKata('3x alternate strike kick palm', all, NAMES, 9);
    expect(r.lines[0]).toMatchObject({ reps: 3, moves: ['strike', 'kick', 'palm'] });
  });

  it('names only challengers it is given', () => {
    expect(parseKata('if foe is lu: strike', all, NAMES, 9).errors).toHaveLength(1);
  });

  it('glosses a row in plain words, with a live reading', () => {
    const r = parseKata('if chi < 20: breathe', all, NAMES, 9);
    expect(glossRow(r.rows[0], () => '34')).toBe(
      'If chi is below 20 (now 34): breathe, taking back chi. Otherwise pass over this line.',
    );
  });
});
