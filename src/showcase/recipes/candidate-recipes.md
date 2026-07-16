# Candidate Recipes

Starter-hosted staging surface for **recipes** — reusable compositions of engine
primitives, stripped of archetype coupling — pending deliberate evaluation. Sibling to
engine `candidate-primitives.md` and research `candidate-patterns.md` on the
shared back-flow cadence (`/work/studio/CLAUDE.md` § Back-flows): N=1-named-only,
N=2 drop, N=3 deliberate dive. This is the recipe lane — compositions that only
re-wire existing primitives — worked through as a batch before anything moves.

Dropping here is explicitly a decision **not** to file an engine candidate yet.

**Companion — `candidate-recipes-ui.md`** holds the *presentation & bridge*
flavor: shapes whose repetition is purely in the UI layer (app assembly,
composables, panels, widgets). Same surface, same cadence, same counting rule —
split by flavor so each file stays readable in one pass. This file indexes
recipes by their *wiring*; a shape indexed here doesn't get a second entry there
just because its UI copies rode along.

## Primitive vs recipe

- **Primitive** — an atomic engine capability: one unit of API that other code
  composes *with*, not *from*. You can't build it out of existing primitives — if
  you could, it wouldn't need to exist. Type-safe, reactive, fits the engine
  layering. Ships in the engine; every consumer imports the same instance.
  *(`createResource`, `ModifierChain`, `Sequencer`, `SpatialGrid`.)*
- **Recipe** — a reusable *composition* of primitives: a wiring shape plus the
  naming and convention decisions around it, parameterized so it's portable
  across archetypes. Expressible in existing primitives by definition — which is
  exactly what disqualifies it as a primitive. Lives as *code you copy*, not API
  you import. *(Two-sided match lifecycle, bilateral sim-bot, indirect-control
  worker pool.)*

**The one-test discriminator** — delete the thing. Does a consumer now have to
invent new *engine API*, or just re-wire *existing* API?

- Invent API → **primitive** gap. Engine's problem; drop in
  `open-loop-engine/docs/candidate-primitives.md`.
- Re-wire API → **recipe**. Starter's problem; drop here.

**Against research patterns:** a *pattern*
(`open-loop-research/patterns/candidate-patterns.md`) is design vocabulary — what
the player experiences ("prestige loop", "adversarial spine"). A *recipe* is the
code composition that realizes it. The stack: **pattern → recipe → primitive**.

## How this surface works

- **Drop at N=2.** The second time a shape is *independently* hand-rolled —
  anywhere in the studio — index it here; don't wait, and don't route it to the
  engine. The count is over independent instances, not repos: a starter archetype
  and a consumer game each count once (see § Sourcing scope below).
- **What counts as an instance: live and independently maintained code** — a copy
  someone would have to fix *twice*. This, not copy-vs-original, is the line. A
  fork-copy counts once it ships and is maintained on its own; divergence between
  two copies is itself the evidence that it is. What doesn't count: unwired
  staging copies, vendored upstream source, anything excluded from typecheck or
  awaiting deletion — nobody maintains it, so it can't diverge, so it was never a
  second instance. The rule is one line because the alternative is a growing list
  of special cases for trees that are all not-maintained for the same reason.
- **The unit of independence is the consumer boundary, not the file.** Two copies
  inside one archetype (or one game) travel together, under one owner, fixed in
  one sitting — that's ordinary internal repetition, and it counts once. Two
  copies in different archetypes travel to *different* forks and get fixed by
  different people, or don't. Same word, different weight: tug's
  `useIncomeUpgrades` says it "mirrors `useUnits` shape" — deliberate, same
  author, same fork, N=1. ambient's autobuyer surface silently drifted off
  producer's — N=2, and the drift is the proof.
- **N is a demand signal, never proof of generality.** Sources are semi-isolated
  trees authored in parallel that can read each other, so repetition mixes
  convergence, literal copying, and copying in feel — indistinguishable after the
  fact. So N answers "should this be one copy?" and never "is this a
  well-generalized piece?". Only the destination's own bar answers the second
  (for starter: `.claude/CLAUDE.md` § Purpose). Graduating something because N
  sources share it, rather than because a consumer would want it, is how a shared
  piece ships one author's incidental assumption — `ProducerRowData`'s
  single-resource cost, extracted from a producer/scaler overlap and rejected by
  the first archetype with multi-resource costs, is the worked example.
