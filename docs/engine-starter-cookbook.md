# Engine starter cookbook

Engine composition recipes for starter consumers. This doc names the goals an archetype wants the engine to express and the idiomatic engine path that expresses each one — goal → engine path → minimum wiring. The reader is a developer composing engine surfaces from starter — feature design, archetype build-out, or fork extension.

This is a living document. New goal patterns surfaced by feature work and new engine surfaces that earn a row get added; open the file and PR.

## Cite-out posture

This doc owns starter-side composition prescription.

- **Audit discipline** (negative: rule + anti-pattern + grep + threshold) — lives in [`../archetypes/AUDITING.md`](../archetypes/AUDITING.md). When this doc names an engine path, AUDITING covers what wrong-shape adoption to flag at review.
- **Engine surface authority** — [`open-loop-engine/docs/api/INDEX.md`](../../open-loop-engine/docs/api/INDEX.md). Every recipe in this doc cites a symbol from there.
- **Per-chunk source extracts** — [`engine-starter-cookbook/extracts/`](engine-starter-cookbook/extracts/). The 212 individual subsystem rows behind this doc's goal patterns live there.
- **Candidate-primitive filing target** — [`open-loop-engine/docs/candidate-primitives.md`](../../open-loop-engine/docs/candidate-primitives.md). Partial-verdict recipes cite an entry here.

What's left for this doc: cross-chunk goal patterns + min wiring + verdict per goal.

## 1. Headline

Across **212 subsystem rows** drawn from 15 archetypes (the same corpus the [closed-form-progression subsystem inventory](../../open-loop-research/methodology/techniques/closed-form-progression/subsystem-inventory.md) runs against), **156 rows (73.6%) adopt an existing engine surface cleanly**, **15 rows (7.1%) adopt with a known awkwardness already filed in [`open-loop-engine/docs/candidate-primitives.md`](../../open-loop-engine/docs/candidate-primitives.md)**, and **41 rows (19.3%) are genuinely substrate-only** — bifurcation territory where the engine intentionally provides composition substrate (harness, sim runtime, spatial primitives) rather than a single primitive.

**Net-new gaps surfaced by this pass: 0.** Every "gap" candidate that survived the falsification protocol matches an entry already in `candidate-primitives.md`. The engine's API surface is genuinely complete against the archetype design corpus — what's left to ship is graduation work on filed candidates, not new candidate discovery.

This is the load-bearing finding: the sidecar's primary job was to falsify the corpus doc's risk that "rules baked in by cross-corpus prevalence" understated the engine's coverage. The result is the opposite — the engine has more coverage than the corpus convergence would suggest, because cross-corpus convergence routinely captured wrong-surface adoptions that propagated by copy-paste rather than missing primitives.

## 2. The unit and the data

The unit is the **subsystem goal**: an abstracted statement of what an archetype wants the engine to express, derived from the per-archetype subsystem rows in [`open-loop-research/inbox/closed-form-progression/<archetype>.md`](../../open-loop-research/inbox/closed-form-progression/). The closed-form-progression methodology already decomposed each archetype to its rate-bearing subsystems and cited vanilla source receipts — those rows are this pass's input.

Methodology per row, applied uniformly across three Sonnet subagents (one per archetype cluster):

1. Read the closed-form-progression row's `Subsystem (pattern instance)` + `Closed form` + `Receipt` columns to anchor the goal in plain terms.
2. Walk [`open-loop-engine/docs/api/INDEX.md`](../../open-loop-engine/docs/api/INDEX.md) end-to-end + targeted `src/` for the engine surface that expresses the goal idiomatically. Read the closest factory's `Options` interface in full; check callbacks (`mapState`, `mapProducer`, `effect`, `onPurchase`, `grants`, `restricts`, etc.).
3. Apply the falsification protocol from [`../archetypes/AUDITING.md`](../archetypes/AUDITING.md) § Appendix verbatim before declaring a gap.
4. Decide verdict: `adopt` (clean fit), `partial` (named ergonomics gap, candidate filed), `gap` (engine missing, no candidate yet), `n/a — substrate` (bifurcation territory; engine provides composition substrate, name it).

Per-chunk extracts are in [`extracts/`](engine-starter-cookbook/extracts/) (`chunk-1-economy-spine.md`, `chunk-2-loop-driven.md`, `chunk-3-sim-adversarial.md`). Cross-chunk synthesis (this doc) deduplicates goals across archetypes and groups by grain.

Total rows: 212. Total archetypes: 15. Total cross-chunk goal patterns: 22. Total partial-verdict rows: 15 (mapping to 11 distinct candidate-primitives.md entries).

## 3. Aggregate tables

### 3.1 Per-verdict roll

| Verdict          | Rows | %       |
| ---------------- | ---- | ------- |
| Adopt            | 156  | 73.6 %  |
| Partial          | 15   | 7.1 %   |
| n/a — substrate  | 41   | 19.3 %  |
| Gap (net-new)    | 0    | 0 %     |
| **Total**        | 212  | 100 %   |

