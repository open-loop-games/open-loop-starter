# Phase-Alternation — prework handoff (pre-archetype-doc)

> **What this file is.** A consolidation of Phase 2 research (OL-567, subtask of
> OL-558) covering the Phase-Alternation archetype: cross-corpus evidence rollup,
> framing decisions, engine-posture flag, and open questions. No implementation
> happened. The file refines the problem, settles on framing decisions, and
> explicitly defers the highest-cost engine question to Phase 3b.
>
> **What this file is for.** The next session should:
>
> 1. Wait for Phase 3b (OL-568) to publish its primitive-surface synthesis
>    resolving the phase-transition modifier-set swap question.
> 2. Draft `archetypes/phase-alternation.md` against `archetypes/_template.md`,
>    using the decisions below as input and `archetypes/producer.md` as format
>    reference.
> 3. Include an explicit "contrast with Phase-Shifter OL-544" section in the
>    archetype doc (per taxonomy § 3D mandate).
> 4. Once the archetype doc is approved, **delete this file** — it is scaffolding.
>
> **Status:** prework. Not a canonical archetype spec.
>
> **BLOCK:** Archetype doc MUST NOT be drafted until Phase 3b (OL-568) resolves
> the primitive-surface question for the phase-transition modifier-set swap.

---

## Source context

**Umbrella:** OL-558 (Arcade + Market Archetypes study — Wave-2 archetype candidates).

**Phase 1 (OL-559):** Five-corpus survey (WC3 UMS, SC2 Arcade, Dota 2 custom,
Steam standalone, Flash era) cross-checked against the 87-game wave-4 research
corpus. Phase-Alternation was one of seven Wave-2 candidates. The Phase 1 scratch
rollup established:

- ~13 cross-corpus games with strong Steam-cluster density.
- Decision 4 framing: "Is Phase-Alternation a genuine pattern or emergent
  composition?" — resolved as both, per era.
- Confirmation that Phase-Alternation does NOT collapse into Phase-Shifter OL-544.

**Phase 2 (OL-563 LIBRARY filing, OL-564 taxonomy):** The pattern was promoted
to `patterns/tier-3-moderate/phase-alternation.md`. The taxonomy entry § 2F and
§ 3D formalise the per-archetype findings and the Phase-Alternation ↔ Phase-Shifter
relationship.

**Decision 4 framing — resolution:** The v4 corpus sees Phase-Alternation only
as an emergent composition of Loop 13 + Loop 14 + Loop 9 (pre-crystallisation
framing). The Steam 2015+ cluster shows that same composition has crystallised
into a first-class genre shape. Both framings are accurate for their respective
corpus eras. The LIBRARY pattern treats this as a single pattern with two
historical framings: pre-crystallisation composition (pre-2015) and Steam-native
genre crystallisation (2015+). The archetype doc inherits this framing.

**Phase 3a (OL-567):** This prework file. One of seven parallel Wave-2 prework
filings. Phase 3b (OL-568) produces the primitive-surface synthesis.

---

## The design problem, restated

A game cycles between two distinct loop modes — typically a build phase and a
defend phase — with shared state carrying across each cycle. The rhythm is
cyclical escalation:

1. **Build phase:** resources are gathered, infrastructure is placed, preparations
   are made. Calm, exploratory, consequential.
2. **Defend phase:** enemies arrive and the infrastructure built in Phase A is
   tested under pressure. Escalating threat, reactive, high stakes.
3. **Cycle completes:** surviving the defend phase unlocks the next build phase
   with accumulated carry-over state intact (resources, map, infrastructure).
4. **Repeat with escalating stakes** — each defend phase is harder than the last;
   the build phase must provide enough return to stay relevant.

The core tension is that both impulses — building and defending — appear to
conflict in pacing. Pure wave-TD forces rushed placements inside the pressure
window; pure base-building loses urgency over time. Phase-Alternation resolves
this by separating the modes into named, timer-governed phases that share
the same resource pool and map topology.

**Shared state is load-bearing.** The build area and defend area are the same
space. What the player constructs in Phase A is tested in Phase B. Gold collected
during Kingdom's night (from dropped coins) is spent in the next day. The
sunk-cost investment effect — "that moat is mine; I need to defend it" — depends
entirely on phase-to-phase state continuity.

