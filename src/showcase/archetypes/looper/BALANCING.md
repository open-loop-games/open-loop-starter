# Looper — balancing

A run-budget economy: each night converts a budget of Nerve-seconds into work, and work
compounds within the night through talent. Across nights, mastery, the Grapevine and the
patrol learned raise the rate the next night starts at. The night crosses two zones, and
the second's budget depends on how fast the first is run. The bucket and its closed
form are in `IDENTITY.md` § Rate-function spine.

The numbers come from anchors at the top of `data/spine.ts`. To retune, change an
anchor and let the derivations follow: the gate durations are sized from the predicted
arc, so they move with it.

## The tunables

Every key is read at its reader site through `tunable()`; the registry is in
`modules/tuning.ts`.

| Key | Default | What it moves |
|---|---|---|
| `nerve/base` | 60 | Length of a night before refills and Steel Nerves. Every night's capacity scales with it. |
| `nerve/coffee`, `nerve/hamper` | 15, 10 | Seconds a prison refill adds. |
| `nerve/ride` | 60 | The milk truck's refill for a ride caught at lights-out. Zone 2's budget scales with it. |
| `nerve/rideDeadline` | 150 | Night-clock second the truck leaves. Later means a slow wall still gets a ride. |
| `patrol/step` | 0.02 | Share of Slip the Patrol each kept patrol level removes. |
| `skills/xpPerLevelSq` | 0.6 | How much work a talent level costs. Lower is a faster in-night ramp and more mastery banked. |
| `skills/talentPerLevel` | 0.1 | Speed per in-night level (α). This is the in-night compounding term. |
| `skills/masteryPerLevel` | 0.01 | Share of a night's level that banks (ρ). This is the across-night compounding term. |
| `skills/masteryKnee` | 10 | Level past which banking bends to √. Raising it lets strong nights bank more. |
| `actions/<id>/seconds` | from `data/spine.ts` | One action's base duration. |
| `notes/<id>/baseCost`, `notes/<id>/costRatio` | from `NOTE_PRICES` | A note's first price and its growth per level. |
| `notes/grapevine/speedPerLevel` | 0.1 | Global speed per Grapevine level. |
| `notes/steel-nerves/nervePerLevel` | 15 | Seconds per Steel Nerves level. |

**Not perturbable, on purpose:**
- `LANDMARK_SCHEDULE` and its positions are spine inputs, not knobs. They decide the gate
  durations. Change them in `data/spine.ts` and the gates are re-derived.
- `PATROL_CAP` is also the reference plan's stopping rule, so a perturbed cap would
  desync the plan the spine predicts from the game it measures.
- Intel per landmark (`INTEL_BASE`, `INTEL_RATIO`) is read directly. The note prices are
  quoted in units of it, so moving one without the other breaks the shop's pacing.
- `SPEED_STEPS` and `ROUTINE_DWELL` change how fast the game plays, not its balance.

## Couplings

- **A landmark lands on its night only between two capacities.** Its route must exceed
  the night before's capacity and fit inside its own night's. `position` places it in
  that window; capacity growth alternates with the buying cadence, so a landmark
  belongs on a night where capacity jumps. `looper-projection.ts` § 1 prints the check.
- **The ride prices zone 2 by zone 1.** Its refill falls with the night-clock second it
  is caught, so anything that speeds the prison — mastery, the patrol, the Grapevine —
  also lengthens the night past the wall. Retuning a prison gate moves zone 2's budget.
- **Zone 2 spends items made in the prison.** The truck takes a third pack of smokes and
  the padlock a second pick. The cell and the corridor cap them at three a night; drop a
  cap below the route's need and the zone-2 step is skipped every night.
- **Gate durations derive from the arc prediction.** Perturbing
  `actions/<gate>/seconds` overrides the derived value, and the gate stops tracking the
  spine. To move a landmark's night, move its schedule entry instead.
- **Talent and mastery share one xp stream.** `skills/xpPerLevelSq` moves both tiers at
  once: a cheaper level is a faster night *and* more banked mastery.
- **Refills count only on ground known before the night.** A night's plan is written
  before the night reveals new ground, so the prediction adds a refill, the ride
  included, from the night after its zone falls.
- **Game speed is set on the TickDriver.** Every timed thing speeds up together. A timer
  that counts real time instead of tick `dt` does not.

## Running a pass

- `balance/looper-projection.ts [nights]` prints the derived gates, whether each
  landmark lands on its night, the predicted arc with every split and the ride, and when
  each note becomes affordable.
- `balance/arc-probe.ts [nights]` plays the shipping game. Read § Nights for work
  against `predWork`, § Splits for the wall, the ride, the rail yard and the freight
  against the spine, and § Landmarks for the night each landmark fell.

A healthy pass: every landmark falls on its scheduled night, prison work stays within
about 5% of the prediction, and the ride tracks `predRide`.

## Known thin

- **Past the wall the game runs ahead of the spine.** The long zone-2 gates concentrate
  training on Brawn and Stealth, which the even-split prediction does not model. Work
  runs 4–15% over and the rail-yard and freight splits 7–8% under, inside the position
  margin.
- **After the freight nothing new opens.** Intel then buys only the two open ladders,
  and the splits board is the game.
- **One route.** Every plan that escapes runs the same moves in nearly the same order;
  the decision space is ordering, over-production and filler.
