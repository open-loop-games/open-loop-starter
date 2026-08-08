# Survivor — archetype identity

> **Wave Escalation + Cooldown-Rotation + Run-Scoped Upgrade Tree + Cross-Run Meta**
> — stand inside a continuously escalating threat and respond in real time, run
> after run. (Identity line: `../_identity.md`.)

**Topic: Mad Science × Action.** A containment breach you cannot leave. Your
apparatus fires itself because that is what apparatus does; reagents recombine
into named hybrids; the notes survive when you do not.

## What this archetype is

One operator loose on a bounded floor while specimens pour in from every side.
Devices fire on their own cooldowns within a **kill radius** — you never aim, you
only decide where to stand. Standing well means holding specimens inside that
radius and outside contact range: dancing on the edge. Kills leave reagent motes
where they died, and the **collect radius is smaller than the kill radius**, so
banking income means looping back through the space you just cleared. That
transaction — kill at the edge, dive to collect — is the whole moment-to-moment
game.

Every ~30–90 seconds a threshold crossing pauses the floor and offers a draft.
Devices level, reagents stack, and a device at max paired with the right reagent
recombines into a named hybrid. The run ends at the timer or when the floor
closes. Either way the notes bank, and the next descent starts further along.

The floor **scrolls**: the map is larger than the view, walled, and specimens
spawn only in an annulus around the operator. So threat is always local and
always escapable — which means disengaging is possible and costs you everything,
because distance is zero damage and zero income. Motes persist, and a rare
**collector** drop pulls every mote on screen at once; off-screen specials are
signposted by edge arrows, which is what makes routing to one through your own
uncollected field a real decision.

**Seats are policies.** Survivor ships with the operator driven by shipping
automation and is fully playable and balanceable before a human seat exists; a
player seat is a policy swapped for input (`modules/automation.ts`, and the same
discipline skirmish uses). The three **personalities** — speed, damage, defence —
bias both the movement policy and the draft policy, so each solves the collection
problem at a different price. They are simultaneously the balance sweep axis and
the character-select screen.

## Rate-function spine

**Bucket: geometric discrete on minute marks, over a modifier-product chain.**
Both sides of the run compound — device DPS through the draft, specimen HP and
annulus density through the escalation schedule — so the closed core is a
crossing between two geometric curves, and the XP ladder is _derived_ from the
income model so beats land on the authored schedule rather than being authored
beside it. Per-subsystem buckets and their receipts are inventoried at
`open-loop-research/methodology/techniques/closed-form-progression/per-archetype/survivor.md`.

The runtime is **sim-as-gameplay**: the spec closes, and the tick-by-tick arena
integrates it. That is not a gap in coverage — it is the integration of a form
that is already closed, and classifying it as discrete-event coupled would be
wrong.

**Where the closed form stops** — two places, both named:

1. **The draft is stochastic and load-bearing.** Offers are a weighted pick over
   a pool that narrows through the run, so DPS(t) is a distribution, not a curve.
   The variance carries design intent; a mean-only spec understates it.
2. **Collection efficiency `η` is a policy output.** Income is
   `kill rate × xp_per_mote × η`, and `η` falls out of how the movement policy
   trades contact risk for banked motes. The closed form assumes an `η`; it
   cannot predict one.

**What measures the remainder** — seeded multi-run distribution statistics per
personality: median survival, `η` reported separately for continuous pickup and
collector bursts, and the distribution of **binding cause** at run end —

| Cause                 | What bound                                                   |
| --------------------- | ------------------------------------------------------------ |
| HP floor              | contact accumulated; defence-bound                           |
| Traversal collapse    | annulus density beat available DPS; no gap to move through   |
| Collection starvation | killed enough, banked too little; low `η` against the ladder |
| Timer                 | survived the arc                                             |

A personality bound by one cause across every seed is a wall in costume. Three
specialists each bound by a different cause, with the baseline mostly reaching
the timer, is the target distribution.

## The loop — beat map

Not yet measured. The authored schedule the ladder is derived against is 33
draft beats over ~30 minutes, first interval 30s growing geometrically to 90s
(`balance/survivor-projection.ts`). Recorded windows land in `manifest.ts`
`beats` once the probes run — measured from a run, never authored as a target.

## Growth ports

