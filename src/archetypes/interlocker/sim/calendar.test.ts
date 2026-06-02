/**
 * Calendar module — seasonal clock contract.
 *
 * Locks the behaviors village + UI depend on: the day clock advances off the
 * game loop (`dt / secondsPerDay`), season/year/day-of-season derive from it,
 * the catnip multiplier tracks canon's per-season swing (spring 1.5 … winter
 * 0.25), and a `season-changed` event fires on each boundary crossing.
 *
 * Installs once against a mock EngineContext (the engine's `persistent()`
 * registers into a process-global keyed by id, so re-install would collide on
 * `interlocker/calendar/elapsed-days`) and drives time via a manual tick.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import type { EngineContext, InjectionKey } from '@open-loop/engine';
import { DEFAULT_INTERLOCKER_DATA } from '../data';
import type { SeasonChangedEvent } from '../modules/calendar';
import { CalendarKey, createCalendarModule, type CalendarApi } from '../modules/calendar';

const data = DEFAULT_INTERLOCKER_DATA;
// One day = secondsPerDay; one season = daysPerSeason days.
const SEASON_SECONDS = data.daysPerSeason * data.secondsPerDay;

interface Harness {
  calendar: CalendarApi;
  tick: (dt: number) => void;
  seasonEvents: SeasonChangedEvent[];
}

function buildHarness(): Harness {
  const provided = new Map<symbol, unknown>();
  const tickHandlers: Array<(dt: number) => void> = [];
  const ctx: EngineContext = {
    onTick(cb) {
      tickHandlers.push(cb);
      return () => {};
    },
    onSave: () => {},
    onLoad: () => {},
    onReset: () => {},
    on: () => () => {},
    emit: () => {},
    provide<T>(key: InjectionKey<T>, value: T) {
      provided.set(key as unknown as symbol, value);
    },
    inject<T>(key: InjectionKey<T>): T {
      return provided.get(key as unknown as symbol) as T;
    },
    tryInject<T>(key: InjectionKey<T>): T | undefined {
      return provided.get(key as unknown as symbol) as T | undefined;
    },
  };

  createCalendarModule(data).install(ctx);
  const calendar = provided.get(CalendarKey as unknown as symbol) as CalendarApi;

  const seasonEvents: SeasonChangedEvent[] = [];
  calendar.onSeasonChanged((e) => seasonEvents.push(e));

  return {
    calendar,
    tick: (dt) => tickHandlers.forEach((h) => h(dt)),
    seasonEvents,
  };
}

describe('interlocker/calendar — seasonal clock', () => {
  let H: Harness;
  beforeAll(() => {
    H = buildHarness();
  });

  it('starts in spring of year 0 with the +50% catnip swing', () => {
    expect(H.calendar.year.value).toBe(0);
    expect(H.calendar.season.value.id).toBe('spring');
    expect(H.calendar.dayOfSeason.value).toBe(0);
    expect(H.calendar.catnipMultiplier.value).toBe(1.5);
  });

  it('advances day-of-season off the game loop', () => {
    // Half a season of sim time → day 50, still spring.
    H.tick(SEASON_SECONDS / 2);
    expect(H.calendar.season.value.id).toBe('spring');
    expect(H.calendar.dayOfSeason.value).toBe(50);
  });

  it('crosses into summer, autumn, winter with canon multipliers + events', () => {
    // From day 50: +half season → summer day 0, then full seasons onward.
    H.tick(SEASON_SECONDS / 2); // → summer
    expect(H.calendar.season.value.id).toBe('summer');
    expect(H.calendar.catnipMultiplier.value).toBe(1.0);

    H.tick(SEASON_SECONDS); // → autumn
    expect(H.calendar.season.value.id).toBe('autumn');
    expect(H.calendar.catnipMultiplier.value).toBe(1.0);

    H.tick(SEASON_SECONDS); // → winter
    expect(H.calendar.season.value.id).toBe('winter');
    expect(H.calendar.catnipMultiplier.value).toBe(0.25);

    expect(H.seasonEvents.map((e) => e.seasonId)).toEqual(['summer', 'autumn', 'winter']);
  });

  it('rolls into year 1 after winter', () => {
    H.tick(SEASON_SECONDS); // winter → spring, year 1
    expect(H.calendar.season.value.id).toBe('spring');
    expect(H.calendar.year.value).toBe(1);
    expect(H.seasonEvents.at(-1)).toEqual({ seasonId: 'spring', year: 1 });
  });
});
