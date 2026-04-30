# Archetype: Defender

> **One-line identity:** Placement-Adjacency + Wave Pacing + Cost Scaling — commit static defenders before threat arrives, watch the outcome resolve.
>
> **Status:** `candidate`

**Exemplars (validation, not clone targets):** [BTD6](../../open-loop-research/analyses/complete/btd6-analysis.md), [Kingdom Rush](../../open-loop-research/analyses/complete/kingdom-rush-analysis.md), [GemCraft](../../open-loop-research/analyses/complete/gemcraft-analysis.md), [Desktop Tower Defense](../../open-loop-research/analyses/complete/desktop-tower-defense-analysis.md), [Gem TD](../../open-loop-research/analyses/complete/gem-td-analysis.md).

**Live consumer references (engine-usage grounding):** none in the ecosystem today. The first Defender fork will confirm whether the grid/wave surface stays as a consumer-layer concern or graduates to an engine primitive (§ 10, convergent-gap rule). Tug (OL-573) is the closest Wave-2 sibling with spatial commitment and informs this archetype's § 2 optional-modifier handling.

---

## 1. Player experience

Defender is the archetype of *committing architecture before threat arrives*. You lay towers, traps, or turrets on a grid; you spend a small currency pool on opening placements; then the first wave of enemies arrives and walks a path your layout helped define. You watch the outcome resolve without mid-wave commands. Between waves, you buy another tower, upgrade a range, reshape a lane, and commit again. The texture of play is *tension held across a pause* — the wave is coming, you have thirty seconds to prepare, and once it starts the board tells you whether your architectural decision was right.

A thirty-minute session is a sequence of wave-clear moments separated by build-phase decisions — the first tower planted, the first round where the last enemy dies before reaching the exit, the first upgrade that changes which enemy type you can handle, the first stage cleared. The long-term pull is vertical: later towers punch harder, later waves escalate to force new answers, and the roster of towers you know how to combine becomes your expressive vocabulary. The player role is *architect*, not participant.

---

## 2. Pattern composition

**Required patterns:**

- [Placement-Adjacency](../../open-loop-research/patterns/tier-4-specialized/placement-adjacency.md) — position-as-neighbor-gate. Towers occupy cells; splash overlap, support-tower auras (BTD6 Monkey Village), and gem-color combinations (GemCraft) make the grid mechanically load-bearing.
- [Routing-Traversal](../../open-loop-research/patterns/tier-4-specialized/routing-traversal.md) — position-as-path-gate. Secondary pattern; engaged only in maze-build variants where towers shape the enemy path (Desktop Tower Defense, Wintermaul Wars, Cursed Treasure). Fixed-path TD (Kingdom Rush, BTD6, Gem TD) does NOT engage this pattern — the path is cosmetic backdrop, not a player decision surface.

**Cross-pattern properties engaged:**

- [Cost Scaling](../../open-loop-research/patterns/cross-pattern-properties/cost-scaling.md) — per-tower-purchase scaling and per-upgrade-tier scaling both drive the build-phase economic decision.
- [Modifier Chains](../../open-loop-research/patterns/cross-pattern-properties/modifier-chains.md) — tower damage compounds base × upgrade-tier × type-bonus × adjacency-buff; a mature Defender run stacks 4–6 factors per tower instance.
- [Purchase Mechanics](../../open-loop-research/patterns/cross-pattern-properties/purchase-mechanics.md) — tower placement and upgrade purchase share the same affordability math at different scales.
- [Scaling Formulas](../../open-loop-research/patterns/cross-pattern-properties/scaling-formulas.md) — wave HP escalation and bounty-income curves are the pacing levers.

**Optional modifiers (fork may add):**

