# Archetype: Explorer

> **One-line identity:** Spatial zone-as-gameplay + fog-of-war Discovery + item-identity Inventory over a resource-scarce action substrate — the map-IS-the-game incremental.
>
> **Status:** `candidate`

**Exemplars (validation, not clone targets):** [Level 13](../../open-loop-research/analyses/complete/level13-analysis.md), [Cavernous II](../../open-loop-research/analyses/complete/cavernous-ii-analysis.md), [Trimps](../../open-loop-research/analyses/complete/trimps-analysis.md) (spatial-traversal slice — zone progression + map-exploration sub-zones, not the Portal/Helium prestige axis).

---

## 1. Player experience

Explorer is the archetype where *the map is the content*. You start in one sector with a fog of unknown around you, spend a stamina-like action resource to scout the next tile, and watch the world literally enlarge as you move. The first fifteen minutes are onboarding-via-cartography: you are learning what the symbols mean by uncovering them, and every step is a small reveal. Scarce resources (food, water, scrap metal) force you back to a base tile, then out again, and the session texture becomes a heartbeat of expedition → retrieve → refit → expedition.

A thirty-minute session is a widening circle punctuated by equipment moments. You find an item — a knife with +2 scavenge, a canteen that doubles water capacity, a torch that turns a dark sector survivable — and that item reshapes where on the map you can reach. The long-term pull is completion of a *place*: every sector eventually visited, every landmark investigated, every passage between levels charted. Unlike Looper, your progress does not reset at the end of a run; unlike Scaler, it does not compress. The map you charted an hour ago is still charted. The reward is territory, not a number.

**Distinguishing two cousins.** Cavernous II is cited as a Looper exemplar too; Explorer's territory-to-chart is *not* Looper's zone-as-gate. In Looper the zone is a progression token that the loop reset reshuffles — you re-traverse it next run. In Explorer the zone is the *substrate* — you traverse once, the state persists, and the map grows. A Looper-Explorer hybrid (Cavernous II is exactly this) pairs both: loop-reset within each zone, permanent discovery *between* zones. Drafting against the Explorer skeleton means you are building something closer to Level 13's persistent-world shape. Director is the other spatial cousin: Director is a player-as-goal-setter view of a multi-agent arena with round-scoped prestige; Explorer is a player-as-avatar-in-space view of a single persistent world. Both are spatial, neither is the other.

---

## 2. Pattern composition

**Required patterns:**

- [Spatial Exploration Systems](../../open-loop-research/patterns/tier-4-specialized/spatial-exploration-systems.md) — the headline pattern. Fog-of-war map with zones/sectors revealed progressively; 24% corpus prevalence per the pattern doc. Explorer is the archetype this pattern defines in composition with the others below.
- [Inventory Systems](../../open-loop-research/patterns/tier-3-moderate/inventory-systems.md) — discrete items with individual properties (not just counts). The *item-vs-resource discriminator* (items non-fungible, resources fungible) is the archetype's second structural commitment. Bag capacity, item identity, and item-to-equipment-slot wiring all live here.
- [Activity Systems](../../open-loop-research/patterns/tier-0-universal/activity-systems/) — duration-based variation. Actions are cooldown-bound *per-location*; scouting a sector takes sim-time and consumes resources.
- [Progression Systems](../../open-loop-research/patterns/tier-0-universal/progression-systems.md) — zone-unlock thresholds, equipment-gated sector access, tech-tree/blueprint research that gates new action categories.

**Cross-pattern properties engaged:**

- [Unlock Requirements](../../open-loop-research/patterns/cross-pattern-properties/unlock-requirements.md) — the dominant gating property. Sectors gated by adjacency, by equipment (torch required for dark sector), and by discovery-threshold (reveal 80% of zone N to unlock zone N+1). Level 13's environmental-hazard gates (radiation, cold, darkness) are archetype-signature.
- [Quantity Tracking](../../open-loop-research/patterns/cross-pattern-properties/quantity-tracking.md) — sectors-visited, landmarks-investigated, items-collected counts feed completion achievements and discovery-curve scaling.
- [Cost Scaling](../../open-loop-research/patterns/cross-pattern-properties/cost-scaling.md) — mild. Scout/scavenge action costs grow per-zone rather than per-purchase; inventory bag upgrades follow a cost curve. The archetype's pacing lever is resource scarcity, not exponential cost growth.
- [Scaling Formulas](../../open-loop-research/patterns/cross-pattern-properties/scaling-formulas.md) — sub-linear discovery curves (each sector slightly harder than the last), step-changes at zone boundaries, logarithmic-shaped "efficiency of a well-scouted zone."
- [Purchase Mechanics](../../open-loop-research/patterns/cross-pattern-properties/purchase-mechanics.md) — used for camp/base-building (multi-resource construction costs) and equipment-repair flows; not the archetype's load-bearing axis.

