# Auditing

Audit is wrong-shape detection per archetype. This doc names the rules, anti-patterns, grep audit-criteria, and pass/flag thresholds an archetype is scored against. Every rule cites engine source via [`open-loop-engine/docs/api/INDEX.md`](../../open-loop-engine/docs/api/INDEX.md); when a hand-roll is found, the rule names the engine surface to refactor toward.

The reader is a developer auditing an archetype against the engine — first-pass review of a new archetype, rework triage on an existing one, or hygiene check before promoting to canonical-template status.

This is a living document. Per-archetype audit passes generate amendments; open the file and PR.

## Cite-out posture

This doc owns starter-side audit discipline.

- **Engine composition prescription** (positive: goal → engine path → min wiring) — lives in [`docs/engine-starter-cookbook.md`](../docs/engine-starter-cookbook.md). When this doc names a surface to adopt, the cookbook covers how to compose it.
- **Engine surface authority** — [`open-loop-engine/docs/api/INDEX.md`](../../open-loop-engine/docs/api/INDEX.md). The [`consumer-guide.md`](../../open-loop-engine/docs/consumer-guide.md) is narrative and may lag; when it conflicts with INDEX-confirmed source, source wins.
- **Candidate-primitive filing target** — [`open-loop-engine/docs/candidate-primitives.md`](../../open-loop-engine/docs/candidate-primitives.md). Falsified candidates from past audits are recorded in the appendix here; live candidates live there.
- **Balance discipline** — [`BALANCING.md`](BALANCING.md). Audit is wrong-shape detection; balance is rate-function design. Disjoint reading modes.

What's left for this doc: rule + anti-pattern + greppable audit-criterion + threshold per archetype.

Cross-corpus prevalence of a hand-roll is **not** evidence the engine is missing a surface. The frequent failure mode is the opposite: consumers reached for the wrong engine surface, hand-rolled around its limits, then the workaround propagates by copy-paste. N=4 of a workaround is N=4 wrong adoptions, not validation of a missing primitive. Treat every "the engine should add X" claim as a hypothesis to falsify against INDEX before promoting. The appendix at the bottom records candidates that didn't survive that pass.

## How to use this doc

**Authoring a new archetype.** Walk §§ 1–12 (engine-derived rules) and §§ 13–16 (starter / studio conventions) in order against your module set. Each section's audit criterion tells you what would trigger a flag in a review. For forward-design composition prescription on each rule's adopted surface, the cookbook companion at [`docs/engine-starter-cookbook.md`](../docs/engine-starter-cookbook.md) gives the goal → engine path → min wiring shape.

**Auditing an existing archetype.** For each section, score `pass` / `flag` / `n/a`. A `flag` either resolves locally (refactor in place to adopt the correct engine surface) or escalates to a candidate-primitive entry in [`open-loop-engine/docs/candidate-primitives.md`](../../open-loop-engine/docs/candidate-primitives.md) under the back-flow rules in [`/work/studio/CLAUDE.md`](../../CLAUDE.md) § Back-flows.

**Decision rule for "flag → primitive vs. flag → local fix":** if the engine surface that would replace the hand-roll exists today (per [`docs/api/INDEX.md`](../../open-loop-engine/docs/api/INDEX.md)), the fix is **local — adopt the surface**. If the engine surface doesn't exist and ≥2 *independent* consumers hand-roll the same shape (multiple sites in one consumer ≠ N=2), drop a candidate-primitive entry. N=1 stays a `TODO(expansion)` marker at the hand-roll site until N=2 collides. Before filing, grep INDEX for the symbol you're proposing and read the closest existing factory's options interface — confabulated candidates that duplicate existing options (`mapState`, `Computable<T>`, `effect: (amount) => …`) are the most common failure mode.

## Cross-reference table

Engine-derived rules cite the engine symbol the rule maps to and the cookbook recipe section that prescribes its composition. Starter-convention rules don't have an engine column.

| § | Rule | INDEX.md surface | Cookbook recipe |
|---|---|---|---|
| 1 | Layering: `data → modules → composables → ui` | — (consumer convention) | — |
| 2 | Persistence: `withPersistentContext` + category-scoped resets via `Resettable` | `withPersistentContext`, `persistent`, `Resettable`, `ResettableObject`, `createReset` | G-S1 |
| 3 | Cross-module reads: typed `ctx.provide` / `ctx.inject` keys; key discrimination (handles, not glue, not engine-registry duplicates) | `EngineContext.provide`, `EngineContext.inject`, `InjectionKey`, `ResourceRegistryKey`, `CategoriesKey`, `ChainRegistryKey` | G-S2 |
| 4 | Resource arithmetic: Level-1 helpers | `addResource`, `subtractResource`, `hasResource`, `displayResource`, `trackBest`, `trackTotal`, `resetResource` | G-S3 |
| 5 | Content registration: category factories with `mapState` for per-instance state | `createSkillCategory`, `createPurchasableCategory` (`mapState`), `createAchievementCategory`, `createProducerCategory` (`mapState`), `createChallengeCategory` | G-S4 |
| 6 | Per-instance scaling: `createScalingPurchasable` with the `effect: (amount) => Formula` shape; `createPurchasableGroup` for batch ops | `createScalingPurchasable`, `createPurchasableGroup`, `Formula`, `FormulaSource` | G-S5 |
| 7 | Conditional modifiers: declarative `grants` → `chain.bind` → `createPersistentEffectSystem` | `Grant`, `ModifierChain.bind`, `replacementBinding`, `createPersistentEffectSystem` | G-M7 / G-M8 / G-M9 |
| 8 | Lifecycle: `createLoop` + `createRetentionPolicy` for multi-tier; `createReset` for single-tier | `createLoop`, `createRetentionPolicy`, `createReset`, `fractional` | G-S1 (multi-tier sub-section) |
| 9 | Effect dispatch: reach for `applyEffect` / `Conversion` only when their semantics earn it; direct module-helper calls are correct for simple per-completion arithmetic | `applyEffect`, `createConversion`, `GameStateAccessorMutator`, `IEffect`, `E` | G-S7 |
| 10 | Tunables: `tunable()` over manual override-registry thunks | `tunable`, `createOverrideRegistry`, `OverrideRegistry` | G-S6 |
| 11 | Cross-tier modifier targeting: `ChainRegistry` over wide `ctx.inject` piles | `ChainRegistry`, `ChainRegistryKey`, `createChainRegistry`, `walkChainRegistry` | G-S8 |
| 12 | Multi-currency tier domains: `createResourceBag` over loose `createResource` | `createResourceBag`, `ResourceBag`, `bulkTransfer`, `transferBetweenBags` | G-S9 |
| 13 | First-arc citation discipline: file-header citations + invention tags | — (starter convention) | — |
| 14 | Composable graduation: 3+ identical hand-rolls across **independent archetypes** → promote to `src/composables/` | — (starter convention) | — |
| 15 | Manifest hygiene: shells reference real `src/lib/shells/` names | — (starter convention) | — |
| 16 | Comment hygiene: invariants only, no phase markers, no refactor history | — (studio CLAUDE.md § Comment hygiene) | — |
| 17 | Numeric type discipline — Pattern D (`DecimalSource`) default; cross-pattern hygiene (round-trips, reduce-renorm, relational operators) | `Decimal`, `bn`, `toNumber`, `renormIfLayer0`, `toFinalDecimal`, `Computable` | G-S15 |

