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

## The tunables

Constants live in `data/`, split by subsystem so each carries its own
`─── Balance ───` reasoning beside the numbers it justifies: `schedule.ts` (the
time axis), `arena.ts` (geometry and threat), `income.ts` (motes to levels),
`seats.ts` (the roster), `specimens.ts` (the threat roster), `devices.ts` (the
draft pool), `meta.ts` (the lifetime shop). `modules/tuning.ts` declares the
`tunable()` key union; not every constant below is wired to one yet.

| Tunable                                                               | What it moves                                                                                                                                                                         |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `beatFirstSeconds`, `beatRatio`                                       | the draft schedule. The beat _count_ is a consequence, not a tunable — hold the 30–90s band and ~33 beats falls out                                                                      |
| `hpGrowthPerMinute`                                                   | how hard escalation bites. Also re-solves the per-pick DPS gain, since that is pinned to flat time-to-kill                                                                            |
| `spawnRate0`, `spawnGrowthPerMinute`                                  | density, and with it the whole traversal term. Nothing caps the floor, so this reaches it undiluted                                                                                   |
| `dwellSeconds`                                                        | how long an unengaged body lingers — the residency term in `localDensity` AND what bounds live population. Moves density everywhere                                                   |
| `contactDamageGrowthPerMinute`                                        | per-hit escalation. Deliberately far slower than HP growth                                                                                                                            |
| `densityCap`, `BLOCKING_CROWD`, `ESCAPE_FLOOR`                        | where gaps close. Contact is the _squared_ approach to it, so this is quiet until it is sudden                                                                                        |
| `hpPickGain`                                                          | what a defensive pick gives                                                                                                                                                            |
| `apertureCapRatio`                                                    | the ceiling `r_collect/r_kill` approaches as aperture sources stack. Bounds the top coupling structurally — see § Couplings                                                           |
| `COLLECTOR_BALANCE.onscreenShare`                                     | the projection's assumed burst size. The sim pulls everything inside `pullRadius` instead, so this is a prediction the probe measures against, not a rule                             |
| `COLLECTOR_BALANCE.pullRadius`, `timeJitter`                          | how much floor one pull banks, and how far a drop roams from its nominal time                                                                                                         |
| per-seat `engage`, `eta`, `speed`, `dps`, `toughness`, `defenseShare` | the persona bundle; also the sweep axis.    Not orthogonal — `speed` and `engage` both move lethality, see § Couplings                                                               |
| per-seat `measured`                                                   | nothing, and that is the point — it is the OUTCOME the income model projects from, not an input to the game. Re-measure it after any change that moves the policy; never hand-tune it |
| device `baseDamage` / `cooldownSec`                                   | one device's cadence and weight. The opening device's pair is _solved_ against flat TTK at t=0, not chosen                                                                            |
| device `shape`                                                        | whether coverage is given or earned. A heading-bound shape is worth less to a policy than to a hand, and `modules/draft.ts` discounts it accordingly                                  |
| device `maxTargets`                                                   | how many of the specimens in reach an area shape takes. On `bolt`/`lance` it is definitional; on the area shapes it is the real lever — see § Known thin                              |
| specimen `hpFactor` / `damageFactor` / `weight`                       | the mix, and through it the required-DPS curve and the pressure curve                                                                                                                 |
| specimen `moteYield`                                                  | income. Coupled to the ladder — raise it and re-derive                                                                                                                                |
| `NOTES_PER_KILL`, `META_COST_RATIO`, per-upgrade `baseCost`           | the runs-to-purchase ladder. Read the projection's meta table, not these numbers                                                                                                           |
| meta upgrade `side`                                                   | whether a tile is ladder-safe. Not annotation — see § Couplings                                                                                                                       |

**Deliberately not perturbable:** the per-pick DPS gain, the beat ratio, and the
XP ladder. All three are _solved_ — the gain from flat time-to-kill, the ratio so
the last beat lands inside the run, the ladder from the income model against the
schedule. Overriding one directly decouples it from what it was derived to
satisfy, which is how a ladder silently stops meaning anything while still
looking like a ladder. Change the input and re-derive.

