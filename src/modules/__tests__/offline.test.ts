import { describe, expect, it } from 'vitest';
import type { EngineModule } from '@open-loop/engine';
import { bootTestEngine } from '@/test/bootTestEngine';
import { readOfflineSeconds, replayOfflineTime } from '../offline';
import { SettingsKey, settingsModule } from '../settings';

const NOW = 1_700_000_000_000;

/** An engine whose one game module adds up the seconds its ticks ran. */
function bootClock(modules: EngineModule[] = [settingsModule]) {
  let ran = 0;
  const clock: EngineModule = {
    id: 'test/clock',
    install(ctx) {
      ctx.onTick((dt) => {
        ran += dt;
      });
    },
  };
  const { engine } = bootTestEngine({ modules: [...modules, clock] });
  return { engine, ran: () => Math.round(ran) };
}

const savedAgo = (seconds: number) => ({ success: true, timestamp: NOW - seconds * 1000 });

describe('readOfflineSeconds', () => {
  it('is the time between the loaded save and now', () => {
    expect(readOfflineSeconds(savedAgo(90), NOW)).toBe(90);
  });

  it('is 0 for a new game, a failed load and a clock that ran backwards', () => {
    expect(readOfflineSeconds({ success: false }, NOW)).toBe(0);
    expect(readOfflineSeconds({ success: true }, NOW)).toBe(0);
    expect(readOfflineSeconds(savedAgo(-30), NOW)).toBe(0);
  });
});

describe('replayOfflineTime', () => {
  it('runs the game over the time since the save', () => {
    const { engine, ran } = bootClock();
    expect(replayOfflineTime(engine, savedAgo(120), { now: NOW })).toBe(120);
    expect(ran()).toBe(120);
  });

  it('replays no more than the cap', () => {
    const { engine, ran } = bootClock();
    expect(replayOfflineTime(engine, savedAgo(5000), { now: NOW, maxOfflineSeconds: 600 })).toBe(
      600,
    );
    expect(ran()).toBe(600);
  });

  it('replays nothing when the player has switched offline progress off', () => {
    const { engine, ran } = bootClock();
    engine.tryInject(SettingsKey)!.settings.offlineProgress.value = false;
    expect(replayOfflineTime(engine, savedAgo(120), { now: NOW })).toBe(0);
    expect(ran()).toBe(0);
  });

  it('replays nothing for a new game', () => {
    const { engine, ran } = bootClock();
    expect(replayOfflineTime(engine, { success: false }, { now: NOW })).toBe(0);
    expect(ran()).toBe(0);
  });

  it('replays on an engine without the settings module, which has no switch to read', () => {
    const { engine, ran } = bootClock([]);
    expect(replayOfflineTime(engine, savedAgo(60), { now: NOW })).toBe(60);
    expect(ran()).toBe(60);
  });
});
