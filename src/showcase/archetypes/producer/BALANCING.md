# Balance — Producer

This economy is one shared geometric cost ladder across eight classes, read
through four multiplicative chains that rescale it without reshaping it. There
is no reset, no adversary and no run boundary, so nothing ever pulls the curve
back — the only questions are how fast cost outruns income and what the player
is given to notice while it does. `IDENTITY.md` § Rate-function spine declares
the bucket and where the closed form stops; the closed forms themselves sit in
`data/curve.ts` § Balance. This file is how you *work* on it.

The one derived number is `COST_RATIO`. Everything else is either generated from
it or is content.

## The knobs

Perturbable surface — the `tunable()` keys a probe can push a scope onto, and
what each one actually moves:

| Key | Default | What it moves |
|---|---|---|
| `balance/classRateScale` | `1` | ×N on every class's rate chain. The reactive stand-in for `baseRate`, which is static — see below. Moves realized income without touching the authored ladder. |
| `balance/clickYieldScale` | `1` | ×N on the hand-launch chain only. Nothing global binds here, so this moves the click-vs-ladder crossover and nothing else. |
| `balance/revisionMultiplier` | `1.03` | The per-revision default reward. 19 revisions compound to ~1.75×; the whole revisions chain rides this. |
| `balance/generationStep` | `0.05` | The breadth chain's per-class step — `(1 + step)^(distinct classes)`. Rewards deploying wide rather than deep. |
| `classes/<id>/baseCost` | `15 · 10^i` | A class's zeroth-unit cost, `a_i`. Eight keys, one per class. |

`OFFLINE_WINDOW_SECONDS` (`data/curve.ts`) is a constant rather than a key:
a `TuningRegistry` reader returns a `DecimalSource`, so it cannot express "no
window", and nothing has needed to sweep it. It is sized as a load-wait budget,
not a pacing target — re-measure with `offline-probe.ts` § 3 before moving it.

**Two of the most interesting constants are deliberately not on this surface**,
and the reason is the same for both: they reach the engine as static
`DecimalSource` fields read once at registration, so a `tunable()` wrapper would
register a knob nothing re-reads — a silent no-op that reads as a working lever.

- **`COST_RATIO` (`m` = 1.1548)** is `ProducerPurchaseConfig.costScaling`.
  Sweeping it means editing `data/curve.ts` and re-running, or composing the
  curve as a `Formula` at the wiring layer (`costCurve` in the shared balance
  toolkit, which is what `producer-projection.ts` already uses). Budget for a
  source edit per sample before deciding to explore it.
- **Class `baseRate`** is static on `ProducerMapping`. `balance/classRateScale`
  is the stand-in — it perturbs realized output without pretending the authored
  constant moved.

The tuning-modifier chain entries carry **no `description`**, which keeps them
out of `chain.description` and therefore out of every player-facing breakdown.
A knob that shows up in the UI as a game concept is a knob that will get balanced
against by mistake.

## Couplings

**`m` is derived, and derived numbers do not get nudged.** `COST_RATIO` comes
out of `m = (T_n/T_1)^(1/(n−1))` with an 8s opener and a 60s beat at level 15.
Changing the ratio without changing those two authored beat times leaves a
constant whose derivation comment is now a lie, and the comment is the only
thing that makes it checkable. Move the beat targets and re-derive, or accept
that you are choosing a number by feel and say so at the value.

**One steepness, eight classes.** Every class shares `m`. The ladder's character
lives in the per-class ratios instead — cost ×10 against rate ×8, so
self-payback climbs ×1.25 per class and every class opener is *worse* per unit
cost than the one below it. That gap is what makes the ladder a ladder rather
than a menu; closing it makes later classes strictly better and the player stops
deepening. Retune `CLASS_COST_STEP` / `CLASS_RATE_STEP` as a pair, never one.

