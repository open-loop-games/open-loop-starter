# Ambient Progression — prework handoff (pre-archetype-doc)

> **What this file is.** A consolidation of OL-558 Phase 2 research covering
> Ambient Progression as a Wave-2 archetype candidate. No implementation
> happened. The session settled the evidence base, confirmed the pattern is
> promotion-qualified, and resolved the critical distinguishing questions
> (engagement model vs. mechanic; Wave-1 non-overlap; engine posture).
>
> **What this file is for.** The next session should:
>
> 1. Draft `archetypes/ambient.md` against `archetypes/_template.md`, using
>    the decisions below as input and `archetypes/producer.md` as format
>    reference.
> 2. Once the archetype doc is approved, **delete this file** — it's scaffolding.
>
> **Status:** prework. Not a canonical archetype spec.

---

## Source context

**Umbrella ticket:** OL-558 — Arcade + Market Archetype Corpus Survey (seven
Wave-2 candidates: Defender, Survivor, Packer, Ambient, Phase-Alternation,
Tug, Auto-battler).

**Phase 1 (OL-559):** Five-corpus evidence pass (WC3 UMS, SC2 Arcade, Dota 2
custom, Steam, Flash era) + v4 prevalence check. Scratch file:
`open-loop-research/inbox/arcade-market-archetypes-scratch.md`. Critical
finding #2 (§ line ~84) confirmed Ambient is web-native 2009, not Steam-native
2024, and promoted it as a LIBRARY pattern candidate.

**Phase 2 LIBRARY filing (OL-563):** LIBRARY pattern written and filed at
`patterns/tier-3-moderate/ambient-progression.md`. Taxonomy entry at
`reports/studies/arcade-market-archetypes/arcade-market-archetypes-taxonomy.md`
§ 2G, § 3C, and § 4 (historical arc summary). These three files are the
primary evidence base — do not re-derive from source games.

**This file (Phase 3a, OL-567):** Prework handoff to seed OL-537's archetype
ticket decomposition. One of 7 parallel prework files for Wave-2 candidates.

**Phase 3b (OL-568):** Engine posture synthesis for all seven Wave-2 candidates.
Do not pre-decide engine surface; cite the taxonomy's posture statement verbatim
and leave Phase 3b to do its work.

---

## The design problem, restated

Ambient Progression is not a mechanic family. It is an **engagement-model
commitment**: the designer commits to removing all pressure loops, making the
game a passive companion rather than an active competitor for the player's
attention.

The problem it solves: most incremental games assume the player should be
present, watching, responding. Wave scaling overwhelms an idle defense.
Cooldown queues expire uncollected. Prestige windows have optimal timing.
Offline gains compensate but the underlying game is still oriented around
active presence. The result is games that feel like a responsibility — the
player feels behind if they don't check in.

Ambient Progression solves this by inverting the assumption: nothing goes
wrong if the player forgets the game for two hours. The player opens it when
they want to, collects accumulated output, makes a few upgrade decisions, and
closes it or leaves it running at the screen edge. The session cadence is
hours between check-ins, not minutes. The game enriches the desktop rather
than competing for attention with everything else on it.

The mechanical corollary: Loop 2 (Idle Production) + Loop 7 (Auto-production)
form the positive spine. The pattern is defined equally by what is **absent**:
no Loop 9 (Enemy Scaling), no strict Loop 14 (Cooldown urgency), no fail
state, no timed events that penalize absence.

The archetype-doc drafting session should frame § 1 (Player experience) around
this engagement-model inversion, not around the idle mechanics themselves.
Those mechanics are shared with other archetypes; the engagement commitment is
what distinguishes Ambient.

---

## Archetype framing

Ambient Progression is a **Wave-2 candidate**. It does not collapse to any
OL-537 Wave-1 archetype:

- **Not Producer** — Producer's production chain is a resource-graph structure.
  Ambient uses the same loop spine (Idle Production + Auto-production) but the
  distinguishing commitment is the engagement model, not the resource graph.
  A Producer game can have pressure; Ambient never does.
- **Not Looper** — Looper is about action queues and repeated content mastery.
  Ambient has no action queue; player interaction is optional and non-urgent.
- **Not Scaler** — Scaler's commitment is cost-scaling as the primary
  progression driver. Ambient's progression is paced by unlock trees and
  gradual visual change, not scaling curves demanding optimization.
- **Not Interlocker** — Interlocker requires mutual-gate structure between
  resource systems. Ambient's resource systems are independent and non-blocking.