- **Maze-build spatialMode** — toggles Routing-Traversal from dormant to primary. Player places towers on open cells; enemy shortest-path recomputes live; the grid becomes the path authoring surface. Desktop Tower Defense is the canonical exemplar. Engine posture unchanged; grid primitive stays consumer-layer.
- **Hero / ability layer** — per-stage deployable hero unit with manual repositioning and cooldown-gated abilities (Kingdom Rush's Gerald/Alleria, BTD6's heroes, spell buttons). Adds a second intentional-action stream atop the auto-resolve base. Content-heavy; not a skeleton commitment.
- **Gem-combining** — GemCraft/Gem TD variation: mechanical units are gems slotted into static tower frames, combined pre-placement to stack colour-specific effects. Maps to Placement-Adjacency Variation 3 (shape-fit / assignment).
- **Prestige meta-currency** — star-rating-per-stage or run-end meta-tokens unlock permanent cross-run upgrades. Kingdom Rush stars, BTD6 Monkey Knowledge, GemCraft wizard levels. Optional in the archetype skeleton but expected in any commercially competitive modern Defender.

**Boundary: Defender ↔ Survivor.** Defender and Survivor share wave-escalation and survival framing but diverge on *the timing of placement commitment*. In Defender the player commits tower positions *before* enemies arrive — the board is authored, combat auto-resolves, the player is an architect. In Survivor the player is positioned *inside* the threat and responds in real time without pre-placement — movement and ability use are reactive, the player is a participant. Games at the boundary (Dome Keeper's dome-interior sequences, Halls of Torment's room-clear structure) are hybrids worth noting rather than forced collapses. See archetype doc for Survivor (OL-575, not yet filed) for the reactive counterpart.

**Novel-patterns cluster alignment:** n/a — Defender is a well-established baseline composition (Flash 2007 commercial formation; WC3 UMS lineage 2003+). The `novel-patterns-synthesis-v4.md` 7b cluster sub-split (Placement-Adjacency + Routing-Traversal) describes spatial patterns this archetype *consumes*, not a cluster this archetype *defines*.

---

## 3. Engine surface

| Layer | Primitive | Role in this archetype |
|-------|-----------|------------------------|
| core | `createResource` | Placement currency (gold, mana, energy); kill-bounty + wave-end income. |
| core | `createModifierChain` | Per-tower damage chain: base × upgrade × type-bonus × adjacency-aura. |
| core | `createSequencer` | Wave spawner — timed enemy release, wave composition, escalation across waves. |
| core | `persistent` | Meta-progress retention across runs (wizard levels, Monkey Knowledge, hero unlocks). |
| systems | `createPurchasableCategory` | Tower purchase catalogue and per-tower upgrade tracks. |
| systems | `createZoneSystem` | Stage/map topology — spawn zones, goal zones, stage-progression gating. |
| systems | `createReset` | Run reset for roguelike-adjacent variants; prestige reset for meta-progression. |
| harness | `runHeadless` | Beat-timing sim tests — does wave N arrive in target window at default scaling. |
| harness | `runMatrix` | Robustness probes across cost and HP curves. |

**Engine systems explicitly not used:** `createLoop` — wave cadence comes from `createSequencer` firing at wave-interval boundaries, not a free-running tick loop; between waves the game is quiescent by design.

**Primary stress axes:**

1. **Sequencer reactivity across escalation.** A 50-wave run sequences enemy-composition by wave number, dropping new enemy types (Armored → Flying → MOAB) at scheduled waves, scaling HP per wave. The sequencer must advance through wave N without drift and report correct completion signals for bounty-income accrual.
2. **Modifier-chain depth per tower instance.** Each placed tower resolves damage via base × upgrade-tier × type-bonus-against-enemy × adjacency-aura. A mature board runs this chain per tower per tick across ~20–80 tower instances. Chain evaluation must stay correct as Decimal values under Kingdom Rush / BTD6 magnitudes.
3. **Zone-scoped queries for auto-combat.** Enemies live in the stage zone; towers live in build-cell zones; damage resolution queries "which enemies are in this tower's range right now." The zone system's membership queries must return correct sets under enemy-motion updates each tick.

---

## 4. Beat map

_Stripped pending validator (OL-809) and Pass-1 reground (OL-810). Confident numbers here were unsourced; restore via citations or `aspirational — pending implementation` tag once those subtasks land._

---

## 5. Data shape

