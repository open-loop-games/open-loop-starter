# Survivor — balance orientation

How to work on this archetype's numbers. What it _is_ lives in `IDENTITY.md`
§ Rate-function spine; this file never restates the bucket.

A run is a race between two compounding curves. Device DPS compounds through the
draft; specimen HP and annulus density compound on minute marks. Everything else
— the XP ladder, the live population, the per-pick gain — is _derived_ from those
two plus the authored draft schedule, so almost nothing here is a free number.
The ones that are free are below.

## The knobs

Constants live in `data/`, split by subsystem so each carries its own
`─── Balance ───` reasoning beside the numbers it justifies: `schedule.ts` (the
time axis), `arena.ts` (geometry and threat), `income.ts` (motes to levels),
`seats.ts` (the roster), `specimens.ts` (the threat roster), `devices.ts` (the
draft pool), `meta.ts` (the cross-run shop). `modules/tuning.ts` declares the
`tunable()` key union; not every constant below is wired to one yet.

| Knob                                                                  | What it moves                                                                                                                                             |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `beatFirstSeconds`, `beatRatio`                                       | the draft schedule. The beat _count_ is a consequence, not a knob — hold the 30–90s band and ~33 beats falls out                                          |
| `hpGrowthPerMinute`                                                   | how hard escalation bites. Also re-solves the per-pick DPS gain, since that is pinned to flat time-to-kill                                                |
| `spawnRate0`, `spawnGrowthPerMinute`                                  | density, and with it the whole traversal term. Nothing caps the floor, so this reaches it undiluted                                                       |
| `dwellSeconds`                                                        | how long an unengaged body lingers — the residency term in `localDensity` AND what bounds live population. Moves density everywhere                       |
| `contactDamageGrowthPerMinute`                                        | per-hit escalation. Deliberately far slower than HP growth                                                                                                |
| `densityCap`, `BLOCKING_CROWD`, `ESCAPE_FLOOR`                        | where gaps close. Contact is the _squared_ approach to it, so this is quiet until it is sudden                                                            |
| `hpPickGain`                                                          | what a defensive pick buys                                                                                                                                |
| `apertureCapRatio`                                                    | the ceiling `r_collect/r_kill` approaches as aperture sources stack. Bounds the top coupling structurally — see § Couplings                               |
| `COLLECTOR_BALANCE.onscreenShare`                                     | the projection's assumed burst size. The sim pulls everything inside `pullRadius` instead, so this is a prediction the probe measures against, not a rule |
| `COLLECTOR_BALANCE.pullRadius`, `timeJitter`                          | how much floor one pull banks, and how far a drop roams from its nominal time                                                                             |
| per-seat `engage`, `eta`, `speed`, `dps`, `toughness`, `defenseShare` | the personality bundle; also the sweep axis                                                                                                               |
| device `baseDamage` / `cooldownSec`                                   | one device's cadence and weight. The opening device's pair is _solved_ against flat TTK at t=0, not chosen                                                |
| device `shape`                                                        | whether coverage is given or earned. A heading-bound shape is worth less to a policy than to a hand, and `modules/draft.ts` discounts it accordingly      |
| device `maxTargets`                                                   | how many of the specimens in reach an area shape takes. On `bolt`/`lance` it is definitional; on the area shapes it is the real lever — see § Known thin  |
| specimen `hpFactor` / `damageFactor` / `weight`                       | the mix, and through it the required-DPS curve and the pressure curve                                                                                     |
| specimen `moteYield`                                                  | income. Coupled to the ladder — raise it and re-derive                                                                                                    |
| `NOTES_PER_KILL`, `META_COST_RATIO`, per-upgrade `baseCost`           | the runs-to-buy ladder. Read the projection's meta table, not these numbers                                                                               |
| meta upgrade `side`                                                   | whether a tile is ladder-safe. Not annotation — see § Couplings                                                                                           |

**Deliberately not perturbable:** the per-pick DPS gain, the beat ratio, and the
XP ladder. All three are _solved_ — the gain from flat time-to-kill, the ratio so
the last beat lands inside the run, the ladder from the income model against the
schedule. Overriding one directly decouples it from what it was derived to
satisfy, which is how a ladder silently stops meaning anything while still
looking like a ladder. Change the input and re-derive.

## Couplings

**`engage` and `dps` are not independent seat axes — realized engagement is
their product, and only one half is under the policy's control.** `engage` is
authored per seat as a movement personality and enters the closed form
(`data/arena.ts` § localDensity) as the share of spawns brought inside `r_kill`.
Measured, that share splits in two, and the probes print both:

