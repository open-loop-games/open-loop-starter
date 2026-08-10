# Survivor — balance orientation

How to work on this archetype's numbers. What it _is_ lives in `IDENTITY.md`
§ Rate-function spine; this file never restates the bucket.

A run is a race between two compounding curves. Device DPS compounds through the
draft; specimen HP and annulus density compound on minute marks. Everything else
— the XP ladder, the live population, the per-pick gain — is _derived_ from those
two plus the authored draft schedule, so almost nothing here is a free number.
The ones that are free are below.

**This file carries what the code cannot.** Where a constant's argument is in its
TSDoc, the entry states the claim and names the symbol rather than repeating it —
the duplicate is what goes stale. Findings live here; derivations live at the
value; how either was arrived at lives in the commit.

## The knobs

Constants live in `data/`, split by subsystem so each carries its own
`─── Balance ───` reasoning beside the numbers it justifies: `schedule.ts` (the
time axis), `arena.ts` (geometry and threat), `income.ts` (motes to levels),
`seats.ts` (the roster), `specimens.ts` (the threat roster), `devices.ts` (the
draft pool), `meta.ts` (the cross-run shop). `modules/tuning.ts` declares the
`tunable()` key union; not every constant below is wired to one yet.

| Knob                                                                  | What it moves                                                                                                                                                                         |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `beatFirstSeconds`, `beatRatio`                                       | the draft schedule. The beat _count_ is a consequence, not a knob — hold the 30–90s band and ~33 beats falls out                                                                      |
| `hpGrowthPerMinute`                                                   | how hard escalation bites. Also re-solves the per-pick DPS gain, since that is pinned to flat time-to-kill                                                                            |
| `spawnRate0`, `spawnGrowthPerMinute`                                  | density, and with it the whole traversal term. Nothing caps the floor, so this reaches it undiluted                                                                                   |
| `dwellSeconds`                                                        | how long an unengaged body lingers — the residency term in `localDensity` AND what bounds live population. Moves density everywhere                                                   |
| `contactDamageGrowthPerMinute`                                        | per-hit escalation. Deliberately far slower than HP growth                                                                                                                            |
| `densityCap`, `BLOCKING_CROWD`, `ESCAPE_FLOOR`                        | where gaps close. Contact is the _squared_ approach to it, so this is quiet until it is sudden                                                                                        |
| `hpPickGain`                                                          | what a defensive pick buys                                                                                                                                                            |
| `apertureCapRatio`                                                    | the ceiling `r_collect/r_kill` approaches as aperture sources stack. Bounds the top coupling structurally — see § Couplings                                                           |
| `COLLECTOR_BALANCE.onscreenShare`                                     | the projection's assumed burst size. The sim pulls everything inside `pullRadius` instead, so this is a prediction the probe measures against, not a rule                             |
| `COLLECTOR_BALANCE.pullRadius`, `timeJitter`                          | how much floor one pull banks, and how far a drop roams from its nominal time                                                                                                         |
| per-seat `engage`, `eta`, `speed`, `dps`, `toughness`, `defenseShare` | the personality bundle; also the sweep axis. Not orthogonal — `speed` and `engage` both move lethality, see § Couplings                                                               |
| per-seat `measured`                                                   | nothing, and that is the point — it is the OUTCOME the income model projects from, not an input to the game. Re-measure it after any change that moves the policy; never hand-tune it |
| device `baseDamage` / `cooldownSec`                                   | one device's cadence and weight. The opening device's pair is _solved_ against flat TTK at t=0, not chosen                                                                            |
| device `shape`                                                        | whether coverage is given or earned. A heading-bound shape is worth less to a policy than to a hand, and `modules/draft.ts` discounts it accordingly                                  |
| device `maxTargets`                                                   | how many of the specimens in reach an area shape takes. On `bolt`/`lance` it is definitional; on the area shapes it is the real lever — see § Known thin                              |
| specimen `hpFactor` / `damageFactor` / `weight`                       | the mix, and through it the required-DPS curve and the pressure curve                                                                                                                 |
| specimen `moteYield`                                                  | income. Coupled to the ladder — raise it and re-derive                                                                                                                                |
| `NOTES_PER_KILL`, `META_COST_RATIO`, per-upgrade `baseCost`           | the runs-to-buy ladder. Read the projection's meta table, not these numbers                                                                                                           |
| meta upgrade `side`                                                   | whether a tile is ladder-safe. Not annotation — see § Couplings                                                                                                                       |

