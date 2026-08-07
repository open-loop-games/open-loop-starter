# Balancing — Ambient

Per-archetype balance log per `BALANCING.md § Graduating findings`. Records what was *learned* across ambient's balance passes — instrument-earning moments, methodology stresses, engine-surface gaps, drift signals, numerical surprises. Not chosen values (those live at `tunable()` sites), not beat windows (`balance/beats.ts`), not per-pass status or ticket IDs.

When an entry generalizes across archetypes, file a PR moving the abstracted rule into `BALANCING.md` and leave the worked example here.

## Engine-surface confirmation (N=2) — `ProducerMapping.purchase.costScaling` is static

Ambient's `producerCostGrowth` (default `COST_SCALING = 1.08`) hit the same engine-surface gap producer documented in `BALANCING-producer.md § first entry`: `ProducerMapping.purchase.costScaling` accepts `DecimalSource` only, read once at producer registration. Wrapping in `tunable()` produces no runtime retuning ability and the picker can't enumerate the knob as a perturbation surface.

Resolution today: inlined `1.08` in `data/producers.ts` with the negative-criterion comment and a cross-link to producer's gap entry. The `'balance/producerCostGrowth'` slot dropped from `AmbientTunableKey` (no consumer).

- **Receipt:** in-code comment block at `src/showcase/archetypes/ambient/data/producers.ts:13-21` documents the negative criterion and cross-references `BALANCING-producer.md`.
- **Convergence count:** N=2 (producer + ambient). Both archetypes hit the gap from the inverse direction — producer per-tier (`1.15`, Cookie Clicker citation), ambient unified (`1.08`, gentler cozy curve). Same engine surface, same blocker.
- **Cross-link:** `candidate-primitives.md` — when the `Computable<DecimalSource>` adoption candidate gets filed for `ProducerMapping.purchase.costScaling`, both archetypes graduate together. File as `scope:engine` research ticket per umbrella decomposition rule.

## Engine-surface adoption (clean) — `runUntil({mode: 'stasis-aware-tick'})` works for zero-click archetypes

Ambient's zero-click contract is the structural condition that lets `runUntil({mode: 'stasis-aware-tick'})` drop in cleanly. The accessor `buildAmbientAccessor` reports `getRate('sprouts') = producers.getTotalRate(sprouts)`. With no click channel, that's the complete income picture — `isStasis` correctly observes "rate > 0" throughout the arc (planter seeds at `initialAmount: 1` with `baseRate: 0.5`, so headline rate is non-zero from tick 0).

Smoke validation across all 5 ARC_BEATS under default content (one-shot probe, deleted post-verdict):

```
| beat   | tick fire | tick term | stasis fire | stasis term | verdict |
| beat-1 | 2s        | predicate | 2s          | predicate   | match   |
| beat-2 | 1m55s     | predicate | 1m55s       | predicate   | match   |
| beat-3 | 59m49s    | predicate | 59m49s      | predicate   | match   |
| beat-5 | 3h59m     | predicate | 3h59m       | predicate   | match   |
| beat-6 | 20m53s    | predicate | 20m53s      | predicate   | match   |
```

Adoption committed: `mode: 'stasis-aware-tick'` + `accessor: buildAmbientAccessor(engine)` wired into both `sampleBeat` (the bisection hot loop) and `verifyAll` in `solve-probe.ts`. The mode shrinks no code on the in-window cases (terminations match `'predicate'` for both), but it unlocks early termination when a bisection iteration probes a value that makes a predicate genuinely unreachable — producing `'unreachable'` instead of running the full `BUDGET_SEC = 20h` budget.

This validates the structural read recorded at `candidate-primitives.md` § `InfeasibilityOracle` (OL-628 close-out, 2026-04-23): "the question that matters is 'predicate cannot fire *within budget*,' not 'predicate cannot fire ever.'" For zero-click archetypes whose accessor faithfully captures all income channels, the narrower stasis-aware form *is* the right shape. Producer's wedge (click-taper income invisible to `getRate`) is the structural exception, not the rule.

- **Receipt:** `src/showcase/archetypes/ambient/balance/bot.ts` `buildAmbientAccessor` + `src/showcase/archetypes/ambient/balance/solve-probe.ts` `sampleBeat` / `verifyAll` mode-wired call sites.
- **Cross-link:** `BALANCING-producer.md § stasis-aware-tick` for the contrast; `candidate-primitives.md` § `runUntil({mode: 'stasis-aware-tick'})` for the upstream entry.
- **Generalization candidate (single-archetype findings stay log-local for now):** "An accessor faithfully captures the engine's income channels iff there is no out-of-band rate channel (click taper, externally driven event, etc.)." Zero-click is the cleanest case. Promote to `BALANCING.md` when a second zero-rate-channel archetype (looper greenfield?) reaches the same conclusion — currently N=1.

