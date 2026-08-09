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
| per-seat `engage`, `eta`, `speed`, `dps`, `toughness`, `defenseShare` | the personality bundle; also the sweep axis. Not orthogonal — `speed` and `engage` both move lethality, see § Couplings                                   |
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
authored as a movement personality and enters the closed form as the share of
spawns brought inside `r_kill`. Measured, that share splits, and the probes print
both halves: `reach` (bodies ever inside `r_kill`, over spawns — the movement
half) and `lethal` (kills over bodies reached — the DPS half).

Over eight seeds, `reach` runs **0.67 / 0.57 / 0.80 / 0.80** against dials of
0.55 / 0.40 / 0.72 / 0.62 — _above_ the dial on every seat — while `lethal` runs
**0.54 / 0.11 / 1.03 / 0.58**. Reach varies 1.4× across the roster and lethality
9.4×, so essentially all of the spread lives in the half `engage` does not name.
A seat whose engagement is short is almost never failing to meet the floor; it is
failing to kill what it met. Two consequences: **retuning `engage` moves the
model and barely moves the game**, and `lethal` above 1 is not a bug — splitter
fragments count in `kills` but deliberately in neither `spawned` nor `reached`
(`modules/sim/step.ts` `SPLITTER_FRAGMENTS`), so `lethal` is a rate, not a fraction.

**`speed` is a lethality dial, and it is the largest one on the roster.** This is
the same defect one axis over, and it is why `kinetic` — authored at `dps` 0.9,
the same as `shielded` — reaches median level 10 against 22. A body only dies if
it stays in range long enough to be killed, so lethality is bought in
time-in-range; the operator moves at 120 · `speed` against specimens at 38–70, so
a fast seat sweeps away from each body it meets. Nothing in the closed form
contains this: `speed` enters as movement, and `localDensity` takes `dps` as an
independent parameter.

Measured by sweeping `kinetic`'s `speed` alone, reading lethality **at a given
run level** so the ladder is controlled for:

| level band | 1.35 (shipped) | 1.0  | 0.85 | rest of roster |
| ---------- | -------------- | ---- | ---- | -------------- |
| 1–5        | 0.51           | 0.75 | 0.91 | 0.86–0.97      |
| 6–10       | 0.11           | 0.71 | 0.91 | 0.99–1.04      |
| 11–15      | 0.18           | 0.46 | 0.73 | 0.78–0.98      |

Monotone, and at 0.85 the seat rejoins the roster curve. Final level goes 13 → 16
→ 18. **One dial, no economy constant touched.** Which also settles what the
compounding is: there IS a loop — lethality feeds income, income the ladder, the
ladder device level, device level DPS — but it is driven by this constant rather
than self-sustaining, because damping the constant alone moves the whole arc.

The reason it stayed hidden is that three of the four seats agree. Lethality by
level reads within 4% across `generalist` / `reactive` / `shielded` at band 6–10
and 16.6× wide with `kinetic` in it: **a roster where most seats lie on one curve
and one sits far below it is a seat constant, not a systemic one.** Read
`balance/lethality-probe.ts` before treating any of this as an economy problem.

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
  of thirty-two end on the timer**, the roster carries **two** distinct modal
  causes rather than three, `collection-starvation` appears once in the batch,
  and modal shares run 50 / 75 / 63 / 88%. Escalation also runs undiluted for the
  whole arc where a ceiling used to discard 40–70% of it, so the arc is harder
  than any tuning has been done against.

  The distribution was once recorded here as the half that _was_ right, off a
  single seed on which the four seats happened to split. **On one run, a roster
  and a coin land the same way.**

  **What is short is lethality, not seeking.** A seeking term was built for this
  entry — arrivals inside `r_kill` over a 6s horizon, imminence-weighted — and it
  steered (spread 22–48 open floor, 43–152 crowded) and bought nothing: swept
  0 / 2 / 5 / 9, `kinetic` moved 0.09 → 0.08 → 0.10 → 0.10 while distinct modal
  causes fell 2 → 2 → 1 → 1. `reach` is above the declared dial on every seat
  (§ Couplings), so there was nothing to seek. Reverted.

  What is short is lethality, and § Couplings now names the cause: `speed`.
  Three candidate explanations were tested and two died — it is not the draft
  (every seat converts run level into the same offensive mass, and realized
  defensive share tracks each `defenseShare` dial), and it is not a feedback loop
  through level (three of four seats lie on one lethality-by-level curve). **The
  repair is a design call, not a tune**, because `speed` 1.35 is what the
  Kineticist IS — "never be where it is" is the seat. Three exits, none costed
  yet: drop the dial and lose the personality; compensate it with `dps` and
  accept that two dials now move together; or make lethality less
  speed-sensitive mechanically, which is the only one that leaves the roster's
  design space intact.

- **`kinetic` is much worse than its single-seed reading, and the seed the arena
  probe runs is its best one.** (Cause settled — § Couplings, `speed`.) Batch medians against that seed: level 10 vs 16,
  schedule −21 vs −12, 0.26 kills/s vs 0.72, realized `engage` 0.06 vs 0.24 —
  every single-seed figure at or near the top of the range. The orbit re-map
  (`modules/sim/steering.ts` § orbitRadius) removed a real defect; it did not
  make the seat viable, and the point reading said otherwise. Do not read a
  `kinetic` figure off one arc.

- **η is in its designed band and got there from the movement policy, not the
  economy.** 0.61–0.83 continuous across the batch against an assumed 0.65–0.78,
  from 0.91–0.99 before contact was priced; motes left on the floor went from
  24–247 to 280–650. An operator circling a capped mass retraces its own floor
  and sweeps everything for free, so η ≈ 1 was a symptom of the kite rather than
  a property of persistent motes — an earlier entry here costed three exits for
  it and none were taken.

  It remains **assumed, never derived**: every income figure inherits that
  assumption, and a low η and a bad economy look identical from outside. That is
  why the probes report η split into continuous pickup and collector burst — the
  split is what says which channel a shortfall is in.

- **The collector banks 2.6–6.1% of income against a modelled 11%.** Never
  broken: every drop is taken in every probed seat and the routing term works.
  Its yield is a share of the _uncollected_ pool, so it was starved at η ≈ 0.95
  and recovered on its own when the policy started leaving motes behind.
  `COLLECTOR_BALANCE.onscreenShare` and the sim still disagree, but by a factor
  of two rather than ten. Re-read it after the lethality work rather than
  repricing now. Its timing is also deterministic in the projection where it is a
  drop in the game — magnitude modelled, variance not.

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
