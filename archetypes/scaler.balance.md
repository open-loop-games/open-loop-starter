# Scaler — balance findings

> Sidecar to `archetypes/BALANCING.md`. This file captures balance findings *during* the scaler balance pass — observations, dead ends, instrument-earning moments, and signals worth flagging upstream. Some entries promote into `BALANCING.md` proper via PR; others stay here as archetype-local lore.
>
> Convention defined in `BALANCING.md § Theme 5 — Findings sidecars`.

## What goes here

Findings that future balance work — on this archetype or others — would benefit from reading. Specifically:

- **Instrument-earning moments.** When an existing tool didn't answer a question and a new one was added: what question, what shape, what cost vs. what payoff.
- **Methodology stress.** Where `BALANCING.md`'s framing felt inadequate against a real subsystem; what the framing was missing.
- **Engine-surface gaps.** Hand-rolls that emerged mid-flight; cross-link to `open-loop-engine/docs/candidate-primitives.md` for the convergence channel.
- **Drift signals.** When sim / predictor / walker disagreed, what the disagreement meant, how it resolved.
- **Numerical surprises.** Beats that wouldn't land for non-tuning reasons (e.g. integral-vs-discrete asymmetries, Decimal precision wells, modifier-chain order surprises).

## What does not go here

- Chosen knob values — live in `src/archetypes/scaler/data/*.ts`.
- Beat windows or predicates — live in `src/archetypes/scaler/balance/beats.ts`.
- Tickets / decisions — live in Vikunja.
- Per-pass status, phase IDs, task IDs — those rot. Comment hygiene per `/work/studio/CLAUDE.md` § Conventions.

The sidecar is for *what was learned*, not *what was decided*.

## Promotion to BALANCING.md

When a finding generalizes across archetypes, file a PR moving the abstracted rule into `BALANCING.md`. The sidecar entry stays as the worked example; `BALANCING.md` gets the cross-archetype framing. Producer's `balance.md` will get the same convention applied retroactively if/when its findings warrant it.

## Entry shape

```markdown
### <one-line summary>

**Subsystem:** antimatter | prestige | ECC | cross-tier
**What we hit:** the symptom in one paragraph.
**What we tried:** the path, including dead ends.
**What worked:** the resolution.
**Generalizable?** archetype-local | candidate for BALANCING.md | candidate for closed-form-progression upstream.
```

---

## Findings

### Automation tier promoted from optional to slim-port baseline — bot policy IS the autobuyer policy

**Subsystem:** cross-tier
**What we hit:** the interim sub-leaf-B bot installed a parallel `setupPolicyAutoPurchase` × 3 tiers + a hand-rolled upgrade-sweep loop in `balance/bot.ts`. Same shape the producer balance bot carries. Authoring it twice in two layers (sim and player flow) was structurally divergent — "what an autobuyer would do" got written in `bot.ts` instead of as canonical content. The greedy "if `tier.conversion?.canConvert.value === true` convert()" loop also fired from tick 1 because `prestige.createCostRequirement` uses `cost: () => coin.value` (`modules/prestige.ts:138`), making `canConvert` trivially true at any coin value. Reset wiped antimatter before any beat fired.
**What we tried:** removing the conversion loop fixed the immediate firing; but the deeper question remained — should the bot author auto-purchase policy at all, or should the autobuyers be canonical content the bot rides on top of?
**What worked:** scaler ships its automation tier as engine-module content under `modules/autobuyers/{antimatter,prestige,transcend}.ts`. Each autobuyer registers an `AutobuyerSpec` (id, unlock predicate, isActive Persistent toggle, optional bespoke `tick`). A registry module provides `AutobuyerMasterToggleKey` + `AutobuyerRegistryKey`. The shape lifts AD's class hierarchy (`AutobuyerState` / `IntervaledAutobuyerState`) into engine-module idiom (`autobuyer.js:4-175`); content set lifts Synergism's `Automation.ts:33-125` collapsed to per-tier sweeps. Bot rewrites to ~15 lines: flip master, walk registry, set every `isActive = true`. Unlock gates remain real — they read `Resource.cumulative` (no new state), and lift naturally as the sim crosses each tier-presence threshold.
**Generalizable?** candidate for cross-archetype shape. OL-855 backports the same shape into producer + ambient. At N=3 a `createAutoPurchaser` engine helper becomes a real candidate (currently filed as N=1 in `open-loop-engine/docs/candidate-primitives.md`); the AD class hierarchy itself is the more interesting graduation candidate than just the helper. Cross-link: scaler ticket OL-854.

