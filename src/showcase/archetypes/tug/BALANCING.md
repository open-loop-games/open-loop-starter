# Balance — Tug

Two economies of the same shape run against each other inside a match, so this
archetype has no single closed form to project against. Each side is an ordinary
cost-scaling ladder feeding auto-production, but the thing you are balancing is
the *distribution* of match outcomes those two ladders produce when they collide
— which means the method here is measure-and-record over repeated runs, not
solve-for-a-fire-time. `IDENTITY.md` § Rate-function spine states that boundary;
this file is how you work inside it.

## The tunables

| Key | Default | What it moves |
|---|---|---|
| `balance/baseIncomeRate` | `8` | Income accrual for **both** sides. Symmetric by rule — see Couplings. |
| `fortress/hp` | `5_000` | How long a match can run before a base falls. The match-length limit. |
| `units/<id>/cost` | per unit | Composition economics. The retune sweep multiplies costs at or above its top-tier floor as one axis. |
| `income-upgrades/<id>/cost` | `400` / `1_200` / `3_600` | Purchase-now-or-save tension — ×3 per rung. The greed persona's economic compound depends on Refinery I's cost. |
| `income-upgrades/<id>/multiplier` | `1.5` / `1.4` / `1.3` | Tapering compounding down the path, `×2.73` with all three purchased. |
| `counter-matrix/strongCounter` | `1.75` | **The signature tunable.** How decisively a good counter-pick pays. |
| `counter-matrix/weakCounter` | `0.6` | The other half of the asymmetry — how badly a bad pick punishes. |

**Persona and believability are not tunables, deliberately.** They are how
the opponent *behaves*, not what the design is worth. A difficulty setting exposed
as a tunable means every probe reading win-rate is measuring that setting
instead of the design — if a fork wants asymmetric difficulty it gets its own
namespace, never `balance/`.

## Couplings

**Income is symmetric, and that is load-bearing.** Both sides accrue at
`baseIncomeRate` with no AI-side modifier. Every win-rate number the probes
produce is only interpretable because of it. Reintroducing an income asymmetry
silently converts the entire probe battery into a difficulty meter.

**The counter matrix is data, not a chain.** It is an N×N lookup the combat
resolver reads per tick — square against the roster, identity on the diagonal.
Changing roster size changes the matrix, and `strongCounter` / `weakCounter` only
set how sharp its off-diagonal entries are. Twelve off-diagonal asymmetries carry
the whole counter-pick design.

**Refinery tiers unlock in order.** Tier N requires tier N−1 purchased, so the
cost ladder is a path rather than a menu. A cheap tier cannot be skipped to, and
a tier's ROI is only ever evaluated from the state the previous tier left.

**A headless run puts the shipping AI on both sides; production does not.** Production
is a human against one AI, and there is no human in a headless run — so the AI
plays itself. This is a deliberate fiction, and it means probe output describes
a *design property* (is the matrix decisive?) rather than forecasting what a
player will feel. The counter-vs-greed pairing is calibrated, not arbitrary:
greed concentrates its composition on the highest-cost archetype, which is what
gives the matrix something to act on.

**Believability is headless-run noise, not balance.** Deterministic single-pass checks run
it at zero so one run suffices; the multi-seed probes run suboptimality `0.20`
and cadence jitter `0.25` to produce outcome variance that actually responds to
the tunable being swept. Set it wrong in either direction and the probes go blind —
deterministic and flat, or noisy and unreadable.

**The match driver is headless-only.** Production stays inside a single match per
play session and never installs it. Without it a headless run ends after match one and
every cumulative multi-match beat silently never fires.

## Running a pass

Run from the repo root (`src/game/…` after eject):

```
pnpm exec vite-node src/showcase/archetypes/tug/balance/arc-probe.ts
pnpm exec vite-node src/showcase/archetypes/tug/balance/retune-probe.ts
```

