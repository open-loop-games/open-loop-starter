# Defender — prework handoff (pre-archetype-doc)

> **What this file is.** A consolidation of Phase 3a research for the Defender
> archetype (OL-567 subtask under OL-558 umbrella). It synthesizes the
> cross-corpus evidence from Phase 1 and Phase 2 LIBRARY filings into a
> design-ready shape for drafting the canonical archetype doc.
>
> **What this file is for.** The next session should:
>
> 1. Draft `archetypes/defender.md` against `archetypes/_template.md`, using
>    the decisions below as input and `archetypes/producer.md` as format
>    reference.
> 2. Cross-reference `archetypes/survivor.md` (when filed) in § 2 as the
>    adjacent-not-collapsible sibling.
> 3. Once `archetypes/defender.md` is reviewed and approved, **delete this
>    file** — it's scaffolding.
>
> **Status:** prework. Not a canonical archetype spec.

---

## Source context

**OL-558** is the umbrella for the Arcade + Market Archetypes survey (seven
Wave-2 archetype candidates, five-corpus evidence base). **OL-559** is Phase 1
(mass extraction across WC3 UMS, SC2 Arcade, Dota 2 custom games, Steam, and
Flash era). The Phase 1 scratch is at:

```
open-loop-research/inbox/arcade-market-archetypes-scratch.md
```

with per-corpus slices under:

```
open-loop-research/inbox/arcade-market-archetypes/
  slice-1-wc3.md      (WC3 Hive Workshop top-100)
  slice-2-sc2.md      (SC2 Arcade API)
  slice-3-dota2.md    (Dota 2 customgamestats.com)
  slice-4-steam.md    (SteamDB Idler + Auto Battler + TD)
  slice-5-flash.md    (Kongregate + Armor Games + franchise wikis)
  v4-prevalence-pass.md (87-game wave-4 corpus check)
```

**OL-564** is Phase 2 (cross-corpus taxonomy synthesis):

```
open-loop-research/reports/studies/arcade-market-archetypes/
  arcade-market-archetypes-taxonomy.md
```

This is the primary source for the Defender archetype entries (§ 2A, § 3E,
§ 4). Read taxonomy § 2A for the full cross-corpus evidence block.

**Phase 2 LIBRARY spatial sub-split** — the v4 cluster 7b (spatial-as-mechanic)
was split into two Tier 4 Specialized patterns filed in Phase 2 (OL-562):

- `patterns/tier-4-specialized/placement-adjacency.md` — position-as-neighbor-gate.
  Primary spatial pattern for Defender.
- `patterns/tier-4-specialized/routing-traversal.md` — position-as-path-gate.
  Secondary spatial pattern in maze-TD and line-maze Defender variants.

**OL-567** is this file's ticket — one of 7 parallel Phase 3a prework agents.

---

## The design problem, restated

Defender is the archetype of **committing placement before threat arrives**.
The player places static defenders (towers, traps, turrets, structures) on a
spatial surface — a grid, a fixed map, or a placement field — before or
between enemy waves. When waves begin, combat resolves automatically. The
player cannot move defenders mid-wave; the commitment is architectural.

The four defining commitments:

1. **Static defender placement** — defenders occupy cells or positions and do
   not move after placement. Placement decisions are the primary skill
   expression.
2. **Wave-paced enemy threat** — enemies arrive in discrete, escalating waves
   with defined spawn points and paths. The wave structure gives the player
   preparation time between waves.
3. **Automatic combat resolution** — combat proceeds without per-unit commands
   once the wave begins. The player watches the outcome of their placement
   decisions play out.
4. **Stage/wave progression** — success is defined as wave clearance;
   accumulating cleared waves unlocks harder stages, new maps, or meta
   upgrades.

**Distinct from Survivor:** the defining distinction is placement commitment.
Defender requires the player to commit tower positions *before* enemy arrival.
Survivor places the player *inside* the threat and responds in real time
without pre-placement. A player running a Defender game is an architect; a
player running a Survivor game is a participant. See taxonomy § 3E and the
cross-reference note at the end of this file.

---

## Archetype framing

**Wave-2 candidate.** Defender does NOT collapse to any OL-537 Wave-1
archetype. Taxonomy § 2A's overlap statement, promoted verbatim:

> *"Distinct from Producer (generative not defensive loop), Looper (no
> wave-paced threat), Scaler (scaling is a sub-loop here, not the commitment),
> Interlocker (no mutual-gate structure), Explorer (no discovery commitment),
> Scripter (no authored-queue commitment), Phase-shifter (no one-way
> transition), and Director (placement-decision not authoring/tuning adversarial
> pressure). The commitment — place static defenders, survive waves — is not
> expressible as any Wave-1 archetype without losing its defining mechanics."*

The Wave-1 Producer, Looper, Scaler, Interlocker, Explorer, Scripter,
Phase-shifter, and Director archetypes are documented in `ARCHETYPES.md`.

**Archetype name:** Defender. Clean, names the player role, matches community
vocabulary (TD = Tower Defense, Hero Defense, Survival Defense). Not overloaded
in the engine or starter vocabulary.

**Status at filing:** `candidate`. Becomes `canonical` after a shipped game
proves composition viable.

---

## Distinguishing properties

### Loop composition

Sourced from `theoretical/synthesis/archetypal-loops.md` loop vocabulary,
promoted from taxonomy § 2A:

- **Loop 9 (Enemy Scaling)** — primary driver. Escalating wave difficulty is
  the central mechanical commitment. Each wave is harder than the last; the
  player must upgrade or re-place to keep pace. This is what distinguishes
  Defender from a purely static puzzle.
- **Loop 14 (Cooldown/Energy)** — tower placement economy. Players spend
  currency to place towers; currency accrues between waves (from kills, time
  ticks, or fixed income). This gate on placement is what makes the build
  phase a meaningful resource decision.
- **Loop 4 (Upgrade Tree)** — mid-game extension. Tower upgrade paths (damage,
  range, splash, type specialization) give players vertical progression within
  a run. Kingdom Rush's two-branch tower trees and BTD6's five-path upgrades
  are the reference.
- **Loop 1 (Prestige)** — meta-progression between runs. Present in the
  majority of modern Defender titles: Kingdom Rush stars unlocking permanent
  hero abilities, Bloons Monkey Knowledge unlocking cross-run passive bonuses,
  GemCraft wizard levels persisting across campaigns. Loop 1 is optional in
  the archetype skeleton (older Flash-era titles like Flash Element TD and
  Desktop Tower Defense do not have it) but expected in any commercially
  competitive Defender game.

### Spatial axis

Two spatial patterns are active in this archetype (both from the Phase 2
LIBRARY sub-split):

- **Placement-Adjacency** (primary) — towers occupy cells; some variants
  reward positional pairing: splash-range overlap bonuses, area-of-effect
  chaining, GemCraft gem-color combination effects. The grid is mechanically
  load-bearing, not cosmetic. Pattern file:
  `patterns/tier-4-specialized/placement-adjacency.md`

- **Routing-Traversal** (secondary, in line-maze variants) — the player builds
  a maze structure that forces enemies to travel a longer path; enemies use
  shortest-path navigation through the player-built corridor geometry.
  Wintermaul Wars, Line Tower Wars, Cursed Treasure, and Desktop Tower Defense
  are the reference implementations. Fixed-path TD (Kingdom Rush, BTD6)
  uses a pre-authored path and is *not* meaningfully Routing-Traversal — the
  enemy path is a cosmetic backdrop, not a player decision surface. Pattern
  file: `patterns/tier-4-specialized/routing-traversal.md`

Both patterns are under 25% prevalence in the v4 incremental corpus and both
received Tier 4 Specialized filing in Phase 2. Their combination in Defender
is the primary spatial design surface.

### MDA aesthetic

- **Challenge** (primary) — waves escalate; optimal placement is non-trivial;
  the skill ceiling is real (maze geometry, upgrade sequencing, tower
  type-matching against enemy resistances).
