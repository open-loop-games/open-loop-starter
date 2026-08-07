# Balance — Cycler

Two curves race each other and one always wins. Within-run capacity is
**concave** — every reinvestment ladder converges, base output is hard-capped,
and board-fill saturates on a finite grid — so it climbs to a ceiling `D_max`
and stops. Pressure is an **exogenous geometric salvo**, `W_N = W₀ · g^N`, which
does not stop. The run ends where the salvo overtakes the defended line, and
because one side saturates while the other compounds, run length is
**logarithmic** in capacity: `N* ≈ log_g(D_max / W₀)`.

That logarithm is the archetype. It is why a player who has multiplied their
capacity 256× still gets a run of the same length, and why permanent power reads
as *reach* rather than as pacing. `IDENTITY.md` § The rate-function spine has the
derivation; this file is how you work on it.

## The knobs

Perturbation is `tunable()` against the registry in `modules/tuning.ts`. A probe
or a suite sweeps a value with `pushScope`, never by rebuilding the engine with
overridden data. Keys are namespaced by the spine term they sit in rather than by
the file they came from, because that is how the economy decomposes:

| Key | Default | What it moves |
|---|---|---|
| `peg/headroom` (H) | `16` | **Authors run length.** `W₀ = cMax/H`, so the crossing is `log_g(H)` waves. |
| `peg/salvoBase` (g) | `1.6` | Escalation per wave. The high-leverage lever — steeper g means a shorter, sharper run. |
| `wave/standbySeconds` / `wave/inboundSeconds` | `90` / `30` | The 2-minute wave cycle. The only thing converting waves into minutes. |
| `line/hp` / `line/baseRepair` | `500` / `30` | The `Δ_wall` tail — how long the line bleeds after the salvo passes it. |
| `capacity/baseOutputCeiling` | `50` | The hard cap that makes capacity concave rather than unbounded. |
| `capacity/adjacencyBoost` | `2.5` | Placement payoff — how much the board rewards arrangement over count. |
| `capacity/lanceIntercept` | `40` | Per-Lance clear-rate; sets `cMax` with the forward-cell count. |
| `capacity/producerUpgradeRatio` | `2` | `cMax` per permanent power layer. Rides the peg, so it buys reach, not run length. |
| `upgrades/reinvestCostRatio` / `reinvestOutputExponent` | `3` / `0.369` | The within-run ladder. Cost ratio above output exponent is what forces convergence. |
| `upgrades/gBendRatio` | `0.7` | Bends g toward the `g = 1` asymptote — the one permanent that *does* lengthen runs. |
| `upgrades/gBendBaseCost` / `gBendCostRatio` | `6` / `2` | What the g-bender costs, and how fast that climbs. |
| `upgrades/powerUpgradeCostRatio` | `2` | Reach price growth per power layer. |
| `prestige/mergeQuorum` | `3` | Fragments per reach purchase; sets how many runs a prestige step costs. |
| `prestige/fragmentScalePrimary` / `Secondary` | `1000` / `1200` | Currency minted per run. Sublinear in reach — see Couplings. |

**Structural, deliberately not tunable:** board and zone cardinality
(`boardCells`, `forwardCells`, `forwardRows`, `backCells`), `bossMilestone`, and
`gBendGateStep`. Those are content shape and ladder indices, not balance — the
engine guide § Where balance constants live keeps them in the data layer.

## Couplings

**The peg is the whole archetype.** `W₀` is re-baselined to `cMax / H` at run
start, so raising capacity raises the opening pressure with it and the crossing
holds. `cycle-probe.ts` measures this exactly: across eight power layers, with
`cMax` climbing `800 → 204,800`, run length moves **+0.000m**. Break the peg and
permanent power becomes pacing — the run gets longer every prestige, the
logarithm disappears, and you are playing a different archetype.

**g freezes at run start.** A salvo-posture switch applies to the *next* run.
That freeze is what keeps the crossing closed-form: a g that moved mid-run would
make `W_N` path-dependent and there would be nothing to project against.

**Run length is logarithmic in H, so H is a weak lever.** The measured sweep runs
`H=4 → 7.97m` through `H=32 → 17.72m`: an 8× change in H buys roughly 2.2× the
run. If you want a large change in run length, move g. H is for fine-tuning the
difficulty surface.

