# Balancing — Tug

Per-archetype balance log per `BALANCING.md § Graduating findings`. Records what was *learned* across Tug's balance passes — instrument-earning moments, methodology stresses, engine-surface gaps, drift signals, numerical surprises. Not chosen values (those live at `tunable()` sites), not beat windows (`balance/balance.ts`), not per-pass status or ticket IDs.

When an entry generalizes across archetypes, file a PR moving the abstracted rule into `BALANCING.md` and leave the worked example here.

## Architectural finding — deep-partial override redundant with `tunable()`

Tug's pre-redo state carried `data/balance.ts` + `data/overrides.ts` (deep-partial merge over the data tree) as a parallel-to-`tunable()` perturbation path. The data shape was bent around the override mechanism: thirteen fields lived under `TUG_BALANCE` (a single typed blob) so callers could `applyTugOverrides(base, { balance: { baseIncomeRate: 12, believability: {...} } })`. Seven of those thirteen fields had no runtime reader; they were authoring-time skeleton sketches retained to keep the type-shape stable for the override path. The override mechanism *itself* was the reason the data shape stayed disjointed from the modules that consumed it.

Tug already had a `TuningRegistry` + `tunable()` reader sites at units, income-upgrades, fortress, lane (counter-matrix). The override path duplicated that mechanism for the same purpose (perturbing values transiently during sim/probe runs), at lower fidelity (deep-merge over the data tree, not scope-stacked overrides on the registry).

Resolution: delete `data/balance.ts` and `data/overrides.ts` entirely. Inline active fields at their reader sites; extend the `tunable()` surface so every cost/multiplier/rate the probes perturb is a registry key. Drop dead fields. The balance scripts route through `pushScope` on `TugTuningRegistryKey` instead of `applyTugOverrides`, matching Producer's post-redo path.

- **Receipt:** the redo itself; before/after diff at `src/archetypes/tug/data/` and `src/archetypes/tug/balance/`.
- **Cross-link:** Producer's `BALANCING-producer.md` records the same end state via the locked rule "Where balance constants live" — `tunable()` + `TuningRegistry` is canonical.
- **Promotion candidate for BALANCING.md:** "If an archetype carries both a deep-partial override path AND a `tunable()` surface, the override path is redundant. The locked deep-partial path lives only for genuinely non-tunable consumer surfaces (content cardinality, IDs) — and even those usually have less weight than the author thinks (see next finding)."

## Over-authoring finding — 7 of 13 declared balance fields had no runtime reader

The pre-redo `TUG_BALANCE` declared:

| Field | Used at runtime? |
|---|---|
| `baseIncomeRate` | yes |
| `matchTimeLimitMinutes` | yes |
| `aiIncomeMultiplier` | yes (drops — see next finding) |
| `aiSendCadenceSec` | yes |
| `opponentPersona` | yes |
| `believability` | yes |
| `metaProgressionEnabled` | yes (gates module install) |
| `spendableAbilitiesEnabled` | comment-only |
| `spatialMode` | no |
| `laneCount` | no |
| `matchMode` | no |
| `unitArchetypeCount` | no (validated by tests, not used) |
| `incomeUpgradeTiers` | no (validated by tests, not used) |

The six unused fields were "skeleton invariants" that the author wrote down as data because the data shape was already typed and the override path was already plumbed. The consuming modules answer the same questions from their array lengths (`data.units.length`, `data.incomeUpgrades.length`) or module-inclusion choices (`spatialMode`/`matchMode` were enums with one value plus comments about hypothetical alternatives).

Resolution: delete the unused fields with `TugBalance` itself. Modules read array lengths directly when they need cardinality.

- **Receipt:** `data/types.ts` diff — `TugBalance` interface deleted.
- **Promotion candidate for BALANCING.md:** "The data-shape-up-front authoring habit produces dead fields when the consuming modules can answer the same question from their array lengths or module-inclusion choices. The data layer's job is to declare what the modules consume; if no module reads a field, the field doesn't earn its declaration."

## Methodology-rule violation — `aiIncomeMultiplier` was tunable

`BALANCING.md § AI knobs are not balance levers` was locked at OL-954. Tug's pre-redo surface violated it: `'balance/aiIncomeMultiplier'` was a registered `TugTunableKey` and the income module bound a per-side modifier on the AI's income chain keyed on it. The field's own inline comment correctly identified the role ("Player-facing difficulty knob, not a balance lever") — the surface was authored knowing the field wasn't a balance lever, then exposed as a balance lever anyway because the override path made it trivial to do so.

