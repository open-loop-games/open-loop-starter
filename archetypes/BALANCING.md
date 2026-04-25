# Balancing

How to reconcile an archetype's numbers against its beat map. Applies to every archetype; worked example is Producer's `src/archetypes/producer/balance/`.

## The framing

**Archetype identity is fixed. Scaffolding is mutable.**

An archetype is defined by its ordered player-experience phases and the signature metric it climaxes on. Producer: click → own → stack modifiers → climax on rate-chain compounding → close the tier ladder. Those phases, in that order, within roughly that duration, on that climax metric — *that's* the archetype.

Everything else was generated in one LLM pass when the archetype was first laid down: concrete beat minute-windows, predicate shapes, costs, rates, multipliers, achievement thresholds, bot policy. All of it is subject to co-reshape when a phase can't be expressed under the current scaffolding.

**Objective = shape of play, not beat-second targets.** Beats are discrete anchors for phase ordering and rough cadence. The real objective is flow: the player spends as much of the arc as possible in the `flow` and `flow-upper` bands (see `src/balance/flow-probe.ts`), phases fire in order, arc completes within budget.

## Layers

```
identity         shape.ts                   fixed
  ↑              (phases, budget, signature metric, min cardinality)
  │
scaffolding      beats.ts, data/*.ts,       mutable
  │              bot.ts
  │
tools            balance/solve.ts,          searches
  │              scripts under src/balance/
  │
locks            sim/*.test.ts              regressions
                 (toBeBetween bounds)       after choices land
```

Identity constrains scaffolding. Scaffolding is what tools perturb. Tools print proposals; a human picks and edits the scaffolding. Locks come last — they pin what was chosen so nothing drifts unnoticed.

## Engine as oracle

The solver never reimplements game mechanics. It perturbs the archetype's override surface (`ProducerOverrides` → `buildProducerSimEngine(overrides)` for Producer) and drives `runArcProbe` at `tickDelta: 1s`. The engine plays the game; the solver times the beats. No parallel walker, no closed-form inversion — if it can't be read off an engine run, it's not in the solver.

**Why `tickDelta: 1s`.** Balance is measured in minutes. A 2h arc at engine-default `0.05s` is 144,000 ticks per probe and tens of seconds per run. At 1s it's 7,200 ticks per probe — 1–2 orders of magnitude faster and the minute-scale beat timing is unchanged.

**Deterministic single-seed solves.** Bots built against the archetype's data are deterministic under their policy (see Producer's `bot.ts`). Extra seeds confirm determinism, not correctness. The regression-lock layer uses `runMatrixUntil` with multiple seeds for drift detection; the solver doesn't need them.

## Retune vs reshape

When a solver output fails to land a phase in its target region, the first question isn't "tune harder." It's *which layer is wrong*:

- **Retune** (adjust a constant): the phase is expressible under current content, just at a different numeric setting. Producer's `cursor.baseCost 15 → 46` is retune.
- **Reshape content** (change cardinality / targets): the phase's scaffolding can't express it at *any* constant setting. If the max modifier stack is 10⁴× and the beat asks for 10⁶×, no bisection on one knob closes that gap — the content surface has to expand (more global upgrades, stronger milestone ladder, bigger achievement set).
- **Reshape predicate** (change what counts as the phase firing): the current predicate measures the wrong thing. Producer's beat-5 predicate "≥5 achievements earned" fires too early because every achievement currently grants the same multiplier; the *perceptible* phase moment is "first compounding-felt multiplier," which wants a different predicate.
- **Move the phase** (shift its window): scaffolding and predicate are right, but the phase lands at the wrong minute under any reasonable content. Legitimate when the original window was an LLM guess against an unexplored space.

In practice the answer is often a coordinated move across two or three layers. The solver surfaces the choice; the human makes the call.

## Scripts discover, tests lock

Tools iterate fast and print proposals. They never mutate data files.

Regression tests pin *chosen* numbers with `toBeBetween` bounds using `runMatrixUntil`. They are tripwires for silent drift, not search. Conflating the two is how balance passes fail — if tests pass because the windows got loosened to match what the sim does, the tests aren't actually locking anything.

## Archetype tiering

Not every archetype suits the engine-as-oracle + 1-D bisection pattern. A rough map (refined as more archetypes land):