## Methodology-fit — identity collapses without a predictor

`BALANCING.md § Where balance constants live` treats `shape.ts` as optional, earned only when the archetype is predictor-seed-shaped. Ambient is not — there is no closed-form spec, no `spec.ts`, no predictor walker. `solve-probe.ts` bisects directly via `runUntil` + `sampleBeat`; the verifier re-runs the same `runUntil` invocation against final overrides. No file consumes phase ids or signature-metric metadata at runtime.

OL-956 Phase 2 settled on: merge identity (`AMBIENT_IDENTITY`, `AMBIENT_PHASES`, `FLOW_BAND_SCORE`, `PhaseIntent`) with windows (`BEAT_WINDOWS`, `ARC_BEATS`, `FLOW_BEATS`) into a single `balance.ts` (246 LOC, declarative). Identity stays as the "what changing the constants can't change" comment + types layer; beats stay as the mutable scaffolding the solver perturbs. The file size sits well below producer's predictor-seed `balance.ts`; collapse was the right call.

Reading against producer's identity-file finding: producer's predictor-seed shape *earns* the colocation (windows and phases cross-reference); ambient earns the collapse for the same reason — no predictor consumes the identity layer, so it stays comment-and-type framing rather than data the algorithm reads.

The rule in `BALANCING.md` already captures this: shape.ts is optional. The producer log's "promote if a second predictor-seed archetype reaches the same conclusion" tracks promotion of the *colocation* finding (still N=1, predictor-seed-only); ambient is evidence for the *opposite* direction (single-file when not predictor-seed), which is the documented baseline. No promotion candidate.

**Reversed by the canonical-consistency sweep (studio/open-loop-starter#9, #16).** The single-file `balance.ts` above was dissolved to match the canonical surface: the *identity* half (`AMBIENT_IDENTITY`, `AMBIENT_PHASES`, `FLOW_BAND_SCORE`, `PhaseIntent`) became prose in `IDENTITY.md`, and the *windows* half (`BEAT_WINDOWS`, `ARC_BEATS`, `FLOW_BEATS` + predicates) moved to `balance/beats.ts`. As the finding above already established, nothing consumes the identity exports at runtime, so the split cost nothing and made the identity a single-source doc per the README's `IDENTITY.md` requirement. The "collapse was the right call" observation still stands for the *era* it was made in — the sweep just re-homed the identity half from comment-and-type framing into the doc that now owns it.

## Engine-surface audit (no-op) — `runWaypointProbe`

The `invariant-probe.ts` continuous baseline uses `runUntil({until: () => false, maxSimTime: gapSec})` then a single end-of-arc snapshot. `runWaypointProbe` is shaped for "snapshot at N waypoints across an arc per seed × waypoint" — the surface lives in `BALANCING.md` Theme 4 as methodology #2's verify-step capture. Ambient's offline-round-trip needs *one* snapshot at the arc terminus, not a per-waypoint series; `runWaypointProbe`'s shape is strictly wider than the use site needs.

Verdict: no adoption. The current `runUntil({until: () => false, maxSimTime})` pattern is the right primitive for a fixed-duration single-snapshot measurement. Flag for future revisit if ambient grows a methodology-#2 flow-band-occupation surface (which *would* be a per-waypoint capture).

- **Receipt:** no in-code marker (no change is the right state).
- **Cross-link:** none — `runWaypointProbe` use sites are upstream-documented; ambient just doesn't have one yet.

## What this pass did NOT learn

Ambient is single-subsystem **Pure (continuous-auto-producer-with-modifier-chain)** running **methodology `#1` over direct bisection** (no predictor walker, no triangular composition — the bot's bisection scalar is one knob per beat). The kit fit the work — no diagnostic vocabulary felt inadequate, no algorithmic surface was missing. The four algorithmic-surface files (`beats.ts` windows, `bot.ts` sim engine, `solve-probe.ts` bisection solver, `invariant-probe.ts` invariant probes) covered the per-beat math cleanly.

The one engine-surface gap named above (`producerCostGrowth` re-confirms producer's `costScaling`) is a substrate limit the methodology kit correctly identifies. The mode-adoption finding (stasis-aware-tick works cleanly for zero-click) is structural evidence rather than a methodology stress — it confirms the right read of the producer leaf's wedge case.

Future archetypes with zero-rate-channel-leakage have a known-clean stasis-aware-tick baseline here.