**Revisions must stay discrete.** A revision fires on a count or a lifetime
total, never on a function of current production. This is the constraint that
keeps the whole composition closed: a threshold reading current rate would make
the multiplier a function of the thing it multiplies, and the piecewise splice
stops being a splice. `ProducerGameState` enforces it by construction — every
method is a count or a lifetime total — so the coupling is in the type, and the
type is the only thing guarding it.

**The click chain is deliberately isolated.** Refinements scoped `click` bind to
the launcher's chain; nothing global binds there, and revisions explicitly do
not. That isolation is what makes the click-vs-ladder crossover a clean
measurement on one axis. Bind a global multiplier to the launcher and beat 2
stops meaning what `data/refinements.ts` § Balance says it means.

**The dispatch rungs are spine decisions, not tuning.** `ASSISTED_AT_FLEET = 25`
and `MANAGED_AT_FLEET = 150` change *who applies the allocation rule*, which
moves the whole arc. Opening a gate earlier is not a small retune — grow the
projection's second branch in the same pass or the probe reports drift with
nothing to explain it.

**The probe driver depends on the manual openers still existing.** `_engine.ts`
works only hand-launches, hand-buys before dispatch opens, and refinement
purchases — everything else is the shipping dispatcher. Remove the hand-launch
and the driver produces no income before fleet 25, `assisted` never unlocks, and
an eight-hour arc buys nothing. That is not hypothetical: it is what the first
walkthrough did, and it read as a balance failure rather than as a driver with
no opener.

**An absence replays the game, not the player.** Catch-up runs every module, the
dispatcher included, but none of the manual openers. Anything that waits on a
hand-buy or a refinement waits for the return, so content that moves a beat from
automation onto the player also makes that beat sensitive to absence.
`offline-probe.ts` § 2 is where that shows.

## Running a pass

The probes print and none assert — they hand you a report and you decide. Run from
the repo root (`src/game/…` after eject):

```
pnpm exec vite-node src/showcase/archetypes/producer/balance/producer-projection.ts
pnpm exec vite-node src/showcase/archetypes/producer/balance/arc-probe.ts
pnpm exec vite-node src/showcase/archetypes/producer/balance/pacing-probe.ts
pnpm exec vite-node src/showcase/archetypes/producer/balance/allocation-probe.ts
pnpm exec vite-node src/showcase/archetypes/producer/balance/offline-probe.ts
```

- **`producer-projection.ts`** is the spine's runnable form and runs first — no
  engine, pure arithmetic. It prints the derivation of `m`, beat time on the
  isolated ladder, the ladder's cost/rate/payback table, the four chains at full
  completion, and a uniform-depth reference arc. Read it before any probe: it
  says what the math expects, and § 2 says in as many words that it holds income
  constant and therefore does **not** predict felt cadence.
- **`arc-probe.ts`** is the walkthrough gate — one 8h arc under the shipping
  ladder, reporting where each of the seven beats landed, when each class was
  first deployed, when each dispatch rung opened, and the realized stack. Run
  this before treating anything as a balance question; it is the first surface
  that walks rate chain → resource → predicate → beat.
- **`pacing-probe.ts`** answers shape-of-play: channel occupancy weighted by
  time, the arc half hour by half hour, content coverage, and — § 4 — the same
  question asked about beats the player can actually perceive. Its header
  explains why it samples per-second rather than binning into windows; the short
  version is that a window of W seconds cannot measure a beat longer than W, and
  the first cut of this probe reported "100% engaged" with frustration
  structurally unreachable.
- **`allocation-probe.ts`** runs the same arc three times under `cheapest`,
  `payback` and `hybrid` via `forcePolicy`, and reports the spread. Read the
  spread, not the winner. Its closing section states what the sweep structurally
  cannot exercise — see Known thin.
- **`offline-probe.ts`** checks the banked closed form against the replay (§ 1),
  runs the arc with an hour away before and after dispatch opens (§ 2), and times
  catch-up at the window (§ 3) — the measurement `OFFLINE_WINDOW_SECONDS` is
  derived from.