- **Not Explorer** — Explorer requires discovery commitment (fog of war,
  spatial revelation, investigation loops). Ambient has no discovery mechanic
  as a primary driver.
- **Not Scripter** — Scripter requires an authored automation artifact.
  Ambient's automation is structural (buildings produce), not authored.
- **Not Phase-shifter** — Phase-shifter (OL-544) is a one-way narrative
  transition. Ambient Progression has no structural transitions; it sustains
  a single engagement mode throughout. Note: A Dark Room demonstrates both in
  the same game at different phases — Phase 1 (fire-tending) is Ambient;
  the full game's arc is Phase-shifter. They are not conflicting
  classifications.
- **Not Director** — Director is about authoring/tuning adversarial pressure.
  Ambient removes pressure entirely.

**The Ambient vs. Time Systems distinction is the most important boundary to
maintain** (see taxonomy § 3C). Time Systems is a LIBRARY pattern about clock/
cooldown mechanics as a progression engine. Ambient is an engagement-model
commitment. The confusion is easy because Ambient games use Time Systems
internally (idle production timers, offline-progress restore), but using Time
Systems does not make a game Ambient-shaped. A high-pressure wave-scaler can
have excellent offline progress — it is not Ambient. The abstraction levels
are different: Time Systems describes what offline.ts does; Ambient describes
the designer's choice to remove all urgency. These are adjacent patterns at
different tiers. Cross-link them explicitly in the archetype doc; do not
collapse them.

**Proposed status:** `candidate`. Becomes `canonical` after shipping and
proving composition viable.

---

## Distinguishing properties

The archetype is defined by a positive spine and a definitive set of absences.
Both sides are load-bearing for the template's § 2 (Pattern composition) and
§ 3 (Engine surface) sections.

### Positive loop composition

- **Loop 2 (Idle Production)** — resources accumulate while the game is
  backgrounded. This is the primary loop: the game is advancing while the
  player is not looking.
- **Loop 7 (Auto-production)** — automated production chains (buildings,
  workers, automation upgrades) continue without input. The automation track
  must be available early — not gated behind late-game content.
- **Loop 1 (Prestige)** — optional. Cookie Clicker's Ascension, Trimps'
  portals, Realm Grinder's faction cycling demonstrate that prestige can
  coexist with the Ambient contract if it is softened: no optimal-timing
  mechanics, prestige attractive but never mandatory-now.

### Absent loops (the commitment)

- **No Loop 9 (Enemy Scaling)** — no waves that overwhelm an idle defense.
  Absent by design, not by accident or scope cut.
- **No strict Loop 14 (Cooldown/Energy urgency)** — no hard cooldown queues
  that expire if the player does not click, no energy caps that punish absence.
- **No fail states, no timed events requiring immediate response, no resources
  that cap and waste if uncollected.**

These absences are the pattern's mechanical commitment. The archetype-doc
§ 3 "Engine systems explicitly not used" row should name these loops and give
the one-line rationale: "Loop 9 (Enemy Scaling) is structurally incompatible
with the no-anxiety engagement model."

### Spatial axis

None load-bearing mechanically. The cozy-desktop variant has a presentational
spatial form (Rusty's Retirement's persistent bottom strip), but this is a
starter-layer UI concern — not a mechanical spatial commitment and not an
engine primitive gap.

### MDA aesthetic

**Submission** (primary): low-intensity background companionship, meditative
pace, no decisions under pressure. **Sensation** (secondary, and load-bearing):
cozy visual and audio design is a principal draw for the Steam-era cluster.

Sensation sits outside the four-aesthetic shortlist (Challenge / Submission /
Discovery / Completion) used elsewhere in the OL-558 survey. Its appearance
here is significant and should be flagged explicitly in the archetype doc. The
formation-era games (Anti-Idle, Candy Box, A Dark Room) achieved Ambient with
minimal visuals because novelty carried the experience; the Steam 2024+
resurgence cluster has higher visual expectations and treats Sensation as a
primary draw. The archetype doc should not restrict itself to the shortlist:
Ambient specifically requires Sensation in the MDA section.

---

## Lineage evidence

The 17-year formation-dormancy-resurgence arc is load-bearing for the
archetype's identity. It distinguishes Ambient from a contemporary trend.
Cite the arc explicitly in § 1 (Player experience) and in the Exemplars line.

**Formation: Web-incremental era (2009–2015)**

