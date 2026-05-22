# Balancing — Interlocker

Per-archetype balance log per `BALANCING.md § Graduating findings`. Records what was *learned* across Interlocker's balance passes — instrument-earning moments, methodology stresses, engine-surface gaps, drift signals, numerical surprises. Not chosen values (those live at `tunable()` sites), not beat windows (`balance/balance.ts`), not per-pass status or ticket IDs.

When an entry generalizes across archetypes, file a PR moving the abstracted rule into `BALANCING.md` and leave the worked example here.

## Methodology — sim-driven gap discovery on a freshly-landed archetype

The interlocker port (OL-1056 Phases 1–4) landed scaffold + locked contracts + module bodies + UI across four commits, with 70 vitest tests passing — but no headless sim run had been attempted before this pass. Discovery probes (`src/archetypes/interlocker/balance/probes.ts`) immediately surfaced two structural gaps the unit-test surface missed:

1. **Production loop unwired.** Rate chains (`rateChains[id]`) collected modifiers from jobs (woodcutter +0.09/sec wood, farmer +5/sec catnip, scholar +0.175/sec science, miner +0.25/sec minerals) and from building muls (lumberMill +10% wood, library +10% science, mine +20% / quarry +35% minerals). The chains were *read* by the starvation predicate (`village.ts:321`) and by the UI rate display, but nothing consumed them to actually `addResource` per tick. Only the smelter (`buildings.ts:273`) and population growth (`village.ts:291`) had real per-tick handlers. The arc didn't play because four of five rate-bearing resources never accumulated.

2. **Arc bootstrap circular.** With the production loop patched (see § Carry-forward to 5b for the one-line village.ts addition), the greedy bot still wedges at t=20s. The cascade: barn is `unlockedByScience: 'agriculture'`, agriculture requires calendar (30 science), calendar requires scholar production, scholar is `unlockedByScience: 'agriculture'`. Wood has no `baseCapacity > 0` so woodcutters produce wood that gets clamped to 0 by `overflow: 'destroy'`. The interlocker port omitted Kittens canon's click-driven catnip+wood gather affordance — the canonical bootstrap channel — without substituting non-zero default caps or seeded initial state. **The arc is unwinnable headless under the current data shape.**

The methodological rule: **the unit-test surface validates module API contracts but does not validate that the archetype plays.** A port lands type-clean, test-clean, manifest-complete — and still has an unwired production loop and an unwinnable bootstrap because the test design checks module-local invariants rather than arc behavior. Phase 5 balance probes are the first integration surface that asks "does this game produce a beat sequence under any policy?" — and that's where these gaps showed up.

- **Receipts:**
  - `src/archetypes/interlocker/modules/village.ts:280-296` — production sub-step added at the top of the village `onTick`. Walks `productionResourceIds = ['catnip', 'wood', 'minerals', 'science']`, reads `chain.apply(0)` for each, calls `addResource(resource, rate × dt)` when positive. Iron excluded because the smelter `onTick` in `buildings.ts:273` writes iron directly. Catnip is included on the production side; the consumption side stays at step 2 (drain from kittens).
  - `src/archetypes/interlocker/balance/probes.ts` — four probes documented inline. Discovery artifact; not promoted to a vitest lock until the bootstrap gap is fixed and the arc plays end-to-end.

- **Promotion candidate for BALANCING.md:** "Module-API tests are insufficient to prove an archetype plays. The first balance pass on a greenfield archetype is the first integration surface that walks the rate-chain → resource → predicate → beat path under a deterministic bot. Schedule a smoke probe (one bot, one arc-length `runUntil`, beat fire-time table) as a Phase 4 / Phase 5a precondition — before any methodology bucket-walk, confirm the game *plays*." Generalizes to any archetype port using composed modifier chains where a per-tick consumer is the architectural cut between "rate is reported" and "rate is integrated."

## Engine-surface receipt (N=1) — `createResourceBag` adoption pattern

First archetype consumer of `createResourceBag`. The wallet is a single bag with per-type capacities sourced through reactive getters routed through per-resource `maxChains[id]` modifier chains. Buildings push additive + multiplicative grants onto the chains; the bag re-reads on every `remainingCapacityForType` call. Bag-link establishes two-way reactive sync between the bag slot and the persistent `Resource<Decimal>` ref so save→load hydrates Resources first and the bag re-syncs.

Validated by the probe runner (probes 1+3+4 install fresh engines via `createInterlockerEngine` and read through `resourcesApi.bag.remainingCapacityForType` + `resourcesApi.resources[id].value` without per-call double-bookkeeping). Capacity-chain reactivity works as designed: `chain.bind` then `chain.apply(0)` reflects the new modifier on the next read.

