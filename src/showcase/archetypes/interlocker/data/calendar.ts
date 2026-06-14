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