- **The automation ladder.** The human seat has landed (`data/seats.ts`
  `PLAYER_SEAT`, `driver: 'player'`) and it cost an addition rather than a
  rewrite: input replaces the policy's _output_ at two seams the modules already
  named, and every mechanic downstream is untouched. What it unblocks is the
  ladder. There is still deliberately **no `AutomationTiers` gate**: an AI seat
  is an alternative character, not something the player earns, so it stays gated
  by install-presence exactly as skirmish gates its opponent seats. The honest
  rung is now buildable and is a different thing — _autopilot on the seat you are
  sitting in_, unlocked mid-run or across runs, with the existing movement policy
  as its body. That is a spine decision when it comes: opening the gate changes
  the arc, so the projection grows its second branch in the same pass.
- **Second meta-currency.** Halls of Torment's hero-specific shards alongside
  universal gold; a second cross-run chain over the same accrual.
- **Wave-shop fork.** Brotato replaces the level-up draft with a between-wave
  shop — same identity line, `shopMode` is the structural fork.
- **Arcana-style run modifiers.** Per-run rule-change cards as a small slot set
  over the modifier chain.

Exemplars — cited as a set that validates the shape ships in the wild, never as
lift targets: Vampire Survivors, Brotato, Halls of Torment.

## Engine fit (pattern → primitive)

| Pattern                     | Engine surface                                                                                                                                              |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Movement / avoidance        | `SpatialGrid.distanceField` over threat sources, ascended rather than descended; walls as cost                                                              |
| Trap check + loss detection | `SpatialGrid.bfs` — reachability answers "is there a gap"                                                                                                   |
| Mote routing                | second `distanceField`, multi-source over uncollected motes                                                                                                 |
| Collector routing           | exact euclidean term in `chooseHeading` — a drop lands inside `r_kill` and a 100-unit nav cell cannot resolve an approach ending inside a ~70-unit aperture |
| Draft offers                | seeded `rng` weighted pick                                                                                                                                  |
| Device / reagent modifiers  | `createModifierChain` + multiplicative modifiers                                                                                                            |
| Level cadence               | `createSkill` with an invertible `Formula` ladder                                                                                                           |
| Run boundary                | `createReset` with `keep` for the meta split                                                                                                                |
| Meta shop                   | `createPurchasableCategory` + `createCostRequirement`                                                                                                       |
| Player-facing automation    | `AutomationTiers`, typed tier union                                                                                                                         |
| Engagement banding          | harness `classifyFlowChannel`                                                                                                                               |

**Deliberately consumer-side:** the real-time arena — positioning, collision,
frame-level resolution — is named absent from the engine by design
(`open-loop-engine/docs/api/INDEX.md`). It is not a bypass. The arena step is a
pure `stepArena(state, dt)` called identically by the live tick and by the
probes, per the graduated shared-pure-state-function discipline.

**Candidate-primitive receipts this archetype is expected to produce:**

- `Cooldown-rotation dispatch over a def set` — admitted pre-designed under this
  identity, N=0, and its convergence signal names this build. Hand-roll it and
  mark the site.
- `Spatial utility steering` — N=1 (primordial); its convergence signal names a
  bot layer, which the movement policy is.
- Pixi field projection — **landed, N=3** (`ui/ArenaField.vue`). It runs neither
  prior receipt's smoothing: per-entity dead reckoning, integrating a measured
  velocity at frame rate with the sim sample correcting error only. That kills the
  recipe's cadence-versus-smoothing question as posed — survivor steps at the same
  20 Hz as skirmish and still needed it — and replaces it with a sharper one: what
  the smoothed value _drives_. An eased camera under a player's hand ripples the
  whole floor at 15.3% CV against 2.5% reckoned. It also added two divergences the
  dive has to cover: a _moving camera_ where the prior receipts carry a static fit,
  and a viewport-culled sprite pool for motes, whose population is unbounded
  because the sim never despawns them. Recorded in `candidate-recipes-ui.md`.

## Balance model

```
data/survivor.ts ─── Balance ───  →  balance/survivor-projection.ts  →  balance/survivor-probe.ts
spine, as prose + math               runnable closed form               probes (real engine)
```

The projection is written **before** `data/` and carries the authored design
parameters itself, so the coverage boundary is falsified while that is still
cheap. `data/` is derived from it, not the other way round. `BALANCING.md`
beside this file is the working guide — the knobs, their couplings, and how to
run a pass; `r_collect` relative to `r_kill` is the top coupling, because it sets
the risk premium on all income.

Magnitudes print; they never become assertions. Behavioural suites sit beside
their modules and carry no numbers, which is why they survive a retune.