- **Receipt:** `src/archetypes/interlocker/modules/resources.ts:128` — `TODO(expansion)` co-located with the bag construction.
- **Convergence count:** N=1 (interlocker is the sole archetype consumer of `createResourceBag` in starter). Producer / ambient / scaler use single-headline-resource modules; defender uses individual `Resource` handles directly without a bag.
- **Graduation trigger:** second wide-graph archetype adopts the same bag + per-type-reactive-cap-chain shape. Candidate archetypes: Explorer (loadout-style), Director (multi-resource match economy), future Factorio-like / Mindustry-like archetypes. Engine-side graduation likely a sugar over current `createResourceBag` rather than a new primitive — the current shape works, the convergence question is whether the bag→chain-getter wiring earns a helper.

## Engine-surface receipt (N=1, two-site) — `createContinuousConversion`

First archetype consumer of continuous per-tick multi-input/output conversion, hand-rolled at **two** independent sites:

- **Smelter (buildings.ts:265–290).** wood + minerals → iron at `0.25/0.25/0.1 per-second per smelter`. Probe 3 confirmed exact match against the closed-form expectation `0.1 × smelterCount × durationSec` across {1, 3, 10} smelters at 60s sim duration: **0% drift, all three rows.** Fail-soft on input shortage works correctly (atomic `hasResource && hasResource` check before any subtract).

- **Catnip (village.ts:299–313).** Per-kitten catnip drain routes through `consumptionRateChain.apply(perKittenPerSecond)` then `subtractResource(catnip, magnitude × dt, { allowNegative: true })`. Pasture's `mul -0.005` grant compounds across multiple pastures via the chain's standard multiplicative semantics.

The shape is `createConversion` (atomic player-fired) integrated by an `onTick(dt)` driver — the canonical "continuous multi-input/output" composition the engine doesn't have a single primitive for yet. Defender's wave economy was event-driven (popped + cleared); interlocker is the first per-tick continuous consumer in the corpus.

- **Receipts:**
  - `src/archetypes/interlocker/modules/buildings.ts:266` — smelter `TODO(expansion)`.
  - `src/archetypes/interlocker/modules/village.ts:305` — catnip drain `TODO(expansion)`.
- **Convergence count:** N=1 archetype, two sites — both within the same Interlocker substrate. Engine-side graduation waits for a second archetype to hand-roll the same shape (Factorio-like, Mindustry-like, automation-heavy future archetypes).
- **Graduation trigger:** second archetype adopts the same per-tick `(inputs[], outputs[], rate)` shape. At graduation, decide: does `createConversion` grow a `tickDriver` option (`createConversion({ inputs, outputs, perTickRate: …})`) that internalizes the `onTick` driver, or is `createContinuousConversion` a separate primitive that composes a Conversion with a rate driver? The two-site replication inside Interlocker is evidence the shape generalizes but doesn't itself satisfy the N=2-corpus rule.

## Cross-archetype bifurcation — stasis-aware-tick verdict + new sub-axis

`BALANCING-defender.md § stasis-aware-tick verdict` recorded the bifurcation between continuous-rate (ambient — clean adoption) and event-driven (defender, producer — wedge case). The umbrella OL-1056 staged interlocker as confirming the continuous-rate side at N=3 with a *new sub-axis*: storage caps mean rates terminate when caps hit, so the stasis predicate has a new termination class (cap-reached) that stasis-aware-tick must distinguish from zero-rate.

**Continuous-rate confirmation N=3:** confirmed. Interlocker income IS continuous-rate (jobs × baseRate + buildings × mul flows per-tick through rate chains into resources). With the production-loop patch, `getRate('wood')` faithfully reports `chain.apply(0)` and the bag reflects accumulated additions per tick. No event-driven income channel — all four production resources route through chain → onTick → addResource.

**Cap-reached sub-axis — confirmed wedge.** Probe 2 set up the scenario: synthetic +5/sec rate on the catnip rate chain, catnip resource with `baseCapacity: 0` (overflow = 'destroy'), no actual production driver pushing into the bag. Run `runUntil({mode: 'stasis-aware-tick'})` with accessor reporting `getRate('catnip') = 5`. Predicate: `catnip ≥ 1000`. Observed termination: `'maxSimTime'`, not `'unreachable'`. The stasis-aware-tick mode reads through `createTransitionSnapshot` + `isStasis` which inspects content-walker transitions (purchasable distances, conversion readiness), NOT the accessor's `getRate`. The walker sees the catnip-field purchasable as having a finite distance to next purchase (it's purchasable; the cost reachability is met), so `isStasis` returns false even though the catnip resource is wedged at its zero cap.

The novel termination class: **a resource whose rate is positive but whose bag cap is zero is functionally wedged, but the standard transition-snapshot stasis check cannot see this through purchasable-distance inspection alone.** The `getRate` accessor isn't consulted by `isStasis`; the walker's purchasable transitions are.