### Achievement Gate migration closes the predictor-vs-sim splice gap structurally

**Subsystem:** antimatter (cross-tier-applicable)
**What we hit:** sub-leaf B's predictor walk over the antimatter strict-tier-order schedule could not see achievement firings. Achievements were authored as a `requirement: (state: ScalerGameState) => boolean` predicate vtable closed over a hand-rolled `ScalerGameState` accessor (`modules/achievements.ts:73-93`); the engine's `Gate`-aware splice path (`timeUntilGateFlip` over `Achievement.gate`) found `entry.achievement.gate === undefined` for every entry and returned `+∞` from `nextAchievementFireDistance`. Every step in the predictor accumulated coin at the start-of-step rate; the sim saw real mid-step rate jumps as count-gte achievements crossed thresholds. Producer's pre-Gate finding (3.3-6.2% drift, monotonic, breaching tolerance at deeper tiers) showed up here too.
**What we tried:** none — the gap was understood from producer's prior pass; sub-leaf C ships the migration directly, no transitional hand-roll.
**What worked:** atomic single-commit migration of `data/achievements.ts` to pure `Gate` literals (`cumulative-gte` for amount/count ladders, `count-gte` for producer ladders + challenge completions, `all` combinator for the all-five-challenges hidden achievement) and `modules/achievements.ts` to producer's mapping shape (`def.requirement` passed through directly, one multiplicative-modifier-per-rate-chain via `getCombinedAchievementEffect` partitioned by tier). The legacy `ScalerGameState` predicate vtable retired entirely; `data/types.ts` drops the type. Predictor↔sim drift collapses from 1.4-7% (at `tickDelta=1s`) to 0.20-0.66% across the full 5-tier × 5-buy walk (at `tickDelta=0.1s`) — well under the 5% tolerance. The ~7% residue at `tickDelta=1s` is sim-side discretization, not predictor splice gap; finer ticks resolve it cleanly. The drift gap closes structurally rather than per-port, matching producer's post-OL-844 receipt.
**Generalizable?** archetype-local — the receipt of "Gate migration eliminates the predictor splice gap" is now multi-archetype (producer, scaler). Cross-link: ticket OL-856.

### Dead-stub achievements: count tracking via cumulative-gte vs Gate-kind expansion vs drop

**Subsystem:** prestige + transcend
**What we hit:** the legacy predicate vtable shipped three predicates that returned `false` unconditionally: `prestigeCountAtLeast`, `transcensionCountAtLeast`, `fastestPrestigeUnder`. ~12 milestone achievements + 4 hidden achievements depended on them and were structurally unfireable. The Gate migration forced a disposition decision the surface-level "swap predicate vtable for Gate" framing didn't surface: count-of-resets and fastest-time aren't resource-bearing, so neither `cumulative-gte` nor `count-gte` works directly.
**What we tried:** three options surfaced —
  1. Add a new Gate kind (`reset-count-gte`, `fastest-reset-under`). Heavy engine work, no other consumer needs it yet.
  2. Drop the affected achievements outright. They were already non-functional; the slim port wouldn't lose anything observable.
  3. Track reset counts via integer `Resource.cumulative` — increment on `afterConvert` before `reset.reset()` runs, pin both the resource and its `cumulative` tracker in the reset's `keep:` set so the count survives across cycles. Read by `cumulative-gte`.
