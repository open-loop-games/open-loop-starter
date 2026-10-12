# Producer — archetype identity

> **`manual-action` + `producer` + `escalating-price` + `multiplier-stack`**, with
> `automation` taking the click over and `statistics` thresholds stepping the stack
> — the automation ladder with its `prestige` declined. Click a thing, the number
> goes up, spend the number on something that raises the number, and watch the
> multiplier compound.

One screen: what the archetype *is*, the closed-form spine that balances it, producer's
committed realization, and the ports a fork grows it through. The spine is the
load-bearing part — read that section slowly; the rest hangs off it.

Identity line source: `../_identity.md` (Producer entry); the line's player experience
and exemplar calls are `../_docs/producer.md`. **Core · covered** — every component is
a research pattern with a sourced, in-called member. This is a pattern-language
composition, not a port of any one game. Cookie Clicker (the ladder + achievement stack), Antimatter Dimensions (the
engineered cost-scaling class with closed-form bulk purchase), AdVenture Capitalist (the
automation arc) and Universal Paperclips (scale as the payoff) validate the composition
as a *set, with their crosses showing* — none is a clone target. Paperclips' phase transitions are a deliberate omission (§ What is
committed / not committed).

## What this archetype is

You spend a number on things that make the number bigger. Costs rise geometrically and
output rises linearly in count, so every tier is unreachable until it suddenly isn't,
and then it's trivial and you are already saving for the next one. The texture of play
is **pacing against a curve**: threshold moments, arriving on a cadence the designer
picked. The long-term pull is **modifier stacking** — hours in, the headline multiplier
is a visible product of four chains compounding into a number with no intuition
attached to it, and that is the reward.

Producer is the archetype with **no adversary, no board, no run and no reset.** Nothing
opposes you, nothing expires, nothing resets. The curve is the content. Every other
archetype in the gallery adds pressure, space, or a run boundary on top of some version
of this; producer is what is left when all of them are removed, which is why it is the
shape most forks arrive wanting and the one the base's widget contracts were drawn
against.

**One line, two paces.** The line's slow end — the game kept rather than played
(`../_docs/producer.md` § At the slow end of its pacing) — is this composition at
different rate constants with every urgency declined, not a different composition.
This build is the fast end: a click that matters and then deliberately stops
mattering, a cost curve that bites, and a cadence you feel. A fork that wants the slow
end retunes this one.

## The rate-function spine

**Bucket: exponential family** (`incremental-math/…/rate-functions/exponential.mdx`),
composed under two rules from `…/rate-functions/composition.mdx` — **piecewise splice**
across achievement thresholds, **modifier-product** within each band.

```
cost of unit n of tier i     c_i(n) = a_i · m^n            geometric ladder
purchases affordable on C    N(C)   = log_m( C(m−1)/a + 1 ) − 1     ← elementary inverse
rate                         R(t)   = Σ_i n_i(t) · r_i · Π_k μ_k
first passage under a stack  T(C)   = T_base( C / Π_k μ_k )         ← modifier-product rule
```

Three claims, each load-bearing:

**1. The multiplier stack rescales but does not reshape.** `composition.mdx`
§ Modifier-product closes for any **state-independent** multiplier: the cumulative is
the base cumulative scaled by the product, and the first-passage rescales inversely.
Four chains — `base × refinements × revisions × generation` — collapse to one factor
`Π μ_k` in the projection, however many members each carries. The stack is what the
player *feels*; it is one number to the algebra.

**2. Achievement multipliers stay inside the algebra only because they are discrete.**
This is the sharp edge. `…/design-playbook/modifier-chains.mdx` § When does
state-dependence break the algebra is explicit that a multiplier growing with the same
state the rate depends on falls off the closed form — first-passage stops closing, and
the late-game shape becomes whatever the state-dependence produces. A revision keyed on
a **count threshold** does not: between thresholds the multiplier is *constant*, so the
product rule holds within the band, and crossing one is a **piecewise splice point**
with a precomputable regime cumulative. The composition closes as `piecewise(bands) ×
modifier-product(within band)`.

> **Coupling, stated once here and again in `BALANCING.md`:** a revision must be a
> discrete step function of a count. Make any global multiplier continuous in
> production — "+1% per 10 mass/sec" — and the spine leaves the catalog silently. The
> game still runs; the projection stops predicting it and nothing reds.

