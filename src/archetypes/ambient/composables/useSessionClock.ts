import { inject } from 'vue';
import type { Engine } from 'open-loop-engine';
import { SessionClockKey, type SessionClock } from '../modules';

/**
 * Access the session-clock surface. AppRoot owns the resume sequence: writes
 * `lastResumeGapSec.value` from `engine.load().timestamp`, then calls
 * `refreshElapsedAtResume()` after `processOfflineTime` returns.
 */
export function useSessionClock(): SessionClock {
  const engine = inject<Engine>('engine');
  const clock = engine?.tryInject(SessionClockKey);
  if (!clock) {
    throw new Error('useSessionClock() called outside an active ambient engine');
  }
  return clock;
}
