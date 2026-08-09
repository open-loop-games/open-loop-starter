# Survivor — balance orientation

How to work on this archetype's numbers. What it _is_ lives in `IDENTITY.md`
§ Rate-function spine; this file never restates the bucket.

A run is a race between two compounding curves. Device DPS compounds through the
draft; specimen HP and annulus density compound on minute marks. Everything else
— the XP ladder, the entity budget, the per-pick gain — is _derived_ from those
two plus the authored draft schedule, so almost nothing here is a free number.
The ones that are free are below.

## The knobs

Constants live in `data/`, split by subsystem so each carries its own
`─── Balance ───` reasoning beside the numbers it justifies: `schedule.ts` (the
time axis), `arena.ts` (geometry and threat), `income.ts` (motes to levels),
`seats.ts` (the roster), `specimens.ts` (the threat roster), `devices.ts` (the
draft pool), `meta.ts` (the cross-run shop). `modules/tuning.ts` declares the
`tunable()` key union; not every constant below is wired to one yet.

| Knob                                                                  | What it moves                                                                                                                                               |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `beatFirstSeconds`, `beatRatio`                                       | the draft schedule. The beat _count_ is a consequence, not a knob — hold the 30–90s band and ~33 beats falls out                                            |
| `hpGrowthPerMinute`                                                   | how hard escalation bites. Also re-solves the per-pick DPS gain, since that is pinned to flat time-to-kill                                                  |
| `spawnRate0`, `spawnGrowthPerMinute`                                  | density, and with it the entity budget and the whole traversal term                                                                                         |
| `contactDamageGrowthPerMinute`                                        | per-hit escalation. Deliberately far slower than HP growth                                                                                                  |
| `densityCap`, `BLOCKING_CROWD`, `ESCAPE_FLOOR`                        | where gaps close. Contact is the _squared_ approach to it, so this is quiet until it is sudden                                                              |
| `hpPickGain`                                                          | what a defensive pick buys                                                                                                                                  |
| `apertureCapRatio`                                                    | the ceiling `r_collect/r_kill` approaches as aperture sources stack. Bounds the top coupling structurally — see § Couplings                                 |
| `COLLECTOR_BALANCE.onscreenShare`                                     | the projection's assumed burst size. The sim pulls everything inside `pullRadius` instead, so this is a prediction the probe measures against, not a rule   |
| `COLLECTOR_BALANCE.pullRadius`, `timeJitter`                          | how much floor one pull banks, and how far a drop roams from its nominal time                                                                               |
| per-seat `engage`, `eta`, `speed`, `dps`, `toughness`, `defenseShare` | the personality bundle; also the sweep axis                                                                                                                 |
| device `baseDamage` / `cooldownSec`                                   | one device's cadence and weight. The opening device's pair is _solved_ against flat TTK at t=0, not chosen                                                  |
| device `maxTargets`                                                   | how many of the specimens in reach an area shape takes. Intended as the knob deciding whether the roster has an arc; measured, it is not — see § Known thin |
| specimen `hpFactor` / `damageFactor` / `weight`                       | the mix, and through it the required-DPS curve and the pressure curve                                                                                       |
| specimen `moteYield`                                                  | income. Coupled to the ladder — raise it and re-derive                                                                                                      |
| `NOTES_PER_KILL`, `META_COST_RATIO`, per-upgrade `baseCost`           | the runs-to-buy ladder. Read the projection's meta table, not these numbers                                                                                 |
| meta upgrade `side`                                                   | whether a tile is ladder-safe. Not annotation — see § Couplings                                                                                             |

**Deliberately not perturbable:** the per-pick DPS gain, the beat ratio, and the
XP ladder. All three are _solved_ — the gain from flat time-to-kill, the ratio so
the last beat lands inside the run, the ladder from the income model against the
schedule. Overriding one directly decouples it from what it was derived to
satisfy, which is how a ladder silently stops meaning anything while still
looking like a ladder. Change the input and re-derive.

## Couplings

