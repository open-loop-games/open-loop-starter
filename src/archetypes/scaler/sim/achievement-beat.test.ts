/**
 * Regression locks for the Scaler achievements beat — predicate flip earns
 * a row, multiplicative grants surface in the named rateChain, counter
 * grants additively contribute to free-X aggregator chains, and the global
 * AP curve binding is live on coin + prestige tier rateChains.
 *
 * Per `archetypes/BALANCING.md` § Theme 5: tests lock observable behavior;
 * discovery is elsewhere. Here the locks are mechanical (predicate watch
 * fires same tick; chain.bindings() includes named source) — no balance
 * discovery surface in this beat.
 *
 * First-arc filter: `SCALER_ACHIEVEMENTS` excludes Reincarnation+ groups,
 * so the registered set is only first-arc rows (firstOwnedCoin .. challenge5
 * + ungrouped free row).
 */

import { describe, it, expect } from 'vitest';
import { nextTick } from 'vue';
import { Decimal, runUntil } from '@open-loop/engine';
import { createScalerEngine, SCALER_MOD_ID } from '../boot';
import {
  getAchievementsCategory,
  getAchievementPoints,
  getCoinProducers,
  getDiamondProducers,
  getCoinFreeAcceleratorChain,
  getCoinFreeMultiplierChain,
  getCoinAcceleratorPowerBonusChain,
  getTranscendFreeAccelBoostChain,
} from '../modules';

const TICK_DELTA = 1;

