import {
  createTimeSystem,
  shallowRef,
  type EngineModule,
  type InjectionKey,
  type ShallowRef,
  type TimeSystem,
} from '@open-loop/engine';

/**
 * Telegraph module — the works' wire: the play clock and the line of notices the
 * other modules send down it. It reads none of them.
 */

export type Notice = 'research' | 'build' | 'expo' | 'order' | 'season' | 'warn';

export interface Wire {
  id: number;
  /** play-seconds when it was sent */
  at: number;
  text: string;
  kind: Notice;
}

export interface TelegraphApi {
  time: TimeSystem;
  /** newest first, capped */
  log: ShallowRef<Wire[]>;
  send(text: string, kind: Notice): void;
}

const LOG_CAP = 60;

export const TelegraphKey: InjectionKey<TelegraphApi> = Symbol(
  'interlocker/telegraph',
) as InjectionKey<TelegraphApi>;

let api: TelegraphApi;

export function getTelegraph(): TelegraphApi {
  return api;
}

export function createTelegraphModule(): EngineModule {
  return {
    id: 'interlocker/telegraph',
    install(ctx) {
      const time = createTimeSystem();
      const log = shallowRef<Wire[]>([]);
      let wireId = 0;
      ctx.onTick((dt) => time.tick(dt));
      // The wire is the session's, not the save's: a slot loaded or begun starts it empty.
      ctx.onLoad(() => (log.value = []));

      api = {
        time,
        log,
        send(text, kind) {
          log.value = [
            { id: ++wireId, at: time.totalPlayTime.value, text, kind },
            ...log.value,
          ].slice(0, LOG_CAP);
        },
      };
      ctx.provide(TelegraphKey, api);
    },
  };
}