**And the escalation constants are not perturbable through the registry either,
for the same reason one step removed.** `hpGrowthPerMinute` and
`spawnGrowthPerMinute` are _inputs_ to that solve, so a `pushOverrides` override
moves the floor while the DPS growth solved to match it stays put — the run gets
harder for a reason the design never chose, and every reading afterwards is about
the decoupling. Sweep them by assigning the constants and letting the
derivations re-run, which is what `balance/escalation-probe.ts` does and why it
does not use the perturbation path. `modules/sim/dispatch.ts` `levelGain` is
computed per call rather than at module load precisely so that works.

## Couplings

**A seat's authored parameter is a preference; what the policy achieves is a different number,
and the model must never read one for the other.** `engage` asks for a share of
spawns brought inside `r_kill`; measured, that splits into `reach` (bodies ever
in range, over spawns — the movement half) and `lethal` (kills over reached — the
DPS half), and only their product drops motes. Over sixteen seeds `reach` runs
**0.79 / 0.73 / 0.82 / 0.82** against authored parameters of 0.55 / 0.40 / 0.72 / 0.62 while
`lethal` runs **0.57 / 0.43 / 1.04 / 0.61**. A seat whose engagement is short is
almost never failing to meet the floor; it is failing to kill what it met, so
**retuning `engage` moves the model and barely moves the game**. (`lethal` above
1 is not a bug — splitter fragments count in `kills` but deliberately in neither
`spawned` nor `reached`, `modules/sim/step.ts` `SPLITTER_FRAGMENTS`.)

This is why `data/seats.ts` carries `measured` beside the authored parameters and why
`data/income.ts` projects only from it.

**Re-deriving `measured` is a loop, not a measurement, and it does not converge.**
`measured` derives the XP ladder; the ladder changes run length; run length
decides how much of a run sits in the late density band where kills-per-spawn
collapses — so the input moves. On IDENTICAL seeds it oscillates with gain near
1: `shielded` ran 0.54 / 0.45 / 0.53 across three passes, and the same seat
recorded 0.52 / 0.43 / 0.51 on an earlier curve. The two halves fail differently,
which is what makes it tractable — **η is stable** to well under 1% and can be
taken directly, while **`killsPerSpawn` has no fixed point**, because a
run-average of something that varies across the arc is a summary rather than a
constant. So it is DAMPED: the shipped value is the mean of three passes, and the
damped fit beats every individual pass, which is what an oscillating map predicts.

Two consequences worth more than the value. **Re-derive after anything that moves
the policy or the escalation curve** — a stale `measured` understates income,
which makes every beat threshold too low, which makes a harder-to-reach schedule
look reachable; that artifact once made an escalation sweep read as though it
fixed the schedule when it only fixed survival. And **the damping is a
workaround**: even at the damped fit the baseline finishes six beats short, which
no constant can repair. Making `killsPerSpawn` a function of `t` is the real fix.

Historically the two halves diverged from their authored parameters in OPPOSITE directions and
nearly cancelled on the baseline, so the compound looked healthy while the
collector — costed as a cut of `1 − η` — silently inflated. They no longer
cancel; they are simply both close, landing within 3–11% of `modelled` across the
roster. The lesson survives the numbers: **read the compound, never one half.**

**Lethality is one quantity — the share of damage that finishes a body — and
crowding is what spends it.** A body dies only if it stays in range long enough
to absorb its own HP, so damage landing on a body that then leaves achieved
nothing, and damage landing past a body's remaining HP achieved nothing either.
Both are booked directly rather than inferred: `ArenaStats.damageConverted`
against `damageWasted` and `damageOverkill` (`modules/sim/types.ts`), split at
the moment a body's fate is settled.

