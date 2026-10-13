import { beforeEach, describe, expect, it } from 'vitest';
import { Decimal, addResource } from '@open-loop/engine';
import { SettingsKey } from '@/modules/settings';
import { boot, getEngine } from '../sim/harness';
import { getFirm } from './firm';
import { OfflineKey } from './offline';
import { OFFLINE_WINDOW_SECONDS } from '../data';

/**
 * What a return after time away does. No magnitudes: what time away is worth is
 * `../balance/offline-probe.ts`'s question.
 */

const num = (v: unknown): number => new Decimal(v as never).toNumber();
const offline = () => getEngine().tryInject(OfflineKey)!;
const HOUR_MS = 3_600_000;

/** Own a pushcart, so the firm has a rate to keep while the player is away. */
function openTheFirm(): void {
  addResource(getFirm().cash, 1e6);
  getFirm().subsidiaries.getProducer('pushcart')!.repeatable!.purchase(1);
}

function hireTheBookkeeper(): void {
  addResource(getFirm().cash, 1e9);
  for (const e of getFirm().subsidiaries.getAll().slice(0, 4)) e.producer.repeatable!.purchase(1);
  offline().bookkeeper.purchase(1);
}

function returnAfter(ms: number) {
  const now = Date.now();
  return offline().catchUp(getEngine().tickDriver, now - ms, now);
}

beforeEach(() => boot());

describe('returning after time away', () => {
  it('replays nothing before the bookkeeper is hired', () => {
    openTheFirm();
    const before = num(getFirm().cash.value);
    expect(returnAfter(HOUR_MS).caughtUpSeconds).toBe(0);
    expect(num(getFirm().cash.value)).toBe(before);
  });

  it('runs the firm across the time away once the bookkeeper is hired', () => {
    openTheFirm();
    hireTheBookkeeper();
    const before = num(getFirm().cash.value);
    expect(returnAfter(60_000).caughtUpSeconds).toBeGreaterThan(0);
    expect(num(getFirm().cash.value)).toBeGreaterThan(before);
  });

  it('replays no more than the window', () => {
    openTheFirm();
    hireTheBookkeeper();
    expect(returnAfter(100 * HOUR_MS).caughtUpSeconds).toBe(OFFLINE_WINDOW_SECONDS);
  });

  it('replays nothing when the player has switched offline progress off', () => {
    openTheFirm();
    hireTheBookkeeper();
    getEngine().tryInject(SettingsKey)!.settings.offlineProgress.value = false;
    expect(returnAfter(HOUR_MS).caughtUpSeconds).toBe(0);
  });
});
