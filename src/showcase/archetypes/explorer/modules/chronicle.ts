import {
  createTimeSystem,
  persistent,
  shallowRef,
  type EngineModule,
  type InjectionKey,
  type Persistent,
  type ShallowRef,
  type TimeSystem,
} from '@open-loop/engine';

/**
 * Chronicle module — the hunt's record: the play clock, the spoor log, the
 * beats the epilogue and the probe read, and whether the Hart is taken. The
 * other modules write to it; it reads none of them.
 */

export type Tone = 'plain' | 'good' | 'bad' | 'find';

export interface LogEntry {
  id: number;
  at: number;
  text: string;
  tone: Tone;
}

/** A beat the probe and the epilogue read: what happened, at what play-second. */
export interface Beat {
  label: string;
  at: number;
}

export interface ChronicleApi {
  time: TimeSystem;
  /** newest first, capped */
  log: ShallowRef<LogEntry[]>;
  beats: Persistent<Beat[]>;
  /** the Hart is taken: every clock in the wold stops */
  won: Persistent<boolean>;
  say(text: string, tone?: Tone): void;
  /** record a beat the first time it happens; later calls are ignored */
  beat(label: string): void;
}

const LOG_CAP = 60;

export const ChronicleKey: InjectionKey<ChronicleApi> = Symbol(
  'explorer/chronicle',
) as InjectionKey<ChronicleApi>;

let api: ChronicleApi;

export function getChronicle(): ChronicleApi {
  return api;
}

export function createChronicleModule(): EngineModule {
  return {
    id: 'explorer/chronicle',
    install(ctx) {
      const time = createTimeSystem();
      const log = shallowRef<LogEntry[]>([]);
      let logId = 0;
      const beats = persistent<Beat[]>([], { id: 'beats', lifetime: true });
      const won = persistent(false, { id: 'won', lifetime: true });
      ctx.onTick((dt) => {
        if (!won.value) time.tick(dt);
      });

      api = {
        time,
        log,
        beats,
        won,
        say(text, tone = 'plain') {
          log.value = [
            { id: ++logId, at: time.totalPlayTime.value, text, tone },
            ...log.value,
          ].slice(0, LOG_CAP);
        },
        beat(label) {
          if (beats.value.some((b) => b.label === label)) return;
          beats.value = [...beats.value, { label, at: Math.round(time.totalPlayTime.value) }];
        },
      };
      ctx.provide(ChronicleKey, api);
    },
  };
}
