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
| `balance/tier1BaseRate` | `1.0` | Planter's rate at its chain bind site. The whole early arc rides this — beats 2 and 3 are mostly a function of it. |
| `balance/achievementMultiplier` | `1.02` | Per-achievement multiplier folded into the rate chain. Pacing marker, not a growth lever — see Couplings. |
| `producers/planter/purchase/baseCost` | `55` | Where the first purchase lands. Bisected by the solver for beat 2. |
| `producers/coop/purchase/baseCost` | `75` | The early payback dip. Bisected for beat 3. |
| `unlocks/coop-built/threshold` | `30_810_558` | When the coop becomes visible. Currently wrong — see Known thin. |
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
predicate unreachable. Add a click channel and the accessor in `balance/bot.ts`
stops capturing all income — the solver then reports *wrong* fire times rather
than failing, which is the worst way for a balance tool to break. Grow the
accessor first, or accept that you have left the archetype.

**Achievements are pacing, not growth.** `1.02` is small on purpose. Raising it
until the product is a real multiplier converts achievements into a reason to
push, and the no-pressure contract is the archetype. If you want compounding
growth, it belongs in the producer ladder where the player can see it.

**Scene variants mirror unlock thresholds.** Five pairs, locked in
`sim/balance.probe.test.ts`. The four mid-arc transitions are geometric
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

- **`solve-probe.ts`** bisects beats 2, 3 and 5 against the real engine driven by
  the shipping autobuyers, chaining each beat's proposal forward into the next.
  Output is a proposed-patch report; it never edits `data/`.
- **`invariant-probe.ts`** runs the two contract checks: offline round-trip
  (4h / 12h / 24h gaps must land within 0.5% of an equivalent continuous run) and
  the no-pressure invariant (24h sim, reporting any tick where the visible
  resource shrinks, the headline rate unexpectedly hits zero, or a fail-state
  flag appears).
- **`beats.ts`** holds the windows and predicates both probes import. Windows are
  *measured*, not authored — when a beat will not fire inside its window, the
  response is to move the window or reshape content, not to contort a single
  constant into place.
- **`sim/balance.probe.test.ts`** asserts structural relationships on the default
  data: threshold parity, monotonic ordering, multiplier sanity. No sim, runs in
  milliseconds. Magnitudes do not belong here — they belong in a probe report you
  read, not in a test that goes red on a legitimate retune — so don't add new
  ones. The shape checks are the part that stays.

Beats 1, 4 and 6 are verify-only by design. Beat 1 fires in seconds off the
planter's seeded `initialAmount: 1` under any content, so there is nothing to
bisect. Beat 4 is resume-driven and cannot be observed in a continuous headless
run — it is verified at runtime through `sessionClock.lastResumeGapSec`, and
deliberately has no predicate. Beat 6 rides whatever curve beats 2/3/5 settle on;
if it lands outside its window the fix is content — more achievements, or shifted
thresholds — not a new knob.

## Known thin

- **The coop reveals last, and it is meant to reveal second.** The five producer
  reveals in `data/unlocks.ts` all threshold on lifetime primary, and they read
  0 / 600 / 12k / 200k for planter, pond, pasture and orchard — with `coop-built`
  at `30_810_558`, roughly 150× past the orchard. Coop is tier 2 and
  `data/producers.ts` § Balance calls it the deliberate early payback dip that
  carries the "first purchase feels good" beat, so the data contradicts the
  design. It is also the one reveal on the perturbation surface, which is the
  likely cause: a bisection wrote a value there and nothing compared it to the
  other four. Nothing catches it — the monotonic-order lock in
  `sim/balance.probe.test.ts` covers the five scene variants only, not the
  producer reveals. Fix the threshold, then close the coverage hole — as a probe
  that reports reveal order against tier order, not as another assertion.
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