### 3.2 Per-archetype roll

| Archetype     | Rows | Adopt | Partial | n/a   | Gap | Adopt % |
| ------------- | ---- | ----- | ------- | ----- | --- | ------- |
| Producer      | 9    | 9     | 0       | 0     | 0   | 100 %   |
| Ambient       | 7    | 6     | 1       | 0     | 0   | 86 %    |
| Scaler        | 14   | 9     | 2       | 3     | 0   | 64 %    |
| Interlocker   | 15   | 11    | 2       | 2     | 0   | 73 %    |
| Phase-shifter | 30   | 22    | 2       | 6     | 0   | 73 %    |
| Looper        | 18   | 15    | 0       | 3     | 0   | 83 %    |
| Scripter      | 12   | 7     | 0       | 5     | 0   | 58 %    |
| Explorer      | 14   | 10    | 1       | 3     | 0   | 71 %    |
| Packer        | 12   | 7     | 1       | 4     | 0   | 58 %    |
| Cycler        | 12   | 9     | 0       | 3     | 0   | 75 %    |
| Defender      | 16   | 13    | 1       | 2     | 0   | 81 %    |
| Survivor      | 14   | 13    | 1       | 0     | 0   | 93 %    |
| Tug           | 12   | 7     | 2       | 3     | 0   | 58 %    |
| Director      | 11   | 6     | 0       | 5     | 0   | 55 %    |
| Auto-battler  | 16   | 12    | 2       | 2     | 0   | 75 %    |
| **Total**     | 212  | 156   | 15      | 41    | 0   | 73.6 %  |

The four archetypes with the highest substrate density (Director 45 %, Scripter 42 %, Tug 25 %, Packer 33 %) are the bifurcation-heavy ones the closed-form-progression inventory already flagged in its § 4 commentary (Director 54 % non-decomposable, Scripter 33 % non-decomposable, Tug 40 % non-decomposable). The substrate verdict aligns with the bifurcation classification: where rate-functions don't close into the algebra, the engine provides composition substrate, not a primitive.

### 3.3 Per-grain roll

| Grain     | Rows | %      |
| --------- | ---- | ------ |
| Math      | 102  | 48 %   |
| System    | 76   | 36 %   |
| Component | 34   | 16 %   |

Math-grain rows (rate functions, formulas, scaling shapes) dominate because the closed-form-progression input is rate-function-organized. System-grain rows are registration surfaces and lifecycle. Component-grain rows are per-instance closures and bindings.

## 4. Cross-chunk goal patterns

The 212 rows collapse into 22 distinct cross-chunk goal patterns. Each section is "to express **goal**, use **engine path**, like this." Anti-patterns are residual one-liners; the corpus doc already names them with full audit criterion + threshold detail.

### 4.1 Math grain — rate functions and scaling

**G-M1. Constant-rate accumulation with modifier-product scaling** (`R(t) = base · count · ∏ μᵢ · t`).
Engine path: `createProducerCategory` with `trigger: 'continuous'`, modifier sources bound onto each producer's `rateChain`. The reference implementation. Producer #2, Ambient #1, Interlocker #1, Phase-shifter #17/#22, Director #2, plus every other rate-bearing row in the corpus.

```ts
const buildings = createProducerCategory<BuildingDef>({
  id: 'buildings', registerTick: ctx.onTick,
  mapProducer: (def) => ({ resource: primary, baseRate: def.baseRate, trigger: 'continuous',
    purchase: { costResource: primary, baseCost: def.baseCost, costScaling: def.costScaling } }),
});
```

**G-M2. Click action — manual-trigger producer with modifier-product yield.**
Engine path: same `createProducerCategory` with `trigger: 'manual'`. Click yield is a producer; the modifier chain is shared shape with continuous producers. Producer #1.

**G-M3. Geometric cost ladder** (`Cost(n) = baseCost · m^n`).
Engine path: `ProducerPurchaseConfig.costScaling` for producers; `createScalingPurchasable` for non-producer purchasables. Producer #3, Ambient #3, Interlocker #2, Phase-shifter #1/#2, Scripter #5, Packer #10, Cycler #2, Defender #6, Survivor #8, Director #7, Auto-battler #6. The bulk-buy partial-sum inversion is `calculateMaxAffordable` over a `Formula` chain (Producer #4).

**G-M4. Linear / polynomial cost** (`Cost(n) = base + step · n` or `base · n^p`).
Engine path: raw `createPurchasable` with a cost closure reading `purchasable.amount.value` (no self-reference workaround needed — `mapPurchasable: (def, instance) => …` exposes the instance handle directly per [`PurchasableCategoryOptions`](../../open-loop-engine/src/systems/purchasable-category.ts)). Phase-shifter #3/#16.

