// Season cycle, verbatim from `open-loop-research/reference-code/kittensgame/js/calendar.js`.
// Four seasons per year, 100 days per season (calendar.js:218 `daysPerSeason: 100`,
// season list calendar.js:7-44). Each season carries a catnip-production
// multiplier (calendar.js:13/22/31/40 `modifiers.catnip`): spring boosts +50%,
// summer/autumn neutral, winter is the canonical −75% (the `[-75%]` the player
// sees in winter). Weather (warm/cold), festivals, and challenge modifiers
// (calendar.js:1095-1119 `getWeatherMod`) are out of arc-1 scope — arc-1 models
// the base seasonal catnip swing only.
//
// Day cadence: canon runs 10 ticks/day (calendar.js:217 `ticksPerDay: 10`) at the
// ~5 ticks/sec the rest of this data assumes (see catnip/kitten rate comments in
// data/index.ts), so one day = 2 real seconds → season = 200s, year = 800s.

import type { SeasonSpec } from './types';

export const SEASONS: SeasonSpec[] = [
  { id: 'spring', name: 'Spring', catnipMultiplier: 1.5 },
  { id: 'summer', name: 'Summer', catnipMultiplier: 1.0 },
  { id: 'autumn', name: 'Autumn', catnipMultiplier: 1.0 },
  { id: 'winter', name: 'Winter', catnipMultiplier: 0.25 },
];

export const DAYS_PER_SEASON = 100;
export const SECONDS_PER_DAY = 2;

// ─── Balance ─────────────────────────────────────────────────────────────────
// Winter (×0.25 for DAYS_PER_SEASON·SECONDS_PER_DAY = 200s/yr) is a *banking*
// constraint, not a rate one: an all-farmer colony's winter output 0.25·5·P =
// 1.25·P/s can't meet the 4.25·P/s kitten drain at any allocation, so the colony
// must hold ≈ (4.25·P − 0.25·(fieldCatnip + farmers·5))·200 catnip banked before
// winter — the demand that drives barn (catnip cap) and pasture (−demand) buying.
// See data/index.ts § Balance point 3 for the full solvency spine.
