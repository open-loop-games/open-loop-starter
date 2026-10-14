import { describe, expect, it } from 'vitest';
import { foeShows, openBout, resolveBeat, type BoutState } from './bout';

/** Advance the bout until a test holds, waiting each beat. */
function until(s: BoutState, test: (s: BoutState) => boolean, limit = 50) {
  for (let i = 0; i < limit && !test(s); i++) resolveBeat(s, null, 1);
}

describe('the challengers’ rules', () => {
  it('Old Bao lets only a flurry land in full', () => {
    const single = openBout('bao', 1);
    resolveBeat(single, 'strike', 1, false);
    const flurry = openBout('bao', 1);
    resolveBeat(flurry, 'strike', 1, true);
    expect(single.attackers[0].hp).toBeGreaterThan(flurry.attackers[0].hp);
  });

  it('Ox-Hide Ren turns aside a fist no harder than his hide', () => {
    const s = openBout('ren', 1);
    resolveBeat(s, 'strike', 2);
    expect(s.attackers[0].hp).toBe(s.attackers[0].maxHp);
  });

  it('Iron-Shell Ma jars the hands of a blow on the shell', () => {
    const s = openBout('ma', 1);
    resolveBeat(s, 'strike', 1);
    expect(s.down).toBeGreaterThan(0);
    expect(s.attackers[0].hp).toBe(s.attackers[0].maxHp);
  });

  it('Brother Gang is turned aside by a parry raised while he winds up, and left open', () => {
    const s = openBout('gang', 1);
    until(s, (x) => foeShows(x, 'winds'));
    until(s, (x) => x.attackers[0].left === 1 && x.attackers[0].phase === 'winds');
    resolveBeat(s, 'parry', 1);
    resolveBeat(s, null, 1); // the smash lands into the raised parry
    expect(foeShows(s, 'open')).toBe(true);
    expect(s.down).toBe(0);
  });

  it('Brother Gang knocks down a student who does not parry', () => {
    const s = openBout('gang', 1);
    until(s, (x) => x.attackers[0].phase === 'smash');
    resolveBeat(s, 'strike', 1);
    expect(s.down).toBeGreaterThan(0);
  });

  it('the Twins block a strike while guarding high, and not a kick', () => {
    const s = openBout('twins', 1);
    until(s, (x) => foeShows(x, 'high') && x.attackers[0].left > 1);
    const hp = s.attackers[0].hp;
    resolveBeat(s, 'strike', 1);
    expect(s.attackers[0].hp).toBe(hp);
    resolveBeat(s, 'kick', 1);
    expect(s.attackers[0].hp).toBeLessThan(hp);
  });

  it('Master Lu turns aside a form used on either of the last two blows', () => {
    const s = openBout('lu', 1);
    resolveBeat(s, 'strike', 1);
    resolveBeat(s, 'kick', 1);
    const hp = s.attackers[0].hp;
    resolveBeat(s, 'strike', 1);
    expect(s.attackers[0].hp).toBe(hp);
    resolveBeat(s, 'palm', 1);
    expect(s.attackers[0].hp).toBeLessThan(hp);
  });

  it('a sweep catches every Red Gate attacker still standing', () => {
    const s = openBout('redgate', 1);
    resolveBeat(s, 'sweep', 1);
    expect(s.attackers.every((a) => a.hp < a.maxHp)).toBe(true);
  });

  it('the Envoy sends four challengers, one after another', () => {
    const s = openBout('envoy', 7);
    expect(s.queue).toHaveLength(3);
  });

  it('the same seed replays the same bout', () => {
    const a = openBout('twins', 42);
    const b = openBout('twins', 42);
    for (let i = 0; i < 20; i++) {
      resolveBeat(a, 'strike', 1);
      resolveBeat(b, 'strike', 1);
    }
    expect(a).toEqual(b);
  });
});