---

## Engine-derived rules

### § 1 — Layering

**Rule.** `data/*.ts` is engine-runtime-free: no imports from `open-loop-engine` runtime surfaces (`createTimedProgress`, `Resource`, `TemporaryEffectSystem`, etc.). Type-only imports for declarative shapes (`ICondition`, `IEffect`) are acceptable; runtime imports are not. Modules import data; composables import modules; UI imports composables. Never reverse.

**Anti-pattern.** Data files import runtime engine surfaces and accept them as helper params (e.g. `isFooActive(runtime: TemporaryEffectSystem)` in `data/foo.ts`).

**Audit criterion.**
- `grep -rn "from 'open-loop-engine'" src/archetypes/<name>/data/` returns only `import type` lines.
- No data file declares a function whose param type is a non-type engine runtime ref.

**Threshold.** Zero runtime imports from `data/`. Any non-type import is a flag.

---

### § 2 — Persistence

**Rule.** Engine state that survives save/load lives inside `withPersistentContext('id', () => ({ ... }))` or via bare `persistent()` calls inside an active context. Category factories (`createPurchasableCategory`, `createSkillCategory`, etc.) open per-definition persistent contexts automatically — anything inside `mapState` is scoped to `{categoryId}/{def.id}` for free. Reset hierarchies use `Resettable` / `ResettableObject` membership; categories implement `Resettable` so they're reset by being included in the parent reset's `thingsToReset`, not by hand-enumerating refs.

**Anti-pattern.** Module-level non-persistent `let X` for state that needs to survive reload (mid-loop counters, per-session accumulators). Hand-enumerating per-def refs in a reset list when the category's `Resettable` member would handle it. Per-def `withPersistentContext(def.id, () => …)` blocks inside a hand-rolled `Map<string, …>` registry — the right surface is `mapState` on a category factory.

**Audit criterion.**
- Every `Resource`, `Persistent<T>`, `Sequencer`, `Loop`, `BestOf`, etc. that the module exposes is created inside `withPersistentContext` or category-scoped persistence.
- Reset lists pass `Resettable` instances (categories, conversions, loops) rather than enumerating their per-def refs.

**Threshold.** Zero persistent-state refs created outside a persistent context. Hand-enumerated reset lists that name per-def refs of a category-managed entity are a flag.

---

### § 3 — Cross-module communication

**Rule.** Cross-module state reads go through `ctx.provide(StateKey, state)` at install time and `ctx.inject(StateKey)` at the consuming site. `StateKey: InjectionKey<StateAPI>` lives in a per-archetype `injection-keys.ts`. The injection key exposes a narrow `StateAPI` interface — typically getters and methods, not the raw module's internal `let` slots.

**Rule (key discrimination).** Each provided key is a *typed handle to engine-managed state without a parallel engine-published registry* — an `OverrideRegistry` from `createOverrideRegistry`, a `Sequencer`, a `Loop`, a long-lived ref derived by an engine helper like `trackTotal`, a custom composite `*Api` interface that aggregates module exports. Values that can be derived from another key in a one-liner, thin `computed()` wrappers, raw config bags exposed to UI, and `persistent()` refs that shadow engine-tracked state do **not** earn keys. The discrimination test: if the value can be derived from another key's handle in a one-liner, inline it at the call site or make it a composable; minting a key freezes a derived shape into the cross-module contract and propagates by copy-paste once it exists.

**Rule (engine-published registries).** Three engine-managed handle types are auto-published on a per-engine registry, parallel to how `createModifierChain` auto-registers in `ChainRegistry`:

- `Resource` → `ResourceRegistryKey`
- `ProducerCategory` / `PurchasableCategory` / `AchievementCategory` / `ChallengeCategory` / `SkillCategory` → `CategoriesKey`
- `ModifierChain` → `ChainRegistryKey`

Consumer-side lookup goes through the registry by id, not via a parallel archetype-side `InjectionKey<T>`. The find-by-id helper shape is one helper at the top of the consumer module — `findCategoryById(cats, id)` in `scaler/modules/transcend.ts` is the post-OL-837 canonical example. Other engine handles that *don't* self-publish (`Reset`, `Sequencer`, `Loop`, `OverrideRegistry`, custom `*Api` aggregators) remain legitimate key values per the discrimination rule above.

**Anti-pattern.** `export let stateName: State | null = null` populated inside `install()` and read across modules via `import { stateName } from './foo'`. Adjacent variants: `import { getMana } from './mana'` calling a top-level export function that closes over module-scope state. Both bypass typed injection — order-of-init becomes load-bearing, every read needs `?.` against a possibly-null shadow registry, HMR can stale-bind. The fact that an archetype's `let X` slot holds an engine-primitive handle doesn't redeem the export channel.