**The tail is bounded by design.** `Δ_wall` grows logarithmically in `lineHP`
because the leak is geometric — `250 → 2000` HP (8×) moves the tail
`1.1 → 3.1` waves. You cannot make the endgame drag by adding line HP, which is
deliberate.

**Waves are quantized; the projection is not.** The closed form gives a
fractional crossing (`5.90` waves) and the run ends on an integer wave plus the
tail, so the measured figure sits consistently ~2m above the prediction
(`11.80m` predicted, `13.95m` measured at defaults). That offset is structural,
not drift. Read a *change* in the gap as a signal; the gap itself is expected.

**Currency is sublinear in reach.** Minting goes as the cube root, so `C` rising
×2 per layer mints only ×∛2 ≈ 1.26. Huge late capacity does not buy proportional
prestige — that is what makes the prestige ladder decelerate, and it is the
log-frontier reading of the arc. Making currency linear would collapse the
deceleration.

**A pushed scope needs a run boundary.** `peg/headroom` and `peg/salvoBase` are
read at `startRun` and then frozen for the run — that freeze is what keeps the
crossing closed-form. So a scope pushed mid-run does nothing until the next run
starts; probes and suites that sweep them call `startRun()` after the push. The
capacity and cost knobs have no such rule, being read inside `computed` bodies.

**One reference board, two consumers.** `balance/_board.ts` `placeReference` and
`sim/harness.ts` `placeDefense` are the same placement, so probes and behavioral
suites cannot drift apart. An empty board breaches at wave 0 by design — there
is no clear-rate — so anything driving a run has to place first.

## Running a pass

The projection needs no engine and answers most sizing questions on its own; run
it before reaching for a probe. From the repo root (`src/game/…` after eject):

```
pnpm exec vite-node src/showcase/archetypes/cycler/balance/cycler-projection.ts
pnpm exec vite-node src/showcase/archetypes/cycler/balance/cycle-probe.ts
pnpm exec vite-node src/showcase/archetypes/cycler/balance/burn-tier-probe.ts
pnpm exec vite-node src/showcase/archetypes/cycler/balance/upgrade-probe.ts
pnpm exec vite-node src/showcase/archetypes/cycler/balance/prestige-probe.ts
```

- **`cycler-projection.ts`** is the spine in runnable form — pure math, no
  engine. It sizes `H` to a target run length, sizes `Δ_wall` to an intended
  tail, and prints the headroom and line-HP sweeps as pick-a-value tables. It
  predicts; it does not discover.
- **`cycle-probe.ts`** is the one to run first after any spine change: authored
  crossing versus measured breach, the H sweep on the real engine, and the peg
  check across power layers.
- **`burn-tier-probe.ts`** walks the salvo-posture ladder — deeper postures give
  strictly shorter runs, and raising power *within* a posture does not move run
  length.
- **`upgrade-probe.ts`** drives the permanent catalog: reach re-pegs to +0, each
  g-bender level lengthens the run, and the gate holds until power reaches it.
- **`prestige-probe.ts`** closes the loop through real Redeploys — sublinear
  banking, reach as a catalog buy, run length flat across the boundary.

All five print; none asserts. The behavioral suites are the separate surface and
sit beside the modules they spec — `modules/{adjacency,build,burn-tier,cycle,
prestige,upgrades,wall}.test.ts`, each over `sim/harness.ts`. They say *what the
mechanics do*, carrying no magnitudes, which is why they survive a retune.

## Known thin

- **`data/threat.ts` is superseded and unwired.** No module imports it: its
  per-time burn was reindexed to the per-wave salvo in `data/defense.ts`, which
  is what the kernel reads. The file is kept for the spine derivation it
  documents, and its header now says so — but the values in it are inert, and
  the right long-term answer is probably to move that prose somewhere a reader
  will not mistake for live config.
- **Absolute calibration is open in `data/threat.ts`.** Its own comment marks the
  reference numbers un-calibrated and defers absolute calibration to a probe
  measurement. The *shape* results in this file are solid — the peg, the
  logarithm, the bounded tail all measure as predicted — but the specific
  `H`, `g`, `T_g` and `τ_setup` values have not been settled against play.
- **The salvo-posture ladder ships its mechanic, not its numbers.**
  `data/defense.ts` § Skeleton says as much: per-posture `g` values and the
  draft/yield layer above them are unfinished. `burn-tier-probe.ts` confirms the
  postures order correctly relative to each other, which is not the same as
  their being well-chosen.
