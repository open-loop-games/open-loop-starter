import type { TowerDef } from './types';

// Verbatim from `open-loop-research/reference-code/bloons-td-1/scripts/`.
// Tower COST_* / RANGE_* constants live in the class-init block at
// `__Packages/BloonsTD.as:802-826`; per-tower attack rate / projectile speed /
// pierce-max / freeze-duration live at `__Packages/Tower.as:154-231`. BTD1's
// time unit is Flash frames at 30fps; we convert to seconds at the reader site.

export const TOWERS: TowerDef[] = [
  {
    id: 'dart',
    name: 'Dart Tower',
    baseCost: 250, // BloonsTD.as:802 COST_DART = 250
    rangeLaneUnits: 100, // BloonsTD.as:817 RANGE_DART = 100
    attackCooldownSec: 29 / 30, // Tower.as:178 attackRate = 29 frames @ 30fps → ~0.967s
    projectileSpeedLaneUnitsPerSec: 20 * 30, // Tower.as:181 shootPower = 20 lane-units/frame @ 30fps → 600/s
    pierceMax: 1, // Tower.as:158 default
  },
  {
    id: 'tack',
    name: 'Tack Shooter',
    baseCost: 400, // BloonsTD.as:803 COST_TACK = 400
    rangeLaneUnits: 70, // BloonsTD.as:818 RANGE_TACK = 70
    attackCooldownSec: 55 / 30, // Tower.as:185 attackRate = 55 frames @ 30fps → ~1.83s
    projectileSpeedLaneUnitsPerSec: 15 * 30, // Tower.as:189 shootPower = 15 lane-units/frame @ 30fps → 450/s
    pierceMax: 1,
    volleyCount: 8, // Bloon.as:193 — 8 projectiles in radial spread
    isSpread: true, // Tower.as:187 isspread = true
  },
  {
    id: 'bomb',
    name: 'Bomb Tower',
    baseCost: 900, // BloonsTD.as:805 COST_BOMB = 900
    rangeLaneUnits: 120, // BloonsTD.as:820 RANGE_BOMB = 120
    attackCooldownSec: 55 / 30, // Tower.as:202 attackRate = 55 frames @ 30fps → ~1.83s
    projectileSpeedLaneUnitsPerSec: 11 * 30, // Tower.as:203 shootPower = 11 lane-units/frame @ 30fps → 330/s
    pierceMax: 20, // Tower.as:207 pierceMax = 20
    // Phase 1 stand-in: BTD1 splash radius lives in SWF resources, not AS.
    // Re-derive during Phase 5 balance pass from observed BTD1 gameplay
    // (community wiki cross-reference). Tunable key:
    // `towers/bomb/splashRadiusLaneUnits`.
    splashRadiusLaneUnits: 30,
  },
  {
    id: 'ice',
    name: 'Ice Tower',
    baseCost: 850, // BloonsTD.as:806 COST_ICE = 850
    rangeLaneUnits: 60, // BloonsTD.as:821 RANGE_ICE = 60
    attackCooldownSec: 100 / 30, // Tower.as:210 attackRate = 100 frames @ 30fps → ~3.33s
    projectileSpeedLaneUnitsPerSec: 0, // Tower.as:214 — Ice is range-based AoE; no projectile travel
    pierceMax: 20, // Tower.as:216 pierceMax = 20
    freezeDurationSec: 50 / 30, // Tower.as:215 freezeLen = 50 frames @ 30fps → ~1.67s
  },
];