describe('scaler achievement-beat lock', () => {
  it('free-achievement row earns immediately on engine start', async () => {
    const { engine } = createScalerEngine({
      persistenceNamespace: `ach-free-${Math.random().toString(36).slice(2)}`,
    });
    engine.selectMod(SCALER_MOD_ID);
    engine.start();

    await nextTick();

    const cat = getAchievementsCategory();
    const free = cat.getAchievement('free-achievement');
    expect(free?.earned.value).toBe(true);
    engine.dispose();
  });

  it('coin-threshold predicate flip auto-earns the row', () => {
    const { engine } = createScalerEngine({
      persistenceNamespace: `ach-coin1-${Math.random().toString(36).slice(2)}`,
    });
    engine.selectMod(SCALER_MOD_ID);
    engine.start();

    // First coin producer's first-buy threshold (firstOwnedCoin >= 1).
    const cat = getAchievementsCategory();
    const ach = cat.getAchievement('firstOwnedCoin-1');
    expect(ach?.earned.value).toBe(false);

    const result = runUntil({
      engine,
      tickDelta: TICK_DELTA,
      maxSimTime: 60 * 60,
      until: () => ach?.earned.value === true,
    });

    expect(result.terminated).toBe('predicate');
    expect(ach?.earned.value).toBe(true);
    engine.dispose();
  });

  it('AP curve multiplicative source binds onto coin + prestige rateChains', () => {
    const { engine } = createScalerEngine({
      persistenceNamespace: `ach-ap-curve-${Math.random().toString(36).slice(2)}`,
    });
    engine.selectMod(SCALER_MOD_ID);
    engine.start();

    const coin1 = getCoinProducers().getProducer('coin-1');
    const diamond1 = getDiamondProducers().getProducer('diamond-1');
    expect(coin1).toBeDefined();
    expect(diamond1).toBeDefined();

    const coinIds = coin1!.rateChain.bindings().map((b) => b.id);
    const diamondIds = diamond1!.rateChain.bindings().map((b) => b.id);
    expect(coinIds.some((id) => id.includes('Achievement Points (AP curve)'))).toBe(true);
    expect(diamondIds.some((id) => id.includes('Achievement Points (AP curve)'))).toBe(true);
    engine.dispose();
  });

  it('counter-reward earn lands free-X contributions on the right aggregator chains', async () => {
    const { engine } = createScalerEngine({
      persistenceNamespace: `ach-counter-${Math.random().toString(36).slice(2)}`,
    });
    engine.selectMod(SCALER_MOD_ID);
    engine.start();

    const cat = getAchievementsCategory();
    // Force-complete a row carrying each counter-grant kind. Predicate-watch
    // timing is engine-level (covered separately); this lock targets the
    // `chain.bind` wiring that lowers counter Grants onto the named free-X
    // aggregator chains.
    const accPower = cat.getAchievement('firstOwnedCoin-100'); // acceleratorPowerBonus +0.001
    const freeAcc = cat.getAchievement('accelerators-666'); // freeAccelerator +5
    const freeMult = cat.getAchievement('multipliers-20'); // freeMultiplier +1
    expect(accPower).toBeDefined();
    expect(freeAcc).toBeDefined();
    expect(freeMult).toBeDefined();

    accPower!.complete();
    freeAcc!.complete();
    freeMult!.complete();
    await nextTick();

    expect(Decimal.gte(getCoinAcceleratorPowerBonusChain().apply(0), 0.001)).toBe(true);
    expect(Decimal.gte(getCoinFreeAcceleratorChain().apply(0), 5)).toBe(true);
    expect(Decimal.gte(getCoinFreeMultiplierChain().apply(0), 1)).toBe(true);
    // freeAccelBoost row hasn't fired — chain reports 0 (no contributors active).
    expect(Decimal.eq(getTranscendFreeAccelBoostChain().apply(0), 0)).toBe(true);
    engine.dispose();
  });

  it('achievementPoints reactive sum reflects earned-row pointValues', async () => {
    const { engine } = createScalerEngine({
      persistenceNamespace: `ach-points-${Math.random().toString(36).slice(2)}`,
    });
    engine.selectMod(SCALER_MOD_ID);
    engine.start();
    await nextTick();

    const ap = getAchievementPoints();
    // Free achievement (5 AP) auto-earns at start; nothing else has earned yet.
    expect(ap.value).toBe(5);

    engine.dispose();
  });

  it('earned state survives prestige + transcend resets without explicit keep:', async () => {
    const { engine } = createScalerEngine({
      persistenceNamespace: `ach-survive-${Math.random().toString(36).slice(2)}`,
    });
    engine.selectMod(SCALER_MOD_ID);
    engine.start();

    const cat = getAchievementsCategory();
    const ach = cat.getAchievement('firstOwnedCoin-100');
    expect(ach).toBeDefined();
    ach!.complete();
    await nextTick();
    expect(ach!.earned.value).toBe(true);

    // Trigger prestige + transcend resets — the achievements module-id is
    // not in any `resetModules` list so its persistent refs survive.
    const { getPrestigeReset, getTranscendReset } = await import('../modules');
    getPrestigeReset().reset();
    await nextTick();
    expect(ach!.earned.value).toBe(true);
    getTranscendReset().reset();
    await nextTick();
    expect(ach!.earned.value).toBe(true);

    engine.dispose();
  });

  it('first-arc filter excludes Reincarnation+ groups from the registered set', () => {
    const { engine } = createScalerEngine({
      persistenceNamespace: `ach-filter-${Math.random().toString(36).slice(2)}`,
    });
    engine.selectMod(SCALER_MOD_ID);
    engine.start();

    const cat = getAchievementsCategory();
    const groups = new Set<string>();
    for (const entry of cat.getAll()) {
      groups.add(entry.def.group);
    }
    // First-arc allowlist (per AchievementGroupId in data/types.ts).
    const allowed = new Set([
      'firstOwnedCoin',
      'secondOwnedCoin',
      'thirdOwnedCoin',
      'fourthOwnedCoin',
      'fifthOwnedCoin',
      'prestigeCount',
      'prestigePointGain',
      'accelerators',
      'multipliers',
      'acceleratorBoosts',
      'transcensionCount',
      'transcendPointGain',
      'challenge1',
      'challenge2',
      'challenge3',
      'challenge4',
      'challenge5',
      'ungrouped',
    ]);
    for (const g of groups) {
      expect(allowed.has(g)).toBe(true);
    }
    engine.dispose();
  });
});