| seat         | waste | overkill | `lethal` |
| ------------ | ----- | -------- | -------- |
| `reactive`   | 19.5% | 63.0%    | 1.03     |
| `generalist` | 42.5% | 50.4%    | 0.58     |
| `shielded`   | 43.5% | 40.5%    | 0.56     |
| `kinetic`    | 49.4% | 52.6%    | 0.45     |

Both are quoted against the same denominator, because they are competing
destinations for one budget and a change to target selection trades one for the
other. **Overkill is the larger of the two on three seats of four and has never
been tuned against** — a levelled device carries ~10× its opening damage into
bodies sized by the escalation curve, and `maxTargets` decides how many of them
absorb it. `shielded` is the exception and only just, which is new: softening the
density curve cut overkill harder than waste, so on that seat the two are now
close enough that a target-selection change could trade the wrong way.

Crowding is where the roster separates, and it is the only place it does:

| live bodies | `generalist` | `kinetic` | `reactive` | `shielded` |
| ----------- | ------------ | --------- | ---------- | ---------- |
| < 50        | 4.8%         | 12.0%     | 1.0%       | 2.4%       |
| 50–99       | 36.0%        | 49.5%     | 17.6%      | 33.1%      |
| 100–199     | 72.7%        | 80.1%     | 37.0%      | 71.3%      |

Monotone for every seat, because `maxTargets` spreads each activation over more
bodies as the floor fills and each body absorbs less before it leaves. **There is
no `200+` row any more** — at `m_d` 1.048 the floor peaks at 100–138 bodies where
it once ran to 763–1465, so the worst band the game reaches is the one that used
to be its middle. The shape survived the retune on a different curve, which is
the strongest evidence yet that it is structural rather than a tuning artifact.

**Read that against lethality by run level, which is now flat.** Binned by the
level a minute was played at, the four seats agree within 1.1–1.4× through band
16–20 and separate only at 21–25 (4.8×) and 26+ (4.6×) — the bands a run reaches
once the floor is crowded. Binned by live population instead, the same runs spread
1.4× / 3.0× / **13.1×**, which is the comparison that makes the point. A roster that lies on one curve until density arrives
does not have a seat constant; it has a density term. Anything attributing the
late spread to a seat's authored parameter has to explain the flat half first.

**A seat's authored parameter once carried the blame here and did not deserve it.** `speed` was
measured as the largest lethality authored parameter on the roster and costed as a design
decision, on readings taken through a movement policy whose near-field income
term was inverted (`modules/sim/steering.ts` `MOTE_NEAR_WEIGHT`). With the sign
corrected `kinetic` moves from `lethal` 0.11 to 0.44–0.50 and the roster spread
collapses from 8.5× to ~2×. What guards it now is
`modules/sim/steering-scenarios.test.ts` — named situations with answers knowable
by inspection, asserted on outcomes. Keep it calibrated before believing any
reading in this file.

**Target selection is an income decision, not only a lethality one.** A body's
mote drops where it dies and `r_collect` is smaller than `r_kill`, so _which_
body a shape picks decides where the floor's income lands: picking by health
scatters kills across the whole kill disc, picking the nearest drops them at the
operator's feet.

Two concentration rules were built against `arc-lance`'s shipped nearest-first —
closest-to-dying, and a two-tier rule taking the heaviest body an activation can
kill — and both lost, `η` falling on every seat. **That receipt predates the
steering fix** and was taken on an automated player that could not collect, so the conclusion
is not safe to lean on; the coupling it names is. Re-run both against the current
automated player before treating concentration as closed, and note that the overkill column
above is exactly what they were built to reclaim.

**`r_collect` against `r_kill` is the top coupling and sets the cost of all
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

- **A seat's authored parameter that does not appear in the score does not reach the policy.**
  `engage` biased only the orbit distance for most of this archetype's life and
  worked solely because an undamped arg-max thrashed the operator through the
  mass; smoothing the steering halved kill rate. `ENGAGE_WEIGHT`
  (`modules/sim/steering.ts`) is the real channel, and its TSDoc has the receipt.
  Check an authored parameter's term exists before reading a probe that quotes it.