**Optional modifiers (fork may add):**

- **Loop-reset wrapper** — Cavernous II's pattern: persistent map-discovery + loop-reset skill/time-resource inside each expedition. Stays Explorer-shaped as long as the map persists across the reset; becomes a Looper-Explorer hybrid officially.
- **Procedural / seeded world** — Level 13's seed-based deterministic regeneration. Game world derived from a single integer seed; save state is player state + seed only. Authentic to the archetype but adds a correctness surface (determinism across save/load) that is a fork-level choice, not skeleton.
- **Companions / party members** — Level 13's Explorers. Recruitable NPCs with their own stats that accompany the player; a worker-with-position primitive gap (§ 10) manifests sharply when forks adopt this.
- **Combat layer** — turn-based or resource-trade encounters on sectors with hostile features. Orthogonal to the exploration substrate; Level 13 and Trimps both ship a combat layer; Cavernous II makes it central.

**Novel-patterns cluster alignment:**

- **Cluster 7a (Spatial-as-container, zones/grids as content partitions)** — Explorer is the canonical 7a composition. Level 13 is an explicit 7a member per `novel-patterns-synthesis-v4.md` line 168.
- **Cluster 7b-β (Routing-Traversal)** — triggered when a fork adds programmed-route queues over the map. Cavernous II is a Routing-Traversal exemplar; a Cavernous-II-shaped Explorer fork straddles 7a and 7b-β and inherits both clusters' stress. Pure Explorer (Level 13 shape) stays in 7a.

---

## 3. Engine surface

| Layer | Primitive | Role in this archetype |
|-------|-----------|------------------------|
| core | `createResource` | Scarce consumables (food, water, metal, rope, concrete) + per-zone action counters. ~5 core resources at baseline; each is `trackTotal`-accumulated for discovery achievements. |
| core | `trackTotal` | Lifetime sector-visits and item-finds; feeds completion achievements. |
| core | `createModifierChain` | Per-action bonus chain (scavenge yield, scout range, combat attack). Shallow relative to Scaler — typically 3–5 named factors. |
| core | `createMultiplicativeModifier` | Equipment bonuses, camp-improvement multipliers. |
| core | `createAdditiveModifier` | Flat-value buffs (bag capacity +5 from bag upgrade, visibility +1 tile from torch). |
| core | `createCostRequirement` | Multi-resource costs for camp construction and equipment crafting (metal + rope + concrete). |
| core | `createSequencer` | Expedition action queue. Used by Cavernous-II-shape forks for programmed routes; optional in Level-13-shape forks where the player hand-steps. |
| core | `createTimedProgress` | Per-action cooldown / duration bars (scavenge takes 5 s, clear-waste takes 2 min). |
| core | `runHeadless` | Beat-timing sim tests. |
| systems | `createZoneSystem` | The zone registry itself — one zone per world-region (Level 13 has 15 levels; Explorer baseline = 4 zones). Tracks unlocked/current zones; per-zone content visibility gates every sector, item, and action query. |
| systems | `createInventory` | The bag. `baseCapacity` = 5 items at start, expands via upgrades. `overflow: 'block'` — you have to drop to pick up. Capacity limit is the archetype's signature friction. |
| systems | `createContentRegistry` | Sector registry (per-zone, position-keyed), landmark registry, dialogue/event registry. Level 13's per-sector Entity-Component-System maps directly onto per-zone content registries with position metadata. |
| systems | `createWorker` | Expeditions. Baseline is one worker (the player avatar) with a task dispatch + tracker; party-based forks add companion workers. **Position is not part of `WorkerOptions` today — § 10 headline gap.** |
| systems | `createSkillCategory` | Exploration skills (scouting, foraging, combat). Used rarely at baseline; present because equipment bonuses resolve through a skill-shaped readout. |
| systems | `createAchievementCategory` | Discovery milestones and territory-charted ladders. |
| systems | `createTieredAchievement` | Sectors-explored and item-found ladders. |
| systems | `createPurchasableCategory` | Camp structures and equipment crafts. Each entry has a multi-resource cost; ownership unlocks new action categories at the camp site. |
| harness | `runMatrix` | Probe robustness across the vars space; seeded-world variants use `runMatrix` over a seed axis. |