Defender's content lives under `src/archetypes/defender/data/` as flat typed-array exports (`defenders.ts`, `enemies.ts`, `stages.ts`, `progression.ts`) plus a `types.ts` that names the definition interfaces. Inline tower-behaviour and enemy-resistance fields colocate with the definitions — no separate effect tables, no codegen. Lens discipline is enforced by comment sections inside each data file (`// ─── Skeleton ───`, `// ─── Balance ───`, `// ─── Costume ───`): skeleton counts (tower-archetype count, enemy-archetype count, stage count, prestige mode) are a fork-of-skeleton decision; balance constants (HP growth, cost curves, bounty income, upgrade multipliers) are the tuning surface sim tests probe; costumes (tower names, enemy names, stage names, narrative flavour) are theme-scoped.

```ts
// data/types.ts — typed definitions

export interface DefenderDef {
  id: string;                          // stable; used as save key
  name: string;                        // display (costume)
  baseDamage: DecimalSource;
  baseRange: number;                   // grid cells
  baseAttackSpeed: DecimalSource;      // attacks per second
  damageType: 'physical' | 'magic' | 'splash' | 'pierce';
  purchase: {
    baseCost: DecimalSource;           // first-placement cost
    costScaling: DecimalSource;        // per-instance multiplier (default 1.0 — most TD games fix tower price)
  };
  /** Optional adjacency-aura: buffs neighbours within N cells. */
  adjacencyAura?: {
    radius: number;
    buff: { damageMul?: DecimalSource; rangeMul?: DecimalSource; speedMul?: DecimalSource };
  };
}

export interface EnemyDef {
  id: string;
  name: string;                        // costume
  baseHp: DecimalSource;               // multiplied by stage HP-curve at wave N
  baseSpeed: number;                   // cells per second
  /** Resistance multipliers against damage types. 1.0 = neutral; 0.5 = resist; 0 = immune. */
  resistances: Partial<Record<DefenderDef['damageType'], DecimalSource>>;
  bounty: DecimalSource;               // currency dropped on kill
  flying?: boolean;                    // bypass ground-only maze/towers
}

export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  targetDefenderId: string;            // scopes to one tower archetype
  tier: 1 | 2 | 3;                     // vertical depth — 3 tiers covers the skeleton; forks add Tier 4+
  cost: DecimalSource;
  effect: { damageMul?: DecimalSource; rangeMul?: DecimalSource; speedMul?: DecimalSource };
}

export interface StageDef {
  id: string;
  name: string;                        // costume
  /** Wave-HP multiplier curve. Length = waveCount; each element multiplies EnemyDef.baseHp for that wave. */
  hpCurve: DecimalSource[];
  /** Per-wave enemy composition. Length = waveCount; each element lists enemy ids + counts for that wave. */
  waves: Array<{ enemyId: string; count: number; spawnIntervalSec: number }>[];
  /** Starting currency granted on stage entry. */
  startingCurrency: DecimalSource;
}

export interface DefenderBalance {
  waveEndBountyBonus: DecimalSource;   // flat income per wave-clear
  stageClearMetaReward: DecimalSource; // meta-currency granted on stage clear (0 when prestigeMode === 'none')
  upgradeCostScaling: DecimalSource;   // multiplier on tier-N upgrade cost relative to tier-1 (default 2.5)
  adjacencyAuraStack: 'additive' | 'multiplicative'; // default 'multiplicative'
}

export type PrestigeMode = 'none' | 'run-reset' | 'campaign';

export interface DefenderProgression {
  /** Structural fork decision. Editing this constitutes a fork of the skeleton. */
  prestigeMode: PrestigeMode;
  /** Number of permanent-upgrade nodes in the meta-tree. 0 when prestigeMode === 'none'. */
  metaUpgradeNodeCount: number;
  /** Optional campaign-map node count when prestigeMode === 'campaign'. */
  campaignNodeCount?: number;
}

export interface DefenderData {
  defenders: DefenderDef[];
  enemies: EnemyDef[];
  upgrades: UpgradeDef[];
  stages: StageDef[];
  progression: DefenderProgression;
  balance: DefenderBalance;
}
```