**3. `m` is derived from a beat target, never chosen.** The cut port lifted Cookie
Clicker's `m = 1.15` 1:1, which is what the rebuild exists to stop.
`…/design-playbook/pacing.mdx` § Targeting a beat time directly inverts the ladder:

```
m = ( T_n / T_1 )^(1/(n−1))      T_1 = opening beat, T_n = beat at purchase n
```

So the authored numbers are **beat times**, not ratios — and § What beat time should I
target maps them onto flow channels (Arousal < 30s · **Flow 30s–2min** · Flow-upper
2–5min · Boredom 5–15min). Producer authors `T_1` and `T_n`, declares which channel
purchase `n` falls in, and *derives* `m`. If the result lands near 1.15 that is a
convergence receipt against the corpus, not a lift — and the derivation says which it
is.

### Where the closed form stops

**The allocation rule** — which tier absorbs the next unit of mass. This has a name:
the **combinatorial-selection** bifurcation
(`incremental-math/…/rate-functions/bifurcations.mdx` § Combinatorial selection), one of
the eight buckets that page catalogues as places the algebra ends. Its statement is
producer's situation exactly — *per fixed selection the system closes, modifier chains
collapsing to constant multipliers; across selections the optimization is combinatorial
over the option space*, with search and pruning as the named adjacent math rather than
anything closed. `pacing.mdx` § Where the math stops says the same from the other side:
first-passage is a duration, and what *fills* it is content shape, not curve shape.

So the boundary is not a gap in the corpus — it is a catalogued edge, which is what
`.claude/rules/archetype-authoring.md` § The spine means by naming what measures the
rest. **Fix the selection and the whole economy closes**; producer's spine is closed
*conditional on a stated purchase order*, and the purchase order is the condition.

Producer's rule is **authored, not searched** — a payback-ordered greedy,
`cost / marginal rate`, written down once and evaluated inside the projection. Same
structural position survivor's `η` occupies, and the reason this archetype is cheap
where survivor was not: the rule is a function you write, not a policy you have to build
a probe to discover. The same section warns that greedy-by-ratio does not always
match the exhaustive optimum — the trap being budget windows where a cheap
prereq-blocked path catches the heuristic — so "the greedy is the rule" is a declaration
the probe checks, not an assumption it inherits.

### Offline is a time-base map

Time away adds no spine term. Catch-up is a **simulation** (`modules/offline.ts` over
`processOfflineTime`): the time away is replayed through the live game loop, so the arc
measured in sim-time is the arc, and time away only moves wall-clock time onto
sim-time. Both regimes close:

- **Dispatch locked** — nothing spends, so the replay accumulates `R · t` at the frozen
  rate, piecewise at any revision earned while offline. That is claim 2 again, with the
  splice inside the offline period.
- **Dispatch open** — the shipping dispatcher runs over the replay exactly as it runs
  live, so the allocation rule is applied by the same code at the same cadence.

What the replay does not run is the player. Hand-launches, hand purchases and refinement
purchases wait for the return, so time away before dispatch opens delays everything
the opening hand purchases feed, and one after it delays only what waits on a refinement.
`balance/offline-probe.ts` measures both and checks the accumulated closed form against the
replay.

The window a return replays is not a pacing number. Catch-up blocks the load, so
`OFFLINE_WINDOW_SECONDS` is sized as a wait budget — derived in `data/curve.ts`
§ Balance — and time away past it is not replayed.

### What measures the remainder

An arc probe driving the **shipping dispatcher** (`modules/automation.ts`, behind
`AutomationTiers`) — never a bespoke automated player, per `/work/studio/CLAUDE.md` § automation as
game code. It prints realized time-to-tier against the projection, and it carries one
measurement the spine is currently unable to predict:

> **How much does the allocation rule move the arc?** Sweep the rule — payback-ordered
> greedy vs purchase-cheapest vs purchase-highest-affordable-class — and print the spread in
> time-to-tier-8. A small spread means the policy term is nearly inert and coverage is
> effectively full; a large one means the rule is load-bearing and belongs in every
> statement of the spine.

`balance/allocation-probe.ts` answers it: the rule is **load-bearing**, and nearly all
of its weight is the decision to save. The probe sweeps purchase-cheapest, payback-ordered
greedy and the hybrid that may hold mass for a better pick, plus that hybrid barred from
waiting as a control. Picking among affordable candidates moves the arc almost nothing —
the control matches purchase-cheapest on every row — while letting the rule save moves
time-to-tier-8 several-fold. So the spine's purchase-order condition is not a formality: a
statement of producer's arc names whether its dispatcher saves.