**Deliberately not perturbable:** the per-pick DPS gain, the beat ratio, and the
XP ladder. All three are _solved_ — the gain from flat time-to-kill, the ratio so
the last beat lands inside the run, the ladder from the income model against the
schedule. Overriding one directly decouples it from what it was derived to
satisfy, which is how a ladder silently stops meaning anything while still
looking like a ladder. Change the input and re-derive.

## Couplings

**A seat dial is a preference; what the policy achieves is a different number,
and the model must never read one for the other.** `engage` asks for a share of
spawns brought inside `r_kill`; measured, that splits into `reach` (bodies ever
in range, over spawns — the movement half) and `lethal` (kills over reached — the
DPS half), and only their product drops motes. Over sixteen seeds `reach` runs
**0.69 / 0.64 / 0.80 / 0.75** against dials of 0.55 / 0.40 / 0.72 / 0.62 while
`lethal` runs **0.53 / 0.48 / 0.97 / 0.66**. A seat whose engagement is short is
almost never failing to meet the floor; it is failing to kill what it met, so
**retuning `engage` moves the model and barely moves the game**. (`lethal` above
1 is not a bug — splitter fragments count in `kills` but deliberately in neither
`spawned` nor `reached`, `modules/sim/step.ts` `SPLITTER_FRAGMENTS`.)

This is why `data/seats.ts` carries `measured` beside the dials and why
`data/income.ts` projects only from it. The two errors run in opposite directions
and cancel on the baseline, so the compound looks healthy while the collector —
priced as a cut of `1 − η` — silently inflates. See § Known thin, η.

**Lethality is one quantity — the share of damage that finishes a body — and
crowding is what spends it.** A body dies only if it stays in range long enough
to absorb its own HP, so damage landing on a body that then leaves bought
nothing, and damage landing past a body's remaining HP bought nothing either.
Both are booked directly rather than inferred: `ArenaStats.damageConverted`
against `damageWasted` and `damageOverkill` (`modules/sim/types.ts`), split at
the moment a body's fate is settled.

| seat         | waste | overkill | `lethal` |
| ------------ | ----- | -------- | -------- |
| `reactive`   | 14.9% | 93.2%    | 1.03     |
| `shielded`   | 37.7% | 61.9%    | 0.52     |
| `generalist` | 39.5% | 73.4%    | 0.53     |
| `kinetic`    | 43.9% | 68.7%    | 0.44     |

Both are quoted against the same denominator, because they are competing
destinations for one budget and a change to target selection trades one for the
other. **Overkill is the larger of the two on every seat and has never been
tuned against** — a levelled device carries ~10× its opening damage into bodies
sized by the escalation curve, and `maxTargets` decides how many of them absorb
it.

Crowding is where the roster separates, and it is the only place it does:

| live bodies | `generalist` | `kinetic` | `reactive` | `shielded` |
| ----------- | ------------ | --------- | ---------- | ---------- |
| < 50        | 2.1%         | 4.4%      | 0.3%       | 1.2%       |
| 50–99       | 13.1%        | 26.7%     | 3.3%       | 15.5%      |
| 100–199     | 45.9%        | 54.8%     | 20.4%      | 43.8%      |
| 200+        | 77.7%        | 90.4%     | 41.5%      | 62.8%      |

Monotone for every seat, because `maxTargets` spreads each activation over more
bodies as the floor fills and each body absorbs less before it leaves.

**Read that against lethality by run level, which is now flat.** Binned by the
level a minute was played at, the four seats agree within 1.0–1.1× through band
11–15 and separate only at 21–25 (4.2×) and 26+ (8.8×) — the bands a run reaches
once the floor is crowded. A roster that lies on one curve until density arrives
does not have a seat constant; it has a density term. Anything attributing the
late spread to a seat dial has to explain the flat half first.

**A seat dial once carried the blame here and did not deserve it.** `speed` was
measured as the largest lethality dial on the roster and costed as a design
decision, on readings taken through a movement policy whose near-field income
term was inverted (`modules/sim/steering.ts` `MOTE_NEAR_WEIGHT`). With the sign
corrected `kinetic` moves from `lethal` 0.11 to 0.44–0.50 and the roster spread
collapses from 8.5× to ~2×. The transferable half is not about `speed`: **a
policy-driven agent is a measurement instrument, and every economy reading is
taken through it** — see `modules/sim/steering-scenarios.test.ts` for the
calibration that now guards it.

