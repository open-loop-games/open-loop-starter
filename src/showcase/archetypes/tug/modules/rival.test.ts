import { describe, expect, it } from 'vitest';
import { ANCHORS, LORDS } from '../data';
import { chooseWatch, chooseWave, type WatchView, type WaveView } from './rival';

const L = ANCHORS.causewayLength;
const view = (over: Partial<WaveView> = {}): WaveView => ({
  wave: 1,
  t: 30,
  silver: 300,
  income: 10,
  seasonLeft: 0,
  tithes: 0,
  titheCost: 1e9,
  prices: { pike: 40, horse: 60, bow: 50 },
  room: 60,
  front: 10,
  line: L / 2,
  worth: 0,
  siegeWorth: 0,
  theirLast: {},
  ...over,
});
const temper = { ...LORDS[2]!.temperament, chargeEvery: 99 };
const never = () => 0.999;

describe('the rival’s wave', () => {
  it('spends no more than its purse', () => {
    const order = chooseWave(view(), temper, never);
    const spent = order.squads.reduce((s, id) => s + view().prices[id]!, 0);
    expect(spent).toBeLessThanOrEqual(300);
    expect(order.squads.length).toBeGreaterThan(0);
  });

  it('holds with pike and bow when pushed into its own quarter', () => {
    const order = chooseWave(view({ line: L / 8 }), temper, never);
    expect(order.intent).toBe('hold');
    expect(order.squads).not.toContain('horse');
  });

  it('charges when the other keep’s last wave was all bowmen', () => {
    const order = chooseWave(
      view({ theirLast: { bow: 4 } }),
      { ...temper, counterRead: 1 },
      () => 0,
    );
    expect(order.intent).toBe('charge');
  });

  it('puts its surplus into engines once its host fills the muster', () => {
    const prices = { pike: 40, horse: 60, bow: 50, siege: 160 };
    const full = view({ prices, front: L * 0.3, worth: 1000, silver: 400, room: 2 });
    expect(chooseWave(full, temper, never).squads).toContain('siege');
  });

  it('holds back part of its purse while its profile says so', () => {
    const hoard = {
      ...temper,
      profile: [
        { from: 0, spend: 0.5 },
        { from: 90, spend: 1 },
      ],
    };
    const spent = (t: number) =>
      chooseWave(view({ t }), hoard, never).squads.reduce((s, id) => s + view().prices[id]!, 0);
    expect(spent(30)).toBeLessThanOrEqual(150);
    expect(spent(120)).toBeGreaterThan(150);
  });

  it('brings an engine only on a push, within its share of the host', () => {
    const prices = { pike: 40, horse: 60, bow: 50, siege: 160 };
    const pushing = view({ prices, front: L * 0.7, worth: 1000, silver: 400 });
    expect(chooseWave(pushing, temper, never).squads).toContain('siege');
    const holding = view({ prices, front: L * 0.3, worth: 1000, silver: 400 });
    expect(chooseWave(holding, temper, never).squads).not.toContain('siege');
    const full = view({ prices, front: L * 0.7, worth: 1000, siegeWorth: 400, silver: 400 });
    expect(chooseWave(full, temper, never).squads).not.toContain('siege');
  });

  it('raises the tithe when it pays back inside the season it has left', () => {
    const v = view({ seasonLeft: 150, titheCost: 125 });
    expect(chooseWave(v, temper, never).tithe).toBe(true);
    expect(chooseWave({ ...v, seasonLeft: 20 }, temper, never).tithe).toBe(false);
  });
});

const watch = (over: Partial<WatchView> = {}): WatchView => ({
  t: 60,
  sinceHorn: 6,
  hornIn: 4,
  sinceTheirs: 0.5,
  period: 10,
  silver: 300,
  income: 10,
  earlyFee: 20,
  weapon: null,
  charged: false,
  enemyEngine: Infinity,
  enemyFront: L,
  theirLast: {},
  open: ['pike', 'horse', 'bow'],
  ...over,
});

describe('the rival between horns', () => {
  it('burns an engine with fire-pots only once one is in throw of its gate', () => {
    const w = watch({ weapon: 'firepots', charged: true });
    expect(chooseWatch(w, temper).fire).toBe(false);
    expect(chooseWatch({ ...w, enemyEngine: ANCHORS.engineThrow }, temper).fire).toBe(true);
  });

  it('looses the trebuchet once their front is in its half', () => {
    const w = watch({ weapon: 'trebuchet', charged: true });
    expect(chooseWatch(w, temper).fire).toBe(false);
    expect(chooseWatch({ ...w, enemyFront: L / 3 }, temper).fire).toBe(true);
  });

  it('sounds early to answer a wave an open troop beats, and never when none does', () => {
    const early = { ...temper, earlyHorn: true };
    expect(chooseWatch(watch({ theirLast: { bow: 3 } }), early).early).toBe(true);
    expect(chooseWatch(watch({ theirLast: { pike: 3 }, open: ['pike'] }), early).early).toBe(false);
    expect(
      chooseWatch(watch({ theirLast: { bow: 3 } }), { ...early, earlyHorn: false }).early,
    ).toBe(false);
  });
});
