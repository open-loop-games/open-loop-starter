# Looper — balancing

A run-budget economy: each night converts a fixed budget of Nerve-seconds into work, and
work compounds within the night through talent. Across nights, mastery and the
Grapevine raise the rate the next night starts at. The bucket and its closed form are in
`IDENTITY.md` § Rate-function spine.

The numbers come from anchors at the top of `data/spine.ts`. To retune, change an
anchor and let the derivations follow: the gate durations are sized from the predicted
arc, so they move with it.

## The tunables

Every key is read at its reader site through `tunable()`; the registry is in
`modules/tuning.ts`.

| Key | Default | What it moves |
|---|---|---|
| `nerve/base` | 60 | Length of a night before refills and Steel Nerves. Every night's capacity scales with it. |
| `nerve/coffee`, `nerve/hamper` | 15, 10 | Seconds a refill adds. Longer refills make the corridor and laundry nights longer than predicted. |
| `skills/xpPerLevelSq` | 0.6 | How much work a talent level costs. Lower is a faster in-night ramp and more mastery banked. |
| `skills/talentPerLevel` | 0.1 | Speed per in-night level (α). This is the in-night compounding term. |
| `skills/masteryPerLevel` | 0.01 | Share of a night's level that banks (ρ). This is the across-night compounding term. |
| `skills/masteryKnee` | 10 | Level past which banking bends to √. Raising it lets strong nights bank more. |
| `actions/<id>/seconds` | from `data/spine.ts` | One action's base duration. |
| `notes/<id>/baseCost`, `notes/<id>/costRatio` | from `NOTE_PRICES` | A note's first price and its growth per level. |
| `notes/grapevine/speedPerLevel` | 0.1 | Global speed per Grapevine level. |
| `notes/steel-nerves/nervePerLevel` | 15 | Seconds per Steel Nerves level. |

**Not perturbable, on purpose:**
- `LANDMARK_SCHEDULE` and its fills are spine inputs, not knobs. They decide the gate
  durations. Change them in `data/spine.ts` and the gates are re-derived.
- Intel per landmark (`INTEL_BASE`, `INTEL_RATIO`) is read directly. The note prices are
  quoted in units of it, so moving one without the other breaks the shop's pacing.
- `SPEED_STEPS` and `ROUTINE_DWELL` change how fast the game plays, not its balance.

## Couplings

- **Gate durations derive from the arc prediction.** Perturbing
  `actions/<gate>/seconds` overrides the derived value, and the gate stops tracking the
  spine. To move a landmark's night, move its schedule entry instead.
- **Talent and mastery share one xp stream.** `skills/xpPerLevelSq` moves both tiers at
  once: a cheaper level is a faster night *and* more banked mastery.
- **Refills count only on ground known before the night.** A night's plan is written
  before the night reveals new ground, so the prediction adds a refill from the night
  after its zone falls. Moving a zone's scheduled night moves its refills with it.
- **Speed is a geometric product over a move's weights.** A route that leans on one
  skill trains the other three less, and its gates use them. Mastery runs a few percent
  under the even-split prediction for this reason.
- **The night ends on the wall.** After the first escape, work per night pins at the
  route's length, so the improvement shows only in escape time and splits.
- **Game speed is set on the TickDriver.** Every timed thing speeds up together. A timer
  that counts real time instead of tick `dt` does not.

## Running a pass

- `balance/looper-projection.ts [nights]` prints the derived gates, the route's fill
  against each scheduled night, the predicted arc and when each note becomes affordable.
- `balance/arc-probe.ts [nights]` plays the shipping game. Read § Nights: before the
  first escape compare `work` with `predWork`; after it, compare `secs` with `predEscape`.
  § Landmarks shows the night each landmark fell against its schedule.

A healthy pass: every landmark falls on its scheduled night, work stays within a few
percent of the prediction, and escape time tracks `predEscape`.

## Known thin

- **The late arc has no new content.** After the first escape, Intel buys only the two
  open ladders (Steel Nerves, Grapevine) and the last Déjà Vu rung. The splits improve
  every night, but nothing new opens.
- **One route.** Every plan that escapes runs the same moves in nearly the same order.
  The decision space is ordering and filler, not the route.
- **The reference policy spreads skills evenly; a real plan does not.** The probe's
  mastery runs under prediction as the route skews training. The spine does not model
  the skew.
