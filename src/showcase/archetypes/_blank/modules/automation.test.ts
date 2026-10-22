/**
 * Example per-module suite — this is the file layout every game module in the
 * fork should copy: `modules/<name>.test.ts`, beside the module it specs,
 * booting `sim/harness.ts`.
 *
 * What it specs is the automation tier: a policy is inert until its tier
 * unlocks, and live afterwards. Note there is not a single magnitude here — the
 * multiplier's *size* is a balance question that `balance/game-probe.ts`
 * prints, so these assertions survive any retune of `automationMultiplier`.
 *
 * It specs the example economy, so it goes, or is reshaped, with
 * `automation.ts`. Keep the layout, not the file.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { GameStateAccessorKey } from '@open-loop/engine';
import { boot, getEngine, tick } from '../sim/harness';
import { getAutomation as automation, getCore as core } from '.';

beforeEach(() => boot());

describe('assisted automation tier', () => {
  it('starts locked on the manual tier', () => {
    expect(automation().tiers.currentTierId.value).toBe('manual');
    expect(automation().tiers.hasReached('assisted')).toBe(false);
  });

  it('unlocks when its flag is set through the game-state accessor', () => {
    getEngine().tryInject(GameStateAccessorKey)!.setFlag('assistance-unlocked', true);

    expect(automation().tiers.hasReached('assisted')).toBe(true);
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
