import type { DecimalSource } from 'open-loop-engine';
import type { SurvivorBalance, SurvivorProgression } from './types';

// ─── Skeleton ──────────────────────────────────────────────────────────────
// Structural fork decisions. Editing these changes run-lifecycle behaviour,
// not just tuning.
//
//   runMode       — 'continuous' is Vampire Survivors' 30-min arc; 'round-based'
//                   is Brotato's discrete waves with between-wave shops.
//   shopMode      — 'level-up-cards' (VS) vs 'wave-shop' (Brotato). Determines
//                   where the Progression Systems choice surface lands.
//   prestigeMode  — 'continuous-accumulator' (VS; gold persists through failed
//                   runs), 'run-reset' (classic prestige award at run end), or
//                   'none' (single-run, no cross-run persistence).
//
// Default matches Vampire Survivors shape because that is the archetype's
// 2022 crystallization event and the most likely day-one fork target.

export const RUN_MODE: SurvivorProgression['runMode'] = 'continuous';
export const SHOP_MODE: SurvivorProgression['shopMode'] = 'level-up-cards';
export const PRESTIGE_MODE: SurvivorProgression['prestigeMode'] = 'continuous-accumulator';

export const DEFAULT_PROGRESSION: SurvivorProgression = {
  runMode: RUN_MODE,
  shopMode: SHOP_MODE,
  prestigeMode: PRESTIGE_MODE,
  weaponSlots: 6,
  passiveSlots: 6,
  unlockNodeCount: 10,
};

// ─── Balance ───────────────────────────────────────────────────────────────
// Cross-cutting tuning constants. `xpCurve` is a function so forks can
// override in place without rewriting a pre-baked array; workbench
// perturbation replaces it wholesale through the boot factory.

const DEFAULT_XP_CURVE = (level: number): DecimalSource => {
  // Accelerating early (levels 1–10), decelerating past 20 (VS-shape).
  if (level <= 10) return Math.round(10 * Math.pow(level, 1.5));
  if (level <= 20) return Math.round(30 * Math.pow(level, 1.8));
  return Math.round(100 * Math.pow(level, 2.0));
};

export const DEFAULT_BALANCE: SurvivorBalance = {
  xpCurve: DEFAULT_XP_CURVE,
  modifierStackOrder: ['base', 'weapon-level', 'passive', 'character', 'power-up', 'arcana'],
  luckWeight: 1.0,
  chestDropRate: 1.0,
  baseMagnetRadius: 1.5,
};