That settles an open question upstream: `studio/open-loop-starter#25` c4920 places
Producer in the **"Closes — no policy"** row, and this spine reads it as **"Authored
policy"**. The sweep says "Authored policy" was right.

## Producer's realization — the probe swarm

Producer ships this composition as a **self-replicating probe swarm**. You seed one
probe into a dead system; it converts matter into more probes. Nothing opposes you. The
display name is open; the archetype id is `producer`.

The costume exists to make spine terms legible, not to decorate them:

| Spine term | Fiction |
|---|---|
| headline currency | **mass** — matter converted |
| producer tier | a probe class, each an order of scale up |
| `m` (cost ratio) | **the frontier** — each launch reaches a further star, so cost grows geometrically in the radius already claimed |
| manual click (`manual-action`) | **hand-launch** — you seed probes personally until the swarm stops needing you |
| `Π μ` member: upgrades | **refinements** — per-class and global |
| `Π μ` member: achievements | **revisions** — crossing a replication milestone pushes a firmware revision through the entire swarm |
| automation tiers | **dispatch authority** — allocation handed to the swarm in stages |

Two of those carry weight. **`m` is derived from the premise rather than imposed on
it** — the expanding shell *is* the geometric cost ladder, where the genre normally
leaves the ratio unexplained. And a revision is a swarm-wide firmware push, which is why
the multiplier is **global**: the usual least-motivated member of the identity line gets
a reason to apply to everything at once.

**Ladder** — eight tiers, each roughly ×10 cost and ×8 output, so later tiers are worse
per unit cost and are reached through the stack rather than around it:
`Seed → Drone → Foundry → Hauler → Ring → Lathe → Swarm → Shell` (dust, asteroid, moon,
planet, star).

**Player-facing vocabulary.** Keep the algebra (`m = (T_n/T_1)^(1/(n−1))`, `Π μ`, the
band splice) in this doc and the balance lanes, never in the HUD. The HUD shows mass, a
ladder, and a breakdown.

## The arc — beat map

There is no cycle and no run; the arc runs once and does not close. Windows are
**measured and recorded by the probes, never authored** (§ Balance model) — the names
below are the beats, and the probe fills in each one's fire time.

1. **Hand-launch** — clicking is the only production.
2. **The swarm takes over** — the classes' rate overtakes the click's and you stop clicking.
   The crossover is a *measured* quantity; the fiction reads it as the swarm no longer
   needing you.
3. **First refinement** — the stack becomes visible as a stack.
4. **First revision** — the first splice point; the global multiplier steps.
5. **Dispatch** — the first automation tier unlocks and allocation leaves your hands.
6. **The frontier** — late ladder; the doubling cadence dominates and the number stops
   having intuition attached to it.

## Growth ports

Each feeds a named part of the spine.

| Port | Adds | Spine term it feeds |
|---|---|---|
| `addTier` | another probe class on the ladder | extends `Σ n_i r_i`; does **not** move `m` or the beat cadence |
| `addRefinement` | an upgrade, per-class or global | a factor in `Π μ` — rescales `T(C)`, never reshapes it |
| `addRevision` | a count-threshold milestone | a new **splice point**; must stay discrete (§ spine, claim 2) |
| dispatch tier | a rung on the `AutomationTiers` ladder | none directly — it changes *who* applies the allocation rule, which is what the sweep measures |
| `addPrestige` | a reset boundary with a retention | **declined here** — multi-layer prestige is Scaler's identity line. Named so a fork knows where it goes and that producer deliberately declined it |

## Engine fit (pattern → primitive)

| Pattern | Engine primitive | Note |
|---|---|---|
| `manual-action` | manual action feeding the same resource | the click's own chain is a `Π μ` member, so it is dominated by the ladder rather than switched off |
| `producer` + `escalating-price` | `createProducerCategory` (L2), over `createScalingPurchasable` | bulk purchase via `CostRequirement` inversion — the surface `ProducerList`'s `maxAffordable` / `purchase(amount)` contract was written against |
| `multiplier-stack` | `createModifierChain`, `bind`, trace / `BindingRecord` | four named chains; attribution is what makes the stack legible in the HUD |
| `statistics` thresholds (revisions) | `createAchievementCategory` / `createAchievement` | threshold-triggered, granting a global factor — the splice points |
| `automation` (dispatch ladder) | `AutomationTiers` | tier ids a typed union (`ProducerAutomationTier`); the ladder must actually withhold, per `.claude/rules/archetype-authoring.md` § Conformance |
| `offline-progress` | `processOfflineTime` (simulated catch-up), in `modules/offline.ts` | blocked unless the base's `settings.offlineProgress` is on; replays the dispatcher; clamped to `OFFLINE_WINDOW_SECONDS` |
| Perturbation | `tunable()` at reader sites, registry in `modules/tuning.ts` | canon is `tug`; one path, no `data/balance.ts` |