**Engine systems explicitly not used (required):**

- `createLoop` / `createReset` — Explorer baseline is *persistent progression*. The map you charted stays charted; the items you carried stay in your bag. If a fork reaches for `createLoop`, it is building a Looper-Explorer hybrid (Cavernous II shape) and inherits Looper's reset-correctness stress axis on top of Explorer's.
- `createScalingPurchasable` — scaler-shaped cost growth is not the Explorer pacing lever. Scarcity of consumables is. A fork that stacks scaling producers is drifting into Producer / Interlocker territory.
- `createCumulativeConversion` — no prestige-currency conversion. Exploration is the "prestige"; the currency is charted territory.
- `createChallengeCategory` — challenges are an optional modifier; the archetype's baseline difficulty surface is environmental-hazard gates (equipment-required sectors), not modal challenge runs.

Naming what is absent is half the Explorer contract: the archetype refuses loop resets, exponential cost scaling, and prestige-currency conversion, spending its surface budget on zone-scoped content queries, worker+position composition, and item-identity. Every primitive named above resolves in `open-loop-engine/docs/api/INDEX.md`.

**Primary stress axes:**

1. **Zone-scoped content queries.** "Show only the sectors in zone N that are adjacent to an explored sector." "Which items are available to pick up from *this* location?" "Which actions does the current sector permit given current equipment?" All of these are zone-scoped plus position-scoped plus equipment-scoped. The `ZoneSystem` tracks unlocked zones; the per-sector content query is manual filtering in both Level 13 and Cavernous II today. If three Explorer consumers re-derive the same filter composition, a `useZoneScopedContent({ zone, position, filter })` helper should graduate. Looper called out the same shape; Explorer makes it harder because the position axis is continuous.
2. **Worker + position composition.** `createWorker` is a sequencer + tracker bundle with no spatial state; its `WorkerOptions` interface (`src/systems/worker.ts`) has no `position` field. Level 13 decomposes into Ash.js ECS components (`PositionComponent`, `MovementComponent` as distinct entities-components); Cavernous II hand-rolls clones with `x, y` coordinates; Trimps attaches position to zone-ordinal scalars. Three consumers, three hand-wirings. The gap is archetype-headline.
3. **Item-identity vs fungible-resource boundary.** `createInventory` accepts an `items: string[]` whitelist and returns a bag that holds `Resource<DecimalSource>` entries — the items are *typed* but the bag tracks *quantity* per item type. Level 13's bag goes further: each item instance has a durability value, possibly an affix, possibly a repair state. Explorer as-skeletal treats items as typed-fungible (Inventory primitive covers it cleanly); Explorer-with-equipment forks need per-instance item identity and surface the real gap.
4. **Fog-of-war visibility state.** Per-sector `'fogged' | 'glimpsed' | 'explored' | 'charted'` state is game-side today. No engine primitive tracks visibility transitions; no harness helper answers "what percentage of zone N is explored." Both are consumer-wired. The question "does the engine need a `VisibilitySystem` primitive?" is what Explorer is designed to answer.

---

## 4. Data shape

_Stripped pending validator (OL-809) and Pass-1 reground (OL-810). Confident numbers here were unsourced; restore via citations or `aspirational — pending implementation` tag once those subtasks land._

---

## 5. Content sketch