- **Anti-Idle: The Game** (Tukkun, Kongregate, December 24, 2009) — 16.5M
  plays, the highest-rated idle game on Kongregate. First game to make the
  ambient engagement model explicit: offline progress, dual active/idle toggle,
  prestige reset, multi-currency, embedded minigames. Named "Anti-Idle" as a
  tongue-in-cheek rejection of the idle form, while implementing it thoroughly.
  Formation-point exemplar.
- **Candy Box** (aniwey, April 2013, browser) — sparse-unfold text idle;
  1 candy per second at start; gradual discovery. Went viral on Reddit.
- **Cookie Clicker** (Orteil, August 2013, browser) — genre-defining; 50,000
  players within hours of launch; buildings, Ascension prestige, idle/click
  continuum. The canonical formation-era exemplar.
- **A Dark Room Phase 1** (Doublespeak, June 2013, browser) — fire-tending
  ambient phase with "no resource pressure, fire never runs out" (confirmed in
  `analyses/systems-extractions/a-dark-room-systems-analysis.md:836-873`).
  Phase 1 only — the full game is a Phase-shifter instance; Phase 1 is the
  Ambient phase.
- **Check Back Mod** (c. 2014–2015, web) — literal check-in idle, hours/days
  session cadence, no automation. Name-literal statement of the design
  commitment.
- **Trimps** (GreenSatellite, 2015, Kongregate) — 11.5M plays; Ambient-
  leaning despite a combat layer because combat auto-resolves and the
  engagement model is check-in, not active watch.
- **Realm Grinder** (DivineGames, 2015, Kongregate) — 7.9M plays; faction-
  based idle with a spectrum from fully active to fully passive. Demonstrates
  Ambient can coexist with an optional high-engagement mode.

**Mobile antecedent (un-catalogued)**

- **Neko Atsume** (Hit-Point, 2014, iOS) — cat-collecting idle, viral global
  adoption, lockscreen-check cadence. Not in the current corpus. OL-560
  (mobile corpus umbrella) will catalog it. The absence means current
  evidence counts are conservative.

**Dormancy: Mobile F2P era (2016–2023)**

The 2016–2023 gap is mechanistic: mobile F2P gacha economics require friction
(FOMO events, energy systems, limited-time offers, daily obligation) that are
structurally incompatible with the no-anxiety contract. The pattern did not
die; its habitat became hostile. Steam desktop in 2015–2022 was also a poor
Ambient platform (clicker-heritage and meme-clickers dominated).

**Resurgence: Steam desktop (2024+)**

- **Chillquarium** (Sep 2023, 89.54% rating, ~7.8k peak) — proto-resurgence
  predecessor; fish-tank ambient desktop.
- **Rusty's Retirement** (Apr 2024, 94.23%, ~20.9k peak) — persistent bottom-
  strip farm, always-on-top window. Steam-era Ambient flagship. Formation
  moment for the persistent-strip UI form.
- **ZM Desktop Elf** (Feb 2025, 78.99%, ~6.9k peak) — borderline (below 85%
  rating threshold).
- **Tiny Pasture** (Feb 2025, 89.90%, ~19.7k peak) — cozy farm idle.
- **Mini Cozy Room: Lo-Fi** (Mar 2025, 92.69%, ~9.1k peak) — room decoration.
- **Chill with You: Lo-Fi Story** (Nov 2025, 95.64%, ~10.5k peak) — highest-
  rated game in the Steam Idler tag. Lo-Fi companion narrative. Sensation
  aesthetic as primary draw.
- **Desktop Defender** (Nov 2025, 88.57%, ~2.7k peak) — desktop-overlay TD,
  Ambient-adjacent.

See taxonomy § 4 "The 2009 → dormancy → 2024 Ambient arc" for the full arc
summary with mechanism explained.

---

## Cross-corpus evidence

From scratch § Critical finding #2 and taxonomy § 2G:

| Corpus | Count | Notes |
|---|---|---|
| WC3 UMS | 0 | Zero hits, expected: competitive platform attracts challenge-seekers |
| SC2 Arcade | 0 | Zero hits, expected: same platform-audience reasoning |
| Dota 2 custom | 0 | Zero hits, expected; Brodota's "AFK-play" is social, not ambient |
| Steam | 7 | Rusty's Retirement, Tiny Pasture, Chillquarium, Mini Cozy Room, ZM Desktop Elf, Chill with You, Desktop Defender |
| Flash / Browser | 5 strong + 2 borderline | Anti-Idle, Cookie Clicker, Candy Box, Candy Box 2, A Dark Room Phase 1 (strong); Trimps, Realm Grinder (borderline) |
| v4 corpus | 3 moderate + 4 near-misses | A Dark Room Phase 1, Check Back Mod, Monster Daycare; near-misses excluded by pressure criterion |
| **Total (dedup)** | **~14+** | Flash formation + Steam resurgence + v4 hits |

