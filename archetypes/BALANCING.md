# Balancing

Balance is rate-function design per subsystem. This doc names the goals, the diagnostic vocabulary, the methodology kit, and the engine surfaces a starter consumer reaches for during balance work, and points at upstream sources for theory and prescription.

The reader is a designer or developer working on an archetype's balance pass — tuning a `balance/` directory, choosing methodologies, wiring solvers and probes against the engine, locking chosen numbers against drift.

This is a living document. Per-archetype balance passes generate amendments; open the file and PR.

## Cite-out posture

This doc owns starter-side discipline. Theory, prescription, and pattern cataloguing live upstream:

- **Theory** — what shape the rate function takes, when it closes, what named adjacent math takes over when it doesn't — lives in `open-loop-research/methodology/techniques/closed-form-progression/`. Predictive validation across 12 corpus games at R² > 0.999 (cost formulas) and 100% design-intent match (flow channels) lives at `closed-form-progression/case-studies/corpus-model-validation.md`.
- **Prescriptions** — doubling-time targets, beat-cadence calls, modifier-stack composition, prestige cycle math, soft-cap shapes, multi-resource extension — live in `incremental-math/src/pages/design-playbook/`.
- **Patterns and cross-pattern properties** — feedback loops, interlocking loops, friction-and-relief, decision affordance density, the rest of the catalog and their corpus prevalence — live in your archetype's `archetypes/<name>.md` (which calls the patterns it composes by name) and `open-loop-research/LIBRARY.md` as the research entrypoint.
- **Engine balance toolkit** — full list of harness primitives — lives in `open-loop-engine/docs/api/INDEX.md § harness`.

What's left for this doc: starter-side discipline running the full chain.

## The five-layer flow

Balance work in this stack runs top-down through five layers, each owned by a different theme of this doc:

```
identity (shape.ts)            theme 1 — what you're aiming at
   ↓ constrains
scaffolding (data, beats, bot) theme 2 — what you're tuning
   ↓ what tools perturb
methodology choice             theme 3 — which style fits the shape
   ↓ runs against
engine surfaces                theme 4 — what's in the harness
   ↓ produces numbers pinned by
regression locks               theme 5 — how drift gets caught
```

The diagram is the table of contents. The themes walk it top-down. Between themes 3 and 4 sits the unifying primitive — *engine as oracle* — that ties methodology choice to engine surfaces; it has its own section because it informs both.

## Theme 1 — What are the goals?

The goal layer is *what you're aiming at*. Not "what numbers should this constant be" — that's tuning, and tuning is downstream. Goals are the shape of play the archetype is built around.

### Beats, signature metric, flow bands

A beat is a phase anchor — an ordered point in the player's experience where a *shape change* lands. Producer's "first compounding multiplier felt"; Looper's "first idle loop runs to completion without intervention"; Scaler's "first prestige currency unlocks a meaningful upgrade." Beats are not stopwatch targets; they are *predicates that mark a transition*, and `runArcProbe` records when each predicate fired during a sim run.

The signature metric is what the archetype *climaxes on* — Producer's late-game rate-chain compounding, Scaler's prestige multiplier, Looper's queue depth running unattended. It identifies what "winning the arc" looks like in one number.

Flow bands are the time-by-rate-state windows the player should occupy. `flow` and `flow-upper` are the engaged windows; `idle-low` and `over-ceiling` are the disengaged ones. The objective isn't "land beat 3 at minute 17" — it's "spend as much of the arc as possible in the engaged bands while beats fire in order, arc completes within budget."

The full 6-band channel taxonomy (arousal / flow / flow-upper / boredom / frustration / breakdown), the channel-boundary equations (`m_min(channel, n) = (T_min / T₁)^(1/(n-1))`), and the optimal-multiplier derivation (`m = (T_target / T_base)^(1/(n-1))`) are in `closed-form-progression/case-studies/flow-channel-thresholds.md`. Per-archetype `FLOW_BAND_SCORE` weights in `shape.ts` use the 6-band keys directly; theme 1's 4-band shorthand here collapses three disengaged bands for the engaged-vs-disengaged binary read.

> **Objective is shape of play, not beat-second targets.** Beats are anchors for phase ordering and rough cadence. The real objective is flow-band occupation across the arc.

### Identity vs scaffolding

Code carries the goals when the goals are split out from the tuning surface:

