import { beforeEach, describe, expect, it } from 'vitest';
import { toNumber } from '@open-loop/engine';
import { ANCHORS, FIELDS, troop } from '../data';
import { boot, seconds } from '../sim/harness';
import { getBattle } from './battle';
import { getCauseway, type Member } from './causeway';
import { getChronicle } from './chronicle';
import { getKeep } from './keep';
import { idleCommander } from './rival';

/** No commanders: the suite raises every squad itself. */
function quiet(): void {
  const battle = getBattle();
  battle.commanders.rival = idleCommander;
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
    getChronicle().rung.value = FIELDS.findIndex((f) => f.open.includes('bow'));
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

  it('batters the gate only when nothing stands ahead of a soldier at it', () => {
    getBattle().start('player');
    const c = getCauseway();
    c.clear();
    const L = ANCHORS.causewayLength;
    const yeoman = place({ side: 'player', troop: 'pike', x: L - 2, reach: 2.5 });
    expect(c.step(0.25).gate).toHaveLength(1);
    place({ side: 'rival', troop: 'pike', x: L - 1, file: 1 });
    yeoman.hitAgo = 99;
    expect(c.step(0.25).gate).toHaveLength(0);
  });

  it('lets an engine throw at the gate over any line once it is in throw, and walk until then', () => {
    getBattle().start('player');
    const c = getCauseway();
    c.clear();
    const L = ANCHORS.causewayLength;
    place({ side: 'rival', troop: 'pike', x: L - 20, hp: 1e6, maxHp: 1e6, dps: 0 });
    const near = place({
      side: 'player',
      troop: 'siege',
      x: L - ANCHORS.engineThrow + 1,
      reach: 20,
    });
    expect(c.step(0.25).gate.filter((e) => e.troop === 'siege')).toHaveLength(1);
    near.x = L - ANCHORS.engineThrow - 30;
    near.speed = 3;
    const events = c.step(0.25);
    expect(events.gate).toHaveLength(0);
    expect(near.x).toBeGreaterThan(L - ANCHORS.engineThrow - 30);
  });

  it('brings an engine up through its own ranks', () => {
    getBattle().start('player');
    const c = getCauseway();
    c.clear();
    place({ side: 'player', troop: 'pike', x: 11, speed: 0 });
    const engine = place({ side: 'player', troop: 'siege', x: 10, speed: 4, reach: 20 });
    for (let i = 0; i < 4; i++) c.step(0.25);
    expect(engine.x).toBeGreaterThan(11);
  });
});

describe('the field', () => {
  const at = (kind: string) => FIELDS.findIndex((f) => f.features.some((b) => b.kind === kind));

  it('slows every man in a ford', () => {
    getChronicle().rung.value = at('ford');
    getBattle().start('player');
    const c = getCauseway();
    c.clear();
    const ford = c.bands().find((b) => b.kind === 'ford')!;
    const wading = place({ side: 'player', troop: 'pike', x: ford.from + 1, speed: 4 });
    const dry = place({ side: 'player', troop: 'pike', x: 2, speed: 4, file: 2 });
    c.step(0.25);
    expect(wading.x - (ford.from + 1)).toBeLessThan(dry.x - 2);
  });

  it('stops a knight’s charge in the stakes', () => {
    getChronicle().rung.value = at('stakes');
    getBattle().start('player');
    const c = getCauseway();
    c.clear();
    const stakes = c.bands().find((b) => b.kind === 'stakes')!;
    const x = stakes.from + 1;
    place({ side: 'rival', troop: 'pike', x: x + 2, file: 1, dps: 0 });
    const bowman = place({ side: 'rival', troop: 'bow', x: x + 5, dps: 0 });
    const knight = place({ side: 'player', troop: 'horse', x, speed: 10 });
    for (let i = 0; i < 8; i++) c.step(0.25);
    expect(bowman.hp).toBe(100);
    expect(knight.x).toBeLessThan(x + 2);
  });

  it('sends the lord’s champion out of his gate at its hour', async () => {
    const rung = FIELDS.findIndex((f) => f.champions.length > 0);
    getChronicle().rung.value = rung;
    getBattle().start('player');
    const champ = FIELDS[rung]!.champions[0]!;
    const named = () => getCauseway().members.value.filter((m) => m.name === champ.name);
    await seconds(champ.at - 1);
    expect(named()).toHaveLength(0);
    await seconds(2);
    expect(named()).toHaveLength(1);
    expect(named()[0]!.side).toBe('rival');
  });
});

describe('the keep weapon', () => {
  function arm(kind: 'trebuchet' | 'firepots'): void {
    const ch = getChronicle();
    ch.renown.addXp(ANCHORS.renownBase * 100);
    ch.boons.getPurchasable(kind)!.purchase(1);
    ch.mounted.value = kind;
  }

  it('charges over the battle and fires only when charged', async () => {
    arm('trebuchet');
    getBattle().start('player');
    const keep = getKeep('player');
    place({ side: 'rival', troop: 'pike', x: 50 });
    expect(keep.fire()).toBe(false);
    await seconds(ANCHORS.weaponCharge + 1);
    expect(keep.fire()).toBe(true);
    expect(keep.charge.value).toBe(0);
  });

  it('drops a trebuchet stone on the foremost ranks only', () => {
    arm('trebuchet');
    getBattle().start('player');
    const c = getCauseway();
    c.clear();
    const front = place({ side: 'rival', troop: 'pike', x: 40, hp: 1e3, maxHp: 1e3 });
    const rear = place({ side: 'rival', troop: 'pike', x: 60, hp: 1e3, maxHp: 1e3 });
    c.strike('player', 'trebuchet');
    expect(front.hp).toBeLessThan(1e3);
    expect(rear.hp).toBe(1e3);
  });

  it('burns the enemy engine nearest the gate with fire-pots, if it is in throw', () => {
    arm('firepots');
    getBattle().start('player');
    const c = getCauseway();
    c.clear();
    const far = place({ side: 'rival', troop: 'siege', x: ANCHORS.engineThrow + 10 });
    expect(c.strike('player', 'firepots')).toBe(0);
    const near = place({ side: 'rival', troop: 'siege', x: ANCHORS.engineThrow - 5 });
    expect(c.strike('player', 'firepots')).toBe(1);
    const ids = c.members.value.map((m) => m.id);
    expect(ids).toContain(far.id);
    expect(ids).not.toContain(near.id);
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