- **Resources:** 5 at baseline — food, water, metal, rope, concrete (Level 13 direct). Food and water are consumable (drain during expeditions); metal/rope/concrete are gatherable-and-stockpiled. Each has a `trackTotal` accumulator.
- **Zones:** 4 — zone-1 (surface, 12 sectors), zone-2 (underground, 16 sectors), zone-3 (ruins, 20 sectors), zone-4 (deep, 24 sectors). Total 72 sectors across the arc.
- **Actions:** 6 core — scout (reveal adjacent fog), scavenge (gather resources), investigate (activate landmark), clear-waste (unblock blocked sector), rest (restore consumables at camp), craft (consume materials at camp). Each is a `createSequencer` action category with duration + costs + yields.
- **Sectors:** procedurally composed from ~8 sector archetypes (ruined-building, mineral-vein, flooded-passage, dark-sector, landmark-ruin, waste-field, crossroads, empty). Each archetype has a default action set and yield distribution.
- **Items / equipment:** ~20 items across 3 slots (weapon, tool, warmth-garment) × 4 rarity tiers. Typed-fungible at skeleton default (stacks of the same sword combine); `itemIdentityMode: 'per-instance'` forks get per-item affix + durability state.
- **Landmarks:** 8 — one per 9-sector average, investigated once. Each yields a tech-tree unlock or a permanent map-wide bonus.
- **Camp structures:** 5 — camp-base (required beat 3), workshop (craft gate), storage (inventory-boost gate), hospital (party-healing, if companions enabled), trading-post (optional).
- **Achievements:** 25 — 10 discovery-milestone (first sector in each zone, full zone coverage, 50%/80%/100% territory), 8 item-milestone (first equipment, 10 distinct items held, complete set per slot), 7 hidden (first night survived, first dark sector cleared, return to start with full bag, etc.). All contribute `achievementMultiplier` to the action-bonus chain.
- **Progression gates:** zone unlocks via exploration-fraction (zone 2), landmark-investigated (zone 3), equipment-acquired (zone 4 requires a specific item). Sector-level gates via equipment (torch, rebreather, climbing-rope).

**Density target:** every beat in § 4 maps to at least one content entry. Beat 1 → scout action + first sector archetype; beat 2 → scavenge action + resource scarcity thresholds; beat 3 → camp-base structure; beat 4 → first equipment item; beat 5 → torch/rebreather equipment + dark/flooded sector gate; beat 6 → zone-2 unlock threshold; beat 7 → persistent inventory across zone transition; beat 8 → cartographer achievement + first zone-2 landmark.

---

## 6. UI prescription

- **Primary shell:** `MultiColumnShell` — `declared invention`. No `map-exploration` or `spatial-exploration` sub-genre exists in `subgenre-shell-mapping-2026.md`; the three Explorer exemplars do not anchor a majority (Cavernous II is `multi-column-dashboard` per `layout-audit-2026.md` time-loop row; Trimps is classified as `three-panel` by UX / `multi-column-dashboard` by DOM per `layout-audit-2026.md` L187; Level 13 is not in the 2026 audit, only light-inspected in `layout-spray-2026-04.md` line 421 as mobile-header + grid). The multi-column cluster (N=3: Trimps, Arcanum, Cavernous II per `subgenre-shell-mapping-2026.md` line 211) is the closest corpus anchor for Explorer's need to surface the map, a persistent resource panel, and a bag/inventory pane simultaneously. Tag `declared invention` because no sub-genre majority supports this; the claim rests on the three exemplars' convergent multi-column-for-spatial-content shape.
- **Secondary shell:** `ThreePanelShell` — `declared invention`. For narrative-text Explorer forks (Level 13 / A Dark Room lineage), the three-panel shape (left: zone/nav, centre: current-sector description + actions, right: inventory/log) is closer to the narrative-clicker secondary cluster per `subgenre-shell-mapping-2026.md` § "narrative clicker" (three-panel 3/13 = 23%). Tag `declared invention` because Level 13 is not in the audit and A Dark Room is single-column, not three-panel, in the narrative-clicker majority row; the claim is a cross-cluster inference. Use for Explorer forks whose content is *described* more than shown.
- **Form-factor intent:** `desktop` — `declared invention`. No sub-genre row supports a form-factor claim for Explorer directly. Level 13 is mobile-aware per `layout-spray-2026-04.md` (mobile-header + grid), but the canonical map-as-central-surface shape does not shrink well to mobile without a fork-level redesign that collapses the map into a narrative text view (Level-13-mobile shape) or abandons the multi-column premise entirely. Responsive and mobile-first are legitimate fork choices but not skeleton claims.
- **ARIA-aligned widgets (lift targets):**
  - `Dialog` — landmark-investigation modals, item-pickup confirmations, event triggers (narrative interruption from sector features). Cites `widget-vocabulary.md` Layer 1 (frequency 6).
  - `Tooltip` — sector-glyph identification on map hover, item-property breakdowns, action-cost previews. Cites `widget-vocabulary.md` Layer 1 (frequency 5).
  - `Tabs` — per-zone navigation tab bar when the map outgrows a single pane. Cites `widget-vocabulary.md` Layer 1 (frequency 6). Cavernous II uses a dropdown for zone switching per `widget-vocabulary.md` row: Cavernous II — the dropdown variant is an acceptable fork-level choice.
  - `Progress` — per-action cooldown / duration bars; zone-exploration percentage readout. Cites `widget-vocabulary.md` Layer 1 (highest frequency, 12).
  - `Accordion` — collapsible sector-feature lists when a sector has many entries; collapsible inventory sub-categories. Cites `widget-vocabulary.md` Layer 1 (frequency 4).
  - `Select` — Cavernous II's zone / realm switcher is a `Listbox`/`combobox` dropdown per `widget-vocabulary.md` row: Cavernous II. Fork choice.

  Lift from `@/lib` / reka-ui primitives; forks do not reimplement focus, portal, or a11y.