- **Identity** lives in `shape.ts` — phases, budget, signature metric, min cardinality, flow-band weights. Fixed under retuning. Identity is what changing the constants *can't* change about the archetype.
- **Scaffolding** lives in `data/`, `beats.ts`, `bot.ts` — the mutable surface tools perturb. Concrete cost numbers, predicate shapes, multiplier values, achievement thresholds, bot policy. The "first authoring pass" of the archetype, subject to co-reshape when a phase can't be expressed under it.
- **Tools propose.** Solver scripts iterate against the engine and print proposals; humans pick.
- **Locks pin chosen numbers,** last.

This split is what makes balance choices *legible later*. A future reader who wants to know "what is this archetype actually trying to do" reads `shape.ts`. They don't need to reverse-engineer it from the constants.

### Patterns and cross-pattern properties

Before subsystem-bucketing, name the patterns. Your archetype's `archetypes/<name>.md` calls the patterns it composes by name (Resource Accumulation, Modifier Chains, Prestige Cycle, Idle Income, Buildings, Achievement Systems, etc.) and points at the cross-pattern properties it carries (feedback loops, friction-and-relief, interlocking loops, decision affordance density). Patterns are the framing layer above subsystems — they tell you *what kind of game-shape* the archetype is.

For prevalence, the catalog, and the cross-pattern property definitions, `open-loop-research/LIBRARY.md` is the research entrypoint.

## Theme 2 — How do I read this game's balance shape?

Patterns name what the archetype *is*. Subsystem buckets name what *closes* and what *bifurcates* — which is the read that determines methodology choice.

### The nine-bucket walk

An archetype is a composition of subsystems with their own rate functions. Walk each subsystem against the locked vocabulary:

- **Pure closed-form** — the rate function is in the standard algebra (constants, linear, geometric, polynomial, log/logistic). Standard integrals exist, formula is readable, inversion closes. Source: `closed-form-progression/rate-function-algebra.md`.
- **Piecewise closed-form** — regime-spliced. Solve per regime, splice at threshold breakpoints. Same algebra, additional bookkeeping.
- **Coupled-state deterministic** — multiple resources, deterministic dynamics, mutual feedback. Linear systems close via matrix exponential; general nonlinear coupling does not. Source: `closed-form-progression/bifurcations.md` § 1.
- **Strategy-space integration** — adversarial. Multiple agents choose strategies; payoff depends on the joint choice. Per-fixed-strategy ROI closes; equilibrium needs game-theoretic math. Source: `bifurcations.md` § 2.
- **Stochastic load-bearing** — variance carries design intent, not just mean. Distribution shape (phase-type, geometric, hypergeometric) is the spec. Source: `bifurcations.md` § 3.
- **Discrete-event coupled** — combinatorial state space, transitions are discrete events, multiple subsystems interact through event ordering. Auto-battler combat is the corpus's only canonical instance. Source: `bifurcations.md` § 4.
- **Network-topological** — resources flow through a directed graph; throughput is bounded by topology, not just rates. Min-cut / max-flow for linear capacities; NLP for nonlinear. Source: `bifurcations.md` § 5.
- **Optimal stopping** — when-to-reset surfaces (prestige timing). Per-fixed-strategy ROI closes; the optimal threshold is Bellman. Source: `bifurcations.md` § 6.
- **Combinatorial selection** — strategy-space lattice search across configurations (skill tree, equipment loadout, deck composition). Sibling shape to discrete-event-coupled per `subsystem-inventory.md` § 5.5.

For prevalence across the corpus and per-archetype distribution, see `closed-form-progression/subsystem-inventory.md` (208 rows across 15 archetypes; 79.8% decomposable into Pure or Piecewise).

### The orthogonal axis: runtime annotation

A subsystem's bucket classifies its *spec-layer math*. Whether the *runtime* integrates the spec via continuous time or discrete-event simulation is a separate annotation:

- **Sim-as-fallback.** Spec doesn't close. Sim is what you reach for because the integration isn't doable in closed form. Tug's matchup-matrix integration; Industry Idle's graph dynamics under finite buffers; bifurcation-row territory.
- **Sim-as-gameplay.** Spec *closes* — every constituent rate function is in the standard algebra — but the gameplay loop *is* the integration over discrete events. Defender, Director, Auto-battler, Survivor's combat sit here. The temptation "we have a sim, we don't need the math" is exactly inverted: *because* the sim is the gameplay, the spec it runs has to be specified precisely or gameplay drifts and tuning becomes opaque.