**G-M5. Piecewise-quadratic-in-log cost** (AD-shape post-threshold cost acceleration).
Engine path: hand-rolled cost closure over `createPurchasable` until graduation. Filed: `costScaling: { threshold, scale }` candidate. Scaler #2/#7. **Partial.**

**G-M6. Modifier chain composition** (`r = r_base · ∏ μᵢ`).
Engine path: `createModifierChain` + `createMultiplicativeModifier` (or `createAdditiveModifier`, `createExponentialModifier`, `createSequentialModifier`). Universal across the corpus — appears in every chunk in dozens of rows. The chain is the engine's primary modifier-product surface; modifier values close over reactive refs.

**G-M7. Conditional modifier scoped to a category lifecycle** (active while purchasable owned / achievement earned / challenge running).
Engine path: declarative `grants` / `restricts` / `rewards` field on category def. Lowers to `chain.bind` automatically with scope-derived attribution. Producer #5/#6, Scaler #8/#9, Survivor #9/#12, Director #8.

**G-M8. Conditional modifier without category signal** (one-off binary-gate-single-chain bindings).
Engine path: `chain.bind({ active, modifier })` directly. Auto-derives attribution from `withPersistentContext` scope. Interlocker #6, Phase-shifter #11/#12.

**G-M9. Multi-chain atomic conditional binding with side-effect hooks.**
Engine path: `createPersistentEffectSystem` — only when `chain.bind` can't cover (multi-chain atomic activation, `onActivate`/`onDeactivate` hooks, or registration outside any category-driven persistent context). Default to G-M7/G-M8; `createPersistentEffectSystem` is the ladder's third rung, not first.

**G-M10. Achievement-count multiplicative bonus** (each earned achievement contributes a factor; cumulative `∏ effect_i`).
Engine path: `createAchievementCategory` with `effect: () => def.rewardMultiplier`; bind `getCombinedAchievementEffect(allAchievements)` onto headline chain via a single `createMultiplicativeModifier`. Producer #7, Ambient #5, Scaler #14, Interlocker #14, Survivor #11.

**G-M11. XP-to-level skill curve** (triangular, log, polynomial, geometric variants).
Engine path: `createSkill` with `xpToLevel: FormulaSource` inside `createSkillCategory.mapState`. The formula is invertible when expressed as a `Formula` chain; `createSkill.xpCurve.invert()` answers "XP needed for level N" without consumer math. Looper #1/#2/#13, Scripter #3, Phase-shifter #27, Survivor #3.

**G-M12. Level-driven multiplier** (`mult = 1 + level^p / k`, `m^level`).
Engine path: `LevelDrivenSkill` sub-shape with `levelToMultiplier: (level) => Formula…`. The skill exposes `.modifier` directly, pluggable into any `createModifierChain`. Looper #6/#11, Auto-battler #2.

**G-M13. Logistic / soft-capped rate** (`reservoir(t) = K · (1 − e^{-r·t})` shape).
Engine path: `createMultiplicativeModifier` getter implementing the logistic; or `createResource` with `max: Computable<DecimalSource>` for capped storage. No dedicated logistic primitive needed — the formula is tight enough that the modifier closure carries it cleanly. Director #2 (reservoir refill), Phase-shifter #8 (creativity rate), Explorer #12 (HP scaling).

