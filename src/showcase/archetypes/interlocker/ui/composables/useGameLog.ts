import { readonly, ref, type DeepReadonly, type Ref } from 'vue';

/**
 * Session-scoped event log — canon's right-rail console. Newest entry first,
 * capped to a ring of the most recent messages. State is a module-level
 * singleton so it survives tab switches; `useLogFeed` clears it at the start of
 * each game session (it is intentionally not persisted — canon's log is a
 * running console, not save state).
 */
export type LogTone = 'event' | 'good' | 'bad';

export interface LogEntry {
  id: number;
  text: string;
  tone: LogTone;
}

const MAX_ENTRIES = 60;
const entries = ref<LogEntry[]>([]);
let seq = 0;

export interface GameLogApi {
  entries: DeepReadonly<Ref<LogEntry[]>>;
  log: (text: string, tone?: LogTone) => void;
  clear: () => void;
}

export function useGameLog(): GameLogApi {
  function log(text: string, tone: LogTone = 'event'): void {
    entries.value.unshift({ id: seq++, text, tone });
    if (entries.value.length > MAX_ENTRIES) entries.value.length = MAX_ENTRIES;
  }
  function clear(): void {
    entries.value = [];
  }
  return { entries: readonly(entries), log, clear };
}