**Target selection is an income decision, not only a lethality one.** A body's
mote drops where it dies and `r_collect` is smaller than `r_kill`, so _which_
body a shape picks decides where the floor's income lands: picking by health
scatters kills across the whole kill disc, picking the nearest drops them at the
operator's feet.

Two concentration rules were built against `arc-lance`'s shipped nearest-first —
closest-to-dying, and a two-tier rule taking the heaviest body an activation can
kill — and both lost, `η` falling on every seat. **That receipt predates the
steering fix** and was taken on a pilot that could not collect, so the conclusion
is not safe to lean on; the coupling it names is. Re-run both against the current
pilot before treating concentration as closed, and note that the overkill column
above is exactly what they were built to reclaim.

**`r_collect` against `r_kill` is the top coupling and sets the price of all
income.** Kills land at the outer edge; motes land where the specimen died; the
collect radius is smaller, so banking means looping back through cleared space.
At `r_collect → r_kill` income is free and this becomes a DPS check; small, and
every level-up is paid for with a dive. Nothing else moves the character of the
game as much with one number.

Which is why the ratio is **bounded where it is computed, not where its inputs
are authored** — two runtime sources multiply the aperture and on a raw product
reached `r_collect` 199 against an `r_kill` of 180, by ordinary play.
`collectRadiusFor` (`data/arena.ts`) carries the headroom-curve derivation and
why it is not a clamp. The general lesson, and the reason it is written here:
when one ratio decides a genre, bound it at the point of computation, because
contributors get added by people who have not read the coupling.

**Engagement rate is an economic term, not a survival tactic.** The scrolling map
means the operator chooses how much threat to meet, so the movement policy
decides income. The closed form cannot predict `η`; it assumes one. **Any change
to the movement policy is a balance change even when no constant moved.**

Two corollaries, both of which have bitten more than once:

- **A seat dial that does not appear in the score does not reach the policy.**
  `engage` biased only the orbit distance for most of this archetype's life and
  worked solely because an undamped arg-max thrashed the operator through the
  mass; smoothing the steering halved kill rate. `ENGAGE_WEIGHT`
  (`modules/sim/steering.ts`) is the real channel, and its TSDoc has the receipt.
  Check a dial's term exists before reading a probe that quotes it.
- **Existing is not enough — an arg-max acts on a term's SPREAD across the
  candidate set, never its level.** A term reading the same on every candidate
  subtracts a constant and drops out at any magnitude. Four instances so far, and
  they fail in different disguises: a flat contact cliff that dominated
  everywhere (`CONTACT_WEIGHT`), a priced term that was identically zero in the
  band where decisions happen (`CONTACT_HORIZON` — swept 900 → 3500 with
  byte-identical output), a connect weight too small to pay for the turn it
  bought, and a **saturation** on a summed term that flattened it to 0.0–3.5
  spread above a hundred live bodies while reading 15–23 below. The last is the
  one to generalise from: a cap truncates differences, which is exactly what an
  arg-max reads. `ENGAGE_SATURATION` survives only because `inKill` counts a
  180-unit disc that never fills.

  The rule that falls out: **before tuning a weight, confirm it moves the outcome
  at all.** `balance/steering-probe.ts` prints per-term spread by density band
  for exactly this.

**Killing thins the field.** Engaged specimens leave by dying, unengaged by
dwelling out, so `engage` and `dps` both feed local density and therefore
contact. Easy to break by modelling density as spawn rate alone.

**Collector impulses must be in the income model at derivation time, amortized.**
They are ~11% of run income in two bursts, and both ways of getting it wrong are
live: leave them out and the ladder never re-syncs after the first burst (beats
land up to ~115s early, monotone); put them in as point impulses and the ladder
goes non-monotone, because the beat straddling a nominal drop absorbs the whole
burst — correct only for runs whose collectors land where the model said, and the
drop is a roll. `cumulativeIncomeAmortized` (`data/schedule.ts`) is the one to derive against. What
remains is bounded oscillation, which is the honest price of impulsive income.

