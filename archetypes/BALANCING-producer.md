# Balancing — Producer

Per-archetype balance log per `BALANCING.md § Graduating findings`. Records what was *learned* across producer's balance passes — instrument-earning moments, methodology stresses, engine-surface gaps, drift signals, numerical surprises. Not chosen values (those live at `tunable()` sites), not beat windows (`balance/beats.ts`), not per-pass status or ticket IDs.

When an entry generalizes across archetypes, file a PR moving the abstracted rule into `BALANCING.md` and leave the worked example here.

## Engine-surface gap — `ProducerMapping.purchase.costScaling` is static

The geometric per-unit cost growth (Cookie Clicker `1.15`) couldn't fold into a `tunable()` reader site during the OL-955 data-side consolidation. The engine's `ProducerMapping.purchase.costScaling` accepts `DecimalSource` only — it's read once at producer registration and never re-read, so wrapping it in `tunable()` produces no runtime retuning ability and the picker can't enumerate it as a perturbation surface.

Resolution today: inlined `1.15` in `data/producers.ts` with the canonical `priceFunc` citation. Tuning the cost growth requires an engine change: `Computable<DecimalSource>` adoption on `ProducerMapping.purchase.costScaling` with `unref` at the registration read site.

- **Receipt:** in-code comment block at `src/showcase/archetypes/producer/modules/producers.ts:39-43` documents the negative criterion.
- **Cross-link:** when filed, the candidate primitive should land in `candidate-primitives.md`. Adjacent entries on `Purchasable` / `Producer` cost-side `Computable` adoption exist but don't subsume this row.
- **Affected consumers:** any archetype that bisects against per-tier cost growth as a methodology-#1 knob. None today — but the bisection is the natural diagnostic for a "tier cadence feels wrong" reshape call.

## Engine-surface gap — narrow `runUntil({mode: 'stasis-aware-tick'})` inadequate for click-driven income channels

Stasis-aware-tick mode checks `createTransitionSnapshot` + `isStasis` per tick. The accessor passed by the consumer drives the snapshot's view of resource rates. Producer's `buildProducerAccessor` (`src/showcase/archetypes/producer/balance/bot.ts:121`) reports `getRate('cookies') = buildings.getTotalRate(cookies)` — passive production only. At `tick=0` with no producers owned, that returns zero. The check declares stasis immediately and the runner terminates with `terminated: 'unreachable'` *before* the first click-taper-driven income lands.

Adoption attempt (OL-955 Phase 3a, 2026-05-13): added `mode: 'stasis-aware-tick'` + `accessor: buildProducerAccessor(engine)` to five `runUntil` sites across `solve.ts` / `verify.ts` / `predict.smoke.ts`. Beat-2 (cursor purchase, default-content fires at 15s) and beat-3 (grandma purchase, fires at 12m08s) both collapsed to `Infinity` in the smoke run. The mode is not safe to drop in.

This validates the prediction recorded at `candidate-primitives.md:81` (OL-628 close-out, 2026-04-23): "narrow form was inadequate for non-decaying-rate archetypes (Producer): the question that matters is 'predicate cannot fire *within budget*,' not 'predicate cannot fire ever.' That broader form needs event-driven reasoning."

The right shape is one of:

- An accessor variant that models the click-taper rate channel, lifting `clickRateAt(simTime)` into `getRate('cookies')` so `isStasis` sees the bot-driven income. Couples accessor to bot policy — wrong layer.
- The broader budget-bounded reachability oracle (`isReachable(engine, predicate, budget)`) the candidate-primitives.md entry tracks separately. Right shape; not in the engine today.
- Lift the click taper into a `TimedInput`-registered handler (the third deferral at `candidate-primitives.md:72`), then stasis-aware mode's `isStasis` check flips to `registry.list()`-aware and sees the live rate channel. Cleanest fix; depends on TimedInput graduation.

Producer is the wedge case. Until one of those lands, producer's `runUntil` stays in default `'tick'` mode and the `cursor-boost-i` drift signal below absorbs the cost of the wedge.

