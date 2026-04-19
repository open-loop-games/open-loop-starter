# Tug — prework handoff (pre-archetype-doc)

> **What this file is.** A consolidation of Phase 3a of OL-558 (subtask OL-567)
> covering the Tug archetype — adversarial auto-send lane push. This is one of
> seven parallel archetype preworks produced in the same batch. It promotes
> findings from the arcade-market-archetypes Phase 1–2 research directly; no
> new research was conducted here.
>
> **What this file is for.** The next session should:
>
> 1. Draft `archetypes/tug.md` against `archetypes/_template.md`, using the
>    decisions below as input and `archetypes/producer.md` as format reference.
>    Cross-reference Director as an adjacent archetype, not a superset.
> 2. Once `archetypes/tug.md` is approved, **delete this file** — it's
>    scaffolding.
>
> **Status:** prework. Not a canonical archetype spec.

---

## Source context

**Tickets:** OL-558 (arcade + market archetype corpus survey, umbrella) →
OL-567 (Phase 3a: Tug prework, this subtask).

**Research lineage:**

- Phase 1 (OL-559): five-corpus extraction (WC3 UMS top-101, SC2 Arcade
  top-60, Dota 2 custom top-32, Steam Idler/TD/Auto Battler/Survivor tags,
  Flash Armor Games + Kongregate 45 entries). Scratch output:
  `open-loop-research/inbox/arcade-market-archetypes-scratch.md`.
- Phase 2 (OL-564): cross-corpus taxonomy synthesis. Output:
  `open-loop-research/reports/studies/arcade-market-archetypes/arcade-market-archetypes-taxonomy.md`
  §2C (Tug entry), §3B (Tug ↔ Director relationship), §1 framing shift 1
  (Tug is not a Director variant).
- Spatial pattern filed (Phase 2, OL-562): `open-loop-research/patterns/
  tier-4-specialized/routing-traversal.md` — Tug is the primary consumer of
  the Routing-Traversal pattern.

**Key Phase 1 finding (critical finding #1 in scratch):** Tug has
triple-platform-taxonomy confirmation. Three independent communities named this
archetype without coordination:

- **WC3 Hive Workshop:** "Offense / Auto-send / Tug of War" is its own
  community-recognized thread category (4 explicit Tug maps + 4 Defender+Tug
  hybrids in the top-101).
- **SC2 Blizzard platform API:** `{id: 5, code: "TugOfWar", name: "Tug Of War"}`
  is a first-class Blizzard-assigned platform category. 9 maps classified under
  it in the top-60 + 2 mislabeled as Other. Direct Strike alone draws ~58k
  lobbies/week and ~294k participants/week (4-week average, sc2arcade.com API).
- **Armor Games Flash:** A coherent lane-push subgenre (Warfare 1917, Warfare
  1944, Age of War, Army of Ages) with repeat developers ConArtist and Louissi.
  Independent of both WC3 and SC2 lineages.

This naming convergence is the strongest naming evidence in the entire Phase 1
survey — stronger than any other archetype candidate.

---

## The design problem, restated

Two competing forces send units along a shared lane topology toward each
other's base. Economic decisions fund auto-production. Units resolve combat
automatically when they meet in the lane. Victory requires out-producing or
out-countering the opponent.

The three defining commitments:

1. **Shared adversarial topology** — both sides use the same lane space. The
   meeting-point between the two auto-walking forces is the contested front.
   Ground gained means the front moves toward the enemy's origin.

2. **Auto-send** — production queues units without per-unit commands. The
   player's decision is *what to send and when* (composition, timing, income
   allocation), not *where each unit moves*. This is the "set it and watch it
   play out" mechanic. The auto-resolve after composition decisions creates a
   Submission aesthetic alongside the Challenge of economic optimization.

3. **Lane push** — momentum accumulates until a base falls or a score threshold
   triggers. There is no randomized reset between rounds (unlike Auto-battler);
   each send directly contributes to or retreats from the current front-line
   position.