The annotation is `runtime: sim`, applied to spec-layer rows whose runtime is discrete-event. It does not change the bucket classification. Source: `closed-form-progression/thesis.md` § 5.

### Diagnostic vocabulary

When a beat doesn't land where the goals say it should, *which layer is wrong* is the right first question:

- **Retune.** Adjust a constant. The phase is expressible under current scaffolding, just at a different numeric setting. Producer's `cursor.baseCost 15 → 46` is retune. Cheapest fix.
- **Reshape content.** Change cardinality or targets. The phase's scaffolding can't express it at *any* constant setting. If the max modifier stack is 10⁴× and the beat asks for 10⁶×, no bisection on one knob closes that gap — the content surface has to expand (more global upgrades, stronger milestone ladder, bigger achievement set).
- **Reshape predicate.** Change what counts as the phase firing. The current predicate measures the wrong thing. Producer's beat-5 "≥5 achievements earned" fires too early when every achievement grants the same multiplier; the *perceptible* phase moment is "first compounding-felt multiplier," which wants a different predicate.
- **Move the phase.** Shift its window. Scaffolding and predicate are right, but the phase lands at the wrong minute under any reasonable content. Legitimate when the original window was an authoring guess against an unexplored space.

Often the answer is a coordinated move across two or three layers. Solvers surface the choice; the human makes the call.

### Prestige Tree as canonical stress test

`closed-form-progression/case-studies/prestige-tree-as-system.md` works through Prestige Tree as the methodology's most adversarial corpus instance — 31-layer stacked-prestige with deeply mutual cross-layer coupling, ~39 named softcaps, mid-tetration endgame, explicit meta-mode toggle. Every leaf is literally a closed form the author wrote down and ships in tooltip strings. The integrated trajectory under optimal play bifurcates onto two named rows from the bifurcation table — coupled-state deterministic per fixed strategy, optimal stopping across strategies.

Prestige Tree is not a refutation of the methodology. It is the cleanest existence proof of "the unit is subsystem, not archetype." Walk it subsystem-by-subsystem; every subsystem either closes in the standard algebra or maps to a named bifurcation. The same archetype hosts both kinds.

When you walk *your* archetype's subsystems and find some closing and some bifurcating, you are not failing the methodology — you are reading the design correctly.

### Bucket → methodology lookup

The 9 buckets cross-reference to the 6 methodologies in theme 3. Each row identifies the primary methodology for a subsystem in that bucket, the upstream algebra/bifurcation reference, and the in-tree exemplar (if any).

| Bucket                      | Primary methodology                          | Algebra / bifurcation              | In-tree exemplar                                  |
| --------------------------- | -------------------------------------------- | ---------------------------------- | ------------------------------------------------- |
| Pure closed-form            | #1 spec/calibrate/lock or #2 math-first      | `rate-function-algebra.md § 2`     | producer (#1 + #2 triangular), ambient (#1)       |
| Piecewise closed-form       | #2 (piecewise variant)                       | `algebra § 2.9 + § 3.4`            | scaler ECC (target post-OL-841)                   |
| Coupled-state deterministic | #1 multi-knob (linear) or numerical          | `bifurcations.md § 1`              | tug lane dynamics                                 |
| Strategy-space integration  | #5 best-response / fixed-strategy ROI        | `bifurcations.md § 2`              | tug matchup matrix                                |
| Stochastic load-bearing     | #4 distribution sampling                     | `bifurcations.md § 3`              | (no in-tree yet)                                  |
| Discrete-event coupled      | #6 pure sim discovery                        | `bifurcations.md § 4`              | (no in-tree; rare)                                |
| Network-topological         | structural (LP, min-cut)                     | `bifurcations.md § 5`              | (no in-tree yet)                                  |
| Optimal stopping            | #5 + Bellman / threshold policy              | `bifurcations.md § 6`              | scaler prestige (target post-OL-841)              |
| Combinatorial selection     | #5 + bounds                                  | `bifurcations.md § 4.4` sibling    | scaler Time Studies (target post-OL-841)          |

A subsystem may map to multiple buckets in the inventory's dual classifications — e.g., `subsystem-inventory.md § 5.3`'s scaler row 12 is `Coupled-state deterministic` per fixed strategy and `Optimal stopping` across strategies. When the buckets disagree on methodology, name both per-subsystem in `shape.ts` so the solver/predictor knows which walker to use.

