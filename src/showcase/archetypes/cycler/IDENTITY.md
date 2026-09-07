# Cycler — archetype identity

> **Phase alternation — a calm phase and a pressure phase sharing one state —
> which no live row names, over `wave` + `scheduled-event` + `run-setup` +
> `held-output` + `positional-effect`.** Build during the calm, survive the
> pressure, repeat with escalating stakes.

One screen: what the archetype *is*, the closed-form spine that balances it,
cycler's committed realization, and the ports a fork grows it through. The spine is
the load-bearing part — read that section slowly; the rest hangs off it.

Identity line source: `../_identity.md` (Cycler row). Grounding: **market,
corpus pending** — the tag address (Tower Defense ∧ Base Building) holds the
exemplar set cleanly, but only one exemplar (Dome Keeper) is sourced, so the rows
above are the parts that one carries; the alternation that composes them has no
row and becomes a candidate only once a refusal is read in source. This is a
pattern-language composition, not a port of any one game. Thronefall (Cycler ×
Defender), Kingdom Two Crowns (Cycler × side-scroll Explorer), They Are Billions
(Cycler × RTS) validate the composition as a *set, with their crosses showing* —
none is a clone target. The King is Watching (2025) is the closest single exemplar
of the build↔raid shape; its gaze mechanic is deliberately **not** adopted (§ What
is committed / not committed). The spine is grounded in the **multiverse-hr** Cycler
pivot (`/work/studio/multiverse-hr` #17), a real WIP game whose data sweep corrected
the naive version of this archetype (see § The rate-function spine).

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
period — Increlution); same spine either way. **Cycler commits to hard phases**
(§ Cycler's realization).

## The rate-function spine

**Bucket: piecewise phase-alternation** (`incremental-math/…/rate-functions/composition.mdx`)
with a **saturating** build curve against an **exogenous geometric** pressure
curve. The load-bearing correction from multiverse-hr's data sweep: real within-run
capacity does **not** compound geometrically — every reinvestment ladder is
convergent (geometric cost over concave output, hard-capped base output, and
`positional-effect` **board-fill saturating** on a finite grid). So capacity is
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

> **Capture test.** If a fork can't write *its* `D_max` (or clear-rate `C`), its
> burn schedule, and its `N* = τ_setup + T_g·log_g(H)` on paper, the mechanic is
> mis-specified, not just untuned. The spine is where you find that out — before
> any engine wiring.

## Cycler's realization — Defense Command

Cycler ships this composition as a **Cold-War missile-defense command** (SAGE/NORAD
radar) fought with **directed-energy weapons** — the SDI "Star Wars" dream. Warhead
salvos descend on a defended **line**; behind it you build an energy grid;
**Lances** (directed-energy towers) burn warheads from the sky; leak-through bleeds
the line; a breach ends the cycle. The design language is a phosphor command
terminal — see `design/defense-command-mock.html`, a static four-phase-state layout
study (the warhead/lance combat is the pixi/SVG layer the mock stubs).

**The spine, concretized.** The abstract ceiling `D_max` is realized as **defense
clear-rate `C`** — aggregate Lance interception, saturating on the same three
forces (finite forward cells, convergent upgrade ladders, `positional-effect`
board-fill). The exogenous burn is the **salvo schedule**: wave `N` arrives at
strength `W_N = W₀·g^N`. A **line-HP buffer** absorbs the leak-through, adding a
bounded tail:

```
clear-rate  → saturates to  C          (Lances: forward-cell fill + convergent ladders + adjacency)
salvo N     → W_N = W₀ · g^N           (exogenous schedule — guarantees termination)
line HP     → buffers max(0, W_N − C) per wave; auto-repairs from MW surplus in the calm
run length:  N*_waves = log_g( C / W₀ ) + Δ_wall
peg W₀ = C/H ⇒ N*_waves = log_g( H ) + Δ_wall     ← H sets the run, Δ_wall the tail
```

Same log law, wave-indexed, plus a bounded `Δ_wall` tail the player controls by
repairing. **The terminating pressure stays exogenous** — the salvo schedule, never
a state-derived cost. The Lance operating-draw (energy weapons cost MW to fire) and
repair are *within-run economic sinks*, not the run-end condition; they shape how
fast `C` and `Δ_wall` grow, not when the run ends. (Coupling the *terminating* burn
to within-run state — threat ∝ your own build — falls to optimal-stopping; the line
crossing must stay driven by the exogenous salvo.)

**The strategic triangle.** One materiel pool — **MW** — funds three competing
sinks, shared-state discipline made concrete:

- **Reactors + Relays** raise output (MW/sec).
- **Lances** raise clear-rate `C` (buy run length) but **draw MW to fire** (cut the economy).
- **Bulwarks** route MW surplus into line repair — extend `Δ_wall` (buy run length),
  competing for cells *and* for the same MW. Repair is auto (STANDBY drip) but its rate
  is throughput-gated by placed Bulwarks, so the third leg is a spatial decision too, not
  a free background heal.

The bridge that makes this one system, not two bolted together: **Relays (boosters)
amplify adjacent Lances *and* Reactors** — one placement decision drives both
economy and defense. All three legs (C · output · repair) compete for the one board.

**One shared surface.** Lances and Reactors occupy the *same* placement grid:
forward cells range the incoming salvos (contested defensive real estate), back
cells sit safe, and every cell spent on a Lance is a cell not producing — the
`C`-vs-output tradeoff is spatial. Warheads damage the **line only**, never the
board, so the board stays a placement puzzle under fire (identity guard). Single
materiel (MW) for the first cut; multi-resource production chains are deferred
costume. (Spatial rollout is staged — a fixed-slot line first, shared cells as the
target — tracked in the rework ticket, not here.)

**Player-facing vocabulary** (internal spine term → fiction): `D_max`/`C` →
clear-rate of the Lance grid · burn `W_N` → warhead salvo · `g` → salvo posture,
drafted via **Prophecy** · prestige re-peg `W₀ = C/H` → **Redeploy** · the line's
integrity → the defended line · boss escalation step → a **Saturation** salvo. Keep
the algebra (`W₀ = C/H`, `log_g(H)`) in this doc and the balance lanes, never in the
HUD.

## The loop — phase states

Hard phases cycle STANDBY ↔ INBOUND, punctuated by SATURATION bosses, ending in
OVERRUN. Windows are **measured and recorded, never authored** (§ Balance model).

1. **STANDBY** (build / calm) — the `τ_setup` grace between salvos: rebuild, place,
   spend; the line auto-repairs from MW surplus; draft the next salvo's `g` (Prophecy).
2. **INBOUND** (defend) — a salvo `W_N`; Lances clear at `C`, leak-through
   `max(0, W_N − C)` bleeds the line; **build locks** — you live with what you placed.
3. **SATURATION** (boss) — a milestone salvo; surviving it steps production and
   threat together (the re-peg cadence).
4. **OVERRUN → REDEPLOY** (breach) — the line exhausts; the run ends **and pays
   out** (banks sublinear currency), then re-pegs `W₀ = C/H` for a deeper cycle.

Arc across a run: early salvos clear with margin (Comfortable) → mid salvos bite as
`W_N` nears `C`, rearrangement starts to matter (First bite) → the line buffer
drains over the last waves, the tension peak (Under review) → breach. Identity guard
(multiverse-hr): escalation must **drive** rearrangement, not compress it into a
survival reflex — the late run stays a placement puzzle.

## Growth ports

A fork grows the archetype *up* through these. Each feeds a named part of the spine.

| Port | Adds | Spine term it feeds |
|---|---|---|
| `addProducer` (Reactor) / `addBooster` (Relay) | a placement + its adjacency synergy (Relay boosts Lances *and* Reactors) | raises output / `C` (reach) — **not** run length under the peg |
| `addTower` (Lance) | a forward interceptor with an MW operating-draw | raises `C`; the draw is a within-run economic sink, not run-end coupling |
| `addWall` / repair | the line's HP buffer + surplus-fed auto-repair | `Δ_wall` — the bounded run-length tail the player controls |
| `addBurnTier` (salvo posture) | an escalation-content step / Prophecy draft option | `g`, `T_g` — the pace surface |
| `addUpgrade` | a permanent (carried across Redeploy) | power → reach; **only a g/H upgrade moves pacing, and gets gated** |
| `addPrestigeLayer` (Redeploy) | the breach / re-peg boundary | re-baselines `W₀ = C/H`; banks sublinear currency |
| automation ladder | auto-placement / auto-muster behind an `AutomationTiers` gate | none yet — cycler ships no player automation, so the gate has nothing to withhold. Adding one means declaring which spine term it moves first (see `.claude/rules/archetype-authoring.md` § Conformance) |

## Engine fit (pattern → primitive)

| Pattern | Engine primitive | Note |
|---|---|---|
| phase alternation (no row) + `scheduled-event` | phase/state controller + an exogenous wave sequencer | **candidate primitive** — hard build↔defend; `createSequencer` drives the salvo schedule as an *authored schedule*, never a state-derived cost (`TODO(expansion)` + `candidate-primitives.md` if no scheduled-drain primitive exists) |
| `player-siting` + `positional-effect` | building-to-building synergy over a finite grid (Lances + Reactors share cells; Relay boosts both) | builds `C`; board-fill **saturation** is what makes the crossing log |
| `wave` + `scaled-opposition` | geometric salvo schedule `W₀·g^N` in `data/` | exogenous; guarantees termination |
| Wall + repair | an HP resource + surplus-fed drip | `Δ_wall`; damaged by leak-through only, never the board |
| Lance operating-draw | per-tick `subtractResource` while firing | economic sink; keep it off the run-end condition |
| Shared state | `persistent()` refs across phases | reset only at Redeploy, never at the phase boundary |
| `prestige` + `meta-progression` (re-peg) | reset + sublinear (cbrt) currency award | re-baselines `W₀`; run-end pays out (Industry-Idle, not Thronefall) |

## What is committed / not committed

**Committed (spine):** saturating capacity/clear-rate vs exogenous escalating burn;
`N*_waves = log_g(H) + Δ_wall`; the peg `W₀ = C/H`; `(H, g)` as the difficulty
surface; power decoupled from run length; run-end pays out; the terminating pressure
stays exogenous.

**Committed (cycler's realization):** hard phases; one shared placement grid (Lances
+ Reactors compete for cells); Relays boost both; single materiel (MW); the line
damaged by leak-through only; continuous surplus-fed auto-repair; Prophecy as the
player-facing `g` draft; boss-milestone escalation; Defense-Command fiction +
phosphor-terminal design language; Redeploy as the re-peg. No gaze.

**Not committed (a different fork's call):** the fiction/costume (Defense Command is
cycler's; a fork reskins freely); soft vs hard boundary; grid vs graph placement;
multi-resource chains; whether the salvo posture exposes an `off` preset (reverts to
a near-Ambient free-form shape). The King is Watching's **gaze** (only watched
buildings work) is a deliberate omission — it replaces hard phases with continuous
attention allocation and is single-source in research; cycler stays Thronefall-clean.
These are costume and scope; none moves the spine.

## Balance model

Math first, one-way flow, one home per number. `BALANCING.md` beside this file
is the working guide — the knobs, what couples to what, and how to read each
probe. Methodology lives at `open-loop-engine/docs/consumer-guide-balance.md`;
the disk layout it maps onto is `.claude/rules/archetype-authoring.md`
§ Balance — where each surface lands. In brief:

- **The spine, as prose + math (`data/*.ts`).** Constants with co-located
  `// ─── Balance ───` sections carrying the pegged-saturation closed form —
  clear-rate `C`, the salvo schedule, the `Δ_wall` line buffer — each naming its
  coupling and its grounding.
- **The projection (`balance/cycler-projection.ts`).** The same closed form in
  runnable shape, pure math with **no engine** — predicts `N*_waves`, sizes `H`
  to a target run length, sizes `Δ_wall` to the intended tail, and shows the peg
  holding run length flat across the arc while `fixed`/`none` policies drift. It
  predicts; it does not discover.
- **The probes (`balance/*-probe.ts`).** Drive the **real engine and shipping
  automation** (build/rearrange/repair/redeploy policy functions; the harness
  only force-unlocks the tier) so sim and game cannot drift. They contradict the
  projection where it is wrong — measuring the realized `C` trajectory, the MW
  economy under Lance draw, and the calibration of `H, g, T_g, τ_setup, Δ_wall`.
- **The behavioral suites (`modules/<name>.test.ts`).** Shape invariants that survive
  retuning: the run ends at the line breach, power re-pegs to +0 base run length,
  repair extends only the `Δ_wall` tail. No magnitudes — the realized run length
  prints from `balance/cycle-probe.ts`, per the engine guide § Why this isn't a
  test suite.