**The per-pick gain is pinned to `defenseShare`.** Picks spent on survivability
are picks not spent on DPS, so raising a seat's defensive allocation raises what
each remaining offensive pick must deliver to keep time-to-kill flat.

**Every term that multiplies required DPS must be inside `offensivePickGain`.**
Time-to-kill is a _per-specimen_ quantity while the operator's DPS is divided
among everything in the kill radius, so the solve has to cover specimen HP
growth, density growth, _and_ the roster's mean-HP shift as heavy tiers enter.
This was missed twice in the same direction, and the failure is silent and wears
a disguise: `localDensity` treats time-to-kill as constant, so an under-solved
gain leaves the density model assuming a DPS curve the draft never delivers —
TTK drifts up, residency with it, density climbs super-linearly, and the run gets
harder for reasons nothing in the model admits to. It reads as a difficulty
problem and it is an arithmetic one. Add a term that multiplies required DPS and
it goes in the solve.

**A meta upgrade's `side` decides whether it is ladder-safe.** Income is
`spawnRate · engage · meanMoteYield · η` and contains no DPS term, so a
survival-side upgrade buys only what its name says, while an income-side upgrade
moves η or yield — both inside the income the ladder was derived against — so
owning it makes beats land earlier than the schedule says. That front-loading is
intended and bounded by `maxLevel`, but it is large: at full investment income
roughly doubles and a run finishes its draft about six minutes early. Two things
a fork should not lose — the ladder is derived for a **zero-meta** run (deriving
against mid-progression would make run 1 unplayable), and adding an income-side
tile re-paces the whole meta arc rather than just its own line. Prefer a
survival-side effect when the design is indifferent; it costs the schedule
nothing.

## Running a pass

Each probe's own header says what it prints and how to read it. This is which
one answers which question, and in what order.

- `balance/survivor-projection.ts` — the closed form. Predicts; discovers
  nothing. Read it to know what the sim is supposed to disagree with.
- `balance/arena-probe.ts` — the shipping game headless, **one seed read in
  depth**. The surface for per-device dispatch and the live census against
  `localDensity`, both of which want one legible run rather than a median.
- `balance/spread-probe.ts` — the same arc across a seed batch (`SEEDS=16` to
  widen; default 8, about seven minutes for the roster). The spine's declared
  measurement half. **Read this before believing any figure the arena probe
  prints.**
- `balance/steering-probe.ts` — the path rather than the economy, plus the
  per-term spread table § Couplings sends you to.
- `balance/lethality-probe.ts` — the arc SAMPLED rather than summed: lethality by
  minute, by run level, by live population, and the loadout each seat held at a
  given level. Reach for it when a seat is behind and you need to know whether it
  started behind, fell behind, or drafted differently — an end-of-run total
  cannot tell those apart, and they want different repairs.

Three reading rules that are not in any header:

- **`engage` is three numbers, not one** — the realized figure against the dial,
  then `reach` and `lethal`. Read the split before the total; the halves fail for
  unrelated reasons.
- **`modal` carries the design target** — the share of seeds a seat ended on its
  single most common cause. 100% is a wall in costume however well-tuned the
  constant behind it is. Everything printed `median [min–max]` is the observed
  range, not a tail estimate: at batch sizes an arc probe can afford, floor-index
  percentiles select the endpoints anyway.
- **Both arc probes drive one fixture** (`balance/_arc.ts`), so a disagreement
  between them is the seed and never the code.

Magnitudes print, never assert. Behavioural suites sit beside their modules and
carry no numbers.

## Known thin

- **No seat reaches the timer, and the cause distribution is not right either.**
  `IDENTITY.md` targets "three specialists each bound by a different cause, with
  the baseline mostly reaching the timer". Over eight seeds per seat: **zero runs
  of thirty-two end on the cause `timer`**, and the roster carries **two**
  distinct modal causes rather than three (`hp-floor`, `traversal-collapse`) at
  shares of 63 / 50 / 88 / 63%.

  Read the cause, not the clock: runs that survive the full thirty minutes are
  booked `collection-starvation` when they finish more than three beats behind
  schedule (`modules/run.ts`), so "nothing reaches the timer" and "nothing
  survives" are different claims with different repairs.

  **This is now a difficulty question rather than an income one**, which it has
  never been before. The roster lands 24–28 levels on a schedule of
  −5 / −5 / +1 / −5 and `η` runs 0.86–0.99, so the economy is close to its
  ladder and the arc still ends early. Escalation also runs undiluted where a
  ceiling once discarded 40–70% of it, so the back half is harder than any
  tuning has been done against.

  Two repairs were built against this entry and both reverted on measurement: a
  seeking term steered and bought nothing, because `reach` already runs above
  the declared dial on every seat; and concentrating target selection cost more
  `η` than the waste it recovered — on a pilot since found to be broken, so that
  second receipt wants re-running (§ Couplings). What has never been swept is
  the escalation curve itself against a pilot that collects.

