import {
  persistent,
  shallowRef,
  type EngineContext,
  type Ref,
  type Serializable,
} from '@open-loop/engine';

/** One line of an event log. */
export interface EventLine<K extends string = string, X = undefined> {
  /** From 1, never reused, so `since(seq)` is a cursor. */
  seq: number;
  /** `clock()` when the line was posted. */
  at: number;
  kind: K;
  text: string;
  extra?: X;
}

export interface EventLogOptions<K extends string> {
  /** Lines kept; the oldest go first. */
  cap: number;
  /** The time a line is stamped with, usually play-seconds. */
  clock: () => number;
  /** Kind of a line posted without one, and of `initial` lines. */
  defaultKind?: K;
  /**
   * Saves the log under this id in the module's persistent context; `extra`
   * must then be serializable. Without it, the log belongs to the play
   * session and a load empties it.
   */
  persistId?: string;
  /** Lines a fresh log opens with. */
  initial?: readonly string[];
}

export interface EventLog<K extends string = string, X = undefined> {
  /** Oldest first. */
  lines: Readonly<Ref<readonly EventLine<K, X>[]>>;
  post(text: string, kind?: K, extra?: X): void;
  /** Lines posted after the line numbered `seq`, oldest first. */
  since(seq: number): readonly EventLine<K, X>[];
  /** Empty the log; numbering continues. */
  clear(): void;
}

/**
 * Create a capped log of game events inside a module's `install()`.
 *
 * @param ctx - the installing module's engine context.
 * @param options - the cap, the clock, and whether the save keeps the log.
 * @returns the log: its lines and the means to post to it.
 * @example
 * const log = createEventLog<'build' | 'warn'>(ctx, { cap: 60, clock: () => time.totalPlayTime.value });
 * log.post('The mill turns.', 'build');
 */
export function createEventLog<K extends string = 'plain', X = undefined>(
  ctx: EngineContext,
  options: EventLogOptions<K>,
): EventLog<K, X> {
  const { cap, clock, persistId } = options;
  const defaultKind = (options.defaultKind ?? 'plain') as K;
  const opening = (options.initial ?? []).map((text, i): EventLine<K, X> => ({
    seq: i + 1,
    at: 0,
    kind: defaultKind,
    text,
  }));

  let lines: Ref<EventLine<K, X>[]>;
  let seq: Ref<number>;
  if (persistId === undefined) {
    lines = shallowRef(opening);
    seq = shallowRef(opening.length);
    // A session log belongs to the play session, not the save: loading a slot
    // or beginning a new game on the same engine starts it empty.
    ctx.onLoad(() => {
      lines.value = [];
    });
  } else {
    // `persistent` cannot prove a generic `X` serializable; the persistId doc
    // states the requirement instead.
    lines = persistent(opening as unknown as Serializable[], { id: persistId }) as unknown as Ref<
      EventLine<K, X>[]
    >;
    // Saved beside the lines, so numbering never reuses a seq across a load.
    seq = persistent(opening.length, { id: `${persistId}-seq` });
  }

  return {
    lines,
    post(text, kind = defaultKind, extra) {
      const line: EventLine<K, X> = { seq: ++seq.value, at: clock(), kind, text };
      if (extra !== undefined) line.extra = extra;
      lines.value = [...lines.value, line].slice(-cap);
    },
    since(after) {
      return lines.value.filter((l) => l.seq > after);
    },
    clear() {
      lines.value = [];
    },
  };
}
