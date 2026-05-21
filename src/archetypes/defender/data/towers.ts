import type { TowerDef } from './types';

// Verbatim from `open-loop-research/reference-code/bloons-td-1/scripts/`.
// Tower COST_* / RANGE_* constants live in the class-init block at
// `__Packages/BloonsTD.as:802-826`; per-tower attack rate / projectile speed /
// pierce-max / freeze-duration live at `__Packages/Tower.as:154-231`. BTD1's
// time unit is Flash frames at 30fps; we convert to seconds at the reader site.
//
// ─── Lane-unit calibration (Phase 5a, OL-1029) ─────────────────────────────
// BTD1 ranges are pixel-space distances on a ~580×400 px playfield. Our
// path lives on a 20×15 lane-unit grid (`data/path.ts`), 75 units total
// length, diagonal ~25. The two coordinate systems aren't compatible —
// raw BTD1 ranges (60–120 px) on our grid would cover the entire map.
//
// Ranges below are calibrated by dividing the BTD1 pixel ranges by 25
// (≈ map-diagonal ratio). BTD1's range *ratios* (dart 100 : tack 70 :
// bomb 120 : ice 60 → 1.00 : 0.70 : 1.20 : 0.60) are preserved verbatim;
// only the absolute scalar is recalibrated for the 20×15 grid. Each
// constant carries the BTD1 origin in its comment.
//
// `projectileSpeedLaneUnitsPerSec` is informational only in arc 1 — fire
// is hitscan (towers.ts:399), so projectile travel doesn't tick. Re-
// calibrate when the visible-projectile-fidelity TODO(expansion) lands.

export const TOWERS: TowerDef[] = [
  {
    id: 'dart',
    name: 'Dart Tower',
    baseCost: 250, // BloonsTD.as:802 COST_DART = 250
    rangeLaneUnits: 4.0, // 100/25; BloonsTD.as:817 RANGE_DART = 100
    attackCooldownSec: 29 / 30, // Tower.as:178 attackRate = 29 frames @ 30fps → ~0.967s
    projectileSpeedLaneUnitsPerSec: 20 * 30, // Tower.as:181 (hitscan in arc 1)
    pierceMax: 1, // Tower.as:158 default
  },
  {
    id: 'tack',
    name: 'Tack Shooter',
    baseCost: 400, // BloonsTD.as:803 COST_TACK = 400
    rangeLaneUnits: 2.8, // 70/25; BloonsTD.as:818 RANGE_TACK = 70
    attackCooldownSec: 55 / 30, // Tower.as:185 attackRate = 55 frames @ 30fps → ~1.83s
    projectileSpeedLaneUnitsPerSec: 15 * 30, // Tower.as:189 (hitscan in arc 1)
    pierceMax: 1,
    volleyCount: 8, // Bloon.as:193 — 8 projectiles in radial spread
    isSpread: true, // Tower.as:187 isspread = true
  },
  {
    id: 'bomb',
    name: 'Bomb Tower',
    baseCost: 900, // BloonsTD.as:805 COST_BOMB = 900
    rangeLaneUnits: 4.8, // 120/25; BloonsTD.as:820 RANGE_BOMB = 120
    attackCooldownSec: 55 / 30, // Tower.as:202 attackRate = 55 frames @ 30fps → ~1.83s
    projectileSpeedLaneUnitsPerSec: 11 * 30, // Tower.as:203 (hitscan in arc 1)
    pierceMax: 20, // Tower.as:207 pierceMax = 20
    // Splash radius rescaled by the same /25 factor; BTD1 stand-in 30 px.
    // Re-derive during Phase 5b balance pass from observed gameplay
    // (community wiki cross-reference) when locked numbers replace the
    // stand-in. Tunable key: `towers/bomb/splashRadiusLaneUnits`.
    splashRadiusLaneUnits: 1.2, // 30/25 stand-in (BTD1 splash lives in SWF)
  },
  {
    id: 'ice',
    name: 'Ice Tower',
    baseCost: 850, // BloonsTD.as:806 COST_ICE = 850
    rangeLaneUnits: 2.4, // 60/25; BloonsTD.as:821 RANGE_ICE = 60
    attackCooldownSec: 100 / 30, // Tower.as:210 attackRate = 100 frames @ 30fps → ~3.33s
    projectileSpeedLaneUnitsPerSec: 0, // Tower.as:214 — Ice is range-based AoE
    pierceMax: 20, // Tower.as:216 pierceMax = 20
    freezeDurationSec: 50 / 30, // Tower.as:215 freezeLen = 50 frames @ 30fps → ~1.67s
  },
];