Zero presence in WC3/SC2/Dota 2 is **expected and confirmatory**: those
platforms attract players seeking Challenge or Submission-through-competition.
Ambient's habitat is solo web or desktop game, not competitive arcade. The
zero arcade counts are evidence for the pattern's habitat characterization,
not evidence against its prevalence.

The evidence base clears the 5-or-more-game promotion threshold decisively.
All counts are from `arcade-market-archetypes-scratch.md` (primary) and
`arcade-market-archetypes-taxonomy.md` § 2G (promoted synthesis). Do not
re-derive.

---

## Engine posture

**Copy from taxonomy § 2G "Engine posture" verbatim:**

> Zero new primitives needed. Composition of `createLoop` + `createResource`
> + offline-progress via existing save primitives (the engine already handles
> save/restore including elapsed-time offline accumulation). The novelty in
> Ambient games is consumer-side UI (persistent desktop strip, reduced chrome,
> cozy aesthetics) and the deliberate absence of pressure loops — both are
> consumer-layer or starter-layer decisions, not engine primitive gaps.

**Do not re-decide this.** Engine posture is Phase 3b's (OL-568) territory.
The taxonomy's posture is the input to that phase. This prework cites it
verbatim and defers.

Additional detail from the LIBRARY pattern (§ Engine Posture in
`patterns/tier-3-moderate/ambient-progression.md`):

- `createResource` — passive resource accumulation
- `createProducerCategory` (or `createLoop` for auto-production variant) —
  automated production chains
- Existing save primitives (offline accumulation via `time.ts` / `offline.ts`)
  — offline progress, the mechanical prerequisite for the ambient contract
- Optional: `createReset` — if prestige is included; Ambient just means the
  caller omits urgency mechanics

**The consumer-side novelty is entirely in the starter layer or consumer
layer, not the engine:**

- Persistent-strip window shell — `open-loop-starter/src/lib/` layout
  component (`AmbientStrip` or `CompanionFrame` — a `TODO(expansion)` if
  multiple independent Ambient games converge on the same shape)
- Idle scene animation — Vue component animation system
- Reduced chrome / cozy visual vocabulary — app-level design decisions

Primary stress axes for the archetype: sparse engine surface (the archetype
exercises a small fraction of available primitives), offline-progress round-
trip correctness (the mechanical prerequisite for the engagement contract), and
absence-of-loop correctness (no Loop 9 or strict Loop 14 accidentally
introduced).

---

## Open questions for the archetype-doc drafting session

Prework did not resolve these. Each needs a call before or during the
`archetypes/ambient.md` draft:

1. **MDA "Sensation" outside the shortlist.** The OL-558 survey's 4-aesthetic
   shortlist is Challenge / Submission / Discovery / Completion. Ambient
   pushes Sensation as a load-bearing secondary aesthetic (the cozy aesthetic
   is the draw for the Steam resurgence cluster). The archetype doc's § 2
   (Pattern composition) should include Sensation even though it is outside
   the shortlist. Flag this divergence explicitly — the validator may need an
   escape-hatch note if it enforces the shortlist.

2. **Pattern name stability.** The LIBRARY pattern filed as "Ambient
   Progression." The archetype doc should use the same name for the § 2
   "Required patterns" cite. Confirm the LIBRARY name is stable before
   drafting.

3. **Exemplar list and corpus analysis availability.** The template's Exemplars
   line requires corpus games resolving to `analyses/complete/<name>-analysis.md`.
   Anti-Idle, Cookie Clicker, Candy Box, and the key Steam titles probably do
   not have complete analyses yet. Options: (a) cite available complete analyses
   (e.g., A Dark Room if it has a complete analysis) and note the others as
   "pending corpus analysis," or (b) check `analyses/complete/` before drafting
   and cite whatever resolves. The validator fails on unresolved exemplars.

