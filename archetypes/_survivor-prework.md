# Survivor — prework handoff (pre-archetype-doc)

> **What this file is.** A consolidation of the OL-558 / OL-567 Phase 3a
> research pass covering the Survivor archetype (continuous-threat escalation
> without placement). The session did not implement anything. It promoted
> scratch and taxonomy evidence into a structured handoff, resolved the design
> framing, and recorded open questions that need a call before drafting begins.
>
> **What this file is for.** The next session should:
>
> 1. Draft `archetypes/survivor.md` against `archetypes/_template.md`, using
>    the decisions below as input and `archetypes/producer.md` as format
>    reference.
> 2. Cross-reference `archetypes/_defender-prework.md` (or its canonical
>    `archetypes/defender.md` once authored) as the adjacent-but-distinct
>    archetype. The Defender ↔ Survivor boundary is placement commitment; the
>    LIBRARY writeup should make this explicit.
> 3. Once `archetypes/survivor.md` is reviewed and approved, **delete this
>    file** — it's scaffolding.
>
> **Status:** prework. Not a canonical archetype spec.

---

## Source context

OL-558 is the umbrella research ticket for Wave-2 archetype candidates surfaced
by the arcade + market archetype study. OL-559 is the Phase 1 evidence pass that
produced the five-corpus scratch (`inbox/arcade-market-archetypes-scratch.md`
§ Survivor) and the per-corpus slice files. OL-564 is the Phase 2 taxonomy
synthesis (`reports/studies/arcade-market-archetypes/arcade-market-archetypes-taxonomy.md`
§ 2B and § 3E). This prework is OL-567, one of seven parallel Phase 3a prework
agents operating on the seven Wave-2 candidates simultaneously.

The taxonomy's Survivor entry is the authoritative evidence summary. This file
promotes it into the drafting-session shape; it does not re-derive anything.

---

## The design problem, restated

Survivor places the player character or unit *inside* the threat. There is no
placement commitment: the player does not author defensive structures in advance
of enemy arrival. Enemies arrive continuously in escalating density; the player
responds in real time using abilities, movement, run-based upgrades, and tactical
positioning. Survival depends on reactive decision-making, not on blueprint
construction.

This is the defining distinction from Defender: **Defender commits placement
before threat; Survivor responds to threat in real time.** The distinction is
architectural, not superficial. A Defender player authors their defensive
configuration pre-wave; a Survivor player adapts their position and ability
rotation mid-wave. The spatial relationship to threat is different: Defender
stands behind their structures; Survivor stands inside the threat field.

Some games sit near the boundary (ability-area-of-effect positioning has a weak
placement-like quality in some Vampire Survivors runs; Dota Hold Hero TD has
survivor-leaning qualities in some builds). These are hybrids worth noting in
the LIBRARY entry examples rather than forcing a collapse.

---

## Archetype framing

**Wave-2 candidate.** Survivor does not collapse to any OL-537 Wave-1 archetype.
Mapping:

- **Not Producer / Scaler / Interlocker** — Survivor's core commitment is
  threat response, not resource graph construction or scaling chain maintenance.
- **Not Looper** — no authored action queue, no repeated content mastery loop.
- **Not Explorer** — no discovery or charting commitment; the arena is fully
  visible and the spatial contract is "survive inside" not "chart the unknown."
- **Not Scripter** — no code artifact, no authored queue.
- **Not Phase-shifter** — no one-way narrative or mechanical transition;
  the archetype loops on run boundaries (run → meta-upgrade → new run).
- **Not Director** — Survivor places the player in the arena; Director has
  the player author and tune adversarial pressure from outside it.

Per taxonomy § 2B overlap statement: "Adjacent to Defender but distinct by the
absence of the placement commitment. No OL-537 archetype captures the
continuous-threat + ability-rotation + run-upgrade loop structure."

The adjacent archetype is Defender (taxonomy § 3E). The boundary is placement
commitment: Defender requires the player to commit tower positions before enemy
arrival; Survivor places the player inside the threat and responds in real time.
These two archetypes are frequently co-located in corpus corpora (SC2 has both
Survival and TowerDefense as top-tier platform categories; Dota 2 has strong
hits in each) — proximity in the catalog does not imply collapse.

**Proposed name: Survivor.** Used by: SC2 Arcade's platform-native Survival
category (Blizzard taxonomy), WC3 Hive Workshop community threads, and the
Vampire Survivors standalone commercial release. Three independent communities
converged on the same label without coordination.

**Status:** `candidate` (per template). Becomes `canonical` after shipping and
proving composition viable.

---

## Distinguishing properties

The core loop is defined by two patterns working together:

- **Loop 9 (Enemy Scaling)** — enemy density, speed, and power escalate
  continuously. The threat is never static; Survivor's tension comes from the
  escalation curve.