- **N=1 only when named.** A single instance is admitted only with a *specific*
  anticipated second consumer named (like the engine candidate file's pre-designed
  shapes) — never a speculative "some future archetype". The named N=1 entry is a
  discoverability breadcrumb for whoever builds that second instance; a
  speculative one stays a `TODO(expansion)` marker + engine candidate until real.
- **Deeper dive at N=3.** A third instance triggers a deliberate cohort review:
  evaluate the copies *together*, keep their divergence visible, and decide the
  shape. Judgment, not a mechanical promote.
- **Copies stay in place.** Each instance lives in its own archetype dir
  (self-containment; eject-hoistable). This file is an index *over* the copies,
  not a shared import — the divergence between copies is the evaluation signal. A
  shared `src/modules/` standard module is a *graduation outcome*, not the
  staging shape.
- **Read every cited site before landing.** A shape's N is only as real as each
  copy opened and confirmed. Automated convergence scans over-lump disjoint
  shapes under one label and mis-cite lines (this surface's first scan lumped 9
  down to 7 and fabricated two line-citations). Never index an entry on a claimed
  count — verify each site by reading it, the same reading the divergence signal
  already demands.
- **Graduation is optional, and resolves by flavor.** A converged recipe may
  become (a) an *engine-composition* recipe → engine `consumer-guide-recipes.md`
  (prose + primitive list, citing the starter home), (b) a *scaffolding* recipe →
  a shared starter standard module (`src/modules/`, not in `sharedBase` —
  menu-style like the shells), (c) a *presentation & bridge* recipe → `src/lib/`,
  `src/ui/components/`, or `src/ui/compositions/` per that flavor's own
  discriminator, or (d) it stays glue and never generalizes.

