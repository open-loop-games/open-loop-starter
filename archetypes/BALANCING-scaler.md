# Balancing — Scaler

Per-archetype balance log per `BALANCING.md § Graduating findings`. Records what was *learned* across scaler's balance passes — instrument-earning moments, methodology stresses, engine-surface gaps, drift signals, numerical surprises. Not chosen values (those live at `tunable()` sites or as canonical-port consts at module reader sites), not measurement-anchor windows (`balance/balance.ts`), not per-pass status or ticket IDs.

When an entry generalizes across archetypes, file a PR moving the abstracted rule into `BALANCING.md` and leave the worked example here.

Scaler's posture is **canonical-port reference implementation**. Synergism numbers carry 1:1 with file-header citations; the methodology pass instruments the math rather than tuning beats. Solver work operates on the declared-invention surface — first-arc compromises where the port deviates from canonical pending later-arc systems landing. Forks tune that surface as they bring additional canonical compounding sources (cube upgrades, hepteract effects, shop upgrades) online.

This document seeds **mid-pass** with the foundation findings (canonical-vs-declared-invention boundary, stasis-aware-tick N=2 confirmation, methodology-rekey N=3 no-op). Per-sub-pass findings (ECC piecewise exemplar, Bellman value iteration as N=1 in-tree consumer, transcend Bellman layering, runes log-curve cleanliness) append end-of-pass when the sub-passes land.

## Engine-surface confirmation (N=2) — `runUntil({mode: 'stasis-aware-tick'})` works for autobuyer-driven archetypes

Scaler's autobuyer-driven contract is the structural condition that lets stasis-aware-tick drop in cleanly. All income surfaces through `Producer.getTotalRate(coins)`; autobuyer ticks fire inside `setupSweepAutoPurchase` / `setupPolicyAutoPurchase` ctx.onTick callbacks that translate to producer-count increments, which then surface through `getTotalRate` on subsequent ticks. There is no out-of-band rate channel — discrete conversions (prestige, transcend) fire as events the predicate observes directly, not as continuous rate the accessor would need to model.

`buildScalerAccessor(engine)` returns `getRate('coins') = getCoinProducers().getTotalRate(coins)`. This is the same shape ambient's `buildAmbientAccessor` adopted cleanly (`BALANCING-ambient.md § stasis-aware-tick`).

- **Receipt:** `src/archetypes/scaler/balance/bot.ts` `buildScalerAccessor`. Adoption call sites land per-sub-pass as `solve.ts` / `verify.ts` grow under each leaf.
- **Convergence count:** N=2 (ambient + scaler) for the rule "an accessor faithfully captures the engine's income channels iff there is no out-of-band rate channel." Ambient was zero-click + single-resource; scaler is zero-click + multi-tier (coins → prestigePoints → transcendPoints via discrete conversions). The rule survives the cardinality jump — multi-tier doesn't add an out-of-band channel because the inter-tier transitions are event-driven, not rate-driven.
- **Generalization candidate (promotes to `BALANCING.md`):** at N=2, the ambient log's pending promotion candidate is reached. PR-amend `BALANCING.md § Theme 4` engine-surface table with: "stasis-aware-tick adopts iff the accessor's `getRate` captures all continuous income channels. Producer was the wedge (click taper); ambient + scaler are the clean cases (zero-click + autobuyer-driven respectively)." Lands as a `BALANCING.md` PR amendment during end-of-pass close.

## Canonical-vs-declared-invention boundary — the scaler lesson

Producer's `tunable()` adoption was small (~5 sites in a single-subsystem Pure archetype). Ambient's was a no-op (zero sites; no `data/balance.ts` to fold). Scaler's is the first multi-subsystem canonical-port archetype, and the count of *folded values* (~20 canonical-port consts distributed across 5 module files) is much larger than the count of *tunable surface* (3 reader sites). The ratio matters: the methodology rule from `BALANCING.md § Canonical numbers are not tunable` translates to "most of a canonical-port archetype's balance constants stay inline."

### The three declared-invention `tunable()` sites

- `balance/transcendDivisor` — `() => 5e16` at `modules/transcend.ts:290`. Canonical 1e100 (`Synergism.ts:3583-3585`). 84-OOM lowering is structural: canonical 1e100 requires compounding sources (cube upgrades, hepteract effects, shop upgrades) not yet ported. Forks porting those systems raise this here, not in `data/balance.ts`.
- `balance/transcendThreshold` — same lowering rationale, parallel site at `modules/transcend.ts:295`.
- `balance/offeringBaseGain` — `() => 2` at `modules/runes.ts:224`. Canonical `Calculate.ts:114-142` sums a base + later-arc multipliers (challenge tiers, achievement rewards, shop upgrades, ascension counter). First-arc port lifts a constant trickle that the SI rune scales. Forks add canonical compounding here.

