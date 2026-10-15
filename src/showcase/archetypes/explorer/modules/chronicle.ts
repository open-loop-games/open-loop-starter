import {
  createTimeSystem,
  persistent,
  type EngineModule,
  type InjectionKey,
  type Persistent,
  type TimeSystem,
} from '@open-loop/engine';
import { createEventLog, type EventLog } from '@/modules/event-log';
import { createModuleApi } from '@/modules/module-api';

/**
 * Chronicle module — the hunt's record: the play clock, the spoor log, the
 * beats the epilogue and the probe read, and whether the Hart is taken. The
 * other modules write to it; it reads none of them.
 */

export type Tone = 'plain' | 'good' | 'bad' | 'find';

/** A beat the probe and the epilogue read: what happened, at what play-second. */
export interface Beat {
  label: string;
  at: number;
}

export interface ChronicleApi {
  time: TimeSystem;
  /** the spoor: a session log, kinded by tone */
  log: EventLog<Tone>;
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

const chronicleApi = createModuleApi(ChronicleKey);

/** The play clock, the spoor log, the beats and the ending. Read it after the engine starts. */
export const getChronicle = chronicleApi.get;

export function createChronicleModule(): EngineModule {
  return {
    id: 'explorer/chronicle',
    install(ctx) {
      const time = createTimeSystem();
      const log = createEventLog<Tone>(ctx, {
        cap: LOG_CAP,
        clock: () => time.totalPlayTime.value,
      });
      const beats = persistent<Beat[]>([], { id: 'beats', lifetime: true });
      const won = persistent(false, { id: 'won', lifetime: true });
      ctx.onTick((dt) => {
        if (!won.value) time.tick(dt);
      });

      const api: ChronicleApi = {
        time,
        log,
        beats,
        won,
        say: log.post,
        beat(label) {
          if (beats.value.some((b) => b.label === label)) return;
          beats.value = [...beats.value, { label, at: Math.round(time.totalPlayTime.value) }];
        },
      };
      chronicleApi.publish(ctx, api);
    },
  };
}