- **Existing is not enough — an arg-max acts on a term's SPREAD across the
  candidate set, never its level.** A term reading the same on every candidate
  subtracts a constant and drops out at any magnitude. Four instances so far, and
  they fail in different disguises: a flat contact cliff that dominated
  everywhere (`CONTACT_WEIGHT`), a costed term that was identically zero in the
  band where decisions happen (`CONTACT_HORIZON` — swept 900 → 3500 with
  byte-identical output), a connect weight too small to pay for the turn it
  asked for, and a **saturation** on a summed term that flattened it to 0.0–3.5
  spread above a hundred live bodies while reading 15–23 below. The last is the
  one to generalise from: a cap truncates differences, which is exactly what an
  arg-max reads. `ENGAGE_SATURATION` survives only because `inKill` counts a
  180-unit disc that never fills.

  A fifth instance is the one that shows the **repair**, not just the failure.
  Costing contact along the swept path instead of at the candidate endpoint is
  the obvious fix for path-grazing and it went inert, because every candidate
  segment starts at the operator — so a body beside you is near all sixteen of
  them. Of what a full-segment cost adds over an endpoint cost, 65–86% fires on
  every heading. **Excluding the band around the operator** — where the endpoint
  term is the better reader anyway — removes all of that and keeps ~600 cells of
  real per-heading difference. Measured on the `cliff all` column: 12–33% before,
  14–37% after, against 49–100% for the version without the exclusion; and the
  arc improved rather than collapsing (baseline 23:04 → 25:47 over sixteen seeds,
  no seat worse). The lesson generalises past this term: when a widened detector
  goes flat, find the sub-region common to every candidate and take it out,
  rather than reaching for the weight.

  The rule that falls out: **before tuning a weight, confirm it moves the outcome
  at all.** `balance/steering-probe.ts` prints per-term spread by density band
  and the share of decisions where the contact branch fires on every candidate —
  the `cliff split / all` column, which is the direct read on this failure.

**Killing thins the field.** Engaged specimens leave by dying, unengaged by
dwelling out, so `engage` and `dps` both feed local density and therefore
contact. Easy to break by modelling density as spawn rate alone.

**Collector impulses must be in the income model at derivation time, amortized.**
Both ways of getting it wrong are live: leave them out and the ladder never
re-syncs after the first burst (beats land up to ~115s early, monotone); put them
in as point impulses and the ladder goes non-monotone, because the beat
straddling a nominal drop absorbs the whole burst — correct only for runs whose
collectors land where the model said, and the drop is a roll.
`cumulativeIncomeAmortized` (`data/schedule.ts`) is the one to derive against.
What remains is bounded oscillation, the honest cost of impulsive income. Note
the term is now **small** — 0.6% of run income, not the ~11% earlier passes
modelled (§ Known thin) — so this rule is about the ladder's SHAPE rather than
its magnitude, and it would still hold at a fraction of the size.

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
survival-side upgrade gives only what its name says, while an income-side upgrade
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
  widen; default 8). The spine's declared measurement half, and where the beat
  windows in `manifest.ts` are recorded from. **Read this before believing any
  figure the arena probe prints** — eight-seed batches have twice reported a
  modal-cause count that sixteen resolved away.
- `balance/escalation-probe.ts` — retunes an escalation constant and re-runs every
  derivation below it, one row per point. The surface for "is this difficulty or
  income", and the only one that answers it, because the escalation constants
  cannot be perturbed through the tuning registry (§ The tunables).
- `balance/cone-probe.ts` — what the policy's wedge caught against what the best
  orientation would have. Narrow by design: it exists to keep
  `HEADING_BOUND_DISCOUNT` honest, and it is a ceiling rather than a player.
- `balance/steering-probe.ts` — the path rather than the economy, plus the
  per-term spread table § Couplings sends you to.