**Anti-pattern (glue keys).** Five recurring shapes, all flag-local refactors:

- *Derivable wrapper.* Key whose value is a one-line transformation of another key's handle. Example: `AllRateChainsKey: ModifierChain[]` constructed as `buildings.getAll().map(e => e.producer.rateChain)`. Inline at the call site.
- *Thin computed wrapper.* Key whose value is a `computed()` that thinly wraps an engine method. Example: `HeadlineRateKey: ComputedRef<DecimalSource>` constructed as `computed(() => buildings.getTotalRate(primary))`. Composable-local scope is correct; the cross-module contract isn't.
- *Config exposure.* Key whose value is the archetype's raw data bag (e.g. `ProducerDataKey: ProducerData`). UI should reach engine instances (`upgrades.getEntry(id).def`), not the config that fed registration.
- *Engine-state duplicate.* Key wrapping a `persistent()` ref whose semantics are already tracked by an engine object. Example: a `ClickStateKey` exposing `persistent('clickCount')` when `clickProducer.count` (or, for activation counts not engine-tracked, a `mapState`-scoped counter on the click def) is the authoritative track. The fix is `mapState`, not a flat parallel persistent.
- *Engine-registry duplicate.* Key whose value is a handle the engine already self-publishes — `Resource` (in `ResourceRegistryKey`), any `XCategory` (in `CategoriesKey`), `ModifierChain` (in `ChainRegistryKey`). Examples: `PrimaryResourceKey: InjectionKey<Resource<DecimalSource>>`, `BuildingsKey: InjectionKey<ProducerCategory<…>>`, `IncomeRateChainKey: InjectionKey<ModifierChain>`. The handle is legitimate; the parallel injection key is redundant. Drop the key and the `ctx.provide`; consumers look up the specific instance through the registry by id (the `findCategoryById(cats, id)` helper in `scaler/modules/transcend.ts` is the canonical shape). Side-keyed records (`Record<Side, InjectionKey<XCategory<…>>>`) are the same anti-pattern with a per-side wrapper — collapse to per-side `findByName` lookups against the registry.

A passthrough composable (`useFooKey() { return useModule(FooKey) }` with nothing else in the body) is the downstream tell: when a composable adds nothing beyond `inject`, either the composable disappears (callers `useModule(FooKey)` directly) or the key disappears (and the composable derives from a kept handle). Names ending in `Data` / `All*` / `*State` / `*Rate` / `*Stats` warrant a discrimination check — they tag glue shapes more often than they tag legitimate handles.

**Not the same anti-pattern.** A `let X!: T` declared *inside* `install()` and assigned later in the same function (or in a sibling `connect()` on the same module) is closure-local and fine — provided every cross-module read still goes through `ctx.provide` / `ctx.inject`. The eslint-disable on `prefer-const` is style, not a structural problem. Don't conflate this with the cross-module shadow-registry shape; only the latter is a § 3 flag.

**Audit criterion.**
- `grep -rn "^export let.*State\|^export let.*: .* | null" src/archetypes/<name>/modules/` returns zero hits, or only legitimately-ephemeral state with co-located transience comments.
- Every `ctx.inject(Key)` call site has a corresponding `ctx.provide(Key, ...)` somewhere in the archetype.
- For each `ctx.provide(Key, value)`: `value` is not a `Resource`, an `XCategory`, or a `ModifierChain` — those go through the engine-published registries, not parallel keys. The five glue shapes above are the falsification list.
- `grep -rn "InjectionKey<\(Resource\|.*Category\|ModifierChain\)" src/archetypes/<name>/`: zero hits. These three handle types are engine-self-published; archetype-side keys for them are flag-local.
- Per-module `ctx.provide` count: a single module providing 5+ keys is a likely flag — re-evaluate which are typed handles vs which are wrappers.
- `grep -rn "return useModule(" src/archetypes/<name>/composables/`: each one-line passthrough composable points at either a key worth deleting or a composable worth deleting.

**Threshold.** Zero cross-module shadow-registry exports. Zero glue-shape keys (including engine-registry duplicates: `Resource`, `XCategory`, `ModifierChain` go through `ResourceRegistryKey` / `CategoriesKey` / `ChainRegistryKey`). A module providing keys for engine-managed state *not* covered by an engine-published registry — `OverrideRegistry`, `Sequencer`, `Loop`, `Reset`, custom `*Api` aggregators — passes regardless of count; a module providing 5+ keys with values that pattern-match the five glue shapes is a structural flag.

---

### § 4 — Resource arithmetic

**Rule.** Use the engine's Level-1 helpers: `addResource`, `subtractResource`, `hasResource`, `displayResource`, `trackBest`, `trackTotal`, `resetResource`. They aren't sugar — `subtractResource` returns a boolean so "check and spend" is one call; `addResource` accepts an optional modifier chain so yield multipliers apply at the call site.

**Anti-pattern.** Direct Decimal arithmetic against `resource.value` (`r.value = Decimal.add(r.value, ...)`, `if (Decimal.gte(r.value, cost)) { r.value = Decimal.sub(...) }`).

**Audit criterion.**
- `grep -rn "Decimal\.\(add\|sub\|mul\|div\)\(.*\.value" src/archetypes/<name>/modules/` returns near-zero hits.
- Spend paths use `subtractResource(r, cost)` and check the boolean return.

**Threshold.** Hand-rolled arithmetic on a resource's `.value` is a flag toward Level-1 adoption. Number is incidental; the rule is "use the helpers."

---

### § 5 — Content registration

**Rule.** Use the engine's category factories for content domains: `createSkillCategory`, `createPurchasableCategory`, `createProducerCategory`, `createAchievementCategory`, `createChallengeCategory`. Each factory opens a per-definition persistent context automatically (`{categoryId}/{def.id}`); register defs via `category.register(defs)`. Per-instance state beyond the category's standard def shape goes in the `mapState: (def, instance) => State` callback — both `PurchasableCategory` and `ProducerCategory` accept it as a second generic parameter on `Options`. Read with `category.getState(id)`.