**G-M14. Piecewise-constant by integer threshold or enum regime.**
Engine path: `createMultiplicativeModifier` getter switching on the threshold/enum value. No dedicated piecewise primitive needed for simple integer thresholds (Scaler #3 tickspeed regime split, Interlocker #7 tier-step multiplier, Cycler #1/#3 phase-scoped modifiers). For enum-state regime gates (Cycler season, Phase-shifter phase), the gate is the `enabled` callback on the modifier.

**G-M15. Prestige conversion formula** (`gain = log/poly/sqrt(base)`).
Engine path: `createCumulativeConversion` (or `createIndependentConversion` for state-decoupled prestige) with a `Formula`-chain `formula` for invertibility (so `nextAt` displays). Plain function fallback if invertibility isn't needed. Producer #8 (optional), Ambient #7, Scaler #4/#5, Phase-shifter #14, Packer #12, Cycler #12, Interlocker #15, Survivor — none. The invertibility question (Scaler #4/#5 open) resolves through `Formula.variable(x).log10().div(div).sub(0.75)` — the chain inverts as long as each operation does.

### 4.2 System grain — registration, lifecycle, persistence

**G-S1. Persistence + reset hierarchy.**
Engine path: `withPersistentContext` for resources and persistent state; category factories scope per-def contexts automatically (`{categoryId}/{def.id}`); `createReset` with `Resettable`-instance `thingsToReset` (categories implement `Resettable`); `createRetentionPolicy` with `keep` lists for what survives.

For **multi-tier reset hierarchies** (life → reincarnation → NG+), use `createLoop` + `createRetentionPolicy.keep` (with the `fractional()` helper for partial carryover, e.g. PK2 task-level retention via `fractional(recallEffect)`). Looper #15/#16, Director #11, Cycler #7/#9, Tug #8, Survivor #7, Auto-battler #15.

**G-S2. Cross-module communication.**
Engine path: typed `ctx.provide(Key, value)` at install; `ctx.inject(Key)` at consuming sites. `Key: InjectionKey<API>` lives in a per-archetype `injection-keys.ts`. The injection key exposes a narrow read-API, not raw refs. The engine self-publishes `CategoriesKey` / `ChainRegistryKey` / `EffectSystemRegistryKey` / `ResourceRegistryKey` from primitive construction; archetypes don't republish them.

Each key is a *typed handle to engine-managed state* — a category from `createXCategory`, a resource from `createResource`, an `OverrideRegistry` from `createOverrideRegistry`, a long-lived ref derived by an engine helper like `trackTotal`. Values derivable from another key in a one-liner (`buildings.getAll().map(e => e.producer.rateChain)`), thin `computed()` wrappers (`computed(() => buildings.getTotalRate(primary))`), the raw config bag the modules registered against, and `persistent()` refs that shadow engine-tracked state don't earn keys — they live as composable-local computes or call-site walks. For per-instance state the category's standard fields don't expose, use `mapState: (def, instance) => State` on the category factory; the engine scopes a per-def persistent context (`{categoryId}/{def.id}`) automatically, no parallel injection needed. A composable whose body is `return useModule(FooKey)` is the tell that the abstraction collapsed — either drop the composable (callers inject directly) or drop the key (the composable derives from a kept handle). Modules providing 4–5 typed handles to live engine objects pass cleanly; modules providing wrappers and config bags should retreat to a smaller key surface.

**G-S3. Resource arithmetic — Level 1.**
Engine path: `addResource`, `subtractResource`, `hasResource`, `displayResource`, `trackBest`, `trackTotal`, `resetResource`. These are the API, not sugar — `subtractResource` returns `boolean` for "check and spend" in one call; `addResource` accepts an optional modifier chain so yield multipliers apply at the call site.

**G-S4. Content registration — category factories.**
Engine path: `createSkillCategory`, `createPurchasableCategory`, `createProducerCategory`, `createAchievementCategory`, `createChallengeCategory`, `createDialogCategory`, `createRelationshipCategory`. Each opens per-def persistent contexts automatically; per-instance state goes in `mapState: (def, instance) => State` (a callback already on `PurchasableCategoryOptions` and `ProducerCategoryOptions`).

**G-S5. Per-instance scaling — the three paths.**
Engine path is shape-determined, not name-determined:

- **Rate-bearing → `createProducerCategory`.** Bundles cost, count, rate aggregation, autobuy, and payback metric.
- **No rate, batch shape → `createPurchasableCategory`.** Definition shape covers many instances; `limit` selects the sub-shape (1 for upgrades/gates, finite cap for capped repeatables, omitted for unbounded).
- **Per-instance closures, post-creation wiring → raw `createScalingPurchasable` inside a `for`-loop.** Wrap with `createPurchasableGroup` so tooling that walks `CategoriesKey` still sees them.

**G-S6. Tunable knobs.**
Engine path: `tunable(registry, 'category/entity/field', () => default)` over manual override-registry thunks. Pass the resulting `ComputedRef` directly into engine factories that accept `Computable<T>` (e.g. `ProducerPurchaseConfig.baseCost`); no helper wrapper is needed. Cited-from-vanilla numbers stay unwrapped — the `tunable` surface doubles as documentation of what's a knob.

**G-S7. Effect dispatch — declarative effects.**
Engine path: `applyEffect(effect, mutator, mutator)` against a `GameStateAccessorMutator` captured at install time. Effect lists in `data/` are `IEffect[]`. Use this when effects come from data (save replay, mod configs, content patches); the typed path is preferred when effects come from in-scope refs.

**G-S8. Modifier-target addressing across tiers.**
Engine path: `ChainRegistry` (auto-published under `ChainRegistryKey`; chains created via `createModifierChain` auto-register). Cross-tier modules read by string id via `engine.inject(ChainRegistryKey).get(chainId)` — no per-tier injection. The harness picker walks the registry via `walkChainRegistry`.

**G-S9. Multi-currency tier domains.**
Engine path: `createResourceBag` with typed keys for parallel multi-currency containers. Reactive `link()`, capacity hooks, `bulkTransfer` / `transferBetweenBags` helpers. Standalone `createResource` calls in a single tier-system module that share a tier domain bypass the bag.

**G-S10. Sequencer — scheduled content.**
Engine path: `createSequencer` for queue/cursor/round-robin scheduling. Modes: `'queue'` (FIFO pop), `'list'` (cursor walks, items persist — Looper's queue-as-plan shape). Strategies: `createRoundRobinStrategy`, `createPriorityStrategy`, `createConditionalStrategy`, `createCompositeStrategy`. Looper #15, Defender #13, Survivor #4, Auto-battler #8, Tug #3.

**G-S11. Phase-scoped modifier gating.**
Engine path: `createMultiplicativeModifier` with `enabled: () => phase.value === 'build'` callback (the `Grant.when` lowering). Cycler #1/#3/#8 — the OL-568-verified path. The `createPhaseMachine` ergonomics candidate covers ≥3 `Grant.when`-gated chains for the same phase axis, which a 3-phase Phase-shifter implementation hits on first impl. Phase-shifter #9/#13. **Partial.**

**G-S12. Predicate-gated visibility flip** (unlock without cost).
Engine path: `createPurchasableCategory` with `createBooleanRequirement` + `setupSweepAutoPurchase`. The purchasable's `active.value` flips on the first tick the requirement is met. Producer #8, Ambient #4, Interlocker #9/#18, Phase-shifter #18/#21, Looper #12, Explorer #6/#7/#14, Cycler #9, Tug #9, Auto-battler #7. Universal cross-archetype shape.

**G-S13. Tiered achievement / threshold-gated content.**
Engine path: `createTieredAchievement` with explicit threshold array and per-tier `effect`. Each tier crossing fires the effect once. Phase-shifter #7 (Fibonacci milestones), Phase-shifter #24 (CB2 phase transitions).

**G-S14. Time-gated cooldowns and progress timers.**
Engine path: `createTimedProgress` with `Computable<DecimalSource>` duration. The duration getter closes over reactive refs — adaptive timers (Dome Keeper formula) feed the duration directly. Phase-shifter #15, Cycler #11.

### 4.3 Component grain — bindings, closures, per-instance

**G-C1. Cross-action / cross-content bonuses.**
Engine path: `chain.bind({ active, modifier })` reading the source's state via `active`, the bonus value via the modifier's `multiplier` getter. For binary gates (owned / unlocked), the `active` predicate is the check. For level-scaled bonuses (source level multiplies target), the binding stays always-active and the multiplier evaluates to `1` at zero source — no special binary gate needed. Interlocker #6, Phase-shifter #11/#12, Defender #11.

**G-C2. Synergy bonuses with spatial neighbour query.**
Engine path: `createSpatialGrid.getNeighbours(pos)` + `createAdditiveModifier` or `createMultiplicativeModifier` per matched neighbour, bound onto the cell's chain. Synergy evaluation runs on placement; the chain is rebuilt on swap. Packer #2/#8, Defender #11.

**G-C3. Frozen per-placement random offset.**
Engine path: `persistent<DecimalSource>` seeded at placement via `createSeededRNG` / `random` + a `createMultiplicativeModifier` reading the seeded value. The modifier value is constant once placed. Interlocker #8.

**G-C4. Conjunction over predicates.**
Engine path: `Requirements` arrays are conjunctions; `createBooleanRequirement` with a closure can carry compound boolean logic. Multi-resource cost requirements use multiple `createCostRequirement` entries in the same array. Interlocker #3 — **partial** for the missing tooltip ergonomics; the engine surface composes correctly today.

## 5. Substrate-only goals (bifurcation territory)

41 rows hit one of the named bifurcation buckets from [`bifurcations.md`](../../open-loop-research/methodology/techniques/closed-form-progression/bifurcations.md). The engine's answer is composition substrate, not a single primitive — these are `n/a — substrate` verdicts citing the substrate by name.

**Combinatorial-selection** (8 rows: Looper #15-as-plan-not-substrate, Scripter #11, Explorer #10, Packer #3/#9, Scaler #13, Director #5, Defender #16). Per-fixed-selection the chains close (G-M6); across selections it's strategy-space search. Substrate: harness picker/walker for combinatorial unlock graphs; `createSpatialGrid` + scoring closures for arrangement; `createSlot` for typed selection.

**Optimal-stopping** (9 rows: Producer #optional-prestige, Looper #18, Scripter #9, Cycler #12, Scaler #11/#12, Tug #10, Defender #14, Auto-battler #12, Phase-shifter #30, Interlocker #15). Per-fixed-strategy ROI closes; the optimal threshold is Bellman over the policy space. Substrate: `runMatrix` over reset-threshold strategies; `runUntil` for arc-time probing; `bisectTuner` for closed-form threshold solve; `createGoalPicker` / `createBestReplayStrategy` for advisory ranking. The decision policy itself stays consumer-side game logic.

**Coupled-state deterministic** (8 rows: Looper #14 health decay, Cycler #6 combat traversal, Director #3/#9 frontier collision + AI emergence, Tug #5/#7 lane dynamics, Phase-shifter #20/#25 minigame combat). Substrate: `createGameLoop` tick callback for ODE integration; `runUntil({ condition: ... })` for outcome probing. The per-tick rate function closes; the trajectory integrates numerically.

**Stochastic load-bearing** (8 rows: Phase-shifter #4 wire market, Scripter #8 HWGW, Explorer #8/#11 drops + encounters, Packer #7 shop refresh, Survivor #5 level-up offer, Auto-battler #10 shop draws, Interlocker #10/#11). Substrate: `chance(p)` for Bernoulli; `weightedPick` for weighted draws; `randomItem` / `shuffle` for uniform; `createSeededRNG` for determinism; `runSensitivity` for distribution-shape probing.

**Network-topological** (7 rows: Scripter #10 RAM allocation, Explorer #9 path planning, Cycler #10 dig-path, Defender #12 maze TD, Director #4/#10 Dijkstra + topology, Auto-battler #11). Substrate: `createSpatialGrid` for grid topology; `createSpatialGraph` for arbitrary node/edge graphs (carries directed/weighted via options); `createInfluenceLayer` for scalar-intensity fields. The flow/Dijkstra/min-cut algorithm itself is consumer-side until the `createFlowField`/`createInfluenceField` candidate graduates (N=2 trigger met: borglike + Director).

**Strategy-space integration** (1 row: Tug #6, Auto-battler #13). Adversarial composition equilibrium across multiple agents. Substrate: `runMatrix` over a strategy-axis × seeds; balance tooling tracks distribution per strategy. Equilibrium reasoning lives in research, not engine code.

**Discrete-event coupled** (1 row: Auto-battler #11). Combinatorial trigger ordering across `on-attack`/`on-hurt`/`on-faint`/`on-kill` chains. Substrate: `createSpatialGrid` + per-unit `createModifierChain` + seeded RNG. The combat resolver is consumer-sim code.

## 6. Convergence with `AUDITING.md`

The two docs are companions: this cookbook owns positive recipes (goal → engine path → min wiring); [`AUDITING.md`](../archetypes/AUDITING.md) owns audit discipline (rule + anti-pattern + grep + threshold). Their methodologies were independent — the audit doc was synthesized "shapes consumers do → rules about them" from a 2026-corpus harvest; this cookbook walks "goal → engine path" engine-first. Where they map to each other:

| AUDITING § | Topic                              | Cookbook recipe                      | Convergence                                                            |
| ---------- | ---------------------------------- | ------------------------------------ | ---------------------------------------------------------------------- |
| § 1        | Layering (data → modules → ui)     | —                                    | Audit-only (starter convention; no engine-derivation)                  |
| § 2        | Persistence + Resettable           | G-S1                                 | Agree                                                                  |
| § 3        | Cross-module via `ctx.provide/inject` | G-S2                              | Agree                                                                  |
| § 4        | Resource arithmetic — Level 1      | G-S3                                 | Agree                                                                  |
| § 5        | Content registration — categories  | G-S4                                 | Agree                                                                  |
| § 6        | Per-instance scaling-purchasable   | G-S5                                 | Agree (cookbook extends — names the three paths explicitly)            |
| § 7        | Conditional modifier ladder        | G-M7 / G-M8 / G-M9                   | Agree (cookbook splits into three engine paths matching the audit's three levels) |
| § 8        | Lifecycle reset                    | G-S1 (multi-tier sub-section)        | Agree                                                                  |
| § 9        | Effect dispatch via `applyEffect`  | G-S7                                 | Agree                                                                  |
| § 10       | Tunables                           | G-S6                                 | Agree                                                                  |
| § 11       | Modifier-target addressing         | G-S8                                 | Agree                                                                  |
| § 12       | Multi-currency tier domains        | G-S9                                 | Agree                                                                  |
| § 13       | Slim-port discipline               | —                                    | Audit-only (starter convention)                                        |
| § 14       | Composable graduation              | —                                    | Audit-only (starter convention)                                        |
| § 15       | Manifest hygiene                   | —                                    | Audit-only (starter convention)                                        |
| § 16       | Comment hygiene                    | —                                    | Audit-only (studio convention)                                         |
| —          | Math grain (rate-function spine)   | G-M1 through G-M15                   | **Cookbook-extends** — audit § 4 covers Level-1 helpers; cookbook adds the rate-function composition prescriptions (producer rate spines, skill curves, conversions, soft caps) |
| —          | Sequencer + scheduled content      | G-S10                                | **Cookbook-extends** — audit doc didn't pin a Sequencer rule           |
| —          | Phase-scoped gating                | G-S11                                | **Cookbook-extends** — audit § 7 covers conditional modifiers; cookbook names phase-axis ergonomics explicitly |
| —          | Predicate-gated visibility         | G-S12                                | **Cookbook-extends** — pervasive cross-archetype shape; audit § 5 covers category registration but not the predicate-gate sub-pattern |
| —          | Time-gated progress                | G-S14                                | **Cookbook-extends** — `createTimedProgress` is audit-doc absent       |
| —          | Cross-action bonuses               | G-C1                                 | **Cookbook-extends** — `consumer-guide.md` names this; audit didn't pin it |
| —          | Spatial neighbour synergy          | G-C2                                 | **Cookbook-extends** — audit didn't cover spatial archetypes           |
| —          | Substrate-only bifurcation paths   | § 5 of this doc                      | **Cookbook-only** — engine-first surfaces bifurcation-bucket → substrate mapping; not present in audit-doc methodology |

**Where they agree.** All 12 audit engine-derived rules survive the engine-first pass with substantively the same prescriptions. No § 1–12 rule reverses or weakens.

**Where this doc extends.** Eight engine-first sections (G-M*, G-S10–S14, G-C1–C2, § 5) name surfaces or sub-patterns the audit doc didn't pin. None contradict the audit; they fill in coverage at parts of the engine API the audit's source corpus didn't exercise (rate-function math, spatial archetypes, sim-as-gameplay substrate).

**Methodology convergence.** The risk the cookbook was authored to mitigate (audit-doc cross-corpus convergence baking in wrong-surface adoptions as engine gaps) did not materialize against §§ 1–12. The engine-first walk produced no recipe that contradicts an audit rule. The two methodologies converge cleanly; the cookbook extends coverage rather than overturning audit rules.

## 7. Falsification log — partial-verdict rows

15 rows landed `partial` because the engine surface composes correctly today but with named ergonomics gaps. Each is mapped to its filed `candidate-primitives.md` entry below; the gap is tracked, not novel.

| Row              | Goal                                                | Filed candidate                                                        |
| ---------------- | --------------------------------------------------- | ---------------------------------------------------------------------- |
| Ambient #6       | Offline accumulation efficiency multiplier          | **Not yet filed** — N=1 (ergonomics-only). Drop on first hand-roll site. |
| Scaler #2        | Piecewise-quadratic-in-log post-threshold cost      | `costScaling: { threshold, scale }` (genre-default per `incremental-math` cost-acceleration) |
| Scaler #7        | Softcaps on prestige formulas                       | Same `costScaling: { threshold, scale }` candidate                     |
| Interlocker #3   | Multi-resource cost conjunction tooltip ergonomics  | **Not yet filed** — N=1 (engine surface composes; tooltip walking is consumer-side). |
| Interlocker #4   | Multi-input/output recipe (N-in/M-out)              | `Combine-up recipe primitive (N-in / M-out)` (Interlocker + Auto-battler N=2 already cited; **graduation eligible**) |
| Phase-shifter #9 | Phase transition + mechanic lifecycle gate          | `createPhaseMachine` (Cycler + Phase-shifter cited; first Phase-shifter impl reaches the ≥3 `Grant.when` graduation trigger on its own) |
| Phase-shifter #13 | Multi-predicate phase transition gate              | Same `createPhaseMachine`                                              |
| Explorer #3      | Fog-of-war visibility state                         | **Not yet filed** — pre-threshold. N=1; drop on first second-consumer hand-roll. |
| Packer #4        | Combine-up / merge mechanic                         | `Combine-up recipe primitive` (same entry as Interlocker #4)           |
| Defender #10     | Gem combine mechanic                                | Same combine-up recipe candidate. Note: shape distinct from Auto-battler star-tier scaling (which is `createSkillCategory` accumulator, not N-in/M-out recipe). |
| Survivor #5      | Level-up offer pool with pool-state tracking        | `Draft-pool weighted sampling`                                         |
| Tug #2           | Income-upgrade payback ROI                          | `purchasablePaybackSeconds` (Tug N=1 — first-consumer filing)          |
| Tug #11          | Symmetric mirrored module instances                 | `createSymmetricModuleSet` (Tug N=1 — first-consumer filing)           |
| Auto-battler #10 | Shop draft pool (private + multiplayer-shared)      | `createSharedPool` (multiplayer-pre-designed) + `Draft-pool weighted sampling` (sampling ergonomics) |
| Auto-battler #16 | Grid placement auto-resolve                         | `createPlacementResolver` (Packer + Auto-battler cited)                |

**Three "not yet filed" gaps surfaced this pass.** Ambient #6 (offline efficiency), Interlocker #3 (multi-resource cost tooltip), Explorer #3 (fog-of-war state). All are pre-threshold (N=1, ergonomics-only) and don't warrant immediate filing — the drop-grep-ticket loop expects N=2 collision before promotion. Drop `TODO(expansion)` markers at the hand-roll sites if/when implemented; second-consumer hits become filing triggers.

**N=2 graduation triggers confirmed.** Five candidates have crossed or are at the graduation threshold:
- `createFlowField / createInfluenceField` — borglike + Director (N=2 met).
- `Combine-up recipe primitive` — Interlocker + Auto-battler + Defender + Packer (N=4, well past trigger). The shape question (recipe N-in/M-out vs. tier-accumulator vs. star-tier scaling) is graduation's first task; the chunks confirm at least two distinct shapes hide in the citations.
- `Draft-pool weighted sampling` — Survivor + Auto-battler + Packer (N=3); without-replacement semantics differ across consumers (graduation's first task: unify or split).
- `createPlacementResolver` — Packer + Auto-battler (N=2 met).
- `createPhaseMachine` — Cycler + Phase-shifter (N=2; Phase-shifter implementation is itself the trigger as described in the candidate's graduation criterion).

## 8. Open questions surfaced by this pass

Live questions from the engine-first walk. The first five are coverage notes for `AUDITING.md` — areas where the cookbook prescribes a recipe but no corresponding audit rule exists yet, so wrong-shape adoptions in these areas wouldn't get flagged at review. The last three are engine graduation work — questions that block filed candidate-primitives from advancing.

1. **Spatial-archetype coverage in audit.** `AUDITING.md`'s rule set didn't drive coverage of `createSpatialGrid` / `createSpatialGraph` / `createInfluenceLayer` / `createSlot` adoptions. If archetype rework surfaces hand-rolled cell arrays + neighbour math where these surfaces fit, file an audit rule covering the right surface.
2. **Sim-as-gameplay substrate in audit.** `runMatrix` / `runUntil` / `eventDrivenProbe` / `bisectTuner` aren't audit-rule-covered. Sim-as-fallback is design-time substrate, not runtime archetype code; sim-as-gameplay (Defender / Director / Auto-battler / Survivor combat) is runtime. The latter merits an audit rule if hand-rolled tick loops show up where the harness primitives would compose.
3. **Sequencer adoption in audit.** G-S10 names a recipe the audit doesn't pin. Looper queue-as-plan shapes and Defender/Survivor/Auto-battler scheduled content are the canonical hand-roll sites. File an audit rule when a second consumer hand-rolls a queue/cursor instead of `createSequencer`.
4. **Phase-axis ergonomics in audit.** G-S11 + the `createPhaseMachine` graduation note are first-impl-trigger material. AUDITING § 7 conditional-modifier ladder doesn't pin phase-axis gating; either extend § 7 with a phase-axis sub-section or stand up a separate phase-scoping rule.
5. **Predicate-gated visibility in audit.** G-S12 is the most-shared cross-archetype shape (12 archetypes, ~14 rows). Pervasive enough that an audit rule covering hand-rolled visibility flags vs `createBooleanRequirement` + `setupSweepAutoPurchase` would catch wrong-shape adoptions across nearly every archetype.
6. **Combine-up shape divergence.** Defender gem-combine (recipe N-in/M-out), Auto-battler star-tier (accumulator), Packer combine-up (Backpack-shape merge), Interlocker recipe (production N-in/M-out). The graduation research ticket for `Combine-up recipe primitive` has to resolve whether these are one primitive with modes or split siblings — N=4 makes the question urgent.
7. **Draft-pool without-replacement semantics.** Survivor (per-run pool narrows as loadout fills) vs. Auto-battler private (i.i.d. each refresh) vs. Auto-battler shared (hypergeometric across players) vs. Packer (tier-weighted with hero affinity). Same candidate primitive citation; four distinct semantics. Graduation research ticket's first task.
8. **Closed-form bulk-buy invertibility chain validation.** Scaler #4/#5 prestige conversions need `Formula.variable(x).log10().div(div).sub(0.75)` to be invertible end-to-end so `nextAt` displays. Confirm against `Formula.invert()` source whether each operation in the chain has an inverse, or whether `ConversionOptions.formula` should accept a plain function with manual `nextAt` opt-out.

## 9. See also

- [`../archetypes/AUDITING.md`](../archetypes/AUDITING.md) — the audit-discipline companion. Cookbook owns positive prescription; AUDITING owns rule + anti-pattern + grep + threshold for review-time scoring. Read alongside for §§ 2–12 engine-derived rules where the two methodologies converge.
- [`../archetypes/BALANCING.md`](../archetypes/BALANCING.md) — balance-discipline companion. Disjoint reading mode: balance is rate-function design, this doc is engine composition.
- [`open-loop-research/methodology/techniques/closed-form-progression/subsystem-inventory.md`](../../open-loop-research/methodology/techniques/closed-form-progression/subsystem-inventory.md) — the structural template this doc mirrors, with the closed-form-decomposability classification replacing engine-path-adoption classification on the same 212-row corpus.
- [`open-loop-engine/docs/api/INDEX.md`](../../open-loop-engine/docs/api/INDEX.md) — per-symbol engine surface authority. Every recipe in this doc cites a symbol from here.
- [`open-loop-engine/docs/consumer-guide.md`](../../open-loop-engine/docs/consumer-guide.md) — narrative companion; the abstraction-spectrum framing (Levels 1–4) underlies G-S3 / G-S4 / G-S5.
- [`open-loop-engine/docs/candidate-primitives.md`](../../open-loop-engine/docs/candidate-primitives.md) — filing target for engine gaps. Every `partial` verdict in § 7 of this doc cites an entry here.
- [`extracts/`](engine-starter-cookbook/extracts/) — per-chunk source extracts (chunk-1-economy-spine.md, chunk-2-loop-driven.md, chunk-3-sim-adversarial.md). The 212 individual rows live there.
