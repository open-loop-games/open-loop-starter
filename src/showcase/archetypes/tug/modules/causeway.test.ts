import { beforeEach, describe, expect, it } from 'vitest';
import { toNumber } from '@open-loop/engine';
import { ANCHORS, troop } from '../data';
import { boot, seconds } from '../sim/harness';
import { getBattle } from './battle';
import { getCauseway, type Member } from './causeway';
import { getChronicle } from './chronicle';
import { getKeep } from './keep';

/** No commanders: the suite raises every squad itself. */
function quiet(): void {
  const battle = getBattle();
  battle.commanders.rival = () => ({ intent: 'line', tithe: false, squads: [] });
}

/** A member placed by hand, for clash specs. */
function place(m: Partial<Member> & Pick<Member, 'side' | 'troop' | 'x'>): Member {
  const c = getCauseway();
  const full: Member = {
    id: Math.floor(Math.random() * 1e9),
    file: 0,
    hp: 100,
    maxHp: 100,
    dps: 10,
    gateDps: 1,
    speed: 0,
    reach: 2,
    cost: 10,
    hitAgo: 99,
    ...m,
  };
  c.members.value.push(full);
  return full;
}

beforeEach(() => {
  boot();
  quiet();
});

describe('the bailey and the horn', () => {
  it('holds a raised squad in the bailey until its horn, then marches it out', async () => {
    const c = getCauseway();
    getBattle().start('player');
    expect(getKeep('player').raise('pike')).toBe(1);
    expect(c.bailey.player.value).toEqual(['pike']);
    expect(c.members.value.filter((m) => m.side === 'player')).toHaveLength(0);
    await seconds(ANCHORS.hornSeconds + 1);
    expect(c.bailey.player.value).toEqual([]);
    expect(c.members.value.filter((m) => m.side === 'player')).toHaveLength(troop('pike').squad);
  });

  it('forms a released wave in ranks: yeomen ahead of the bowmen behind them', async () => {
    const c = getCauseway();
    getChronicle().renown.addXp(ANCHORS.renownBase);
    getChronicle().boons.getPurchasable('longbow')!.purchase(1);
    getBattle().start('player');
    getKeep('player').raise('bow');
    getKeep('player').raise('pike');
    await seconds(ANCHORS.hornSeconds + 2);
    const mine = c.members.value.filter((m) => m.side === 'player');
    const lastPike = Math.min(...mine.filter((m) => m.troop === 'pike').map((m) => m.x));
    const firstBow = Math.max(...mine.filter((m) => m.troop === 'bow').map((m) => m.x));
    expect(lastPike).toBeGreaterThan(firstBow);
  });

  it('raises no more than the muster leaves room for', () => {
    getBattle().start('player');
    const keep = getKeep('player');
    keep.silver.value = 1e6;
    const most = Math.floor(ANCHORS.muster / troop('pike').squad);
    expect(keep.raise('pike', most + 5)).toBe(most);
    expect(keep.raise('pike')).toBe(0);
  });
});

describe('the clash', () => {
  it('shields a defender more the deeper it stands in its own half', async () => {
    getBattle().start('player');
    const c = getCauseway();
    c.clear();
    const L = ANCHORS.causewayLength;
    const atMiddle = place({ side: 'rival', troop: 'pike', x: L / 2 + 1 });
    place({ side: 'player', troop: 'pike', x: L / 2 - 1 });
    c.step(1);
    const lostAtMiddle = 100 - atMiddle.hp;
    c.clear();
    const deep = place({ side: 'rival', troop: 'pike', x: L - 10 });
    place({ side: 'player', troop: 'pike', x: L - 12 });
    c.step(1);
    expect(100 - deep.hp).toBeLessThan(lostAtMiddle);
  });

  it('lets a knight ride past a yeoman to the bowman behind it', () => {
    getBattle().start('player');
    const c = getCauseway();
    c.clear();
    const knight = place({ side: 'player', troop: 'horse', x: 40, speed: 10 });
    place({ side: 'rival', troop: 'pike', x: 44, file: 1 });
    const bowman = place({ side: 'rival', troop: 'bow', x: 46 });
    for (let i = 0; i < 8; i++) c.step(0.25);
    expect(knight.x).toBeGreaterThan(44);
    expect(bowman.hp).toBeLessThan(100);
  });

  it('batters the gate only when nothing stands ahead, and an engine must close on it', () => {
    getBattle().start('player');
    const c = getCauseway();
    c.clear();
    const L = ANCHORS.causewayLength;
    const yeoman = place({ side: 'player', troop: 'pike', x: L - 2, reach: 2.5 });
    expect(c.step(0.25).gate).toHaveLength(1);
    yeoman.x = L - 30;
    const engine = place({ side: 'player', troop: 'siege', x: L - 10, reach: 20, speed: 3 });
    const events = c.step(0.25);
    expect(events.gate).toHaveLength(0);
    expect(engine.x).toBeGreaterThan(L - 10);
  });
});

describe('the gatehouse', () => {
  it('shoots an attacker standing at its gate', () => {
    getBattle().start('player');
    const c = getCauseway();
    c.clear();
    const raider = place({ side: 'rival', troop: 'pike', x: 3 });
    c.step(1);
    expect(raider.hp).toBeLessThan(100);
    expect(toNumber(getKeep('player').gateDamage.value)).toBe(0);
  });
});