**This table is a prediction, and phase 2 falsifies it.** Producer's claim is that the
identity line maps onto engine primitives with near-zero hand-roll. If that holds, this
is the archetype that demonstrates the most engine surface for the least invention. Every
place it does not hold is a `candidate-primitives.md` receipt with a `TODO(expansion)`
marker at the hand-roll site — and that is a more valuable outcome than a tuned curve.

## What is committed / not committed

**Committed (spine):** the exponential-family bucket under piecewise × modifier-product
composition; revisions discrete and count-keyed; `m` derived from authored beat times
with its flow channel declared; the payback-greedy allocation rule authored inside the
projection; the rule's leverage measured, not assumed.

**Committed (producer's realization):** one headline currency (`converter` chains are
Interlocker's line); eight tiers; exactly four modifier chains; a click
that matters early and is dominated around tier 3; the dispatcher as both the shipping
automation and the probe's driver; offline catch-up by simulated replay over a window
sized as a load-wait budget, reported on return as a dimension line; no adversary, no
board, no run, no reset.

**Not committed (a fork's call):** the fiction and the display name; tier count and the
ladder's nouns; whether refinements are per-class, global, or both; the exact beat
targets and therefore `m`; whether the click chain gets its own late-game revival.

**Deliberate omissions.** Universal Paperclips' **phase transitions** — the mechanic
lifecycle that makes it famous — belong to Phase-shifter's identity line and are not
adopted; producer does not pivot. Prestige belongs to Scaler's. Both are cited as
exemplar crosses, never as lift targets, and both are named in § Growth ports so a fork
inherits the boundary rather than rediscovering it.

## Balance model

Math first, one-way flow, one home per number. `BALANCING.md` beside this file is the
working guide — the tunables, what couples to what, and how to read each probe.
Methodology lives at `open-loop-engine/docs/consumer-guide-balance.md`; the disk layout
it maps onto is `.claude/rules/archetype-authoring.md` § Balance — where each surface
goes. In brief:

- **The spine, as prose + math (`data/*.ts`).** Constants with co-located
  `// ─── Balance ───` sections: the authored beat targets and the `m` derived from
  them, the per-tier `a_i` / `r_i`, the revision thresholds as splice points, each
  naming its coupling.
- **The projection (`balance/producer-projection.ts`).** The same closed form, runnable,
  **no engine** — sizes `m` from the beat targets, prints which flow channel each purchase
  falls in, evaluates the payback-greedy rule to produce `n_i(t)`, and splices the
  revision bands. It predicts; it does not discover.
- **The probes (`balance/*-probe.ts`).** Drive the **real engine and the shipping
  dispatcher** so the simulation and the game cannot drift. `arc-probe.ts` prints realized time-to-tier
  against the projection and records the beat windows § The arc leaves blank;
  `allocation-probe.ts` runs the rule sweep that decides how much the policy term is
  worth; `offline-probe.ts` checks the accumulated closed form against the replay, measures
  what time away does to the arc, and times the catch-up the window is derived from.
- **The behavioral suites (`modules/<name>.test.ts`).** Shape invariants that survive
  retuning: cost rises monotonically with count, a revision fires exactly once at its
  threshold, a bulk purchase costs the same total as the units purchased singly, a
  locked dispatch tier purchases nothing, offline time accumulates mass while dispatch
  is locked and spends it once dispatch opens. No magnitudes — those print from the probes, per the
  engine guide § Why this isn't a test suite.

**Ordering, per `studio/open-loop-starter#25` c4920.** The probe comes first. The
dispatcher and its calibration are committed *before* the first balance finding — survivor's cost
was two days of findings taken through an uncalibrated probe, and the rule that
would have prevented it was already written. Here that means: the payback rule is
verified to do what the projection assumes it does, and only then does a number mean
anything.