- `balance/lethality-probe.ts` — the arc SAMPLED rather than summed: lethality by
  minute, by run level, by live population, and the loadout each seat held at a
  given level. Reach for it when a seat is behind and you need to know whether it
  started behind, fell behind, or drafted differently — an end-of-run total
  cannot tell those apart, and they want different repairs.

Three reading rules that are not in any header:

- **`engage` is three numbers, not one** — the realized figure against the authored parameter,
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

- **Survival and schedule are two constraints, and only one of them is the
  escalation curve.** `IDENTITY.md` targets "three specialists each bound by a
  different cause, with the baseline mostly reaching the timer". Neither half is
  met yet, but they now fail for separate, identified reasons.

  Read the cause, not the clock: a run surviving the full thirty minutes is
  booked `collection-starvation` when it finishes more than three beats behind
  schedule (`modules/run.ts`), so "nothing reaches the timer" and "nothing
  survives" are different claims with different repairs.

  **`m_d`, spawn-density growth, decides whether you survive.** At a fixed
  `data/seats.ts` `measured`, softening it 1.080 → 1.048 moves the baseline from
  23:31 to the full 30:00 and from level 23 to 28, converting deaths into
  survivals. Nothing else does: halving `m_dmg` moves nothing, and `m_hp` is
  inside `offensivePickGain`, so softening it gives a slower DPS curve with the
  softer floor. Roster effect, sixteen seeds:

  | seat         | median end        | timer | modal cause               | sched |
  | ------------ | ----------------- | ----- | ------------------------- | ----- |
  | `generalist` | 25:47 → **30:00** | 13%   | collection-starvation 50% | −6    |
  | `kinetic`    | 26:11 → **30:00** | 0%    | collection-starvation 88% | −9    |
  | `reactive`   | 21:04 → **27:28** | 25%   | hp-floor 69%              | 0     |
  | `shielded`   | 25:26 → **30:00** | 19%   | collection-starvation 50% | −5    |

  Distinct modal causes went 1 of 4 to **2 of 4**, and every seat was `hp-floor`
  before.

  **The income model decides whether you hold schedule, and no `m_d` touches
  it.** Swept at the re-derived `measured`, `sched` reads −5 / −5 / −5 / −3 across
  `m_d` 1.080 / 1.058 / 1.048 / 1.037 — pinned. An earlier sweep appeared to show
  `m_d` fixing the schedule; that reading was taken with `measured` derived for
  the old curve, so beat thresholds were too low and softening `m_d` made beats
  arrive free. **Re-derive `measured` before believing any schedule number**, and
  see § Couplings for why the re-derivation is itself an oscillation.

  So the remaining gap is the ladder. `killsPerSpawn` is a run-average of a
  quantity that varies across the density arc, and the damped fit still leaves
  the baseline six beats short — no constant value fixes that. Making it a
  function of `t` is the next real repair and it is ahead of any further
  escalation tuning. `kinetic` at −9 is partly structural rather than a defect:
  the ladder is derived once against `BASELINE_SEAT`, so the roster's lowest-income
  seat runs the baseline's ladder by design.

- **Do not read a seat off one arc, or the roster off one pass.** `kinetic` spent
  most of this archetype's life as its clear outlier and is now level with the
  others, because two defects sat underneath the readings rather than in the seat
  — an orbit radius outside its own weapon reach, and an inverted income term.
  Both presented as "this seat is weak" and neither was. Ranges here span ten
  minutes; use `balance/spread-probe.ts` at sixteen seeds, never
  `arena-probe.ts`'s single one.

