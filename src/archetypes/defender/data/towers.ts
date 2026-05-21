import type { TowerDef } from './types';

// Verbatim from `open-loop-research/reference-code/bloons-td-1/scripts/`.
// Tower COST_* / RANGE_* constants live in the class-init block at
// `__Packages/BloonsTD.as:802-826`; per-tower attack rate / projectile speed /
// pierce-max / freeze-duration live at `__Packages/Tower.as:154-231`. BTD1's
// time unit is Flash frames at **40 fps** (SWF header DOMDocument.xml
// frameRate="40"); we convert to seconds at the reader site.
//
// Numbers transfer 1:1 from BTD1. Ranges are pixel-space distances on the
// source playfield; `data/path.ts` is authored in the same coordinate
// system, so the source's balance comes with the source's numbers.
// `projectileSpeedLaneUnitsPerSec` is informational only in arc 1 — fire is
// hitscan (towers.ts:399), so projectile travel doesn't tick. Re-engage when
// the visible-projectile-fidelity TODO(expansion) lands.

export const TOWERS: TowerDef[] = [
  {
    id: 'dart',
    name: 'Dart Tower',
    baseCost: 250, // BloonsTD.as:802 COST_DART = 250
    rangeLaneUnits: 100, // BloonsTD.as:817 RANGE_DART = 100
    attackCooldownSec: 29 / 40, // Tower.as:178 attackRate = 29 frames @ 40fps → 0.725s
    projectileSpeedLaneUnitsPerSec: 20 * 40, // Tower.as:181 shootPower = 20 px/frame @ 40fps → 800 px/s
    pierceMax: 1, // Tower.as:158 default
  },
  {
    id: 'tack',
    name: 'Tack Shooter',
    baseCost: 400, // BloonsTD.as:803 COST_TACK = 400
    rangeLaneUnits: 70, // BloonsTD.as:818 RANGE_TACK = 70
    attackCooldownSec: 55 / 40, // Tower.as:185 attackRate = 55 frames @ 40fps → 1.375s
    projectileSpeedLaneUnitsPerSec: 15 * 40, // Tower.as:189 shootPower = 15 px/frame @ 40fps → 600 px/s
    pierceMax: 1,
    volleyCount: 8, // Bloon.as:193 — 8 projectiles in radial spread
    isSpread: true, // Tower.as:187 isspread = true
  },
  {
    id: 'bomb',
    name: 'Bomb Tower',
    baseCost: 900, // BloonsTD.as:805 COST_BOMB = 900
    rangeLaneUnits: 120, // BloonsTD.as:820 RANGE_BOMB = 120
    attackCooldownSec: 55 / 40, // Tower.as:202 attackRate = 55 frames @ 40fps → 1.375s
    projectileSpeedLaneUnitsPerSec: 11 * 40, // Tower.as:203 shootPower = 11 px/frame @ 40fps → 440 px/s
    pierceMax: 20, // Tower.as:207 pierceMax = 20
    // Derived from the SWF: bomb explosion = Symbol 43 hitbit
    // (138×192 twips = 6.9×9.6 px) scaled at explosion frame by
    // a=11.578, d=8.319 → ~80×80 px hitbox rectangle. We model it as a
    // circular splash, radius = half the wider dimension = ~40 px.
    // Tunable key: `towers/bomb/splashRadiusLaneUnits`.
    splashRadiusLaneUnits: 40,
  },
  {
    id: 'ice',
    name: 'Ice Tower',
    baseCost: 850, // BloonsTD.as:806 COST_ICE = 850
    rangeLaneUnits: 60, // BloonsTD.as:821 RANGE_ICE = 60
    attackCooldownSec: 100 / 40, // Tower.as:210 attackRate = 100 frames @ 40fps → 2.5s
    projectileSpeedLaneUnitsPerSec: 0, // Tower.as:214 — Ice is range-based AoE; no projectile travel
    pierceMax: 20, // Tower.as:216 pierceMax = 20
    freezeDurationSec: 50 / 40, // Tower.as:215 freezeLen = 50 frames @ 40fps → 1.25s
  },
];