- **`beats.ts`** holds the windows and predicates the probes import. Windows are
  **recorded**, not authored; `manifest.ts` carries them as
  `recordedSimRange`, min/max across the three allocation rules. When a beat
  will not fire inside its window, the response is to move the window or reshape
  content, not to contort a constant into place.

Behavioral suites are a separate question and live beside their modules
(`modules/*.test.ts`). They carry no magnitudes, which is why they survive
retunes — don't add numbers to them.

## Known thin

- **The arc is fully engaged as an economy and mostly disengaged as an
  experience, and this is the headline finding.** `pacing-probe.ts` measures
  **100.0%** of the arc in the engaged bands on raw purchase cadence — arousal
  33%, flow 60%, flow-upper 7%, longest single gap 2m25s across 771 purchases.
  The same probe's § 4 measures the beats a player can actually *perceive*
  — a class appearing, a revision firing, a refinement unlocking — and gets
  **11.3% engaged**: 49 events in eight hours, 40.8% boredom, 29.3% frustration,
  18.6% breakdown.

  The gap is the hand-off. Dispatch opens at 8m27s and **97% of all purchases
  after it are the dispatcher's**, so past that point purchase cadence is the
  economy's tempo and not anyone's attention. This is the engine guide's
  "the metric is wrong" case: purchase interval is structurally unable to
  express felt pacing for an archetype whose whole arc is about handing
  allocation away, and no setting of any constant reaches it.

  **Open decision, and it is a content one.** Either the perceptible surface
  grows — more revisions, finer refinement steps, magnitude milestones on mass —
  or the archetype accepts that its late arc is watched rather than played and
  says so in `IDENTITY.md`. Both are calls about what producer *is*. Until one is
  made, § 4 will keep reporting 11.3% and it is not a bug.

- **Content runs dry for the last 19% of the budgeted arc.** The final
  refinement lands at 6h28m and the final revision at 6h30m of an eight-hour
  arc; after that nothing new arrives and the run is pure deepening. One
  refinement and one revision are never reached at all. That tail is exactly the
  18.6% breakdown band in § 4 — the same fact measured twice.

- **The allocation rule the spine names as its open edge is nearly inert.**
  `allocation-probe.ts` reports a **1.00×** spread in final rate and a worst-beat
  spread of 1.04× across all three rules; the final ladder shapes differ by a
  single unit of Lathe. The spine declares combinatorial selection as where the
  closed form stops, and the measurement says that edge is worth almost nothing
  *in this economy*. The honest reading is narrow: picking among **affordable**
  candidates barely matters here.

- **…and the instrument cannot test the interesting half.**
  `setupPolicyAutoPurchase` filters candidates by `canPurchase` **before**
  calling `policy.pick`, so every candidate a policy sees is already affordable
  and `selectionHybridPayback`'s wait term `max(cost − (resource − reserve), 0)`
  is structurally always zero — for any reserve, since the filter uses the same
  comparison. Save-toward-something-better is therefore untested, and testing it
  needs a driver that can decline to buy, which the engine's own auto-purchase
  helper cannot express. This bounds every allocation conclusion above.

- **`m` has no sweep.** It is the most load-bearing number in the archetype and
  the only one outside the perturbation surface, so exploring it costs a source
  edit and a full arc re-run per sample. See The knobs.

- **One arc, one seed, and that is defensible but worth knowing.** The
  dispatcher is deterministic and there is no stochastic layer, so extra seeds
  would confirm determinism rather than correctness. The axis that would actually
  carry variance here is *content* — different ladder depths, different chain
  counts — and nothing sweeps it.

- **Beat 2's window is driver-dependent.** The click ceiling crossing is a
  function of how fast the thin runner hand-launches (`launchesPerSecond`,
  default 2). A different opener moves beat 2 and nothing else, so read its
  window as a property of the probe as much as of the economy.
