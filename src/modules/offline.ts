import {
  processOfflineTime,
  type Engine,
  type OfflineProgressOptions,
  type SaveLoadResult,
} from '@open-loop/engine';
import { SettingsKey } from './settings';

/** Options for {@link replayOfflineTime}: the engine's cap and chunk size, and the time of the return. */
export interface ReplayOfflineOptions extends OfflineProgressOptions {
  /** The time of the return, in ms. Defaults to `Date.now()`. */
  now?: number;
}

/**
 * Seconds between a loaded save and the return.
 *
 * @param result - what `engine.load()` returned; its `timestamp` is when the save was written.
 * @param now - the time of the return, in ms.
 * @returns The offline seconds: 0 for a new game or a failed load.
 */
export function readOfflineSeconds(
  result: Pick<SaveLoadResult, 'success' | 'timestamp'>,
  now: number = Date.now(),
): number {
  if (!result.success || result.timestamp === undefined) return 0;
  return Math.max(0, (now - result.timestamp) / 1000);
}

/**
 * Replay the offline time since a loaded save, when the player's setting
 * allows it. The setting is the Settings panel's "Process offline progress on
 * load" switch; an engine without the settings module always replays.
 *
 * @param engine - the started engine the save was loaded into.
 * @param result - what `engine.load()` returned.
 * @param options - `maxOfflineSeconds` caps the replay, as for `processOfflineTime`.
 * @returns Seconds replayed: 0 for a new game, a failed load or the setting off.
 * @example
 * usePlaySession({
 *   onLoaded: (result) => replayOfflineTime(engine, result, { maxOfflineSeconds: 8 * 3600 }),
 * });
 */
export function replayOfflineTime(
  engine: Pick<Engine, 'tickDriver' | 'tryInject'>,
  result: Pick<SaveLoadResult, 'success' | 'timestamp'>,
  options: ReplayOfflineOptions = {},
): number {
  const { now, ...replay } = options;
  const settings = engine.tryInject(SettingsKey)?.settings;
  if (settings && !settings.offlineProgress.value) return 0;
  const seconds = readOfflineSeconds(result, now);
  if (seconds === 0) return 0;
  return processOfflineTime(engine.tickDriver, seconds, replay);
}