**Override semantics:** `boot.ts` exports `createDefenderEngine(overrides?)` that accepts a flat-category deep-partial — `{ defenders?, enemies?, upgrades?, stages?, progression?, balance? }` — with per-entity replacement keyed by `id` and deep-merge over balance and progression. Sim tests and workbench perturbation route through this factory. The addressable shape *is* the TypeScript type over the data; there is no synthetic vars layer and no codegen round-trip.

**Archetype code lives in** `src/archetypes/defender/` as its own colocated tree (`data/`, `modules/`, `composables/`, `ui/`, `sim/`, `boot.ts`). See `open-loop-starter/CLAUDE.md § Archetype convention`.

---

## 6. Balance probes

_Stripped pending validator (OL-809) and Pass-1 reground (OL-810). Confident numbers here were unsourced; restore via citations or `aspirational — pending implementation` tag once those subtasks land._

---

## 7. Sim assertions

_Stripped pending validator (OL-809) and Pass-1 reground (OL-810). Confident numbers here were unsourced; restore via citations or `aspirational — pending implementation` tag once those subtasks land._

---

## 8. Content sketch

- **Resources:** 2 — build currency (per-run, resets on stage entry) + optional meta-currency (cross-run, `persistent` when `prestigeMode !== 'none'`).
- **Producers / Activities:** 4 tower archetypes. Example naming (Tower Defense theme): archer (pierce, early-game baseline), mage (magic, armor-piercing), splash (AoE, crowd-control), support (adjacency-aura, no direct damage). Four is the Kingdom Rush baseline; BTD6 expands to 26 in commercial scale. Forks add types.
- **Upgrades / Purchasables:** 3 tiers × 4 towers = 12 tower-scoped upgrades. Each upgrade binds to one tower archetype and stacks multiplicatively into the per-tower modifier chain.
- **Progression gates:** 1 stage with ~20 waves by default (Kingdom Rush tutorial-stage scale). Stage-2+ unlocks on first clear when `prestigeMode === 'campaign'`. Meta-progression tree has 6 nodes when `prestigeMode !== 'none'`.
- **Achievements:** 0 in the skeleton — Defender does not use Achievement Systems as a mechanical multiplier (unlike Producer). Forks may add cosmetic achievements without touching the mechanical surface.
- **Enemies:** 4 archetypes — grunt (baseline), armoured (physical-resistant), fast (high speed, low HP), flying (bypasses ground routing). Four is enough to force at least two tower-type purchases per stage.

**Density target:** every beat in § 4 maps to at least one content entry above. Beat 1 → defenders. Beat 2 → enemies × stage wave 1–3. Beat 3 → upgrades × second defender type. Beat 4 → stage-clear gating. Beats 5–6 → progression (meta-currency + meta-upgrade-node).

---

## 9. UI prescription

