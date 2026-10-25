# Scaler — balancing

A geometric hero ladder under three prestige layers, with no click and no RNG. Heroes
earn Justice; a Reboot turns Justice into Legacy by a cube root, a Rewrite turns Legacy
into Continuity by a square root, and an Age turns Continuity into Canon by a fourth
root. Each layer's currency multiplies the corps and buys a cascading chain whose output
inside one reset is a polynomial in time. The bucket and its closed form are in
`IDENTITY.md` § Rate-function spine.

The numbers come from the authored anchors, levers and chain specs at the top of
`data/spine.ts`. The tier cost step and the Reboot threshold are solved on import; the
Rewrite threshold, the Age gates and every Elseworld goal are recorded by one pass of the
reference walk. To retune, change an anchor or a lever and let the derivations follow.

## The tunables

Every key is read at its reader site through `tunable()`; the registry is in
`modules/tuning.ts`.

| Key | Default | What it moves |
|---|---|---|
| `heroes/priceRatio` | `ANCHORS.priceRatio` (1.15) | How fast every tier's price climbs with its own count, before Villain Uprising's rule or reward. Higher is a slower run and a later Reboot. |
| `heroes/<id>/baseCost` | the solved ladder | One tier's first-unit price. Lower opens that tier sooner and pulls the desk toward it. |

**Not perturbable, on purpose:**
- The anchors, levers and chain specs set every derived threshold. Perturbing a
  threshold instead of its anchor desyncs the game from the reference walk.
- The Rewrite threshold, the Age gates and the Elseworld goals are recorded from the walk
  at import; moving a tunable does not move them.

## Couplings

- **The automated layers run on a count, not a rate.** Once the Succession Plan reboots,
  its timelines sit at its interval, and a Rewrite cycle lasts the Reboots it needs times
  the interval. Output reaches Continuity only through the ∛ and √ roots, about μ^(1/6).
  So a slot-based gate, not a solved exponent, places each layer's beats.
- **Continuity's output power is held under a critical value.** The Reboots a cycle
  needs scale as C^(1 − p/3 − m), with p Continuity's output power and m Mythic
  Standing's Legacy-gain exponent (log 2 / log 9). Near zero, cycles stop lengthening and
  Continuity grows exponentially in time; it overflows by the third Age. Raise p or
  cheapen Mythic Standing only with the walk open.
- **Gates are recorded at the first reset past each slot.** The first Rewrite's
  threshold is Legacy earned at the first Reboot past `firstRewriteS`; each Age's gate is
  Continuity earned this Age at the first Rewrite past its slot. A long cycle near a slot
  moves the gate's beat later than the slot.
- **Each Elseworld tier asks at least ten times the last.** A tier's goal is what its
  restricted run earns in `elseworldS` at the walk's state when its slot comes up. A slot
  just after an Age would size a goal below the tier before, so the walk waits for a
  timeline strong enough to ask `tierEscalation` times more.
- **Elseworld goals are sized on output without Hope.** The walk leaves Hope to the
  timeline's τ, and Dark Days takes Hope away. A player, or the probe, judging readiness
  by output with Hope enters too early.
- **Chain prices double per unit.** Whole bases then keep every price whole, so no shop
  leaves a currency fractional.
- **Earned-since-reset counts are kept where the layer banks.** Justice earned this
  timeline sums the corps' rate each tick; Legacy and Continuity earned are counted where
  a Reboot and a Rewrite bank them. Subtracting a mark from a lifetime cumulative fails
  past 9e15: break_eternity drops a gain under ~1e-13 of the total.
- **A reset named in another's scope lends its refs, not its retention.** The Age
  carries Eternal Dispatch's keep-set itself, and reads ownership before the wipe,
  because the Age wipes Eternal Dispatch too and restores it from its own keep-set.
- **The desk buys until it would rather save.** Each tick it recruits by blended payback
  until the best pick is unaffordable. A desk limited to one recruit a tick falls behind
  the late economy.
- **The desk's recruit cap is part of its rule.** `DESK_RECRUITS_PER_SECOND` caps the
  desk per second of game time, so the probe's tick and live play's allow the same rate.
  The arc probe prints how many ticks reach it. Lifting it moves the Age beats, and the
  spine's walk leaves it out. Recruiting by hand before the desk has no cap.
- **The desk prices a batch with `priceRatio`.** While Justice covers a whole batch, it
  buys the batch as one purchase per tier, and it sizes the batch as if every tier's price
  grows by the run's price ratio per recruit. Give a tier another price curve and the
  batch recruits a different corps. The Dispatch Desk suite compares the batch with one
  recruit at a time.
- **`hold` is fitted to the desk.** The ladder model fills a tier to `hold` units before
  saving for the next; the Dispatch Desk interleaves tiers instead. Change the desk's
  policy and refit `hold` against § tier openings of the arc probe.
- **One module per reset depth.** A ref joins a layer's scope by being created in that
  layer's module: the run in `modules/run.ts`, Legacy in `modules/legacy.ts`, Continuity
  in `modules/continuity.ts`. A chain's bought units live in the module of the currency
  that buys them, and what it made in the module one reset shallower.
- **An Elseworld's rule and reward on one chain need distinct descriptions.** Both lower
  to bind ids of `{scope}/{description}`, and a repeat throws.

## Running a pass

| Question | Probe | What it prints |
|---|---|---|
| Does the shipping game follow the spine? | `arc-probe.ts [seconds] [--beats]` | tier openings, the first Rewrite and every Age, cadence per 15 minutes, every Elseworld tier, the end state |

Run it from the repo root with
`pnpm exec vite-node src/showcase/archetypes/scaler/balance/arc-probe.ts`. Its header says
how to read it. The default is the four-hour arc plus ten minutes at dt 0.5, about 15 s
of wall time. `--dt` plays it at another tick; compare 0.25, 0.5 and 1 after a change to
anything that acts once per tick.

## Known thin

- **The engine runs up to seven minutes ahead of the walk from the first Age on.**
  Each Age's length matches within a few minutes; the lead is set in Act II, where the
  engine rewrites more often than the walk at the same share.
- **An Age beat moves by a whole Rewrite cycle with the probe's dt.** An Age turns on the
  first Rewrite whose Continuity crosses the gate. A small change in timing, such as the
  probe's dt, decides whether one Rewrite crosses it or the next does. So Age 2 lands near
  2:31 at some dt values and near 2:37 at others, with no trend in dt. Compare beats
  across a dt sweep by branch, not by the second.
- **The last Elseworld tier can miss the arc.** When the engine reaches the Modern Age
  before Lost Earth 5's slot, the Age's reset leaves its output below the goal's sizing
  until past four hours. Whether it does depends on the Age 4 branch above; at dt 0.5 it
  does.
- **Most Elseworld tiers resolve in seconds, not two minutes.** The reference enters on
  the first fresh timeline past the slot that is strong enough, which is usually much
  stronger than the slot's sizing. A goal is a minimum, not a duration.
- **The tier openings run behind the ladder model.** The engine opens tiers 4–18% after
  the spine; `hold` absorbs the interleaving only on average.