- **Loop 14 (Cooldown/Energy — ability rotation)** — the player's primary
  active decisions are ability timing and rotation. These are reactive choices
  made against the current threat state, not pre-committed architectural ones.

Most modern Survivor instances add:

- **Loop 1 (Prestige — meta-upgrade between runs)** — the run ends (on death or
  on a timer); the player carries forward meta-upgrades that compound across runs.
  This is what gives the archetype long-term replayability beyond single-run skill.

The Vampire Survivors sub-lineage (2022+) adds in-run layer density that
distinguishes it from classic arena-hold-out variants:

- **Loop 4 (Upgrade Tree — in-run item selection)** — each level-up offers a
  choice of weapon or item upgrade; the run has its own build arc independent of
  meta progression.
- **Loop 6 (Resource Accumulation — weapon level and gold)** — experience
  orbs fund weapon leveling; gold accumulates for between-run purchases. This
  creates two nested accumulation loops within a single run.

Classic arena hold-out (Marine Arena, MineralZ) uses Loop 9 + Loop 14 with
minimal in-run build construction. The Vampire Survivors sub-lineage adds
Loops 4 + 6 as in-run layers, creating a denser loop composition. Both
forms are Survivor; the sub-lineage is a variant, not a separate archetype.

---

## Lineage evidence

The cross-generational arc spans 23 years across four platform generations:

**WC3 Survival subgenre (2003+).** MineralZ, Undead Assault, and approximately
5 further Survival-category maps constitute the genre's formation period in WC3
UMS custom games. The mechanical shape is: arena or hold-out space, continuous
waves, no placement commitment, survival as win condition.

**SC2 Survival category platform formalization (2010+).** Blizzard assigned a
first-class platform category to this archetype: `{code: "Survival"}` in the SC2
Arcade taxonomy. The SC2 category holds approximately 15 games after deduplication
(16 raw minus 1 dual-tagged Cute Defense, which is Defender-shaped). Key titles:
MineralZ Evolution (2010+), Marine Arena (2013+, a hold-out variant with
idle-tolerant play), Undead Assault series, Zerg Hex, Kerrigan Survival, and
Random Base Defender 4+ (highest-growth Survival game in 2026 activity data).
This is the only Wave-2 archetype in this survey to have received a Blizzard-assigned
platform-native category name — the SC2 naming is independent corroboration of the
archetype's distinctness.

**Dota 2 standalone Survivor games (2020+).** Aghanim's Labyrinth (2020+) is the
most notable: Valve themselves produced a Survivor-shaped custom game experience as
part of the official Dota 2 seasonal event structure, lending institutional
corroboration. Additional titles: Boss Survival Adventure, Last Survivors, Dota
Survivors 2, Survivor's Sanctuary, Dota Survivors (2021+). Six total.

**Steam commercialization (2022+).** Vampire Survivors (January 2022, poncle) is the
genre-defining standalone moment for the auto-attack-movement sub-lineage. It is the
*sub-lineage crystallization event* for that variant of Survivor, not the birth of
Survivor itself — the archetype traces back to WC3 2003. Sub-lineage successors
include BALL x PIT (October 2025) and Upload Labs (October 2025). Note: Vampire
Survivors itself lives in Steam's Bullet Hell + Roguelike tag cluster, not the
Idler/Auto Battler/TD tags surveyed in slice-4; the slice-4 Steam count of 4 is
therefore a minimum bound on Steam Survivor presence.

**Flash (1 weak hit).** Creeper World Evermore uses fluid-threat mechanics that are
adjacent to Survivor's continuous-threat model but use a distinct fluid-spread
topology rather than wave-based escalation. Classified as weak hit; does not
affect confidence.

**Confidence: strong.** All five corpora, cohesive historical lineage, SC2
Blizzard-assigned platform category, and Valve-produced Survivor event content
constitute the strongest available corroboration.

---

## Cross-corpus evidence

Approximately 28–32 games across 5 corpora. Per-corpus breakdown:

| Corpus | Count | Key titles |
|--------|-------|------------|
| WC3 UMS | 7 | MineralZ, Undead Assault, Founders of the North + 4 further |
| SC2 Arcade | ~15 | Marine Arena, MineralZ Evolution, Undead Assault, Zerg Hex, Kerrigan Survival, Random Base Defender 4+ |
| Dota 2 | 6 | Aghanim's Lab III, Boss Survival Adventure, Last Survivors, Dota Survivors 2, Survivor's Sanctuary, Dota Survivors |
| Steam | 4 (surveyed tags) | BALL x PIT, Upload Labs, Unnamed Space Idle (partial), Aeons Echo |
| Flash | 1 (weak) | Creeper World Evermore |