- **Do not read a `kinetic` figure off one arc, and do not read the roster off
  one pass.** The seat spent most of this archetype's life as its clear outlier
  and is now level with the others (`lethal` 0.47 against 0.49 / 1.01 / 0.51),
  because two defects were found underneath the readings rather than in the
  seat: an orbit radius outside its own weapon reach
  (`modules/sim/steering.ts` `orbitRadius`) and an inverted income term in the
  movement policy. Both presented as "this seat is weak", both were costed as
  balance, and neither was. The arena probe's single seed sat at or near the top
  of the seat's range throughout.

- **η runs 0.87–0.99, and that is the correct value rather than a divergence.**
  Motes do not expire, so the wake is always sweepable and a pilot that routes at
  all approaches full collection; the exemplar set ships the same persistence.
  The old 0.65–0.78 "band" was a dial being read as a forecast. What is left on
  the floor at the end (27–456 motes) is the whole shortfall.

  **Read the compound, never η alone.** Income rides `killsPerSpawn × η`, and the
  two halves diverge from their dials in OPPOSITE directions — the policy kills a
  smaller share of spawns than asked and banks a larger share of drops than
  asked. On the baseline those nearly cancel (0.354 measured against 0.358
  dialled), which is exactly why reading either half by itself reports a
  divergence the other half has already paid for. The probes print `income`
  beside `modelled` for this reason. Measured: 0.354 / 0.288 / 0.642 / 0.513.

  It remains **assumed, never derived** — but the assumption now lives in
  `data/seats.ts` `measured`, with a probe receipt, instead of being borrowed
  from a policy weight that happens to share its name. A seat authored from
  scratch cannot be projected until it has been run once; that is the declared
  price of a policy output, not a gap.

- **The collector is a small pickup that the model used to think was a large
  one, and that error reached the XP ladder.** Its yield is a cut of the
  _uncollected_ pool, and with motes persistent and the sweep always available
  that pool stays near empty — burst share measures 0–1% of income. The model
  now agrees, at 0.6% in two bursts, because it projects from `measured.eta`
  rather than the dial; at a dialled η of 0.65 it read the pool as 35% of drops
  and priced the collector accordingly. Understating η therefore _inflated_ the
  collector, and the ladder is derived from income including it — worst
  derivation deviation was 44.6s and is now 3.3s.

  Never broken, and not a candidate for repricing upward: every drop is taken in
  every probed seat and the routing term works. A collector is _always good_ and
  cheap to take, which is the genre-standard shape; it is simply not a harvest of
  an abandoned field, because with a competent pilot there is no abandoned field.
  Its timing is also deterministic in the projection where it is a roll in the
  game — magnitude modelled, variance not.

- **Evolutions are reachable but rare** — one per seat per arc against a pool
  sized for two or three. Two fixes landed (the policy weights depth by proximity
  to `maxLevel`; the draw weights a device by how deep it already is); the
  remainder is suspected to be the DRAW, since a device needs eight levels and an
  offer shows three of ~10 candidates.

- **"Max one device first" is correct play, so the roster's job is to make WHICH
  one a real choice.** Seven levels of `LEVEL_GAIN` (`modules/sim/dispatch.ts`) is ~10.5× against a 2–4×
  spread across the four shapes, so depth beats breadth by construction. That is
  the genre behaving normally, and the level gain is _solved_ anyway.

  What made the roster read as a skin was one device returning ~1% of kills
  whatever you did with it — three interchangeable options and a trap. With that
  resolved, one arc per seat showed four different rotations; **across eight seeds
  the divergence is much weaker.** `arc-lance` is the modal top killer on _every_
  seat (5 / 6 / 4 / 4 of eight). Seats vary, but around one shared favourite
  rather than into four personalities. What separates "different seats" from "one
  draft with variance" is whether the modal pick differs BY seat, and it does not.
  Read `spread-probe.ts` § Draft variance, not the arena probe's `lvl` column.

  Still open, and why `maxTargets` is no longer called the arc knob: `pulse`
  capture rises and falls with how crowded the floor gets and `maxTargets` is the
  lever — but only on the AREA shapes. With every cap removed at once `bolt`
  becomes dominant at 48–69% of kills, because an uncapped single-target shape is
  a pulse with a 0.55s cooldown. On `bolt`/`lance` the cap is what the shape IS.
  Uncapping `pulse` alone leaves the roster intact.