- `reach` = bodies ever inside `r_kill`, over spawns. **The movement half.**
- `lethal` = kills over bodies reached. **The DPS half.**

Over eight seeds, `reach` runs **0.67 / 0.57 / 0.80 / 0.80** against dials of
0.55 / 0.40 / 0.72 / 0.62 — _above_ the dial on every seat — while `lethal` runs
**0.54 / 0.11 / 1.03 / 0.58**. So reach varies 1.4× across the roster and
lethality varies 9.4×, and essentially all of the realized-engagement spread
lives in the half `engage` does not name. A seat whose engagement is short is
almost never failing to meet the floor; it is failing to kill what it met.

Two consequences a fork should not have to rediscover. **Retuning `engage` moves
the model and barely moves the game** — the dial's real reach is the orbit
distance and the `ENGAGE_WEIGHT` term, both of which are already over-delivering.
And **`lethal` above 1 is not a bug**: splitter fragments are counted in `kills`
but deliberately in neither `spawned` nor `reached` (`modules/sim/step.ts`
§ splitter), so a seat that clears splitters banks kills the denominator never
saw. It is the same population on both sides of `reach`, which is what that
figure needs; `lethal` is a rate, not a fraction.

**The low-DPS seat's collapse compounds rather than sits.** `kinetic` and
`shielded` are authored at the same `dps` 0.9, and their median levels are 10
and 22 — because `lethal` feeds income, income feeds the ladder, the ladder feeds
device level, and device level is DPS. A seat that starts slightly behind on
killing ends the arc twelve draft beats behind on the thing that kills. Nothing
in the closed form has this loop in it: `localDensity` takes `dps` as a
parameter, not as a function of the income the seat has managed to bank. Read
`level` beside `lethal` before concluding a seat is badly tuned — the constant
may be fine and the feedback may be the whole story.

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

**And existing is not enough — an arg-max acts on a term's SPREAD across the
candidate set, never its level.** A term reading the same on every candidate
subtracts a constant and drops out of the decision at any magnitude. This has now
bitten in both directions, which is why it is a coupling and not a note:

- The old contact cliff was a flat −400 below `contactRadius · 2.5`, and its
  spread measured ~390–435 against `engage` 17–31, mote 3–5, turn 18 — at _every_
  density band. Nothing could reach past it, so the whole policy was "avoid
  contact, then break ties", and because a 55-unit margin is unbuyable on a floor
  with a body every ~30 units, the back half of a run had no candidate pointing
  at the fight. **A density-blind safety margin and "flee" are the same
  instruction once density arrives.**
- Replacing it with a priced term did nothing at first, for the mirror-image
  reason. The price fired only inside `contactRadius`, so it was identically zero
  across the 22–180 unit band where decisions are actually made — `CONTACT_WEIGHT`
  swept 900 → 3500 with byte-identical probe output. A price that only speaks once
  you are being hit is not a price; it needs `CONTACT_HORIZON` to become a
  function of the approach.

The reading rule that falls out: **before tuning a weight, confirm it moves the
outcome at all.** `balance/steering-probe.ts` prints per-term spread by density
band for exactly this, and two of this archetype's steering constants have now
been found inert by it.

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

  It also prints a **live census against the model**, sampled each minute:
  peak population, when the cap first bound, and how many minutes were spent
  pinned there. That table exists because end-of-run totals cannot distinguish a
  floor clamped for half the arc from one that never filled — see § Known thin.

- `pnpm exec vite-node src/showcase/archetypes/survivor/balance/spread-probe.ts`
  — the same arc across a seed batch (`SEEDS=16` to widen; default 8, about
  seven minutes for the roster). This is the spine's declared measurement half:
  median survival, `η` split, the economy as a range, and the **binding-cause
  distribution**. Read it before believing any figure the arena probe prints.

  Both probes print `engage` as three numbers, not one: the realized figure
  against the seat's dial, then `reach` and `lethal` beside it. Read the split
  before reading the total — the two halves fail for unrelated reasons and § Couplings
  is about what happens when they are conflated.

  The column that carries the design target is `modal` — the share of seeds a
  seat ended on its single most common cause. A seat at 100% is a wall in
  costume however well-tuned the constant behind it is, and `IDENTITY.md` asks
  for three specialists on three different causes. Everything printed as
  `median [min–max]` is the observed range, not a tail estimate: at batch sizes
  an arc probe can afford, floor-index percentiles select the endpoints anyway.

  **The two probes drive one fixture** (`balance/_arc.ts`), so a disagreement
  between them is the seed and never the code.

