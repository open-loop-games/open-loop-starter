# Auto-Battler — prework handoff (pre-archetype-doc)

> **What this file is.** A consolidation of Phase 3a research (OL-567) covering the
> Auto-Battler archetype candidate from the arcade-market archetypes survey (OL-558).
> The session did not implement anything. It promoted evidence from Phase 1 scratch
> and Phase 2 taxonomy into an archetype-doc-ready shape and resolved the
> Packer-vs-Auto-Battler separation question.
>
> **What this file is for.** The next session should:
>
> 1. Draft `archetypes/auto-battler.md` against `archetypes/_template.md`, using
>    `archetypes/producer.md` as format reference. Cross-reference
>    `archetypes/packer.md` as the shared-substrate-not-collapsible sibling.
> 2. Wait for Phase 3b (OL-568) engine-surface decision before finalising § 3 and
>    § 9 of the archetype doc. The grid-placement-auto-resolve primitive question is
>    live; do not pre-decide it here.
> 3. Once `archetypes/auto-battler.md` is reviewed and approved, **delete this file**
>    — it is scaffolding.
>
> **Status:** prework. Not a canonical archetype spec.

---

## Source context

**Umbrella:** OL-558 — Arcade + Market Archetypes Survey (Wave-2 candidates).

**Phase 1 (OL-559):** Five-corpus mass-extraction across WC3 UMS (101 maps), SC2 Arcade
(60 unique maps), Dota 2 custom games (top-100), Steam standalone (SteamDB Auto Battler
tag, 51 entries), and Flash era (45 entries). Produced per-corpus scratch files in
`inbox/arcade-market-archetypes/` and the rollup in
`inbox/arcade-market-archetypes-scratch.md`.

**Phase 2 (OL-564):** Cross-corpus taxonomy synthesised from Phase 1 scratch.
`reports/studies/arcade-market-archetypes/arcade-market-archetypes-taxonomy.md`
is the Phase 2 deliverable. Section 2D contains the Auto-Battler archetype entry;
§ 3A contains the Packer ↔ Auto-Battler shared-substrate analysis; § 4 documents
the 2019 single-point origin finding.

**Phase 2 pattern filing (OL-562):** The Placement-Adjacency pattern was filed as a
Tier 4 specialized pattern at
`open-loop-research/patterns/tier-4-specialized/placement-adjacency.md`. It names
Auto-Battler explicitly as a secondary consumer of the `grid-placement-auto-resolve`
substrate (after Packer as primary), parameterized on `unit-trait-synergy` rather
than `shape-adjacency-synergy`.

**Decision 1 resolution (taxonomy § 3A):** The ticket question was whether Packer's
vars schema cleanly parameterizes both inventory-grid and battlefield-position
placement. The answer from Phase 1 evidence is no. Auto-Battler and Packer are
**separate archetypes** sharing a `grid-placement-auto-resolve` substrate but
diverging on three axes — acquisition model, synergy model, and temporal model —
and with fully disjoint historical lineages (Packer 2003–2025 continuous;
Auto-Battler 2019-born). File separately; cross-reference as shared-substrate
siblings.

---

## The design problem, restated

Auto-Battler is a **two-phase structure** with a sharp preparation-to-resolution
boundary. Each round proceeds as follows:

1. **Draft / preparation phase.** The player acquires units from a shared limited
   pool using gold earned from prior rounds. Units are purchased, positioned on a
   battlefield grid, and composed into a class/trait synergy roster. Gold hoarding
   across rounds earns interest, creating an economic tension between spending and
   saving. The player may reroll the tavern/draft pool at cost to fish for desired
   units. The draft pool is partially or wholly shared with opponents, so unit
   acquisition is competitive: a unit you buy is a unit no opponent can.

2. **Combat phase.** The preparation phase ends (round timer expires or player
   locks in). Combat resolves automatically without per-unit commands. Units move,
   attack, and trigger abilities according to programmed rules. The player watches
   — no commands, no micromanagement. Outcome is determined by composition quality,
   synergy activation, and placement decisions made during prep.

**Defining commitments** (all four must be present; absence of any one shifts the
archetype toward Packer or Cycler):