### Canonical-port inline consts (~20 entries across 5 modules)

Cross-module-shared canonical values live in `modules/canonical.ts` with citations co-located:
- `CANONICAL_ACCELERATOR_POWER = 1.1` — Variables.ts:50 (read by coin, transcend, challenges, UI).
- `CANONICAL_MULTIPLIER_POWER = 2` — Variables.ts:57 (read by coin, challenges).
- `CANONICAL_ACCELERATOR_BOOST_FREE_ACCEL_PER_BUY = 5` — Synergism.ts:2467-2472 (read by transcend, UI).

Single-module-private canonical values inline at the owning module's reader site:
- `modules/coin.ts` — `CANONICAL_COST_DIVISOR = 1`, `CANONICAL_CH4_COST_INFLATION_THRESHOLD = 1000`, `CANONICAL_CH4_COST_INFLATION_BASE = 1.25`.
- `modules/prestige.ts` — `CANONICAL_PRESTIGE_DIVISOR = 1e12`, `CANONICAL_PRESTIGE_POW = 0.5`, `CANONICAL_PRESTIGE_THRESHOLD = 1e16`, `CANONICAL_PRESTIGE_GAIN_FLOOR = 100`.
- `modules/transcend.ts` — `CANONICAL_TRANSCEND_POW = 0.03`, `CANONICAL_TRANSCEND_GAIN_FLOOR = 0.5`, `CANONICAL_ACCELERATOR_BOOST_BASE_COST = 1e3`.
- `modules/challenges.ts` — `CANONICAL_ECC_TRANSCEND_LINEAR_CAP = 100`, `CANONICAL_ECC_TRANSCEND_SOFT_DIVISOR = 20`, `CANONICAL_ECC_TRANSCEND_SOFT_BREAKPOINT = 1000`, `CANONICAL_ECC_TRANSCEND_HARD_DIVISOR = 100`, `CANONICAL_CHALLENGE_BASE_REQUIREMENTS = [10, 20, 60, 100, 200]`.
- `data/challenges.ts` — `CANONICAL_CHALLENGE_COMPLETION_LIMIT = 25`.

### What this means for the next canonical-port archetype

When the next canonical-port archetype lands (likely a fork of incloneution or progress-knight-ng), the methodology call is:

1. Canonical-cited values fold to inline `const` at the owning module's reader site with citation co-located. Cross-module-shared values export from a `modules/canonical.ts` to avoid duplicating citations.
2. The declared-invention surface (first-arc deviations from canonical) earns `tunable()` reader sites against the archetype's dedicated `TuningRegistry` (`createTuningRegistry('<archetype>-tuning')` in `modules/tuning.ts`, mirroring tug's pattern).
3. The `TuningRegistry` instantiation lives in a dedicated tuning module with no dependencies, runs first in the archetype's module list. Sibling modules declare `dependencies: ['<archetype>/tuning']` and `ctx.inject(<Archetype>TuningRegistryKey)` to bind their `tunable()` reads.
4. Grep `tunable(` under `src/archetypes/<archetype>/` audits the perturbation surface. The rule is `tunable` adoption is opt-in — canonical-port values are NOT solver perturbation surface.

This pattern is the **canonical-port reference implementation** template. The methodology pass instruments the math; the small declared-invention surface is where forks adjust as additional canonical systems port in.

- **Receipt:** files modified during the fold are listed above. The pattern generalizes to any canonical-port archetype with a citation-heavy `data/balance.ts`.
- **Generalization candidate:** ride along to `BALANCING.md § Where balance constants live` as an addendum on canonical-port archetypes specifically. Producer's fold was small enough that the "values declare at reader sites" rule was the dominant pattern; scaler clarifies that for canonical-heavy archetypes, *most* values land as plain consts and `tunable()` is the smaller opt-in surface. Lands as a `BALANCING.md` PR amendment during end-of-pass close.

## Methodology-number rekey — N=3 no-op confirmation

OL-955 + OL-956 close-out comments predicted the methodology-rekey rule (Tier-A/B/C taxonomy excision) would land as observation rather than work across all archetypes. Scaler is the third archetype to confirm: the codebase carries no `Tier-A` / `Tier-B` / `Tier-C` labels in scaler code, comments, or test scaffolding — the framing was always against canonical Synergism rather than the prescriptive taxonomy.

