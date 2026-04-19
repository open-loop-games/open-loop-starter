# Packer — prework handoff (pre-archetype-doc)

> **What this file is.** A consolidation of Phase 3a of OL-558 covering the
> Packer archetype (Wave-2 candidate). The session did not implement anything.
> It refined the problem, settled on framing, and resolved blockers.
>
> **What this file is for.** The next session should:
>
> 1. Draft `archetypes/packer.md` against `archetypes/_template.md`, using
>    the decisions below as input and `archetypes/producer.md` as format
>    reference.
> 2. Cross-reference `archetypes/_auto-battler-prework.md` as the
>    shared-substrate-but-distinct sibling (per taxonomy § 3A).
> 3. Once the archetype doc is approved, **delete this file** — it's
>    scaffolding.
>
> **Status:** prework. Not a canonical archetype spec.
>
> **Phase 3b note:** The archetype doc benefits from OL-568 (Phase 3b engine
> surface decision) landing first, but is not strictly blocked. This prework
> stabilizes the archetype framing independently of that engine decision.

---

## Source context

**Umbrella:** OL-558 (Arcade + Market Archetypes wave-2 survey).

**Phase 1 (OL-559):** Cross-corpus survey across WC3 UMS, SC2 Arcade, Dota 2
custom games, Steam standalone, and Flash-era web-incremental. Packer emerged
as a clear candidate: ~8–10 games across 4 corpora, 18-year continuous
single-archetype historical lineage, and cross-corpus evidence clearing the ≥5
game promotion threshold.

**Phase 2 (OL-564):** Taxonomy synthesis produced the entry at
`open-loop-research/reports/studies/arcade-market-archetypes/arcade-market-archetypes-taxonomy.md`
§ 2E (Packer definition, loop composition, spatial axis, engine posture, and
lineage) and § 3A (Packer ↔ Auto-battler shared substrate, distinct archetypes).
The taxonomy entry is the primary source for this prework.

**Phase 2 Pattern filing (OL-562):** Placement-Adjacency filed at
`open-loop-research/patterns/tier-4-specialized/placement-adjacency.md`. This
is the LIBRARY-canonical pattern name for the spatial mechanic central to the
Packer archetype.

**Decision 1 resolution (taxonomy § 3A):** Packer and Auto-battler share a
`grid-placement-auto-resolve` substrate but are **separate archetypes**. The
separation follows from three distinct axes: acquisition model (crafting from
components vs. drafting from shared pool), synergy model (shape/adjacency vs.
class/trait), and temporal model (craft-then-deploy vs. round-timer prep
phase). Their historical lineages are disjoint — Packer traces 22 continuous
years (2003–2025); Auto-battler was nonexistent before January 2019.

**Phase 3b (OL-568):** Engine primitive surface decision for the shared
`grid-placement-auto-resolve` substrate. This prework does not pre-decide
that question — see "Engine posture" section below.

---

## The design problem, restated

Grid-based crafting or inventory optimization where the **spatial shape and
neighbor relationships of items** — not unit class/trait rosters — determine
synergy outcomes, combined with auto-resolve combat or scoring.

The player arranges items, gems, or units within a fixed grid space. Adjacency,
shape, or fill-pattern properties trigger synergy bonuses. Combat or scoring
resolves automatically after the packing phase concludes.

The design question is not whether to make position matter but what
relationship between positions carries the mechanical weight: is it the
identity of adjacent occupants (neighbor-bonus synergy), the geometry of
shapes fitting into cells (tetromino-fit / shape-match), or some combination?
Until that commitment is explicit, every spatial rule is ad-hoc and cannot
compose into a legible system.

The core tension: Packer's depth requires the player to reason about
arrangement as a second optimization axis on top of item identity. This is
what distinguishes Packer from a flat-stat collection game and from a
round-timer draft game. That second axis must be scaffolded or players will
disengage before the spatial reasoning emerges.

---

## Archetype framing

**Wave-2 candidate.** Not an OL-537 archetype and does not collapse to any
existing one.

Packer does **not** collapse to Auto-battler despite the shared
`grid-placement-auto-resolve` substrate. The distinction is threefold:

1. **Acquisition model.** Auto-battler drafts from a shared limited pool using
   gold economy and round-based rerolls. Packer crafts from components
   (GemCraft's gem chip combining) or acquires through drop-based accretion
   (Backpack Battles' run-based item drops). The draft/pool mechanic is
   load-bearing for Auto-battler's competitive tension — you and your opponents
   compete for the same supply — and has no analog in Packer.

2. **Synergy model.** Auto-battler: class/trait synergy — assembling units of
   matching class or trait unlocks set bonuses; synergy is membership-based.
   Packer: shape/adjacency synergy — items fit specific grid cells, and neighbor
   bonuses trigger from physical cell adjacency; synergy is geometry-based.

3. **Temporal model.** Auto-battler: round-timer-based prep-and-combat
   alternation with draft pool rotation. Packer: craft-then-deploy, often
   without a strict round timer (GemCraft is wave-based like Defender, not
   round-timer-based like Auto-battler).

**Lineage disjointness is decisive.** Packer traces a continuous 22-year
lineage (Gem TD WC3 2003 to Backpack Battles Steam 2025). Auto-battler was
nonexistent before January 2019. Two genres that predate each other's
existence by 16 years are not variants of the same idea.

See taxonomy § 3A for the full separation argument.

**Status:** `candidate` (per template). Becomes `canonical` after shipping and
proving composition viable.

---

## Distinguishing properties

Loop composition (from taxonomy § 2E):

- **Loop 4 (Upgrade Tree — item crafting and combining)** — central. The
  gem-combining mechanic (GemCraft), the item-crafting loop (Backpack Battles),
  and the gem-grade upgrade path (Gem TD) are all Loop 4 expressions. This is
  the primary progression vehicle.
- **Loop 6 (Resource Accumulation — currency for items or gem components)** —
  funds crafting. Mana in GemCraft, gold/currency in Backpack Battles variants,
  mineral economy in Gem TD.
- **Loop 14 (Cooldown/Energy — round pacing where applicable)** — round timers
  in some variants (Backpack Battles' prep-then-resolve structure). Not always
  present; GemCraft is wave-paced rather than round-timer-paced.
- **Loop 9 (Enemy Scaling — escalating wave difficulty)** — present in GemCraft
  and Gem TD variants that sit on a Defender substrate. Absent in pure
  inventory-packing variants (Backpack Battles, Backpack Chess).

The presence or absence of Loop 9 distinguishes the two main Packer sub-types:
GemCraft/Gem TD are Defender x Packer hybrids; Backpack Battles/Backpack Chess
are pure Packer.

**Spatial axis:** Placement-Adjacency (P-PADJ) is the defining spatial
commitment. See `patterns/tier-4-specialized/placement-adjacency.md`.

**MDA aesthetic:** Challenge (build optimization under spatial constraints) +
Discovery (synergy surface rewards experimentation) + Completion (satisfying
click of a fully optimized build).

---

## Lineage evidence

**GemCraft 18-year continuous lineage (taxonomy § 4):**

- **Gem TD (WC3, ~2003)** — first documented Packer instance. Gem-on-tower
  placement with gem-combining to higher grade. Community-named; mechanics
  are well-documented despite no source-code verification (WC3 JASS is not in
  the submodule corpus). Confidence: strong on community-knowledge basis.

- **GemCraft (Armor Games Flash, 2008)** — Flash standalone with campaign
  structure. Translates the gem-combining mechanic: gem color x gem grade x
  destination slot (tower/trap/amplifier) determines synergy effect. First
  commercial Packer product.

- **GemCraft Labyrinth (Flash 2011, iOS)** — labyrinthine map design extends
  the Defender substrate. Labyrinth-mode gives gem placement a routing
  dimension. iOS port expands reach.

- **GemCraft: Chasing Shadows (Flash 2014, Steam 2015)** — 9-color gem system
  x destination slot. Steam commercial viability proven: first franchise entry
  on Steam, establishing the GemCraft audience on desktop.

- **GemCraft: Frostborn Wrath (Steam 2020)** — franchise continuation on
  Steam. Confirms long-running franchise viability.

**Separate branch — inventory-packing lineage:**

- **Backpack Chess (Dota 2 custom)** — explicit inventory-grid ("backpack"
  named in source). Bridge between the GemCraft/gem tradition and the modern
  inventory-packing form.

- **Backpack Battles (Steam early access 2023, full release 2025)** — the
  modern standalone crystallization of pure Packer. Tetris-inventory: items
  have 2D spatial footprints, neighbor bonuses trigger from physical cell
  adjacency, auto-combat resolves after inventory finalized. 37k peak on Steam.
  Highest follow-to-peak ratio in the Auto Battler Steam tag at time of survey.

- **Ballionaire (Steam 2024)** — ball-placement synergy with bounce adjacency.
  Physics-adjacent form of the same shape-and-adjacency spatial reasoning.

Both branches trace to the same spatial-synergy-inventory insight. The GemCraft
branch arrived from the tower defense tradition; the Backpack Battles branch
arrived from the deckbuilder-adjacent game design tradition. Their convergence
on the same spatial mechanic is the strongest evidence of Packer as a real
independent pattern.

**18 years is the longest continuous single-archetype historical lineage in
this survey by a substantial margin.** See taxonomy § 4.

---

## Cross-corpus evidence

~8–10 unique games across 4–5 corpora. Per-corpus breakdown (from taxonomy §
2E and scratch rollup § Packer):

| Corpus | Count | Key games |
|---|---|---|
| WC3 UMS | 1 | Gem TD — gem-combining, slice-1 |
| SC2 Arcade | 1 | BattlePoker — card/hand synergy, borderline instance, slice-2 |
| Dota 2 custom | 2 | GemTD port (WC3 lineage confirmed); Backpack Chess (explicit inventory-grid), slice-3 |
| Steam standalone | 4 | Backpack Battles 37k flagship; Super Auto Pets partial; Ballionaire; Overlooting, slice-4 |
| Flash era | 3 | GemCraft 2008; GemCraft Chapter 0; GemCraft: Chasing Shadows — gem-combining is Packer-signature across all three, slice-5 |

**Crush the Castle (Flash era, Armor Games):** physics-pachinko Packer-adjacent
but mechanism differs. Not counted as a core Packer instance.

**BattlePoker (SC2):** borderline — card/hand synergy is closer to trait
stacking than shape/adjacency synergy. Included with caveat.

**Super Auto Pets (Steam):** partial — 1D team-slot ordering is a degenerate
form of placement-adjacency. Dual-tagged; its primary shape is Auto-battler.

**Confidence: moderate-to-strong.** Lower per-corpus count than
Defender/Survivor/Tug, but exceptional lineage quality and cross-corpus
distribution. Combined-corpus evidence clears the ≥5 game promotion threshold.
The moderate qualifier reflects lower raw count relative to the strong-
confidence group; the strong qualifier reflects the 18-year lineage.

---

## Spatial axis

Placement-Adjacency (P-PADJ) is the defining spatial commitment for Packer.
Filed at `patterns/tier-4-specialized/placement-adjacency.md`.

Shape-of-item combined with neighbor-relation produces the synergy bonus.
Two parameterizations appear in the corpus:

1. **Same-type neighbor bonus (building grid form)** — each adjacent occupied
   cell that shares a property (color, type, category) adds a flat multiplier.
   This is the Industry Idle and incrielemental form documented in the
   placement-adjacency pattern file.

2. **Shape-fit / gem assignment (combinatorial crafting form)** — items have
   type/color/grade properties; placement slots have type-compatibility rules;
   combining items produces a new item with merged properties. This is the
   GemCraft lineage form. The player's problem is finding the combination and
   assignment that maximizes output.

Backpack Battles' tetris-inventory is the pure modern form — items have 2D
spatial footprints, neighbor bonuses trigger from physical cell adjacency.

Gem TD's gem-in-tower-slot is placement-as-assignment — gems are assigned to
towers; the combination of gem type and tower type determines the synergy
effect.

**Why Packer is a cleaner Placement-Adjacency instance than Defender:** In
Defender (pure tower placement), tower grid neighbors are often mechanically
inert — each tower fires independently. In Packer, grid neighbors are
mechanically consequential by definition: the neighbor relationship is the
synergy trigger. Packer represents the pattern's fullest realization.

**GemCraft / Gem TD hybrid note:** These games sit on top of a Defender
substrate (wave-paced enemy escalation, tower placement as the defensive
commitment) with the Packer mechanic layered on top (gem-combining and
gem-slot-assignment as the spatial synergy). They are Defender x Packer
hybrids, not pure Packer instances. The archetype doc should acknowledge
this explicitly and document how the two archetypes compose.

---

## MDA aesthetic

From taxonomy § 2E:

- **Challenge (primary)** — build optimization under spatial constraints. The
  2D arrangement problem plus the crafting/combining problem creates a genuine
  optimization puzzle: given this item pool and this grid, what arrangement
  maximizes output? The puzzle has a discoverable answer and a visible solution
  space (the board).

- **Discovery (primary)** — the synergy surface rewards experimentation with
  combinations. Players encounter configurations nobody documented. GemCraft's
  gem-color combination effects, Backpack Battles' item-neighbor chain
  discoveries, and Gem TD's gem-combining outcomes all produce "I never knew
  that worked" moments that cannot emerge from flat-stat optimization.

- **Completion (secondary)** — the satisfying click of a fully optimized build.
  An unfilled grid slot is a visible gap; filling it correctly with the right
  item in the right position produces a satisfying completion gesture.
  GemCraft players' drive to find gems for every empty tower slot before
  advancing a wave is this aesthetic in action.

---

## Engine posture

Copied verbatim from taxonomy § 2E:

> "Minor extension — a `grid-placement` primitive with
> `shape-adjacency-synergy` parameterization. This shared substrate with
> Auto-battler is a candidate engine primitive for Phase 3b. The two archetypes
> specialize it differently: Packer uses shape-and-adjacency-bonuses;
> Auto-battler uses unit-trait-set-bonuses."

**Phase 3b (OL-568) decides** whether this extracts now, parks as
`TODO(expansion)`, or stays game-side. Do not pre-decide here.

The `placement-adjacency.md` pattern file documents the v1 game-side approach:
a plain 2D array of cells managed at the consumer layer, with synergy
evaluation as a pure function (`RecalculateAuras` style) reading pre-computed
neighbor values. The engine's existing modifier chain (`createModifierChain`,
`createAdditiveModifier`, `createMultiplicativeModifier`) composes per-cell
synergy bonuses into output formulas. Zero new engine primitives are required
for v1.

The Phase 3b candidate shape (from `placement-adjacency.md` § Engine Posture):

```ts
// Phase 3b candidate — do not implement until OL-568 decision
createGridSystem({
  dimensions: [rows, cols],
  neighborhoodRadius: 1,  // 1 = Moore 8-cell
  synergyPredicate: (a: Cell, b: Cell) => /* shape-adjacency check */,
  synergyBonus: (matchCount: number) => /* magnitude formula */,
  onPlacementChange: () => recalculate(),
})
```

Packer games would pass a `shape-adjacency-synergy` predicate; Auto-battler
games would pass a `unit-trait-synergy` predicate. The shared
`grid-placement-auto-resolve` substrate is the investigation target for OL-568.

**Engine primitives this archetype uses (v1, game-side grid):**

| Layer | Primitive | Role |
|---|---|---|
| core | `createResource` | Currency for items/components; gem mana economy |
| core | `createModifierChain` | Compose per-cell synergy bonuses into output formula |
| core | `createAdditiveModifier` | Per-neighbor bonus contribution |
| core | `createMultiplicativeModifier` | Multiplicative stacking for adjacent bonuses |
| core | `createSequencer` | Wave/round pacing (enemy waves, round timer) |
| core | `persistent` | Grid state serialization — occupant identity + position |
| systems | `createPurchasable` | Gem/item acquisition from shop or drop |
| systems | `createPurchasableCategory` | Item/gem categories |
| systems | `createReset` | Round reset (Backpack Battles variant); prestige |
| systems | `createRetentionPolicy` | What carries across round resets |
| systems | `createZoneSystem` | Stage/map progression (GemCraft campaign structure) |
| systems | `createAchievement` | Per-build achievements (max synergy, streak, perfect clear) |
| harness | `runHeadless` | Beat-timing sim assertions |
| harness | `runMatrix` | Probe-range robustness assertions |

`createSpatialGrid` is used in Director for the simulation grid. Packer's
inventory/gem grid is consumer-side in v1 (a plain 2D array) because
`createSpatialGrid` is an omniscient-view spatial primitive for large
simulations, not the small-grid inventory shape that Packer needs. If Phase 3b
produces a `createGridSystem`, that is the correct target for Packer.

**Explicitly not used:**

- `createSpatialGrid` — Packer's grid is an inventory/crafting surface (small,
  interactive, serialized) not a simulation grid. `createSpatialGrid` is the
  Director simulation primitive; Packer's grid lives consumer-side until
  OL-568 decides otherwise.
- `createLoop` — round pacing in Packer comes from `createSequencer` (wave
  sequences) and consumer-side round state, not from the scheduler primitive.

---

## Open questions for the archetype doc

The following need a call during the `archetypes/packer.md` drafting session:

1. **Hybrid-archetype notation.** GemCraft/Gem TD are Defender x Packer
   hybrids. The template's Exemplars line requires corpus game citations.
   How should hybrid exemplars be cited — as Packer exemplars with a note, or
   excluded in favor of pure-form exemplars (Backpack Battles)? The archetype
   doc should establish a pattern for hybrid citations that the other Wave-2
   docs can follow.

2. **`PackerArchetypeVars` shape.** Does the archetype distinguish the two
   sub-types (Defender-hybrid vs. pure inventory-packing) via ArchetypeVars,
   or are they covered by a single schema with a feature flag? A fork that
   adds Loop 9 (Enemy Scaling on top of Defender substrate) is architecturally
   different from one that doesn't. Template rule: a fork that edits
   ArchetypeVars is explicitly forking the skeleton.

3. **`PackerBalanceVars` enumeration.** Known levers: grid size (rows x cols),
   item pool size (how many distinct item types), per-neighbor bonus magnitude
   (base + stacking rule), max neighbors counted (cap for diminishing returns),
   crafting component costs, round pacing (if applicable), wave difficulty
   scaling (if Defender-hybrid). Pull from canonical GemCraft or Backpack
   Battles content structure.

4. **Physics-pachinko boundary.** Ballionaire uses ball-placement with bounce
   adjacency. Crush the Castle is physics-projectile packing. How much of the
   physics-spatial design space falls under Packer vs. being a separate
   archetype? The archetype doc should call the boundary explicitly.

5. **The Bazaar crossover.** The Bazaar (Steam 2025) is deckbuilder-adjacent
   inventory with item synergy. Does it sit on the Packer/Auto-battler
   boundary, or is it its own shape? The archetype doc should document where
   it lands.

6. **LIBRARY.md pattern cross-reference check.** The template validator
   requires every cited pattern to resolve in LIBRARY.md. Placement-Adjacency
   (P-PADJ) is filed but may not yet appear in the engine mapping table.
   Confirm before submitting the archetype doc.

7. **Novel-patterns cluster alignment.** Check
   `open-loop-research/reports/novel-patterns/novel-patterns-synthesis-v4.md`
   for a cluster covering spatial-optimization + crafting + auto-resolve. Cite
   if present; file a follow-up ticket if absent.

---

## Cross-references

- **Pattern (Placement-Adjacency):**
  `open-loop-research/patterns/tier-4-specialized/placement-adjacency.md`
  — the LIBRARY-canonical pattern for the spatial mechanic this archetype is
  built around. Read this before drafting § 2 of the archetype doc.

- **Taxonomy § 2E:** Packer definition, loop composition, spatial axis, engine
  posture, and lineage. Primary evidence source for this prework.

- **Taxonomy § 3A (Packer vs Auto-battler):** Shared substrate, distinct
  archetypes. The separation argument. Cross-reference this in the archetype
  doc's § 2 pattern composition as the reason Auto-battler is not subsumed.

- **Taxonomy § 4 (GemCraft 18-year lineage):** Narrative arc for the § 1
  player-experience prose in the archetype doc.

- **Scratch rollup § Packer:**
  `open-loop-research/inbox/arcade-market-archetypes-scratch.md` line ~308.
  Per-corpus counts, loop composition, and confidence rating.

- **Scratch § Decision 1:**
  `open-loop-research/inbox/arcade-market-archetypes-scratch.md` line ~365.
  The collapse-vs-separate decision with evidence for and against.

- **Sibling prework:** `archetypes/_auto-battler-prework.md` — the
  shared-substrate-not-collapsible sibling. The archetype doc should
  cross-reference it explicitly in the "does not collapse to" OL-537 overlap
  statement (template § 2).

- **Engine INDEX:**
  `open-loop-engine/docs/api/INDEX.md` — validate every primitive named in §
  3 of the archetype doc before submitting.

---

## Next-session instructions

1. Read this file. Read `archetypes/_template.md` and `archetypes/producer.md`
   as format reference.
2. Read `archetypes/_auto-battler-prework.md` to understand the
   shared-substrate sibling — the two docs will cross-reference each other.
3. Read `open-loop-research/patterns/tier-4-specialized/placement-adjacency.md`
   § Variations for the concrete sub-type descriptions to cite in § 2.
4. Check `open-loop-research/reports/novel-patterns/novel-patterns-synthesis-v4.md`
   for a relevant cluster (resolve open question #7).
5. Draft `archetypes/packer.md` against the template:
   - § 1 (Player experience) — draw from the MDA section and the 18-year
     lineage narrative in taxonomy § 4.
   - § 2 (Pattern composition) — cite Placement-Adjacency as required pattern;
     cross-reference Auto-battler as the shared-substrate-not-collapsible
     sibling per taxonomy § 3A.
   - § 3 (Engine surface) — use the primitives table above; validate every
     name in INDEX.md.
   - § 4 (Beat map) — distinguish the Defender-hybrid arc (GemCraft shape:
     wave escalation, gem crafting, Defender progression) from the pure-Packer
     arc (Backpack Battles shape: run-based drops, round resets, inventory
     optimization).
   - § 5 (Vars schema) — address open question #2 (hybrid vs. pure sub-type
     in ArchetypeVars).
   - § 6 (Balance probes) — spatial-synergy magnitude is the
     archetype-specific probe axis; per-neighbor bonus ±20% is the primary
     knob.
   - § 9 (Predicted engine gaps) — grid primitive absence is the primary gap;
     note OL-568 as the resolution ticket.
   - § 10 (Themes) — both gem-crafting-on-Defender-substrate and pure
     inventory-packing must be representable; 3–5 themes minimum.
6. **Phase 3b dependency:** The archetype doc notes the `grid-placement`
   primitive as a predicted engine gap (§ 9) pointing to OL-568. The doc is
   not blocked on OL-568 landing, but should be updated once that decision is
   made.
7. Once `archetypes/packer.md` is reviewed and approved, **delete this file**.

---

## References

- Taxonomy: `open-loop-research/reports/studies/arcade-market-archetypes/arcade-market-archetypes-taxonomy.md` § 2E, § 3A, § 4
- Scratch: `open-loop-research/inbox/arcade-market-archetypes-scratch.md` § Packer (line ~308) + § Decision 1 (line ~365)
- Pattern: `open-loop-research/patterns/tier-4-specialized/placement-adjacency.md`
- Sibling: `archetypes/_auto-battler-prework.md`
- Archetype template: `archetypes/_template.md`
- Format reference: `archetypes/producer.md`
- Engine API index: `open-loop-engine/docs/api/INDEX.md`

---

## UI prescription hook (OL-582)

The archetype-doc drafting session must fill § 9 UI prescription against `archetypes/_template.md`. Prescriptions must cite one of three data artifacts under `open-loop-research/practical/ui-ux/`, or carry a `` `declared invention` `` tag with rationale.

**Data artifacts:**

- `layout-audit-2026.md` — per-game classification rows (69 games; shell, nav pattern, notable widgets, form-factor intent).
- `subgenre-shell-mapping-2026.md` — sub-genre × shell majority cross-tab. Only `incremental-math` has a strong single-shell majority; every other mid-size sub-genre offers a primary + secondary shell pair.
- `widget-vocabulary.md` — 10 ARIA-aligned widgets (lift targets for reka-ui primitives in `@/lib`) + 9 domain widgets (per-fork implementation; no pre-abstraction per OL-273 Phase 2 lift-first policy).

**Sub-genre mapping for Packer:** Packer shares `grid-placement-auto-resolve` substrate with Auto-battler (pair-review per OL-537 Wave-2 comment). The audit corpus has no packer / placement-puzzle row. Primary shell is `` `declared invention` ``: grid-placement with resolve-phase toggle. Closest partial-corpus references are Industry Idle (grid factory with hex/square tiles + bottom resource bar) and Cavernous II (grid map with zone tiles) — both are spatial-canvas precedents for the grid widget, not the full packer shell.

**Shell name resolution.** `{{ShellName}}` must resolve to a file in `open-loop-starter/src/lib/shells/*.vue`. Starter ships five of the audit's six shells (`MultiColumnShell`, `SidebarMainShell`, `SingleColumnShell`, `TabsBarShell`, `ThreePanelShell`); `free-form` shell shapes are always `declared invention` against starter today.

**Form-factor intent.** Pointer-primary desktop by default; touch-primary mobile variants are `` `declared invention` ``.

**Reference retrofits.** `archetypes/producer.md`, `archetypes/looper.md`, `archetypes/scaler.md` show the § 9 shape. Pair-review reference: `archetypes/_auto-battler-prework.md` shares the `grid-placement-auto-resolve` substrate.
