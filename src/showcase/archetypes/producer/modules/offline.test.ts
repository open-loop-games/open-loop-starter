import { beforeEach, describe, expect, it } from 'vitest';
import { Decimal, addResource } from '@open-loop/engine';
import { boot, getEngine } from '../sim/harness';
import { getClasses, getMass } from './swarm';
import { SettingsKey } from '@/modules/settings';
import { DispatchKey } from './automation';
import { OfflineKey } from './offline';
import { OFFLINE_WINDOW_SECONDS } from '../data';

/**
 * What a return from absence *does*. No magnitudes: how much an absence is
 * worth is the spine's question (`../IDENTITY.md` § Offline is a time-base
 * map), and `../balance/offline-probe.ts` measures it.
 */

const num = (v: unknown): number => new Decimal(v as never).toNumber();
const offline = () => getEngine().tryInject(OfflineKey)!;
const dispatch = () => getEngine().tryInject(DispatchKey)!;
const fleetSize = (): number =>
  getClasses()
    .getAll()
    .reduce((total, entry) => total + num(entry.producer.ownedCount.value), 0);
const HOUR_MS = 3_600_000;

/** Own one seed probe, so the swarm has an income to carry across an absence. */
function seedTheSwarm(): void {
  addResource(getMass(), 1e6);
  getClasses().getProducer('seed')!.repeatable!.purchase(1);
}

beforeEach(() => boot());

describe('returning after an absence', () => {
  it('advances the swarm across the time away', () => {
    seedTheSwarm();
    const before = num(getMass().value);
    const now = Date.now();
    offline().catchUp(getEngine().tickDriver, now - HOUR_MS, now);
    expect(num(getMass().value)).toBeGreaterThan(before);
  });

  it('replays nothing when the player has switched offline progress off', () => {
    seedTheSwarm();
    getEngine().tryInject(SettingsKey)!.settings.offlineProgress.value = false;
    const before = num(getMass().value);
    const now = Date.now();
    const result = offline().catchUp(getEngine().tickDriver, now - HOUR_MS, now);
    expect(result.caughtUpSeconds).toBe(0);
    expect(num(getMass().value)).toBe(before);
  });

  it('replays no more than the offline window', () => {
    seedTheSwarm();
    const now = Date.now();
    const away = OFFLINE_WINDOW_SECONDS * 2;
    const result = offline().catchUp(getEngine().tickDriver, now - away * 1000, now);
    expect(result.awaySeconds).toBe(away);
    expect(result.caughtUpSeconds).toBe(OFFLINE_WINDOW_SECONDS);
  });

  it('treats a save with no timestamp as no absence', () => {
    seedTheSwarm();
    const before = num(getMass().value);
    const result = offline().catchUp(getEngine().tickDriver, undefined);
    expect(result.awaySeconds).toBe(0);
    expect(num(getMass().value)).toBe(before);
  });

  it('records the return for the welcome-back surface', () => {
    seedTheSwarm();
    expect(offline().lastReturn.value).toBeNull();
    const now = Date.now();
    const result = offline().catchUp(getEngine().tickDriver, now - HOUR_MS, now);
    expect(offline().lastReturn.value).toEqual(result);
    expect(num(result.massGained)).toBeGreaterThan(0);
  });
});

describe('the absence runs the same game as live play', () => {
  it('banks the income while dispatch is still locked', () => {
    seedTheSwarm();
    dispatch().isActive.value = true;
    const fleet = fleetSize();
    const now = Date.now();
    offline().catchUp(getEngine().tickDriver, now - HOUR_MS, now);
    expect(fleetSize()).toBe(fleet);
  });

  it('spends it once a dispatch rung is open', () => {
    seedTheSwarm();
    dispatch().tiers.unlock('assisted');
    dispatch().isActive.value = true;
    const fleet = fleetSize();
    const now = Date.now();
    offline().catchUp(getEngine().tickDriver, now - HOUR_MS, now);
    expect(fleetSize()).toBeGreaterThan(fleet);
  });
});