- **Domain widgets (per-fork implementation):**
  - map widget — the signature Explorer surface. Grid- or graph-shaped map with fog-of-war tiles, current-position indicator, discovered-landmark markers, equipment-gate overlays. No cross-game generalisable shape per the OL-273 Phase 2 policy; every Explorer fork implements its own. Cites `widget-vocabulary.md` Layer 2 (Level 13 canvas grid and Cavernous II 2D tile grid are both per-game implementations).
  - bag / inventory panel — grid- or list-shaped inventory with capacity indicator, item rarity colouring, equip/drop affordances. Typed-fungible mode renders as count rows; per-instance mode renders as individual tiles with durability/affix overlays. Cites `widget-vocabulary.md` Layer 2 (frequency 4 for inventory-panel family; Trimps' `#equipmentSide` is an exemplar).
  - sector-info panel — context pane describing the current-location sector: features, available actions, resource-yield previews, narrative description. Narrative-leaning Explorers may replace the map with this panel. Cites `widget-vocabulary.md` Layer 2 (frequency 6 for stat-panel/info-panel family).
  - action bar — persistent action row for the current sector (scout / scavenge / investigate / clear-waste / rest / craft). Cites `widget-vocabulary.md` Layer 2 (frequency 4 for action-card family).
  - event log — scrolling log of discoveries, pickups, and narrative events. Level 13 and A Dark Room both lean on this widget; Cavernous II's loop-log is an adjacent form. Cites `widget-vocabulary.md` Layer 2 (frequency 5 for log / history family).

  Per-fork implementation — no pre-abstraction (OL-273 Phase 2).
- **Layout detail:** multi-column region assignment — leftmost column holds the zone/nav switcher + resource strip, centre-left column holds the map widget (Explorer's load-bearing surface), centre-right column holds the sector-info panel + action bar, right column holds the bag + event log. The four-column shape matches Trimps' Bootstrap row (`#resourceColumn` / `#miscColumn` / `#trimpsColumn` / `#logColumn`) and Cavernous II's five `.vertical-block` columns per `layout-spray-2026-04.md` lines 75–78. Forks with narrower content collapse to three columns (secondary shell) or switch to a stacked narrative view.
- **Nav pattern:** horizontal tab bar for zone switching (when zones count ≥ 3), or a Cavernous-II-style `Select` / `Listbox` dropdown for forks with many zones. Sub-navigation (bag tabs, crafting tabs) is widget-internal to the right column.
- **Declared-invention notes:** all three prescription fields carry the tag. Root cause: Explorer has no sub-genre row in the 2026 audit; the three canonical exemplars land in two different sub-genres (Trimps in `prestige idle`, Cavernous II in `time-loop`) and Level 13 is not classified. The multi-column commitment rests on the three games' convergent shape rather than on a sub-genre majority. A future audit pass that adds a `map-exploration` sub-genre row (per-game inclusion of Level 13, appropriate Trimps slice, Cavernous II, possibly Advent Incremental's map mode) would let this prescription drop the `declared invention` tag; that follow-up is out of scope for this archetype.

---

## 7. Predicted engine gaps

Explorer is designed to surface the engine's spatial ergonomics. Each row below is a hypothesis; the implementation will confirm or reject. Confirmed gaps become engine tickets; rejected ones get deleted from a later revision of this doc.

| Gap | Severity | Notes |
|-----|----------|-------|
| Worker + position composition | High | `createWorker` is `sequencer + tracker` with no position. Level 13 decomposes into `PositionComponent` + `MovementComponent` (ECS); Cavernous II hand-rolls `clone.x / clone.y`; Trimps attaches position to zone-ordinal scalars. Three consumers, three hand-wirings, identical need. Proposed resolution: `createWorker` grows an optional `position: { topology, coords }` config, or a sibling `createPositionedWorker({ topology, initialPosition, onMove })` primitive. Required for any Explorer fork with `partySize > 1` to avoid O(N) hand-wiring per companion. |
| Fog-of-war / visibility state primitive | High | No engine primitive tracks per-sector visibility transitions (`fogged → glimpsed → explored → charted`). Consumers wire a `Record<sectorId, Visibility>` persistent ref + transition logic manually. A `createVisibilitySystem({ topology, levels, reveal: (id, level) => void })` primitive that composes with `ZoneSystem` would save every Explorer fork from re-deriving this. Likely graduates to a real ticket after Explorer and one other consumer confirm the shape. |
| Zone-scoped + position-scoped content queries | Medium | Looper flagged the zone-scoped variant (§ 3 stress 4 in `looper.md`); Explorer makes it harder because queries compose zone + position + equipment + visibility. Consumers hand-wire the filter composition. A `createContentQuery({ zone, position, equipment, visibility })` helper — as a harness analyzer in `src/harness/queries/` rather than an engine primitive — would compress the pattern. Blocks on visibility primitive above. |
| Item-identity layer (per-instance item state) | Medium | `createInventory` returns stacks keyed by item id; the stack tracks quantity, not per-instance state. Level 13 stores durability + affix on each item instance; Cavernous II handles this differently (no per-instance identity); Trimps separates equipment state from inventory counts entirely. If `itemIdentityMode: 'per-instance'` becomes a real fork choice for two consumers, graduate a `createItemInstance({ type, properties })` helper and extend `InventoryOptions` with an `identity: 'fungible' | 'instance'` mode. |
| Map topology primitive (adjacency graph / grid) | Medium | The current `ZoneSystem` is a flat registry with `current` + `unlocked` refs. There is no adjacency model — no "which sectors are neighbours of this sector" query. Consumers hand-roll a `Map<sectorId, sectorId[]>` adjacency table and a BFS/shortest-path helper. Proposed resolution: `createMapTopology({ shape: 'grid' | 'graph', sectors, adjacency })` primitive, or extend `ZoneSystem` with a nested topology option. Level 13 and Cavernous II both want this. |
| Seed-based deterministic content generation | Low-medium | `seedBasedWorld: true` forks need a per-seed reproducible RNG with a known algorithm. `break_eternity.js` is about Decimal, not RNG. No engine primitive today; consumers wire `seedrandom` or equivalent. A thin `createSeededRng({ seed })` helper under `src/primitives/` or `src/core/` would unify this for Explorer + any other seeded-world archetype (Director uses a seeded batch harness for `runMatrix`, which is harness-scoped; a runtime-scoped RNG is distinct). |
| Consumable-resource drain during actions | Low | Food/water deplete during expeditions; `createResource` handles the quantity but the "automatic drain per sim-second while away from camp" shape is hand-wired through a reactive watcher. A `createDrainingResource({ baseRate, drainCondition })` helper would match the shape — Level 13's food/water, Trimps' Trimp-breeding-hunger, any survival-adjacent fork. Low because wiring is one composable per consumer; re-audit if three converge. |
| Multi-resource cost helper (shared with Interlocker) | Low | Already flagged by Interlocker § 10. Explorer's camp-construction and equipment-crafting flows surface the same shape — 3–5-resource construction costs. Not an Explorer-specific gap; listing here for cross-archetype evidence. Graduates if Interlocker ships first. |

---

## 8. Themes

### Theme A — Post-apocalyptic city (the Level 13 baseline)

- **Hook:** The canonical. You are a Survivor in a decaying underground city. Scavenge ruins, recruit companions, rebuild a camp, descend toward the surface over 15 vertical levels. Cultural shorthand for the archetype.
- **Resource mapping:** food, water, metal, rope, concrete. Zones: surface, underground, ruins, deep. Equipment: knife / torch / rebreather / coat. Landmarks: abandoned buildings, radio towers, hidden caches.
- **Narrative framing:** strong — environmental storytelling via sector descriptions, dialogue on first visits, story flags tracking progress through dark-age rebuilding.

### Theme B — Submerged biome (oceanographic)

- **Hook:** You pilot a deep-sea submersible. Each zone is a depth layer (photic, twilight, midnight, abyssal). Scarcity is oxygen and battery charge; exploration reveals bioluminescent landmarks and underwater ruins. Items are sensor instruments (sonar, spectrometer, camera). The map grows downward.
- **Resource mapping:** food → rations; water → freshwater-stores; metal → hull-plating; rope → cable; concrete → ballast. Zones: photic, twilight, midnight, abyssal. Equipment: spotlight, pressure-suit, sonar. Landmarks: hydrothermal vents, shipwrecks, alien constructs.
- **Narrative framing:** medium — log-entries on landmark discovery, rising pressure-event gates at zone boundaries.

### Theme C — Generation-ship corridors (interior sci-fi)

- **Hook:** You are waking up inside a generation ship mid-voyage. The ship is the world — corridors, maintenance shafts, derelict decks. Scarcity is power cells and medical packs; exploration uncovers crew logs, stasis pods, and damaged sections. Items are tools (plasma-torch for sealed doors, multitool, comms-beacon).
- **Resource mapping:** food → nutrient-paste; water → recycled-water; metal → scrap; rope → cabling; concrete → sealant. Zones: command deck, crew quarters, engineering, cryo-bay. Equipment: plasma-torch, multitool, emergency-rations. Landmarks: crew-log terminals, broken stasis pods, overgrown hydroponics.
- **Narrative framing:** strong — each landmark reveals a fragment of what happened to the crew; arc closure is the reveal of why you woke up.

### Theme D — Dungeon-delving RPG (fantasy adventure)

- **Hook:** The classic. You are an adventurer descending through dungeon levels. Scarcity is torches, rations, bandages. Items are weapons / armour / scrolls with properties and durability. Landmarks are altars, treasure rooms, boss doors. The map is a tile grid with corridors, rooms, and secret passages.
- **Resource mapping:** food → rations; water → waterskins; metal → weapons-repair-kit; rope → climbing-rope; concrete → stone-blocks (for barricades). Zones: dungeon level 1–4. Equipment: sword / shield / lantern. Landmarks: altars, treasure chambers, ancient runes.
- **Narrative framing:** light-to-medium — flavour on landmarks, optional quest-giver NPCs, no overarching plot baked into the skeleton.

---

## Vocabulary anchors

Every name cited in this doc must resolve to one of:

- **Pattern names** → `open-loop-research/LIBRARY.md` + linked pattern files
- **Cross-pattern properties** → `open-loop-research/patterns/cross-pattern-properties/*.md`
- **Novel-patterns clusters** → `open-loop-research/reports/novel-patterns/novel-patterns-synthesis-v4.md`
- **Engine primitives** → `open-loop-engine/docs/api/INDEX.md` (directory) + per-tier files (resources, mechanics, content, lifecycle, engine, advisors, spatial, harness)
- **Corpus games** → `open-loop-research/analyses/complete/*-analysis.md`
- **Layout shells** → `open-loop-starter/src/lib/shells/`