- **Tier A** (pattern fits directly): Producer, Ambient, Looper. Numeric constants driving a deterministic bot against a time-budget arc.
- **Tier B** (needs mode-specific extensions): Phase-Shifter, Cycler, Interlocker, Scaler. Archetype-specific solver over the same oracle plumbing (different perturbation shape per beat).
- **Tier C** (needs genuinely different tools): Explorer, Packer, Auto-Battler, Tug, Director, Survivor, Defender, Scripter. Grid sims, Monte Carlo, best-response solvers, outcome distribution probes, or no sim at all.

Producer's `balance/` folder is the Tier A template. Tier B archetypes should copy its shape with the per-beat perturbations they need; Tier C archetypes document what tool they chose and why.

## Tier decision

Pick the tier during the first balance ticket and record the call in `shape.ts` (it's already the right home — "what's fixed about this archetype"). Default to the most conservative tier the archetype passes — Tier A if it does, Tier B only if A can't close, Tier C only if B's perturbation primitives don't fit.

The rubric is four questions, answered in order:

1. **Is the objective a single fire-time per beat?** If yes → A or B candidate. If the objective is an outcome distribution (pass-rate at wave N, run-length p50, score distribution, win-rate vs opponent) → Tier C.
2. **Does one 1-D scalar per beat close it?** If yes → Tier A. If a beat needs joint tuning across ≥ 2 knobs (ratio targets, graph balance) or across Decimal-tetrational magnitudes → Tier B.
3. **Is the bot deterministic under a fixed policy?** If yes → A or B. If the archetype's moment-to-moment play is stochastic in a way that affects beat timing meaningfully (seeded content layout, RNG-driven enemy spawns, opponent adaptation) → solver objective becomes a distribution statistic (p50, p90, expected) not a point; plan multi-seed from day one.
4. **Is there an adversary in the simulation?** If yes → Tier C with best-response iteration or self-play convergence. Solo-archetype B stays B.

A Tier-A archetype clears all four questions with "yes / 1-D / deterministic / no." Every "no" drops one tier.

Current expected tiering across the 15:

- **Tier A** (direct template clone): Producer ✓, Ambient, Looper.
- **Tier B** (template + mode-specific extensions): Scaler (Decimal-aware tuner), Interlocker (multi-dim solver), Cycler (B-with-MC on wave-survivability), Phase-shifter (per-phase A replays stitched together).
- **Tier C** (genuinely different tools, template provides the three-layer discipline only): Defender, Survivor, Packer, Auto-battler, Tug, Director, Explorer, Scripter.

When an archetype's tier isn't obvious at authoring time, write down the first answer that failed and which primitive would close it — that's the forcing function for the next candidate-primitive graduation.

## Template scaffold

`src/archetypes/_template/balance/` is a scaffold of the four-file Tier-A stack (`shape.ts`, `beats.ts`, `bot.ts`, `solve.ts`) with the load-bearing ceremony pre-wired:

- `persistent()` discipline in `bot.ts` (importSave-safe accumulators).
- `pushScope` + `importSave` + `scopeDepth === 0` assertion in `solve.ts` (the invariants that make "one engine, many bisection iterations" sound).
- Gauss-Seidel pass loop skeleton — chained proposals so beat-N's sampler sees earlier beats' solutions.
- `TODO(fill-in)` markers at every archetype-specific site.

The template is excluded from `tsconfig.app.json` because its placeholders don't resolve. Copy the whole directory to `src/archetypes/<archetype>/balance/`, replace placeholder imports with the archetype's own keys + data, and fill in each `TODO(fill-in)` block. The concrete reference for every pattern the template points at is `src/archetypes/producer/balance/` — read it alongside the template when filling in.

Tier B and Tier C archetypes still benefit from the template's `shape.ts` (identity separation is universal) and the ceremony discipline in `bot.ts` (any bot + solver pairing wants it). Tier C archetypes document in `shape.ts` what tool replaces the solver and why.

## What lives in an archetype's `balance/` folder

- `shape.ts` — identity (fixed). Ordered phases, budget, signature metric, min cardinality, flow-band weights.
- `beats.ts` — current beat predicates + windows (mutable). Maps phases to testable predicates.
- `bot.ts` — deterministic bot policy driving the engine (mutable).
- `solve.ts` — vite-node script bisecting one parameter per beat against the oracle (mutable).

The sibling `sim/` folder holds the regression-lock tests that pin the numbers chosen after solving.

## See also

- `src/balance/` — shared balance primitives (`runArcProbe`, `runFlowProbe`, `bisect`-like helpers) consumed by per-archetype solvers.
- `_template.md` in this folder — archetype authoring template; references this doc in § 6.
