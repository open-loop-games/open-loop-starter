import { describe, it, expect } from 'vitest';
import type { EngineModule } from '@open-loop/engine';
import { bootTestEngine } from '@/test/bootTestEngine';
import { createEventLog, type EventLog, type EventLogOptions } from '../event-log';

type Kind = 'plain' | 'warn';

function bootLog(options: Partial<EventLogOptions<Kind>> = {}) {
  let now = 0;
  let log!: EventLog<Kind, { amount: number }>;
  const mod: EngineModule = {
    id: 'test/log',
    install(ctx) {
      log = createEventLog<Kind, { amount: number }>(ctx, {
        cap: 3,
        clock: () => now,
        ...options,
      });
    },
  };
  const handle = bootTestEngine({ modules: [mod] });
  return {
    ...handle,
    log: () => log,
    setNow: (t: number) => {
      now = t;
    },
  };
}

describe('createEventLog', () => {
  it('posts lines oldest first, stamped with seq, clock and kind', () => {
    const { log, setNow } = bootLog({ defaultKind: 'plain' });
    setNow(5);
    log().post('first');
    setNow(7);
    log().post('second', 'warn', { amount: 2 });

    expect(log().lines.value).toEqual([
      { seq: 1, at: 5, kind: 'plain', text: 'first' },
      { seq: 2, at: 7, kind: 'warn', text: 'second', extra: { amount: 2 } },
    ]);
  });

  it('stamps every line 0 when the log has no clock', () => {
    let log!: EventLog;
    bootTestEngine({
      modules: [
        {
          id: 'test/untimed',
          install(ctx) {
            log = createEventLog(ctx, { cap: 3 });
          },
        },
      ],
    });
    log.post('untimed');
    expect(log.lines.value).toEqual([{ seq: 1, at: 0, kind: 'plain', text: 'untimed' }]);
  });

  it('keeps the newest lines up to the cap', () => {
    const { log } = bootLog();
    for (const text of ['a', 'b', 'c', 'd']) log().post(text);
    expect(log().lines.value.map((l) => l.text)).toEqual(['b', 'c', 'd']);
  });

  it('reads the lines after a cursor', () => {
    const { log } = bootLog();
    for (const text of ['a', 'b', 'c']) log().post(text);
    expect(
      log()
        .since(1)
        .map((l) => l.text),
    ).toEqual(['b', 'c']);
    expect(log().since(3)).toEqual([]);
  });

  it('keeps counting after clear, so a cursor stays valid', () => {
    const { log } = bootLog();
    log().post('a');
    log().clear();
    log().post('b');
    expect(log().lines.value).toMatchObject([{ seq: 2, text: 'b' }]);
  });

  it('is the session’s, not the save’s: a load starts it empty', () => {
    const { engine, log } = bootLog();
    engine.save();
    log().post('before load');
    engine.load();
    expect(log().lines.value).toEqual([]);
  });

  describe('persisted', () => {
    it('opens a fresh log with its initial lines', () => {
      const { log } = bootLog({ persistId: 'log', initial: ['It begins.'], defaultKind: 'warn' });
      expect(log().lines.value).toEqual([{ seq: 1, at: 0, kind: 'warn', text: 'It begins.' }]);
    });

    it('restores the saved lines on load', () => {
      const { engine, log } = bootLog({ persistId: 'log' });
      log().post('saved');
      engine.save();
      log().post('lost');
      engine.load();
      expect(log().lines.value.map((l) => l.text)).toEqual(['saved']);
    });

    it('numbers past the loaded lines', () => {
      const { engine, log } = bootLog({ persistId: 'log' });
      log().post('a');
      log().post('b');
      engine.save();
      log().clear();
      engine.load();
      log().post('c');
      expect(log().lines.value.map((l) => l.seq)).toEqual([1, 2, 3]);
    });
  });
});