- **Primary shell:** `` `declared invention` `` — cites `subgenre-shell-mapping-2026.md § tower-defense (N=5, N_classifiable=4)`. The TD sub-genre has a weak `single-column` tendency (Desktop Tower Defense, Gem TD — 2/4 classifiable, 50%) with high variance across the remaining rows: Kingdom Rush `free-form`, Bloons TD 6 `tabs-resource-bar`, GemCraft `ambiguous`. The methodology commentary for this row ("An archetype prescription for Defender should probably declare the canvas-centric structural primitive rather than one of the existing shell buckets") is load-bearing here — all 5 TD corpus games share a canvas-centric play surface with peripheral HUD, and none of starter's 5 shells (`SidebarMainShell`, `ThreePanelShell`, `SingleColumnShell`, `TabsBarShell`, `MultiColumnShell`) captures that. Starter's 6th audit shell `free-form` is consistently `declared invention` against starter today; the Defender primary shell graduates to starter when two independent forks converge on the same canvas+HUD geometry. Exemplar rows from `layout-audit-2026.md`: Kingdom Rush (free-form), Bloons TD 6 (tabs-resource-bar), Desktop Tower Defense (single-column), Gem TD (single-column), GemCraft (ambiguous).
- **Secondary shell:** `TabsBarShell` with `navPosition='bottom'` — the strongest partial fit in starter for the BTD6 shape (`tabs-resource-bar` in the audit: horizontal tower-category tabs docked at bottom, top HUD strip for round/lives/cash). Per `layout-audit-2026.md` BTD6 row (`mobile_aware: yes`, form-factor `responsive`). Use when a fork wants to trade the canvas-centric declared-invention primitive for a starter-supported shape. Forks following Desktop TD / Gem TD's flat-layout posture may prefer `SingleColumnShell` (the weak `tower-defense` majority, 2/4 classifiable) instead; both are legitimate partial-fit fallbacks.
- **Form-factor intent:** `responsive` — cites `layout-audit-2026.md` for BTD6 (`mobile_aware: yes`, form-factor `responsive`) and Kingdom Rush (`mobile_aware: yes`, form-factor `responsive`). The commercial TD lineage has a 2011–2012 mobile-port wave (BTD5 iOS, Kingdom Rush iOS) that established the mobile-native shape at franchise scale. GemCraft (`mobile_aware: partial`) and Desktop TD / Gem TD (`desktop`, older Flash/WC3-era substrates) anchor the desktop-capable end; the skeleton claim is responsive, not mobile-only.
- **ARIA-aligned widgets (lift targets):**
  - `Tooltip` — tower stat breakdowns on hover; enemy resistance previews. Cites `widget-vocabulary.md` Layer 1 (frequency 5).
  - `Dialog` — upgrade modal on tower tap; stage-clear summary. Cites `widget-vocabulary.md` Layer 1 (frequency 6).
  - `Toolbar` — tower-type picker strip. Cites `widget-vocabulary.md` Layer 1.
  - `Progress` — wave-progress indicator (how many enemies remain) + per-tower cooldown. Cites `widget-vocabulary.md` Layer 1.

  Lift from `@/lib` / reka-ui primitives; forks do not reimplement focus, portal, or a11y.
- **Domain widgets (per-fork implementation):**
  - placement grid — the central decision surface. Each fork renders cells, overlay path, tower instances. `declared invention` against `widget-vocabulary.md` Layer 2 — no row.
  - wave timeline — shows upcoming wave composition + countdown. `declared invention` against widget-vocabulary.
  - tower stat card — pop-up on tower selection showing damage/range/speed + upgrade affordances. Cites `widget-vocabulary.md` Layer 2 building-card analogue (frequency 4).

  Per-fork implementation — no pre-abstraction. Lift-first policy (OL-273 Phase 2): placement grids vary so much across TD games (Desktop TD open cells, Kingdom Rush discrete build spots, BTD6 continuous placement with footprint) that a shared abstraction would leak assumptions. First two converging forks trigger graduation.
- **Layout detail:** canvas or grid region fills the majority of screen; tower-type purchase toolbar docks at bottom (mobile) or right (desktop); top HUD shows currency + lives + wave counter; tower stat card modals (`Dialog`) on tower tap.
- **Nav pattern:** world-map or campaign-map as a shell-external screen (when `prestigeMode === 'campaign'`); in-stage is single-screen.
- **Declared-invention notes:** the primary canvas-centric shell is declared-invention against *starter's 5 shells*, not against the audit corpus — Batch 8 (2026-04-20) added 5 TD rows covering the lineage (see primary-shell line). The methodology commentary for the `tower-defense` sub-genre row explicitly recommends declaring the canvas-centric structural primitive rather than forcing one of the existing shell buckets; this section honors that. Graduation threshold: two independent Defender forks sharing cell-rendering + path-overlay geometry. Kingdom Rush's `free-form` audit bucket is the canonical shape the first fork would likely converge on; BTD6's `tabs-resource-bar` is the already-supported partial alternative.

---

## 10. Predicted engine gaps