For corpus-scope validation that no archetype reaches for unnamed adjacent math, see `closed-form-progression/case-studies/bifurcations-corpus-census.md`.

## Theme 3 — What methodologies are available?

Given the bucket walk, methodology choice follows. The kit grows with feedback loops as more archetypes ship balance passes; the six below are what the ecosystem currently supports.

### 1. Spec / calibrate / lock

Three sequential layers:

```
spec        rate function in closed form           "what shape"
   ↓
calibrate   engine-as-oracle finds coefficients    "what numbers"
   ↓
lock        regression tests pin coefficients      "no drift"
```

Source: `closed-form-progression/thesis.md` § 2.

Tightest fit when the subsystem is Pure or Piecewise closed-form. Spec is written down in math first (identifies which constants are independent, where the curve bends, what it converges to); the solver bisects on a single 1-D scalar per beat against `runArcProbe`; locks pin the chosen scalar with `toBeBetween` bounds.

The "no closed-form inversion in the solver" rule is correct *for the calibrate layer* — engine is truth at runtime, solver doesn't reimplement game mechanics. It does not bind the spec layer. Closed-form math is what you write *before* the oracle to know the *shape* of progression. The oracle then finds numbers within that shape.

Producer's `src/archetypes/producer/balance/` is the in-tree reference. Ambient's `src/archetypes/ambient/balance/` is a second reference for the 100% Pure-decomposable case (`subsystem-inventory.md § 3.2`: 7/7 rows Pure).

### 2. Math-first, sim-verify

Compute via the composition algebra; verify by sim. The math is engine-as-oracle queries (`getCost`, `getTotalRate`, modifier-chain readouts) walked through one of the composition rows from `rate-function-algebra.md` § 3 + § 6.7. The sim run confirms the predictor's trajectory matches the engine's tick-driven trajectory under the same bot policy.

This is *not* "predict a scalar then verify it." The predictor walks a schedule, returns waypoints, and the verify-driver diffs predicted vs simulated trajectory per-waypoint with tolerance. The diff is the regression catch for engine-side `getCost`/`getTotalRate` drift — when predictor and sim disagree, the algebra didn't change but an engine primitive's answer did.

**Sub-shapes per composition row** (`rate-function-algebra.md § 6.7` recap):

- **Triangular multi-resource walk** — strict-tier-order schedule; per-step Δt = `getCost(1) / getTotalRate` at frozen state; cumulative is Σ-of-first-passages. In-tree reference: `producer/balance/{spec.ts, predict.ts}`. Sources: `closed-form-progression/case-studies/core-timing-formula.md § 4`, `rate-function-algebra.md § 6.3`, `incremental-math/src/pages/rate-functions/composition.mdx § Triangular multi-resource`.
- **Piecewise splice** — regime-detected schedule; one walker per regime, breakpoints at threshold-crossing values. In-tree target: scaler ECC (post-OL-841). Sources: `closed-form-progression/case-studies/piecewise-breakpoints.md`, `rate-function-algebra.md § 2.9 + § 3.4`, `incremental-math/src/pages/rate-functions/composition.mdx § Piecewise splice`.
- **Modifier-product rescale** — uniform-multiplier upgrade stacks. Cumulative is base × ∏μᵢ; first-passage rescales by the modifier product. Sources: `rate-function-algebra.md § 2.10`, `incremental-math/src/pages/rate-functions/composition.mdx § Modifier-product`.
- **Series composition** — A→B handoffs; combined first-passage is `T_A + T_B`. Sources: `rate-function-algebra.md § 6.6`.
- **Sum / dominant-term per regime** — multi-shape rates where one term dominates per regime; spec is the dominant-term decomposition. Sources: `rate-function-algebra.md § 3.1 + § 7.3`.

**Bridge to #1.** The closed-form predictor *is* methodology #1's bisection inner loop when the spec admits one. Producer's current `solve.ts` runs the bot via `runUntil` per bisection sample — slow but correct. Bisecting against the predictor is order-of-magnitude faster; the sim runs only at the verify step. See § Engine as oracle for the unifying primitive that ties the two methodologies together.

### 3. Sensitivity sweep

One parameter swept across a range; report the response curve plus a depth-target proposal. Tug's `tune.ts` is the in-tree example.

