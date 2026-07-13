import { describe, it, expect } from 'vitest';
import { ref, nextTick } from 'vue';
import { useAutomation } from '../useAutomation';

// A fresh persistence context id per test keeps tier unlock-state isolated
// (createAutomationTiers persists `unlocked` under the given id).
let seq = 0;
const freshId = () => `test-automation-${seq++}`;

describe('useAutomation', () => {
  it('starts at the lowest-order tier with automation off', () => {
    const auto = useAutomation({
      id: freshId(),
      tiers: [
        { id: 'manual', name: 'Manual', order: 0 },
        { id: 'build', name: 'Auto-Build', order: 1 },
      ],
    });
    expect(auto.currentTierId.value).toBe('manual');
    expect(auto.currentTierName.value).toBe('Manual');
    expect(auto.isAutomated.value).toBe(false);
    expect(auto.hasReached('manual')).toBe(true);
    expect(auto.hasReached('build')).toBe(false);
  });

  it('auto-unlocks a tier when its requirement flips true', async () => {
    const gate = ref(false);
    const auto = useAutomation({
      id: freshId(),
      tiers: [
        { id: 'manual', name: 'Manual', order: 0 },
        { id: 'build', name: 'Auto-Build', order: 1, requirement: () => gate.value },
      ],
    });
    expect(auto.hasReached('build')).toBe(false);

    gate.value = true;
    await nextTick();

    expect(auto.hasReached('build')).toBe(true);
    expect(auto.isAutomated.value).toBe(true);
    expect(auto.currentTierName.value).toBe('Auto-Build');
  });

  it('shouldRun gates at most once per throttle interval', () => {
    const auto = useAutomation({
      id: freshId(),
      tiers: [{ id: 'manual', name: 'Manual', order: 0 }],
      throttleInterval: 1,
    });
    // Accumulate below the interval → no fire.
    expect(auto.shouldRun(0.4)).toBe(false);
    expect(auto.shouldRun(0.4)).toBe(false);
    // Cross the interval → one fire.
    expect(auto.shouldRun(0.4)).toBe(true);
    // Immediately after firing, the accumulator is spent again.
    expect(auto.shouldRun(0.4)).toBe(false);
  });

  it('shouldRun fires every tick when throttleInterval is 0 (default)', () => {
    const auto = useAutomation({
      id: freshId(),
      tiers: [{ id: 'manual', name: 'Manual', order: 0 }],
    });
    expect(auto.shouldRun(0.05)).toBe(true);
    expect(auto.shouldRun(0.05)).toBe(true);
  });
});