- **The cone is a human-play device and the draft says so.** `HEADING_BOUND_DISCOUNT`
  (`modules/draft.ts`) applies only when `seat.driver !== 'player'`; that call
  site and `CONNECT_WEIGHT` (`modules/sim/steering.ts`) carry the measurements
  and the manoeuvre argument. Two cautions: deleting the discount without
  improving the manoeuvre puts seats back to sinking six levels into a 1% device,
  and it is a discount rather than a ban, so it should shrink as the manoeuvre
  improves.

  Not yet measured: **what the cone is worth under an actual hand.** That a
  player aims it better is reasoning, not a reading — and the human seat ships,
  so it is checkable. The one claim in this file with no receipt behind it.

- **There is no `AutomationTiers` ladder here, and that is a decision rather than
  an omission.** The conformance canon asks every archetype for a
  `modules/automation.ts` behind a tier gate. Survivor has no player-facing
  automation to gate: a run is played, and what accrues between runs is a
  purchase rather than a policy — so a ladder would withhold nothing, which the
  same rules call a divergence in its own right. What the seats carry instead is
  an AI DRIVER, gated by install presence the way an opponent is. Full argument
  and the gate itself at `data/seats.ts` § `SeatDriver`.

  What that costs a fork: if you add automation a player unlocks — auto-draft, an
  auto-collector, a between-run optimiser — it does **not** belong on this seam.
  `SeatDriver` answers "who plays this run"; a tier answers "what has the player
  earned the right to stop doing". Widening the driver union to carry an unlock is
  the tempting wrong move, because from the call site both read as "something else
  decides now".

- **Traversal collapse is a real ending again**, and it was the flee-bot that had
  retired it: while the contact cliff dominated, the operator held a 55-unit
  margin from everything and could not be enclosed, so the loss condition was
  unreachable by construction rather than correctly silent. `BLOCKING_CROWD` and
  `ESCAPE_FLOOR` have still never been swept, and now that the detector fires the
  sweep is worth something.

- **`dwellSeconds` is measured rather than assumed, and the receipt matters more
  than the value.** Twelve is what the geometry says — at 38–70 units/s across a
  560–760 annulus that is about how long crossing the gap takes — but it assumes
  an operator holding ground, and this one retreats. At 12 the arc collapsed
  (`kinetic` finishing at level 5, thirty beats behind). Thirty is what the policy
  can actually meet. Model against sim now reads 59/49, 29/25, 60/34 live-at-10:00
  against modelled, from 26–235 against 12–21 — so `localDensity` can be read as
  a prediction again.

- **Before widening a device against a wall of enemies, check that killing them
  removes them.** Kept for the disguise rather than the bug: `spawnCarry` once
  banked spawns a full floor could not admit, so the floor was welded to its
  ceiling and killing could not thin it by one body. It read as a `maxTargets`
  problem, and no value of `maxTargets` would have helped. Fixed and locked by
  two specs; the ceiling it depended on is gone.

- **Shop costs are anchored to a payout the sim does not deliver.** The
  projection sizes `baseCost` against ~627 notes for a baseline run; a real run
  banks ~242, so "one run buys the first tile" is nearer one and a quarter and
  the whole-shop figure is optimistic by ~2.6×. Same root as the schedule gap, so
  fix lethality first and re-read the anchor rather than repricing against a
  number that is going to move.

- **Guns-versus-butter is unsettled.** The structural asymmetry is real — DPS
  reaches survival only through the squared density term while `defenseShare`
  divides damage directly — but the conversion rate between them is a
  _measurement_ and has never been made. The evidence once recorded here named a
  `defence` seat the roster does not contain.
