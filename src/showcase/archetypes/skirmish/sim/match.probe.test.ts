import { describe, it, expect, beforeEach } from 'vitest';
import { boot, getEngine, tick, TICK_RATE } from './harness';
import { MatchKey, type MatchApi, type MatchEndedPayload } from '../modules';

/**
 * Behavioral spec for the match spine (bone #1). Drives the real engine
 * tick-by-tick — specs *what the lifecycle does*, not economy magnitudes.
 */

function match(): MatchApi {
  const m = getEngine().tryInject(MatchKey);
  if (!m) throw new Error('skirmish/match not installed');
  return m;
}

describe('skirmish match spine', () => {
  beforeEach(() => boot());

  it('is idle until started', () => {
    expect(match().inMatch.value).toBe(false);
    expect(match().outcome.value).toBeNull();
  });

  it('opens a live match on start()', () => {
    match().start();
    expect(match().inMatch.value).toBe(true);
    expect(match().outcome.value).toBeNull();
  });

  it('advances the match clock while live', async () => {
    match().start();
    await tick(TICK_RATE); // one game-second
    expect(match().matchTimeElapsed.value).toBeGreaterThan(0.9);
    expect(match().matchTimeElapsed.value).toBeLessThan(1.1);
  });

  it('ends on externally-reported defeat and stops the clock', async () => {
    let captured: MatchEndedPayload | null = null;
    match().on('matchEnded', (p) => (captured = p));

    match().start();
    await tick(TICK_RATE);
    const elapsedAtEnd = match().matchTimeElapsed.value;
    match().end({ winner: 'a', reason: 'defeat' });

    // matchEnded fired with the pre-reset elapsed + winner.
    expect(captured).not.toBeNull();
    expect(captured!.outcome).toEqual({ winner: 'a', reason: 'defeat' });
    expect(captured!.elapsedSec).toBeCloseTo(elapsedAtEnd, 5);

    // Match no longer live; the result persists (readable between matches).
    expect(match().inMatch.value).toBe(false);
    expect(match().outcome.value).toEqual({ winner: 'a', reason: 'defeat' });

    // Clock does not advance once ended.
    await tick(TICK_RATE);
    expect(match().matchTimeElapsed.value).toBeCloseTo(elapsedAtEnd, 5);
  });

  it('end() is idempotent — first outcome wins', () => {
    let count = 0;
    match().on('matchEnded', () => (count += 1));
    match().start();
    match().end({ winner: 'a', reason: 'defeat' });
    match().end({ winner: 'b', reason: 'defeat' });
    expect(count).toBe(1);
    expect(match().outcome.value).toEqual({ winner: 'a', reason: 'defeat' });
  });

  it('start() re-opens a fresh match after a prior result', () => {
    match().start();
    match().end({ winner: 'a', reason: 'defeat' });
    match().start();
    expect(match().inMatch.value).toBe(true);
    expect(match().outcome.value).toBeNull();
    expect(match().matchTimeElapsed.value).toBe(0);
  });
});