- **Receipt:** empirical adoption + revert recorded in this leaf; no in-code marker (the revert restores no-change state).
- **Cross-link:** `candidate-primitives.md` § `runUntil({mode: 'stasis-aware-tick'})` and § `TimedInput` and the budget-bounded reachability oracle.
- **Affected consumers:** any archetype with bot-driven income channels not surfaced through `getRate`. Looper's queue-driven progression may be the next archetype to hit this — different mechanism, same wedge.

## Identity-file judgment call — predictor-seed shape earns identity + windows colocation

`BALANCING.md § Where balance constants live` treats `shape.ts` as optional. Producer's shape is *predictor-seed* — a closed-form spec (`spec.ts`'s `arcWaypoints` / `strictTierOrderSchedule`) drives both the predictor and the verifier. The identity content (phases, signature metric, subsystem methodology map) is load-bearing for the algorithm files: the verifier reads `PRODUCER_PHASES`-derived beat ids; the solver reads `PRODUCER_SUBSYSTEMS`-derived methodology classification implicitly via its per-beat algorithm.

The cut OL-955 Phase 2 settled on: merge identity (`PRODUCER_IDENTITY`, `PRODUCER_PHASES`, `PRODUCER_SUBSYSTEMS`, `FLOW_BAND_SCORE`) with windows (`BEAT_WINDOWS`, `ARC_BEATS`, `FLOW_BEATS`) in a single declarative `balance.ts`. The two halves cross-reference (phase `currentBeatId` points at window ids; `FLOW_BAND_SCORE` weights consume the `FLOW_BEATS` series), and keeping them in one file makes the cross-reference local.

Promote to `BALANCING.md` if a second predictor-seed archetype (looper, scaler post-OL-841 ECC?) reaches the same conclusion.

**Reversed by the canonical-consistency sweep (studio/open-loop-starter#9, #14).** The colocation above was retired: the *identity* half (`PRODUCER_IDENTITY`, `PRODUCER_PHASES`, `PRODUCER_SUBSYSTEMS`, `FLOW_BAND_SCORE`) dissolved into prose in `IDENTITY.md`, and the *windows* half (`BEAT_WINDOWS`, `ARC_BEATS`, `FLOW_BEATS` + predicates) moved to `balance/beats.ts`. The cross-references the merge protected were unconsumed doc-as-code (nothing imported the identity exports), so the split cost nothing and made the identity a single-source doc per the README's `IDENTITY.md` requirement. The predictor-seed observation still stands — it just no longer argues for one *file*.

## Methodology — hybrid-payback collapses to payback-period under an affordable-only filter

Producer shipped `selectionHybridPayback` (Cookie Monster `pp` / Frozen Cookies
`purchaseEfficiency`) as both the autobuyer policy and the walker policy. The
canonical-consistency sweep (studio/open-loop-starter#9) replaced it with
`selectionComposite(selectionPaybackPeriod, selectionCheapest)` — and the arc
timings did not move (walker: beat-2 15s, beat-3 ~12.6min, beat-4 ∞, all
unchanged).

Why they're equivalent here: hybrid payback's score is `waitTerm + paybackTerm`,
where `waitTerm = max(cost − (bank − reserve), 0) / headlineRate`. Both the driver
(`setupPolicyAutoPurchase`) and the walker pre-filter candidates to *affordable*
before calling `pick`, so `cost ≤ bank` and (at reserve 0) `waitTerm = 0` for
every candidate. The score degenerates to `cost / Δrate` — the payback term
alone. The wait-term only changes the answer when the policy must choose to *save
toward* an unaffordable item, which neither consumer ever asks it to do (they pick
among affordable, else save toward the cheapest gap). So the optimal-play scorer
bought nothing over the legible one, at the cost of a headline-rate aggregation
per candidate per pick.

Generalizes: any single-currency archetype whose auto-buy pre-filters to
affordable candidates gets nothing from a hybrid wait-term. Reach for
`selectionPaybackPeriod` (+ `selectionCheapest` cold-start) first; escalate to
`selectionHybridPayback` only when the policy itself owns the save-toward decision
(multi-currency, or a driver that hands the policy unaffordable candidates).
Promote to `BALANCING.md § Selection policies` if a second archetype confirms.

- **Receipt:** the shared policy + `buildProducerPolicy` live at
  `modules/autobuyers/producers.ts`; the balance bot no longer carries a copy
  (`balance/bot.ts`).

## Convention — one policy, shared by autobuyer + walker (not a bot copy)

The pre-sweep producer carried the selection policy *twice*: `balance/bot.ts::buildBotPolicy`
(walker) and `modules/autobuyers/producers.ts::buildProducerPolicy` (autobuyer),
byte-identical `selectionHybridPayback` definitions that could drift silently. The
sweep collapsed them to one `buildProducerPolicy` in the shipping module, imported
by the walker — the automation-as-game-code discipline (`/work/studio/CLAUDE.md`)
applied to the *policy*, not just the manager: there is one policy, and the harness
drives it. The interlocker rewrite reached the same shape from the manager side
(one profile drives player + harness); producer reaches it from the policy side.

## Automation — "% spend" reserve is the single-currency trigger buffer

Interlocker's automation gates spending on a per-input trigger buffer (spend only
when every input is banked ≥ `trigger·capacity`). Producer is single-currency
(cost-resource = produce-resource = cookies), so that buffer collapses to one
knob: `reserve = reserveFraction · bank`, folded into `setupPolicyAutoPurchase`'s
`reserve` slot as a `tunable('balance/producerReserveFraction')`. Default 0 spends
freely (preserving the pre-sweep behavior); the fraction is the harness sweep axis
and the eventual player "% spend" slider. The upgrade autobuyer carries the same
knob as `balance/upgradeReserveFraction` through `setupSweepAutoPurchase`'s
`reserve` slot — two independent axes, both engine-side, so neither manager
re-implements the floor. The walker's affordable filter matches
the driver only while the fraction is 0 — a fork raising it must mirror the reserve
in `predict.ts`'s candidate filter (noted in that file's header).