This is not a supervision mechanic (Director's posture — you tune something
else that fights for you). It is a direct competitive resource-allocation game
where the player is competing in the challenge, not authoring it.

---

## Archetype framing

**Tug does NOT collapse to Director.** This was the primary framing risk in
OL-558's original ticket (see scratch § "Decision 2: Tug collapses to Director
topology variant?" and taxonomy § 3B).

The distinction:

- **Director** is a meta-mechanic archetype. The player's commitment is
  *authoring or tuning adversarial pressure* — designing the challenge, setting
  parameters, curating difficulty. The player observes and steers an autonomous
  simulation.
- **Tug** is a first-order competitive commitment. The player's commitment is
  *competing in the challenge* — out-producing or out-countering an opponent
  (live or AI). The player is a participant, not an author.

Director's prework (OL-545, `archetypes/_director-prework.md`) cites WC3
Footmen Frenzy, Castle Fight, and X Hero Siege as exemplars — all of which are
Tug exemplars. This co-citation is descriptive (Director's experience might
involve authoring or tuning pressure *against* a Tug-shaped topology) but not
reductive. Director never subsumes Tug's mechanics; it operates at a different
abstraction level. The same logic applies to Defender: a Director experience
might tune a TD-shaped difficulty system, but TD is not a Director variant.

Three independent platform taxonomies treat these as distinct categories. The
taxonomy (§ 3B) and Director prework have both been updated to reflect this.
See also `open-loop-research/patterns/tier-4-specialized/routing-traversal.md`
§ Resulting Context → "Director topology vocabulary" for the precise
relationship.

**Proposed name:** **Tug.** Direct, consistent with SC2 Blizzard's category
name (`TugOfWar`), and unambiguous in genre vocabulary. Locked by taxonomy.

**Status:** `candidate` (per template). Wave-2 filing target.

---

## Distinguishing properties

**Loop composition** (taxonomy § 2C):

| Loop | Role in Tug |
|------|-------------|
| Loop 6 (Resource Accumulation) | Build economy — income funds unit production |
| Loop 7 (Auto-production) | Units produced automatically from buildings or income without per-unit commands |
| Loop 9 (Enemy Scaling) | Opponent's sends escalate with progress; pressure is not static |
| Loop 15 (Adversarial/zero-sum) | Opponent state is directly opposed to player state — **this is what makes Tug architecturally distinct from Defender** |

Loop 15 is load-bearing. Defender also has Loop 9 (enemy scaling) but the
scaling threat is authored by the game designer — it is a designed escalation,
not an opponent adapting in real time. In Tug, the opponent's sends are a live
or AI-mirrored competitive response. The zero-sum framing (every unit the
opponent sends threatens the front line you hold) produces a qualitatively
different strategic posture than wave-defense.

**MDA aesthetics:** Challenge (primary — economic decisions under adversarial
pressure) + Submission (the auto-resolve combat after economic decisions creates
the "set composition, watch it play out" quality — reduces moment-to-moment APM
while maintaining strategic tension).

---

## Lineage evidence

**WC3 UMS formation (2003+):**
- Castle Fight — auto-spawners from economy; terrain-shaped (not lane-forced)
  routing; the foundational Tug topology.
- Footmen Frenzy / Footmen Wars — 4-corner FFA, autonomous unit flow, rounds
  with upgrades. (Note: Director prework historically cited this; it is a Tug
  exemplar, not a Director implementation — see `_director-prework.md`
  reframing applied in this batch.)
- X Hero Siege — wave pacing, hero-leveling economy, auto-send unit waves.
- Defend the Lich King, Civ Wars, Tech Wars — three additional explicit Tug
  maps in top-101 Hive thread.

**SC2 Arcade formalization (2011–2013+):**
- Desert Strike lineage (2011+) — buildings spawn auto-walk units toward
  enemy shrine. Multiple variants (Desert Strike, Rapid Strike).
- Direct Strike (2013+) — the dominant live Tug title by activity data:
  ~58k lobbies/week combined EU+US, ~294k participants/week (sc2arcade.com
  API, 4-week average 2026). Players select SC2 units, place in formation on
  their side; automated combat resolves until one fortress falls.