Magnitudes print, never assert. Behavioural suites sit beside their modules and
carry no numbers.

## Known thin

- **η is now IN its designed band, and it came from the movement policy rather
  than from the economy.** Measured 0.45–0.81 continuous against an assumed
  0.65–0.78, where it read 0.91–0.99 before the contact term was priced. The
  earlier entry here treated the residual as a design question about mote
  persistence and costed three exits; that framing was wrong, and the receipt is
  that none of them were taken and η moved anyway. An operator circling a capped
  mass retraces its own floor and sweeps everything for free, so η ≈ 1 was a
  symptom of the kite, not an independent property of persistent motes. Motes
  left on the floor at run end went from 24–247 to 280–650.

  What remains open is the price paid for it: kill rate fell (generalist 2.51 →
  1.73 kills/s) and the schedule deficit widened (−3/−7/+3/−6 → −8/−19/+2/−9),
  because engaging is only survivable if engaging clears the floor, and § Known
  thin's roster-arc entry says it does not. **The movement and roster findings are
  one problem seen twice**, and income should not be retuned until the roster is
  settled.

  The aperture bound remains load-bearing underneath all of this: the chain
  approaches `apertureCapRatio` asymptotically instead of multiplying the radius,
  so the two shipping sources fully stacked land at `r_collect/r_kill` = 0.56
  rather than the 1.10 a raw product reached. That was worth ~0.05 of η on its
  own; the policy was worth the rest.

- **The collector now banks 2.6–6.1% of income against a modelled 11%, up from
  0.2–1.1%.** It was never broken — every drop is taken in every probed seat and
  the routing term works. Its yield is a share of the _uncollected_ pool, so it
  was starved by η ≈ 0.95 and recovered on its own when the movement policy
  started leaving motes behind. `COLLECTOR_BALANCE.onscreenShare` is still the
  projection's assumption and the two still do not agree, but the gap is now a
  factor of two rather than a factor of ten, and it should be re-read after the
  roster work rather than repriced now.
- **Evolutions are reachable but rare** — one per seat per arc, against a pool
  sized for two or three. Two fixes landed (the policy weights depth by proximity
  to `maxLevel`; the draw weights a device by how deep it already is); the
  remainder is suspected to be the DRAW, not the policy — a device needs eight
  levels and an offer shows three of ~10 candidates, so the deepest device is
  often not on the table.
- **"Max one device first" is correct play, so the roster's job is to make WHICH
  one a real choice.** Seven levels of `LEVEL_GAIN` (`modules/sim/dispatch.ts`,
  solved from `offensivePickGain`) is ~10.5× against a 2–4× spread across all
  four shapes, so depth beats breadth by construction and every seat maxes
  something. That is the genre behaving normally and not a defect to design out —
  the level gain is _solved_ and § The knobs forbids overriding it anyway.

  What made it read as "the roster is a skin" was a different fault: one of the
  four devices returned ~1% of kills whatever you did with it, so the choice was
  between three interchangeable options and a trap. With the cone entry below
  resolved, one arc per seat showed four different rotations — `bolt` 8★ +
  `pulse` 4, `pulse` 8★ + `lance` 5, `bolt` 8 + `pulse` 8★, `pulse` 6 + `lance`
  4, at top-killer shares of 46 / 58 / 36 / 54%.

  **Across eight seeds that divergence is much weaker than one run suggested.**
  `arc-lance` is the modal top killer on _every_ seat, on 5 / 6 / 4 / 4 seeds of
  eight, with `pressure-bell` and `sear-coil` taking the rest. So the seats do
  vary — a seat's rotation is not fixed — but they vary around one shared
  favourite rather than into four personalities, and the four-rotation reading
  was one draw of a stochastic draft. What separates "different seats" from "one
  draft with variance" is whether the modal pick differs BY seat, and today it
  does not. Read `spread-probe.ts` § Draft variance, not the arena probe's `lvl`
  column, before claiming the roster diverges.

  Still open, and the reason `maxTargets` is no longer described as the arc knob:
  `pulse` capture rises and falls with how crowded the floor gets, and
  `maxTargets` is the lever — but only on the AREA shapes. Measured with every
  cap removed at once, `bolt` becomes the dominant shape at 48–69% of kills,
  because an uncapped single-target shape is just a pulse with a 0.55s cooldown.
  On `bolt` and `lance` the cap is what the shape IS; on `pulse` and `cone` it is
  a number. Uncapping `pulse` alone leaves the roster intact.

