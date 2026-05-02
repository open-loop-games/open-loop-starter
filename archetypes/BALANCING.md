# Balancing

Balance is rate-function design per subsystem. This doc names the goals, the diagnostic vocabulary, the methodology kit, and the engine surfaces a starter consumer reaches for during balance work, and points at upstream sources for theory and prescription.

The reader is a designer or developer working on an archetype's balance pass — tuning a `balance/` directory, choosing methodologies, wiring solvers and probes against the engine, locking chosen numbers against drift.

This is a living document. Per-archetype balance passes generate amendments; open the file and PR.

## Cite-out posture

This doc owns starter-side discipline. Theory, prescription, and pattern cataloguing live upstream:

- **Theory** — what shape the rate function takes, when it closes, what named adjacent math takes over when it doesn't — lives in `open-loop-research/methodology/techniques/closed-form-progression/`.
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

The diagram is the table of contents. The themes walk it top-down.

## Theme 1 — What are the goals?

The goal layer is *what you're aiming at*. Not "what numbers should this constant be" — that's tuning, and tuning is downstream. Goals are the shape of play the archetype is built around.

### Beats, signature metric, flow bands

A beat is a phase anchor — an ordered point in the player's experience where a *shape change* lands. Producer's "first compounding multiplier felt"; Looper's "first idle loop runs to completion without intervention"; Scaler's "first prestige currency unlocks a meaningful upgrade." Beats are not stopwatch targets; they are *predicates that mark a transition*, and `runArcProbe` records when each predicate fired during a sim run.

The signature metric is what the archetype *climaxes on* — Producer's late-game rate-chain compounding, Scaler's prestige multiplier, Looper's queue depth running unattended. It identifies what "winning the arc" looks like in one number.

Flow bands are the time-by-rate-state windows the player should occupy. `flow` and `flow-upper` are the engaged windows; `idle-low` and `over-ceiling` are the disengaged ones. The objective isn't "land beat 3 at minute 17" — it's "spend as much of the arc as possible in the engaged bands while beats fire in order, arc completes within budget."

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

Producer's `src/archetypes/producer/balance/` is the in-tree reference.

### 2. Math-first, sim-verify

Lighter than full bisection. Predict the closed-form target — doubling time, asymptote, regime boundary — using the rate-function algebra. Run a coarse-tick engine probe to confirm the target lands. Cheaper when the math is unambiguous: you don't need bisection to find a number you can read off the formula.

Fits Pure closed-form subsystems where the spec literally tells you the answer. The engine confirms the runtime integrates the spec faithfully; it doesn't search for a number.

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

## Theme 4 — What engine surfaces help?

The engine's `harness/` is the toolkit running the methodology choice. Curated entries below; full surface lives at `open-loop-engine/docs/api/INDEX.md § harness`.

| Surface             | Use for                                                                            |
| ------------------- | ---------------------------------------------------------------------------------- |
| `runArcProbe`       | Time-budgeted arc with beat-fire-time recording. Standard input to a Tier-A solver.|
| `runFlowProbe`      | Flow-band occupation accounting across an arc. The "shape of play" probe.          |
| `bisectTuner`       | 1-D bisection per beat. Calibrate layer for spec/calibrate/lock.                   |
| `runSensitivity`    | Fixed-tick sensitivity sweep across one parameter. Tier-B response curves.         |
| `runMatrix`         | Cartesian sims over a parameter grid. Persona dominance probes, multi-axis sweeps. |
| `runMatrixUntil`    | Predicate-terminated matrix variant. Match-end termination, drift detection.       |
| `coarseFineProbe`   | Coarse search over a parameter range, then fine search around the best coarse hit. |
| `eventDrivenProbe`  | Sample-on-event sampling rather than fixed-tick. Discrete-event-driven runs.       |
| `diffAggregates`    | Compare aggregates across sims. Drift-vs-baseline core operator.                   |

### Load-bearing ceremony

`pushScope` + `importSave` + `scopeDepth === 0` assertion are the invariants that make "one engine instance, many bisection iterations" sound. The solver `pushScope`s the engine before each iteration, restores via `importSave` from a captured baseline, runs the iteration, and asserts the scope depth returns to zero before the next iteration.

Don't bypass. The default `src/archetypes/_template/balance/solve.ts` ships this ceremony pre-wired with `TODO(fill-in)` markers at every archetype-specific site; downstream solvers replace the placeholder bisection logic, not the scope discipline. The template is excluded from `tsconfig.app.json` because its placeholders don't resolve — copy the directory to your archetype's folder and fill in.

### `tickDelta` choice

Balance is measured in minutes. A 2-hour arc at engine-default `tickDelta: 0.05s` runs 144,000 ticks per probe. At `tickDelta: 1s` it runs 7,200 ticks — one-to-two orders of magnitude faster, and minute-scale beat timing is unchanged. Default to `1s` for arc probes during discovery; drop to lower deltas only when sub-second timing is part of the spec (e.g., explicit click cadence, real-time combat resolution).

### Engine-as-oracle posture

The solver never reimplements game mechanics. Engine plays the game; tools time the beats. If a behavior can't be read off an engine run, it's not in the solver.

This is the rule that makes balance work portable across engine refactors — the math is the spec, the engine is the truth, the solver glues them. When a primitive is missing, file it as a candidate in `open-loop-engine/docs/candidate-primitives.md` rather than reproducing the missing behavior in the solver. The candidate file is the convergence signal that promotes a primitive to a research ticket.

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

## Cite-out cut line

| Question                              | Goes to                                                              |
| ------------------------------------- | -------------------------------------------------------------------- |
| What's the math under this shape?     | `open-loop-research/methodology/techniques/closed-form-progression/` |
| What number should I pick?            | `incremental-math/src/pages/design-playbook/`                        |
| What patterns does my archetype use?  | your archetype's `archetypes/<name>.md`                              |
| Where do those patterns come from?    | `open-loop-research/LIBRARY.md`                                      |
| What engine primitive does X?         | `open-loop-engine/docs/api/INDEX.md § harness`                       |
| How do I run discipline starter-side? | this doc                                                             |

## Living-doc note

This doc grows as archetypes ship balance passes. New methodology shapes that don't fit the current six get added to theme 3. New diagnostic vocabulary that surfaces during reshape calls gets added to theme 2. The engine surface table in theme 4 stays curated — when a primitive lands that earns a row, it earns one; otherwise the full INDEX is one click away.

PR welcome. The cost of an outdated balance doc is tuning calls that read off stale framing.

## See also

- `archetypes/BALANCING-TUG.md` — pre-research, single-archetype historical artifact for the Tug worked example. In-source citations referencing `§ Tier C` and `§ Retune vs reshape` resolve there, not in this doc.
- `archetypes/<name>.md` — per-archetype doc; calls patterns and cross-pattern properties by name.
- `open-loop-research/methodology/techniques/closed-form-progression/` — theory umbrella (thesis, rate-function algebra, bifurcations, math lineage, case studies, subsystem inventory).
- `incremental-math/src/pages/design-playbook/` — prescriptive design surfaces (pacing, composition, bending, modifier-chains, prestige, multi-resource).
- `open-loop-engine/docs/api/INDEX.md § harness` — full engine balance toolkit.
- `open-loop-engine/docs/candidate-primitives.md` — observed-but-not-yet-graduated primitives raised by consumers.
- `open-loop-research/LIBRARY.md` — pattern catalog, cross-pattern properties, prevalence.
- `open-loop-research/practical/composition-cookbook/` — believability-calibration discipline, parameterized-personality recipes, procedural-personas tester-seat agent.