The Steam count is a minimum bound: Vampire Survivors lives in Bullet Hell +
Roguelike tags, not the Idler/Auto Battler/TD tags in slice-4's scope.

Strong confidence. All five corpora present. SC2 Survival platform category naming
is independent corroboration. Historical lineage is cohesive and unbroken across
23 years.

---

## Spatial axis

**Spatial-as-container (primary).** The arena boundary defines the survival
space. The player's spatial position is reactive — they move to avoid threats,
to collect drops, to position ability areas of effect — but the space itself is
fixed. The arena contains the action; it is not something the player charts or
constructs.

**Routing-Traversal (secondary, hold-out variants).** Hold-out variants that
use lane or path structures (some SC2 Survival maps, some WC3 Survival maps)
have a secondary Routing-Traversal component where enemy paths are defined and
the player interprets them spatially. This is a sub-variant quality, not a
defining property.

**Contrast with Defender.** In Defender, the player's spatial decisions are
architectural: towers are placed on cells and remain there. The spatial
relationship is *authored*. In Survivor, spatial position is *reactive*: the
player moves in response to threats. This is the spatial axis of the
Defender ↔ Survivor distinction (taxonomy § 3E).

---

## MDA aesthetic

**Challenge (primary).** Waves escalate; the player must respond faster and more
accurately as the run progresses. The escalation curve is the challenge spine.
Most Survivor variants make death meaningful — the run ends, and meta-progression
carries forward but in-run progress is lost.

**Submission (present in hold-out variants).** Hold-out variants like Marine Arena
reduce active decision-making to idle-tolerant levels: the player sets up an
ability configuration and watches it run for long stretches. This gives Marine Arena
a submission quality absent from the active positioning variants (Vampire Survivors,
BALL x PIT). The Submission quality is a marker of the classic arena-hold-out
sub-variant, not of the archetype as a whole.

Note: the Vampire Survivors sub-lineage primarily drives Challenge. Its active
movement + ability timing + in-run build decisions keep decision density high
throughout the run.

---

## Engine posture

Copied verbatim from taxonomy § 2B:

> Zero new primitives needed. Composition of `createResource` (health,
> currency), wave-spawner via `createSequencer`, and `createSkillCategory` for
> run upgrades. The core distinction from Defender is loop composition and
> spatial model, not engine primitive shape.

DO NOT re-decide engine surface in this prework. The engine posture decision
is Phase 3b (OL-568). The above is the taxonomy position; the drafting session
should carry it forward into § 3 of the archetype doc as-is. If the drafting
session finds a gap that the taxonomy missed, that is a finding to surface in
§ 9 (Predicted engine gaps), not a reason to expand the engine posture claim here.

The distinction from Defender's engine posture is notable: Defender uses
`createZoneSystem` (for maps/stages) where Survivor does not need it — the arena
is a fixed container, not a staged zone progression in the engine-primitive sense.
That difference tracks the spatial model distinction: Defender routes enemies
through authored zones; Survivor contains the player in a single arena space.

---

## Open questions for the archetype doc

These were not resolved in this prework pass. Each needs a call before or during
the `archetypes/survivor.md` draft:

1. **Boundary hybrids in LIBRARY examples.** Dota Hold Hero TD has Survivor
   qualities; some Vampire Survivors runs have semi-placement via ability
   positioning (e.g., stationary-area skills). The archetype doc's § 1 prose
   and exemplar list should acknowledge these without forcing a collapse. How
   much boundary-case elaboration does the LIBRARY writeup need before it becomes
   noise?

2. **Auto-attack-movement sub-lineage: variant section or separate Alexander
   pattern?** The Vampire Survivors sub-lineage (auto-attack on cooldown,
   movement as evasion, weapon-level accumulation as primary in-run build axis)
   is mechanically coherent enough to warrant its own named variant section in
   the archetype doc, or possibly a separate Alexander-format pattern in
   `patterns/`. The prework does not decide. Options: (a) variant subsection
   within `survivor.md` with its own loop composition note; (b) separate
   `patterns/tier-N/auto-attack-movement-survivor.md` pattern filing once the
   sub-lineage has enough independent corpus weight. The research threshold for
   (b) is two independent instances of the sub-variant shape — Vampire Survivors
   + BALL x PIT + Upload Labs likely clears it, but confirm before filing.

3. **LIBRARY.md pattern names for cited patterns.** Template § 2 requires every
   pattern cited resolve in `LIBRARY.md`. The loop numbers (Loop 9, Loop 14,
   Loop 1, Loop 4, Loop 6) need to be translated to exact LIBRARY.md pattern
   names before drafting. Read `open-loop-research/LIBRARY.md` at draft time
   and verify each resolves.