**`CategoriesKey` is engine self-published.** Per [`open-loop-engine/src/systems/engine-categories.ts`](../../open-loop-engine/src/systems/engine-categories.ts), the five category factories (`createProducerCategory`, `createPurchasableCategory`, `createAchievementCategory`, `createChallengeCategory`, `createSkillCategory`) auto-append to a per-engine accumulator at construction time, parallel to how `createModifierChain` auto-registers into `ChainRegistry`. The accumulator is pre-provided under `CategoriesKey` before any module installs. Harness tooling and external introspection (BalanceWorkbench, sim pickers, content walkers) read the inventory via `engine.tryInject(CategoriesKey)` without any archetype-side publication step. Consumer-side `engine.provide(CategoriesKey, ...)` continues to work via `Map.set` overwrite — back-compat, not the prescribed shape. Any archetype-side `ctx.provide(CategoriesKey, ...)` is flag-local: the engine already covers the ground.

**Anti-pattern.**
- Hand-rolled `Map<string, T>` shadow registries for jobs/upgrades/skills/achievements that the engine has a category factory for.
- Hand-rolled per-def `withPersistentContext(def.id, () => …)` blocks for what `mapState` on a category factory would scope automatically. Calling code typically appears as a `createCategoryShim(...)`-style helper — a strong signal the author didn't find `mapState`.
- `categories.ts` (or `categories-publish.ts`) aggregator modules that re-inject owner modules and re-publish the union under `CategoriesKey`. Redundant with engine self-publish; the back-compat `Map.set` overwrite keeps them working but the engine pre-provides the same inventory. Each instance is flag-local — drop the module and remove its registration from the module list.
- Per-category injection keys — `UpgradesKey: InjectionKey<PurchasableCategory<…>>`, `BuildingsKey: InjectionKey<ProducerCategory<…>>`, `AchievementsKey: InjectionKey<AchievementCategory<…>>`, etc. The consume-side mirror of the aggregator-overwrite anti-pattern: see § 3's *engine-registry duplicate* — the engine's `CategoriesKey` self-publish makes both shapes redundant. Consumers look up specific categories via `findCategoryById(cats, id)`.

**Audit criterion.**
- For each content domain (skills, upgrades, achievements, jobs, producers, challenges): is there a `createXCategory` call, or a hand-rolled `Map`/`Array` doing the same job?
- For per-def state beyond the category's standard fields: is `mapState` used, or is there a hand-rolled per-def persistent block?
- `grep -rn "ctx.provide(CategoriesKey" src/archetypes/<name>/`: any hit is a flag-local; the engine already self-publishes.

**Threshold.** Zero hand-rolled `Map<string, ContentDef>` shadow registries for content the engine has a category for. Zero per-def persistent blocks where `mapState` would suffice. Any archetype-side `ctx.provide(CategoriesKey, ...)` is a flag-local — the engine pre-provides.

---

### § 6 — Per-instance scaling-purchasable loops

**Rule.** Geometric cost (`baseCost * costScaling^amount`) is what `createScalingPurchasable` already does; don't hand-roll it on top of raw `createPurchasable`. For per-level effect, the second-position `effect: (amount: MaybeRef<DecimalSource>) => FormulaSource` shape on `ScalingPurchasableOptions` passes the live amount ref into the closure — there is no need to forward-declare the purchasable to read its own amount.

When each definition genuinely needs its own post-creation closure that the category surface can't model (a side-channel `chain.bind` closing over per-def refs, an `onPurchase` writing into a sibling skill, a per-instance lookup map), drop to raw `createScalingPurchasable` inside a `for`-loop and wrap the resulting collection with `createPurchasableGroup` so tooling that walks `CategoriesKey` can still enumerate them.

**Anti-pattern.**
- Reaching for raw `createPurchasable` to express geometric cost ladders that `createScalingPurchasable` handles natively. Symptom: `cost: () => Decimal.mul(def.baseCost, Decimal.pow(scaling, purchasable.amount.value))` requiring a forward-declared `let purchasable!: Purchasable` and an `eslint-disable prefer-const`.
- Forward-declaring the *category* (`let category: PurchasableCategory<...>; ... category = createPurchasableCategory(...)`) so per-def `mapPurchasable` closures can read `category.getPurchasable(def.id)?.amount.value`. The `mapState: (def, purchasable) => State` callback already provides the per-instance handle without a forward reference.
- Dropping to raw `createScalingPurchasable` and skipping `createPurchasableGroup` — tooling that walks `CategoriesKey` can't see the resulting purchasables.

**Audit criterion.**
- `grep -rn "eslint-disable.*prefer-const" src/archetypes/<name>/modules/` is zero — every hit is a forward-reference workaround for one of the misuses above.
- Every raw `for`-loop over `createScalingPurchasable` ends with a `createPurchasableGroup` registration.

**Threshold.** Zero `eslint-disable prefer-const` markers tied to purchasable or category self-reference workarounds.

---

### § 7 — Conditional modifier wiring

The engine offers three levels for "modifier active when condition holds." Pick the most specific that fits.

**Rule (level 1, prefer first).** Declarative category fields: `grants` / `restricts` / `rewards` on a purchasable, achievement, or challenge category def. Each `Grant` lowers to a `chain.bind` call with scope-derived attribution. Zero per-binding ceremony.

**Rule (level 2).** `chain.bind({ active, modifier })` for one-off bindings that don't fit a category signal — ad-hoc module-level buffs, single binary-gate-single-chain bonuses. Auto-derives an attribution id from the ambient `withPersistentContext` scope.

**Rule (level 3, last resort).** `createPersistentEffectSystem` only when (a) the binding spans multiple chains that must activate/deactivate atomically, (b) `onActivate`/`onDeactivate` hooks fire game-side side-effects, or (c) registration happens outside any category-driven persistent context. Each criterion has a real corpus example; defaulting to Level-3 because it's familiar is the anti-pattern.

**Anti-pattern.** Routing every conditional modifier through `createPersistentEffectSystem.register` — including binary-gate-single-chain bindings that are textbook `chain.bind` cases. Symptom: `alwaysActive: computed(() => true)` registrations, or per-module `PersistentEffectSystem` instances created solely to tag attribution scope.