Tug's actual balance-lever tunables (per the methodology #3 + #5 fit below) are unit costs, refinery cost/multiplier, fortress HP, counter-matrix sharpness. None of those is an AI knob.

Resolution: drop `'balance/aiIncomeMultiplier'` from `TugTunableKey`. The AI side's income chain no longer binds an asymmetry modifier — both sides accrue symmetrically at `baseIncomeRate`. If a future difficulty-dial surface needs asymmetric income, it routes through a separate `difficulty/` namespace (not yet declared) rather than `balance/`.

- **Receipt:** `modules/tuning.ts` diff — key removed; `modules/income.ts` diff — AI-side modifier branch deleted.
- **Cross-link:** `BALANCING.md § AI knobs are not balance levers`; the locked rule predates this pass.
- **Lessons captured:** the override-path-as-shortcut dynamic above is *also* the dynamic that produced this violation. The override path makes it cheap to register any field as a tunable knob without thinking about what the knob *measures*. Deleting the override path removes the temptation.

## Methodology fit — #3 + #5 + framework-correctness gate

The methodology kit fit the work cleanly. Tug runs:

- **Methodology #3 (sensitivity sweep)** as its signature. Probe 3 (`runCounterStrongSensitivityProbe`) sweeps `counter-matrix/strongCounter ∈ [0.5, 1.5]` against player-side win-rate vs a concentrating opponent (greed). Proposes an elbow scalar via the saturation-guard pattern (smallest sweep value where win-rate ≥ depth-floor AND next-step delta ≥ saturation guard). This is the canonical methodology-#3 surface: response curve plus a chosen point on it.
- **Methodology #5 (fixed-strategy ROI)** as a per-tier income-upgrade snapshot. Probe 4 (`runIncomeUpgradeRoiProbe`) reads the engine's `IncomeUpgradeRoiKey[side]` ComputedRefs (payback / crossover seconds) and sweeps refinery-1 cost against the match-duration gate. The ROI metrics ride the canonical closed-form per `BALANCING.md § Best-response / fixed-strategy ROI`: `paybackSeconds = cost / (currentRate × (multiplier − 1))`.
- **Methodology #1 (math-only locks)** for fire-time band invariants. Probes 1+2 (`runIncomeRateBaselineProbe`, `runUnitCostScalingProbe`) ride `runUntil` with deterministic believability (0/0) and tunable-scope perturbation of baseIncomeRate / per-unit costs.
- **Framework-correctness gate** as probe 6 (`runArchetypeDominanceProbe`). 4×4 persona Cartesian; pass criterion is "all cells run end-to-end, at least one cell has wins" — verifying the per-archetype spawn/death instrumentation wires through to aggregate metrics. The threshold reading (`max single-archetype share ≤ 0.4`) is informational.

The probe-6 shape is **not currently named in BALANCING.md's methodology kit.** It's a per-archetype safety check (instrumentation wired correctly) rather than a tuning surface (no design knob is being moved by the probe). Tier-A/B/C ceremony excised at OL-954, but the "Tier-C taxonomy" had a corresponding role for these dominance / framework-correctness checks; the methodology numbering doesn't yet replace it.

- **Promotion candidate for BALANCING.md:** A short § "Framework-correctness probes" naming this shape. The methodology kit (#1–#7) tunes designed surfaces; framework-correctness probes verify the instrumentation is intact so methodology probes don't silently report on broken pipes. Common shapes: persona-Cartesian-pair instrumentation lock (this archetype), engine-event-counter wiring lock, save-load roundtrip lock. Distinct from regression locks (those pin chosen values; framework-correctness pins pipeline shape).

## What this pass did NOT learn

No new diagnostic vocabulary; no methodology stress; no engine-surface gap. The locked methodology vocabulary (#1–#7) covers Tug's surfaces cleanly modulo the framework-correctness gap above. The `tunable()` adoption pattern extended uniformly to all unit costs and all refinery tiers without engine changes — the engine already supports the cardinality.

The bilateral-symmetric sim-bot match-driver candidate (`open-loop-engine/docs/candidate-primitives.md` § bilateral-symmetric sim-bot pattern) stays parked at N=1. Graduation trigger is unmet — no second adversarial-state consumer has landed.

The data balance itself remains the known limitation flagged at `balance/bot.ts § Known limitation`: counter-vs-greed at default data produces a flat win-rate curve across the strongCounter sweep, which is the actionable signal that the underlying economy + roster + matrix balance needs procedural-persona tester-seat work. That's a separate balance-discovery surface filed as a follow-up; the methodology framework lands correctly.
