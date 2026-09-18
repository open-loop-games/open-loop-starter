# Balance — Skirmish

This is an RTS economy: income funds an army, and the only real decision is how
much of it to reinvest instead. `IDENTITY.md` § Rate-function spine declares the
bucket and where the closed form stops; the closed forms themselves sit in
`data/economy.ts` § Balance. This file is how you _work_ on it.

The thing to understand before touching a number: **balance here is a payoff
matrix, not a curve.** There is no correct `φ`, only a best response to what the
opponent is doing. A pass that produces one dominant split has made the game
worse even if every individual number looks reasonable.

## The knobs

Perturbable surface — the `tunable()` keys a probe can push a scope onto:

| Key                       | Default | What it moves                                                                                                                 |
| ------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `economy/incomePerWorker` | `2.5`   | `ρ`. Raises income and the growth constant `r = ρ/c` together, so it moves both the pace and the whole game's tempo.          |
| `economy/workerCost`      | `100`   | `c`. Investment lump size AND `r`, inversely. The single most coupled number here — see Couplings.                            |
| `tactical/unitCost`       | `10`    | Army price. Sets how many units an investment costs and therefore how sharp the tradeoff feels.                               |
| `match/timeLimitSec`      | `1800`  | A backstop, not the match length. Matches resolve in well under a minute; a run that reaches this cap is a stalemate reading. |

**`economyShare` (`φ`) is deliberately not on this surface.** It is a per-seat
policy parameter on `AutomationOptions`, not a global constant — two seats hold
different values at once, which a registry key cannot express. Sweep it by
building engines at different splits (`balance/_engine.ts` `seatsAtShare`), which
is what `split-probe.ts` does.

**`startingWorkers`, `maxWorkers` and the combat constants are not perturbable
either.** `E₀` and the roster are content shape; `maxWorkers` is a sim guard that
should never bind (see Known thin).

## Couplings

**`c` moves three things at once.** It is the investment lump, it divides into
`r = ρ/c`, and it sets the worker/unit price ratio. Raising `c` therefore slows
compounding, makes each investment a bigger commitment, AND lengthens payback —
all pushing personas toward army. If you want _only_ a slower economy, move `ρ`
and `c` together and leave the ratio alone.

**Investment must withhold, or `φ` is a lie.** Because `c > unitCost`, a worker
is a lump against a continuous income stream. A policy that commits its remainder
to army every decision slot never banks the price, so income loses the race to
its own spending and the realized split reads 0 no matter what the persona asked
for — with nothing anywhere reporting an error. `modules/automation.ts` reserves
the worker price while under target for exactly this reason. Drop `c` below
`unitCost` and the reserve silently becomes a no-op.

**Realized `φ` overshoots in short matches.** Steering is bang-bang against an
indivisible worker, so the realized share sits at or just above target by up to
`c / cumulativeIncome`. In a 40s match that bound is large — a seat targeting
0.2 can realize 0.45 — so read `realizedShare` against match length before
concluding a persona is misbehaving.

**The sim must stay symmetric, and it is easy to break.** Two seats given
identical treatment must reach identical state. Two separate defects broke this
and both read as balance findings rather than as bugs: a spawn counter shared
across sides handed each a different formation offset, and sequential per-side
resolution let the second side act on the first's already-moved positions. Both
were found by noticing that a mirror matchup had a winner. `modules/tactical-sim.test.ts`
§ mirror symmetry locks it; `split-probe.ts` re-checks it on every run via the
diagonal, and says so loudly.

**Base HP and army throughput set whether the economy matters at all.** The
economic crossovers sit around 1.5–2.1m (`skirmish-projection.ts` § 3). If
matches resolve much faster than that, no investment can ever pay off and the
split is decorative regardless of how well `r` is tuned. The first pass here
resolved matches in 21s, which made every economic number irrelevant; raising
`BASE_HP` to 500 (50 trooper equivalents) pushes economic clashes (φ = 0.2 vs
0.4) across the crossover to ~130s (2.17m), while the default rush-vs-investor
match resolves around ~50s (49.5s in `arc-probe.ts`, 60s in `split-probe.ts`).
## Running a pass