**Audit criterion.**
- Count `createPersistentEffectSystem` adoption sites that satisfy at least one of (a)/(b)/(c). Sites that satisfy none are flags toward `chain.bind` or `grants`.
- Count `createMultiplicativeModifier({ multiplier: 1, description: 'Base ...' })` no-op modifiers — they contribute nothing and exist to fake a base entry. Flag for removal.

**Threshold.** Zero `alwaysActive: computed(() => true)` registrations. Zero no-op base modifiers. `createPersistentEffectSystem` instances each carry a co-located comment naming which of (a)/(b)/(c) justifies them.

**Override-replacement.** When a challenge or prestige layer replaces one multiplier with another while active, use `replacementBinding` to generate the cancel + replacement pair as one call. Do not use `OverrideRegistry` for this — that bypasses the chain and defeats balance-sim attribution.

---

### § 8 — Lifecycle reset

**Rule.** For multi-tier reset hierarchies (life → reincarnation → NG+ → prestige), use `createLoop` + `createRetentionPolicy`. The loop's `endCondition` / `thingsToReset` / `onBeforeRestart` / `onRestart` hooks compose ordering correctly; `createRetentionPolicy.keep` (and the `fractional` helper) is the declarative "what survives this reset" contract. Two-tier hierarchies wire the inner loop's persistent refs into the outer loop's reset list.

For single-tier resets without lifecycle (a prestige conversion, a one-shot reincarnation), `createReset` + a conversion's `reset` option is the right shape.

**Anti-pattern.** Hand-rolled reset bypasses (drainLevels, side-table snapshots) when `createRetentionPolicy.keep` would express the rule declaratively. Manual ref enumeration in `thingsToReset` when the category instances themselves implement `Resettable` and can be passed as units.

**Audit criterion.**
- Reset hierarchies use the engine primitives, not hand-rolled ref-zeroing loops.
- Retention is expressed as a `keep` list, not as "snapshot before reset → restore after."

**Threshold.** Zero hand-rolled "snapshot then restore" reset paths.

---

### § 9 — Effect dispatch

**Rule.** Reach for an engine effect primitive when its semantics earn the indirection — not by default. Two earned cases:

- **`applyEffect` against `GameStateAccessorMutator`.** Use when the data layer authentically declares `IEffect` arrays (engine-shaped declarative effects with `E.resource` / `E.state` / `E.composite` builders), or when a third party — a mod, a content authoring tool, a save-replay layer — needs to hand the dispatcher effect data without knowing the consumer's module shape. The accessor is the boundary between declarative and imperative.
- **`createConversion`.** Use for atomic multi-input → multi-output transforms whose math reads pre-mutation values (recipes, exchanges, market trades, prestige). Conversion's snapshot semantics are the load-bearing feature; nothing else in the engine gives them.

For everything else — a 4-line `switch (effect.kind)` calling module helpers (`addMana(amt)`, `addResourceAmount('gold', amt)`) — the direct shape is correct. Per-completion arithmetic is too small for the engine pipeline to earn its weight, and the indirection actively hides the math.

**Anti-pattern.** Building a `GameStateAccessorMutator` purely to satisfy a § 9 dogma when no caller benefits — the accessor becomes 90 lines of unused interface methods adapting domain-tagged data unions into `IEffect` and back into the same module helpers the original direct call already invoked. Equally: hand-rolling a snapshot-and-credit pipeline for a multi-input atomic transform when `createConversion` would express it.

**Audit criterion.**
- Multi-input atomic transforms use `createConversion` (or surface a `flag-primitive` if the engine path is genuinely missing).
- Hand-rolled effect dispatchers handling 1–6 cases with direct module-helper calls are pass — not anti-pattern.
- Routes to `applyEffect` exist only where the data truly carries `IEffect[]` or a third party needs the boundary.

**Threshold.** Pass unless: a multi-input snapshot is hand-rolled (Conversion-shape miss), or a `GameStateAccessorMutator` is built without a justifying consumer (over-application of the rule).

---

### § 10 — Tunables

**Rule.** Wrap balance constants the consumer needs to perturb (sim solver, dev panel, mod config) with `tunable(registry, 'category/entity/field', () => default)`. Leave structural constants (thresholds with architectural meaning, fixed step counts) unwrapped — the tunable surface doubles as documentation of *what's a knob*. Pass the resulting `ComputedRef` directly into engine factories that accept `Computable<T>` (e.g. `ProducerPurchaseConfig.baseCost`, `ScalingPurchasableOptions.limit`); no wrapper helper is needed.

Apply the canonical-numbers rule: cited-from-vanilla balance values are not perturbable. The tunable surface is for declared-invention numbers. Mass-wrapping every balance constant fudges the canonical balance.

The prescribed shape: keep a module-level `TUNABLE_*_IDS: Set<string>` constant naming the entities whose knob is registered, and inline the conditional at the mapper site:

```ts
const TUNABLE_BASE_COST_IDS = new Set(['cursor', 'grandma']);
// ...
mapProducer: (def) => ({
  // ...
  baseCost: TUNABLE_BASE_COST_IDS.has(def.id)
    ? tunable(registry, `producers/${def.id}/purchase/baseCost`, () => def.purchase.baseCost)
    : def.purchase.baseCost,
  // ...
}),
```

The Set survives as the greppable knob inventory; the conditional rides the mapper closure. No helper, no wrapper return-type union to thread through.

**Anti-pattern.**
- Hand-rolled `wrapBaseCost` / `wrapThreshold` shims around `tunable()` that conditionally swap between a tunable ref and the raw def value. The engine's `Computable<T>` already accepts `T | Readonly<Ref<T>> | (() => T)` — the conditional belongs at the mapper site, not in a helper that returns a discriminated union.
- `createOverrideRegistry` exists, but reads happen via manual `overrides.get('key')()` thunks at every read site — losing the no-default-fallback story `tunable()` provides.
- Wrapping cited-from-vanilla numbers, perturbing them, and treating sim output as balance signal.

