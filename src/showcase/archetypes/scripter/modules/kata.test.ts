import { beforeEach, describe, expect, it } from 'vitest';
import { Decimal } from '@open-loop/engine';
import { beats, boot } from '../sim/harness';
import type { TechniqueId } from '../data';
import { getDojo, getKata, getLineage } from '.';

/** Teach the dojo words without paying for them. */
function teach(...ids: TechniqueId[]) {
  for (const id of ids) getDojo().techniques.getPurchasable(id)!.count.value = 1;
}

describe('the student performs the scroll', () => {
  beforeEach(() => boot());

  it('starts a fresh dojo on the first scroll, and a training strike banks Ki', async () => {
    expect(getKata().inked.value).toContain('strike');
    await beats(3);
    expect(getLineage().strikes.value).toBe(3);
    expect(Decimal.gt(getDojo().ki.value, 0)).toBe(true);
  });

  it('passes over a failing if without spending a beat', async () => {
    teach('reading');
    getKata().ink('if students > 99: recruit\nstrike');
    await beats(6);
    expect(getLineage().strikes.value).toBe(6);
    expect(getKata().tallies.value[1].passed).toBeGreaterThan(0);
  });

  it('holds at a failing when, and the beats pass with no move', async () => {
    teach('reading', 'patience');
    getKata().ink('when students > 99: strike');
    await beats(5);
    expect(getLineage().strikes.value).toBe(0);
    expect(getKata().holding.value).toBe(true);
    expect(getKata().tallies.value[1].waited).toBeGreaterThan(0);
  });

  it('repeats a line its count of times before moving on', async () => {
    teach('repetition');
    getKata().ink('3x strike\nbreathe');
    await beats(4);
    expect(getKata().tallies.value[1].done).toBe(3);
    expect(getKata().tallies.value[2].done).toBe(1);
  });

  it('takes the moves of an alternate line in turn', async () => {
    teach('mirror', 'high-and-low');
    getKata().ink('alternate strike kick palm');
    await beats(4);
    expect(getKata().sequencer.items.value[0].metadata.turn).toBe(4);
  });

  it('fumbles a purchase the purse cannot pay, and counts it', async () => {
    getKata().ink('recruit');
    await beats(2);
    expect(getLineage().fumbles.value).toBe(2);
  });

  it('passes over a row it cannot read and performs the rest', async () => {
    const errors = getKata().ink('sweep\nstrike');
    expect(errors).toHaveLength(1);
    await beats(3);
    expect(getLineage().strikes.value).toBe(3);
  });
});
