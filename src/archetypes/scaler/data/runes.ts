// ─── Port Citation ───────────────────────────────────────────────────────────
// Canonical: open-loop-research/reference-code/SynergismOfficial/src/Runes.ts
//   Runes.ts:51-57         indexToRune (base 5 keys lifted verbatim)
//   Runes.ts:357-396       speed rune object (costCoefficient, levelsPerOOM, effects)
//   Runes.ts:397-439       duplication
//   Runes.ts:440-480       prism
//   Runes.ts:481-523       thrift
//   Runes.ts:524-566       superiorIntellect
//   Runes.ts:791-794       computeEXPToLevel (curve form costCoefficient × (10^(L/levelsPerOOM) − 1))
//   Runes.ts:874-885       updateLevelsFromEXP (level-from-EXP closed form)
// Canonical: open-loop-research/reference-code/SynergismOfficial/src/Variables.ts
//   Variables.ts:15        runeexpbase = [1, 4, 9, 16, 1000, 1e75, 1e256] (first 5 ported)
// ─────────────────────────────────────────────────────────────────────────────
// First-arc scope: base 5 runes only (Speed / Duplication / Prism / Thrift /
// Superior Intellect). Runes 6 (Infinite Ascent), 7 (Antiquities), 8 (HorseShoe)
// stay fork-extension per spec § 5.
//
// Effect closures port verbatim from canonical `effects(level)`. `level` is the
// *effective* level (post `firstFiveEffectiveRuneLevelMult`, which is
// identity-1 at first arc — only later-arc modifiers contribute to the
// effective-level reduce). Per-rune effect targets:
//   - Speed.multiplicativeAccelerators → coin rateChain (active first-arc)
//   - Duplication.multiplicativeMultipliers → coin rateChain (active first-arc)
//   - Prism.productionLog10 → coin rateChain via 10^x (active first-arc)
//   - SI.offeringMult → multiplies offering accrual at prestige reset
//   - All other effect keys (Speed.acceleratorPower, Speed.globalSpeed,
//     Duplication.multiplierBoosts, Duplication.taxReduction,
//     Prism.costDivisorLog10, all Thrift, SI.obtainiumMult, SI.antSpeed)
//     port inert — they evaluate but no rateChain binding consumes them.
//     Spec § 5 "Per-rune multiplicative grant binds into the per-tier
//     rateChain" calls this out as the first-arc inert-port shape.
// ─────────────────────────────────────────────────────────────────────────────

import type { RuneDef } from './types';

export const RUNE_SPEED: RuneDef<'speed'> = {
  id: 'speed',
  displayName: 'Speed',
  costCoefficient: 50,
  levelsPerOOM: 150,
  effects: (n: number) => {
    const acceleratorPower = 0.0002 * n;
    const multiplicativeAccelerators = 1 + n / 400;
    const globalSpeed = 2 - Math.exp(-Math.cbrt(n) / 100);
    return { acceleratorPower, multiplicativeAccelerators, globalSpeed };
  },
};

export const RUNE_DUPLICATION: RuneDef<'duplication'> = {
  id: 'duplication',
  displayName: 'Duplication',
  costCoefficient: 20_000,
  levelsPerOOM: 120,
  effects: (n: number) => {
    const multiplierBoosts = n / 5;
    const multiplicativeMultipliers = 1 + n / 400;
    const taxReduction = 0.001 + 0.999 * Math.exp(-Math.cbrt(n) / 5);
    return { multiplierBoosts, multiplicativeMultipliers, taxReduction };
  },
};

export const RUNE_PRISM: RuneDef<'prism'> = {
  id: 'prism',
  displayName: 'Prism',
  costCoefficient: 5e5,
  levelsPerOOM: 90,
  effects: (level: number) => {
    const productionLog10 = Math.max(
      0,
      2 * Math.log10(1 + level / 2) + (level / 2) * Math.log10(2) - Math.log10(256),
    );
    const costDivisorLog10 = Math.floor(level / 10);
    return { productionLog10, costDivisorLog10 };
  },
};

export const RUNE_THRIFT: RuneDef<'thrift'> = {
  id: 'thrift',
  displayName: 'Thrift',
  costCoefficient: 2.5e7,
  levelsPerOOM: 60,
  effects: (level: number) => {
    const costDelay = Math.min(1e15, level / 125);
    const salvage = 2.5 * Math.log(1 + level / 10);
    const taxReduction = 0.01 + 0.99 * Math.exp(-Math.cbrt(level) / 10);
    return { costDelay, salvage, taxReduction };
  },
};

export const RUNE_SUPERIOR_INTELLECT: RuneDef<'superiorIntellect'> = {
  id: 'superiorIntellect',
  displayName: 'Superior Intellect',
  costCoefficient: 1e12,
  levelsPerOOM: 30,
  effects: (level: number) => {
    const offeringMult = 1 + level / 2000;
    const obtainiumMult = 1 + level / 200;
    const antSpeed = Math.pow(1 + level / 500, 2);
    return { offeringMult, obtainiumMult, antSpeed };
  },
};

/**
 * Base 5 runes in canonical sacrifice / display order. The order is the
 * autobuyer's round-robin sequence and the UI's row order.
 */
export const SCALER_RUNES = [
  RUNE_SPEED,
  RUNE_DUPLICATION,
  RUNE_PRISM,
  RUNE_THRIFT,
  RUNE_SUPERIOR_INTELLECT,
] as const;