## Drift signal — `cursor-boost-i` predicate/data mismatch

Beat-4's predicate (`balance/balance.ts:282`, formerly `beats.ts`) references upgrade id `cursor-boost-i` via `upgradeBought('cursor-boost-i')`. The default Bakery `data/upgrades.ts` does not register that id. Reproduces on `main` pre-OL-955 (verified by `git stash` smoke during Phase 1). Effect: beat-4 + beat-7 report `Infinity` fire times in `predict.smoke.ts`.

Two adjacent observations:

- **The mismatch outlived the recent BALANCING.md rewrite + balance/ consolidation.** Neither pass would have caught it — they touch documentation and file layout, not predicate/content consistency. A future "predicate references real engine objects" check (typed, lint-time, or runtime at startup) would catch this class of drift; the producer setup has no such check today.
- **The wedge that motivated the stasis-aware-tick adoption attempt above is *not* this mismatch.** Even with `cursor-boost-i` reconciled, the click-taper / accessor mismatch would still pin beat-2/3 to `Infinity` under stasis-aware mode. The two signals are independent.

Resolution is a separate ticket (likely a beat-4 predicate rewrite to reference a real upgrade id, or a `data/upgrades.ts` addition for `cursor-boost-i`).

## What this pass did NOT learn

Producer is single-subsystem **Pure (continuous-producer-with-modifier-chain)** running **methodology `#1+#2` over a triangular composition row**. The kit fit the work — no diagnostic vocabulary felt inadequate, no algorithmic surface was missing. The four algorithmic-surface files (`spec.ts`, `predict.ts`, `solve.ts`, `verify.ts`) covered the per-beat math cleanly; identity + windows in `balance.ts`; sim infrastructure in `bot.ts`; drivers in `run.ts` + `predict.smoke.ts`.

The two engine-surface gaps named above (`costScaling` + stasis-aware-tick on click-driven income) are not methodology stresses — they're engine-substrate limits the methodology kit correctly identifies. The methodology kit pointed at the right primitive in both cases; the primitive isn't yet available in the form the consumer wants.

Future archetypes calibrating against the kit have a known-clean baseline here.