**Escalation across cycles is required.** Identical repeated cycles are
monotonous. Loop 9 (Enemy Scaling) ensures each defend phase escalates. The
designer's handle: upgrade density during the build phase should slightly outpace
wave difficulty in early cycles, compress to near-parity in mid-game, and require
hard tradeoffs in late game.

---

## Archetype framing

**Wave-2 candidate.** Phase-Alternation does not collapse into any OL-537
Wave-1 archetype:

- **Not Producer / Scaler / Interlocker** — the resource graph is a means to the
  phase loop, not the commitment itself.
- **Not Looper** — no action queue, no repeated content mastery loop.
- **Not Explorer** — map topology is shared container, not territory to chart.
- **Not Scripter** — no authored queue artifact.
- **Not Phase-Shifter** — this is the critical distinction (see below).
- **Not Director** — Director is a meta-mechanic archetype (authoring adversarial
  pressure); Phase-Alternation is a first-order game commitment (surviving
  cyclical defense phases).

**Does NOT collapse to Phase-Shifter (OL-544). Both are real patterns.**
The distinction is architectural, not superficial:

| Property | Phase-Alternation | Phase-Shifter OL-544 |
|---|---|---|
| Transition direction | Cyclical (A -> B -> A -> B) | One-way (A -> B -> C, irreversible) |
| Mode identity | Self-similar cycles | Each phase qualitatively new |
| Shared state | Same pool, same map across all cycles | May replace resources/mechanics wholesale |
| Engine posture | Phase-oscillator with shared state channels | Phase-state flag |
| Exemplars | Kingdom, Thronefall, Dome Keeper | A Dark Room, Universal Paperclips |

The engine posture for each differs. This is why the two must be separate
archetype entries and cannot share a vars schema.

**Status:** `candidate` (per template). Becomes `canonical` after a shipped
implementation proves the composition viable.

---

## Distinguishing properties

The four archetypal loops that jointly define Phase-Alternation, and their
phase-specific roles:

| Loop | Role | Active phase(s) |
|---|---|---|
| **Loop 13 — Seasonal/Weather** | Phase timer: the cyclical day/night or round boundary that fires the phase-transition event | Both (timer runs continuously) |
| **Loop 14 — Cooldown/Energy** | Phase duration: each phase has a bounded length before the timer fires the transition | Both (separate duration budgets per phase) |
| **Loop 9 — Enemy Scaling** | Defend phase escalation: each cycle's wave is harder than the last | Phase B (defend) only |
| **Loop 7 — Auto-production** | Build phase output: infrastructure placed in Phase A auto-generates resources and defense observable in Phase B | Phase A primarily; output observable in Phase B |

Removing any single loop collapses the pattern:

- Without Loop 13: no cyclical alternation (single-mode game).
- Without Loop 14: phase transitions are instantaneous; build-phase depth vanishes.
- Without Loop 9: the defend phase is static and loses urgency after cycle 2.
- Without Loop 7: the build phase is cosmetic — nothing auto-produces during
  defense, so build decisions carry no mechanical payoff into the defend phase.

---

## Lineage evidence

**Steam formation moment (2015):** Kingdom: Classic (Noio and Licorice, 2015,
65k all-time peak) is the crystallisation event. The day/night cadence, the
shared coin economy, and the persistent kingdom infrastructure are the first
explicit commitment to Phase-Alternation as genre identity, not as an emergent
property of a TD variant.

**Steam-native genealogy (2015–2025):**

- Kingdom Two Crowns (2018, 27k peak, 88% rating) — co-op iteration on Classic;
  the most explicit "this IS the genre" public statement.
- They Are Billions (Numantian Games, 2019, 22k peak) — RTS scale; colony
  planning during build phase vs. zombie-swarm defend phase; shared map topology
  is critical to the pattern.
- Dome Keeper (Bippinbits, 2022, 6.9k peak, ~90% rating) — dig-and-defend; the
  mine (build phase) is also the threat corridor (defend phase); spatial axis
  is load-bearing.
- The Last Spell (CCCP, 2023, 6.8k peak) — tactical RPG overlay; per-hero skill
  accumulation composing with the Phase-Alternation cycle.
- Thronefall (Grizzly Games, 2024, 6.7k peak, 94.03% rating) — the distilled
  modern exemplar; minimal micro, maximal placement decision, clean phase timer,
  explicit round counter. Highest Steam rating in the cluster.
- The King is Watching (2025, 17.9k peak, 86% rating) — real-time kingdom
  management in build phase; periodic raid defend phase.

