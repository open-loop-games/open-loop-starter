import {
  computed,
  watch,
  type ComputedRef,
  type EngineModule,
  type InjectionKey,
} from '@open-loop/engine';
import { createModuleApi } from '@/modules/module-api';
import { FOUNDED, SEASONS, SEASON_SECONDS, gardenYield, weatherFor, type Season } from '../data';
import { TelegraphKey } from './telegraph';

/**
 * Calendar module — the seasons on the play clock, each turn sent down the wire. It keeps
 * no state of its own: the season is the telegraph's play time over SEASON_SECONDS, and
 * its weather a hash of the season's number, so the almanac can forecast the next one and
 * a save reads the same sky.
 */

export interface CalendarApi {
  /** seasons since the works were founded in the spring of 1855 */
  index: ComputedRef<number>;
  season: ComputedRef<Season>;
  year: ComputedRef<number>;
  /** the gardens' yield multiplier this season, weather included */
  yield: ComputedRef<number>;
  /** this season's weather: 0, or the swing either way */
  weather: ComputedRef<number>;
  /** the next season's weather, as the almanac forecasts it */
  forecast: ComputedRef<number>;
  /** seconds left in this season */
  remaining: ComputedRef<number>;
}

export const CalendarKey: InjectionKey<CalendarApi> = Symbol(
  'interlocker/calendar',
) as InjectionKey<CalendarApi>;

const calendarApi = createModuleApi(CalendarKey);

/** The seasons on the play clock. Read it after the engine starts. */
export const getCalendar = calendarApi.get;

export function createCalendarModule(): EngineModule {
  return {
    id: 'interlocker/calendar',
    dependencies: ['interlocker/telegraph'],
    install(ctx) {
      const telegraph = ctx.inject(TelegraphKey);
      const played = () => telegraph.time.totalPlayTime.value;
      const index = computed(() => Math.floor(played() / SEASON_SECONDS));
      const api: CalendarApi = {
        index,
        season: computed(() => SEASONS[index.value % SEASONS.length]!),
        year: computed(() => FOUNDED + Math.floor(index.value / SEASONS.length)),
        yield: computed(() => gardenYield(index.value)),
        weather: computed(() => weatherFor(index.value)),
        forecast: computed(() => weatherFor(index.value + 1)),
        remaining: computed(() => SEASON_SECONDS * (index.value + 1) - played()),
      };
      // The wire carries each turn of the season, and its weather.
      watch(index, (n) => {
        const w = weatherFor(n);
        const sky =
          w > 0
            ? ' — a kind season for the gardens'
            : w < 0
              ? ' — a hard season for the gardens'
              : '';
        const name = SEASONS[n % SEASONS.length]!;
        telegraph.send(
          `${name[0]!.toUpperCase()}${name.slice(1)} ${api.year.value}${sky}`,
          'season',
        );
      });
      calendarApi.publish(ctx, api);
    },
  };
}
