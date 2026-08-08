# Survivor — balance orientation

How to work on this archetype's numbers. What it *is* lives in `IDENTITY.md`
§ Rate-function spine; this file never restates the bucket.

A run is a race between two compounding curves. Device DPS compounds through the
draft; specimen HP and annulus density compound on minute marks. Everything else
— the XP ladder, the entity budget, the per-pick gain — is *derived* from those
two plus the authored draft schedule, so almost nothing here is a free number.
The ones that are free are below.

## The knobs

Constants live in `data/`, split by subsystem so each carries its own
`─── Balance ───` reasoning beside the numbers it justifies: `schedule.ts` (the
time axis), `arena.ts` (geometry and threat), `income.ts` (motes to levels),
`seats.ts` (the roster), `specimens.ts` (the threat roster), `devices.ts` (the
draft pool), `meta.ts` (the cross-run shop). `modules/tuning.ts` declares the
`tunable()` key union; not every constant below is wired to one yet.

| Knob | What it moves |
|---|---|
| `beatFirstSeconds`, `beatRatio` | the draft schedule. The beat *count* is a consequence, not a knob — hold the 30–90s band and ~33 beats falls out |
| `hpGrowthPerMinute` | how hard escalation bites. Also re-solves the per-pick DPS gain, since that is pinned to flat time-to-kill |
| `spawnRate0`, `spawnGrowthPerMinute` | density, and with it the entity budget and the whole traversal term |
| `contactDamageGrowthPerMinute` | per-hit escalation. Deliberately far slower than HP growth |
| `densityCap`, `BLOCKING_CROWD`, `ESCAPE_FLOOR` | where gaps close. Contact is the *squared* approach to it, so this is quiet until it is sudden |
| `hpPickGain` | what a defensive pick buys |
| `COLLECTOR_BALANCE.onscreenShare` | the size of a collector burst |
| per-seat `engage`, `eta`, `speed`, `dps`, `toughness`, `defenseShare` | the personality bundle; also the sweep axis |
| device `baseDamage` / `cooldownSec` | one device's cadence and weight. The opening device's pair is *solved* against flat TTK at t=0, not chosen |
| device `maxTargets` | how far the area shapes overtake the single-target ones late. The knob that decides whether the roster has an arc |
| specimen `hpFactor` / `damageFactor` / `weight` | the mix, and through it the required-DPS curve and the pressure curve |
| specimen `moteYield` | income. Coupled to the ladder — raise it and re-derive |
| `NOTES_PER_KILL`, `META_COST_RATIO`, per-upgrade `baseCost` | the runs-to-buy ladder. Read the projection's meta table, not these numbers |
| meta upgrade `side` | whether a tile is ladder-safe. Not annotation — see § Couplings |

**Deliberately not perturbable:** the per-pick DPS gain, the beat ratio, and the
XP ladder. All three are *solved* — the gain from flat time-to-kill, the ratio so
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
Time-to-kill is a *per-specimen* quantity while the operator's DPS is divided
among everything in the kill radius, so the solve has to cover specimen HP
growth, density growth, *and* the roster's mean-HP shift as heavy tiers enter —
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
  movement policy, not the economy.
- The measurement still owed is a **seeded multi-run spread**: the probe runs one
  seed per seat, so every reading is a single sample of a stochastic system. Median
  survival, `η` split into continuous pickup and collector bursts, and a
  binding-cause distribution all need repeated runs before they mean anything.

Magnitudes print, never assert. Behavioural suites sit beside their modules and
carry no numbers.

## Known thin

- **η measures ~1.0 against an assumed 0.65–0.78, and the geometry says why.**
  `balance/arena-probe.ts` reports the operator banking essentially every mote it
  drops, so `r_collect` charges no risk premium and the archetype's signature
  transaction — kill at the edge, dive to collect — is not happening. The
  measured-vs-assumed split narrowed this to geometry rather than policy: a
  fully-stacked **Reclaimant** is ×1.18⁴ ≈ ×1.94, which moves `r_collect/r_kill`
  from its designed 0.39 to **0.75**, and the meta shop's Wider Aperture stacks on
  top of that. § Couplings says a ratio approaching 1 turns this archetype into a
  DPS check; one reagent line reaches three quarters of the way there on its own,
  and it is drawn on screen — the aperture visibly swallows the ash annulus by
  mid-run. Either `perStack` comes down, or the chain caps against `r_kill`. Do
  not retune income against the η reading; fix the ratio and re-read it.
- **Evolutions are reachable but rare** — one per seat per arc, against a pool
  sized for two or three. Two fixes landed (the policy weights depth by proximity
  to `maxLevel`; the draw weights a device by how deep it already is); the
  remainder is suspected to be the DRAW, not the policy — a device needs eight
  levels and an offer shows three of ~10 candidates, so the deepest device is
  often not on the table.
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
- **`entityBudget` becomes the binding density term past mid-run.** Live census
  readouts sit pinned at exactly 400 — `THREAT_BALANCE.entityBudget` — from around
  13:00 onward, because the spawn loop is `while (carry >= 1 && specimens.length <
  entityBudget)`. Past that point spawn rate stops moving density at all: the floor
  is clamped by a **performance budget**, while `localDensity` in `data/arena.ts`
  goes on compounding geometrically, so every downstream term the projection reads
  off density — contact chance, traversal collapse, residency — is quoting a curve
  the sim stopped following. This is not the entity cap doing its job; a cap that
  binds is a silently substituted model. Either the escalation curve should flatten
  into the cap by construction, or the projection needs the same clamp so the two
  agree on what happens after it bites. Surfaced by the HUD census rather than a
  probe, which is the cheapest place it could have shown up.
- **Contact damage is per-specimen in the sim and aggregate in the projection.**
  `contactDps` is applied to every specimen inside `r_contact` by
  `modules/sim/step.ts`, while `balance/survivor-projection.ts` multiplies it by a
  `contactChance` in [0, 1] — which implicitly assumes about one specimen in
  contact. When fifteen are touching, the sim is an order of magnitude deadlier
  than the closed form predicts. The two need reconciling and the sim is the one
  telling the truth; the projection's contact term wants an expected-count factor.

- **Guns-versus-butter is not balanced.** As authored, three seats bind on the HP
  floor and `defence` outlasts the arc — a wall in costume by this archetype's
  own test. DPS converts into survival only through the squared density term
  while `defenseShare` divides damage directly, so butter beats guns. The
  conversion rate between them is a *measurement*, so the fix waits for a probe
  against shipping code rather than being tuned into the projection.
- **`η` is assumed, never derived.** Every income figure inherits that assumption
  until a real movement policy is measured. A low `η` and a bad economy look
  identical from the outside, which is why the probe reports `η` separately.
- **The stochastic leg is unexercised.** The draft is the archetype's one
  load-bearing stochastic subsystem, and the projection uses expected values
  throughout. Until seeded multi-run tooling exists, every reading here is a mean
  with no spread.
- **Collector timing is deterministic in the projection** (fixed times) where it
  is a drop in the game. The impulse magnitude is modelled; its variance is not.