- **Receipt:** `src/archetypes/interlocker/balance/probes.ts § Probe 2` — wedge reproduction in 60 lines. Termination column reads 'maxSimTime' with rate=5.0/sec and catnip stuck at 0.
- **Cross-link:** `BALANCING-defender.md § stasis-aware-tick verdict`, `open-loop-engine/docs/candidate-primitives.md § InfeasibilityOracle`.
- **Promotion to `BALANCING.md`:** Phase 5c PR-amends `BALANCING.md § stasis-aware-tick adoption — zero out-of-band channel rule` to extend the rule with the cap-reached sub-axis: *the rule "accessor faithfully captures income channels iff there is no out-of-band rate channel" is necessary but not sufficient. A cap-bounded resource whose value clamps to a finite ceiling (or zero) introduces a second wedge: the rate is real but the integrand is bounded. Stasis-aware-tick via transition-snapshot inspection does not see cap-reach termination. Consumers needing to detect cap-reach must layer a budget-bounded reachability check on top — exactly the `InfeasibilityOracle` shape the candidate-primitives entry tracks.*

## Cross-archetype convergence — override-path-vs-tunable rule (N=3)

`BALANCING-tug.md § Architectural finding` and `BALANCING-defender.md § Cross-archetype convergence — override-path-vs-tunable rule` confirmed N=2.

Interlocker confirms N=3: greenfield from Phase 1 onward, no `data/balance.ts` parallel was ever authored. Every perturbable value is a `tunable()` reader site keyed under `resources/`, `buildings/`, `village/`, `crafts/`, `smelter/`, `sciences/` (see `modules/tuning.ts` `InterlockerTunableKey`). Balance probes perturb exclusively through `pushScope` on `InterlockerTuningRegistryKey`.

- **Receipt:** `src/archetypes/interlocker/data/` directory shape — no `balance.ts` or `overrides.ts` alongside `buildings.ts` / `crafts.ts` / `jobs.ts` / `resources.ts` / `sciences.ts` / `types.ts`.
- **Cross-link:** `BALANCING-tug.md § Architectural finding — deep-partial override redundant with tunable()`, `BALANCING-defender.md § override-path-vs-tunable`.
- **Promotion to `BALANCING.md`:** Ready as N=3. Phase 5c PR-amends `BALANCING.md § Where balance constants live` to lift the lesson from log-local to a cross-archetype rule: *`data/balance.ts` retires; greenfield archetypes route balance constants through `tunable()` + `TuningRegistry` from Phase 1 onward.*

## Cross-archetype convergence — data-shape-up-front dead-fields (N=3)

`BALANCING-tug.md § Over-authoring finding` flagged dead fields. `BALANCING-defender.md` confirmed N=2.

Interlocker confirms N=3: every field in `data/{resources, buildings, jobs, sciences, crafts}.ts` has a module-side reader. Phase 1 explicitly authored "only what consumers read" per the umbrella's convergence-question staging. Phase 5a grep audit confirms zero dead fields.

- **Receipt:** grep audit across `src/archetypes/interlocker/data/` → all fields appear in at least one module reader site (`modules/resources.ts`, `modules/buildings.ts`, `modules/village.ts`, `modules/workshop.ts`, `modules/sciences.ts`).
- **Cross-link:** `BALANCING-tug.md § Over-authoring finding`, `BALANCING-defender.md § data-shape-up-front`.
- **Promotion to `BALANCING.md`:** Ready as N=3.

## Cross-archetype convergence — methodology-number rekey is a no-op (N=4)

