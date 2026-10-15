import {
  createTimeSystem,
  type EngineModule,
  type InjectionKey,
  type TimeSystem,
} from '@open-loop/engine';
import { createModuleApi } from '@/modules/module-api';
import { createEventLog, type EventLog } from '@/modules/event-log';

/**
 * Telegraph module — the works' wire: the play clock and the line of notices the
 * other modules send down it. It reads none of them.
 */

export type Notice = 'research' | 'build' | 'expo' | 'order' | 'season' | 'warn';

export interface TelegraphApi {
  time: TimeSystem;
  /** the wire: a session log, kinded by notice, so a slot loaded or begun starts it empty */
  log: EventLog<Notice>;
  send(text: string, kind: Notice): void;
}

const LOG_CAP = 60;

export const TelegraphKey: InjectionKey<TelegraphApi> = Symbol(
  'interlocker/telegraph',
) as InjectionKey<TelegraphApi>;

const telegraphApi = createModuleApi(TelegraphKey);

/** The play clock and the wire. Read it after the engine starts. */
export const getTelegraph = telegraphApi.get;

export function createTelegraphModule(): EngineModule {
  return {
    id: 'interlocker/telegraph',
    install(ctx) {
      const time = createTimeSystem();
      const log = createEventLog<Notice>(ctx, {
        cap: LOG_CAP,
        clock: () => time.totalPlayTime.value,
      });
      ctx.onTick((dt) => time.tick(dt));

      telegraphApi.publish(ctx, { time, log, send: log.post });
    },
  };
}