- **Completion** (secondary) — stage-clearing structure, star ratings
  (Kingdom Rush's per-level star system), and campaign progression give
  players explicit completion goals that accumulate across the session.

---

## Lineage evidence — the WC3 → Flash → Steam arc

This is the longest well-documented single-archetype arc in the five-corpus
survey: 18+ years of continuous production from 2003 to the present. Promoted
from taxonomy § 4 and scratch § Defender rollup.

**Critical finding #4 (from Phase 1):** Defender genre commercialization
happened on Flash, not on Steam. Steam TD titles are franchise migrations
from a genre that formed commercially on Flash. The correct framing is:

> *"TD is an established standalone genre"* — this is a **2007 Flash
> assertion**, not a 2014 Steam one.

Timeline:

**WC3 UMS (2003+).** Element TD (WC3 map by Wind, 2003+) established the
community-modded placement-defense pattern. WC3's map-editor culture allowed
rapid iteration on the TD formula; the community named and ranked TD maps as
a first-class subcategory on Hive Workshop. 17 explicit TD maps plus 6 Hero
Defense maps in the top-100 Hive thread (~25% of the entire list).

**Flash commercial-genre formation (2007).** Three independent releases in 2007
mark the commercial-standalone formation moment:

- **Flash Element TD** (2007, David Scott) — explicit WC3-to-Flash port;
  developer-cited lineage; 140M plays by 2009. This is the genre's first
  commercial standalone release.
- **Desktop Tower Defense** (2007, Paul Preece) — 15.7M plays in 4 months;
  Webware 100 top-10 entertainment app 2007; Time All-Time 100 Greatest Video
  Games 2012. The genre-defining mass-market moment.
- **Bloons TD** (2007, Ninja Kiwi) — multi-portal flagship; first in a
  franchise that reaches BTD6 Steam 2018 with 90k+ concurrent peak.

These three titles arriving in the same year without coordination indicates a
genre that had matured in community-modded form and was ready for commercial
standalone expression.

**Flash maturity (2011).** Kingdom Rush (2011, Ironhide / Armor Games) — 75M
plays on Armor Games (#1 all-time); PC/Mac January 2014; iOS/Android 2011–2013.
GemCraft Labyrinth (2011) extends the gem-combining Packer-Defender hybrid
into a campaign format.

**Mobile ports (2011–2012).** BTD5 iOS 2012, Kingdom Rush iOS 2011. The
mobile-port wave expanded the franchise audience and established the brands
that would migrate to Steam.

**Steam migration (2014+).** Kingdom Rush PC January 2014. BTD5 Deluxe Steam
2014. GemCraft: Chasing Shadows Steam 2015. BTD6 Steam 2018. These are
**franchise consolidation destinations**, not genre origins. The Steam TD
market was built on Flash-era brand recognition, not on Steam-native discovery.

Source: taxonomy § 4 "The WC3 → Flash → Steam arc (Defender)" and scratch
§ "Critical finding #4: Defender genre commercialization happened on Flash, not
on Steam."

---

## Cross-corpus evidence — ~60–65 unique games

Defender is the most prevalent and best-corroborated archetype in this survey.
Per-corpus counts (not deduplicated across corpora; deduplicated estimate is
~60–65 unique game releases):

| Corpus | Count | Sample titles |
|--------|-------|---------------|
| WC3 UMS | 24 | 17 TD maps + 6 Hero Defense + 1 borderline; ~25% of top-100 thread |
| SC2 Arcade | 11 | TowerDefense platform category + 1 Other-tagged |
| Dota 2 Custom | 11 | Dota Hold Hero TD, Spin TD Reborn, Guarding Athena 2, GemTD, Element TD, Legion TD |
| Steam | 28 | BTD6, Kingdom Rush franchise, Dungeon Defenders, Orcs Must Die, Defense Grid, Sanctum, Rogue Tower, Mindustry, Creeper World 4 |
| Flash Era | 24 | Desktop TD, BTD 1–5, Kingdom Rush, GemCraft series, Cursed Treasure, Protector, Onslaught, Ghost Hacker, Bubble Tanks TD |

**Confidence: strong.** Five corpora, continuous 18-year lineage, multiple
franchise-level exemplars with documented mechanic citations, cross-platform
first-class category recognition (SC2's `{code: "TowerDefense"}` platform
category; WC3 Hive Workshop's "TD" thread category; SteamDB's "Tower Defense"
tag with 28 qualifying entries in the survey top-50).

Source: taxonomy § 2A "Cross-corpus presence — ~80 games" (raw per-corpus
sum) and taxonomy § 5 cross-corpus evidence table (deduplicated ~60–65).

---

## Spatial axis detail

### Placement-Adjacency (primary)

`patterns/tier-4-specialized/placement-adjacency.md`

Towers occupy cells on a grid or placement surface. The mechanical teeth come
from positional pairing:

- **Splash/range overlap** — adjacent towers with area-of-effect coverage
  produce combined fire zones; optimal placement clusters towers to maximize
  overlap.
- **Gem-color combination effects** (GemCraft lineage) — gems placed in
  adjacent tower slots or combined before placement produce merged stats
  (Yellow + Red → Orange with Multiple Damage + Armor Tearing). This is the
  shape-fit / assignment variant of Placement-Adjacency (Variation 3 in the
  pattern file).
- **Monkey village support towers** (BTD6) — explicit neighbor-range bonuses
  that buff adjacent towers within radius; rewards clustering.

Placement-Adjacency is the primary spatial commitment: the grid is the
strategy surface, not a cosmetic backdrop.

### Routing-Traversal (secondary — maze-TD variants only)

`patterns/tier-4-specialized/routing-traversal.md`

In line-maze and open-build Defender variants, the player constructs the enemy
path by choosing what cells to block with towers. Enemies navigate the
resulting maze via shortest-path. The player's goal is to maximize effective
path length while maintaining path validity.

Reference maze-TD implementations in the corpus:

- **Wintermaul Wars** (WC3, rank #3) — competitive maze building; shared maze
  with leaked units.
- **Line Tower Wars** (WC3/SC2) — lane layout with survival and maze hybrid.
- **Desktop Tower Defense** (Flash, 2007) — canonical open-field maze-build;
  15.7M plays in 4 months; Time All-Time 100 Greatest Video Games.
- **Cursed Treasure** (Flash) — fixed-entry points with open placement field.

**Fixed-path TD is NOT Routing-Traversal:** Kingdom Rush, BTD6, and GemCraft
Labyrinth all use pre-authored enemy paths. The path is a cosmetic backdrop;
the player has no routing decisions. These are Defender with Placement-Adjacency
only. The routing-traversal.md Cross-Links section explicitly notes this
distinction.

---

## Engine posture

COPIED AS-IS from taxonomy § 2A. Do not re-decide engine surface here — that
is Phase 3b (OL-568).

> *"Zero new primitives needed. Composition of `createResource` (economy),
> `createZoneSystem` (maps/stages), and a wave-spawner via `createSequencer`.
> The placement grid is a starter-layer or consumer-layer rendering concern,
> not an engine primitive. Per the engine ↔ game co-evolution discipline:
> placement grids are single-game-layer concerns until two independent consumer
> games converge on the same grid primitive shape."*

What this means concretely:

- **`createResource`** — tower placement currency (gold, mana, energy); kill
  bounty income; wave-end income bonus.
- **`createZoneSystem`** — map topology (zone definitions for stages/levels,
  spawn zones, goal zones); stage progression gating.
- **`createSequencer`** — wave-spawner: timed enemy release intervals, wave
  composition sequencing (how many of each enemy type in wave N), escalation
  across waves.
- **`createPurchasableCategory`** — tower purchase and upgrade purchase menus.
- **`createModifierChain`** — tower stat modifiers (damage, range, attack
  speed, type bonuses against armored/flying/fast enemies).
- **`createReset`** — run reset for roguelike-adjacent Defender variants;
  prestige reset for meta-progression (Kingdom Rush stars → Monkey Knowledge
  equivalent).
- **`persistent`** — meta-progress retention across runs (wizard levels in
  GemCraft, Monkey Knowledge in BTD, hero unlocks in Kingdom Rush).
- **`runHeadless` / `runMatrix`** — balance probes: wave-feel probes (does
  wave N arrive within target window at default enemy scaling?) and meta-arc
  probes (does prestige loop complete in X runs at default balance?).

**Placement grid is starter-layer or consumer-layer.** The 2D placement grid —
cell occupancy, tower rendering, drag-and-drop placement UI — is not an engine
primitive. It is a consumer-layer game mechanic until two independent consumer
games converge on the same grid primitive shape, per the engine ↔ game
co-evolution discipline in the shared `CLAUDE.md`. Phase 3b (OL-568) will
sketch the `grid-placement-auto-resolve` candidate; that sketch does not commit
the engine yet.

---

## Open questions for the archetype doc drafting session

Prework did not resolve these. Each needs a call before or during the
`archetypes/defender.md` draft:

1. **Fixed-path vs open-field variants.** Kingdom Rush and BTD6 use fixed
   pre-authored enemy paths (no maze building). Plants vs. Zombies uses
   lane-fixed paths (one lane per row). Desktop Tower Defense uses a fully
   open field where tower placement creates the path. The archetype doc must
   decide whether to present these as sub-variants (Variation 1: fixed-path,
   Variation 2: open-maze) or to treat fixed-path as the skeleton and maze-build
   as an optional Routing-Traversal modifier. Recommended: fixed-path as the
   skeleton (simpler engine posture, more prevalent), maze-build as a named
   optional modifier that adds Routing-Traversal.

2. **Creep-physics edge case: Creeper World 4.** Creeper World 4 uses
   fluid-threat mechanics — creep flows as a volumetric fluid rather than
   walking a path. Nominally Defender-shaped (static placement, escalating
   threat) but the threat model is continuous fluid, not discrete wave units.
   The archetype doc should note this as a fluid-threat edge case and decide
   whether it belongs in § 9 (predicted engine gaps: fluid simulation is not
   a current engine primitive) or simply as a named exemplar variant.

3. **Auto-combat resolution depth.** Some Defender games have near-zero
   mid-wave interaction (BTD6: watch and use abilities). Others have significant
   mid-wave interaction (Kingdom Rush: hero unit positioning, ability timing,
   tower selling/rebuilding under pressure). The skeleton should reflect the
   lower-interaction case; higher interaction is an optional modifier.

4. **Prestige loop structure.** Modern Defender games have two distinct shapes:
   - Run-end meta currency (Kingdom Rush stars → permanent upgrades) —
     Loop 1 Prestige via `createReset` + `persistent`.
   - Campaign progression (GemCraft wizard levels persisting across the
     campaign map) — Loop 1 Prestige without a hard run-reset.
   The § 5 vars schema needs a `prestigeMode: 'none' | 'run-reset' | 'campaign'`
   ArchetypeVars field to distinguish the structural fork.

5. **§ 10 themes (costume candidates):**
   - **Tower Defense** (default) — medieval/fantasy towers defending a keep.
   - **Lab Defense** — sci-fi turrets defending a research lab; creeps are
     mutant specimens or rogue robots.
   - **Garden Defense** — plants protecting a garden from pests.
   - **Dungeon Lord** — player is the dungeon; towers are traps defending the
     dungeon boss room from hero invaders.
   - **Orbital Defense** — space station; towers are weapons platforms; creeps
     are asteroids or enemy ships.
   All five touch only ThemeVars; none change beat timing or pattern
   composition.

6. **Novel-patterns cluster alignment.** Check
   `reports/novel-patterns/novel-patterns-synthesis-v4.md` for a cluster
   covering wave-paced placement defense. Cite it if present; note `n/a` if
   absent — Defender is a well-established baseline composition, so `n/a` is
   the expected answer per the template validator note.

7. **Exemplar corpus resolution.** The template validator requires corpus
   games in the Exemplars line to resolve to files under `analyses/complete/`.
   Check which Defender-relevant games have complete analyses before drafting.
   If complete analyses don't exist for the planned exemplars, cite what does
   exist and note the gap, or commission analyses as a follow-up.

---

## Cross-references

### LIBRARY patterns

- **Placement-Adjacency** — `patterns/tier-4-specialized/placement-adjacency.md`
  — primary spatial pattern. Defender is the archetype that consumes it in
  the wave-defense context; the GemCraft/Gem TD lineage is the canonical
  Defender × Placement-Adjacency hybrid example.

- **Routing-Traversal** — `patterns/tier-4-specialized/routing-traversal.md`
  — secondary spatial pattern in maze-TD and line-maze variants.
  routing-traversal.md Cross-Links § explicitly identifies Defender as a
  "partial consumer" and notes that fixed-path TD does not carry this pattern.

### Taxonomy

- **§ 2A (Defender)** —
  `reports/studies/arcade-market-archetypes/arcade-market-archetypes-taxonomy.md`
  — full cross-corpus evidence: loop composition, spatial axis, MDA aesthetic,
  OL-537 overlap statement, engine posture, cross-generational lineage,
  confidence rating. Primary source for all sections of the canonical doc.

- **§ 3E (Defender ↔ Survivor adjacency)** — same file — the placement-
  commitment boundary distinguishing these two archetypes. The archetype doc
  must include a contrast note. Taxonomy framing: games at the boundary are
  hybrids worth noting rather than forcing a collapse.

- **§ 4 (The WC3 → Flash → Steam arc)** — same file — historical lineage
  summary. The archetype doc's exemplar lineage section should cite this arc
  with Flash 2007 as the commercial-genre formation moment.

### Scratch

- **§ "Defender (wave-paced placement defense)" rollup** (line ~244) —
  `inbox/arcade-market-archetypes-scratch.md` — 8-field schema populated
  from Phase 1 evidence.

- **§ "Critical finding #4: Defender genre commercialization happened on
  Flash, not on Steam"** (line ~117) — same file — the framing shift that
  reorients the archetype's historical narrative.

---

## Next-session instructions

1. Read this file and `archetypes/_template.md`. Skim `archetypes/producer.md`
   for format reference.
2. Resolve open question #7 (exemplar corpus resolution) by checking
   `analyses/complete/` for BTD6, Kingdom Rush, GemCraft, and Desktop Tower
   Defense analyses.
3. Resolve open question #6 (novel-patterns cluster alignment) by reading
   `reports/novel-patterns/novel-patterns-synthesis-v4.md`.
4. Draft `archetypes/defender.md` against the template, using the decisions
   and evidence above.
5. In § 2, cross-reference Survivor as adjacent-not-collapsible (taxonomy
   § 3E) — do NOT subsume Survivor into Defender.
6. In § 3 (engine surface), cite the primitives listed in the engine posture
   section above. Do not invent new primitives; any gaps go in § 9.
7. For the Exemplars line: cite only games that resolve to files in
   `analyses/complete/`. Note any gaps.
8. Once `archetypes/defender.md` is reviewed and approved, **delete this
   file**.

---

## References

- Taxonomy: `open-loop-research/reports/studies/arcade-market-archetypes/arcade-market-archetypes-taxonomy.md` § 2A, § 3E, § 4
- Phase 1 scratch: `open-loop-research/inbox/arcade-market-archetypes-scratch.md` § Defender rollup (line ~244), § Critical finding #4 (line ~117)
- LIBRARY spatial patterns:
  - `open-loop-research/patterns/tier-4-specialized/placement-adjacency.md`
  - `open-loop-research/patterns/tier-4-specialized/routing-traversal.md`
- Archetype template: `archetypes/_template.md`
- Format reference: `archetypes/producer.md`
- Engine API index: `open-loop-engine/docs/api/INDEX.md`
- Novel-patterns synthesis: `open-loop-research/reports/novel-patterns/novel-patterns-synthesis-v4.md`
- OL-558 (umbrella), OL-567 (this prework subtask), OL-568 (Phase 3b engine surface)

---

## UI prescription hook (OL-582)

The archetype-doc drafting session must fill § 9 UI prescription against `archetypes/_template.md`. Prescriptions must cite one of three data artifacts under `open-loop-research/practical/ui-ux/`, or carry a `` `declared invention` `` tag with rationale.

**Data artifacts:**

- `layout-audit-2026.md` — per-game classification rows (69 games; shell, nav pattern, notable widgets, form-factor intent).
- `subgenre-shell-mapping-2026.md` — sub-genre × shell majority cross-tab. Only `incremental-math` has a strong single-shell majority; every other mid-size sub-genre offers a primary + secondary shell pair.
- `widget-vocabulary.md` — 10 ARIA-aligned widgets (lift targets for reka-ui primitives in `@/lib`) + 9 domain widgets (per-fork implementation; no pre-abstraction per OL-273 Phase 2 lift-first policy).

**Sub-genre mapping for Defender:** Defender (TD lineage) has no audit sub-genre — the 69-row corpus contains no pure tower-defense game. Primary shell is `` `declared invention` ``: grid-placement + wave-path layout. Closest partial-corpus references: Industry Idle (`free-form`, `sandbox-city`, canvas with bottom resource bar + position:fixed overlays) and Cavernous II (`multi-column-dashboard`, `time-loop`, grid-based map view). Mobile TD (Plants vs. Zombies lineage) is `` `declared invention` `` for form-factor — corpus has ~3 mobile-first rows, no TD-shape precedent.

**Shell name resolution.** `{{ShellName}}` must resolve to a file in `open-loop-starter/src/lib/shells/*.vue`. Starter ships five of the audit's six shells (`MultiColumnShell`, `SidebarMainShell`, `SingleColumnShell`, `TabsBarShell`, `ThreePanelShell`); `free-form` shell shapes are always `declared invention` against starter today.

**Form-factor intent.** Mobile-native / touch-primary commitments are `` `declared invention` `` against the corpus. Audit mobile-aware coverage is ~32% of 69 rows; no sub-genre has a mobile majority.

**Reference retrofits.** `archetypes/producer.md` (three-panel, narrative clicker), `archetypes/looper.md` (three-panel, time-loop), `archetypes/scaler.md` (sidebar-main, prestige idle) show the § 9 shape against canonical-sub-genre-majority archetypes. Soft coupling with Survivor (OL-575) — boundary-contrast note on placement-before-threat vs response-to-threat framing.