Producer, ambient, defender each confirmed methodology-number framing (#1–#7) didn't require rekey from prior Tier-A/B/C taxonomy.

Interlocker confirms N=4: zero Tier-A/B/C references in identifiers, comments, or test descriptions across the archetype. Authored against #1–#7 from Phase 1 onward.

- **Receipt:** grep audit across `src/archetypes/interlocker/` → no Tier-A/B/C residue.
- **Cross-link:** `BALANCING-defender.md § methodology-number rekey`.
- **Promotion to `BALANCING.md`:** Ready as N=4. Phase 5c rewrites `BALANCING.md § Theme 3` preamble to drop the methodology-rekey caveat as historical and confirm "all current archetypes author against #1–#7 from the start."

## Methodology fit — what the cost-scaling probe observed

Probe 1 (cost-scaling regression) read each of the 11 buildings' cost requirements at counts {0, 5, 10} across every resource in their price lists — 36 sample points total. Observed cost at every point matched `baseCost × priceRatio^count` exactly (0% drift). Building cost is pure closed-form geometric per resource, with `priceRatio ∈ {1.12, 1.15, 1.75, 2.5}` separating tiers (1.12 for catnip field, 1.75 for barn, 2.5 for hut, 1.15 for everything else).

Bucket: **Pure closed-form** per `BALANCING.md § The nine-bucket walk`. Primary methodology: **#1 spec/calibrate/lock** per `BALANCING.md § Bucket → methodology lookup` (Pure closed-form → #1 + #2). The spec is `cost(n) = baseCost × priceRatio^n` per resource; calibration bisects on chosen `baseCost` and `priceRatio` to land beat windows; locks pin chosen values with `toBeBetween` bounds.

Phase 5b will run methodology #1 calibration once the arc is winnable end-to-end. Locks come last; nothing pinned at 5a.

## What this pass did NOT learn

Phase 5a observed enough to validate methodology bucket-walk on cost-scaling and to confirm the smelter continuous-conversion, but the arc-bootstrap gap blocked four front-staged learnings:

- **Arc-completion behavior — beats 3–6.** Greedy bot wedges before calendar (beat 3) due to the bootstrap circularity. Sensitivity sweeps, regression locks, flow-band occupation reads, and methodology #6/#7 fit assessment for the population-allocator subsystem all wait on bootstrap resolution.
- **Cap-saturation dynamics across the storage-capped resources.** Probe 2 confirmed the cap-reach wedge structurally; the sweep across barn / warehouse / pasture coverage (does cap-pressure produce a discrete beat?) needs the bot to actually buy those buildings, which needs science, which needs the bootstrap fix.
- **Population-allocator strategy bucket.** The task pre-staged "#6 or #7" as a candidate methodology for the population-allocator subsystem if discrete cliff effects appear in beat-5/6. Pre-stage discarded — interlocker's job-rate model is *continuous additive* through the rate chain (woodcutter count adds 0.09/sec/count linearly), and per-fixed-strategy ROI closes per `BALANCING.md § Bucket → methodology lookup` Coupled-state deterministic row (primary methodology #1 multi-knob, sibling #5 if re-allocation is a dynamic choice). Methodology #6 (pure sim discovery) and #7 (planning/scheduling) do not fit; the population-allocator is coupled-state-deterministic per fixed strategy. Confirmed at design-layer; arc-play confirmation deferred.
- **Methodology #6 stress for emergent strategy.** Not reached; no observed cliff effects to characterize.

## Carry-forward to 5b — arc-bootstrap fix

Phase 5b's first work item is **not the harness** but **un-wedging the bootstrap**. Options surfaced in this pass:

1. **Click affordance.** Re-add Kittens canon's "gather catnip" + "gather wood" click buttons. Each click adds 1 catnip / 1 wood to the bag (clamped by cap). Bag default cap stays 0; the click channel produces the seed amount. This restores Kittens canon's bootstrap flow exactly, at the cost of adding a click-channel and the stasis-aware-tick wedge case ambient + defender already documented.

2. **Non-zero default caps + seeded initial state.** Set `catnip.baseCapacity = 5000` (matches canon's intrinsic catnipMax pre-barn) and `wood.baseCapacity` to some seed value (canon: 0, but seed at 200 to match the canon barn grant). Initial `catnip.value = 5, wood.value = 0`. Net result: same headless playability as a click affordance, without the stasis-aware-tick complication.

3. **Reposition barn from `agriculture` to default-unlocked.** Kittens canon: barn unlock is via agriculture; arc-1 already departed from canon in several places (quarry pricing, compedium requirement on architecture). One more departure makes barn always-visible. Pairs with option (2) to bootstrap wood storage.

Recommended path: **(2) + (3)** — non-zero default cap on catnip, barn unlocked from start. Click affordance avoided because the production-loop is now wired and there's no zero-click design intent to violate. (1) re-introduces the stasis-aware-tick wedge that ambient/defender already characterized; carrying that wedge into interlocker just to restore canonical "gather" buttons isn't worth it.

Phase 5b leaf authors this fix, re-runs probes 1+3+4, observes beats 3+ fire-times, then proceeds to methodology #1 calibration on the now-winnable arc.

## Carry-forward to 5c — PR-amendments

Phase 5c lifts the four cross-archetype convergences from log-local to ecosystem rules + appends two N=1 entries to candidate-primitives.md:

- **`BALANCING.md § Where balance constants live`**: lift override-path-vs-tunable rule + dead-fields rule from log-local (Tug+Defender) to ecosystem (N=3 confirmation).
- **`BALANCING.md § Theme 3 preamble`**: rewrite methodology-rekey caveat as "was always the case across the corpus" (N=4 confirmation).
- **`BALANCING.md § stasis-aware-tick rule`**: extend with cap-reached sub-axis (verified in probe 2).
- **`open-loop-engine/docs/candidate-primitives.md`**: append `createResourceBag` adoption-pattern entry + `createContinuousConversion` two-site entry. Both N=1; engine-side graduation waits for second archetype consumer.