- **Draft pool acquisition.** Unit supply is shared and limited. Players compete for
  the same pool. Gold-based rerolling lets players fish for specific units at cost.
- **Trait/class synergy.** Assembling units with matching class or trait tags unlocks
  set bonuses (e.g., fielding three Assassins activates the Assassin synergy bonus).
  Synergy is membership-based — it fires on *having* the right roster composition,
  not on *positioning* units next to each other (that's the Packer model).
- **Round-based economy.** Gold accumulates between rounds; hoarding earns interest;
  spending resets the interest clock. This creates a round-over-round economic
  meta-game distinct from the within-round draft.
- **Fully automated combat.** After the prep phase, the player has zero commands.
  Combat outcome is predetermined by the prep-phase decisions. Player agency is
  entirely front-loaded.

---

## Archetype framing

**Wave-2 candidate.** Auto-Battler is one of seven archetypes identified in the OL-558
arcade-market archetypes survey that do not collapse to any OL-537 Wave-1 archetype
(Producer / Looper / Scaler / Interlocker / Explorer / Scripter / Phase-shifter /
Director).

**Does not collapse to any Wave-1 archetype.** The draft mechanic, shared pool
structure, trait/class synergy model, and round-based interest economy have no
equivalent in OL-537 vocabulary.

**Does not collapse to Packer.** Despite sharing the `grid-placement-auto-resolve`
substrate, Auto-Battler and Packer diverge on acquisition model (draft pool vs.
crafting/drops), synergy model (class/trait membership vs. shape/adjacency geometry),
and temporal model (round-timer prep phase vs. craft-then-deploy). Their historical
lineages are fully disjoint (see Lineage evidence below). Taxonomy § 3A is the
authoritative resolution; do not relitigate in the archetype doc — cite it.

**Status:** `candidate` — validation of composition viability requires at least one
shipped implementation. No OL-537-era game serves as an Auto-Battler archetype proof
within the Open Loop ecosystem. The corpus evidence (Cross-corpus evidence below)
provides strong external validation, but internal archetype-viability status remains
candidate until a shipped consumer game proves the engine composition.

---

## Distinguishing properties

The four loop IDs below are from the corpus loop taxonomy. Loop labels as cited
in taxonomy § 2D:

- **Loop 4 (Upgrade Tree)** drives drafting. Unit synergy composes roster-wide
  upgrades — the player is not buying single-item power but unlocking emergent bonuses
  from the combination. This is the defining decision surface: "do I buy this unit to
  complete a trait threshold, or does it waste a slot?" The upgrade tree is lateral
  (what roster composition unlocks which synergy tiers) rather than vertical (linear
  level-up).

- **Loop 6 (Resource Accumulation)** is the economic spine. Gold accumulates between
  rounds; interest on hoarding rewards patient play; round-end spending creates
  sawtooth economy rhythm. The interest mechanic is Auto-Battler's most distinctive
  economic invention — it is not present in Packer, Cycler, or any
  Wave-1 archetype.

- **Loop 14 (Cooldown/Energy)** provides pacing. The round timer gates the prep
  phase: the player has a fixed window (typically 30–60 seconds) to draft, position,
  and lock in. When the timer expires, the phase transitions automatically. This
  is not a soft deadline — the game removes agency at timer expiry, making the
  clock a first-class mechanic rather than a UI affordance.

- **Loop 9 (Enemy Scaling)** escalates the challenge. Tier progression through the
  round bracket — early rounds face weaker opponents/boards; later rounds face
  stronger synergy compositions and higher-level units. Advancement through brackets
  is the long-arc tension; round survival is the short-arc tension.

---

## Lineage evidence

**Zero pre-2019 presence.** This is the critical finding from Phase 1 (scratch
§ "Critical finding #5: Auto-battler is 2019-native"). WC3 UMS corpus (101 maps):
zero Auto-battler hits. Flash era corpus (45 entries): zero Auto-battler hits.
The closest WC3 UMS candidate, Hero Line Wars Starlight, is Cycler-shaped
(build-phase + wave-defense cyclical), not Auto-Battler-shaped. No artistic heritage
from pre-2019 connects to the Auto-Battler structure.

**Genre-forming event: Dota Auto Chess (January 2019, Drodo).**

- All-time peak: 359,000 concurrent players, reached within days of launch.
- Subscribers: 10.2M (Dota 2 custom game subscriber count).
- Comparative scale: 7.2× the second-highest Dota 2 custom game by all-time peak.
- Daily peak floor (as of 2023): 8–10k, stable, indicating a persistent residual
  audience even after standalones cannibalized the main user base.

This is not gradual convergent evolution across independent communities. It is a single
mod by Drodo that defined a genre in a matter of weeks and triggered immediate major-
publisher response.

**Three major publishers within 10 months:**

| Publisher | Product | Launch | Platform |
|-----------|---------|--------|----------|
| Valve | Dota Underlords | June 2019 | Steam (202k peak) |
| Riot Games | Teamfight Tactics | June 2019 | League of Legends client |
| Blizzard | Hearthstone Battlegrounds | November 2019 | Hearthstone client |

**Post-2019 Steam independents (partial list):**

- Super Auto Pets (Smash Hit Plunder, 2021 — 10.7k Steam peak)
- Storybook Brawl (2021)
- Hadean Tactics (2022)
- Teamfight Manager (8k peak)
- Mechabellum (2024, 7.8k peak)
- The Bazaar (2025)
- Dragon Cliff, Yi Xian, Yaoling, and others

**Taxonomy § 4 states:** "Auto-battler is unique in this survey: it is the only
archetype with a documented single-point origin rather than gradual cross-corpus
convergence." This statement should be cited verbatim in the archetype doc.

---

## Cross-corpus evidence

Approximately 18–22 games across 3 corpora (WC3: 0, Flash: 0 — both are confirmed
zeroes, not data gaps).

| Corpus | Count | Key examples |
|--------|-------|--------------|
| WC3 UMS | 0 | Confirmed zero (101 maps surveyed) |
| Flash era | 0 | Confirmed zero (45 entries surveyed) |
| SC2 Arcade | 3 | SC Tavern Battle (Hearthstone Battlegrounds clone); SC Tavern Battle: Challenge Amon PvE; PVE测试 |
| Dota 2 Custom | 5 | Dota Auto Chess (359k ATP, 10.2M subs — genre-forming); Custom Hero Chaos (49k ATP); Auto Gladiators (27k ATP); Ability Arena; Backpack Chess |
| Steam | 14 | Dota Underlords (202k peak); Teamfight Manager (8k); Mechabellum (7.8k); Super Auto Pets (10.7k); Storybook Brawl; The Bazaar; Hadean Tactics; Dragon Cliff; Yi Xian; Yaoling; and others |

SC2 adopts the shape via Hearthstone Battlegrounds cloning (2022), not via independent
invention — confirming the single-origin claim.

**Confidence: strong.** The sharp genre-formation moment is verifiable with documented
date and data. Post-2019 cross-market propagation is confirmed by API (Dota 2 custom
stats, customgamestats.com) and SteamDB signals. The corpus absence before 2019 is
verified across two separate corpora (WC3 and Flash), not assumed.

---

## Spatial axis

**Primary: Placement-Adjacency.** The battlefield grid gives units positions that
determine combat targeting, ability range, and — in some variants — adjacency bonuses.
The `grid-placement-auto-resolve` substrate is shared with Packer (see
`patterns/tier-4-specialized/placement-adjacency.md` § "Pairs with: AUTO-BATTLER
ARCHETYPE").

The key spatial distinction from Packer: Auto-Battler's synergy is triggered by
**roster composition** (class/trait membership), not by which cells are physically
adjacent on the grid. A player fields three Assassins and the Assassin synergy fires
regardless of whether those three units are clustered together or spread across the
board. Position on the grid matters for targeting and front-row/back-row tactics,
but is not the synergy mechanism itself.

**Spatial sub-variants in the corpus:**

- **2D hex-grid adjacency (Dota Auto Chess original):** Units placed on a hex grid;
  some bonuses do involve hex-adjacency positioning. This is the closest to a pure
  Placement-Adjacency model within the Auto-Battler archetype.
- **2D rectangular grid (TFT, Dota Underlords, Teamfight Manager, Mechabellum):**
  Standard grid; synergy fires on roster composition; position affects combat
  priority and ability range but not synergy activation directly.
- **1D team-slot ordering (Super Auto Pets):** Units occupy a linear sequence of
  5 slots; attack sequence is determined by position; the game has per-item effects
  that trigger on position (friend-in-front, friend-behind). This is a degenerate 2D
  case — the spatial axis is 1D, but the core draft-and-auto-resolve structure remains
  intact.

The 1D vs. 2D split is a sub-lineage question for the archetype doc. Both are
Auto-Battler-shaped; the spatial parameterization differs. This may affect the
engine primitive design in Phase 3b.

**Spatial commitment distinguishes Auto-Battler from Packer** (taxonomy § 3A): Packer's
synergy is geometry-based (neighbor adjacency fires the bonus); Auto-Battler's synergy
is membership-based (having the right roster composition fires the bonus). Same
substrate, different parameterization.

---

## MDA aesthetic

- **Challenge (primary):** Synergy optimization under draft-pool competition. The
  player must identify which traits to build toward, acquire units against competitors
  drawing from the same pool, and position correctly under time pressure. The
  optimization surface is high-dimensional (unit choice x trait threshold x position
  x gold timing) in a way that rewards knowledge of the synergy chart.

- **Submission (secondary):** Automated combat reduces execution to observation. After
  the prep phase ends, the player watches the round resolve. Submission here is not
  passive — it is the consequence of decisions made during prep. The "watch it play
  out" quality is load-bearing: it gives the player a moment of feedback and rest
  before the next draft.

- **Discovery (secondary):** The synergy composition surface rewards exploration of
  combinations. Players discover cross-trait synergies, counter-compositions, and
  positioning tricks that nobody documented in tutorials. The combination space is
  large enough that experienced players still encounter surprising interactions.

---

## Engine posture

**Copy verbatim from taxonomy § 2D:**

> Minor extension possibly needed: a `grid-placement` primitive with `unit-trait-synergy`
> parameterization to support both the battlefield grid and the synergy-composition loop.
> The draft/tavern mechanic (shared limited pool with gold-based rerolling) is a
> consumer-layer concern — it requires game-specific rules about pool size, reroll cost,
> and tier weighting that do not generalize across the engine without game-specific
> parameterization. See § 3 for the shared substrate with Packer and
> arcade-market-archetypes-primitive-surface.md for Phase 3b detail.

**Phase 3b gate:** The question of whether `grid-placement-auto-resolve` extracts as
a shared engine primitive (serving both Packer and Auto-Battler), parks as a
`TODO(expansion)` with game-side implementations, or stays entirely game-side is the
primary investigation target of Phase 3b (OL-568). **Do not pre-decide this in the
archetype doc.** The engine posture section of `archetypes/auto-battler.md` should
flag the Phase 3b decision as pending and note that § 9 (Predicted engine gaps) will
be updated once OL-568 lands.

**What is definitively game-side (regardless of Phase 3b outcome):**

- Draft pool management (shared-pool size, unit tier distribution, reroll cost
  formula, interest rate schedule) — these parameters are game-specific design
  decisions that do not generalize without game-specific values.
- Round bracket structure (number of rounds, PvP pairing algorithm, PvE round
  placement, buy/sell round economy).
- Unit roster content (classes, traits, ability sets, tier weights).

**What is the Phase 3b candidate:**

- `createGridSystem` with `synergyPredicate` parameterization — a primitive that
  accepts both the Packer `shape-adjacency-synergy` predicate and the Auto-Battler
  `unit-trait-synergy` predicate. The shared shape is: place entities on a grid,
  evaluate a synergy function over the current arrangement, feed the result into
  the auto-resolve loop.

---

## Open questions for the archetype doc

These were not resolved in this prework session. Each needs a call before or
during the `archetypes/auto-battler.md` draft:

1. **Draft-pool mechanic's consumer-layer boundary.** The taxonomy calls it
   consumer-layer, but the archetype doc needs to be precise about what the
   engine might eventually support (pool state as a `createResource`? reroll
   cost as a `createPurchasable`?) vs. what must be game-side regardless.
   Sketch the minimal viable engine support for draft without pre-committing
   to a primitive design.

2. **1D slot (Super Auto Pets) vs. 2D grid (Auto Chess) as sub-lineages.**
   Do these warrant separate `ArchetypeVars` parameterization, or is the
   1D case treated as a degenerate 2D case with `gridRows: 1`? The answer
   affects the vars schema in § 5 of the archetype doc.

3. **Deckbuilder-adjacent crossovers.** Storybook Brawl and The Bazaar sit on
   the Auto-Battler / deckbuilder boundary — they use card acquisition mechanics
   alongside the auto-resolve combat structure. Do these count as Auto-Battler
   instances with a deckbuilder acquisition variant, or are they a hybrid that
   warrants its own entry? The archetype doc should take a position.

4. **Mechabellum's unit-type synergy model.** Mechabellum (2024) uses unit
   countering rather than class/trait set bonuses. Counter-synergy is a different
   model from membership-based trait activation. Does the archetype's synergy
   definition accommodate counter-synergy, or does Mechabellum sit at the edge
   of the archetype's boundary?

5. **PvP vs. PvE round structure.** Original Auto Chess, TFT, and Dota Underlords
   are PvP games where players compete against each other's boards. Super Auto Pets
   and Mechabellum have PvP but also strong PvE modes. Hadean Tactics and Dragon Cliff
   are PvE roguelikes using the Auto-Battler loop. The archetype doc should address
   whether `AutoBattlerArchetypeVars` includes a `combatMode: 'pvp' | 'pve' | 'hybrid'`
   flag or whether PvP is definitional.

6. **Beat map scale.** A single Auto-Battler run (8–10 rounds in TFT, ~16 rounds in
   Super Auto Pets) takes 20–40 minutes. The archetype doc's § 4 beat map needs to
   decide whether to describe a single-run arc or a meta-arc across multiple runs.
   The 1–2h template window could accommodate either a 3-run arc or one long run
   with meta-progression between runs.

---

## Cross-references

**Pattern:** `open-loop-research/patterns/tier-4-specialized/placement-adjacency.md`
— the `grid-placement-auto-resolve` substrate both Packer and Auto-Battler consume.
The pattern's § "Pairs with" names Auto-Battler explicitly. The § Engine Posture
Phase 3b candidate shape describes `createGridSystem` with parameterized synergy
predicates.

**Taxonomy:**
- § 2D — Auto-Battler archetype entry (cross-corpus presence, loop composition,
  spatial axis, MDA aesthetic, OL-537 overlap, engine posture, lineage, confidence).
- § 3A — Packer ↔ Auto-Battler shared substrate and separation rationale.
- § 4 — "The 2019 Auto-Battler origin (no antecedents)" — the single-point-origin
  uniqueness finding.

**Scratch:**
- `inbox/arcade-market-archetypes-scratch.md` § "Auto-battler (prep+combat with
  unit synergy composition)" — Phase 1 rollup.
- `inbox/arcade-market-archetypes-scratch.md` § "Critical finding #5: Auto-battler
  is 2019-native" — the zero-pre-2019 finding with corpus counts.
- `inbox/arcade-market-archetypes-scratch.md` § "Decision 1: Packer absorbs
  Auto-battler as battlefield-position variant?" — the separation decision with
  evidence enumerated.

**Sibling prework:** `archetypes/_packer-prework.md` — the shared-substrate sibling.
The two preworks should be cross-read as a pair; they share the § 3A taxonomy
analysis and the Phase 3b dependency.

**Engine Phase 3b:** `reports/studies/arcade-market-archetypes/arcade-market-archetypes-primitive-surface.md`
— the Phase 3b deliverable (OL-568) that decides the `grid-placement-auto-resolve`
primitive fate. The archetype doc's § 9 (Predicted engine gaps) should be finalised
after this lands.

---

## Next session's concrete tasks

1. Read this file. Read `archetypes/_template.md` and `archetypes/producer.md`.
   Read `archetypes/_packer-prework.md` as the shared-substrate sibling.
2. Resolve open questions #2 (1D vs. 2D sub-lineages), #5 (PvP vs. PvE scope), and
   #6 (beat map scale) before opening the template — these affect the structure of
   §§ 4 and 5.
3. Draft `archetypes/auto-battler.md` against the template.
   - § 2: cite Placement-Adjacency pattern. Cross-reference Packer as
     shared-substrate-not-collapsible sibling, citing taxonomy § 3A verbatim.
   - § 3: flag Phase 3b (OL-568) pending; use engine primitives that exist today
     (`createResource`, `createSequencer`, `createZoneSystem`) and note
     `grid-placement-auto-resolve` as a predicted gap pending Phase 3b.
   - § 9: leave the grid-placement gap row with severity TBD; link to OL-568.
4. **Archetype doc benefits from Phase 3b (OL-568) landing first.** If OL-568
   resolves while this prework is active, update the Engine posture section and the
   cross-reference list in this file before drafting the archetype doc.
5. Once `archetypes/auto-battler.md` is reviewed and approved, **delete this file**.

---

## References

- Taxonomy: `open-loop-research/reports/studies/arcade-market-archetypes/arcade-market-archetypes-taxonomy.md` §§ 2D, 3A, 4
- Primitive surface (Phase 3b): `open-loop-research/reports/studies/arcade-market-archetypes/arcade-market-archetypes-primitive-surface.md`
- Pattern: `open-loop-research/patterns/tier-4-specialized/placement-adjacency.md`
- Phase 1 scratch: `open-loop-research/inbox/arcade-market-archetypes-scratch.md`
- Archetype template: `archetypes/_template.md`
- Archetype format reference: `archetypes/producer.md`
- Shared-substrate sibling: `archetypes/_packer-prework.md`
- Engine API index: `open-loop-engine/docs/api/INDEX.md`

---

## UI prescription hook (OL-582)

The archetype-doc drafting session must fill § 9 UI prescription against `archetypes/_template.md`. Prescriptions must cite one of three data artifacts under `open-loop-research/practical/ui-ux/`, or carry a `` `declared invention` `` tag with rationale.

**Data artifacts:**

- `layout-audit-2026.md` — per-game classification rows (69 games; shell, nav pattern, notable widgets, form-factor intent).
- `subgenre-shell-mapping-2026.md` — sub-genre × shell majority cross-tab. Only `incremental-math` has a strong single-shell majority; every other mid-size sub-genre offers a primary + secondary shell pair.
- `widget-vocabulary.md` — 10 ARIA-aligned widgets (lift targets for reka-ui primitives in `@/lib`) + 9 domain widgets (per-fork implementation; no pre-abstraction per OL-273 Phase 2 lift-first policy).

**Sub-genre mapping for Auto-battler:** Auto-battler is a 2019-native genre (Dota Auto Chess origin per taxonomy § 4). The audit corpus has no auto-battler rows. Primary shell is `` `declared invention` ``: board-with-shop layout has no corpus precedent. Closest partial-corpus references are Clickpocalypse 2 (`free-form`, idle RPG, fixed 1024×768 canvas + right/bottom panels) and The Silly Caverns (`three-panel`, prestige idle, 33×33 procedural mine grid as play surface) — neither is a direct shell match.

**Shell name resolution.** `{{ShellName}}` must resolve to a file in `open-loop-starter/src/lib/shells/*.vue`. Starter ships five of the audit's six shells (`MultiColumnShell`, `SidebarMainShell`, `SingleColumnShell`, `TabsBarShell`, `ThreePanelShell`); `free-form` shell shapes are always `declared invention` against starter today.

**Form-factor intent.** Auto-battler on desktop is pointer-primary (board + shop UI); mobile variants are `` `declared invention` `` for form-factor.

**Reference retrofits.** `archetypes/producer.md`, `archetypes/looper.md`, `archetypes/scaler.md` show the § 9 shape. Pair-review reference: `archetypes/_packer-prework.md` shares `grid-placement-auto-resolve` substrate.