- Nexus Wars, Lordaeron Strike, Colonial Line Wars — three additional
  TugOfWar-category maps.
- Total: 9 platform-classified TugOfWar + 2 mislabeled Other but mechanically
  matching = 11 in top-60.

**Armor Games Flash (independent lineage, 2007–2009):**
- Age of War (2007, Louissi) — era-progression; auto-advance units; 5 ages
  with unit unlocks.
- Warfare 1917 (2008, ConArtist) — WW1 infantry/tank lane advance; territory
  capture via unit advance.
- Warfare 1944 (ConArtist) — three horizontal battle planes; flanking via
  secondary lanes.
- Army of Ages (Louissi) — era-based variant of the Age of War shape.
- ConArtist and Louissi as repeat developers confirm this is an intentional
  genre commitment, not coincidental overlap with WC3/SC2. No evidence of
  cross-inspiration with the SC2 lineage.

**Dota 2 custom games (WC3 lineage ports, 2014+):**
- Legion TD — WC3-lineage port; Tug lane with unit placement grid (hybrid:
  Routing-Traversal + Placement-Adjacency).
- Castle Fight — direct WC3 port.

**Steam standalone (2019–2021+):**
- Minion Masters (2019) — card-based unit deployment in a lane-push framework;
  standalone commercial Tug product.
- Legion TD 2 (2021) — Steam standalone successor to the WC3 Legion TD lineage.
  Dedicated Steam game, not an arcade mod.
- Art of War: Red Tides — RTS-adjacent lane-push with unit composition
  decisions.

---

## Cross-corpus evidence summary

~24 games across 5 corpora (taxonomy § 2C cross-corpus evidence table):

| Corpus | Count | Notes |
|--------|-------|-------|
| WC3 UMS | 4 explicit + 4 hybrid | Hive "Offense/Auto-send" thread category |
| SC2 Arcade | 11 (9 TugOfWar cat + 2 mislabeled) | Blizzard `{code:"TugOfWar"}` platform category |
| Dota 2 custom | 2 | Legion TD, Castle Fight — WC3 lineage ports |
| Steam | 3 | Legion TD 2, Minion Masters, Art of War: Red Tides |
| Flash (Armor Games) | 4 | Warfare 1917/1944, Age of War, Army of Ages |

**Confidence: strong.** Triple-platform-taxonomy confirmation + ~24 games
across 5 corpora + a Blizzard-assigned platform category name constitute the
strongest naming evidence in the entire Phase 1 survey.

---

## Spatial axis

**Primary: Routing-Traversal** — units auto-walk along lanes; lane topology
defines the combat geometry. The shared lane is the contested territory; the
meeting-point between two auto-walking forces is the mechanic. See
`open-loop-research/patterns/tier-4-specialized/routing-traversal.md` —
specifically the "Lane-push topology" variation (§ Variation 2) and the
"Adversarial shared topology (Tug variant)" sub-commitment in the Solution
section.

**Secondary: Placement-Adjacency** — in line-wars variants where tower
placement contributes to the lane geometry (Line Tower Wars, Hero Line Wars,
Legion TD). When towers occupy cells along the lane and unit flow interacts
with tower adjacency bonuses, both patterns are active simultaneously. See
`open-loop-research/patterns/tier-4-specialized/placement-adjacency.md` for
the sibling distinction.

Pure Tug implementations (Direct Strike, Age of War, Warfare 1917) use only
Routing-Traversal; the lane is fixed and the player's decision is composition
and timing, not placement. Line-wars hybrids (Legion TD, Line Tower Wars, Hero
Line Wars) add Placement-Adjacency as a second spatial axis.

---

## Engine posture

**COPY AS-IS from taxonomy § 2C. Zero new primitives needed.**

Composition:

- `createResource` — economy (income rate, bank, send costs, build costs)
- `createSequencer` — auto-send queues (timed unit production from buildings
  or triggered sends)
- `createZoneSystem` — lane topology (zone definitions for the shared lane,
  front-line position tracking, origin/destination zones)

