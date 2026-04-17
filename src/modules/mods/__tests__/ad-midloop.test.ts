/**
 * AD Layer 0+ mid-loop mechanics — OL-467.
 *
 * Exercises the four shallow primitives laid on top of the Layer 0 dimension
 * cascade: Dim Boost, Antimatter Galaxy, Tickspeed, Dimensional Sacrifice.
 * Verifies reset scope, multiplier application, and that Layer 1 (Infinity)
 * clears everything through the `'ad-layer0'` module scope.
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
    namespacePrefix: 'ad-midloop',
  });
  const state = handle.engine.tryInject(AntimatterDimensionsKey);
  if (!state) {
    handle.dispose();
    throw new Error('AD state not provided after start()');
  }
  return { handle, state };
}

describe('AD mid-loop mechanics (OL-467)', () => {
  let boot: ADBoot;
  let state: AntimatterDimensionsState;

  beforeEach(() => {
    boot = bootAD();
    state = boot.state;
  });

  afterEach(() => {
    boot.handle.dispose();
  });

  it('exposes all 8 dimension tiers', () => {
    expect(state.dims).toHaveLength(8);
    expect(state.dims[7].def.name).toBe('Eighth Dimension');
  });

  // --- Dim Boost ---

  it('doBoost is gated on Dim 8 count >= boostCost', () => {
    expect(state.canBoost.value).toBe(false);
    state.dims[7].count.value = new Decimal(10);
    expect(state.canBoost.value).toBe(true);
  });

  it('doBoost resets Dim 1-7 counts and purchasable levels, preserves Dim 8 and antimatter', () => {
    state.dims[7].count.value = new Decimal(10);
    for (let i = 0; i < 7; i++) {
      state.dims[i].count.value = new Decimal(100);
      state.dims[i].purchasable.amount.value = new Decimal(5);
    }
    state.antimatter.value = new Decimal(1e50);

    const ok = state.doBoost();
    expect(ok).toBe(true);
    expect(state.boostCount.value).toEqual(new Decimal(1));
    for (let i = 0; i < 7; i++) {
      expect(Decimal.eq(state.dims[i].count.value, 0)).toBe(true);
      expect(Decimal.eq(state.dims[i].purchasable.amount.value, 0)).toBe(true);
    }
    expect(Decimal.eq(state.dims[7].count.value, 10)).toBe(true);
    expect(Decimal.eq(state.antimatter.value, 1e50)).toBe(true);
  });

  it('doBoost applies +0.5× per boost to productionChain', async () => {
    state.dims[7].count.value = new Decimal(100);
    const before = Decimal.fromValue(state.productionChain.apply(1));
    state.doBoost();
    await nextTick();
    const after = Decimal.fromValue(state.productionChain.apply(1));
    expect(Decimal.gt(after, before)).toBe(true);
    // +0.5× with 1 boost = 1.5×
    expect(Decimal.eq(Decimal.div(after, before), 1.5)).toBe(true);
  });

  it('boostCost scales with boostCount', () => {
    expect(Decimal.eq(state.boostCost.value, 10)).toBe(true);
    state.dims[7].count.value = new Decimal(100);
    state.doBoost();
    expect(Decimal.eq(state.boostCost.value, 12)).toBe(true);
  });

  // --- Antimatter Galaxy ---

  it('doGalaxy is gated on Dim 8 count >= galaxyCost', () => {
    expect(state.canGalaxy.value).toBe(false);
    state.dims[7].count.value = new Decimal(80);
    expect(state.canGalaxy.value).toBe(true);
  });

  it('doGalaxy resets Dim 1-7 state AND boostCount, preserves antimatter', () => {
    state.dims[7].count.value = new Decimal(100);
    for (let i = 0; i < 7; i++) {
      state.dims[i].count.value = new Decimal(50);
    }
    state.antimatter.value = new Decimal(1e50);
    // Accrue a boost first
    state.doBoost();
    expect(Decimal.eq(state.boostCount.value, 1)).toBe(true);

    state.dims[7].count.value = new Decimal(100);
    for (let i = 0; i < 7; i++) {
      state.dims[i].count.value = new Decimal(50);
    }

    const ok = state.doGalaxy();
    expect(ok).toBe(true);
    expect(Decimal.eq(state.galaxyCount.value, 1)).toBe(true);
    expect(Decimal.eq(state.boostCount.value, 0)).toBe(true);
    for (let i = 0; i < 7; i++) {
      expect(Decimal.eq(state.dims[i].count.value, 0)).toBe(true);
    }
    expect(Decimal.eq(state.antimatter.value, 1e50)).toBe(true);
  });

  it('doGalaxy applies 1.5^galaxyCount to productionChain', async () => {
    state.dims[7].count.value = new Decimal(1000);
    const base = Decimal.fromValue(state.productionChain.apply(1));
    state.doGalaxy();
    await nextTick();
    const after = Decimal.fromValue(state.productionChain.apply(1));
    // boost mult drops back to 1 since galaxy reset boostCount, then ×1.5 for galaxy
    expect(Decimal.eq(Decimal.div(after, base), 1.5)).toBe(true);
  });

  // --- Tickspeed ---

  it('tickspeed purchase scales productionChain by 1.1^amount', async () => {
    state.antimatter.value = new Decimal(1e20);
    const base = Decimal.fromValue(state.productionChain.apply(1));
    state.tickspeed.purchase();
    state.tickspeed.purchase();
    expect(Decimal.eq(state.tickspeed.amount.value, 2)).toBe(true);
    await nextTick();
    const after = Decimal.fromValue(state.productionChain.apply(1));
    // 1.1^2 = 1.21
    const ratio = Decimal.div(after, base);
    expect(Math.abs(ratio.toNumber() - 1.21)).toBeLessThan(1e-9);
  });

  // --- Sacrifice ---

  it('doSacrifice is gated on Dim 8 count >= 1', () => {
    expect(state.canSacrifice.value).toBe(false);
    state.dims[7].count.value = new Decimal(1);
    expect(state.canSacrifice.value).toBe(true);
  });

  it('doSacrifice folds gain into sacrificeMult and zeros Dim 1-7 counts, preserves Dim 8', () => {
    state.dims[0].count.value = new Decimal(1_000_000);
    state.dims[7].count.value = new Decimal(2);
    for (let i = 1; i < 7; i++) {
      state.dims[i].count.value = new Decimal(100);
    }
    const expectedGain = state.sacrificeGain.value;

    const ok = state.doSacrifice();
    expect(ok).toBe(true);
    expect(Decimal.eq(state.sacrificeMult.value, expectedGain)).toBe(true);
    for (let i = 0; i < 7; i++) {
      expect(Decimal.eq(state.dims[i].count.value, 0)).toBe(true);
    }
    expect(Decimal.eq(state.dims[7].count.value, 2)).toBe(true);
  });

  it('sacrifice multiplier applies to Dim 8 rate chain specifically', async () => {
    state.dims[0].count.value = new Decimal(1_000_000);
    state.dims[7].count.value = new Decimal(1);
    const before = Decimal.fromValue(state.dims[7].rateChain.apply(1));
    state.doSacrifice();
    await nextTick();
    const after = Decimal.fromValue(state.dims[7].rateChain.apply(1));
    expect(Decimal.gt(after, before)).toBe(true);
  });

  // --- Layer 1 cascade ---

  it('Layer 1 reset clears all mid-loop state through the ad-layer0 scope', () => {
    state.dims[7].count.value = new Decimal(100);
    state.doBoost();
    state.antimatter.value = new Decimal(1e20);
    state.tickspeed.purchase();
    state.dims[0].count.value = new Decimal(1_000_000);
    state.dims[7].count.value = new Decimal(1);
    state.doSacrifice();

    expect(Decimal.gt(state.boostCount.value, 0)).toBe(true);
    expect(Decimal.gt(state.tickspeed.amount.value, 0)).toBe(true);
    expect(Decimal.gt(state.sacrificeMult.value, 1)).toBe(true);

    state.layer1Reset.reset();

    expect(Decimal.eq(state.boostCount.value, 0)).toBe(true);
    expect(Decimal.eq(state.galaxyCount.value, 0)).toBe(true);
    expect(Decimal.eq(state.tickspeed.amount.value, 0)).toBe(true);
    expect(Decimal.eq(state.sacrificeMult.value, 1)).toBe(true);
  });
});
