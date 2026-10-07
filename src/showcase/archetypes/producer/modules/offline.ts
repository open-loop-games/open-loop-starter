import { ref, type Ref } from 'vue';
import {
  Decimal,
  processOfflineTime,
  type EngineModule,
  type InjectionKey,
  type TickDriver,
} from '@open-loop/engine';
import { SettingsKey } from '@/modules/settings';
import { OFFLINE_WINDOW_SECONDS } from '../data';
import { getMass } from './swarm';

/**
 * Offline — what the swarm did while the player was away.
 *
 * Tick-sim catch-up: the absence is replayed through the live tick loop, so
 * every module — the dispatcher included — runs over it exactly as it would
 * have live. That is what keeps the spine intact (`../IDENTITY.md` § Offline
 * is a time-base map): an absence moves wall-clock time onto sim time and
 * changes nothing about the arc measured in sim time.
 */

export const OfflineKey: InjectionKey<OfflineApi> = Symbol(
  'producer/offline',
) as InjectionKey<OfflineApi>;

/** One return from absence, as the welcome-back surface reports it. */
export interface OfflineReturn {
  /** Wall-clock seconds between the save and the return. */
  awaySeconds: number;
  /** Seconds actually replayed: the time away, clamped to `OFFLINE_WINDOW_SECONDS`. */
  caughtUpSeconds: number;
  /** Mass the swarm produced over the replay, net of anything it spent. */
  massGained: Decimal;
}

export interface OfflineApi {
  /** The most recent return this session; `null` until one happens. */
  lastReturn: Ref<OfflineReturn | null>;
  /**
   * Replay the absence since `savedAt` (ms) through `tickDriver`.
   *
   * @param tickDriver the engine's driver — `engine.tickDriver`
   * @param savedAt when the loaded save was written; `undefined` reads as no absence
   * @param now the return time in ms, defaulting to `Date.now()`
   * @returns the return, also written to `lastReturn`
   * @example offline.catchUp(engine.tickDriver, loadResult.timestamp)
   */
  catchUp(tickDriver: TickDriver, savedAt: number | undefined, now?: number): OfflineReturn;
}

export function createOfflineModule(): EngineModule {
  return {
    id: 'producer/offline',
    dependencies: ['producer/swarm'],
    install(ctx) {
      const lastReturn: Ref<OfflineReturn | null> = ref(null);
      // The base's player-facing toggle (Settings → "Process offline progress
      // on load"). Absent outside the shared base, where catch-up always runs.
      const settings = ctx.tryInject(SettingsKey)?.settings;

      function catchUp(
        tickDriver: TickDriver,
        savedAt: number | undefined,
        now: number = Date.now(),
      ): OfflineReturn {
        const awaySeconds = savedAt == null ? 0 : Math.max(0, (now - savedAt) / 1000);
        const before = Decimal.fromValue(getMass().value);
        const enabled = settings?.offlineProgress.value ?? true;
        const caughtUpSeconds = enabled
          ? processOfflineTime(tickDriver, awaySeconds, {
              maxOfflineSeconds: OFFLINE_WINDOW_SECONDS,
            })
          : 0;
        const result: OfflineReturn = {
          awaySeconds,
          caughtUpSeconds,
          massGained: Decimal.sub(getMass().value, before),
        };
        lastReturn.value = result;
        return result;
      }

      ctx.provide(OfflineKey, { lastReturn, catchUp });
    },
  };
}