**Tug ships no `tug-projection.ts`, deliberately.** The canon wants a runnable
closed-form projection wherever one is worth executing, and producer and cycler
both carry one. Tug's spine declares no single closed form (`IDENTITY.md`
§ Rate-function spine): the arc is a distribution over adversarial match
outcomes, so there is no expression to run and contradict. The one genuinely
closed-form piece — the income-upgrade ROI, `paybackSeconds = cost / (rate ×
(multiplier − 1))` — is already executed where it is used, inside the ROI
snapshot, recomputed from the data constants each run. Lifting it into a
projection file would buy a filename and lose the co-location. Don't add one
without a second closed form to put beside it.

- **`arc-probe.ts`** is the battery. Deterministic single-pass fire-time checks
  use one `runUntil` each; the sensitivity sweep and the ROI snapshot use
  multi-seed matrix runs and read distribution statistics off the aggregate. It
  prints a per-probe report and shows drift for you to look at rather than
  blocking on it.
  - The **signature probe** sweeps `strongCounter ∈ [0.5, 1.5]` against
    counter-persona win-rate versus a concentrating opponent, then proposes an
    elbow: the smallest value where win-rate clears the floor and the next step
    has stopped adding much. A response curve plus a chosen point on it.
  - The **ROI snapshot** uses the closed form
    `paybackSeconds = cost / (rate × (multiplier − 1))`, recomputed from the data
    constants. That check is about the instrumentation agreeing with the
    arithmetic, not about whether the number is well-chosen.
  - The **dominance check** is pipes, not numbers: a 4×4 persona Cartesian that
    passes if every cell runs end-to-end and at least one has wins. Red there
    means the per-archetype spawn/death instrumentation broke, not that the
    balance is bad — check it first when a sweep starts reporting nonsense.
- **`retune-probe.ts`** is the wide sweep: refinery economics, base income, top-
  tier unit cost and matrix sharpness, Cartesian across the persona matrix. It is
  ~17k runs and around half an hour of wall-clock time, so it is a deliberate run, not
  something to reach for casually. It is hunting for a data slice where mass or
  counter has a viable matchup against *someone* — the failure it catches is a
  persona with no viable opponent at all.
- **`roi-probe.ts`** is a fast read of the income ladder with no simulation: cost,
  multiplier, the rate each rung is purchased from, payback, and combined multiplier — plus a
  verdict on each claim `data/income.ts` § Balance makes about the ladder's shape.
  Run it after touching refinery numbers; it takes no time and catches the class
  of drift where the prose and the constants stop agreeing.
- **`beats.ts`** holds the windows and predicates both drivers import.

## Known thin

- **The signature tunable barely does anything at default data.** The strongCounter
  sweep produces a near-flat win-rate curve across its whole range: the
  underlying economy and roster balance dominate matrix sensitivity, so the
  archetype's centerpiece is currently being drowned out. This is the single most
  important fact about tug's balance today — until the economy underneath is
  retuned, the sensitivity sweep is reporting on something other than the matrix.
  `retune-probe.ts` exists to find the slice where it stops being flat.
- **The refinery ladder is retuned but unvalidated in play.** It now matches its
  stated design — costs `400 / 1_200 / 3_600` climbing ×3 against multipliers
  tapering `1.5 / 1.4 / 1.3`, combined `×2.73`, with Refinery III's payback at
  40% of the match limit so committing to it is a real bet. `roi-probe.ts` checks
  those claims. What is *not* established is that the ladder plays well against
  the unit economy: the numbers are internally coherent and have never been
  measured against win-rate. Run `retune-probe.ts` before trusting them.
- **The suites assert instrumentation, not numbers.**
  `sim/instrumentation.test.ts` derives every expectation from
  `DEFAULT_TUG_DATA`, so retuning `data/income.ts` moves both sides together and
  nothing reds spuriously. `sim/data-invariants.test.ts` holds shape only. If you
  want a magnitude recorded, print it from `balance/arc-probe.ts`.
