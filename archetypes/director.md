# Archetype: Director

> **One-line identity:** Placement-Adjacency + Routing-Traversal spatial arena + declarative player-as-director over an autonomous multi-agent simulation + round-scoped retention — the observe-and-steer incremental.
>
> **Status:** `candidate`

**Exemplars (validation, not clone targets):** `declared invention` — no direct corpus analogues for the *"declarative goals + autonomous multi-agent sim + omniscient observer-and-steerer"* composition. Validation tradition: Warcraft III / StarCraft II melee-map design (main + natural + third + contested middle + chokepoints — the vocabulary Director's map topology borrows), *not* as clone targets. The composition emerged bottom-up from OL-504 (`src/modules/mods/creep-vs-creep/`), the first consumer; canonical status upgrades once a second consumer proves the composition viable.

---

## 1. Player experience

Director is the archetype where *you don't play the game — you tune it and watch it play itself*. Four factions spread across a symmetric map under fully autonomous AI; the player is one of them in name only. What the player actually does is occupy a handful of goal slots with strategic intents (*"claim the north hotspot," "defend the east sector," "pressure the blue faction"*) and spend meta-currency between rounds on permanent upgrades. Everything else happens on its own. Tendrils creep, frontiers clash, hotspots flip, the round clock runs down. When it ends, the map resets and the upgrade tree advances.

A thirty-minute session is four to five rounds — each round a ~five-minute sprint of *read the board, adjust goals, watch it play out, tally the meta-currency, spend, reset*. The pull isn't "I am winning a fight" — it's *"I am learning a system"*. Round one feels chaotic; round eight the player can predict where their frontier will stall and reshape their goal stack to compensate; round twenty, they're tuning a deterministic-enough machine that their upgrade priority decides the outcome. The arc closure beat — a full 5-slot toolkit — arrives around the two-hour mark, and the game's content at that point is the diff between the player's first and last rounds: the same simulation, twenty rounds of accumulated direction.

---

## 2. Pattern composition

**Required patterns:**

- [Placement-Adjacency](../../open-loop-research/patterns/tier-4-specialized/placement-adjacency.md) — position-as-neighbor-gate. Slime-mold spread depends on adjacency: cells claim from owned neighbours, combat resolves at the frontier, flow-field reinforcement propagates between contiguous owned cells.
- [Routing-Traversal](../../open-loop-research/patterns/tier-4-specialized/routing-traversal.md) — position-as-path-gate. The map's chokepoint topology and flow-field supply paths make routing choice load-bearing: attack a choke, downstream tendril starves, enemy defense drops. Both Placement-Adjacency and Routing-Traversal sub-clusters are engaged simultaneously — Director is a 7b-α + 7b-β composition, not one or the other.
- [Activity Systems](../../open-loop-research/patterns/tier-0-universal/activity-systems/) — present at the meta layer only. Hotspot producers run a continuous-production activity; the per-round progression *is* the spread sim, not a player-operated action.
- [Progression Systems](../../open-loop-research/patterns/tier-0-universal/progression-systems/) — meta-arc progression gates: slot-capacity ratchet, upgrade levels, round-count milestones.
- [Achievement Systems](../../open-loop-research/patterns/tier-1-foundation/achievement-systems/) — territorial milestone category (reach N% territory, complete N rounds, win with personality X), mechanical multipliers into the meta-upgrade economy.

**Cross-pattern properties engaged:**

- [Modifier Chains](../../open-loop-research/patterns/cross-pattern-properties/modifier-chains.md) — per-faction yield/spread/attack/defense chains; goal-system binds multipliers into the target chain when a goal is active; meta-upgrades apply (1+perLevel)^amount grants.
- [Quantity Tracking](../../open-loop-research/patterns/cross-pattern-properties/quantity-tracking.md) — cell-count ownership drives territorial score; hotspot-ownership count drives meta-currency; per-round round-count drives arc progression.
- [Unlock Requirements](../../open-loop-research/patterns/cross-pattern-properties/unlock-requirements.md) — meta-upgrade level gates, slot-capacity gates, round-count gates.
- [Automation](../../open-loop-research/patterns/cross-pattern-properties/automation.md) — Director is *maximally automated by construction*. All four factions run on personality-weighted goal-pickers. The player's role is the declarative layer on top; automation is the skeleton, not a tier unlock.
- [Scaling Formulas](../../open-loop-research/patterns/cross-pattern-properties/scaling-formulas.md) — upgrade cost curves are exponential; meta-upgrade cost scaling is multiplicative per level.

**Optional modifiers (fork may add):**

- **Fog of war** — Director ships *omniscient* (observer-and-steerer over a fully-visible sim). A fork that adds fog of war leans toward Explorer territory and should think about whether it's still Director or becoming a hybrid.
- **Per-unit combat** — Director cuts all unit-micro; the cell *is* the unit. A fork that adds individual units is building RTS, not Director.
- **Scripted opponent personalities** — replace weight-preset AI with code-level strategy scripts. Adds Scripter cluster-#1 flavour; worth splitting out if the scripting becomes substantial.
- **Prestige layer on top** — the round-scoped retention is already a micro-prestige; a fork could wrap it in a second meta-prestige layer for long-tail play.

**Novel-patterns cluster alignment:**

- **Cluster #7b (Spatial-as-mechanic)** — Director's spatial layer sits squarely in 7b, engaging both sub-patterns (7b-α Placement-Adjacency + 7b-β Routing-Traversal). This cluster names Director's spatial substrate cleanly.
- **Cluster #2 (Mastery & Specialisation Architecture)** — the meta-arc is a mastery layer: players specialise in yield / spread / attack / defense / slot-capacity upgrade paths, and the identity emerges across ~20 rounds.
- **Cluster #8 (Automation & Progression Gradients)** — Director is extreme on this axis. The sim runs fully autonomously from round one; the progression gradient is *how much declarative steering does the player add*.
- **Gap worth flagging:** no v4 cluster names the *declarative-goal + autonomous-multi-agent-sim + observe-and-steer* meta-stance as a coherent thing. Cluster 7b covers the spatial substrate; cluster 8 covers automation; but the meta-stance of "player sets intents, watches faction-level sim resolve them" is not a clustered concept in v4. If a second Director consumer emerges, this is a candidate for a v5 cluster addition. Filed as research follow-up.

---

## 3. Engine surface

Director uses the widest engine surface of any archetype — ~17 primitives, the "~70% of engine surface" claim from OL-504. Wide-surface is the archetype's stress axis: if the engine feels like it's buckling under Director, primitives need ergonomic work.

| Layer | Primitive | Role in this archetype |
|-------|-----------|------------------------|
| core | `createResource` | One meta-currency (persistent) + one per-faction essence (round-scoped) + four faction goal-resources. |
| core | `createSpatialGrid` | The arena itself. Per-cell ownership + terrain + HP + reservoir + hotspot metadata. Structure-level snapshot persistence (one `SpatialGridSnapshot` per save, not per-cell `persistent()`). |
| core | `createModifierChain` | Per-faction yield/spread/attack/defense chains. Goal-system binds multipliers into the active goal's target chain; meta-upgrades apply cross-round multipliers. |
| core | `createMultiplicativeModifier` | Essence-upgrade multipliers, meta-upgrade multipliers, per-personality contribution. |
| core | `persistent` | Goal slots, meta-currency, meta-upgrade levels, round count. |
| core | `withPersistentContext` | Module-scoped persistence context (installed inside `install(ctx)`). |
| core | `runHeadless` | Beat-timing sim tests and per-round Workbench probes. |
| systems | `createProducerCategory` | Hotspot producers — one producer per hotspot id, yield into the owning faction's essence. |
| systems | `createPurchasableCategory` | Per-faction essence-upgrade tree (yield / spread / attack / defense) + meta-upgrade tree (yield / spread / attack / defense / slot-capacity). |
| systems | `createScalingPurchasable` | Per-level exponential cost scaling on both upgrade trees. |
| systems | `createSlot` | Goal slots — capacity 1..5, each slot holds a goal id; active goals bind multipliers into target chains via `chain.bind`. |
| systems | `createAchievementCategory` | Territorial milestones + round-count milestones + personality-win milestones. |
| systems | `createAchievement` | Per-achievement definition within the category. |
| systems | `createRetentionPolicy` | Round-scoped retention: meta-currency + meta-upgrade levels + goal slots + round count persist; everything else (grid state, essence, active goals, round clock) resets. |
| systems | `createReset` | Round reset coordination — fires the retention policy + reseeds the grid from the declarative map-gen + rewires goal-system bindings. |
| systems | `createLoop` | Multi-loop coordination: spread tick (~1 Hz), combat tick (~1 Hz), AI goal-picker (~0.25 Hz), resource production (standard tick). The "engine-gap: createLoop vs. accumulator-over-onTick" tension flagged in § 10. |
| harness | `runMatrix` | Outcome-distribution probes across AI-personality permutations × seeds. `runMatrix` is the primary balance tool for Director — cost-curve probes used by Producer/Scaler don't fit a multi-agent sim, and `runMatrix`'s cartesian cells × seeds product is exactly the robustness-probe shape. |

Also cited as contextual helpers: `random` (primitives layer, faction-scoped RNG for deterministic seeding across rounds within a save).

**Engine systems explicitly not used (required):**

- `createSequencer` — Director has no action queue. Player agency is declarative (goal slots), not sequenced. If you reach for a sequencer, you're building Looper.
- `createSkillCategory` — no skill-level gates. Upgrade levels are purchasable-resource-gated, not skill-gated.
- `createPersistentEffectSystem` — no duration-bounded buffs. Meta-upgrades are permanent, essence-upgrades round-scoped via retention — neither needs duration tracking.
- `createChallengeCategory` — no opt-in nerfs per round. Round variance comes from AI-personality permutations + seed, not from challenge-modifier overlays.
- `createCumulativeConversion` — no prestige-currency logarithmic conversion. Meta-currency accrues linearly from cell + hotspot ownership; the ratchet is on the upgrade tree, not on the currency formula.
- `createTieredAchievement` — achievements are flat-category, not tier-ladder. Director's milestones are binary (reached territory threshold, completed N rounds), not graded.
- `createSpatialGraph` / `scope-stack` — considered and deferred. An overlay graph (hotspots + own-mass-cluster centroids as nodes, supply relationships as edges, recomputed at AI-picker cadence) would give explicit "cut off from supply" semantics on top of the grid's drift-based mass decay. Director v1 ships grid-only; graph layer graduates to a director follow-up only if playtest shows drift-based starvation reads mushy. See § 10.

Every primitive named above resolves in `open-loop-engine/docs/api/INDEX.md`.

**Primary stress axes:**

1. **Engine-surface breadth ergonomics.** Director imports ~17 primitives from every engine layer. The test is whether writing a Director mod feels coherent or like a catalog-walk. Verbose category-option blocks, scattered `withPersistentContext` invocations, or forced inter-system plumbing would all surface here — and would each warrant a helper before the archetype graduates to `canonical`.
2. **Structure-level persistence under SpatialGrid.** One `SpatialGridSnapshot` per save instead of 10,000 per-cell `persistent()` refs. Validates OL-493's hook. The stress test is: save, kill the tab, reload mid-round, resume. If the snapshot round-trips HP (`DecimalSource` → string → `Decimal`) and reservoir correctly, this axis is clean.
3. **Multi-loop coordination.** Four loops at different frequencies (1 Hz spread, 1 Hz combat, 0.25 Hz AI, standard tick production). Determinism across speed multipliers (2×, 4×, 8×) requires the loop scheduler to stay in phase; see OL-466 precedent for tick-drift under variable dt.
4. **Outcome-distribution balance, not cost-curve balance.** Producer/Scaler probes assert "beat N lands at simulation-time T ± tolerance" off a single seeded run. Director cannot — the outcome is a distribution. `runMatrix` over AI-personality permutations × seeds yields a histogram; the balance probe asserts *distribution properties* (mean win rate, stddev, percentile bounds). First archetype to force this idiom upstream.

---

## 4. Beat map

_Stripped pending validator (OL-809) and Pass-1 reground (OL-810). Confident numbers here were unsourced; restore via citations or `aspirational — pending implementation` tag once those subtasks land._

---

## 5. Data shape

_Stripped pending validator (OL-809) and Pass-1 reground (OL-810). Confident numbers here were unsourced; restore via citations or `aspirational — pending implementation` tag once those subtasks land._

---

## 6. Balance probes

_Stripped pending validator (OL-809) and Pass-1 reground (OL-810). Confident numbers here were unsourced; restore via citations or `aspirational — pending implementation` tag once those subtasks land._

---

## 7. Sim assertions

_Stripped pending validator (OL-809) and Pass-1 reground (OL-810). Confident numbers here were unsourced; restore via citations or `aspirational — pending implementation` tag once those subtasks land._

---

## 8. Content sketch

- **Resources:** 1 meta-currency (persistent) + 4 faction essences (round-scoped) + 4 faction goal-resources. Plus per-cell `hp` + `reservoir` inside the SpatialGrid snapshot.
- **Arena:** 1 × 100×100 SpatialGrid with terrain palette `rock | open | spawn | hotspot`. Generated from seeded 4-fold rotational symmetry (see `MAP.md` in each consumer).
- **Producers / Hotspots:** 13 per round — 4 near (per-faction-owned at gen time, low yield), 4 natural (neutral, medium yield), 4 contested (neutral, high yield, at radial midpoints), 1 center (neutral, highest yield, map centre).
- **Upgrades / Purchasables:**
  - 4 per-faction essence upgrades (yield / spread / attack / defense), linear per-level, 10 levels each — 16 round-scoped purchasables × 4 factions.
  - 5 meta-upgrades (yield / spread / attack / defense / slot-capacity), permanent across rounds, 20 levels for the first four / 4 levels for slot-capacity — 5 persistent purchasables.
- **Goals:** 3 goal types (`claim:hotspot-*`, `defend:sector-*`, `pressure:faction-*`) × ~15 targets = ~45 concrete goal ids. Goal slots capacity 1–5 via ratchet.
- **AI personalities:** 4 presets (expansionist / defender / pressurist / greedy). Non-player factions default to expansionist / defender / pressurist; fourth is the player.
- **Achievements:** ~20 — 10 territorial milestones (reach N% territory in a round, win N rounds, hold all contested hotspots simultaneously), 5 meta-arc milestones (purchase all upgrade paths, reach slot capacity 5, complete arc under N rounds), 5 hidden (win without losing a round, win all four personality permutations, fully-dominate with one goal slot, …).
- **Progression gates:** meta-upgrade levels gate next-level costs (scaling); slot-capacity ratchet gates the goal-system's slot count; round-count milestones surface achievement content.

**Density target:** every beat in § 4 maps to at least one content entry. Beat 1 → round lifecycle + end-of-round panel; beat 2 → meta-upgrade tree first purchase; beat 3 → territorial score computation at round end; beat 4 → slot-capacity meta-upgrade level 1 + second goal slot; beat 5 → domination achievement + visual flourish; beat 6 → one upgrade-path visibly ahead; beat 7 → final slot + end-of-arc event.

---

## 9. UI prescription

- **Primary shell:** `` `declared invention` `` — adversarial-arena layout. No sub-genre in `subgenre-shell-mapping-2026.md` maps directly (Director emerged bottom-up from OL-504 and lacks a corpus sub-genre assignment); reference the LIBRARY Placement-Adjacency + Routing-Traversal cluster substrate (OL-562 Phase 2 v4 synthesis). Rendering goes through `src/ui/components/spatial/DomGrid.vue`, which owns the arena surface end-to-end. Arena occupies the centre of the layout; HUD (goal slots, chain readout, round clock, meta-currency) orbits it. No row in `layout-audit-2026.md` carries an adversarial-arena commitment — this is declared invention pending second-consumer validation.
- **Secondary shell:** `MultiColumnShell` — `` `declared invention` `` adapter for forks that want to slot Director into an existing starter shell rather than invent chrome. Main column holds `DomGrid.vue`; side columns hold HUD fragments (goal-slot editor left, chain readout / meta-currency right). Cites `subgenre-shell-mapping-2026.md` by negative precedent (no adversarial-arena row). Use when a fork wants the declared-invention-to-starter-shell glide path; raw `DomGrid.vue` + flex chrome is still the primary.
- **Form-factor intent:** `desktop` — `` `declared invention` ``. The audit's ~32% mobile-aware rows cover producer / looper / scaler sub-genres; no mobile-aware row in `layout-audit-2026.md` carries a spatial-arena commitment. Pointer-primary interaction (observing the arena, occasionally repositioning goal slots) has no touch-first corpus precedent; Director does not claim mobile-first.
- **ARIA-aligned widgets (lift targets):**
  - `Tooltip` — cell tooltips on arena hover (terrain, owner, HP, reservoir, flow-field intensity), upgrade-row descriptions, goal-target explanations. Cites `widget-vocabulary.md` Layer 1 (frequency 5).
  - `Dialog` — meta-upgrade tree modal, end-of-round panel, achievement grid, settings. Cites `widget-vocabulary.md` Layer 1 (frequency 6).
  - `Progress` — round clock, hotspot reservoir gauges, meta-upgrade level indicators. Cites `widget-vocabulary.md` Layer 1 (highest frequency, 12).
  - `Toast` — round-end banners, achievement-unlock notifications, meta-currency-awarded flashes. Cites `widget-vocabulary.md` Layer 1 (frequency 3).
  - `Tabs` — meta-upgrade-tree tab (yield / spread / attack / defense / slot-capacity) when it outgrows a vertical list. Cites `widget-vocabulary.md` Layer 1.

  Lift from `@/lib` / reka-ui primitives; forks do not reimplement focus, portal, or a11y.
- **Domain widgets (per-fork implementation):**
  - arena canvas — the core archetype widget. Event-driven shallow-ref-versioned `DomGrid.vue` (extracted in OL-512). `` `declared invention` `` per `widget-vocabulary.md` — arena-as-widget has no Layer-1 or Layer-2 row in the corpus and is the most Director-specific widget.
  - goal-slot editor — N slots (capacity 1–5), each holds a goal id. Drag-drop reassignment or dropdown select per fork's taste. `widget-vocabulary.md` Layer 2 (frequency low; action-queue adjacent but not identical — slots are cognitive not sequential).
  - chain readout — per-faction yield/spread/attack/defense chain expansion with named factor sources. Cites `widget-vocabulary.md` Layer 2 (frequency 6; stat-panel analog).
  - upgrade row — meta-upgrade + essence-upgrade rows with icon, level, next cost, per-level effect. Cites `widget-vocabulary.md` Layer 2 (frequency 4; action-card analog).
  - faction-legend strip — 4 faction chips with colour, name, territory share, essence balance. `` `declared invention` `` adapter over `widget-vocabulary.md` Layer 2 stat-panel.
- **Layout detail:** centre holds `DomGrid.vue` at its native aspect (the 100×100 arena); top strip holds round clock + faction-legend; left column holds goal-slot editor + personality indicators; right column holds chain readout + essence balances + meta-currency. Modal (`Dialog`) hosts end-of-round panel + meta-upgrade tree + achievement grid.
- **Flow visualization:** supply Dijkstra-gradient (`-∇d`) + mass intensity render as a canvas overlay layered on top of `DomGrid.vue`, not through DOM cells — 10k cells × per-cell arrow glyphs would bottleneck the DomGrid entry-array rebuild path. The canvas layer redraws on supply-field recompute (event-driven from ownership change), not per tick. The DOM layer keeps interaction (hover, tooltip hit-testing, ownership visual); canvas carries flow-only visuals. Theme-level toggle: Creep and Ecology themes render flowlines; Baronies and Corporate may skip the overlay and read mass-intensity only (see § 11).
- **Nav pattern:** none at the shell level — Director is single-screen by design. Tabs inside the meta-upgrade modal are widget-internal.
- **Declared-invention notes:** the archetype is declared-invention in three dimensions — primary shell (adversarial-arena has no corpus row), form-factor intent (no mobile-aware arena row in the audit), and arena-canvas widget (no Layer-1 / Layer-2 row). Each of the three is independent-enough to upgrade to corpus-backed on its own once a second Director consumer lands an analyses/complete row. The LIBRARY cluster 7b-α + 7b-β filings are the closest substrate citation.

---

## 10. Predicted engine gaps

Director is the widest-surface archetype, and it surfaces overlapping gaps from every layer. Severity reflects how many archetypes would benefit — a gap that affects only Director is Medium; a cross-archetype gap is High.

| Gap | Severity | Notes |
|-----|----------|-------|
| `createFlowField` / `createInfluenceField` primitives | **High** | Promoted from Medium after cross-consumer convergence. Borglike already ships both shapes consumer-side: `src/game/bot/flow.ts` (multi-source navigation flow) + `src/game/bot/danger.ts` (threat-influence map). Director needs matching shapes for supply-Dijkstra-gradient + scalar mass-density. Defender (enemy pathing) and Survivor (threat density) are strong N=3/N=4 candidates from `_identity.md`. Filed as a combined entry in `open-loop-engine/docs/candidate-primitives.md` — graduation trigger met at N=2 (Borglike + Director). Blocks § 5 numeric defaults. Next step: research ticket on whether flow-field and influence-field unify under one primitive with modes or split. |
| Per-edge conductance (Tero/Physarum) | **Rejected** | Biology-accurate tube-adaptation model (per-edge `D_ij` adapting under Poiseuille flow). 4× storage, dual-update (pressure solve + conductance adaptation), low game-legibility. Rejected as over-engineered — Director's Dijkstra-gradient + scalar mass + nonlinear permeability achieves the same vein-structure read at a quarter the cost. Recorded here so future spatial archetypes don't relitigate. |
| `SpatialGraph`-backed supply-topology (Director follow-up) | Low | Grid + flow field gives drift-based starvation (cut-off cells' mass decays). An overlay graph — hotspots + own-mass-cluster centroids as nodes, supply relationships as edges, recomputed at AI-picker cadence (0.25 Hz) — would provide explicit graph-cut semantics for "cut off from supply" reads. `createSpatialGraph` already exists in `core/spatial/`; cost is small. Deferred to wait for playtest signal that drift-based starvation reads mushy. Graduate to a director ticket if the signal arrives. |
| `createLoop` vs. accumulator-over-onTick | High | OL-506's `spread.ts` header comment: the current `createLoop` is a constrained-replay primitive, not a scheduler. Director wants ~1 Hz / ~0.25 Hz / standard-tick coordination *scheduled against sim time*, and the accumulator-over-onTick workaround gets re-derived consumer-side. Looper hits this; Director amplifies it; Interlocker will too. Engine ticket candidate. |
| `runMatrix` percentile/histogram aggregates | Medium | Director's outcome-distribution probes want not only mean / stddev but also p5 / p50 / p95 percentiles across the seed batch. Currently `aggregateCell` returns mean/stddev only. A harness-side analyzer enhancement (not an engine primitive), but worth scoping before it blocks outcome-distribution work in other archetypes. |
| DomGrid flow-version split | Low (mitigated) | Original concern: `DomGrid.vue` rebuilds entry array per cell-change event bucket; flow-field visuals at 1 Hz would thrash. § 9's canvas-overlay decision supersedes: flow renders outside DomGrid, so DomGrid rebuilds only on ownership/HP changes. Original `flowVersion` shallow-ref mitigation remains available if flow ever re-enters DomGrid. |
| `SpatialGrid.restore()` event emission | Medium | `restore()` deliberately doesn't emit events (design choice); consumers handle this via `v-if` key bump on the DomGrid at round-reset. Worth explicit docs, and worth a helper that wraps the common "reset → v-if key bump → rebind" pattern. |
| Goal-system binding ergonomics | Medium | Director binds up to 5 simultaneous goal multipliers into per-faction chains via `createSlot` + `chain.bind`. The wiring is correct but verbose; a `createGoalSlot({ targetChain, computeMultiplier })` helper could save every future Director consumer from re-deriving it. Graduate after second consumer. |
| Per-faction modifier-chain registry | Medium | Director wires 16 chains (4 factions × 4 axes). No single primitive groups "a faction's resources + chains + reset" today; each is wired individually. A `createFaction({ id, chainAxes })` facade could land here after a second consumer proves the shape. |
| Seeded deterministic map-gen helper | Low | Director's map-gen pipeline is consumer-side code (`map.ts` in creep-vs-creep). The pattern — vault templates + symmetry rotation + procedural rock scatter + connectivity validation — is not Director-specific; any spatial archetype with hand-authored features + procedural fill reaches for the same shape. File only if a second consumer copies the structure verbatim. |

---

## 11. Themes

### Theme A — Creep vs Creep

- **Hook:** Four slime molds over a petri dish. Tendrils creep, filaments thicken into mat, veins pulse with flow, thin filaments retract when cut off from supply. Baseline theme inherited from OL-504.
- **Resource mapping:** meta-currency = Command; essences = [Crimson, Azure, Verdant, Sulfur] Essence; factions = four named slime-mold strains; hotspots = nutrient pools; tendrils = spread.
- **Narrative framing:** none — the petri dish is the content.

### Theme B — Medieval Baronies

- **Hook:** Four baronies competing for influence over a contested duchy. Tendrils are banner spread; hotspots are villages; frontiers are the edges where two baronies' banners touch.
- **Resource mapping:** meta-currency = Prestige; essences = [House Crimson, House Azure, House Verdant, House Sulfur] coin; hotspots = villages; tendrils = banner-influence.
- **Narrative framing:** light — end-of-arc flavour event reveals the duchy unified under the player's house.

### Theme C — Corporate Takeover

- **Hook:** Four megacorps move into previously-public markets. Spread = market-share; hotspots = contested cities; flow = supply-chain corridors; upgrades are acquisitions and lobbying campaigns.
- **Resource mapping:** meta-currency = Influence; essences = [Red, Azure, Verdant, Sulfur] Capital; hotspots = cities; tendrils = market-share.
- **Narrative framing:** medium — achievements frame as cultural wins ("captured the capital's entertainment district"); arc closure is a monopolistic-dominance banner.

### Theme D — Ecological Succession

- **Hook:** Four pioneer species colonise burned land after a wildfire. Spread is root-network extension; hotspots are water sources; flow is nutrient transport; frontiers are the edges where two species' root systems meet.
- **Resource mapping:** meta-currency = Biomass; essences = [Red, Azure, Verdant, Sulfur] Photosynthate; hotspots = water-pools; tendrils = root-networks.
- **Narrative framing:** medium — arc closure shows the burned-land's post-succession canopy.

---

## Vocabulary anchors

Every name cited in this doc must resolve to one of:

- **Pattern names** → `open-loop-research/LIBRARY.md` + linked pattern files
- **Cross-pattern properties** → `open-loop-research/patterns/cross-pattern-properties/*.md`
- **Novel-patterns clusters** → `open-loop-research/reports/novel-patterns/novel-patterns-synthesis-v4.md`
- **Engine primitives** → `open-loop-engine/docs/api/INDEX.md` + the four `*.api.md` files
- **Corpus games** → `open-loop-research/analyses/complete/*-analysis.md` (Director carries `declared invention` on the Exemplars line — no corpus analogues)
- **Layout shells** → `open-loop-starter/src/lib/shells/` (Director's primary shell is `declared invention` — adversarial-arena layout; secondary `MultiColumnShell` carries `declared invention` as an adapter)
- **Live consumer (engine-usage grounding)** → *pending reinstantiation*. Theme A (Creep vs Creep) previously shipped at `/work/studio/open-loop-starter/src/modules/mods/creep-vs-creep/` as OL-504's output — the consumer demonstrating SpatialGrid + producer + slot + retention + chain-bind goal binding in one composition. Code deleted; archetype doc retained as the design target for the rebuild. Rebuilding the consumer reinstates empirical grounding for the `candidate` status.
