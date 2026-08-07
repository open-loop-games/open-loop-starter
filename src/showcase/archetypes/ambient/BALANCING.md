# Balance — Ambient

This economy is a five-tier geometric price ladder read through a deliberately
shallow growth rate, with an achievement product layered on top as pacing rather
than as growth. Owned-count climbs for hours without hitting a wall — that is the
whole point, and it is what makes the arc a multi-hour cumulative rather than a
session sprint. `IDENTITY.md` § Rate-function spine declares the bucket and where
the closed form stops; the closed forms themselves sit in `data/producers.ts`
§ Balance. This file is how you *work* on it.

## The knobs

Perturbable surface — the `tunable()` keys a probe can push a scope onto, and
what each one actually moves:

| Key | Default | What it moves |
|---|---|---|
| `balance/tier1BaseRate` | `1.0` | Planter's rate at its chain bind site. The whole early arc rides this — beat 2 is mostly a function of it. |
| `balance/achievementMultiplier` | `1.02` | Per-achievement multiplier folded into the rate chain. Pacing marker, not a growth lever — see Couplings. |
| `producers/planter/purchase/baseCost` | `55` | Where the first purchase lands. Bisected by the solver for beat 2. |
| `producers/coop/purchase/baseCost` | `75` | The early payback dip that carries the "first purchase feels good" beat. |
| `unlocks/coop-built/threshold` | `45` | When the coop becomes visible. Not solver-driven — see Known thin. |
| `unlocks/spring-arrives/threshold` | `1.05e9` | First mid-arc reveal. Paired with a scene variant — see Couplings. |
| `unlocks/year-cycles/threshold` | `4.28e9` | Arc-closing reveal. Paired likewise. |

**`COST_SCALING = 1.08` is not on this surface.** It is inlined in
`data/producers.ts` because `ProducerMapping.purchase.costScaling` is read once at
producer registration, so wrapping it in `tunable()` would register a knob that
nothing re-reads. Changing it means editing the constant and re-running the
solver, not pushing a scope. If you need the cost curve perturbable — or
invertible, for bulk-purchase math — compose it as a `Formula` at the wiring
layer (`costCurve` in the shared balance toolkit) instead of relying on the
static shorthand field.

## Couplings

**One steepness, five tiers.** Every tier shares `COST_SCALING`. The pacing lives
in the per-tier `baseCost / baseRate` ratios instead — 110 / 19 / 34 / 82 / 213,
where coop's dip is the deliberate "first purchase feels good" beat. Retune the
ratios. Touching the shared steepness changes the character of the entire arc,
which is a decision about what game this is, not a tuning pass.

**Zero-click is structural.** There is no manual trigger, so all income flows
through `getTotalRate`, and that is precisely what lets the solver read the arc
under `stasis-aware-tick` and terminate early when a candidate value makes a
predicate unreachable. Add a click channel and the accessor in `balance/_engine.ts`
stops capturing all income — the solver then reports *wrong* fire times rather
than failing, which is the worst way for a balance tool to break. Grow the
accessor first, or accept that you have left the archetype.

**Achievements are pacing, not growth.** `1.02` is small on purpose. Raising it
until the product is a real multiplier converts achievements into a reason to
push, and the no-pressure contract is the archetype. If you want compounding
growth, it belongs in the producer ladder where the player can see it.

**A producer cannot be bought before its reveal fires.** The autobuyer scores
only affordable, already-revealed candidates, so an unlock threshold is a
*pacing* control on the whole ladder and not just on visibility: raising
`pond-dug` withholds pond's rate as well as its tile. Two versions of
`ambient-projection.ts` got this wrong before it was caught — a model that buys
the best tier globally races ahead of the engine while reading as obviously
correct.

**Scene variants mirror unlock thresholds.** Five pairs, locked in
`sim/data-invariants.test.ts`. The four mid-arc transitions are geometric
interpolation between spring (`1.05e9`) and year-cycles (`4.28e9`). Move an
unlock threshold and its scene variant moves with it or the lock goes red.

**The arc budget matches `OFFLINE_CAP_HOURS`.** Beat windows are sized against a
~12h cumulative arc that a single overnight absence can cover. Change one and
size the other; letting them drift apart means a returning player either misses
the payoff or finds it already capped.

## Running a pass

Both probes print and neither asserts — they hand you a report and you decide.
Run from the repo root (`src/game/…` after eject):

```
pnpm exec vite-node src/showcase/archetypes/ambient/balance/solve-probe.ts
pnpm exec vite-node src/showcase/archetypes/ambient/balance/invariant-probe.ts
```

- **`solve-probe.ts`** bisects beats 2 and 5 against the real engine driven by
  the shipping autobuyers, chaining each beat's proposal forward into the next.
  Output is a proposed-patch report; it never edits `data/`.