- **Shop costs are anchored to a payout the sim does not deliver.** The
  projection sizes `baseCost` against ~627 notes for a baseline run; a real run
  banks ~242. So "one run buys the first tile" is closer to one and a quarter, and
  the whole-shop figure the projection prints is optimistic by about 2.6×. Same
  root as the schedule gap — the closed form assumes seats engage what their dial
  says and they currently do not — so fix engagement first and re-read the anchor
  rather than repricing the shop against a number that is going to move.
- **Traversal collapse is back, and it was the flee-bot that had retired it.**
  For as long as the contact cliff dominated the score, the operator held a
  55-unit margin from everything and could not be enclosed — the loss condition
  was unreachable by construction, not correctly silent. With contact priced it
  returns as a real ending (`reactive` at 15:18). That restores the third of the
  four binding causes `IDENTITY.md` declares, so the roster now ends on three
  distinct causes rather than two. `BLOCKING_CROWD` / `ESCAPE_FLOOR` have still
  never been swept, and now that the detector fires again the sweep is worth
  something.
- **There is no entity ceiling any more, and `localDensity` is now the only
  thing bounding the floor.** `entityBudget` was documented as the sim's budget
  at 20 Hz and behaved as a design constant: measured, it discarded **40–70% of
  the run's authored spawns**, so escalation past roughly the midpoint never
  reached the floor — while `offensivePickGain` is solved against that curve,
  spawn-growth term included. The draft was sized to beat a density the game had
  stopped delivering.

  Raising the ceiling instead was tried and rejected on measurement: at 3× two of
  four seats still pinned, at 1200. Removed outright, peak population went to
  763–1465 — bounded, but only by the annulus and the distance cull. What bounds
  it properly is dwell, below; with that landed the peak sits at 122–297.

- **The sim implements dwell now, and `dwellSeconds` is measured rather than
  assumed.** `localDensity` is Little's law over a residency built from this
  term, and for most of this archetype's life the sim did not implement it at
  all: `modules/sim/step.ts` § despawn culled on DISTANCE, at
  `spawnOuterRadius · 1.4`, and an operator that orbits rather than fleeing in a
  straight line almost never outruns anything. Bodies lived ~130s against a
  modelled 12 and the floor held hundreds against a modelled twenty — and that
  gap is the reason a hard entity ceiling ever looked necessary. A body is now
  exempt while inside `killRadius`, which is what engaged means and those leave by
  dying; outside it the clock runs, with distance kept as the backstop.

  **The value moved 12 → 30, and the receipt matters more than the number.**
  Twelve is what the geometry says: at 38–70 units/s across a 560–760 annulus,
  twelve seconds is about how long crossing the gap takes. But that assumes an
  operator holding ground, and this one retreats — at 12 the seats could not reach
  what spawned before it expired, realized engagement fell to 0.05–0.70 against
  dials of 0.40–0.72, and the arc collapsed, `kinetic` finishing at level 5 and
  thirty beats behind. Thirty is what the policy can actually meet.

  Model against sim now reads **59/49, 29/25, 60/34** live-at-10:00 against
  modelled, where it read 26–235 against 12–21. Within about 1.5×, from an order
  of magnitude — so `localDensity` can be read as a prediction again.

- **A full floor drops spawns; it used to bank them.** `spawnCarry` exists to
  carry the fractional remainder of `rate · dt` between ticks, and the budget
  check was inside the loop that drained it — so a pinned floor accumulated an
  unbounded queue, measured at **1734–5889 pending bodies against a 400 ceiling**.
  The floor was then not at the cap but welded to it: every kill was refilled
  within the same tick, and killing could not thin the field by one body for the
  back half of a run.

  Worth keeping although the ceiling it depended on is gone, because of what it
  disguised itself as. This read as a `maxTargets` problem — the mass-clear shape
  looked cap-bound exactly when the mass existed — and no value of `maxTargets`
  would have helped, because the floor refilled faster than any device could
  empty it. **Before widening a device against a wall of enemies, check that
  killing them removes them.**

