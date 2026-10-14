import { beforeEach, describe, expect, it } from 'vitest';
import { toNumber } from '@open-loop/engine';
import { ANCHORS, troop } from '../data';
import { boot, seconds, tickUntil } from '../sim/harness';
import { getBattle } from './battle';
import { getCauseway } from './causeway';
import { getChronicle } from './chronicle';
import { getKeep } from './keep';

beforeEach(() => {
  boot();
  getBattle().commanders.rival = () => ({ intent: 'line', tithe: false, squads: [] });
});

describe('the horns', () => {
  it('sounds the opening horn for both keeps together, then alternates, the toss leading', async () => {
    const battle = getBattle();
    battle.start('rival');
    const T = ANCHORS.hornSeconds;
    expect(battle.hornIn('player')).toBe(battle.hornIn('rival'));
    await seconds(T + 0.25);
    expect(battle.hornIn('rival')).toBeLessThan(battle.hornIn('player'));
    await seconds(T / 2);
    expect(battle.horns.rival.value).toBe(2);
    expect(battle.horns.player.value).toBe(1);
  });

  it('honours an override of the toss, and tosses when given none', () => {
    const battle = getBattle();
    battle.start('player');
    expect(battle.firstHorn.value).toBe('player');
    battle.start();
    expect(['player', 'rival']).toContain(battle.firstHorn.value);
  });
});

describe('the mangonel', () => {
  it('cannot be raised until the engineers arrive', async () => {
    getBattle().start('player');
    const keep = getKeep('player');
    keep.silver.value = 1e6;
    expect(keep.raise('siege')).toBe(0);
    await seconds(troop('siege').arrivesAt! + 1);
    expect(keep.raise('siege')).toBe(1);
  });
});

describe('a fallen gate', () => {
  it('ends the battle, writes the Chronicle and returns Fairhold to camp', async () => {
    const battle = getBattle();
    battle.start('player');
    const rival = getKeep('rival');
    rival.gateDamage.value = rival.gateMax.value;
    await seconds(0.25);
    expect(battle.phase.value).toBe('camp');
    const last = getChronicle().last.value!;
    expect(last.won).toBe(true);
    expect(getChronicle().rung.value).toBe(1);
  });

  it('still pays renown for a defeat, and leaves the ladder where it was', async () => {
    const battle = getBattle();
    battle.start('player');
    const fairhold = getKeep('player');
    fairhold.gateDamage.value = fairhold.gateMax.value;
    await tickUntil(() => battle.phase.value === 'camp', 4);
    const c = getChronicle();
    expect(c.last.value!.won).toBe(false);
    expect(c.last.value!.renown).toBeGreaterThan(0);
    expect(c.rung.value).toBe(0);
  });

  it('starts the next battle with a whole gate, an empty causeway and the opening purse', async () => {
    const battle = getBattle();
    battle.start('player');
    getKeep('player').raise('pike');
    await seconds(ANCHORS.hornSeconds + 2);
    getKeep('player').gateDamage.value = 1;
    battle.start('player');
    expect(getCauseway().members.value).toHaveLength(0);
    expect(getKeep('player').gateDamage.value).toBe(0);
    expect(toNumber(getKeep('player').troops.getPurchasable('pike')!.count.value)).toBe(0);
    expect(toNumber(getKeep('player').silver.value)).toBe(ANCHORS.startSeconds * ANCHORS.income);
  });
});