**Sourcing scope — a maturity marker, not a counting rule.** The cadence above
counts independent instances *studio-wide* and never depended on which repo a copy
lives in. What is still widening is *where* instances get sourced from: starter
archetypes were the initial controlled input set — the only surface stable enough
to mine while this incubator was itself being proven — so most current entries are
starter-sourced. **Phase 3** opens sourcing to consumer games (multiverse-hr,
maldacena, frontier, borglike, …); that advances the marker without changing the
count. The bridge is already in place — the named-anticipated N=1 entries
(§ Run-phase controller cites multiverse-hr #17) reach across the starter boundary
today, exactly as the cadence allows. Upstream reconciliation has landed too: root
`/work/studio/CLAUDE.md` § Back-flows names this the third drop-spot, and the
recipe-half entries once misfiled in engine `candidate-primitives.md`
(`createSymmetricModuleSet`'s policy sibling, the bilateral-sim-bot runner,
autobuyer registry, run-phase controller) now point here as their recipe home.

## Current recipes

Grouped by altitude: **established conventions** (near-universal, past the
candidate stage), **scaffolding recipes** (how you wire an archetype, near
domain-free), and **gameplay & harness glue** (copyable mechanic wiring). Each
entry's N and sites are site-verified, not converge-claimed.

## Established conventions

### Tuning-registry foundation seam — N=9 (canonical)

A dependency-free foundation module creates ONE `createTuningRegistry`, publishes
it (plus the immutable data blob) under an `InjectionKey`; every sibling declares
`dependencies: ['<arch>/tuning']`, injects it, and reads each perturbable value
through `tunable(registry, '<ns>/<id>/<field>', () => default)` instead of
reading data directly — so every knob is a live `pushScope` override site, legal
keys are a greppable string-union, and there is no parallel `data/balance.ts`.
Riders: only declared-invention values are wrapped (canonical-cited constants
stay inline); duplicate registrations no-op via `setDefault`, so two modules can
co-register a key with no injection edge.

- **Status — established, not candidate.** Present in all 9 archetypes including
  `_blank`; it *is* the archetype scaffolding convention, past the await-N=3
  stage. Live question is graduation: every fork wires it identically → the first
  real shared-starter-standard-module candidate (a `createTuningModule` /
  `defineTuningFoundation` helper).
- **Sites:** every archetype's `modules/tuning.ts` or host module — e.g.
  `_blank/modules/tuning.ts:32`, producer `modules/producers.ts:71`, looper
  `modules/tuning.ts:806`, defender `modules/tuning.ts:60`.

## Scaffolding recipes

### Dual-publish injected module — N=3

A module owns its persistent state in `install()` and publishes its API on BOTH
surfaces: a module-scope `let api; export function getX() { if (!api) throw }`
accessor AND `ctx.provide(XKey, api)`. Convention: dependency-ordered
install/connect-time readers (declaring the provider in `dependencies`; topo-sort
guarantees order) call `getX()` directly; late/optional/cross-cutting consumers
(balance harness, composables) use the `InjectionKey` via `tryInject`.
Domain-free — the `getCycle`/`getBuild`/`getBloons` names are cosmetic; reusable
as a `defineInjectedModule` helper.

- **Instances (N=3):** cycler, defender, interlocker — ~15 module files (verify
  grep). NOT producer (single-surface, `getX` only) or `_blank` (provide-only);
  converge mis-scoped both, corrected here.
- **Watch:** the throwing getter exists only because `ctx.inject` gives late
  readers no install-order guarantee; an ordered-inject engine primitive would
  collapse this to provide-only.

### One-engine scoped-override solver harness — N=3

The canonical balance-solver skeleton: build ONE bot-driven engine (bot installed
as an `EngineModule` so its sim accumulators ride `exportSave`), `exportSave()` a
baseline blob once, then per candidate `importSave(blob)` to reset,
`registry.pushScope(name, overrides)` one tunable override, `runUntil(predicate |
budget)` to measure fire-time, tear the scope down in a `finally`, and assert
`scopeDepth === 0` to catch leaks — with a Gauss-Seidel outer pass chaining
proposals forward.

- **Instances (N=3):** producer `balance/solve-probe.ts:83` (canonical — ambient
  & looper cite it as the pattern they mirror, in their own doc comments), ambient
  `balance/solve-probe.ts:78`, looper `balance/bot.ts:145`.
- **Not universal in the primitives:** `bisectTuner` is producer+ambient only
  (looper substitutes `astar` for its discrete-schedule domain); `GameStateAccessor`
  is tick-mode-conditional (producer's probe passes none). Domain coupling = the
  beat/key list + the accessor's resource-id switch only.
- **Consumer widening (phase 3).** frontier `src/game/balance/expedition-sim.ts:64` and
  fork `src/game/balance/session-sim.ts:113` carry the *engine-assembly kernel* of this
  harness — `createEngine` + `createMemoryStorage` + `engine.start()/stop()` (kill the
  real-time interval) + force-unlock automation tiers past their requirement gate +
  optional `TuningRegistry.pushScope` overrides + `runUntil`-driven advance — as the
  first *consumer-game* receipts (the N=3 instances above are all starter archetypes).
  They diverge on the solver *superstructure*: both build a **fresh** engine per call
  rather than the `exportSave` baseline / `importSave`-per-candidate reset + Gauss-Seidel
  outer pass, so they're kernel-level, not full-solver, instances. This crosses the
  sourcing maturity marker (starter → consumer) without changing the full-solver count;
  the assembly kernel is the graduation-ready core (→ engine `consumer-guide-recipes.md`),
  the reset/solver loop is the starter-side superstructure. Cousin (same kernel, different
  purpose): idle-loops-ng `src/modules/mods/dmchurch-predictor-worker.ts:138` boots the
  same headless engine from a save blob for an *in-game* snapshot-diff predictor, not
  balance discovery.

## Gameplay & harness glue

### Achievement-effect fold per rate-chain — N=2

Instead of per-achievement grants, ONE `createMultiplicativeModifier` binds onto
every producer's `rateChain`, its getter live-folding the earned-achievement set
via `getCombinedAchievementEffect(allAchievements)` on each read — so every
earned achievement compounds into every rate through one product term. The
load-bearing decision: one static bind per target chain folding at read time, vs.
the naive per-achievement-earned grant/rebind (which would need unlock-transition
tracking + dynamic chain-edge mutation).

- **Instances (N=2):** ambient `modules/achievements.ts:123`, producer
  `modules/achievements.ts:88` — byte-for-byte; ambient's header reads "Mirrors
  producer/achievements.ts". Parameterizes to (achievement list, target chains,
  effect fn); the bind-id prefix is the only domain surface.

### Per-tick earnings-mirror counter — N=3

A per-run persistent `Decimal` accumulates live production rate × dt every
`ctx.onTick` (cycler integrates `cycle.capacity`; scaler sums
`category.getTotalRate`), tracking earnings-since-reset INDEPENDENTLY of the
spendable balance — so a prestige/transcend gain formula reads earned-this-run
rather than the current balance that spending depletes. Zeroes on the run
boundary. Generic integrator; integrand + time-unit divisor are the only
parameters.

- **Instances (N=3):** cycler `modules/prestige.ts:162`, scaler
  `modules/prestige.ts:329` (coinsThisPrestige) + `modules/transcend.ts`
  (coinsThisTranscension) — the two scaler sites are independent run-layers, not
  one hand-roll.

### Predicate-bridge reactive requirement — N=3

Bridges a domain-authored `(state) => boolean` predicate to the engine's zero-arg
`Computable<boolean>` requirement by wrapping `() => def.requirement(readState())`,
where `readState()` reconstructs a domain state object from live sibling-module
accessors on EVERY evaluation so Vue's watch registers the reactive reads —
resume-flagged predicates then re-fire on a ref write with no `onLoad` walk. The
accessor interface (assembled from injected handles) is the parameterization seam.

- **Instances (N=3):** ambient `modules/achievements.ts:75`, producer
  `modules/achievements.ts:77`, scaler `modules/achievements.ts:103` (scaler
  uncited by converge; verify added). Two interchangeable sub-variants:
  state-built-once-with-lazy-accessors vs. state-rebuilt-per-call.

### Prerequisite-gated progression ladder — N=2 (fresh — watch)

A monotone tier/tech ladder where node N gates on its predecessor's completion
signal: tug reads tier N-1's `prior.active.value` lazily inside a
`createBooleanRequirement` (all tiers registered by eval time — no shopRef
gymnastics) and binds a multiplicative `Grant` per tier onto a shared chain;
interlocker's limit-1 tech tree gates VISIBILITY on
`getEntry(prereq).purchasable.active` with a predecessor-completed cascade. The
closure-over-forward-declared-binding read is the named convention.

- **Instances (N=2):** tug `modules/income-upgrades.ts:91`, interlocker
  `modules/sciences.ts:115`. Converge counted cycler `burn-tier.ts:106` as a
  third — verify rejected it (no Purchasable/Requirement/Grant; gates on a
  sibling's external reach signal, not a predecessor node). Fresh N=2 → find a
  genuine third before the dive.

### Autobuyer-as-content registry — N=2 (ambient, producer), mirror-caveat

A registry module provides a persistent master toggle + `AutobuyerSpec[]` under
injection keys and runs the interval/tick loop; per-category modules push a spec
(each with its own persistent `isActive`) in `connect()` and delegate the buy
decision to `setupPolicyAutoPurchase` under a selection policy (composite
payback+cheapest cold-start), gated by `autobuyerGate(master && isActive &&
unlocked)` with a `tunable` reserve floor. `setupPolicyAutoPurchase` /
`setupSweepAutoPurchase` are the primitive core; the spec/registry/gate around
them is the recipe.

- **Instances (N=2, NOT independent):** ambient `modules/autobuyers/index.ts`,
  producer `modules/autobuyers/producers.ts` — verbatim OL-855 backport mirrors
  (ambient header: "Mirror of `…producer…`"), i.e. one deliberate copy. Scaler
  was the claimed third but its copy was deleted in `9df7f9c` and rebuilt on a
  direct-toggle design (zero registry refs). The shape recurs, but the divergence
  signal is absent — the weakest kind of N=2 (a copy, not independent arrival).
- **Engine-side reframe (2b).** Engine `candidate-primitives.md` § "AutobuyerSpec
  registry" frames this as a *primitive* awaiting graduation, trigger "FIRED" on
  the now-false N=3. Reconciliation verdict: the registry is a **recipe**
  (composition over the existing auto-purchase primitives); only the bespoke-tick
  `createThresholdAutobuyer({ mode })` half is a genuine primitive candidate. Any
  graduation ticket filed on the FIRED trigger was premature — see the discrepancy
  flag on that entry.
- **Dive gate:** a THIRD *independent* autobuyer registry (not a backport of these
  two) is the real N=3. Parked as recipe until then, not promoted.

### Run-phase controller — N=2 (cycler, multiverse-hr)

A run clock (`persistent` elapsed) + a `running`/`ended` lifecycle + a derived
beat label read off a tension ratio + a crossing detector in `ctx.onTick` that
ends the run when the ratio reaches 1. In cycler the ratio is `burn / D_max`: an
exogenous scheduled burn `W(t) = W₀·g^((t−setup)/T_g)` races a saturated capacity
ceiling; the beat label (`setup`/`comfortable`/`first-bite`/`under-review`/`merge-bell`)
is *measured* off the ratio, never authored; the pace surface is frozen at
`startRun` so the crossing stays closed-form.

- **The split.** The exogenous scheduled-burn half (`(simTime) => value`) is a
  **primitive** candidate — engine `candidate-primitives.md` § "Exogenous
  time-scheduled burn". The phase-controller half (clock + lifecycle +
  derived-label + crossing detector) is this recipe.
- **Instances (N=2):** cycler `modules/cycle.ts`; multiverse-hr
  `src/modules/drain.ts` (Operating Burn — a deliberate port of the same kernel;
  the module header cites the shared `N* ≈ prime + Tg·log_g(H)` crossing, τ_setup
  priming, and the `{H,g,Tg}`-authored-run-length decoupling). The named-anticipated
  #17 breadcrumb is now a real second instance.
- **Divergences to keep visible (for the N=3 dive):** (1) *crossing* — cycler is
  a hard closed-form `ratio→1`; multiverse-hr is a soft *rate* crossing
  (`burnRate > productionRate`) with a `graceSeconds` window and a solvent-recovery
  reset, so run-end is a soft-bind, not a deterministic time. (2) *baseline peg* —
  cycler freezes the pace surface at `startRun`; multiverse-hr pegs B₀ to a
  continuous cross-run EMA of production rate (`pegEma`, drain-independent), so its
  schedule is not run-frozen. (3) *beat label* — cycler derives the full 5-beat
  ladder; multiverse-hr surfaces `primed` + `isUnderReview` booleans + a merge-bell
  event rather than one derived enum.

### Two-sided match lifecycle

Domain-free two-sided match spine: `start()` opens, `end(outcome)` closes
idempotently and emits `matchEnded` **before** the match-scope reset (so
subscribers read pre-reset state), a wall-clock time-limit cap, and — the
extractable seam — *who wins is injected from outside* (`end({ winner })`), never
read internally. Composes `persistent` + `createReset` + `createEmitHandle` + a
tick clock, parameterized on `Side`.

- **Instances (N=2):** skirmish `modules/match.ts` (first stripped, parameterized
  instance); tug `modules/match.ts` (coupled source — fortress HP / lane /
  `player-win`·`ai-win` coupling still baked in).
- **N=3 watch:** a third two-sided/adversarial archetype (defender-PvP,
  auto-battler). At the dive, the convergence question is whether tug's coupled
  copy reduces cleanly to skirmish's parameterized shape.

### Bilateral sim-bot (side-parameterized policy runner)

Side-parameterized AI policy where the SAME factory installs on both sides, so
the archetype runs "production AI plays itself" fully headless — the adversarial
substrate for balance harnesses. The runner skeleton is invariant: in-match
guard → cadence accumulator (+ optional seeded believability jitter) → `decide`
→ act. Only `decide` is domain. Composes `persistent` (cadence accumulator) +
`createSeededRNG`/`getSeed` (per-side believability stream) + a tick loop, over
a `match.inMatch` guard.

- **Instances (N=2):** skirmish `modules/automation.ts` (first stripped
  instance — `decide` = commit supply → attack the opponent base, bilateral
  install with asymmetric aggression dials); tug `modules/opponent-bot.ts`
  (coupled source — units / income-upgrades / counter-matrix `decide` still
  baked in, plus the parameterized-personality roster).
- **The lifecycle-event dependency.** Both instances lean on the two-sided
  match lifecycle's `matchStarted`/`matchEnded` events + `inMatch` guard — this
  recipe and that one graduate together or not at all.
- **Also the match-driver half.** The multi-match auto-restart driver
  (`match.on('matchEnded')` → `start()` next tick, for cumulative-arc probes) is
  part of this recipe's balance-harness surface; not yet built in skirmish
  (tug `balance/match-driver.ts` is the source). Add when the balance lane lands.
- **N=3 watch / prior art.** Engine `candidate-primitives.md` § "Bilateral-
  symmetric sim-bot pattern" is the misfiled primitive-track version of this
  same shape (its `createSymmetricModuleSet` half is a genuine primitive gap;
  the policy-runner half is this recipe). At the N=3 dive, reconcile the two:
  what (if anything) is real engine API vs. copyable glue. The `decide`-as-
  callback extraction is a graduation outcome, not the staging shape — copies
  stay inline here.

### Shared pure decision/step function across live tick and harness — GRADUATED (N=3 dive)

One pure function over game state — a *decision* (`(state, params) => choice`) or an
*integration step* (`(state, dt) => state'`) — is exported once and invoked *identically*
by the live `engine.onTick` path and by the balance harness / offline sim, so shipping
pacing and the harness's model of it cannot diverge. This is the composition form of
studio CLAUDE.md § "Automation is game code, not a harness bot": the mechanic and the
bot are the *same code*, and the policy params double as the sweep axis and the
player-facing tuning surface. First cross-consumer N=3 on this surface — all three are
consumer games / direct consumers, not starter archetypes.

- **Instances (N=3):** frontier `src/game/modules/auto-target.ts:71`
  (`pickNextTarget(exp, params)` — a cheapest-first *decision*, called by the on-tick
  automation ticker and by balance-sim probes; four such policy fns in-file);
  fork `src/game/economy/drift.ts:59` (`advanceCenter(s, dt, lo, hi)` — a pure
  *integration step*; header: "Shared by `buildCenterPath` (1 s sim steps) and the live
  drift module (variable-dt ticks) so the harness and shipping code integrate
  identically"); multiverse-hr `src/modules/rotation.ts:26` (`isRotationEligible` /
  `worstEligibleSeat` / `freshestBenchedReplacement` — a *selection* policy; header:
  "shared by the HR module's on-grid automation (`hr.ts`) and the balance bot's manual
  rotation (`balance/bot.ts`) … the bot rotating *is* the HR mechanic run").
- **Dive resolved → graduated** (engine `consumer-guide-recipes.md` § "Shared pure
  state-function across live tick and harness"). The decision-vs-step divergence resolves
  *into* the recipe, not against it: deleting the discipline reinvents the same one gap
  ("keep sim and live from diverging") the same way in all three, so it's one recipe with a
  domain flavor, not two competing shapes. Argument purity is not the invariant (fork is
  pure-of-args; frontier reads an accessor object `exp`; multiverse-hr reads sibling modules)
  — the live-vs-harness *symmetry* is. Graduated as a documented *discipline*, not a helper:
  each policy is domain-specific, so there is no code to extract; the shared part is a
  one-liner. It *generalizes* studio CLAUDE.md § "Automation is game code" beyond
  AutomationTiers-gated policies to any shared pure state-function — fork's non-automation
  `advanceCenter` step is the evidence the shape is broader than automation.

### Player throttle dial over AutomationTiers (clamp-below-ceiling) — N=2

A player-facing dial that clamps the *effective* acting automation tier at or below
whatever's unlocked: `createAutomationTiers({ tiers: [manual, …requirement-gated] })` +
`activeOrder = persistent<number>(-1)` (−1 = follow the unlocked ceiling) +
`effectiveOrder = computed(() => activeOrder < 0 ? tiers.currentTierOrder : Math.min(
activeOrder, tiers.currentTierOrder))`, and the tick loop reads `effectiveOrder.value`
*fresh each pulse* — no watcher, because a stale watcher never drains under a headless
driver that never runs Vue's scheduler.

- **Instances (N=2):** frontier `src/game/modules/auto-target.ts:196`; fork
  `src/game/modules/automation.ts:150` — near-verbatim, down to the `-1` sentinel, the
  `Math.min` clamp, and the identical "read the computed fresh each tick, no stale
  watcher under a headless driver" rationale.
- **Divergence to keep visible:** frontier carries an extra `authorizedBoundary`
  persistent alongside `activeOrder` (a second clamp axis); fork has only the one dial.
- **N=3 watch:** a third consumer with an AutomationTiers + player-throttle dial. Composes
  only existing engine API (`createAutomationTiers`, `persistent`, `computed`) → recipe,
  not a primitive gap.
