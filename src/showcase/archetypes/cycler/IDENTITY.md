# Cycler — archetype identity

> **Phase-Alternation + Time Systems + Placement-Adjacency + Wave Escalation over
> shared state.** Build during the calm, survive the pressure, repeat with
> escalating stakes.

One screen: what the archetype *is*, the closed-form spine that balances it, and
the ports a fork grows it through. The spine is the load-bearing part — read that
section slowly; the rest hangs off it.

Identity line source: `archetypes/_identity.md` (Cycler row). This is a
pattern-language composition, not a port of any one game. Thronefall (Cycler ×
Defender), Kingdom Two Crowns (Cycler × side-scroll Explorer), They Are Billions
(Cycler × RTS) validate the composition as a *set, with their crosses showing* —
none is a clone target. The spine below is grounded in the **multiverse-hr** Cycler
pivot (`/work/studio/multiverse-hr` #17), a real WIP game whose data sweep
corrected the naive version of this archetype (see § The rate-function spine).

## What this archetype is

The game alternates a calm **build phase** — place infrastructure on a shared grid,
convert income into capacity — and a **pressure phase** where an escalating threat
tests what you built. The phases share everything: the same wallet, the same board,
the same topology. Build sets the board; pressure reveals whether it holds. Each
run raises the stakes, so **the build must outpace the escalation just long enough
to stay ahead** — and when it can't, the run ends and pays out. The player is
architect during the calm and auditor under pressure; the pull is the compounding
payoff of shared-state investment. The phase boundary can be **hard** (discrete
day/night — Thronefall) or **soft** (a continuous, escalating drain with a grace
period — multiverse-hr / Increlution); same spine either way.

## The rate-function spine

**Bucket: piecewise phase-alternation** (`incremental-math/…/rate-functions/composition.mdx`)
with a **saturating** build curve against an **exogenous geometric** pressure
curve. The load-bearing correction from multiverse-hr's data sweep: real within-run
capacity does **not** compound geometrically — every reinvestment ladder is
convergent (geometric cost over concave output, hard-capped base output, and
Placement-Adjacency **board-fill saturating** on a finite grid). So capacity is
concave and **saturates to a ceiling `D_max`**, and the run ends when a
**time-driven burn** overtakes that ceiling:

```
capacity        → saturates to  D_max     (adjacency board-fill + convergent ladders)
pressure (burn) → W(t) = W₀ · g^(t/T_g)   (exogenous, time-driven — guarantees termination)
run length:  N* = τ_setup + T_g · log_g( D_max / W₀ )      ← LOGARITHMIC in capacity
```

This is Increlution's `t ≈ T·log_g(M)`: run length is **log in permanent power**,
not a geometric crossing. (An earlier version of this archetype balanced on a
geometric `μ = g/d` crossing; the sweep retired it — `μ` described only the early
rising ramp, never the run-end.)

**The peg is the whole trick.** `W₀` is not a fixed constant — it tracks lifetime
power, `W₀ = D_max / H` for a target headroom `H`. Then `D_max/W₀ = H` always, and

```
N* = τ_setup + T_g · log_g( H )      ← constant across the arc, DIRECTLY AUTHORED
```

Three consequences, all better than a hand-matched difficulty:

1. **Run length is one number you pick** — `H`. The peg re-baselines `W₀` only at
   prestige (like a content-tier multiplier), so within a run the burn stays
   exogenous and the algebra stays closed. (Couple the burn to *within-run* state —
   payroll ∝ live headcount — and it falls to optimal-stopping. Don't.)
2. **Power decouples from pacing.** A capacity upgrade raises `D_max`, which
   re-pegs `W₀` — so it adds **zero** run length. It buys *reach* (deeper content,
   more prestige currency) instead. The whole difficulty surface is **(H, g)**.
3. **`g` is the high-leverage lever** — attacking the escalation base bends the
   curve (Increlution Part 3), far stronger than boosting power. Gate a g-bender
   permanent; sell power permanents freely.

> **Capture test.** If a fork can't write *its* `D_max`, its burn schedule, and its
> `N* = τ_setup + T_g·log_g(H)` on paper, the mechanic is mis-specified, not just
> untuned. The spine is where you find that out — before any engine wiring.

## The loop — build → pressure → payout (beat map)

Beats are *labels* for where the run turns; their windows are **measured and
recorded, never authored** (§ Balance model).

1. **Setup** — rebuild the board in the grace window `τ_setup`; the burn hasn't bitten.
2. **Comfortable** — capacity clears the burn with margin; the placement puzzle is pure optimization.
3. **First bite** — the burn crosses ~half the ceiling; rearrangement starts to matter.
4. **Under review** — burn approaches the ceiling; a soft degraded state, the tension peak.
5. **Merge bell** — the burn overtakes `D_max`; the run ends **and pays out** (banks currency).
6. **Reach** — prestige re-pegs at higher `D_max`; deeper content, same authored run length.

Identity guard (multiverse-hr): the burn must **drive** rearrangement, not compress
it out — the late run stays a placement puzzle, not a survival reflex.

## Growth ports

A fork grows the archetype *up* through these. Each feeds a named part of the spine.

| Port | Adds | Spine term it feeds |
|---|---|---|
| `addProducer` / `addBooster` | a build-phase placement + its adjacency synergy | raises `D_max` (reach) — **not** run length under the peg |
| `addBurnTier` | an escalation-content step | `g`, `T_g` — the pace surface |
| `addUpgrade` | a permanent (carried across prestige) | power → reach; **only a g/H upgrade moves pacing, and gets gated** |
| `addPrestigeLayer` | a Merge / re-peg boundary | re-baselines `W₀ = D_max/H`; banks sublinear currency |

## Engine fit (pattern → primitive)

| Pattern | Engine primitive | Note |
|---|---|---|
| Phase-Alternation + Time Systems | phase/state controller + an exogenous time-scheduled burn | **candidate primitive** — the burn is an *authored schedule*, never a state-derived cost; if the engine has no scheduled-drain primitive, hand-roll with a `TODO(expansion)` + `candidate-primitives.md` entry. |
| Placement-Adjacency | building-to-building synergy over a finite grid | builds `D_max`; board-fill **saturation** is what makes the crossing log |
| Wave Escalation | geometric time schedule `W₀·g^(t/T_g)` in `data/` | exogenous; guarantees termination |
| Shared state | `persistent()` refs across phases | reset only at prestige, never at the phase boundary |
| Prestige / re-peg | reset + sublinear (cbrt) currency award | re-baselines `W₀`; run-end pays out (Industry-Idle, not Thronefall) |

## What is committed / not committed

**Committed:** saturating capacity vs exogenous escalating burn; `N* = τ_setup +
T_g·log_g(H)`; the peg `W₀ = D_max/H`; `(H, g)` as the difficulty surface; power
decoupled from run length; run-end pays out.

**Not committed (fork's call):** hard vs soft phase boundary; grid vs graph
placement; real-time vs discrete pressure; whether the burn intensity is a
player-facing preset (cautious/standard/aggressive/off — `off` reverts to a
near-Ambient free-form shape). These are costume and scope; none moves the spine.

## Balance model — three lanes (mirrors `frontier/docs/balance-process.md`)

Math first, one-way flow, one home per number:

```
data/*.ts ─── Balance ───   →   balance/*.ts (vite-node)   →   sim/*.probe.test.ts
closed-form lens                discovery / verification       measured window lock
"what the spine predicts"       "what shipping code does"      "what must stay true"
```

1. **Lens (`data/*.ts`).** Constants with co-located `// ─── Balance ───` sections
   carrying the pegged-saturation closed form, each naming its coupling and the
   multiverse-hr grounding.
2. **Projection (`balance/cycler-projection.ts`).** Pure math, **no engine** —
   predicts `N*`, sizes `H` to a target run length, and shows the peg holding run
   length flat across the arc while `fixed`/`none` policies drift. Predicts; does
   not discover.
3. **Probe (`balance/*-probe.ts`).** Drives the **real engine + shipping
   automation** (build/rearrange/merge policy functions, harness only force-unlocks
   the tier) so sim and game can't drift. Verifies the projection; measures the
   realized `D_max` trajectory and the calibration of `H, g, T_g, τ_setup` (open in
   multiverse-hr #17).
4. **Lock (`sim/*.probe.test.ts`).** Pins the *measured* run-length band and shape
   invariants (run ends at the burn crossing; power re-pegs to +0 run length) with
   tolerance and provenance. Measure-and-record, never set-as-target.