Run from the repo root (`src/game/…` after eject). Order matters — the
projection is cheap and rules out whole classes of problem before any sim runs:

```
pnpm exec vite-node src/showcase/archetypes/skirmish/balance/skirmish-projection.ts
pnpm exec vite-node src/showcase/archetypes/skirmish/balance/arc-probe.ts
pnpm exec vite-node src/showcase/archetypes/skirmish/balance/split-probe.ts
pnpm exec vite-node src/showcase/archetypes/skirmish/balance/roster-probe.ts
```

- **`skirmish-projection.ts`** — no engine, pure arithmetic. Prints army and
  income under a fixed split, and the economic crossover against pure rush. Army
  counts are an **upper bound**: the reserve and the purchase cadence both make
  the real army smaller, so a probe _over_ the bound means the model is wrong
  rather than the balance. Check the crossovers against expected match length
  first; if the crossover lands after the match ends, the economy is decorative
  and no amount of sim work will show it.
- **`arc-probe.ts`** — drives the shipping automation through one match of the
  default matchup and reports when each beat fired, plus a sampled view of the
  match. A beat firing outside its window is a question about the window or the
  content, never a reason to bend a constant.
- **`split-probe.ts`** — the signature probe. Sweeps `φ` on both seats and prints
  the payoff matrix. Read it in this order: (1) is the diagonal all stalemate — if
  not, stop, the sim is asymmetric and every other cell is unreliable; (2) is any
  split undefeated — a dominant split means the axis is dead; (3) is there an
  intransitive cycle — that is the outcome worth having.
- **`roster-probe.ts`** — verifies the 3-unit counter matrix (trooper > cavalry >
  archer > trooper) across pure and mixed composition matchups. Diagonal must be
  all stalemate (mirror symmetry); off-diagonal cells verify the counter cycle.
- **`beats.ts`** holds the windows and predicates. Windows are **measured**, and
  the current ones come from the default matchup resolving around ~50s.
**On `never` readings.** The break and recovery beats are asymmetric by nature: a
seat that wins cleanly never has its army broken, and a seat that collapses never
recovers. Those `never`s describe the match correctly. A `never` on any other
beat, or on both seats at once, is the one worth chasing.

## Known thin

- **The default matchup is one point, run once.** `arc-probe.ts` reads a single
  deterministic match. There is no seeded distribution anywhere yet, because
  nothing in the shipping personas is stochastic — `cadenceJitter` exists and is
  off. The spine names stochastic load-bearing as one of three places the closed
  form stops, and that third leg is currently unexercised: turn jitter on and the
  single-match readings above become distributions that need different tooling.
- **The economic crossover and match resolution.** The projection puts
  crossover against pure rush at 1.5–2.1m. With `BASE_HP = 500`, economic clashes
  (φ = 0.2 vs 0.4) last 130s (~2.17m), crossing the threshold and demonstrating
  the compounding half of the spine. However, aggressive rush matchups (φ = 0 vs 0.2)
  resolve earlier around ~50s, because field combat is decided at the first
  engagement (~26s) and the defeated base falls under siege. The split
  decides matches cleanly with an intransitive cycle (0 → 0.4 → 0.2 → 0).
- **`maxWorkers` has never been reached, and must not be.** It is a guard against
  unbounded growth in a match with no clock. A probe reporting a seat pinned at
  the cap is reporting that the cap became balance, which is a defect — the first
  data pass had exactly that problem at `c = 40`, where the cap bound at ~74s.
- **3-unit roster and counter matrix.** The roster provides the classic
  rock-paper-scissors triad: trooper (infantry) counters cavalry (1.75x),
  cavalry counters archer (1.75x), and archer counters trooper (1.75x). Verified
  in `roster-probe.ts` with mirror symmetry on the diagonal. Automation policies
  draft compositions via `AutomationOptions.composition` (defaults to pure trooper).
- **Two seats, where the identity claims N.** Free-for-all is the base case in
  the identity line; the implementation seats two. Everything here — the payoff
  matrix especially — is the degenerate bilateral case, and the coupled-state
  term in the spine only loses its zero-sum shelter at N ≥ 3.