- **η runs 0.88–1.00, and that is the correct value rather than a divergence.**
  Motes do not expire, so the wake is always sweepable and an automated player that routes at
  all approaches full collection; the exemplar set ships the same non-expiring motes.
  The old 0.65–0.78 "band" was an authored parameter being read as a forecast. What is left on
  the floor at the end (0–325 motes, median by seat) is the whole shortfall.

  **Read the compound, never η alone.** Income rides `killsPerSpawn × η`, and the
  two halves diverge from their authored parameters in OPPOSITE directions — the policy kills a
  smaller share of spawns than asked and banks a larger share of drops than
  asked. On the baseline they now land within 11% (0.425 measured against 0.476
  modelled), which is exactly why reading either half by itself reports a
  divergence the other half has already paid for. The probes print `income`
  beside `modelled` for this reason. Measured: 0.425 / 0.313 / 0.749 / 0.493.

  It remains **assumed, never derived** — the assumption lives in `data/seats.ts`
  `measured` with a probe receipt, and § Couplings carries how to re-derive it. A
  seat authored from scratch cannot be projected until it has been run once; that
  is the declared cost of a policy output, not a gap.

- **The collector is a small pickup that the model used to think was a large
  one, and that error reached the XP ladder.** Its yield is a cut of the
  _uncollected_ pool, and with motes staying on the floor and the sweep always available
  that pool stays near empty — burst share measures 0–1% of income. The model
  now agrees, at 0.6% in two bursts, because it projects from `measured.eta`
  rather than the authored parameter; at an authored η of 0.65 it read the pool as 35% of drops
  and costed the collector accordingly. Understating η therefore _inflated_ the
  collector, and the ladder is derived from income including it — worst
  derivation deviation was 44.6s and is now 3.3s.

  Never broken, and not a candidate for a higher cost: every drop is taken in
  every probed seat and the routing term works. A collector is _always good_ and
  cheap to take, which is the genre-standard shape; it is simply not a harvest of
  an abandoned field, because with a competent automated player there is no abandoned field.

  Two model imprecisions survive here deliberately, both now too small to reach
  anything. `onscreenShare` (0.35) is the projection's guess at what one pull
  takes of the uncollected pool, and that pool is a few percent of drops — so the
  guess is a small fraction of a small term, and measuring it properly would give
  a correction the ladder cannot feel. `timeJitter` models the drop's magnitude
  but not its variance: the projection fires collectors at fixed times where the
  game rolls them, which is why the ladder is derived against AMORTIZED rather
  than impulsive income (§ Couplings). Both would matter again if the collector
  ever became a large term — which is what would happen if motes expired.

- **Evolutions are reachable but rare** — one per seat per arc against a pool
  sized for two or three. Two fixes landed (the policy weights depth by proximity
  to `maxLevel`; the draw weights a device by how deep it already is); the
  remainder is suspected to be the DRAW, since a device needs eight levels and an
  offer shows three of ~10 candidates.

