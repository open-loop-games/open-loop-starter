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