4. **`AmbientArchetypeVars` shape.** The template requires a § 5 vars schema.
   Sketch so far:

   ```ts
   export interface AmbientArchetypeVars {
     // whether prestige loop is enabled (Ambient contract: never required)
     prestigeEnabled: boolean;       // default: false
     // target glance-check window in minutes (informs unlock pacing)
     glanceCheckWindowMin: number;   // e.g. 5
     glanceCheckWindowMax: number;   // e.g. 10
     // offline accumulation cap in hours (prevent meaningless multi-day gaps)
     offlineCapHours: number;        // e.g. 12–24
   }
   ```

   Validate against the template's rule: ArchetypeVars = structural fork
   decisions only; balance goes in BalanceVars.

5. **`AmbientBalanceVars` — production rate levers.** At minimum: base
   resource-per-second per producer tier, automation unlock costs, prestige
   multiplier (if enabled). The session drafting the archetype doc should pull
   a minimal set of knobs that cover the beat map's trigger conditions.

6. **Beat map timing.** The template requires 5–8 beats within a 1–2h first-
   completion arc. For Ambient, "completion" is a soft concept — the game is
   designed not to end. One defensible framing: the arc covers the player's
   first session to first prestige-eligible state (whether or not they
   prestige). The drafting session should commit to an arc framing before
   writing beats.

7. **Content sketch density.** The template's § 8 (Content sketch) requires
   mapping every beat to at least one content entry. For a sparse-engine-
   surface archetype, the content entries may be primarily visual (new building
   sprite, new idle animation, new zone revealed) rather than mechanical. The
   drafting session should confirm this is valid under the template's "density
   target" rule.

8. **Novel-patterns cluster alignment.** Check
   `open-loop-research/reports/novel-patterns/novel-patterns-synthesis-v4.md`
   for a cluster covering low-intensity companion engagement or the ambient
   engagement model. Cite it if present; write `n/a` if not. Expected to be
   `n/a` since Ambient is a relatively baseline idle composition rather than a
   novel cluster.

9. **Follow-up tickets to file from this work:**
   - Mobile corpus pass for Ambient antecedents (Neko Atsume, Desktop Goose)
     — filed as OL-560 umbrella.
   - `AmbientStrip` / `CompanionFrame` layout shell — filed as
     `TODO(expansion)` in the LIBRARY pattern; promote to a ticket if a
     second independent Ambient game consumer converges on the same shell shape.
   - Strict-vs-loose Steam criterion documentation — if the archetype doc
     counts 7 Steam exemplars, note the 85%+ rating threshold applied.

---

## Cross-references

- **LIBRARY pattern:** `patterns/tier-3-moderate/ambient-progression.md` —
  the canonical pattern doc filed in Phase 2. The archetype doc's § 2 required
  patterns should cite this by bare filename so it is grep-findable.
- **Taxonomy entry:**
  `reports/studies/arcade-market-archetypes/arcade-market-archetypes-taxonomy.md`
  § 2G — full per-archetype entry (cross-corpus presence, loop composition,
  spatial axis, MDA, OL-537 overlap, engine posture, lineage, confidence).
- **Taxonomy § 3C:** Ambient vs. Time Systems relationship (adjacent but not
  collapsible, different abstraction levels). The archetype doc's § 2 should
  cross-reference Time Systems as "adjacent, not equivalent."
- **Taxonomy § 4:** The 2009 → dormancy → 2024 arc summary. Cite in the
  Exemplars lineage framing.
- **Scratch § Critical finding #2:** The Phase 1 finding that flipped the
  ticket's framing from "Steam-native 2024" to "web-native 2009." Line ~84.
- **Scratch § Ambient rollup:** Line ~341. Cross-corpus presence table, loop
  composition detail, spatial axis, MDA, OL-537 overlap statement.
- **Scratch § Decision 3:** Line ~404. Promotion rationale for the LIBRARY
  pattern candidate. Evidence threshold check.

---

## Next-session instructions

1. Read this file. Read `archetypes/_template.md` and `archetypes/producer.md`
   (as format reference).
2. Resolve open question #3 (Exemplar list): check `analyses/complete/` for
   any Ambient games with existing complete analyses. Cite what resolves;
   note others as pending.
3. Resolve open question #8 (Novel-patterns cluster): read
   `open-loop-research/reports/novel-patterns/novel-patterns-synthesis-v4.md`
   briefly to check for a relevant cluster. This is a one-read check, not
   a research task.