Fits subsystems where the *signature is the response*, not a single number. Tug's matrix-sharpness response curve over `counter-matrix/strongCounter` is the canonical case — there is no single "right" sharpness; there is a curve, and a chosen point on it that matches the design intent.

Engine support: `runSensitivity` for fixed-tick sweeps, `runMatrixUntil` for predicate-terminated variants.

### 4. Distribution sampling

When the subsystem is Stochastic load-bearing, the spec is the *distribution shape*, not the mean. Three common spec families:

- **Geometric** — number of trials until first success. Gacha pity timer's natural model.
- **Exponential / gamma** — continuous-time waiting times in Poisson-like systems. Gamma is "wait for the n-th event."
- **Phase-type** — finite-state continuous-time Markov chain hitting times. Flexible enough to cover most game-mechanic randomness with closed-form mean, variance, and Laplace transform.

The design knobs are the parameters of the distribution and (often) the relationship between mean and variance. Coefficient of variation `σ/μ` is the dimensionless feel knob. Source: `bifurcations.md` § 3.

Calibration runs Monte Carlo across the seed space; locks pin distribution moments (mean, variance, p50, p90), not point estimates. Don't conflate this with deterministic single-seed solves: extra seeds for a deterministic bot confirm determinism, not correctness.

### 5. Best-response / fixed-strategy ROI

When the subsystem is Strategy-space integration. Per-fixed-strategy closes; equilibrium needs game-theoretic math (Nash, evolutionarily stable strategies, replicator dynamics, fictitious play, potential games). Source: `bifurcations.md` § 2.

The honest framing: subsystems close, equilibria don't. Game theory is the right adjacent math, not "closed-form fails, sim takes over."

> **Canonical existence proof.** The per-purchase ROI of any income-rate-chain upgrade closes per fixed strategy:
>
> ```
> paybackSeconds   = cost / (currentRate × (multiplier − 1))
> crossoverSeconds = paybackSeconds × multiplier
> ```
>
> First derived during Tug's balance pass against an `incomeRateChain` of sequential multipliers; the formula is reactive against any live chain and lives engine-side as `IncomeUpgradeRoiKey[side]: Map<defId, RoiMetrics>`. The same shape fits any archetype with sequential rate-multiplier upgrades — filed as engine candidate-primitive `purchasablePaybackSeconds`. The strategy-space *integration* over what the player buys against an adapting opponent is what doesn't close. Both layers are math; the second one is `bifurcations.md` § 2.

For tester-seat search-based agents driving objective variation against parameterized personalities, see `open-loop-research/practical/composition-cookbook/procedural-personas.md` and `parameterized-personality.md`.

### 6. Pure sim discovery

When no closed-form spec exists at all and no named bifurcation row applies cleanly. Document the tool you chose and why, in `shape.ts`. Locks still come last — even pure sim discovery wants regression bounds against a chosen distribution statistic.

This is the bucket of last resort. Reaching for it is a signal to check the bucket walk again: are you sure no row from the bifurcation table names the math here?

---

This list grows. As archetypes ship balance passes that surface methodology shapes the kit doesn't yet name, this section gets amendments.

## Engine as oracle — the unifying primitive

Methodology #1 and #2 are two query modes against the same engine. Same instance, same chain math, two ways to read it:

