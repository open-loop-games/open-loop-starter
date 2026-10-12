/**
 * Example per-module suite — this is the file layout every game module in the
 * fork should copy: `modules/<name>.test.ts`, beside the module it specs,
 * booting `sim/harness.ts`.
 *
 * What it specs is the automation gate: a policy is inert until its tier
 * unlocks, and live afterwards. Note there is not a single magnitude here — the
 * multiplier's *size* is a balance question that `balance/game-probe.ts`
 * prints, so these assertions survive any retune of `automationMultiplier`.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { boot, getEngine, tick } from '../sim/harness';
import { AutomationKey, CoreKey } from '.';

beforeEach(() => boot());

function automation() {
  return getEngine().tryInject(AutomationKey)!;
}
function core() {
  return getEngine().tryInject(CoreKey)!;
}

describe('automation tier gate', () => {
  it('starts locked on the manual tier', () => {
    expect(automation().tiers.currentTierId.value).toBe('manual');
    expect(automation().tiers.hasReached('assisted')).toBe(false);
  });

  it('ignores the player toggle while the tier is locked', () => {
    const base = core().ratePerSecond.value;
    automation().isActive.value = true;

    expect(automation().automationMultiplier.value).toBe(1);
    expect(core().ratePerSecond.value).toBe(base);
  });

  it('raises the accrual rate once the tier unlocks and the toggle is on', () => {
    const base = core().ratePerSecond.value;

    automation().tiers.unlock('assisted');
    automation().isActive.value = true;

    expect(core().ratePerSecond.value).toBeGreaterThan(base);
  });

  it('accrues more in an automated window than in an equal manual one', async () => {
    const WINDOW = 20;

    await tick(WINDOW);
    const manualGain = core().amount.value;

    automation().tiers.unlock('assisted');
    automation().isActive.value = true;
    await tick(WINDOW);
    const automatedGain = core().amount.value.sub(manualGain);

    expect(automatedGain.gt(manualGain)).toBe(true);
  });
});