- **"Max one device first" is correct play, so the roster's job is to make WHICH
  one a real choice.** Seven levels of `levelGain` (`modules/sim/dispatch.ts`) is ~10.5× against a 2–4×
  spread across the four shapes, so depth beats breadth by construction. That is
  the genre behaving normally, and the level gain is _solved_ anyway.

  What made the roster read as a skin was one device returning ~1% of kills
  whatever you did with it — three interchangeable options and a trap. With that
  resolved: at sixteen seeds the modal top killer is `arc-lance` on three seats
  (9 / 7 / 10 of sixteen) and **`pressure-bell` on `shielded`** (7, against
  `arc-lance`'s 6). So the roster does separate, on one seat, by a margin of one
  seed — read that as "barely" rather than as a persona. The test is whether
  the modal pick differs BY seat, and eight-seed batches said it never did; this
  is the same reading that resolved the modal-cause count, and it moved the same
  way. Read `spread-probe.ts` § Draft variance, not the arena probe's `lvl`
  column, and not a batch under sixteen.

  Still open, and why `maxTargets` is no longer called the arc tunable: `pulse`
  capture rises and falls with how crowded the floor gets and `maxTargets` is what
  moves it — but only on the AREA shapes. With every cap removed at once `bolt`
  becomes dominant at 48–69% of kills, because an uncapped single-target shape is
  a pulse with a 0.55s cooldown. On `bolt`/`lance` the cap is what the shape IS.
  Uncapping `pulse` alone leaves the roster intact.

- **The cone is a human-play device, and now measurably so.**
  `HEADING_BOUND_DISCOUNT` (`modules/draft.ts`) applies only when
  `seat.driver !== 'player'`; that call site carries the numbers.
  `balance/cone-probe.ts` compares what the policy's wedge caught against the
  best-oriented wedge from the same position: **29% of the achievable wedge**,
  32–45% at the instant it fires, against 3.5–4.0 bodies available. The manoeuvre
  is real — capture is higher at the fire instant than through the arming window,
  which is `CONNECT_WEIGHT`'s imminence weighting working — and it lands about a
  third of what is there.

  The instrument is a **ceiling, not a player**: free rotation costs nothing in
  it, and a real turn costs position. A small gap would have retired the discount;
  this one justifies it. It is a discount and not a ban, so it should shrink as
  the manoeuvre improves — and deleting it without improving the manoeuvre puts
  seats back to sinking six levels into a 1% device.

- **Two declared divergences from the archetype canon.** There is no
  `AutomationTiers` ladder: survivor has no player-facing automation to block — a
  run is played, and what accrues between runs is a purchase rather than a policy
  — so a ladder would withhold nothing, which the same rules call a divergence in
  its own right. The seats have an AI DRIVER instead, blocked by install presence
  the way an opponent is (`data/seats.ts` § `SeatDriver`). What that costs a fork:
  automation a player _unlocks_ — auto-draft, an auto-collector — does **not**
  belong on this seam. `SeatDriver` answers "who plays this run"; an automation tier answers
  "what has the player earned the right to stop doing", and from the call site
  both read as "something else decides now".

  And `balance/beats.ts` holds beat **extractors over a finished arc** where
  skirmish and tug hold engine `Beat` tick predicates. Theirs are
  single events a bisection can stop on; survivor's are phases of a stochastic
  arc whose windows only mean anything across a seed batch, and `balance/_arc.ts`
  already samples what they need. A predicate here would be a second run path
  measuring the same thing, and the two would drift.

- **Traversal collapse is a real ending again** — it is the roster's only
  outcome after the two income-side ones, at 0–2 runs of sixteen per seat. It was unreachable by
  construction while the contact cliff dominated and the operator could not be
  enclosed. `BLOCKING_CROWD`, `ESCAPE_FLOOR` and `CROWD_TRAVEL_COST` have still
  never been swept, and now that the detector fires the sweep is worth something.

- **Before tuning a tunable against a wall, check the wall responds to it at all.**
  A backlog of un-admitted spawns once welded the floor to its ceiling, so killing
  could not thin it by one body — and it presented as a `maxTargets` problem that
  no value of `maxTargets` would have helped. Fixed and locked; the mechanism is
  gone and the reflex is the part worth keeping.

- **Shop costs are anchored to a payout the projection overstates by ~26%.** The
  projection sizes `baseCost` against ~306 notes for a baseline run and quotes the
  whole shop at ~101 runs; measured, a baseline run banks **243** (roster
  243 / 195 / 419 / 293, `spread-probe.ts` § notes), which puts the shop nearer
  **~127 runs**. Read the projection's meta table as optimistic by about a quarter
  until this is re-anchored.

  It is worth knowing how far this has moved rather than just where it sits: the
  same anchor read 2.6× optimistic before the income decouple and briefly
  UNDERstated payout in between. Every escalation and policy change moves its cost,
  because `m_d` moves kills and kills are the payout, so re-read it from
  `spread-probe.ts` § notes on the same pass rather than tuning `baseCost` against
  a number that is about to move. The projection also now ends its baseline run at
  21:19 where the sim reaches 30:00 — the closed form under-predicts survival at
  this curve, which is the same gap in a different costume.

- **Guns-versus-butter is unsettled.** The structural asymmetry is real — DPS
  reaches survival only through the squared density term while `defenseShare`
  divides damage directly — but the conversion rate between them is a
  _measurement_ and has never been made. The evidence once recorded here named a
  `defence` seat the roster does not contain.