**Audit criterion.**
- Wrapped values are declared inventions or genuinely-tuning-bearing knobs.
- Read sites use the wrapped `ComputedRef` (or pass it directly into a `Computable`-typed engine option), not manual registry-get thunks.
- No `wrapBaseCost` / `wrapThreshold`-shaped helper exists in the archetype; the inline shape is the prescribed pattern.

**Threshold.** ≤10% of balance constants are tunable-wrapped (rough guide — varies by archetype). All wrapped values either have a row-level invention tag or a co-located comment naming the tuning purpose.

---

### § 11 — Modifier-target addressing across tiers

**Rule.** When cross-tier content (a prestige challenge gating a tier-2 production chain) needs to address modifier targets in sibling modules, use `ChainRegistry`. The engine ships it today: `createChainRegistry` is auto-published under `ChainRegistryKey` (`src/index.ts:529`); modifier chains created via `createModifierChain` auto-register under stable string ids (`src/core/modifier.ts:524`); the harness picker walks the registry via `walkChainRegistry`. Cross-tier modules read by string id via `engine.inject(ChainRegistryKey).get(chainId)` — they don't need to inject every sibling tier to surface its rate chain.

**Anti-pattern.** Wide `ctx.inject` piles in cross-cutting modules — every sibling tier injected to surface its rate chain or to walk per-tier producers. Each addition couples the cross-tier module to the count of tiers; the registry decouples it.

The hand-rolled `collectRateChains(producers, tier)` helper that scans `producers.getAll().map(e => e.producer.rateChain)` is a one-liner masquerading as reusable infrastructure. It's not a primitive candidate; just inline the one-liner where needed, or use the registry's `walkChainRegistry` if the consumer is harness-side.

**Audit criterion.**
- Per module: count `ctx.inject(...)` calls. A cross-tier module that injects 5+ sibling-tier modules is a flag toward `ChainRegistry` adoption.
- Cross-tier challenge modules that address rate chains: do they `engine.inject(ChainRegistryKey)`, or do they inject each tier and walk its `getAll()`?

**Threshold.** A cross-tier module's `ctx.inject` call count grows with the number of tiers — that's a flag, regardless of the absolute count. Cross-tier challenge content that addresses chains by string id is `pass`.

---

### § 12 — Multi-currency tier domains

**Rule.** When an archetype layers N typed currencies in parallel tier domains (coins / prestige-points / shards / dust / ...), use `createResourceBag` with typed keys. The bag exposes reactive `link()`, capacity hooks, and `bulkTransfer` / `transferBetweenBags` helpers. Six independent `createResource` calls for what's a typed multi-currency container is the textbook ResourceBag-bypass case.

**Anti-pattern.** N parallel `createResource` calls without a unifying bag — each currency standalone, no batch ops, no cross-currency tooling visibility.

**Audit criterion.**
- Multi-currency tier domains use `createResourceBag` or carry a co-located comment naming the bypass reason.

**Threshold.** Standalone `createResource` calls in a single tier-system module that share a tier domain is a flag toward `ResourceBag`.

---

## Starter / studio conventions

These rules don't derive from engine surface — they live in starter convention or studio process. The audit-scoring framework is the same, but the resolution is local-only (a `flag-primitive` outcome doesn't apply).

### § 13 — First-arc citation discipline

**Rule.** Per [`/work/studio/open-loop-starter/CLAUDE.md`](../CLAUDE.md) § Archetype convention: file-header citation block at the top of each `data/*.ts` file naming the canonical source files and line ranges the file lifts from. Per-row inline tags (`// invention: <reason>`) are reserved for declared inventions where a row diverges from canonical. Ids, display names, and numbers carry 1:1 with the chosen exemplar.

**Audit criterion.**
- Every `data/*.ts` file with content lifted from a canonical exemplar carries a file-header citation block naming the canonical source files and line ranges.
- Declared-invention rows carry an inline `// invention: <reason>` tag.
- Citations resolve to a real file in the named exemplar (studio paths per `/work/studio/CLAUDE.md`; corpus exemplars live under `open-loop-research/reference-code/<name>/`).

**Threshold.** Every `data/*.ts` file with lifted content has a file-header citation block; declared-invention rows are inline-tagged.

---

### § 14 — Composable graduation

**Rule.** Engine→Vue bridge composables (`useChainBreakdown`, `useAchievements`, `useHeadlineRate`, etc.) live per-archetype until 3+ **independent** archetypes hand-roll structurally identical copies; at that point, promote to `src/composables/`. Independence matters: 3 archetypes that copy-pasted from a fourth is N=1 with cargo-cult lineage, not N=3 convergence. Promotion criteria: identical skeleton (param shape, return shape, watch/computed pattern), per-archetype variation in predicate or content only.

**Anti-pattern.**
- Hand-rolling a composable a fourth time when the third copy already converged on an independent shape.
- Promoting a composable on N=2, or on N=3-by-copy-paste lineage (insufficient signal — the true-third-instance often surfaces the real abstraction).
- Promoting a composable that's tied to a single starter UI affordance (a one-shot popup, a specific panel layout) — it's archetype content shaped like a composable, not a reusable bridge.

**Audit criterion.**
- For each composable name appearing in 3+ archetype `composables/` directories: is the skeleton identical, *and* did each instance arise independently?
- Each shared composable in `src/composables/` carries a comment naming the original 3+ hand-roll sources for traceability.

**Threshold.** Composables with N=3 *independent* identical hand-rolls flag for graduation; composables with N=2, copy-paste lineage, or single-UI-affordance scope stay per-archetype.

---

### § 15 — Manifest hygiene

**Rule.** `manifest.ts:shell` references one of the 5 layout shells in `src/lib/shells/`. Manifest fields document the archetype's slot/UI roster; fields no consumer reads are dropped (no gallery exists yet — drop or specialize speculative fields).

**Anti-pattern.** Shell field claims a shell name that doesn't exist in `src/lib/shells/`. Manifest fields populated to satisfy a future gallery that doesn't exist.