- **Receipt:** `grep -rn "Tier-[ABC]\|tier-[abc]" src/archetypes/scaler/` returns zero hits.
- **Convergence count:** N=3 (producer + ambient + scaler). All three archetypes converge on "rekey was already the case."
- **Generalization candidate:** the umbrella OL-953 description's rekey item is documented as observation across the full set. The cross-cutting rule collapses from "applied during" to "was already the case." End-of-pass note in the umbrella thread, not a `BALANCING.md` amendment.

## Subsystem bucket-walk — multi-subsystem archetype as compositional reference

Scaler is the first multi-subsystem archetype in the balance-pass umbrella to do the Theme 2 nine-bucket walk explicitly. `balance/balance.ts` § `SCALER_SUBSYSTEMS` classifies all nine subsystems (coin / accelerator / multiplier / upgrades / runes / challenges / prestige / transcend / achievements) against the bucket vocabulary with per-subsystem methodology call and sub-pass attribution.

The classification surface lives next to the identity declaration so future fork engineers reading `balance/balance.ts` see the methodology call alongside the architectural one. Compare producer + ambient: both classified single subsystems as Pure inline in their identity comments. Scaler's compositional shape demands explicit per-subsystem rows.

- **Receipt:** `src/archetypes/scaler/balance/balance.ts § SCALER_SUBSYSTEMS`.
- **Affected sub-passes:** 4 of 9 subsystems ship solvers under this leaf (runes Pure walker, ECC piecewise walker, prestige Bellman, transcend Bellman). The other 5 are canonical-port read-off only — locked via existing `sim/<beat>.test.ts` mechanical state-transition checks.
- **Generalization candidate (forward):** if a second multi-subsystem canonical-port archetype lands, promote `SCALER_SUBSYSTEMS`'s shape into `BALANCING.md` as a template for the per-subsystem classification. Single-archetype findings stay log-local until N=2.

## What the foundation did NOT learn (pending sub-passes)

Sub-pass-specific findings — ECC piecewise as in-tree exemplar, Bellman value iteration as N=1 in-tree consumer with `candidate-primitives.md` receipt, transcend Bellman layering pattern, runes log-curve methodology-fit, predictor-seed vs direct-bisect call per sub-pass — append to this log end-of-pass when the sub-passes converge.

Two findings are pre-emptively flagged as candidates that may or may not graduate:

- **Predictor-seed N=2 confirmation candidate.** If scaler's `balance.ts` + per-sub-pass `spec.ts` colocate identity-with-windows in the same way producer's does (the producer log's pending promotion threshold), this is the second predictor-seed-shaped archetype. Promotes to `BALANCING.md § Where balance constants live` per producer's log. Pending verification once `spec.ts` lands per sub-pass.
- **`createSoftcappedAccumulator` engine candidate at N=1.** ECC's piecewise softcap is the first in-tree consumer of the shape. Marker migrated to the new home at `modules/challenges.ts` (during the canonical-port fold) but the candidate stays N=1 until a second consumer derives the same shape. No graduation under this leaf.

## End-of-pass findings (sub-passes 1–4 closed)

The four sub-passes shipped per the foundation comment's sequence — runes, ECC piecewise, prestige, transcend. Two of them resolved as planned, two converged differently and warranted re-scoping; the deferred Bellman decision settled in favor of direct-bisect for canonical-port archetypes.

### Runes sub-pass — scaffolding validated; predictor-sim co-tick prediction

The runes spec walker uses canonical `computeEXPToLevel` inversion to predict `first-Speed-level-1` time. Under canonical autobuyer policy:

- First sacrifice fires `ctx.onTick` inside the same engine tick the prestige reset's `afterReset` event accrues 2 offerings.
- Speed level-1 threshold (`~0.77` EXP at canonical `costCoefficient=50`, `levelsPerOOM=150`) clears in one sacrifice — 2 offerings ⇒ Speed jumps from level 0 to level 2.
- Predictor returns `firstPrestigeAtSec` exactly; verify diffs sim with ±1 tick tolerance. Observed: predictor=3405s, sim=3405s, Δ=0.

The cascade math the spec walker computes — `prestigeFiringsToLevel1` per rune (Speed: 1, Dup: 194, Prism: 6479, Thrift: 489029, SI: 4e10) — informs future fork work but is fork-extension territory under this leaf (only Speed level-1 is the measurement anchor).

- **Receipt:** `balance/spec.ts` `predictFirstSpeedLevel1Sec` + `buildRunesSpec`.
- **Cross-archetype reference:** runes is a Pure-subsystem-inside-multi-subsystem demonstration — the smallest math validates the `spec.ts`/`solve.ts`/`verify.ts` scaffolding before harder sub-passes (ECC, prestige, transcend) land. Producer was Pure-single-subsystem; ambient was Pure-single-subsystem with zero-click; scaler is Pure-as-one-of-many. Future multi-subsystem archetypes can copy this sub-pass's shape directly.

### ECC piecewise sub-pass — in-tree exemplar for `BALANCING.md § Theme 3 #2`

`specEccTranscend` re-derives the canonical regime splice (linear ≤100, +1/20 in (100, 1000], +1/100 above 1000) as a second source of truth. `verify.ts` diffs spec walker output against engine `eccTranscend()` at the regime-spanning sample set; both sides compute in IEEE 754 over `number`, so equality is exact (zero tolerance).

- All 12 sample points match exactly (breakpoints 100 + 1000 ± 1, interior 50/500/999/1500/2000).
- `sim/ecc-beat.test.ts` adds 13 vitest locks: 12 spec-vs-engine equality checks + 7 canonical-value pins at every regime breakpoint.
- **Receipt:** `balance/spec.ts § specEccTranscend` + `sim/ecc-beat.test.ts`.

ECC is the canonical Piecewise closed-form exemplar — two independent expressions of the same canonical math, exact equality at sample points, drift catches expression mutation immediately without sim runs. This is the cleanest sub-pass shape in scaler's set.

- **Generalization (ride-along to `BALANCING.md`):** ECC piecewise lands as the in-tree exemplar in `BALANCING.md § Bucket → methodology lookup` row "Piecewise closed-form → scaler ECC."

### Prestige sub-pass — deferred-Bellman decision converged to direct-bisect

The plan flagged Bellman value iteration as a structural decision deferred to per-sub-pass execution. After scoping the work, Bellman value iteration on the full state space (`coinsThisPrestige` + multi-resource purchase counts + multiplier-stack) required either:
1. Replicating the autobuyer's cheapest-affordable decision logic in the predictor (violating "the engine is the math"), or
2. Discretizing to a 1D state lattice (`pgGain`) with an empirical Δ-per-step from sampled sim (legitimate but informative-only under canonical-port discipline).

The fallback per the deferred plan — direct-bisect with frozen-state threshold-equivalence predictions — provides the actual regression catch under canonical-port posture:

- `predictPrestigeAtCanonicalThreshold` mutates `coinsThisPrestige` to 1e16, reads back `prestigePointGain = 100` exactly (canonical formula construction) + `prestigeConversion.canConvert = true`.
- The `anyOf` disjunction (`coinsThisPrestige >= 1e16 OR PPGain >= 100`) collapses structurally — both branches fire at the same engine tick. The threshold-equivalence is the regression invariant.
- Verify observes post-fire signal (`prestigePoints.cumulative`), diffs against prediction. Observed: cumulative PP at fire = 100 exactly, threshold equivalence confirmed.

**Why Bellman wasn't load-bearing here.** Canonical-port discipline (`BALANCING.md § Canonical numbers are not tunable`) fixes θ=1e16. Bellman value iteration would compute θ* under a free-policy regime — informative as a design analysis but NOT a regression catch. The optimal-stopping math has a place when:
1. The threshold is a tunable design surface (not canonical-port), or
2. A consumer (fork) wants to evaluate canonical-θ vs optimal-θ as a balance-pass output, not a lock.

Neither case applies to scaler under this leaf. The `TODO(expansion)` at the predictor site documents the framing for later consumers — and the transcend sub-pass below provides the N=2 in-leaf instance of the same direct-bisect shape, strengthening the candidate-primitives convergence case (see `Bellman framing as fork-extension` below).

- **Receipt:** `balance/spec.ts § predictPrestigeAtCanonicalThreshold` + `balance/verify.ts § verifyPrestige`.

### Transcend sub-pass — N=2 layered threshold equivalence

Same shape as prestige, one layer up, parameterized on the declared-invention tunable surface (`balance/transcendDivisor` + `balance/transcendThreshold`, both default 5e16). The canonical formula `floor((c/transcendDivisor)^0.03)` produces a step function 0 → 1 at exactly c = transcendDivisor: at the threshold, gain=1 satisfies the gain-floor branch (`gain >= 0.5`) and the coin-threshold branch (`c >= transcendThreshold`) simultaneously.

- Predictor returns `gainAtCoinThreshold = 1` exactly; verify observes cumulative TP=1 at first transcend.
- All 3 frozen-state predictions match; layered threshold equivalence confirmed.
- Observed first-transcend: 279m49s, within the tightened [260, 310] min window.

**N=2 in-tree instance of the frozen-state threshold-equivalence shape.** Prestige + transcend share the canonical-port disjunction-collapse pattern. If a third archetype (looper / a future fork) hand-rolls the same `predictXxxAtCanonicalThreshold` shape, that's the trigger to graduate `createOptimalStoppingSolver` / `frozenStateThresholdEquivalence` as an engine helper. Under this leaf, the candidate stays in `spec.ts` with `TODO(expansion)` co-locating at the prestige + transcend predictor sites.

- **Receipt:** `balance/spec.ts § predictTranscendAtCanonicalThreshold` + `balance/verify.ts § verifyTranscend`.

### Predictor-seed N=2 colocation — confirmed; promotion candidate ready

Scaler's `balance/balance.ts` co-locates `SCALER_IDENTITY`, `SCALER_PHASES`, `SCALER_MEASUREMENT_ANCHORS`, `SCALER_SUBSYSTEMS`, `ECC_SAMPLE_COMPLETIONS` in one file alongside the predicate helpers — same predictor-seed shape producer pioneered (identity + windows + spec inputs co-located). `balance/spec.ts` adds the per-sub-pass closed-form predictors that read off this seed.

- **Convergence count:** N=2 (producer + scaler). Producer's log flagged this as pending-confirmation against a second predictor-seed-shaped archetype; scaler is the confirmation.
- **PR-amendment candidate confirmed:** `BALANCING.md § Where balance constants live` adds a note on the predictor-seed colocation pattern, citing both producer and scaler as references. Ambient + tug remain direct-bisect-shaped (per their logs); the predictor-seed shape applies where the spec walker has a meaningful closed-form output to drive verify against.

### Stasis-aware-tick N=2 — confirmed end-of-pass

Foundation seeded the N=2 confirmation candidate for stasis-aware-tick adoption rule: "an accessor faithfully captures the engine's income channels iff there is no out-of-band rate channel." Scaler's `buildScalerAccessor` (in `balance/bot.ts`) adopted cleanly per the foundation note. The sub-pass verifies the rule still holds across all 4 measurement points (runes, ECC, prestige, transcend) — every sim run used `runUntil`'s default `'tick'` mode against the autobuyer-driven scaler engine, and predictions matched observations exactly.

- **PR-amendment candidate confirmed:** `BALANCING.md § Theme 4` engine-surface table gets a note on stasis-aware-tick adoption (zero-out-of-band-channel rule). Lands per ambient log's pending promotion threshold.

### Bellman framing as fork-extension

The plan called for Bellman value iteration as the first in-tree consumer of optimal-stopping math, with a `bellman-value-iteration` entry in `candidate-primitives.md`. The sub-pass converged differently:

- Direct-bisect frozen-state threshold-equivalence is the right shape for canonical-port archetypes. The candidate-primitives entry would be premature — there's no in-tree Bellman consumer to receipt against.
- The optimal-stopping framing remains valid for forks that perturb thresholds outside canonical-port discipline (e.g., a fork raising transcend thresholds as cube/hepteract systems port in, evaluating canonical vs optimal as a design output). The `TODO(expansion)` markers at the predictor sites document the framing for those future consumers.
- The candidate-primitives entry shifts from `bellman-value-iteration` to `frozenStateThresholdEquivalence`-style — name TBD when the second consumer (looper, a future archetype, or a fork) hand-rolls the same direct-bisect pattern. Current N=2 in-tree (prestige + transcend) is intra-archetype; engine-side graduation needs cross-archetype convergence.

### Methodology-rekey final pass

Per OL-955 / OL-956 / OL-957 / scaler's foundation seed: the Tier-A/B/C taxonomy excision lands as observation across all five archetypes (producer, ambient, tug, scaler, looper). Scaler confirms N=3+ (foundation already documented this); transcend sub-pass's code carries no Tier-* labels. The umbrella's "applied during" item closes as "was already the case." No `BALANCING.md` amendment from this finding.

### What this leaf did NOT learn

- **Full Bellman value iteration in-tree.** Deferred per the structural decision; remains fork-extension territory.
- **Multi-prestige-cycle compounding predictor.** Sub-pass scope tightened to first-prestige + first-transcend predictions. Per-cycle T_N for cycles 2..N is sampled by `solve.ts` (cycles 2..5 prestige) for future reference but not modeled.
- **`createOptimalStoppingSolver` engine candidate at N=1.** No in-tree Bellman consumer — see fork-extension framing above.