4. **Novel-patterns cluster alignment.** Check
   `open-loop-research/reports/novel-patterns/novel-patterns-synthesis-v4.md`
   for a cluster covering continuous-threat + ability-rotation + run-upgrade
   without placement commitment. Cite the cluster if present; file a follow-up
   research ticket if absent.

5. **Beat map for classic vs. Vampire-Survivors variant.** The template requires
   5–8 beats for the 1–2h first-completion arc. The classic hold-out arc
   (meta-upgrade gating, run-time escalation) and the Vampire Survivors arc
   (in-run build selection, per-run completion, meta unlock) have different beat
   structures. The archetype doc should either (a) choose one as the default
   skeleton beat map and note the variant, or (b) provide two beat maps if the
   template format allows.

6. **`SurvivorArchetypeVars` sketch.** Structural fork decisions include at
   minimum: arena dimensions or shape (if spatial container is parameterized),
   run-timer vs. death-condition as run-end trigger, whether in-run build
   selection (Loop 4) is included in the skeleton or deferred to the
   Vampire-Survivors variant. Sketch against the template's rule: ArchetypeVars
   = structural fork decisions only; balance goes in BalanceVars.

7. **Follow-up research tickets to file from this work.**
   - LIBRARY.md Survivor pattern writeup (promotion from Wave-2 candidate to
     LIBRARY pattern file under appropriate tier).
   - Auto-attack-movement sub-variant pattern filing (if the two-independent-
     instances threshold is met).
   - SC2 Survival category deduplication correction: Cute Defense is dual-tagged
     but Defender-shaped; the SC2 slice count should reflect this. Already noted
     in taxonomy § 2B; a cleanup ticket is appropriate.

---

## Cross-references

- Taxonomy § 2B: Survivor archetype entry — primary source for all evidence,
  loop composition, and engine posture in this prework.
  (`open-loop-research/reports/studies/arcade-market-archetypes/arcade-market-archetypes-taxonomy.md`)
- Taxonomy § 3E: Defender ↔ Survivor relationship — placement commitment as
  the distinguishing axis. Same file, § 3E.
- Scratch rollup: `open-loop-research/inbox/arcade-market-archetypes-scratch.md`
  § "Survivor (continuous-threat escalation without placement)" — the raw
  Phase 1 evidence that the taxonomy promoted from.
- `archetypes/_defender-prework.md` — the adjacent archetype prework. Defender
  and Survivor are adjacent-not-collapsible (taxonomy § 3E); the two prework
  files should be read together when drafting both archetype docs to ensure
  their cross-reference language aligns.
- `archetypes/_template.md` — the canonical archetype doc template; use when
  drafting `archetypes/survivor.md`.
- `archetypes/producer.md` — format reference for the canonical archetype doc shape.

---

## Next-session instructions

1. Read this file. Read `archetypes/_template.md` and `archetypes/producer.md`.
2. Read `archetypes/_defender-prework.md` to align cross-reference language
   before drafting — especially the § 3E boundary language.
3. Resolve open questions #3 and #4 (LIBRARY.md pattern name resolution +
   novel-patterns cluster check) by reading those source files.
4. Draft `archetypes/survivor.md` against the template:
   - Use the engine posture from taxonomy § 2B verbatim in § 3 (zero new
     primitives; `createResource` + `createSequencer` + `createSkillCategory`).
   - Cross-reference Defender as adjacent-not-collapsible in § 2 pattern
     composition notes and in § 1 player experience prose.
   - Include the Vampire Survivors sub-lineage in § 4 beat map as a variant
     note or separate beat row set.
   - Note Spatial-as-container as the primary spatial axis in § 2 and § 1.
5. Surface any template validation gaps (pattern names that don't resolve in
   LIBRARY.md, engine primitive names that don't resolve in INDEX.md) as
   findings — do not paper over them.
6. Once `archetypes/survivor.md` is reviewed and approved, **delete this file**.

---

## References

- Taxonomy: `open-loop-research/reports/studies/arcade-market-archetypes/arcade-market-archetypes-taxonomy.md`
- Phase 1 scratch: `open-loop-research/inbox/arcade-market-archetypes-scratch.md`
- Per-corpus slices: `open-loop-research/inbox/arcade-market-archetypes/slice-1-wc3.md` through `slice-5-flash.md`
- Adjacent archetype prework: `archetypes/_defender-prework.md`
- Archetype template: `archetypes/_template.md`
- Archetype format reference: `archetypes/producer.md`
- Research library: `open-loop-research/LIBRARY.md`
- Novel-patterns synthesis: `open-loop-research/reports/novel-patterns/novel-patterns-synthesis-v4.md`
- Engine API index: `open-loop-engine/docs/api/INDEX.md`
- OL-558 umbrella, OL-559 Phase 1, OL-564 Phase 2 taxonomy, OL-567 this prework, OL-568 Phase 3b engine posture
