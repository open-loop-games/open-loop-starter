/**
 * AD Infinity Challenges — OL-462.
 *
 * Covers IC1 (Combined), IC2 (Sacrifice), IC3 (Tickspeed). Restrictions and
 * rewards all live as gated entries on the modifier chain, so the tests walk
 * `productionChain.apply(1)` and per-dim `rateChain` / `computedRate` values
 * to confirm wiring, with a separate cadence test for IC2's tick handler.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { nextTick } from 'vue';
import { Decimal } from 'open-loop-engine';
import { bootMod, type BootHandle } from '@/test/bootMod';
import { settingsModule } from '@/modules/settings';
import { uiRegistryModule } from '@/modules/ui-registry';
import {
  antimatterDimensionsModule,
  AntimatterDimensionsKey,
  type AntimatterDimensionsState,
} from '@/modules/mods/antimatter-dimensions';

interface ADBoot {
  handle: BootHandle;
  state: AntimatterDimensionsState;
}

function bootAD(): ADBoot {
  const handle = bootMod({
    modules: [settingsModule, uiRegistryModule, antimatterDimensionsModule],
    namespacePrefix: 'ad-challenges',
  });
  const state = handle.engine.tryInject(AntimatterDimensionsKey);
  if (!state) {
    handle.dispose();
    throw new Error('AD state not provided after start()');
  }
  return { handle, state };
}

describe('AD Infinity Challenges (OL-462)', () => {
  let boot: ADBoot;
  let state: AntimatterDimensionsState;

  beforeEach(() => {
    boot = bootAD();
    state = boot.state;
  });

  afterEach(() => {
    boot.handle.dispose();
  });

  // --- Wiring / registration --------------------------------------------------

  it('registers three Infinity Challenges', () => {
    const all = state.challenges.getAll();
    expect(all.map((e) => e.def.id)).toEqual([
      'ic1-combined',
      'ic2-sacrifice',
      'ic3-tickspeed',
    ]);
  });

  // --- Completions persist across Layer 1 reset -------------------------------

  it('completions survive Layer 1 reset (entering and exiting a challenge)', () => {
    state.ic1.enter();
    state.ic1.complete();
    expect(state.ic1.completions.value).toBe(1);
    expect(state.ic1.active.value).toBe(false);

    state.layer1Reset.reset();
    expect(state.ic1.completions.value).toBe(1);
    // antimatter + boostCount etc. reset through ad-layer0 scope
    expect(Decimal.eq(state.boostCount.value, 0)).toBe(true);
  });

  // --- IC1 restriction: Dim 4 suppression + Dim Boost cancel ------------------

  it('IC1 zeroes the Fourth Dimension rate while active, restores on exit', async () => {
    const baseline = Decimal.fromValue(state.dims[3].rateChain.apply(10));
    expect(Decimal.gt(baseline, 0)).toBe(true);

    state.ic1.enter();
    await nextTick();
    expect(Decimal.eq(state.dims[3].rateChain.apply(10), 0)).toBe(true);

    state.ic1.exit();
    await nextTick();
    expect(Decimal.eq(state.dims[3].rateChain.apply(10), baseline)).toBe(true);
  });

  it('IC1 cancels the Dim Boost productionChain multiplier while active', async () => {
    // Enter first (reset wipes boostCount), then earn a boost inside the challenge.
    state.ic1.enter();
    state.dims[7].count.value = new Decimal(10);
    state.doBoost();
    await nextTick();

    // Outside IC1 a single boost gives ×1.5. With IC1 active the cancel
    // modifier stacks its inverse so the boost contribution is ×1.
    const inside = Decimal.fromValue(state.productionChain.apply(1));
    // baseline (no boost, no IC) is 1
    expect(Decimal.eq(inside, 1)).toBe(true);

    state.ic1.exit();
    await nextTick();
    const outside = Decimal.fromValue(state.productionChain.apply(1));
    expect(Decimal.eq(outside, 1.5)).toBe(true);
  });

  // --- IC2 restriction: auto-sacrifice cadence --------------------------------

  it('IC2 auto-fires Dimensional Sacrifice every 400ms while active', async () => {
    state.ic2.enter();
    // Seed Dim 1 count (sacrifice gain reads it) and a Dim 8 so canSacrifice.
    state.dims[0].count.value = new Decimal(1e8);
    state.dims[7].count.value = new Decimal(1);

    expect(Decimal.eq(state.sacrificeMult.value, 1)).toBe(true);

    // tickRate defaults to 20 Hz → 50ms/tick. 16 ticks ≈ 800ms ≥ two 400ms intervals.
    // Re-seed Dim 1 each tick because sacrifice zeros it.
    for (let i = 0; i < 16; i++) {
      state.dims[0].count.value = new Decimal(1e8);
      state.dims[7].count.value = new Decimal(1);
      await boot.handle.tick();
    }

    expect(Decimal.gt(state.sacrificeMult.value, 1)).toBe(true);
  });

  it('IC2 auto-sacrifice stops after exit', async () => {
    state.ic2.enter();
    state.dims[0].count.value = new Decimal(1e8);
    state.dims[7].count.value = new Decimal(1);
    for (let i = 0; i < 16; i++) {
      state.dims[0].count.value = new Decimal(1e8);
      state.dims[7].count.value = new Decimal(1);
      await boot.handle.tick();
    }
    const afterActive = Decimal.fromValue(state.sacrificeMult.value);
    expect(Decimal.gt(afterActive, 1)).toBe(true);

    state.ic2.exit();
    state.dims[0].count.value = new Decimal(1e8);
    state.dims[7].count.value = new Decimal(1);
    for (let i = 0; i < 16; i++) {
      await boot.handle.tick();
    }
    expect(Decimal.eq(state.sacrificeMult.value, afterActive)).toBe(true);
  });

  // --- IC3 restriction: tickspeed rewire --------------------------------------

  it('IC3 rewires tickspeed multiplier to (1.05 + 0.005·g)^n while active', async () => {
    state.ic3.enter();
    // Reset wiped everything. Set tickspeed only (keep galaxies=0) so the
    // rewire factor isolates to (1.05)^10 without galaxy-mult confounding.
    state.tickspeed.amount.value = new Decimal(10);
    await nextTick();

    // productionChain while IC3 active with galaxies=0:
    //   1.1^10 (default tickspeed-mult) × 1/1.1^10 (IC3 cancel) × 1.05^10 (IC3 rewire)
    //   = 1.05^10
    const expected = Math.pow(1.05, 10);
    const actual = Decimal.fromValue(state.productionChain.apply(1)).toNumber();
    expect(Math.abs(actual - expected)).toBeLessThan(1e-6);

    state.ic3.exit();
    await nextTick();
    // Outside IC3 the default 1.1^10 applies instead (cancel + rewire both deactivate).
    const expectedOutside = Math.pow(1.1, 10);
    const actualOutside = Decimal.fromValue(state.productionChain.apply(1)).toNumber();
    expect(Math.abs(actualOutside - expectedOutside)).toBeLessThan(1e-6);
  });

  it('IC3 rewire scales with galaxyCount via (1.05 + 0.005·g)^n', async () => {
    state.ic3.enter();
    state.tickspeed.amount.value = new Decimal(10);
    state.galaxyCount.value = new Decimal(5);
    await nextTick();

    // With galaxies=5 the galaxy-mult entry is ALSO active (1.5^5):
    //   1.1^10 × 1/1.1^10 × (1.05 + 0.025)^10 × 1.5^5
    //   = 1.075^10 × 1.5^5
    const expected = Math.pow(1.075, 10) * Math.pow(1.5, 5);
    const actual = Decimal.fromValue(state.productionChain.apply(1)).toNumber();
    expect(Math.abs(actual - expected) / expected).toBeLessThan(1e-6);
  });

  // --- Rewards gate on completion ---------------------------------------------

  it('IC1 completion permanently stacks ×1.3 onto productionChain', async () => {
    // Baseline at fresh boot: no chain modifiers active.
    expect(Decimal.eq(state.productionChain.apply(1), 1)).toBe(true);

    state.ic1.enter();
    state.ic1.complete();
    await nextTick();
    expect(state.ic1.completions.value).toBe(1);
    expect(state.ic1.active.value).toBe(false);

    // Reward modifier is the only active chain entry (layer0 was just reset).
    const after = Decimal.fromValue(state.productionChain.apply(1)).toNumber();
    expect(Math.abs(after - 1.3)).toBeLessThan(1e-9);

    // Reward survives a further Layer 1 reset.
    state.layer1Reset.reset();
    await nextTick();
    const afterReset = Decimal.fromValue(state.productionChain.apply(1)).toNumber();
    expect(Math.abs(afterReset - 1.3)).toBeLessThan(1e-9);
  });

  it('stacking completions across three ICs gives ×1.3^3 on productionChain', async () => {
    state.ic1.enter();
    state.ic1.complete();
    state.ic2.enter();
    state.ic2.complete();
    state.ic3.enter();
    state.ic3.complete();
    await nextTick();

    const total = Decimal.fromValue(state.productionChain.apply(1)).toNumber();
    const expected = Math.pow(1.3, 3);
    expect(Math.abs(total - expected)).toBeLessThan(1e-9);
  });

  // --- Mutual exclusion --------------------------------------------------------

  it('entering a second challenge exits the first', () => {
    state.ic1.enter();
    expect(state.ic1.active.value).toBe(true);
    state.ic2.enter();
    expect(state.ic1.active.value).toBe(false);
    expect(state.ic2.active.value).toBe(true);
  });

  // --- Start gate after completion --------------------------------------------

  it('maxed challenge cannot be re-entered (completionLimit = 1)', () => {
    state.ic1.enter();
    state.ic1.complete();
    expect(state.ic1.maxed.value).toBe(true);
    expect(state.ic1.canStart.value).toBe(false);
    expect(state.ic1.enter()).toBe(false);
  });
});