**`r_collect` against `r_kill` is the top coupling and sets the price of all
income.** Kills land at the outer edge; motes land where the specimen died; the
collect radius is smaller, so banking means looping back through cleared space.
Move the two together and you change the archetype's genre — at `r_collect →
r_kill` income is free and this becomes a DPS check; small, and every level-up is
paid for with a dive. Nothing else moves the character of the game as much with
one number.

Which is why the ratio is **bounded where it is computed, not where its inputs
are authored**. Two runtime sources multiply the aperture — the `reclaimant`
reagent and the `wider-aperture` meta tile — and on a raw product they reached
`r_collect` 199 against an `r_kill` of 180: the degenerate case, arrived at by
ordinary play. `collectRadiusFor` in `data/arena.ts` now applies any aperture
multiplier to the _headroom_ below `apertureCapRatio`, so every present and
future source composes into a ratio that rises toward 0.65 and stops. It is a
headroom curve rather than a clamp on purpose — a clamp makes the last stacks of
a fully-invested reagent inert, which is the same defect as a dial that never
reaches the policy. The general lesson, and the reason this is written here: when
one ratio decides a genre, bound it at the point of computation, because
contributors get added by people who have not read the coupling.

**Engagement rate is an economic term, not a survival tactic.** The scrolling map
means the operator chooses how much threat to meet, so the movement policy
decides income. The closed form cannot predict `η`; it assumes one. Any change to
the movement policy is a balance change even when no constant moved.

The corollary bit once and is worth stating outright: **a seat dial that does not
appear in the score does not reach the policy.** `engage` biased only the orbit
DISTANCE for most of this archetype's life, and that worked solely because the
undamped arg-max thrashed the operator through the mass a few times a second. The
moment the steering was smoothed, kill rate halved — the dial had been riding on
a rendering-visible defect. `ENGAGE_WEIGHT` in `modules/sim/steering.ts` is the
real channel. Check a dial's term exists before reading a probe that quotes it.

**Killing thins the field.** Engaged specimens leave by dying, unengaged by
scrolling away, so `engage` and `dps` both feed local density and therefore
contact. This is why the damage seat's advantage is structural rather than
cosmetic — and it is easy to break by modelling density as spawn-rate alone.

**Collector impulses must be in the income model at derivation time, amortized.**
They are ~11% of run income in two bursts, and there are two ways to get this
wrong in opposite directions. Leave them out and the ladder never re-syncs after
the first burst — beats land up to ~115s early, monotone, because nothing
restores the schedule. Put them in as point impulses and the ladder goes
non-monotone, because the beat straddling a nominal drop absorbs the whole burst;
that ladder is correct only for runs whose collectors land where the model said,
and the drop is a roll. `cumulativeIncomeAmortized` is the one to derive against.
What remains is bounded oscillation — behind before the first collector, ahead
after — which is the honest price of impulsive income.

**The per-pick gain is pinned to `defenseShare`.** Picks spent on survivability
are picks not spent on DPS, so raising a seat's defensive allocation raises what
each remaining offensive pick must deliver to keep time-to-kill flat.

**Every term that multiplies required DPS must be inside `offensivePickGain`.**
Time-to-kill is a _per-specimen_ quantity while the operator's DPS is divided
among everything in the kill radius, so the solve has to cover specimen HP
growth, density growth, _and_ the roster's mean-HP shift as heavy tiers enter —
`m_hp · m_d` per minute plus a one-off ~2.07× from the mix. This was missed twice
in the same direction, once for `m_d` and once for the mix.

It matters more than it looks, because the failure is silent and wears a
disguise. `localDensity` treats time-to-kill as constant, so an under-solved gain
leaves the density model assuming a DPS curve the draft never delivers: TTK
drifts up, residency drifts with it, density climbs super-linearly, and the run
gets harder for reasons nothing in the model admits to. It reads as a difficulty
problem and it is an arithmetic one. Add a term that multiplies required DPS —
a new tier, an escalation curve, a roster reweight — and it goes in the solve.

**A meta upgrade's `side` decides whether it is ladder-safe.** Income is
`spawnRate · engage · meanMoteYield · η` and contains no DPS term, so a
survival-side upgrade (damage, toughness, move speed) buys only what its name
says — more DPS shortens time-to-kill, which lowers residency, density and
contact, while kill rate stays set by how much the seat engages. An income-side
upgrade moves η or yield, both inside the income the ladder was derived against,
so owning it makes beats land earlier than the schedule says.

That front-loading is intended and bounded by `maxLevel`, unlike the collector
case — but it is large: at full investment income roughly doubles and a run
finishes its draft about six minutes before the purge. Two consequences a fork
should not lose: the ladder is derived for a **zero-meta** run (deriving against
mid-progression would make run 1 unplayable), and adding an income-side tile
re-paces the whole meta arc rather than just its own line. Prefer a survival-side
effect when the design is indifferent — it costs the schedule nothing.

## Running a pass

- `pnpm exec vite-node src/showcase/archetypes/survivor/balance/survivor-projection.ts`
  — the closed form. Prints the draft schedule, the entity budget, the collector
  derivation check, and the per-seat crossing. Predicts; discovers nothing.
- `pnpm exec vite-node src/showcase/archetypes/survivor/balance/arena-probe.ts`
  — the shipping game, headless, one full arc per seat. Prints binding cause,
  beats against schedule, kills/s against the closed form, and **measured η
  against assumed**. That last pair is the instrument: a gap there is the
  movement policy, not the economy. η comes split into `η cont` (continuous
  pickup — the policy's doing) and `η all`, with the collector's `burst` share
  beside them, because a single figure conflates a good pilot with a lucky drop.

  It also prints a **per-device dispatch table**. Aggregate kills cannot say
  which device delivered them, and the shapes fail in different ways, so the
  table separates the two failures: `connect` is the share of shots that found
  any target at all, and `capture` is hits over specimens _in reach at fire
  time_, before the shape filter and before `maxTargets`. A directional shape
  losing targets to the heading it is not facing and a radial one losing them to
  its cap are then different numbers rather than one blurred "it
  underperforms" — `pulse` is the control, since it can only ever lose to the
  cap. `lvl` beside them is what says whether a shortfall is the device or the
  draft that fed it.

  It also prints a **live census against `entityBudget`**, sampled each minute:
  peak population, when the cap first bound, and how many minutes were spent
  pinned there. That table exists because end-of-run totals cannot distinguish a
  floor clamped for half the arc from one that never filled — see § Known thin.

- The measurement still owed is a **seeded multi-run spread**: the probe runs one
  seed per seat, so every reading is a single sample of a stochastic system. Median
  survival, `η` split into continuous pickup and collector bursts, and a
  binding-cause distribution all need repeated runs before they mean anything.

Magnitudes print, never assert. Behavioural suites sit beside their modules and
carry no numbers.

## Known thin

- **η is ~0.91–0.99 against an assumed 0.65–0.78, and the residual is not
  geometry.** The geometry half is fixed: the aperture chain now approaches
  `apertureCapRatio` asymptotically instead of multiplying the radius, so the two
  shipping sources fully stacked land at `r_collect/r_kill` = 0.56 rather than the
  1.10 a raw product reached. That moved measured η from ~1.00 to ~0.92–0.99 —
  real, and not enough.

  What is left is **structural, and it is a design question rather than a tuning
  one**. Motes never expire and the movement policy routes toward them, so η is
  not a steady-state efficiency at all — it is "did the operator ever walk over
  this mote" across a 30-minute run, and that tends to 1 unless something forces
  abandonment. The designed 0.65–0.78 asserts that a fifth to a third of all
  motes are never picked up; nothing in the sim can produce that outcome. Three
  ways out, none of them free:
  - **Motes decay.** Makes η an efficiency again and gives the collector its
    modelled yield back — but `IDENTITY.md` builds the collector _gamble_ on
    persistence ("deferring collection to bank a larger burst"), so this trades
    one designed mechanic for another.
  - **Density forces abandonment.** The intended pressure, and see the
    `entityBudget` entry below for why it currently never arrives.
  - **Accept η ≈ 0.95 and re-derive.** Cheapest, and it costs the archetype its
    signature transaction: at that η the dive is not a decision, and the identity
    line's "kill at the edge, dive to collect" stops describing the game.

  Until one is chosen, do not retune income against the η reading.

- **The collector is implemented, is always picked up, and is worth ~1% of
  income against a modelled 11%.** Every drop was taken in every probed seat, so
  the mechanic and the routing term work. The shortfall is entirely downstream of
  the η entry above: a pull banks a share of the _uncollected_ pool, and at
  η ≈ 0.95 that pool is nearly empty. `COLLECTOR_BALANCE.onscreenShare` is the
  projection's assumption; the probe now measures the burst share against it, and
  the two will not agree until η does. Fixing the collector is not the lever —
  it is already correct.
- **Evolutions are reachable but rare** — one per seat per arc, against a pool
  sized for two or three. Two fixes landed (the policy weights depth by proximity
  to `maxLevel`; the draw weights a device by how deep it already is); the
  remainder is suspected to be the DRAW, not the policy — a device needs eight
  levels and an offer shows three of ~10 candidates, so the deepest device is
  often not on the table.
- **Level dominates shape, so the device roster has no arc.** `data/devices.ts`
  § Cardinality intends `maxTargets` to decide the late roster: the capped shapes
  stop scaling, the area shapes do not, and the draft's character changes as
  density climbs. The dispatch table says otherwise. Every seat's top killer is
  simply whichever device reached level 8 and evolved, irrespective of shape — a
  maxed single-target `bolt` takes 45–51% of kills where a maxed 24-target
  `pulse` takes 56–59%. Those are the same number for design purposes.

  The arithmetic is not close. Seven levels of `LEVEL_GAIN` (`modules/sim/dispatch.ts`,
  solved from `offensivePickGain`) is ~10.5×, while the whole spread across the
  four shapes is 2–4×. A geometric level curve derived to hold time-to-kill flat
  against escalation will always swamp a linear target count, so "max one device"
  is the correct play in every seat and the roster is a skin. This is a real
  tension in the spine rather than a loose constant: the level gain is _solved_
  and § The knobs forbids overriding it directly, so an arc has to come from
  somewhere the solve does not reach — shape-dependent scaling, per-device gain
  curves, or a cap on how deep one device can go.

  A second reading in the same table sharpens it: `pulse` capture runs 21–26% on
  the seats that sit at `entityBudget` against **81% on the seat that never
  caps**. The one mass-clear device is `maxTargets`-bound precisely when there is
  a mass to clear, which is the shape of the kite-blob complaint from the seat.

- **Shop costs are anchored to a payout the sim does not deliver.** The
  projection sizes `baseCost` against ~627 notes for a baseline run; a real run
  banks ~242. So "one run buys the first tile" is closer to one and a quarter, and
  the whole-shop figure the projection prints is optimistic by about 2.6×. Same
  root as the schedule gap — the closed form assumes seats engage what their dial
  says and they currently do not — so fix engagement first and re-read the anchor
  rather than repricing the shop against a number that is going to move.
- **Traversal collapse has stopped happening at all.** It was three endings in
  four before the movement policy gained a turn cost and a slew limit; a piloted
  operator no longer walks itself into a closed pocket, and every arc now ends on
  the HP floor or on collection starvation. That is one loss condition quietly
  retired, and `BLOCKING_CROWD` / `ESCAPE_FLOOR` have still never been swept — so
  it is unknown whether the detector is now correctly silent or simply
  unreachable.
- **`entityBudget` is the binding density term for most of the back half of a
  run, measured rather than suspected.** `balance/arena-probe.ts` samples the
  live census every minute: seats sit pinned at exactly 400 —
  `THREAT_BALANCE.entityBudget` — for **7 to 19 of 30 minutes**, first binding as
  early as 12:00, because the spawn loop is `while (carry >= 1 &&
specimens.length < entityBudget)`.

  The census also shows the loop that makes it worse: the **lowest-DPS seat caps
  earliest and stays capped longest** (`kinetic`, first at 12:00, 19 minutes
  there, at 1.49 kills/s). Slow kills fill the floor and a full floor is then
  clamped flat, so this is not only a modelling question — it is a difficulty
  _inversion_, handing a density ceiling to the seat least able to clear one.

  **The modelling half is fixed:** `localDensity` (`data/arena.ts`) now clamps
  to `entityBudget`, since the sim's own near-operator population is the same
  quantity the formula estimates by residency — past the cap they are one
  quantity by construction, not two models agreeing by luck. Contact chance,
  traversal-collapse classification and bind-cause reporting all read the
  clamped value now, so the projection stops quoting a curve the sim abandoned.
  This was a fix to the model's honesty, not to the game — `entityBudget` is
  still a performance ceiling (400 at 20 Hz), not a designed number, and the
  inversion above is unchanged: a real fact about the shipping game, still open.

  Two directions remain, now cleanly separated from the modelling gap: raise or
  reshape `entityBudget` itself (a performance question first), or design the
  escalation curve to saturate toward the cap smoothly instead of hitting a
  wall, which would soften the inversion by slowing growth for every seat as it
  nears the ceiling rather than only for whichever seat fills the floor first.
  Also still the most promising route to a real `η`: the late-run abandonment
  that would push collection below 1 is exactly the pressure a hard cap removes,
  and a smoother saturation curve is more likely to produce it than a wall is.

- **The Culture Sprayer's cone fires along the movement heading, and nothing in
  the movement policy knows that.** `selectTargets` (`modules/sim/dispatch.ts`)
  filters the `cone` shape to a ~120° wedge about `state.operator.heading` — the
  direction the operator is _travelling_. `chooseHeading` scores threat, motes,
  collectors, walls and turn cost; it has no term for whether a directional
  device would connect. So the moment the policy is doing the thing this
  archetype is about — backing off a mass while devices work — the cone points at
  cleared floor, and a run that drafts into it buys a device that mostly fires at
  nothing. It is worse under a hand: for a player seat the heading _is_ the WASD
  vector, so kiting aims the wedge backwards by construction.

  This is the § Couplings corollary again, in a second costume: a thing that does
  not appear in the score does not reach the policy. `engage` was the first. The
  fix is a design choice rather than a tuning one — give `chooseHeading` a term
  for connecting the equipped directional shapes, or decouple facing from travel.

  **Measured, and worse than "a device that mostly fires at nothing": it is not a
  weapon at all.** The per-device dispatch table reads 27–56% connect and
  **0.2–0.7% of kills on every seat in the roster**, and two seats spent six and
  seven draft levels on it to get that. So it is not only a dead device, it is a
  live _trap_ — the draft policy keeps buying it, and those picks are gone.

  The table also ties it to the kite directly: connect rate runs inversely to
  time spent at `entityBudget` (`kinetic` 26.8% across 19 capped minutes,
  `reactive` 55.7% across none). The wedge follows travel, so the more the floor
  forces flight the more of it sprays cleared space — which is why this cannot be
  read as a device problem alone, and why the movement work and this fix are one
  question rather than two.

- **Guns-versus-butter is unsettled, and the reading that used to sit here was
  stale.** The structural asymmetry is real: DPS reaches survival only through
  the squared density term while `defenseShare` divides damage directly. But the
  evidence recorded for it — "three seats bind on the HP floor and `defence`
  outlasts the arc" — no longer describes the game. The probe reads two seats on
  the HP floor and two on collection starvation, both survivors reaching the full
  arc, and there is no `defence` seat in the roster it names. Contact was
  separately reconciled in `modules/sim/step.ts` (§ contact,
  `CONTACT_SATURATION`) once the sim was found an order of magnitude deadlier
  than the closed form at fifteen bodies touching, which is part of why it moved.
  The conversion rate between guns and butter is a _measurement_ and it still has
  not been made — on one seed per seat it cannot be.
- **`η` is assumed, never derived.** Every income figure inherits that assumption
  until a real movement policy is measured. A low `η` and a bad economy look
  identical from the outside, which is why the probe reports `η` separately —
  now split into continuous pickup and collector burst, which is what says which
  of the two channels a shortfall is in.
- **The stochastic leg is unexercised.** The draft is the archetype's one
  load-bearing stochastic subsystem, and the projection uses expected values
  throughout. Until seeded multi-run tooling exists, every reading here is a mean
  with no spread.
- **Collector timing is deterministic in the projection** (fixed times) where it
  is a drop in the game. The impulse magnitude is modelled; its variance is not.
