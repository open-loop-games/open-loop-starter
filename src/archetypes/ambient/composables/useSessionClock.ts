import { useModule } from '@/composables/useModule';
import { SessionClockKey, type SessionClock } from '../modules';

/**
 * Access the session-clock surface. AppRoot owns the resume sequence: writes
 * `lastResumeGapSec.value` from `engine.load().timestamp`, then calls
 * `refreshElapsedAtResume()` after `processOfflineTime` returns.
 */
export function useSessionClock(): SessionClock {
  return useModule(SessionClockKey);
}