- **`invariant-probe.ts`** runs the two contract checks: offline round-trip
  (4h / 12h / 24h gaps must land within 0.5% of an equivalent continuous run) and
  the no-pressure invariant (24h sim, reporting any tick where the visible
  resource shrinks, the headline rate unexpectedly hits zero, or a fail-state
  flag appears).
- **`reveal-probe.ts`** reports the unfold: each producer's reveal threshold and
  measured fire time, whether reveal order matches tier order, and the gap
  between consecutive reveals. The ordering half is a verdict — there is no band
  to widen — and the cadence half is a reading.
- **`ambient-projection.ts`** is the spine's runnable form, and runs first — no
  engine, pure arithmetic. It prints the ladder inversion, the buy order the
  shipping policy should take, and a strict upper bound on every producer-reveal
  time. Read it before a probe: if the bound and the probe disagree in the wrong
  direction, the economy moved, and no amount of bisection will tell you that.
- **`beats.ts`** holds the windows and predicates both probes import. Windows are
  *measured*, not authored — when a beat will not fire inside its window, the
  response is to move the window or reshape content, not to contort a single
  constant into place.
- **`sim/data-invariants.test.ts`** asserts structural relationships on the
  default data: threshold parity and monotonic ordering. No sim, runs in
  milliseconds. Magnitudes do not belong here — they belong in a probe report you
  read, not in a test that goes red on a legitimate retune — so don't add new
  ones. The headline-multiplier and idle-ceiling readings that used to sit here
  now print from `invariant-probe.ts`.

Beats 1, 3, 4 and 6 are verify-only. Beat 1 fires in seconds off the planter's
seeded `initialAmount: 1` under any content, so there is nothing to bisect.
Beat 3 has no knob that can carry it without breaking the reveal ladder — see
Known thin. Beat 4 is resume-driven and cannot be observed in a continuous headless
run — it is verified at runtime through `sessionClock.lastResumeGapSec`, and
deliberately has no predicate. Beat 6 rides whatever curve beats 2 and 5 settle on;
if it lands outside its window the fix is content — more achievements, or shifted
thresholds — not a new knob.

## Known thin

- **The whole reveal ladder unfolds in under fifteen minutes.** `reveal-probe.ts`
  measures all five producers visible by ~13m of a 12h arc — planter at 1s, then
  coop, pond, pasture, orchard at 1.4m / 4.9m / 7.5m / 13.3m. The identity claims
  "a slowly unfolding unlock tree"; this is a quarter-hour of unfolding followed
  by eleven hours of nothing new. The thresholds are each sized at ~0.6× their
  producer's `baseCost`, which makes them coherent *with each other* and unrelated
  to the arc they are supposed to pace.

  This is the root of the coop-reveal defect that has now been fixed
  (`coop-built` was at `30_810_558`, revealing tier 2 last, ~150× past the
  orchard). It was not a stray edit: beat-3's window is [30m, 90m], no producer
  reveal can reach it, and the solver had exactly one knob — so it pushed that
  knob two orders past its neighbours. `solveBeat3` is disabled for the same
  reason, and running it again would reproduce the defect.

  **Open decision.** Either the ladder should span the arc rather than its first
  quarter-hour, or beat-3 should be carried by a later reveal. Both are calls
  about what the unfold cadence *is*, not bisections. Until one is made, beat-3
  fires around 1.4m against a 30–90m window and the probes will say so.
- **The automation ladder is open.** `modules/automation.ts` declares the
  `manual → basic` ladder the conformance canon asks for, but `basic` carries no
  requirement — it is unlocked imperatively at install, so producer auto-buy is
  available from the first tick and the tier gate never actually withholds
  anything. The honest rung is the second producer reveal: `selectionHybridPayback`
  has one candidate while `planter` stands alone, so the policy is a no-op until
  `coop-built` (~1.4m). Setting the requirement there is a one-line change and a
  re-solve, *not* a free one — `balance/_engine.ts` enables every autobuyer spec at
  t=0, so the gate would move the arc. It belongs with the unfold-cadence decision
  above rather than ahead of it.
- **The windows are a first guess.** They were authored ahead of the content that
  now has to hit them and have not been re-measured since it settled. Treat a
  window miss as a question about the window before treating it as a tuning bug.
- **Beat 1 is structural, not balanced.** It fires on the seed, which means the
  opening beat is guaranteed rather than tuned. That is fine for the no-pressure
  contract, but it means the arc's first real balance decision is beat 2.
- **The ladder steepness has no sweep.** `1.08` is the most load-bearing number
  here and the only one outside the perturbation surface, so exploring it costs a
  source edit and a full solver re-run per sample. Budget for that before
  deciding to move it.