**Audit criterion.**
- `grep -rn "shell:" src/archetypes/<name>/manifest.ts` value matches one of `src/lib/shells/*.vue` filenames.
- Each manifest field is read by at least one consumer (boot, dev panel, gallery placeholder, etc.).

**Threshold.** Zero shell-name mismatches. Each manifest field has a documented reader.

---

### § 16 — Comment hygiene

**Rule.** Per [`/work/studio/CLAUDE.md`](../../CLAUDE.md) § Comment hygiene: comments document invariants, non-obvious constraints, and external-cause workarounds. Nothing else.

**Anti-pattern.**
- Phase markers: `(matches old mapAction.speed)`, `pre-F2 runner behavior`, `F1 substrate`, `the post-rewrite shape`.
- Refactor history: `was a side-table before X`, `// removed in Y`.
- Spec section cross-references: `per spec § 4.2` (couples comments to doc numbering that drifts).
- TODO markers without `(expansion)` / `(ergonomics)` qualifier.

**Audit criterion.**
- `grep -rn "F1\|F2\|pre-rewrite\|post-rewrite\|matches old\|was a " src/archetypes/<name>/` returns zero hits.
- TODO markers use the qualified form: `TODO(expansion)`, `TODO(ergonomics)`.

**Threshold.** Zero phase markers / refactor history comments. Every `TODO` is qualified.

---

### § 17 — Numeric type discipline (Decimal hygiene)

**Rule.** Game quantities default to `DecimalSource` (Pattern D). The engine's `Decimal.{add,sub,mul,div,min,max,eq,gt,gte,lt,lte}` statics dispatch on `typeof number` operands and run native math when the result fits IEEE 754 double precision (sub-`1e15`), then promote to a fresh `Decimal` so chain calls (`.clamp().toNumber()`) keep working; predicates skip even the wrap (`open-loop-engine/src/primitives/decimal.ts:80–161`). Pattern D fast-paths down to roughly native cost on small values and graduates to `break_eternity` storage past `1e15` — drift-resistance is the load-bearing property: the same code keeps working as a fork extends an archetype's value range past JS Number territory.

Construction: `bn(x: DecimalSource): Decimal` is the canonical wrapper. Native conversion at boundaries: `toNumber(x: DecimalSource): number` (fast-path identity on raw `number`, single `.toNumber()` on Decimal/string).

**Pattern L (log-space inner) — off-default escalation, per-formula.** Inner math on plain numbers carrying logs; `Decimal.pow(10, logVal)` at the materialization boundary. Adopt only when (a) intermediates would saturate even break_eternity's storage at the target scale, OR (b) the closed-form inverse is materially simpler in log-space (AD's `getMaxBought` inverts a quadratic in log-money). Co-locate a comment naming the reason. Don't escalate the surrounding archetype — Pattern D for everything else, Pattern L only for the specific formula. Reference: `incremental-math/src/pages/modern/big-numbers.mdx`.

**Pattern N (native `number`) — off-default, perf-budget-justified.** Data fields and internal math typed `number`; engine boundary takes `Computable<DecimalSource>` which accepts raw `number`. Adopt only with a documented per-tick perf budget that justifies forwards-incompatibility with NG+ / scale-extension layers. Most archetypes shouldn't.

**Anti-pattern.**

- *Boundary round-trips.* `Number(new Decimal(x).toString())` allocates, serializes, re-parses. Use `toNumber(x)`. The chain form `new Decimal(x).toNumber()` is the same hazard with one less allocation — also use `toNumber(x)`.
- *Raw relational operators on Decimal-typed values.* `a < b` / `a > b` / `a <= b` / `a >= b`. Past `1e308` both sides saturate to JS `Infinity` and the comparison silently returns `false`. Always `Decimal.lt/gt/lte/gte` (static) or instance method form. The starter ESLint config carries a `no-decimal-relational-operator` custom rule enforcing this.
- *Manual `new Decimal(x)`* for single-argument construction where `bn(x)` reads the same and matches the engine's canonical wrapper. Multi-argument constructions stay.
- Pattern L or Pattern N adoption without a co-located comment naming the reason (saturation / inverse ergonomics for L; perf budget for N).

**Reduce-on-Decimal.** `for (...) { acc = Decimal.add(acc, x) }` promotes `acc` to a Decimal instance after iter 0, so subsequent iterations miss the typeof fast path. The cost is one `new Decimal(...)` allocation plus a layer-0 native-math call per iter — microseconds in absolute terms, irrelevant for the loop sizes that show up in incremental-game code (queue items, stat-weight maps, producer lists — all under ~50 iters). Pattern D's drift-resistance is more valuable than the perf delta. Leave reduces in their natural Decimal shape; don't refactor for hygiene. Audit only flags reduce sites if profiling shows them in a measured hot path.

**Audit criterion.**

- `grep -rn 'Number(new Decimal(' src/archetypes/<name>/` returns zero hits.
- `grep -rn 'new Decimal(' src/archetypes/<name>/` returns near-zero hits — every remaining hit is multi-argument or carries a justification comment. New code uses `bn(x)`.
- The starter ESLint config's `no-decimal-relational-operator` custom rule lints raw relational operators on Decimal-typed values to error.
- Pattern L and Pattern N adoption sites carry a co-located comment naming the reason. Sites without justification revert to Pattern D.

**Threshold.** Zero round-trips. Zero raw relational operators on Decimal-typed values (lint-enforced). Pattern L and Pattern N sites without justification comments are flag-local toward Pattern D.

---

## Audit-scoring summary

For each section:
- `pass` — rule is met across the archetype.
- `flag-local` — rule is violated; fix is a local refactor adopting an existing engine or starter surface.
- `flag-primitive` — rule is violated; engine surface doesn't exist; ≥2 *independent* consumers hand-roll the shape; entry to `candidate-primitives.md`. Only applies to engine-derived rules (§§ 1–12).
- `n/a` — rule doesn't apply (no multi-currency tiers, no cross-tier challenges, etc.).