- **The cone is a human-play device, and the draft now says so.** `selectTargets`
  (`modules/sim/dispatch.ts`) filters the `cone` shape to a ~120° wedge about
  `state.operator.heading` — the direction the operator is _travelling_ — so the
  moment the policy does the thing this archetype is about, backing off a mass
  while devices work, the wedge points at cleared floor. Measured at its worst:
  27–56% connect and **0.2–0.7% of kills on every seat**, with two seats sinking
  six and seven draft levels in. Not a weak device, a live trap.

  It was the § Couplings corollary in a second costume — a thing that does not
  appear in the score does not reach the policy — so `CONNECT_WEIGHT` gives
  `chooseHeading` a term for what the heading-bound devices would land, weighted
  by **imminence** rather than applied flat. That weighting is what makes it a
  manoeuvre: a device three seconds out is not worth facing, one about to fire
  is, so the operator kites, swings the wedge onto the mass as the cooldown
  arrives, fires, and resumes. The cone dance emerges from the score instead of
  being a state machine bolted beside it — which matters, because a scripted
  manoeuvre would have to be interrupted by the contact price and the wall term
  by hand, where a score term is simply outvoted.

  **It works, and it is not enough.** At four levels the manoeuvre took that
  seat's cone from 55.7% → 73.6% connect and 0.7% → 6.1% of kills. Against the
  omnidirectional shapes' 20–63% that is still a bad pick, because a wedge the
  policy has to earn is worth less than coverage it is simply given.

  So the resolution is a roster statement rather than a repair: **a device's
  value depends on who is driving, and the draft is where that belongs.**
  `HEADING_BOUND_DISCOUNT` (`modules/draft.ts`) applies only when
  `seat.driver !== 'player'`; under a hand the offer scores on its merits, and a
  hand aims a wedge far better than an arg-max with a turn cost ever will. It is
  a discount and not a ban — the device stays reachable, and it should shrink as
  the manoeuvre improves. Two cautions for anyone touching it: deleting the
  discount without improving the manoeuvre puts the seats straight back to
  sinking six levels into a 1% device, and the discount is the reason the seats
  now diverge into different rotations at all.

  Not yet measured: **what the cone is worth under an actual hand.** The claim
  that a player aims it better is reasoning, not a reading, and the human seat
  exists — so it is checkable, and it is the one part of this entry with no
  receipt behind it.

- **No seat reaches the timer, and the cause distribution is not right either.**
  `IDENTITY.md` targets "three specialists each bound by a different cause, with
  the baseline mostly reaching the timer". Over eight seeds per seat: **zero runs
  of thirty-two end on the timer**, the roster carries **two distinct modal
  causes** rather than three, and `collection-starvation` appears once in the
  whole batch. Modal shares run 50 / 75 / 63 / 88%.

  The distribution used to be recorded here as the half that was right. That
  came from a single seed on which the four seats happened to split, and it is
  the clearest thing the seed batch has corrected so far: **on one run, a roster
  and a coin land the same way.** Escalation also runs undiluted for the whole
  arc where a ceiling used to discard 40–70% of it, so the arc is harder than
  any tuning has been done against.

  **The gap is not seeking, and a seeking term was built and measured before
  that was known.** The reading that motivated one was realized engagement
  against declared — medians 0.36/0.55, 0.06/0.40, 0.83/0.72, 0.48/0.62 — read
  as "the policy only reacts to what is already near, so it never goes and gets
  the mass". Splitting that number says otherwise: `reach` is **above the
  declared dial on every seat** (§ Couplings). The operator was already bringing
  in more of the floor than its personality asked for.

  The term itself is recorded here because building it is the only reason the
  split exists. It scored bodies expected to ARRIVE inside `r_kill` over a 6s
  horizon, weighted by imminence, and it steered — term spread 22–48 on an open
  floor and 43–152 against a crowded one, comfortably in the band the other
  terms occupy. Swept at 0 / 2 / 5 / 9 over five seeds, realized engagement moved
  0.44 → 0.51 → 0.42 → 0.41 (generalist) and **0.09 → 0.08 → 0.10 → 0.10**
  (`kinetic`, the seat it was built for), while distinct modal binding causes
  across the roster fell 2 → 2 → 1 → 1. A term that steers hard, buys nothing,
  and costs the cause distribution is not mis-weighted; it is answering a
  question the game was not asking. Reverted.

  **What is actually short is lethality**, and § Couplings has the numbers and
  the compounding loop behind them. The economy still should not be retuned
  first: the thing to settle is whether a seat twelve draft beats behind is a
  constant to fix or a feedback loop to damp, and those want different repairs.

- **`kinetic` is much worse than its single-seed reading, and the seed that was
  being read is its best one.** Batch medians against the seed the arena probe
  runs: level 10 against 16, schedule −21 against −12, 0.26 kills/s against
  0.72, realized `engage` 0.06 against 0.24. Every one of those single-seed
  figures sits at or near the top of the batch's range. The orbit re-map
  (`modules/sim/steering.ts` § orbitRadius) removed a defect that was real; what
  it did not do is make the seat viable, and the point reading said otherwise.
  Do not read a `kinetic` figure off one arc.

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