- **Frozen-state queries** (methodology #2's foundation). Build the engine, mutate persistent refs into a hypothetical state, *don't tick*. Read `getCost(1)`, `getTotalRate`, modifier-chain readouts. The engine answers "what would cost/rate be at this state" without running gameplay. Producer's `spec.ts` `arcWaypoints` walks a schedule using exactly these queries.
- **Deterministic-bot-driven runs** (methodology #1's foundation). Install a deterministic bot module; `runUntil` a beat predicate fires. The engine plays the game; the solver times the beats. Producer's `bot.ts` + `solve.ts` `sampleBeat` is the pattern.

The unifying rule: **the solver never reimplements game mechanics**. The engine *is* the math. If a behavior can't be read off an engine run (frozen or ticking), it's not in the solver.

### System-layer primitives (engine-as-oracle's foundation)

These primitives expose the engine's compiled chain math without ticks. They live in the engine's *system* layer rather than `harness/`, but they are what makes methodology #2 possible:

- `Producer.getTotalRate(resource)` — aggregate per-resource rate at frozen state.
- `Purchasable.amount`, `Purchasable.active` — current purchase state.
- `Purchasable.calculateMaxAffordable()`, `Producer.calculateMaxAffordable()` — cost-inversion at frozen state.
- `Formula.calculateCost`, `Formula.calculateMaxAffordable` — core formula layer.
- `ModifierChain` bindings + per-link contributions for attribution.

Full surface at `open-loop-engine/docs/api/INDEX.md` (system-layer entries — not `§ harness`, which is the calibration toolkit on top of these).

### Portability and the candidate-primitives loop

Engine-as-oracle posture makes balance work portable across engine refactors. The math is the spec; the engine is the truth; the solver glues them. When a primitive is missing — when consumers hand-roll a query the engine should own — file it as a candidate in `open-loop-engine/docs/candidate-primitives.md`. Co-locate a `TODO(expansion)` marker at the hand-roll site as the in-code receipt. The candidate file is the convergence channel; duplicate consumers (N=2) graduate the candidate to a research ticket.

Current candidate-primitives relevant to balance work include `purchasablePaybackSeconds` (N=1, Tug; N=2 expected when Looper balance lands) and `costScaling: { threshold, scale }` (N=0, AD-shaped piecewise cost; first hand-roll site triggers).

## Theme 4 — What engine surfaces help?

The engine's `harness/` is the toolkit running the methodology choice. Curated entries below; full surface lives at `open-loop-engine/docs/api/INDEX.md § harness`.

| Surface                    | Use for                                                                                       |
| -------------------------- | --------------------------------------------------------------------------------------------- |
| `runArcProbe`              | Time-budgeted arc with beat-fire-time recording. Standard input to a Tier-A solver.           |
| `runFlowProbe`             | Flow-band occupation accounting across an arc. The "shape of play" probe.                     |
| `runProbe`                 | Single-run tick-level introspection. The base layer below `runArcProbe` / `runFlowProbe`.     |
| `bisectTuner`              | 1-D bisection per beat. Calibrate layer for spec/calibrate/lock.                              |
| `runSensitivity`           | Fixed-tick sensitivity sweep across one parameter. Tier-B response curves.                    |
| `runMatrix`                | Cartesian sims over a parameter grid. Persona dominance probes, multi-axis sweeps.            |
| `runMatrixUntil`           | Predicate-terminated matrix variant. Match-end termination, drift detection.                  |
| `coarseFineProbe`          | Coarse search over a parameter range, then fine search around the best coarse hit.            |
| `eventDrivenProbe`         | Sample-on-event sampling rather than fixed-tick. Discrete-event-driven runs.                  |
| `advanceToNextEvent`       | Event-level introspection — advance until next discrete event. Pairs with `eventDrivenProbe`. |
| `stasisAwareTickProbe`     | Tick probe with stasis detection (engine-quiescence-aware termination).                       |
| `applyPerturbation`        | Apply a perturbation to engine state. Foundation for sensitivity / Tier-B sweeps.             |
| `diffAggregates`           | Compare aggregates across sims. Drift-vs-baseline core operator.                              |
| `aggregateCell`            | Aggregate one cell of a matrix run. Building block for cross-sim comparison.                  |
| `aggregateUntilCell`       | `aggregateCell` variant terminated by predicate.                                              |
| `buildSensitivityCell`     | Build a cell for a sensitivity matrix. Pairs with `runSensitivity` + `aggregateCell`.         |
| `buildPickerSnapshot`      | Snapshot the engine's picker state at frozen state. Methodology #2 input.                     |
| `buildTransitionSnapshot`  | Snapshot transitions/changes between two engine states.                                       |
| `createIncrementalSnapshot`| Incremental snapshot builder for time-series introspection.                                   |
| `walkContent`              | Walk content registries (categories, chains, leaves) at frozen state. Methodology #2 input.   |
| `walkCategories`           | Walk purchasable categories specifically.                                                     |
| `walkChainRegistry`        | Walk modifier-chain registry; supports per-link attribution readouts.                         |
| `buildEngineFromSave`      | Build an engine seeded from a save blob. Pairs with `pushScope` for one-engine many-iters.    |
| `defaultAnalyzerPack`      | Standard analyzer pack (loop, peak, etc.); plug into a probe for default introspection.       |

### Load-bearing ceremony

`pushScope` + `importSave` + `scopeDepth === 0` assertion are the invariants that make "one engine instance, many bisection iterations" sound. The solver `pushScope`s the engine before each iteration, restores via `importSave` from a captured baseline, runs the iteration, and asserts the scope depth returns to zero before the next iteration.

Don't bypass. The default `src/archetypes/_template/balance/solve.ts` ships this ceremony pre-wired with `TODO(fill-in)` markers at every archetype-specific site; downstream solvers replace the placeholder bisection logic, not the scope discipline. The template is excluded from `tsconfig.app.json` because its placeholders don't resolve — copy the directory to your archetype's folder and fill in.

### `tickDelta` choice

Balance is measured in minutes. A 2-hour arc at engine-default `tickDelta: 0.05s` runs 144,000 ticks per probe. At `tickDelta: 1s` it runs 7,200 ticks — one-to-two orders of magnitude faster, and minute-scale beat timing is unchanged. Default to `1s` for arc probes during discovery; drop to lower deltas only when sub-second timing is part of the spec (e.g., explicit click cadence, real-time combat resolution).

## Theme 5 — How do I know it's working?

Two distinct surfaces, not interchangeable.

### Scripts discover

Per-archetype `balance/` directory holds vite-node scripts run via `pnpm exec vite-node`. Solver iteration, projector runs, perturbation sweeps, sensitivity scans — anything that *searches* belongs here.

These scripts:

- Iterate fast. A solver run prints proposals in seconds-to-minutes, not test-suite time.
- Print proposals; never mutate data files. The human picks.
- Live alongside `shape.ts`, `beats.ts`, `bot.ts` in the same folder so the closure between identity, scaffolding, and discovery is local.

### Tests lock

Vitest pins *chosen* numbers with `toBeBetween` bounds using `runMatrixUntil` (or `runMatrix` for fixed-arc variants). Locks are tripwires for silent drift, not search. They run in CI; they fail loud when a seemingly-unrelated change quietly shifts beat-3 by four minutes.

Locks come *after* discovery converges. Pinning bounds while the solver is still searching is how balance passes silently fail — if tests pass because the windows got loosened to match what the sim does, the tests aren't actually locking anything.

### Sim and tests are separate sentences

Discovery semantics (search, iterate, propose) and regression semantics (assert, fail-fast, drift detection) belong on different runtimes. Vite-node scripts are for the first. Vitest is for the second. Don't conflate them — regression-locking discovery work pushes the search loop into a test runtime that wasn't built for it, and the failure modes get worse.

Placeholder `it.todo` suites that pretend to be locks but contain no assertions are not pending work; they are abandoned-pattern cruft. Delete on sight.

### What gets locked

Per archetype, the locks pin:

- Beat fire-times within `toBeBetween` bounds.
- Flow-band occupation percentages across the arc.
- Signature-metric trajectory at chosen checkpoints.
- Distribution statistics (mean, variance, p50, p90) for stochastic subsystems.

Tighter bounds catch more drift but pop on irrelevant noise. Looser bounds tolerate noise but miss real drift. Find the band that catches what matters and don't tighten "for good measure."

### Canonical numbers are not tunable

Cited-from-vanilla numbers — values carried 1:1 from a reference exemplar with per-row citations in the data files — are not solver perturbation surface. Solvers operate on the *declared-invention* surface where the slim-port substrate diverges from canonical. Perturbing canonical values is fudging, not balancing — the slim-port's job is to faithfully reproduce the exemplar's economy, and balance passes work *around* that economy, not against it.

### Findings sidecars

A balance pass generates observations this doc doesn't anticipate. Some are archetype-specific lore (numerical surprises, content-shape interactions, exemplar-substrate quirks). Some are generalizable signals (an instrument-earning moment that other archetypes will reproduce; a methodology stress that wants doc-level capture). Loop closure runs through a per-archetype sidecar.

**File:** `archetypes/<archetype>.balance.md`. Created when the archetype's first balance leaf opens; lives alongside `archetypes/<archetype>.md` (the design doc).

**What goes in:** instrument-earning moments (when an existing tool didn't answer a target question and a new one was added — what question, what shape), methodology stress (where this doc's framing felt inadequate against a real subsystem), engine-surface gaps (cross-link to `candidate-primitives.md`), drift signals (sim/predictor/walker disagreements and how they resolved), numerical surprises.

**What does not go in:** chosen knob values (data files), beat windows (`beats.ts`), tickets (Vikunja), per-pass status — sidecars are for *what was learned*, not *what was decided*.

**Promotion to BALANCING.md:** when an entry generalizes across archetypes, file a PR moving the abstracted rule into this doc. The sidecar entry stays as the worked example; this doc gets the cross-archetype framing. Don't over-promote — single-archetype findings stay sidecar-local.

The sidecar exists because the alternative — burying findings in commit messages and Vikunja comments — loses them. A future balance pass on a sibling archetype starts from "read your archetype's sidecar, then read the others' sidecars to see what came up."

## Cite-out cut line

| Question                                       | Goes to                                                              |
| ---------------------------------------------- | -------------------------------------------------------------------- |
| What's the math under this shape?              | `open-loop-research/methodology/techniques/closed-form-progression/` |
| Which rate-function shape is my subsystem on?  | `incremental-math/src/pages/rate-functions/`                         |
| Which composition row does my archetype walk?  | `rate-function-algebra.md § 6.7` recap + `rate-functions/composition.mdx` |
| What number should I pick?                     | `incremental-math/src/pages/design-playbook/`                        |
| What patterns does my archetype use?           | your archetype's `archetypes/<name>.md`                              |
| Where do those patterns come from?             | `open-loop-research/LIBRARY.md`                                      |
| What engine primitive does X?                  | `open-loop-engine/docs/api/INDEX.md § harness`                       |
| How do I run discipline starter-side?          | this doc                                                             |

## Living-doc note

This doc grows as archetypes ship balance passes. New methodology shapes that don't fit the current six get added to theme 3. New diagnostic vocabulary that surfaces during reshape calls gets added to theme 2. The engine surface table in theme 4 stays curated — when a primitive lands that earns a row, it earns one; otherwise the full INDEX is one click away.

PR welcome. The cost of an outdated balance doc is tuning calls that read off stale framing.

## See also

- `archetypes/BALANCING-TUG.md` — pre-research, single-archetype historical artifact for the Tug worked example. In-source citations referencing `§ Tier C` and `§ Retune vs reshape` resolve there, not in this doc.
- `archetypes/<name>.md` — per-archetype doc; calls patterns and cross-pattern properties by name.
- `archetypes/<name>.balance.md` — per-archetype balance findings sidecar. Loop-closure surface for the balance pass; entries promote into this doc when cross-archetype-generalizable. See § Theme 5 — Findings sidecars.
- `open-loop-research/methodology/techniques/closed-form-progression/` — theory umbrella (thesis, rate-function algebra, bifurcations, math lineage, case studies, subsystem inventory).
- `closed-form-progression/case-studies/` — applied references per subsystem shape:
    - `core-timing-formula.md` — `T(n) = Cost(n) / Production(n)` primitive; foundation for methodology #1 and #2 walkers.
    - `prestige-compression.md` — 9 compression types (linear → tetration); Optimal stopping bucket reference.
    - `piecewise-breakpoints.md` — regime splice patterns; methodology #2 piecewise sub-shape reference.
    - `flow-channel-thresholds.md` — flow-band channel equations + prestige cadence formulas; theme 1's `FLOW_BAND_SCORE` source.
    - `corpus-model-validation.md` — predictive validation across 12 games (R² > 0.999, 100% design-intent match).
    - `bifurcations-corpus-census.md` — 15-archetype scope validation; complement to `bifurcations.md`.
    - `prestige-tree-as-system.md` — per-subsystem stress test on the corpus's most adversarial archetype.
- `closed-form-progression/math-lineage.md` — historical / glossary / books / open research directions for every named function and method in the algebra and bifurcation catalogs.
- `incremental-math/src/pages/rate-functions/` — per-shape consumer-rendered catalog: composition, power-law, exponential, log-frontier, bounded-growth, bifurcations. Declare "my subsystem's rate is shape X" via these pages.
- `incremental-math/src/pages/design-playbook/` — prescriptive design surfaces (pacing, composition, bending, modifier-chains, prestige, multi-resource).
- `open-loop-engine/docs/api/INDEX.md § harness` — full engine balance toolkit.
- `open-loop-engine/docs/candidate-primitives.md` — observed-but-not-yet-graduated primitives raised by consumers.
- `open-loop-research/LIBRARY.md` — pattern catalog, cross-pattern properties, prevalence.
- `open-loop-research/practical/composition-cookbook/` — believability-calibration discipline, parameterized-personality recipes, procedural-personas tester-seat agent.