A clean archetype passes §§ 1–16 with `pass` on each, or carries `n/a` on rules that don't apply, or carries a `flag-primitive` entry that's filed in `candidate-primitives.md`. `flag-local` rows must close before the archetype is promoted to canonical-template status.

---

## Section ownership

This doc is the durable artifact. Per-section content beyond rule + anti-pattern + audit criterion + threshold is filled in progressively by the audit leaves under [umbrella OL-825](../../). Each audit leaf adds:
- Citation rows to per-section worked examples (positive + negative shapes with `file:line`).
- New candidate-primitive entries when audit surfaces gaps that survive the falsification check below.

Subsequent audits *update*, not append-only — when an audit reshapes a rule, the rule changes everywhere; the doc is timeless prescriptive content, not a changelog.

---

## Appendix: candidates that didn't survive critical eval

The OL-826 corpus harvest surfaced a list of "NEW candidate-primitives" the doc was originally going to cite forward. A falsification pass against [`docs/api/INDEX.md`](../../open-loop-engine/docs/api/INDEX.md) and the source files behind it killed every entry on engine-side grounds. The list is preserved below so future audits don't re-confabulate the same items. **None are filed in `candidate-primitives.md`.**

| Proposed candidate | Critical-eval verdict |
|---|---|
| `extraState hook on createPurchasableCategory.mapPurchasable` | **Confabulated.** The engine ships `mapState: (def, instance) => State` as a second-arg callback on `PurchasableCategoryOptions` (`src/systems/purchasable-category.ts:85`). The hand-rolled `createCategoryShim`-style wrappers are missed adoption. |
| `producer.purchase.baseCost as Computable` | **Confabulated.** `ProducerPurchaseConfig.baseCost` is already `Computable<DecimalSource>` (`src/systems/producer-category.ts:45`). `wrapBaseCost` / `TUNABLE_BASE_COST_IDS` shims are missed adoption — pass `tunable(...)` directly. |
| `MaybeRef<T>` brand fix | **Confabulated.** Engine's `MaybeRef` is imported from `vue` (`src/core/computed.ts:9`) — same brand the starter uses. The hand-rolled `resolveMaybe` is a buggy substitute for `unref`. Fix is replacing it with `unref()`. |
| `category.allRateChains()` accessor | **Trivial.** `producers.getAll().map(e => e.producer.rateChain)` is a one-liner. The 4-site `collectRateChains(producers, tier)` helper is dust, not a missing primitive. Inline at the call site. |
| `ChainRegistry` adoption | **Already shipped.** `ChainRegistryKey`, `createChainRegistry`, and `walkChainRegistry` exist (`src/core/chain-registry.ts`, `src/harness/picker/walk-chain-registry.ts`); the engine auto-publishes the registry (`src/index.ts:529`); chains auto-register on creation (`src/core/modifier.ts:524`). The "adoption pattern" gap is doc/audit, not primitive. |
| `withSelf` / `mapPurchasable: (def, self) => …` | **Confabulated.** Both observed cases are wrong-surface adoptions: scaler/antimatter uses raw `createPurchasable` with a hand-rolled geometric cost where `createScalingPurchasable`'s `baseCost * costScaling^amount` shape already fits (`src/systems/purchasable.ts:148–192`); scaler/prestige forward-declares the category to read per-def state where `mapState: (def, purchasable) => State` would supply the instance handle without forward-reference. |
| Cross-phase install/connect state | **Misdiagnosed.** A `let X!: T` declared inside `install()` and assigned later, with cross-module reads still going through `ctx.provide` / `ctx.inject`, is closure-local — not a cross-phase shadow registry. The eslint-disable on `prefer-const` is style. The genuine § 3 anti-pattern is `export let X: State \| null = null` cross-module exports; that's spell-compiler / incloneution shape, not scaler. |
| `createArcLatch({ id, complete, flavour })` | **Starter UI artifact.** Three archetypes' `arc.ts` files latch a "completion announced" boolean for a one-shot popup. Predicate body varies; the latch+watch+persistent skeleton is Vue + `persistent()` basics. Not engine; arguably not even a starter composable (single-UI-affordance scope per § 14). |
| `ambient-attribution-aware chain.bind` | **N=1, premature.** Per the candidate-primitives.md drop-grep-ticket loop, N=1 is a `TODO(expansion)` marker, not a candidate entry. |
| `createSegmentMachine`, `createEffectKeyDispatcher`, `Emittable.replace(handler)` | **N=1 each, premature.** Each is a one-consumer ergonomics observation; below the N=2 *independent-consumer* threshold for filing. |

The pattern these share: the consumer reached for an engine surface that didn't fit (raw `createPurchasable` for geometric cost; `let X` aggregators when category factories handle persistence), hand-rolled around the misfit, then propagated the workaround. The archetype audits' job is to catch the wrong-surface choice and refactor to the correct one — not to file candidates for primitives that already exist.

When an audit surfaces a *new* candidate (one that doesn't pattern-match the verdicts above), the falsification protocol is:
1. Grep INDEX for the proposed symbol name and any obvious synonyms.
2. Read the closest existing factory's `Options` interface end-to-end.
3. Read the closest existing factory's source for callbacks (`mapState`, `mapProducer`, `effect`, `onPurchase`, etc.) that may already cover the use case.
4. If steps 1–3 don't land it, confirm N≥2 *independent-consumer* hand-rolls before dropping into `candidate-primitives.md`.

## See also

- `archetypes/BALANCING.md` — balance discipline companion (rate-function design, methodology choice, regression locks). Disjoint from audit; reach for it during balance passes, not review.
- `docs/engine-starter-cookbook.md` — engine composition recipes (goal → engine path → min wiring). When this doc names a surface to adopt, the cookbook covers how to compose it.
- `archetypes/<name>.md` — per-archetype doc; calls patterns and cross-pattern properties by name. Audit results land as amendments here, not separately.
- `open-loop-engine/docs/api/INDEX.md` — per-symbol engine surface authority. Every § 2–12 rule cites a symbol from here.
- `open-loop-engine/docs/candidate-primitives.md` — filing target for engine gaps that survived the falsification protocol.