**What worked:** option 3 for prestige/transcend counts (resource-shaped data is reusable for D/E predictor walkers anyway — sub-leaf D's prestige-timing ROI math will read this same counter); option 2 for `hidden-speedrunner` (the only timing-based stub; a new Gate kind for one achievement is bad ROI). Increment must happen *before* `reset.reset()` because the reset wraps cleanup in `loadingSave.value = true`, which suppresses the `cumulative` watcher (`resource.ts:203`). Adding `prestigeCount` + `prestigeCount.cumulative` to `prestigeReset.keep` is load-bearing — without it, the counter zeros on every prestige and `cumulative-gte` never fires past 1.
**Generalizable?** Two patterns worth surfacing —
  - **Reset count as cumulative-tracked Resource.** Any archetype with reset-cycle-count achievements wants this shape: integer Resource, `addResource(counter, 1)` in afterConvert, both refs in `keep:`. Candidate for engine-side `Reset.observeCount` helper if it shows up in a third archetype.
  - **`Resource.cumulative` survives reset only when explicitly kept.** Existing scaler code pinned `prestigePoints` in `keep:` but not `prestigePoints.cumulative` — any cumulative-gte achievement against `prestigePoints` would have zeroed on every prestige. Migration also added the cumulative trackers to keep:. Possibly worth a `Reset` helper that takes a Resource and pins both the value and its trackers transitively. Filed as a thought; not a candidate-primitives entry yet.

### Calibration: autobuyer architecture forces large achievement multiplier

**Subsystem:** antimatter
**What we hit:** beat-2 (first antimatter upgrade bought) fires at 96m06s under default `achievementMultiplier = 1.02`, far outside the 15s-2min window. The autobuyer setup (producer auto-buy at 1s interval + upgrade sweep at every-tick) creates a producer-vs-upgrade competition: producer auto-buy drains coin to ~0 every second on a Worker buy (cost 100 → 115 → 132 → ...), and the upgrade sweep can only grab Accelerator (cost 500 — vanilla canonical, off-limits) when coin briefly spikes ≥500 between producer ticks. That requires a per-second rate ≥ ~500 coin/s to leave a spike the sweep can catch.
**What we tried:** the declared-invention surface for the antimatter subsystem (`balance/shape.ts SCALER_SUBSYSTEMS`) is two knobs: `accelerator UPGRADE_PER_LEVEL_MULT` and `achievementMultiplier`. The accelerator per-level mult is an effect-after-buy lever — it doesn't accelerate coin accumulation pre-buy. `achievementMultiplier` is the only available rate lever: each fired antimatter milestone (count ≥ 1, 5, 25) compounds onto the antimatter rate chain. Bisection landed `achievementMultiplier ≈ 42.347` to put beat-2 at 1m08s (window midpoint).
**What worked:** the bisection itself — converged in 5 iterations against the autobuyer-driven sim. Beat-1 fires at 1s by construction; beat-2 lands in window with the calibrated mult.
**Generalizable?** candidate for BALANCING.md if the pattern reproduces. The structural finding is that **autobuyer architecture asymmetries can dominate the calibration target** — when the bot enables both producer and upgrade autobuyers from t=0 (as the slim-port "every gate cleared" framing implies), early-arc upgrade beats become rate-driven (need rate to exceed cost between producer-buy ticks) rather than affordability-driven (need coin to accumulate to cost from a flat-rate bootstrap). The lever to land an early-arc upgrade beat then has to be a rate multiplier, even when the surface-level model says it's a "first upgrade affordable" beat. Producer's early beats may have masked this because cookie costs are wider-spread and the producer auto-buy pattern is different.
  Two follow-up questions worth pre-flagging for D triage:
  1. **Coin reserve for the producer autobuyer.** AD's `spendingPerc` / Cookie Monster's bank term leave a fraction of resource unspent. If scaler's autobuyer adopts a coin reserve (currently `getReserve: () => 0` in `selectionHybridPayback`), the producer-vs-upgrade competition relaxes and a more moderate `achievementMultiplier` lands beat-2. Reserve isn't currently in `inventionKnobs` — would need shape.ts amendment if D wants to use it.
  2. **Is `achievementMultiplier ≈ 42` actually wrong, or just surprising?** Synergism's per-achievement reward varies per achievement; the slim-port flat-rate model collapses that variance. An effective ~42x at the slim-port grain might be a reasonable fold of Synergism's varied per-achievement rewards. Validate against a Synergism-sourced run trace if/when one is available.

### `verify.ts` PER_TIER_COUNT widened to canonical-tier walk; tickDelta drops to 0.1s

**Subsystem:** antimatter
**What we hit:** sub-leaf B held `PER_TIER_COUNT = 3` and `tierCount = 2` to keep the no-bot sim within budget; with bare base-rates (0.1 → 8000, 1.15× cost ramp), per-tier-count = 25 across 5 tiers exhausts a 4.5h budget at the deeper tiers. The deliverable was "verify produces a predictor↔sim diff," not a full canonical schedule. Sub-leaf C inherited the question: how wide can the walk go now that calibration tightens cost-vs-rate ratios?
**What we tried:** widened to `PER_TIER_COUNT = 5` × `tierCount = 5` (the full 5-producer × 5-buy canonical antimatter walk) under the calibrated `achievementMultiplier = 42.347`. Initial run at `tickDelta = 1s` showed 1.4-7% drift across waypoints — 4/7 exceeding the 5% tolerance, monotonically increasing with depth.
**What worked:** dropping `tickDelta` from 1s to 0.1s (a 10× refinement on sim-side discretization granularity) collapsed drift to 0.20-0.66% across all 7 waypoints — well under tolerance. Wall-time stayed sub-second per pass; the budget rule (BALANCING.md § Theme 4 #2 — "no run over 2min wall-time") is comfortable. The original drift wasn't predictor-side splice gap (Gate migration closed that); it was sim-side `runUntil(coin >= cost)` overshoot at coarse ticks. The predictor reads `tier.producers.getTotalRate(coin)` directly (no discretization); the sim accumulates over per-tick increments and overshoots the affordability boundary by up to one `tickDelta` per step.
**Generalizable?** archetype-local in the specific tickDelta value, but the pattern — *"predictor↔sim drift can be sim-discretization, not predictor-splice"* — is worth surfacing. Default verify-driver `tickDelta` should track the schedule's finest event-distance, not the engine's natural 50ms-frame; the looper precedent already runs probes at 1-5s tickDelta for arc-length comparisons but verify-drivers want finer. Possibly worth a `BALANCING.md § Theme 3 #2` callout: "*Verify-driver tickDelta scales with the predictor's resolution, not the sim's.*"

### Cascade port restored canonical structure; per-tier baseRate + cadence factor folded into the multiplier surface

**Subsystem:** antimatter + prestige (cross-tier)
**What we hit:** the slim-port flat per-tier producer rates (`antimatter-1: 0.1` … `antimatter-5: 8000`; diamond mirror at 0.1 → 8000 prestigePoints) were sized for cost-payback ≈ 1000s pre-multipliers — engineered for *equal payback at count = 1* across all 5 tiers. Two consequences: (i) polynomial-degree-1 substrate cannot deliver canonical magnitudes in arc time (`floor(log_{1e25}(coin+1)) >= 1` requires `coin >= 1e25`; diagnostic probe under sub-leaf C calibration plateaued at ~1e16/s, 5 OOM short); (ii) `selectionHybridPayback`'s `cost / Δrate` term ties across all tiers, so the wait-term tiebreak degenerates to "buy cheapest among affordable." The cascade is the structural answer to both — degree-1 → degree-5 trajectory plus naturally-asymmetric Δrate signal across tiers.
**What we tried:** flavor (a) faithful integrator chain vs (b) `Producer.rateChain` synthesis. (b) is faster to land but loses the canonical owned-vs-generated split. The engine-surface check turned (a) viable: filed OL-861 to widen `ProducerMapping.extraCount?: Computable<DecimalSource>` so `Producer.count = ownedCount + extraCount`. Engine half landed at `4829cc2` exposing `ownedCount`, `extraCount`, `count` as separate `ComputedRef`s (better than the original "fold into one count" proposal — per-axis effects can bind to either directly). Consumer port then adopts (a) directly.
**What worked:** per-tier `generated[]` Resources alongside producers; `T(N).extraCount = () => generated[N-1].value`; `T(N>1).resource = generated[N-2]` (T1 emits to headline currency). Cyclic feedback edge `T1.ownedCount → T5.generated` registered post-`producers.register()` so cascade ticks first within a sequencer pass, matching canonical ordering. Slim adopts implicit-1 baseRate per tier (`rate × count × dt → 1 unit of next-tier-generated per count per second`) — canonical lacks per-tier baseRate constants; the cascade structure itself plus modifier-chain multipliers (Accelerator, Multiplier, Crystal grants) carry pacing. Per-second slim convention diverges from canonical's per-25ms-tick implicit cadence — a 40× factor in raw rate that the declared-invention multiplier surface (`acceleratorPerLevelMult`, `MULTIPLIER_PER_LEVEL`, `achievementMultiplier`, `CRYSTAL_PER_LEVEL_BONUS`) absorbs at arc-fit calibration. Antimatter cascade lands always-on (slim drops Synergism's `upgrades[101..105]` shop gates, symmetric with diamond cascade which is always-on canonically too — `Synergism.ts:3206-3248` for diamond, `:4370-4404` for antimatter).
**Generalizable?** candidate for cross-archetype shape — "generator generating generators" is Tier-0 prevalence in the corpus (AD T1-T8; Synergism replicates verbatim across coin/diamond/mythos). Currently filed as **Producer cascade** in `open-loop-engine/docs/candidate-primitives.md` at N=1 with this scaler port as the receipt; graduates to a managed `createProducerCascade({ tiers, headline })` primitive at N=2 (second consumer hand-rolling the same generated-resource + extraCount + cascade-emission shape across ≥3 tiers). The cadence-factor finding — *canonical's per-25ms-tick rate hides a 40× scaling factor that needs to be re-absorbed into the multiplier surface when porting to a per-second slim substrate* — is worth surfacing if it reproduces (any port from a fixed-tick canonical to a continuous-time slim will hit the same).

### Tuning registry adoption mirrors producer's shape; load-bearing for D/E

**Subsystem:** cross-tier
**What we hit:** sub-leaf B's `solve.ts` carried an open uncertainty: scaler had no `OverrideRegistry` analog of producer's `ProducerTuningRegistryKey`; the only perturbation surface was rebuilding the engine per bisection sample via `applyScalerOverrides`, incompatible with the build-once + push-scope pattern producer uses. Beat-2 calibration would have wall-time-blown if every iteration rebuilt the engine.
**What we tried:** option (a) was rebuild-engine-per-sample (slow but simple); option (b) was a scaler-side tuning registry mirroring producer's. Verified producer's shape early in the session — minimal surface (one InjectionKey, one `createOverrideRegistry`, `tunable(...)` wrapping at every read site).
**What worked:** option (b) — `modules/tuning.ts` declares `ScalerTuningRegistryKey` over typed `ScalerTunables`; antimatter (first-installed tier) creates and provides the registry; prestige / transcend / achievements modules `ctx.inject` and wrap their declared-invention knobs (`CRYSTAL_PER_LEVEL_BONUS`, transcend per-level mults + cost scaling, `achievementMultiplier`, `challengeCompletionMultiplier`, `acceleratorPerLevelMult`) via `tunable(...)`. Solver's bisection ceremony reduces to `pushScope`/`importSave` per sample — beat-2 calibration converges in ~5 iterations × <0.1s wall-time per iteration.
**Generalizable?** Already-generalized — this is the second adopter of the producer pattern. The shape itself is engine-side (`createOverrideRegistry` + `tunable`); the per-archetype piece is just the InjectionKey + the typed tunables map. At N=2 the convention is "every multi-subsystem archetype with declared-invention knobs ships its own tuning registry"; the data flow into and out of the registry doesn't change between archetypes. Filed as candidate engine-shape if a third archetype lands the same surface — currently the right level is "this is a per-archetype convention, not an engine primitive."