**Opponent state:**
- Against **AI opponent**: mirrored `createResource` + `createSequencer`
  instances on the opponent side. The AI's income and send decisions are
  consumer-layer logic, not an engine primitive.
- Against **live opponent** (multiplayer): consumer-layer state management.
  The engine's single-player primitives compose without modification for each
  player's side; synchronization is outside engine scope.

**Do NOT re-decide this engine surface.** The taxonomy's posture is settled
for Phase 3a. Phase 3b (`arcade-market-archetypes-primitive-surface.md`) is
the correct venue for any engine surface re-examination.

---

## Open questions for the drafting session

Phase 3a prework does not resolve these. Each needs a call before or during
the `archetypes/tug.md` draft:

1. **Edge cases: hybrid archetypes.** Hero Line Wars is explicitly called out
   in WC3 data as a Tug+Defender hybrid (Tug auto-send mechanic + Defender
   tower-placement survival). How does the Tug archetype doc handle games on
   the boundary? Template §2 requires a clear pattern composition — a hybrid
   would need to call out both.

2. **Deckbuilder-adjacent extensions.** Minion Masters introduces a card-draw
   mechanic (cards are the send queue, not raw resource spend). Does this
   warrant an optional pattern modifier in §2, or is it a theme-level variant?
   The archetype should not claim deckbuilder mechanics unless a second
   independent consumer uses them.

3. **`TugArchetypeVars` shape.** The template requires a TypeScript vars schema
   (§5). Candidates from the taxonomy: lane count, auto-send interval, income
   rate, front-line advance rate, base HP threshold. Determine which belong in
   `ArchetypeVars` (structural) vs. `BalanceVars` (tunable).

4. **AI opponent modeling depth.** The simplest AI is a symmetric mirror
   (same income, same send rate, random composition). A richer AI has
   composition logic (counter-typing awareness). Which does the archetype
   skeleton commit to, and which defers to the fork?

5. **Beat map target windows.** The template requires 5–8 beats with sim-time
   windows. Tug is a real-time-adjacent archetype (matches take minutes, not
   hours), so the beat map structure will differ from Producer/Scaler's
   hour-scale arcs. Define whether the beat map covers one match or a meta-arc
   across matches.

6. **LIBRARY.md pattern name verification.** Template §2 validator requires
   every cited pattern resolve in `LIBRARY.md`. Confirm that Routing-Traversal
   and Placement-Adjacency are both indexed there after OL-562's Phase 2 filing.

---

## Cross-references

**Research sources:**
- `open-loop-research/inbox/arcade-market-archetypes-scratch.md`
  § "Tug (adversarial auto-send lane push)" (~line 276)
  § "Critical finding #1: Tug is NOT a Director variant" (~line 68)
  § "Decision 2: Tug collapses to Director topology variant?" (~line 384)
- `open-loop-research/reports/studies/arcade-market-archetypes/
  arcade-market-archetypes-taxonomy.md` § 2C (Tug entry), § 3B (Tug ↔
  Director), § 1 framing shift 1

**Spatial patterns:**
- `open-loop-research/patterns/tier-4-specialized/routing-traversal.md`
  — primary spatial pattern for Tug; see § Variation 2 (lane-push),
  § Adversarial shared topology, § Cross-links → Tug archetype
- `open-loop-research/patterns/tier-4-specialized/placement-adjacency.md`
  — secondary spatial pattern in line-wars Tug variants (Legion TD,
  Hero Line Wars)

**Adjacent archetypes:**
- `archetypes/_director-prework.md` — Director is adjacent (meta-mechanic
  level), not supersuming. WC3 Tug exemplars cited in Director are descriptive
  of adversarial-pressure topology, not Director implementations. See the
  reframing edit applied to that file in this same batch (OL-567).
- The Defender archetype prework (filed in parallel in this batch) — Defender
  and Tug share Loop 9 (Enemy Scaling) but diverge at Loop 15
  (Adversarial/zero-sum). Defender's threat is authored; Tug's threat is a
  live competitive opponent.

