import {
  createEmitHandle,
  persistent,
  withPersistentContext,
  type EngineModule,
  type InjectionKey,
} from '@open-loop/engine';
import { computed, type ComputedRef } from 'vue';
import type { InterlockerData, SeasonSpec } from '../data/types';

export interface SeasonChangedEvent {
  seasonId: SeasonSpec['id'];
  year: number;
}

interface CalendarEvents {
  'season-changed': (event: SeasonChangedEvent) => void;
}

/**
 * Calendar module — the seasonal clock. A single persistent `elapsedDays`
 * counter advances off the game loop (`dt / secondsPerDay`); year, season, and
 * day-of-season derive from it. Exposes the active season's catnip multiplier
 * (canon `getWeatherMod`, calendar.js:1095) for consumers to apply.
 *
 * The season scaling is applied at the catnip *production read site* (village
 * onTick) and mirrored in the rate display (`useResources`), NOT bound onto the
 * catnip rate chain: that chain composes modifiers in insertion order
 * (`createSequentialModifier`), and catnip's producers (field grant, farmer
 * job) bind additively at runtime — a multiplicative season modifier could
 * never be guaranteed to land after them, so it would scale a zero base. The
 * read-site multiply is the correct, order-independent home.
 */
export interface CalendarApi {
  /** Current year (0-based). */
  year: ComputedRef<number>;
  /** Day within the current season (0-based, < daysPerSeason). */
  dayOfSeason: ComputedRef<number>;
  /** The active season spec. */
  season: ComputedRef<SeasonSpec>;
  /** Catnip-production multiplier for the active season. */
  catnipMultiplier: ComputedRef<number>;
  /** Subscribe to season-boundary crossings. */
  onSeasonChanged(handler: (event: SeasonChangedEvent) => void): () => void;
}

export const CalendarKey: InjectionKey<CalendarApi> = Symbol(
  'interlocker/calendar',
) as InjectionKey<CalendarApi>;

let calendar: CalendarApi | null = null;

export function getCalendar(): CalendarApi {
  if (!calendar) throw new Error('interlocker/calendar: not installed yet');
  return calendar;
}

export function createCalendarModule(data: InterlockerData): EngineModule {
  return {
    id: 'interlocker/calendar',
    install(ctx) {
      const handle = createEmitHandle<CalendarEvents>();

      const seasons = data.seasons;
      const { daysPerSeason, secondsPerDay } = data;
      const seasonsPerYear = seasons.length;

      const state = withPersistentContext('interlocker/calendar', () => ({
        elapsedDays: persistent<number>(0, { name: 'elapsed-days' }),
      }));

      const seasonIndex = computed(
        () => Math.floor(state.elapsedDays.value / daysPerSeason) % seasonsPerYear,
      );
      const year = computed(() =>
        Math.floor(state.elapsedDays.value / (daysPerSeason * seasonsPerYear)),
      );
      const dayOfSeason = computed(() => Math.floor(state.elapsedDays.value % daysPerSeason));
      const season = computed(() => seasons[seasonIndex.value]);
      const catnipMultiplier = computed(() => season.value.catnipMultiplier);

      // Emit on season-boundary crossings — drives the log + header flavor.
      let lastSeason = seasonIndex.value;
      ctx.onTick((dt) => {
        state.elapsedDays.value += dt / secondsPerDay;
        if (seasonIndex.value !== lastSeason) {
          lastSeason = seasonIndex.value;
          handle.emit('season-changed', { seasonId: season.value.id, year: year.value });
        }
      });

      const api: CalendarApi = {
        year,
        dayOfSeason,
        season,
        catnipMultiplier,
        onSeasonChanged: (h) => handle.on('season-changed', h),
      };
      calendar = api;
      ctx.provide(CalendarKey, api);
    },
  };
}