**Additional Steam cluster members:** 7 Days to Die (125k peak; six-day
build/fortify cycle then Blood Moon horde night), The Riftbreaker (22k peak),
The Front, Outpost Infinity Siege.

**Pre-crystallisation — weak precursors:**

- Candy Box 2 (Flash, 2013, aniwey) — shop/quest cycle with shared candy
  currency as the bridge. Leans toward Phase-Shifter in its dominant arc
  (each quest unlock is a narrative expansion), but the two-mode feel and
  shared resource bridge qualify it as a weak precursor.
- A Dark Room (Flash/web, 2013) — overall day/night building phase is
  Phase-Alternation-adjacent, but A Dark Room's dominant arc is Phase-Shifter
  (each phase irreversibly expands the game's mechanics). Filed as Phase-Shifter
  in its dominant reading; noted here as precursor evidence only.
- colors-runners-clone (v4 corpus) — the strongest pre-Steam instance. Two
  named GameStates (Runner and Idle), a shared _score variable, city-completion
  state triggering the next Runner level, and an explicit onReset signal restoring
  Runner state. Runner phase earns score; Idle phase spends it on city
  construction. The bidirectional state linkage meets the load-bearing
  Phase-Alternation criterion. (GameManager.cs:59-67)

Zero-to-sparse pre-Steam corpus does not reduce confidence. The Steam cluster
density (11 games, consistent 86–94% ratings, multi-year genealogy) is
sufficient for strong confidence.

---

## Cross-corpus evidence

**Total: ~13–16 games across 5+ corpora. Confidence: strong.**

| Corpus | Count | Key exemplars |
|---|---|---|
| WC3 UMS | 0 | — |
| SC2 Arcade | 1 strong | Hero Line Wars Starlight (build-phase + wave-defense cyclical, ~200–230 lobbies/week EU+US) |
| Dota 2 custom | 1 | Custom Hero Chaos (dual-tagged Auto-battler + Phase-Alternation; hero-upgrade build phase + wave-survival defend phase) |
| Steam | 11 | Kingdom Classic (65k), Kingdom Two Crowns (27k), Thronefall (6.7k, 94%), Dome Keeper (6.9k), The Last Spell (6.8k), The King is Watching (17.9k), 7 Days to Die (125k), They Are Billions (22k), The Riftbreaker (22k), The Front, Outpost Infinity Siege |
| Flash | 2 weak | Candy Box 2 (shop/quest cycle), A Dark Room (day/night arc — dominant reading is Phase-Shifter) |
| v4 corpus | 1 strong + 2 near | colors-runners-clone (strong); Sandcastle Builder, Kittens Game (near-misses) |

All seven Wave-2 candidates clear the >=5-game promotion threshold. Phase-Alternation
sits at the lower end of the count range (13–16 vs. Defender's ~80) but the Steam
cluster cohesion and rating signals are strong.

---

## Spatial axis

**Primary:** Spatial-as-container. The build area and defend area are the same
shared topology — the fort, the colony, the outpost. There is no separate "build
world" and "defend world." Infrastructure placed on the map during Phase A is
the infrastructure that blocks, channels, and is attacked during Phase B.

**Secondary (some variants):** Placement-Adjacency within the build phase.
Thronefall's fortress layout decisions, Kingdom's coin-gathering spatial strategy,
Dome Keeper's dig-path routing — all implement spatial placement decisions during
the calm phase with mechanical consequences in the pressure phase.

The spatial model distinguishes Phase-Alternation from pure Survivor (spatial-
as-container with reactive repositioning, no build commitment) and from pure
Defender (placement-primary with no alternating rest phase).

---

## MDA aesthetic

**Challenge (defend phase)** — the pressure of survival against escalating threats;
the optimization of "did I build correctly?"

**Submission (build phase)** — the relaxed, low-stakes activity of placing
infrastructure, spending resources, and preparing. The rest that makes the defend
phase's tension tolerable.

**Completion (wave-clear)** — each defend-phase survival is a discrete completion
event. "Survived Wave 7" is a granular success moment. Compounds with the build
phase's "placed the final wall" moment.

The three aesthetics interlock. Submission makes Challenge sustainable; Challenge
makes Submission feel purposeful; Completion provides the pulse that keeps both
phases from feeling like a plateau.

---

## Engine posture

> **FLAG: This is the archetype with the highest engine-cost question in the
> Wave-2 survey. The primitive-surface question is explicitly deferred to
> Phase 3b (OL-568). DO NOT pre-decide. DO NOT modify this wording without
> reading OL-568's output first.**

The following is copied verbatim from taxonomy § 2F (the authoritative source):

> "Minor extension possibly needed: a phase-state primitive or phase-oscillator
> on top of `createLoop` + `createSequencer`. Shared state across the phase
> boundary is already supported via `createResource` with persistent values; what
> is potentially missing is the phase-transition modifier-set swap (different
> buildings active in build phase vs. defend phase, different income rates). This
> may compose cleanly from existing primitives with a `phaseTag` on modifiers;
> Phase 3b (OL-568) will confirm."

Note on taxonomy wording vs. prompt wording: the prompt quoted the taxonomy as
ending "Phase 3b (OL-568) will confirm." The taxonomy § 2F actually ends "Phase 3
sketch will confirm" without the OL-568 ticket reference. The LIBRARY pattern
file (phase-alternation.md § Engine Posture) uses "Phase 3b will confirm." Both
refer to the same work item. This is a minor phrasing variant, not a substantive
difference. OL-568 is the correct ticket reference for Phase 3b.

The LIBRARY pattern file expands with the specific open question:

> Does the phase-transition modifier-set swap compose cleanly on `createLoop` +
> `createSequencer`, or does it warrant a dedicated `phase-state` primitive that
> manages the phase boundary event, fires modifier-set activation/deactivation,
> and enforces shared-state discipline?

Two candidate resolutions for Phase 3b to confirm:

1. **Composition path:** `createSequencer` (phase-turn cadence) + `createLoop`
   (cycle tracking) + modifier-chain conditioning (`phaseTag` on modifiers for
   phase-specific effects) covers all exemplars without a new primitive.
2. **New primitive path:** A `createPhase` primitive is warranted to manage the
   phase boundary event, fire modifier-set activation/deactivation, and enforce
   shared-state discipline as a first-class engine concept.

**What is already confirmed:**

- `createResource` is sufficient for shared state across the phase boundary
  (same resource pool reads and writes from both phases — no gap here).
- `createLoop` handles cycle tracking and cross-cycle escalation parameter storage.
- `createSequencer` is the candidate for phase-turn cadence; whether it covers
  the modifier-set swap is the unresolved question.

**The archetype doc must not be drafted until OL-568 resolves this.** The vars
schema for `PhaseAlternationArchetypeVars` cannot be finalised without knowing
whether a `createPhase` primitive exists in the engine surface or whether the
consumer side wires phase-switching manually through modifier conditioning.

---

## Open questions for the archetype doc

These remain unresolved from prework. Each needs a decision before or during
the `archetypes/phase-alternation.md` draft.

1. **Phase 3b primitive resolution (BLOCKING — OL-568).** Does the modifier-set
   swap compose cleanly from existing primitives, or does `createPhase` land in
   the engine? The answer directly shapes § 3 (Engine surface) and § 5 (Vars
   schema) of the archetype doc.

2. **Macro-scale Phase-Shifter qualities.** Several Phase-Alternation games have
   a Phase-Shifter-like arc at the macro scale while still cycling at the micro
   scale. They Are Billions gets qualitatively harder over nights until it reaches
   a campaign end-state. 7 Days to Die escalates toward an implied endgame. The
   Last Spell has a narrative closure. The archetype doc must make the framing
   explicit: micro-scale cycling + macro-scale escalation toward closure is
   Phase-Alternation; the macro arc does not make it Phase-Shifter because the
   mode transitions remain cyclical at the game's core loop level. Taxonomy § 3D
   mandates a "contrast with Phase-Shifter" section in the archetype doc.

3. **`PhaseAlternationArchetypeVars` shape.** Sketch pending OL-568 output. Known
   structural fork decisions (fields that belong in ArchetypeVars, not BalanceVars):
   - `phaseCycleMode`: `'day-night' | 'round-timer' | 'continuous-interrupt'` —
     the three variations from the LIBRARY pattern (Variation 1/2/3).
   - `buildPhaseEnabled: boolean` — false for Defender-only skeleton.
   - `defendPhaseEnabled: boolean` — false for base-building-only skeleton.
   - Whether a `createPhase` primitive appears in this interface depends entirely
     on OL-568's resolution.

4. **`PhaseAlternationBalanceVars` — full enumeration needed.** At minimum:
   build-phase duration (seconds), defend-phase wave count per cycle, wave
   escalation rate per cycle, resource income during build phase, enemy spawn
   rate curve parameters. Exact shape depends on the reference-implementation
   skeleton chosen for the archetype doc.

5. **Beat map.** The LIBRARY pattern does not specify a beat map; that belongs in
   the archetype doc. Starting sketch:
   - Beat 1: first build phase completes (tutorial complete, 0–2 min).
   - Beat 2: first defend phase survived (investment payoff lands, 2–8 min).
   - Beat 3: first defend phase where build decisions were notably consequential
     (spatial investment effect, 8–20 min).
   - Beat 4: escalation crosses a threshold requiring deliberate upgrade choices
     (mid-game pacing shift, 20–45 min).
   - Beat 5: late-game pressure — player must optimise rather than grow freely
     (45–75 min).
   - Beat 6: arc closure — final wave cleared or endgame condition reached
     (75–120 min).
   Full beat map requires the reference-implementation skeleton to calibrate
   sim-time windows.

6. **"Contrast with Phase-Shifter" section (REQUIRED per taxonomy § 3D).** The
   taxonomy is explicit: "The LIBRARY writeup for Phase-Alternation should include
   an explicit 'contrast with Phase-Shifter' section." The archetype doc must
   include this. The LIBRARY pattern already has a Critical Distinction section;
   the archetype doc's contrast section should extend it with archetype-specific
   engine implications (Phase-Shifter posture is flag-based; Phase-Alternation
   posture is oscillator-based or `createPhase`-based per OL-568 resolution).

7. **Themes enumeration (§ 10).** Candidate list (must be 3–5, costume-only):
   - **Day/Night Kingdom** — medieval kingdom; daylight building, nightfall attacks;
     coin economy. Direct Kingdom lineage.
   - **Blood Moon Survival** — survival-crafting; six-day build cycle, Blood Moon
     horde event. Direct 7 Days to Die lineage.
   - **Deep Mine Defender** — dig-and-defend; mine is build area and threat
     corridor. Direct Dome Keeper lineage.
   - **Orbital Outpost** — sci-fi; colonisation phase, raid phase; shared base
     topology.
   - **Tactical Round** — abstracted; Preparation phase and Assault phase with
     explicit round counter. Direct Thronefall lineage.
   Pick 3 minimum; all must touch ThemeVars only (resource names, copy, art
   direction — no balance or structural changes).

---

## Cross-references

**Pattern library:**
- `open-loop-research/patterns/tier-3-moderate/phase-alternation.md` — canonical
  pattern writeup. Primary source for evidence, loop composition, spatial axis,
  MDA aesthetics, variations, historical arc, and engine posture verbatim quote.

**Taxonomy:**
- `open-loop-research/reports/studies/arcade-market-archetypes/arcade-market-archetypes-taxonomy.md`
  § 2F Phase-Alternation — per-archetype cross-corpus entry; source of the
  authoritative engine-posture verbatim quote.
- `open-loop-research/reports/studies/arcade-market-archetypes/arcade-market-archetypes-taxonomy.md`
  § 3D Phase-Alternation vs. Phase-Shifter OL-544 — cyclical vs. one-way
  relationship; architecture of the required "contrast" section in the archetype doc.

**Scratch:**
- `open-loop-research/inbox/arcade-market-archetypes-scratch.md` § "Phase-Alternation
  (cyclical two-loop share-state)" (~line 324) — cross-corpus evidence rollup.
- `open-loop-research/inbox/arcade-market-archetypes-scratch.md` § "Decision 4:
  Phase-Alternation — genuine pattern or emergent composition?" (~line 421) — the
  framing-resolution justifying Phase-Alternation as a first-class pattern.

**Adjacent archetype:**
- OL-544 (Phase-Shifter) — the cyclical-vs-one-way sibling. Non-subsumable.
  Phase-Shifter prework or archetype doc should receive a cross-reference back
  to Phase-Alternation once this prework resolves.

**Blocking ticket:**
- OL-568 (Phase 3b primitive-surface synthesis) — resolves the phase-transition
  modifier-set swap question. Archetype doc is blocked on this ticket.

---

## Next-session instructions

1. Read this file.
2. Read `archetypes/_template.md` and `archetypes/producer.md` as format reference.
3. **Check OL-568 status.** If OL-568 is not done, stop — the archetype doc
   cannot be drafted. If OL-568 is done, read its primitive-surface synthesis
   before proceeding.
4. Draft `archetypes/phase-alternation.md` against `_template.md`:
   - In § 2 (Pattern composition), cite Phase-Alternation (LIBRARY tier-3-moderate)
     plus its four constituent loops and their cross-pattern property engagements.
   - In § 3 (Engine surface), enumerate primitives confirmed by OL-568 output.
     If `createPhase` landed, cite it. If composition path was confirmed, note
     `createSequencer` + `createLoop` + modifier conditioning. Do not invent
     primitive names — every name in § 3 must resolve in
     `open-loop-engine/docs/api/INDEX.md`.
   - In § 4 (Beat map), use the sketch in Open Question #5 above as the starting
     point; calibrate sim-time windows against the reference-implementation skeleton.
   - In § 5 (Vars schema), use `PhaseAlternationArchetypeVars`,
     `PhaseAlternationThemeVars`, `PhaseAlternationBalanceVars` as interface names.
   - Include an explicit "Contrast with Phase-Shifter OL-544" note inside § 2 or
     as a sidebar — required per taxonomy § 3D. Cross-reference OL-544 as the
     cyclical-vs-one-way sibling. Distinguish engine posture.
   - In § 10 (Themes), choose 3–5 from the candidate list in Open Question #7.
5. Once `phase-alternation.md` is reviewed and approved, **delete this file**.

---

## References

- Pattern: `open-loop-research/patterns/tier-3-moderate/phase-alternation.md`
- Taxonomy § 2F and § 3D: `open-loop-research/reports/studies/arcade-market-archetypes/arcade-market-archetypes-taxonomy.md`
- Scratch evidence: `open-loop-research/inbox/arcade-market-archetypes-scratch.md`
- Phase-Shifter: OL-544 (adjacent archetype — cyclical vs. one-way sibling)
- Phase 3b primitive-surface: OL-568 (blocking ticket for archetype doc)
- Archetype template: `archetypes/_template.md`
- Format reference: `archetypes/producer.md`

---

## UI prescription hook (OL-582)

The archetype-doc drafting session must fill § 9 UI prescription against `archetypes/_template.md`. Prescriptions must cite one of three data artifacts under `open-loop-research/practical/ui-ux/`, or carry a `` `declared invention` `` tag with rationale.

**Data artifacts:**

- `layout-audit-2026.md` — per-game classification rows (69 games; shell, nav pattern, notable widgets, form-factor intent).
- `subgenre-shell-mapping-2026.md` — sub-genre × shell majority cross-tab. Only `incremental-math` has a strong single-shell majority; every other mid-size sub-genre offers a primary + secondary shell pair.
- `widget-vocabulary.md` — 10 ARIA-aligned widgets (lift targets for reka-ui primitives in `@/lib`) + 9 domain widgets (per-fork implementation; no pre-abstraction per OL-273 Phase 2 lift-first policy).

**Sub-genre mapping for Phase-Alternation:** Phase-Alternation is cyclical-phase archetype (contrast with OL-544 Phase-shifter's one-way transition). No direct audit sub-genre match. Reference `time-loop` sub-genre rows (three-panel weak majority: Idle Loops, Omsi Loops) for cyclical-phase UI patterns; the phase-alternation-specific mode-switch widget is `` `declared invention` ``. Primary shell candidates: `ThreePanelShell` (idle-loops precedent) or `SidebarMainShell` (if one phase is dominant-mode).

**Shell name resolution.** `{{ShellName}}` must resolve to a file in `open-loop-starter/src/lib/shells/*.vue`. Starter ships five of the audit's six shells (`MultiColumnShell`, `SidebarMainShell`, `SingleColumnShell`, `TabsBarShell`, `ThreePanelShell`); `free-form` shell shapes are always `declared invention` against starter today.

**Form-factor intent.** Desktop per time-loop corpus distribution. Mobile-native commitments are `` `declared invention` ``.

**Reference retrofits.** `archetypes/producer.md` (three-panel, narrative clicker), `archetypes/looper.md` (three-panel, time-loop), `archetypes/scaler.md` (sidebar-main, prestige idle). Soft coupling with Phase-shifter (OL-544) — the cyclical-vs-one-way contrast should be symmetric between the two docs' § 9 sections.