| Gap | Severity | Notes |
|-----|----------|-------|
| Placement-grid primitive | Low | Per the engine ↔ game co-evolution discipline in `/work/studio/CLAUDE.md`, the grid stays consumer-layer until two independent Defender consumers converge on the same primitive shape. Phase 3b (OL-568) will sketch `grid-placement-auto-resolve` without committing the engine. |
| Wave-composition DSL ergonomics | Medium | Building a 20-wave composition by hand as `StageDef.waves` arrays is verbose. A fluent helper (`waves().tier1(3).interval(1.2).tier2(2)…`) would compress this. Measure against Tug's similar send-queue verbosity before abstracting. |
| Prestige-mode-as-data ergonomics | Low | `prestigeMode: 'none' \| 'run-reset' \| 'campaign'` toggles three structurally different run-lifecycle behaviours at the data layer. Today this means three conditional branches in whatever module consumes `DefenderProgression`. A `createPrestigeMode(kind, options)` helper could unify; defer until a second archetype (Ambient, possibly) wants the same switch. |
| Fluid-threat edge case | Low | Creeper World 4 uses fluid simulation as the threat model (creep flows volumetrically, not as discrete units traversing a path). Out-of-scope for the wave-based skeleton; a CW4-style fork would need a fluid-simulation primitive that does not exist today and is not a composable near-neighbour of `createSequencer`. Document as a boundary case, not a skeleton commitment. |
| Zone-scoped range queries at density | Medium | 20–80 tower instances × 20–80 active enemies × 30 ticks/second = 50k–200k proximity queries per second in the auto-resolve phase. `createZoneSystem` membership queries need to stay correct and fast here; the first Defender fork should profile. If slow, a zone-index helper (`queryInRange(cell, radius)`) may want to graduate. |

Convergent-gap rule: N/A — no live consumers yet. All gaps are hypotheses the first fork confirms or rejects.

---

## 11. Themes

### Theme A — Tower Defense

- **Hook:** The classic. Fantasy or generic-military towers defending a keep from waves of orcs, goblins, trolls.
- **Resource mapping:** build currency = gold; meta-currency = stars; defenders = [archer, mage, cannon, barracks]; enemies = [orc, fast-goblin, troll, wyvern (flying)]; stages = named kingdom regions.
- **Narrative framing:** minimal — stage-intro flavour cards, nothing more.

### Theme B — Lab Defense

- **Hook:** You run a research facility. The specimens broke containment. Turrets, EMPs, and flamethrowers hold the line while you patch the door.
- **Resource mapping:** build currency = power cells; meta-currency = research points; defenders = [auto-turret, EMP-pylon, flamer, repair-drone]; enemies = [slime-specimen, crawler, ravager, pterodactyl-class-Δ]; stages = facility levels (Sub-Basement, Bio-Wing, etc.).
- **Narrative framing:** light — incident-report copy between stages; stage 5 ending hints at the cause of the breach.

### Theme C — Garden Defense

- **Hook:** A garden besieged by pests. Plants grow in beds, spit seeds, release spores. Cozy aesthetic; low-saturation palette.
- **Resource mapping:** build currency = sunlight; meta-currency = heirloom seeds; defenders = [seed-shooter, spore-cloud, thornwall, companion-herb (adjacency-aura)]; enemies = [aphid, caterpillar, mole, bird (flying)]; stages = garden beds (Vegetable, Herb, Flower, Orchard).
- **Narrative framing:** none — the aesthetic is the story.

### Theme D — Dungeon Lord

- **Hook:** Role inversion. You are the dungeon; the waves are heroes invading. Towers are traps, monsters, and spike pits defending your boss chamber.
- **Resource mapping:** build currency = dark mana; meta-currency = soul stones; defenders = [spike-trap, goblin-warren, dragon-perch, shadow-altar (aura)]; enemies = [peasant-hero, knight, paladin, archmage]; stages = dungeon levels (Cavern, Crypt, Inner Sanctum, Throne Room).
- **Narrative framing:** comedic — hero's-perspective loot lists on defeat, dungeon-lord monologue on victory.

### Theme E — Orbital Defense

- **Hook:** A space station at the frontier. Waves of asteroids, pirate ships, and hostile-fauna-capsules. The grid is the station's exterior plating.
- **Resource mapping:** build currency = reactor energy; meta-currency = supply credits; defenders = [kinetic-turret, beam-lance, mine-dropper, shield-projector]; enemies = [asteroid-shard, raider, hive-drone, xenoform (flying)]; stages = station sectors (Fore, Port, Starboard, Aft).
- **Narrative framing:** minimal — station-log entries between stages.

---
