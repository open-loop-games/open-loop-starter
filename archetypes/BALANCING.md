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

## What lives in an archetype's `balance/` folder

- `shape.ts` — identity (fixed). Ordered phases, budget, signature metric, min cardinality, flow-band weights.
- `beats.ts` — current beat predicates + windows (mutable). Maps phases to testable predicates.
- `bot.ts` — deterministic bot policy driving the engine (mutable).
- `solve.ts` — vite-node script bisecting one parameter per beat against the oracle (mutable).

The sibling `sim/` folder holds the regression-lock tests that pin the numbers chosen after solving.

## See also

- `src/balance/` — shared balance primitives (`runArcProbe`, `runFlowProbe`, `bisect`-like helpers) consumed by per-archetype solvers.
- `_template.md` in this folder — archetype authoring template; references this doc in § 6.