4. Draft `archetypes/ambient.md` against the template, using `producer.md`
   as format reference and the evidence in this prework as input.
   - § 1 (Player experience): frame around the engagement-model inversion,
     not around idle mechanics.
   - § 2 (Pattern composition): cite `patterns/tier-3-moderate/ambient-progression.md`;
     cross-reference Time Systems as adjacent-not-collapsible per taxonomy § 3C.
   - § 3 (Engine surface): cite `createLoop`, `createResource`, and save
     primitives. The "explicitly not used" row must name Loop 9 / strict
     Loop 14 and give the one-line reason. Do NOT invent new primitives.
   - § 4 (Beat map): commit to an arc framing (first-session to first-
     prestige-eligible state is one option). 5–8 beats.
   - § 5 (Vars schema): use the `AmbientArchetypeVars` sketch in open
     question #4 as a starting point; extend with balance vars.
   - § 10 (Themes): 3–5 costume options. Candidates: cozy farm (Rusty's
     Retirement shape), aquarium / fish tank (Chillquarium shape), lo-fi
     companion / character-at-desk (Chill with You shape), text-idle / ascii
     (Anti-Idle / Cookie Clicker shape), garden / nature. All must touch only
     ThemeVars.
5. Do NOT pre-decide engine surface beyond what the taxonomy's posture
   statement says. Any gap hypotheses go in § 9 (Predicted engine gaps) as
   low-severity candidates pending Phase 3b confirmation.
6. Once `archetypes/ambient.md` is reviewed and approved, **delete this file**.

---

## References

- Scratch (primary evidence base):
  `open-loop-research/inbox/arcade-market-archetypes-scratch.md`
- Taxonomy (promoted synthesis):
  `open-loop-research/reports/studies/arcade-market-archetypes/arcade-market-archetypes-taxonomy.md`
  — § 2G (Ambient entry), § 3C (Ambient vs. Time Systems), § 4 (historical arc)
- LIBRARY pattern:
  `open-loop-research/patterns/tier-3-moderate/ambient-progression.md`
- Archetype template: `archetypes/_template.md`
- Archetype format reference: `archetypes/producer.md`
- OL-558 umbrella + OL-559 Phase 1 + OL-563 Phase 2 LIBRARY filing
- OL-567 (this subtask) + OL-568 (Phase 3b engine posture, Opus scope)
- OL-560 (mobile corpus umbrella — Neko Atsume Ambient validation pending)

---

## UI prescription hook (OL-582)

The archetype-doc drafting session must fill § 9 UI prescription against `archetypes/_template.md`. Prescriptions must cite one of three data artifacts under `open-loop-research/practical/ui-ux/`, or carry a `` `declared invention` `` tag with rationale.

**Data artifacts:**

- `layout-audit-2026.md` — per-game classification rows (69 games; shell, nav pattern, notable widgets, form-factor intent).
- `subgenre-shell-mapping-2026.md` — sub-genre × shell majority cross-tab. Only `incremental-math` has a strong single-shell majority; every other mid-size sub-genre offers a primary + secondary shell pair.
- `widget-vocabulary.md` — 10 ARIA-aligned widgets (lift targets for reka-ui primitives in `@/lib`) + 9 domain widgets (per-fork implementation; no pre-abstraction per OL-273 Phase 2 lift-first policy).

**Sub-genre mapping for Ambient:** Ambient Progression is an engagement-model commitment, not a mechanic family. Formation-era exemplars (Cookie Clicker, Universal Paperclips, A Dark Room Phase 1) map to `narrative clicker` in the audit (primary shell single-column; secondary three-panel). The Steam-era resurgence cluster (Rusty's Retirement, Chillquarium, Chill with You) implies the persistent-strip / desktop-overlay form, which is `` `declared invention` `` against starter — no `AmbientStrip` / `CompanionFrame` shell ships in `src/lib/shells/`. Flag this explicitly in § 9 declared-invention notes (see open question #9 in this prework).

**Shell name resolution.** `{{ShellName}}` must resolve to a file in `open-loop-starter/src/lib/shells/*.vue`. Starter ships five of the audit's six shells (`MultiColumnShell`, `SidebarMainShell`, `SingleColumnShell`, `TabsBarShell`, `ThreePanelShell`); `free-form` shell shapes are always `declared invention` against starter today.

**Form-factor intent.** Mobile-native / touch-primary / persistent-strip commitments are `` `declared invention` `` against the corpus — the rationale must be in § 9, not an implicit assumption. Audit mobile-aware coverage is ~32% of 69 rows; most sub-genres have no mobile majority.

**Reference retrofits.** `archetypes/producer.md` (three-panel primary, narrative clicker), `archetypes/looper.md` (three-panel primary, time-loop), `archetypes/scaler.md` (sidebar-main primary, prestige idle) show the § 9 shape against canonical-sub-genre-majority archetypes.
