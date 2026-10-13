import { ref, type Ref } from 'vue';
import {
  Decimal,
  createCostRequirement,
  createPurchasableCategory,
  processOfflineTime,
  type EngineModule,
  type InjectionKey,
  type Purchasable,
  type TickDriver,
} from '@open-loop/engine';
import { SettingsKey } from '@/modules/settings';
import {
  ACQUISITION_INTERVAL,
  BOOKKEEPER_DEF,
  FIRM,
  OFFLINE_WINDOW_SECONDS,
  type BookkeeperDef,
} from '../data';
import { FirmKey } from './firm';

/**
 * Offline: what the firm did while the player was away.
 *
 * Catch-up is an unlock, the night bookkeeper, bought once. Until then a return
 * replays nothing. After it, the time away is replayed through the live game loop,
 * so every module, the desks included, runs over it exactly as it would have
 * live. Time away moves wall-clock time onto sim-time and changes nothing about
 * the arc measured in sim-time. `../data/spine.ts` § The night bookkeeper sizes the
 * window.
 */

export const OfflineKey: InjectionKey<OfflineApi> = Symbol(
  'producer/offline',
) as InjectionKey<OfflineApi>;

/** One return after time away, as the welcome-back report shows it. */
export interface OfflineReturn {
  /** Wall-clock seconds between the save and the return. */
  awaySeconds: number;
  /** Seconds replayed: the time away, clamped to the window; 0 before the bookkeeper. */
  caughtUpSeconds: number;
  /** Cash the firm made over the replay, net of anything the desks spent. */
  cashGained: Decimal;
}

export interface OfflineApi {
  /** The one-time purchase that turns catch-up on. */
  bookkeeper: Purchasable;
  /** The most recent return this play session; `null` until one happens. */
  lastReturn: Ref<OfflineReturn | null>;
  /**
   * Replay the time away since `savedAt` (ms) through `tickDriver`.
   *
   * @param tickDriver the engine's driver, `engine.tickDriver`
   * @param savedAt when the loaded save was written; `undefined` means no time away
   * @param now the return time in ms, defaulting to `Date.now()`
   * @returns the return, also written to `lastReturn`
   * @example offline.catchUp(engine.tickDriver, loadResult.timestamp)
   */
  catchUp(tickDriver: TickDriver, savedAt: number | undefined, now?: number): OfflineReturn;
}

let api: OfflineApi;

export function getOffline(): OfflineApi {
  return api;
}

export function createOfflineModule(): EngineModule {
  return {
    id: 'producer/offline',
    dependencies: ['producer/firm'],
    install(ctx) {
      const { cash, post } = ctx.inject(FirmKey);
      const lastReturn: Ref<OfflineReturn | null> = ref(null);
      // The base's player-facing toggle (Settings → "Process offline progress
      // on load"). Absent outside the shared base, where catch-up always runs.
      const settings = ctx.tryInject(SettingsKey)?.settings;

      const firmOffice = createPurchasableCategory<BookkeeperDef>({
        id: FIRM,
        mapPurchasable: (def) => ({
          display: { title: def.title, description: def.description },
          requirements: createCostRequirement({ resource: cash, cost: def.cost }),
          limit: 1,
          visible: def.visible,
        }),
        mapState: (def, p) => {
          p.on('purchased', () => post('hire', `hired the ${def.title.toLowerCase()}`, -def.cost));
        },
      });
      firmOffice.register(BOOKKEEPER_DEF);
      const bookkeeper = firmOffice.getPurchasable(BOOKKEEPER_DEF.id)!;

      function catchUp(
        tickDriver: TickDriver,
        savedAt: number | undefined,
        now: number = Date.now(),
      ): OfflineReturn {
        const awaySeconds = savedAt == null ? 0 : Math.max(0, (now - savedAt) / 1000);
        const before = Decimal.fromValue(cash.value);
        const enabled = bookkeeper.active.value && (settings?.offlineProgress.value ?? true);
        // Half-second chunks keep the acquisitions desk on its own cadence through the replay.
        const caughtUpSeconds = enabled
          ? processOfflineTime(tickDriver, awaySeconds, {
              maxOfflineSeconds: OFFLINE_WINDOW_SECONDS,
              chunkSize: ACQUISITION_INTERVAL,
            })
          : 0;
        const result: OfflineReturn = {
          awaySeconds,
          caughtUpSeconds,
          cashGained: Decimal.sub(cash.value, before),
        };
        if (caughtUpSeconds > 0)
          post('away', `books kept for ${Math.round(caughtUpSeconds / 60)} min away`);
        lastReturn.value = result;
        return result;
      }

      api = { bookkeeper, lastReturn, catchUp };
      ctx.provide(OfflineKey, api);
    },
  };
}