**Engine index:**
- `open-loop-engine/docs/api/INDEX.md` — primitives `createResource`,
  `createSequencer`, `createZoneSystem`

---

## Next-session instructions

1. Read this file. Read `archetypes/_template.md` and `archetypes/producer.md`.
2. Verify that `routing-traversal.md` and `placement-adjacency.md` are indexed
   in `open-loop-research/LIBRARY.md` (required for template §2 validator).
3. Draft `archetypes/tug.md` against the template.
   - Cross-reference Director as adjacent (meta-mechanic level), not a
     superset. Use the framing in § "Archetype framing" above.
   - Cross-reference Defender as sharing Loop 9 but diverging at Loop 15.
   - Cite Direct Strike (SC2, ~58k lobbies/week) and Age of War (Flash, 2007)
     as the primary cross-platform exemplars. Legion TD 2 (Steam, 2021) as the
     standalone commercial exemplar.
4. Resolve open questions (especially §5 vars schema shape and beat map
   structure) during the draft.
5. Once `archetypes/tug.md` is reviewed and approved, **delete this file**.

---

## References

- Archetype template: `archetypes/_template.md`
- Archetype format reference: `archetypes/producer.md`
- Adjacent prework (same batch): `archetypes/_director-prework.md`
- Spatial pattern (primary): `open-loop-research/patterns/tier-4-specialized/routing-traversal.md`
- Spatial pattern (secondary): `open-loop-research/patterns/tier-4-specialized/placement-adjacency.md`
- Taxonomy source: `open-loop-research/reports/studies/arcade-market-archetypes/arcade-market-archetypes-taxonomy.md`
- Phase 1 scratch: `open-loop-research/inbox/arcade-market-archetypes-scratch.md`
- Engine API index: `open-loop-engine/docs/api/INDEX.md`
- OL-558 (umbrella), OL-559 (Phase 1 extraction), OL-564 (Phase 2 taxonomy),
  OL-567 (this subtask: Phase 3a Tug prework)

---

## UI prescription hook (OL-582)

The archetype-doc drafting session must fill § 9 UI prescription against `archetypes/_template.md`. Prescriptions must cite one of three data artifacts under `open-loop-research/practical/ui-ux/`, or carry a `` `declared invention` `` tag with rationale.

**Data artifacts:**

- `layout-audit-2026.md` — per-game classification rows (69 games; shell, nav pattern, notable widgets, form-factor intent).
- `subgenre-shell-mapping-2026.md` — sub-genre × shell majority cross-tab. Only `incremental-math` has a strong single-shell majority; every other mid-size sub-genre offers a primary + secondary shell pair.
- `widget-vocabulary.md` — 10 ARIA-aligned widgets (lift targets for reka-ui primitives in `@/lib`) + 9 domain widgets (per-fork implementation; no pre-abstraction per OL-273 Phase 2 lift-first policy).

**Sub-genre mapping for Tug:** Tug (adversarial auto-send lane push) is mobile-native / touch-primary (triple-platform-taxonomy corroboration per OL-559 Phase 1). No audit sub-genre match. Primary shell is `` `declared invention` ``: compact HUD with touch-primary push-pull lane indicator. Form-factor intent is `mobile-first` as `` `declared invention` `` — the audit has ~3 mobile-first rows, none with tug-shape precedent.

**Shell name resolution.** `{{ShellName}}` must resolve to a file in `open-loop-starter/src/lib/shells/*.vue`. Starter ships five of the audit's six shells (`MultiColumnShell`, `SidebarMainShell`, `SingleColumnShell`, `TabsBarShell`, `ThreePanelShell`); `free-form` shell shapes are always `declared invention` against starter today.

**Form-factor intent.** `mobile-first` as declared invention. Cite the triple-platform-taxonomy evidence from OL-559 (this prework's source) rather than the audit — the audit does not cover Tug games.

**Reference retrofits.** `archetypes/producer.md`, `archetypes/looper.md`, `archetypes/scaler.md` show the § 9 shape against canonical-sub-genre-majority archetypes.
