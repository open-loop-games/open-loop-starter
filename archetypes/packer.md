# Archetype: Packer

> **One-line identity:** Placement-Adjacency + Upgrade Tree + Resource Accumulation — arrange a bounded grid so neighbour relationships carry the synergy, then watch auto-resolve score your arrangement.
>
> **Status:** `candidate`

**Exemplars (validation, not clone targets):** [Backpack Battles](../../open-loop-research/analyses/complete/backpack-battles-analysis.md) (pure-form 2D tetris-inventory, 37k Steam peak, 2024–25 flagship), [GemCraft](../../open-loop-research/analyses/complete/gemcraft-analysis.md) (Defender × Packer hybrid; shape-fit + gem-assignment; Flash 2008, Steam 2015), [Gem TD](../../open-loop-research/analyses/complete/gem-td-analysis.md) (WC3 UMS ~2003; origin of the 18-year lineage; Defender × Packer hybrid), [Industry Idle](../../open-loop-research/analyses/complete/industry-idle-analysis.md) (same-type adjacency bonus on a building grid; Variation 1 of the pattern), [Super Auto Pets](../../open-loop-research/analyses/complete/super-auto-pets-analysis.md) (1D degenerate case; dual-cover with OL-578 Auto-battler). Additional Placement-Adjacency exemplars in LIBRARY: `incrielemental` (aura projection), Primordia (row/column grid multiplier), Ballionaire (physics-adjacent form).

**Live consumer references (engine-usage grounding):** none in the ecosystem today. The first Packer fork will confirm whether the grid-state-plus-synergy-scoring ceremony stays ergonomic at real consumer scale, or pressure-tests the `grid-placement-auto-resolve` substrate OL-568 parked as `TODO(expansion)` (§ 10). Auto-battler (OL-578) is the shared-substrate-but-distinct sibling; the two docs' § 2 paragraphs reciprocate the contrast per taxonomy § 3A.

---

## 1. Player experience

Packer is the archetype of *arranging a bounded space so that position becomes power*. You acquire items — gems, inventory pieces, crafting components — and you place them inside a fixed grid. Each placement is a small decision about what sits next to what; the synergy is never in the item alone but in the shape its neighbours make. You hover an item over an open cell and the board lights up showing "+30% from three matching neighbours"; you try another cell and the bonus halves. You rotate a tetromino shape to fit it against the chain you already built, or you stop, sell one item back, and rearrange three others because you just noticed the better layout. The texture of play is *spatial hypothesis* — a quiet puzzle surface that rewards looking before committing, and where the combat or production tick that follows is the score.

A thirty-minute session is one full run — arrange, resolve, adjust, repeat for six to twelve rounds depending on sub-variant. The signature moments are the compositional discoveries: the first time a neighbour bonus multiplies unexpectedly, the first combine-up that merges two lesser items into a qualitatively new form, the first wave (in Defender-hybrid variants) that wipes because the arrangement failed and you see exactly which cell was wrong. The long-term pull is the solution space: every new item acquired opens new arrangements, and the item pool is large enough that exhaustive search is impractical — players genuinely encounter combinations that nobody documented. The player role is *arranger*, not architect (that's Defender) and not participant (that's Survivor).

---

## 2. Pattern composition

**Required patterns:**

- [Placement-Adjacency](../../open-loop-research/patterns/tier-4-specialized/placement-adjacency.md) — the headline pattern. Packer is the fullest realization: neighbour relationships *are* the mechanical weight. LIBRARY Variations 1 (same-type adjacency bonus), 3 (shape-fit / gem-assignment), and 4 (inventory-grid tetris packing) each map to a `spatialMode` structural fork. Per the pattern doc's own note, "Packer represents the pattern's fullest realization" — this archetype is the primary consumer.
- [Progression Systems](../../open-loop-research/patterns/tier-0-universal/progression-systems.md) — item-tier / gem-grade ladder + combine-up. Three copies of the same item (SAP, Auto-battler lineage), two mid-grade gems merging to a super-gem (GemCraft), or an item-upgrade path driven by duplicates is the primary vertical. Orthogonal to the spatial axis: you escalate item power *and* rearrange the board.
- [Resource Accumulation](../../open-loop-research/patterns/tier-0-universal/activity-systems/) — currency for acquisition, often with shop rerolls and a small per-round interest mechanic. Funds the acquisition loop that feeds the grid; unlike Auto-battler, the pool is typically private (Backpack Battles) or drop-based (GemCraft gem drops) rather than shared-pool-with-rerolls. Activity Systems engage the shop-interaction variation.

**Cross-pattern properties engaged:**

- [Modifier Chains](../../open-loop-research/patterns/cross-pattern-properties/modifier-chains.md) — per-item damage / output compounds base × item-grade × per-neighbour × named-adjacency × hero/character-bonus. A mature Backpack Battles build stacks 4–6 factors per item; the modifier chain is the archetype's dominant engine stress (alongside grid-state invalidation on swap).
- [Scaling Formulas](../../open-loop-research/patterns/cross-pattern-properties/scaling-formulas.md) — wave-HP escalation (Defender-hybrid variants: GemCraft, Gem TD) and opponent-HP attrition (Backpack Battles PvP ladder) are two distinct families; per-neighbour bonus magnitudes are the third scaling family and the one that converges fastest to game-breaking if mis-tuned.
- [Cost Scaling](../../open-loop-research/patterns/cross-pattern-properties/cost-scaling.md) — item purchase costs escalate per tier, reroll costs escalate per reroll within a round, combine-up costs scale per level. Three cost curves operate in parallel and must stay in tune with per-round gold income.
- [Quantity Tracking](../../open-loop-research/patterns/cross-pattern-properties/quantity-tracking.md) — per-cell occupant, per-item neighbour count, per-item grade, rounds won/lost, items combined, synergies discovered. The grid state is itself a quantity surface (occupant identity + position) that serialises into save.

**Optional modifiers (fork may add):**

- **Defender-hybrid substrate** — `combatSubstrate: 'wave-defender'`. Places the Packer grid on top of a Defender wave-pacing skeleton. GemCraft / Gem TD are the canonical exemplars: gems occupy tower slots or amplifier cells, and each wave's enemies walk a fixed or maze-built path past whatever the arrangement has committed. Adds `createZoneSystem` (stage topology) + wave composition on top of the base Packer grid. Not a collapse to Defender — Placement-Adjacency remains the primary decision surface; wave pacing is the pressure-test that reads grid state.
- **PvP-auto-resolve** — `combatSubstrate: 'pvp-auto-resolve'`. Backpack Battles shape: two packed grids fight each other, with opponent selection from a live snapshot pool. Adds opponent-matching + HP-ladder attrition on top of the base Packer grid. Distinct from Auto-battler's shared-pool draft because the acquisition pool is private.
- **Physics-adjacency** — Ballionaire's bounce-chaining, Crush the Castle's projectile-placement. Boundary case: the spatial substrate is continuous physics rather than discrete grid state. `spatialMode: 'physics-adjacent'` is a fork modifier; the engine stress diverges enough (physics simulation vs `RecalculateAuras`-style scan) that most of this doc's § 3 primitives do not apply. Documented for completeness, not recommended as a skeleton commitment.
- **Item-roster meta-progression** — `metaUnlockMode: 'per-hero' | 'item-pool' | 'stage-roster'`. Backpack Battles gates items by hero unlock (Reinhardt vs Ranger shop biases); GemCraft gates gem slots / amplifier grades by campaign node. Composes `createAchievementCategory` for unlock triggers + `createPurchasableCategory` for meta-shop.
- **Challenge / weekly-seed variants** — hero / seed / item-pool challenges with unique scoring. Backpack Battles' weekly challenges are the canonical example; composes `createChallengeCategory` without touching the skeleton's core loop.

**Boundary: Packer ↔ Auto-battler.** Packer and Auto-battler share the `grid-placement-auto-resolve` substrate (taxonomy § 3A) but are distinct archetypes across three load-bearing axes: acquisition model (crafting from components / drop-based accretion / private shop vs shared-pool draft with gold-interest rerolls), synergy model (shape-and-adjacency geometry vs class/trait membership counted over the roster), and temporal model (craft-then-deploy, often wave-paced rather than round-timed vs round-timer-gated prep/combat alternation with an interest-bearing economy between rounds). Their historical lineages are fully disjoint: Packer traces 22 continuous years (Gem TD, WC3 ~2003 → Backpack Battles, Steam 2025); Auto-battler was nonexistent before January 2019's Dota Auto Chess single-point origin. Two genres that predate each other's existence by 16 years are not variants of the same idea. Super Auto Pets sits at the boundary — its 1D slot-ordering is a degenerate Packer spatial case *and* its shop/tier-gate economy is Auto-battler-native; both archetypes cite it legitimately with clearly-labelled subsections (SAP analysis §§ "5-Slot Team as 1D Grid" / "Shop Phase + Combat Phase Alternation"). See `open-loop-research/reports/studies/arcade-market-archetypes/arcade-market-archetypes-taxonomy.md` § 3A for the authoritative separation argument; `auto-battler.md` § 2 carries the reciprocal paragraph pointing back here.

**Novel-patterns cluster alignment:** n/a — Packer is a crystallised composition of LIBRARY-established patterns (Placement-Adjacency as the headline sub-split of v4 Cluster 7b, plus Progression + Resource Accumulation as constituent tiers). The `novel-patterns-synthesis-v4.md` Cluster 7b (spatial-as-mechanic) is what Placement-Adjacency *sub-splits from* — Packer *consumes* that cluster rather than defining it, per the pattern file's own framing. Follow-up (#1): file a LIBRARY engine-mapping-table update so Placement-Adjacency (P-PADJ) appears alongside Routing-Traversal when the table next refreshes.

---

## 3. Engine surface

| Layer | Primitive | Role in this archetype |
|-------|-----------|------------------------|
| core | `createResource` | Acquisition currency (gold, mana, crafting components); per-cell occupant state (wrapping item-instance refs as persistent reactive values); player HP or fortress HP depending on `combatSubstrate`. |
| core | `createModifierChain` | Per-item output chain: base × grade × per-neighbour × named-adjacency × character/hero-bonus. Compose synergy bonuses into a single output multiplier per occupant. |
| core | `createAdditiveModifier` | Per-neighbour flat contribution — each matching adjacent cell adds a fixed delta to the occupant's chain. |
| core | `createMultiplicativeModifier` | Item-grade and aura multipliers that multiply rather than add (GemCraft's gem-grade effect curves; Backpack Battles' "doubles damage" named synergies). |
| core | `createSequencer` | Wave/round pacing. Fires wave composition (Defender-hybrid), round-timer transitions (PvP-auto-resolve), and combat tick in the resolve phase. |
| core | `persistent` | Grid-state serialisation — per-cell occupant identity + position + orientation. Required across rounds and across save/load. |
| core | `createPolynomialFormula` | Item-cost and upgrade-cost curves; wave-HP curves in Defender-hybrid variants. |
| systems | `createSpatialGrid` | Grid topology + Moore-neighbourhood queries. The structural half of the `grid-placement-auto-resolve` substrate (per OL-568 verification). Stores cell occupancy; the synergy-scoring function reads this each resolve. |
| systems | `createInventory` | Acquisition-side occupant management for Backpack-shaped variants — items enter the inventory on buy, the player drags them into grid slots, sold items leave. Structural complement to `createSpatialGrid` for 2D-tetris variants; per OL-568 § 3.2 the better structural base for Backpack-shaped forks. |
| systems | `createSlot` | 1D-slot (`spatialMode: '1d-slot'`) variants treat the board as a fixed-size ordered sequence rather than a 2D grid. SAP's 5-slot team, the pet bench in Auto-battler variants, and weapon-loadout slots for Packer variants that don't use 2D geometry. |
| systems | `createPurchasable` + `createPurchasableCategory` | Shop / drop-pool items; crafting recipes as purchasables whose cost is components rather than currency. |
| systems | `createZoneSystem` | Stage / campaign topology (GemCraft campaign mode; Gem TD map stages). Only required when `combatSubstrate === 'wave-defender'` and the fork wants stage progression; pure PvP-auto-resolve forks skip. |
| systems | `createReset` | Run-end reset for PvP-auto-resolve + roguelite variants (Backpack Battles run completion); stage-clear reset for Defender-hybrid variants. |
| systems | `createAchievementCategory` | Unlock-cascade — per-build achievements (max synergy reached, perfect combine chain, specific named-adjacency triggers) that gate hero / stage / item-pool unlocks. |
| systems | `createChallengeCategory` | Optional weekly / seeded / hero-locked challenges (Backpack Battles weekly; GemCraft trial-mode variants). Fork-level add; not a skeleton commitment. |
| harness | `runHeadless` | Beat-timing sim tests — first combine-up lands in target window, first synergy discovery fires within tolerance, first round completion lands in target window. |
| harness | `runMatrix` | Robustness probes across per-neighbour-bonus magnitude, grid-size, and item-pool-depth axes. |

**Engine systems explicitly not used (required):**

- `createSkillCategory` — Packer's within-run vertical comes from item-grade / combine-up via `createPurchasable` + consumer-side progression loops, not from a skill/ability ladder. Forks that add per-hero skill trees (Backpack Battles' hero-specific passive trees) layer `createSkillCategory` on top as an optional modifier; the skeleton stays off it.
- `createLoop` — round / wave pacing comes from `createSequencer` firing at round-end boundaries (PvP-auto-resolve) or wave-interval boundaries (Defender-hybrid), not from a free-running tick loop. Between rounds/waves the game is quiescent by design; the player's arrangement decision is the bottleneck.
- `createRetentionPolicy` — cross-round persistence lives in `persistent` refs with explicit carry-over rules at the consumer layer (gold persists with interest; items reset unless locked). A declarative retention policy could compress Auto-battler's interest mechanic more than Packer's; noted as a potential convergent gap with OL-578 (§ 10).

**Refused primitive (does not exist, not filed).** The most intuitive fit for Packer would be a dedicated grid-placement-auto-resolve primitive — call it createPlacementResolver or createGridSystem — taking a grid, a synergy-scoring function, and a round-phase hook, and emitting a bonus map on each resolve. OL-568 investigated and decided **zero new primitives**: `createSpatialGrid` + `createInventory` + `createSlot` cover the structural grid half, and the synergy-scoring function stays as pure consumer-side code (the Industry Idle / `RecalculateAuras` shape documented in the Placement-Adjacency pattern file § Engine Posture v1). The refused primitive is parked as a `TODO(expansion)` marker at two call-sites (`open-loop-engine/src/core/spatial/grid.ts` near `createSpatialGrid`, and `open-loop-engine/src/systems/inventory.ts` near `createInventory`) per OL-568 § 3.3. Zero current engine consumers exist for either Packer or Auto-battler; the extraction forcing function waits for two independent hand-rolled wrappers to converge. Auto-battler (OL-578) refuses the same primitive under its own parameterisation; see `auto-battler.md` § 3 for the twin refusal. Every primitive named in the § 3 table resolves in `open-loop-engine/docs/api/INDEX.md`.

**Primary stress axes:**

1. **Grid-state invalidation on swap.** Placing, removing, or swapping an occupant triggers re-evaluation of every cell in the new occupant's Moore neighbourhood *and* every cell in the old occupant's former neighbourhood. At Backpack Battles density (~48–80 cells, 20–40 occupied, 4–6 synergy factors per occupant) the swap-update surface is load-bearing; `createSpatialGrid` must report neighbourhood deltas cheaply and `createModifierChain` must re-resolve only the affected chain without walking unrelated chains.
2. **Synergy-scoring function over the full grid.** Each resolve pass reads the entire grid and computes per-cell bonus contributions. `createSpatialGrid`'s neighbourhood query + consumer-side pure-function scoring must stay correct at maximum density (all cells occupied with same-type) and return within a frame budget on a consumer-grade machine.
3. **Modifier-chain fan-out under combine-up.** Combine-up merges N copies into a higher-tier occupant whose chain has new factors (named-adjacency triggers, aura radius increases, per-tier multiplicative jumps). The chain surface grows mid-run; `createModifierChain` must accept dynamic chain composition without re-keying existing modifiers or invalidating downstream consumers.
4. **Shop / drop-pool generation under seed + filter state.** The shop offers N items drawn from a weighted pool, filtered by hero-affinity and already-owned state, seeded for reproducibility. `createPurchasableCategory` + ad-hoc filtering + pool-weighting logic must stay correct as the pool shrinks through the run and as filter state evolves with the player's loadout.

---

## 4. Beat map

_Stripped pending validator (OL-809) and Pass-1 reground (OL-810). Confident numbers here were unsourced; restore via citations or `aspirational — pending implementation` tag once those subtasks land._

---

## 5. Data shape

Packer's content lives under `src/archetypes/packer/data/` as flat typed-array exports (`items.ts`, `enemies.ts`, `shop.ts`, `progression.ts`, `upgrades.ts`) plus a `types.ts` that names the definition interfaces. Item shape footprints, neighbour-bonus rules, combine-up recipes, and synergy predicates colocate with their definitions — no separate effect tables, no codegen. Lens discipline is enforced by comment sections inside each data file (`// ─── Skeleton ───`, `// ─── Balance ───`, `// ─── Costume ───`): skeleton counts (item-pool size, grid dimensions, `spatialMode`, `combatSubstrate`, `prestigeMode`) are fork-of-skeleton decisions; balance constants (per-neighbour bonus magnitudes, combine-up XP curve, shop costs, wave HP scaling when applicable) are the tuning surface sim tests probe; costumes (item names, flavour copy, gem/item visual theme) are theme-scoped.

```ts
// data/types.ts — typed definitions

export type SpatialMode =
  | '2d-inventory'       // Backpack Battles — 2D grid with heterogeneous footprints + rotation
  | '1d-slot'            // SAP / Auto-battler bench — single ordered sequence
  | 'gem-assignment';    // GemCraft / Gem TD — items assigned to typed slots (tower/amplifier/trap)

export type CombatSubstrate =
  | 'none'               // score-only resolve; Industry Idle building-grid form
  | 'wave-defender'      // GemCraft / Gem TD — enemies traverse a path past the arrangement
  | 'pvp-auto-resolve';  // Backpack Battles — two arrangements fight; HP-ladder attrition

export type PrestigeMode = 'none' | 'run-reset' | 'campaign';

export type ItemCategory = 'weapon' | 'armor' | 'trinket' | 'consumable' | 'gem' | 'utility';

export type SynergyPredicate =
  | { kind: 'same-category'; category: ItemCategory }
  | { kind: 'same-type'; itemId: string }
  | { kind: 'same-colour'; colour: string }           // GemCraft shape
  | { kind: 'named-pair'; neighbourItemId: string }   // named-adjacency bonus
  | { kind: 'any-occupied' };                         // any adjacent filled cell

export interface ItemDef {
  id: string;                               // stable; used as save key
  name: string;                             // costume
  category: ItemCategory;
  /**
   * 2D footprint as a list of occupied offsets from the item's anchor cell.
   * Single-cell items: [[0, 0]]. L-shaped 3-cell: [[0, 0], [1, 0], [1, 1]].
   * Only consulted when `SpatialMode === '2d-inventory'`. For '1d-slot' the
   * item implicitly occupies one slot; for 'gem-assignment' the item is
   * assigned to a typed slot and carries no grid footprint.
   */
  footprint: Array<[number, number]>;
  /** Base output the item contributes at grade 1 with no neighbour bonuses. */
  baseOutput: {
    damagePerTick?: DecimalSource;          // wave-defender + pvp-auto-resolve
    goldPerTick?: DecimalSource;            // build / income grids (Industry Idle form)
    healPerTick?: DecimalSource;
    scoreContribution?: DecimalSource;      // 'none' substrate
  };
  /**
   * Neighbour-bonus rules. Each rule fires when the predicate matches against
   * an adjacent occupant and applies its bonus to this item's modifier chain.
   */
  adjacencyRules: Array<{
    predicate: SynergyPredicate;
    bonus: { damageMul?: DecimalSource; outputMul?: DecimalSource; flatDamage?: DecimalSource };
    /** Maximum neighbours counted for this rule (diminishing-returns cap; default 4). */
    maxStack?: number;
  }>;
  /** Combine-up recipe. N copies at grade K merge into a single occupant at grade K+1. */
  combineRule?: {
    copiesRequired: number;                 // typically 3
    maxGrade: number;                       // typically 3 (gem-assignment may go higher)
    /** Per-grade multiplier on baseOutput + chain. */
    gradeMultiplier: DecimalSource[];       // length = maxGrade (delta from grade 1)
  };
  /** Acquisition cost in gold/currency at shop tier 1. */
  baseCost: DecimalSource;
}

export interface EnemyDef {
  id: string;
  name: string;                             // costume
  baseHp: DecimalSource;                    // multiplied by wave/round HP curve
  baseSpeed: number;                        // cells per second (wave-defender only)
  /** Wave / round index at which this enemy first appears. */
  unlockRound: number;
  bounty: DecimalSource;                    // currency on kill (wave-defender) or HP damage on defeat (pvp-auto-resolve)
}

export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  /** Scope: archetype upgrade (applies to a category) or per-item (binds to one itemId). */
  scope: { kind: 'category'; category: ItemCategory } | { kind: 'item'; itemId: string };
  tier: 1 | 2 | 3;
  cost: DecimalSource;
  effect: { outputMul?: DecimalSource; adjacencyRadiusMul?: DecimalSource; bonusMul?: DecimalSource };
}

export interface ShopConfig {
  /** Number of slots presented per round. Scales up with shop tier. */
  slotsPerRound: number[];                  // indexed by shop tier; length = max shop tier
  /** Reroll cost in gold; escalates within a round. */
  rerollCostSchedule: DecimalSource[];      // [1st reroll, 2nd, 3rd, …]
  /** Sell value as fraction of purchase price. */
  sellValueFraction: DecimalSource;         // default 0.5
  /** Per-round interest on unspent gold. Typically small or zero — Auto-battler's
      interest mechanic is the distinguishing economic axis, absent in most Packer
      variants. Some forks (Backpack Battles interest) include a small variant. */
  interestPerUnit?: DecimalSource;          // gold earned per N unspent gold
  interestCap?: DecimalSource;              // max interest per round
}

export interface RoundEscalation {
  /**
   * Round-indexed HP-curve (wave-defender + pvp-auto-resolve variants).
   * Length = max round / wave count.
   */
  hpCurve: DecimalSource[];
  /** Per-round gold income schedule. */
  goldPerRound: DecimalSource[];
  /** Starting gold at run start. */
  startingGold: DecimalSource;
  /**
   * Wave composition — only consulted when `combatSubstrate === 'wave-defender'`.
   * Outer index: wave. Inner: enemies + counts + spawn interval.
   */
  waves?: Array<{ enemyId: string; count: number; spawnIntervalSec: number }>[];
}

export interface PackerBalance {
  /** Grid dimensions when `spatialMode === '2d-inventory'`. */
  gridRows: number;
  gridCols: number;
  /** Slot count when `spatialMode === '1d-slot'`. */
  slotCount?: number;
  /** Typed slot count + types when `spatialMode === 'gem-assignment'`. */
  assignmentSlots?: Array<{ type: string; count: number }>;
  /** Per-neighbour bonus stacking mode — primary balance lever. */
  adjacencyStackMode: 'additive' | 'multiplicative';
  /** Default maximum neighbours counted per adjacency rule (rule-level override possible). */
  defaultMaxStack: number;
  /** Combine-up XP curve — how many copies required for grade N. */
  combineCopiesByGrade: number[];           // [grade 1 → 2, grade 2 → 3, …]
  /** Shop tier unlock schedule — what round unlocks shop tier K. */
  shopTierUnlockRound: number[];
}

export interface PackerProgression {
  /** Structural fork. Editing this changes the grid-placement topology. */
  spatialMode: SpatialMode;
  /** Structural fork. Editing this changes the resolve-phase substrate. */
  combatSubstrate: CombatSubstrate;
  /** Structural fork. Editing this changes run-lifecycle + meta-persistence. */
  prestigeMode: PrestigeMode;
  /** Meta-progression node count. 0 when prestigeMode === 'none'. */
  metaUpgradeNodeCount: number;
  /** Hero / character roster size. 1 when the archetype ships without hero selection. */
  heroCount: number;
}

export interface PackerData {
  items: ItemDef[];
  enemies: EnemyDef[];                      // empty array when combatSubstrate === 'none' || 'pvp-auto-resolve'
  upgrades: UpgradeDef[];
  shop: ShopConfig;
  rounds: RoundEscalation;
  progression: PackerProgression;
  balance: PackerBalance;
}
```

**Override semantics:** `boot.ts` exports `createPackerEngine(overrides?)` that accepts a flat-category deep-partial — `{ items?, enemies?, upgrades?, shop?, rounds?, progression?, balance? }` — with per-entity replacement keyed by `id` and deep-merge over shop / rounds / progression / balance. Sim tests and workbench perturbation route through this factory. The addressable shape *is* the TypeScript type over the data; there is no synthetic vars layer and no codegen round-trip.

**Archetype code lives in** `src/archetypes/packer/` as its own colocated tree (`data/`, `modules/`, `composables/`, `ui/`, `sim/`, `boot.ts`). See `open-loop-starter/CLAUDE.md § Archetype convention`.

---

## 6. Balance probes

_Stripped pending validator (OL-809) and Pass-1 reground (OL-810). Confident numbers here were unsourced; restore via citations or `aspirational — pending implementation` tag once those subtasks land._

---

## 7. Sim assertions

_Stripped pending validator (OL-809) and Pass-1 reground (OL-810). Confident numbers here were unsourced; restore via citations or `aspirational — pending implementation` tag once those subtasks land._

---

## 8. Content sketch

- **Resources:** 3 — gold / currency (per-run, resets on run end when `prestigeMode !== 'none'`), HP (per-run, loss condition for pvp-auto-resolve and wave-defender variants), meta-currency (cross-run, `persistent`, only when `prestigeMode !== 'none'`). Optional 4th: crafting components (gem colour + grade, armor / weapon material) for `spatialMode === 'gem-assignment'` variants.
- **Items (the archetype's primary content axis):** 12 item archetypes at skeleton density — enough to force real compositional choice, small enough to fit one session's first exposure. Example naming (Fantasy Adventurer theme): iron-sword (1×3 weapon, +damage per adjacent weapon), round-shield (2×2 armor, +HP per adjacent armor), crystal-gem (1×1 utility, colour-chain named-pair), healing-potion (1×2 consumable, triggers on-kill), ruby-ring (1×1 trinket, multiplicative damage aura radius 1), leather-armor (2×3 armor, flat HP), composite-bow (1×3 weapon, bonus per adjacent trinket), enchantment-tome (2×2 utility, buffs adjacent weapons), stamina-flask (1×1 consumable, regens on-hurt), kite-shield (2×2 armor, blocks first hit), amulet-of-might (1×1 trinket, +all-damage), spiked-gauntlets (1×2 weapon, counter-damage). Twelve supports 4–5 named-adjacency combinations and one combine-up chain per category.
- **Upgrades / Purchasables:** 3 tiers × 6 categories = 18 category-scoped upgrades + one per-item upgrade-path per combine-up-eligible item. Each upgrade targets a category (e.g., "+20% damage to all weapons") or a specific item (e.g., "iron-sword grade 2"). Shop tier gates release higher-tier upgrade availability per round.
- **Progression gates:** shop tier 1–5 unlocked by round 1 / 3 / 5 / 7 / 9 (scaling curve lifted from SAP's reference schedule). Campaign stages (when `prestigeMode === 'campaign'`) 4–8 stages. Hero roster (when `heroCount > 1`) 3 heroes at skeleton density.
- **Enemies / Opponents:** 5 enemy archetypes for `combatSubstrate === 'wave-defender'` — grunt, fast, armoured, flying, boss. Empty roster for `'none'` and `'pvp-auto-resolve'` (opponent selection reads a snapshot pool rather than enumerated types).
- **Achievements:** 0 in the skeleton as mechanical multipliers — the unlock cascade (hero / item-pool / stage-roster unlocks gated by in-run triggers) *is* the archetype's achievement surface. Forks may add cosmetic achievements separately.

**Density target:** every beat in § 4 maps to at least one content entry. Beat 1 → items × shop (first purchase). Beat 2 → items (adjacency rules). Beat 3 → round-escalation wave / opponent. Beat 4 → items × upgrades (combine-up recipe). Beat 5 → items × named-adjacency synergy (compositional discovery). Beat 6 → enemies / opponents × round-escalation (HP curve forcing re-optimisation). Beat 7 → meta-progression (hero / item-pool / campaign-node unlock).

---

## 9. UI prescription

- **Primary shell:** `` `declared invention` `` — central grid-with-peripheral-HUD layout per `subgenre-shell-mapping-2026.md § auto-battler (N=3, N_classifiable=3)` read through the Packer archetype lens. The audit has no `packer` / `placement-puzzle` sub-genre row; Backpack Battles (the flagship Packer) is classified under `auto-battler` with `free-form` shell, and Gem TD (the lineage origin) sits under `tower-defense` with `single-column`. The auto-battler sub-genre commentary ("An archetype prescription for Auto-battler should probably lead with the central-grid + peripheral-panel primitive") applies equally to Packer: the defining visual shape is a central placement grid with peripheral shop / synergy / HP panels, and none of starter's 5 shells (`SidebarMainShell`, `ThreePanelShell`, `SingleColumnShell`, `TabsBarShell`, `MultiColumnShell`) captures it. Starter's 6th audit shell `free-form` is consistently `declared invention` against starter today. Graduation threshold: two independent Packer forks converging on the same grid-centric + peripheral-panel geometry. Exemplar rows from `layout-audit-2026.md`: Backpack Battles (free-form; central backpack grid, synergy-highlight indicators, combat-phase side-by-side grids), Gem TD (single-column; map-as-inventory visualisation, tower-slot grid on map = portfolio), Super Auto Pets (single-column; 1D pet-slot row with shop row), GemCraft (ambiguous — prose describes gem-combining UI + amplifier spatial-bonus visualisation without explicit shell naming).
- **Secondary shell:** `SingleColumnShell` — cites `layout-audit-2026.md` for Gem TD (`single-column`; map-centric UMS with tower-slot grid + resource bar) and Super Auto Pets (`single-column`; narrow-viewport pet row + shop row stacking). The strongest partial fit in starter for forks that collapse peripheral panels into a stacked column (viable for `spatialMode === '1d-slot'` or narrow-viewport variants). Forks following the 2D-inventory pure-Packer form will almost always prefer the declared-invention primary; the single-column fallback serves degenerate-case (1D-slot) or narrow-viewport needs.
- **Form-factor intent:** `responsive` — cites `layout-audit-2026.md` for Backpack Battles (form-factor `desktop`, `mobile_aware: unknown`) and Gem TD (`desktop`, WC3 native), with Super Auto Pets' cross-platform confirmed ports (iOS/Android/Steam) anchoring the mobile-native end through the dual-cover analysis (OL-577/OL-578). The 2D-inventory pure-Packer form is pointer-primary on desktop (drag-and-rotate interactions assume a pointer); 1D-slot variants and touch-primary forks adopt SAP's mobile precedent. Responsive is honest here because the three exemplar sub-types (2D-inventory / 1D-slot / gem-assignment) have different form-factor commitments; skeleton stays accommodating. Mobile-first variants of the 2D-inventory form carry a `` `declared invention` `` flag on the form-factor choice (no direct corpus precedent for touch-primary tetris-inventory packing beyond Backpack Battles mobile port rumours).
- **ARIA-aligned widgets (lift targets):**
  - `Tooltip` — per-item stat breakdowns on hover / long-press; adjacency-rule previews ("gains +2 damage when adjacent to any Weapon"); combine-up recipe preview. Cites `widget-vocabulary.md` Layer 1 (frequency 5).
  - `Dialog` — combine-up confirmation modal, shop-reroll modal, run-complete / wave-clear summary, hero-select between runs. Cites `widget-vocabulary.md` Layer 1 (frequency 6).
  - `Toolbar` — item-category filter strip for shop, hero-select toolbar. Cites `widget-vocabulary.md` Layer 1.
  - `Progress` — wave-progress indicator (wave-defender); HP bar (pvp-auto-resolve + wave-defender); per-item cooldown indicators when `combatSubstrate !== 'none'`. Cites `widget-vocabulary.md` Layer 1 (frequency 12).
  - `Toast` — item-acquired / combine-up-triggered / adjacency-discovered notifications. Cites `widget-vocabulary.md` Layer 1 (frequency 3).

  Lift from `@/lib` / reka-ui primitives; forks do not reimplement focus, portal, or a11y.
- **Domain widgets (per-fork implementation):**
  - placement grid / fixed slots — the archetype's central decision surface. Cites `widget-vocabulary.md` Layer 2 (frequency 5; Batch 8 promotion; spans Packer + Auto-battler + Cycler). Dota Auto Chess's hex grid, Backpack Battles' 2D tetris grid, SAP's 1D slot row, Thronefall's building-slot indicators, Gem TD's map-as-inventory visualisation are the five corpus rows — five distinct geometries arguing against pre-abstraction. Per-fork implementation.
  - synergy indicator / composition feedback — hover-cell preview showing which neighbour bonuses would activate; named-adjacency chain visualiser. Cites `widget-vocabulary.md` Batch 8 Appendix (frequency 2: Dota Auto Chess, Backpack Battles; below ≥3 threshold). `` `declared invention` `` against a named widget entry — observed in the two flagship exemplars but not corpus-promoted. Load-bearing for the Placement-Adjacency pattern's Legibility force; forks must implement even if the widget doesn't formally exist in the vocabulary.
  - item card — item detail popover showing footprint preview, stat breakdown, adjacency rules, cost, grade. Cites `widget-vocabulary.md` Layer 2 building-card analogue (frequency 4).
  - level-up choice cards (3–4 option modal) — optional; fires on combine-up or on shop-tier advancement in some Packer variants that mirror Survivor's choice-pool UX. Cites `widget-vocabulary.md` Layer 2 (frequency 3; Batch 8 promotion; cross-archetype Survivor + Auto-battler).
  - HP / integrity bar — run loss-condition readout for `pvp-auto-resolve` + `wave-defender` substrates. Cites `widget-vocabulary.md` Layer 2 match HP bar (frequency 4; Batch 8 promotion).

  Per-fork implementation — no pre-abstraction. Lift-first policy (OL-273 Phase 2): the five `placement grid / fixed slots` corpus geometries are too divergent for a shared abstraction. First two converging Packer forks with the same geometry (e.g., two 2D-tetris implementations) trigger graduation.
- **Layout detail:** central grid region fills the majority of the main surface (desktop: centre; mobile: upper ~60%); peripheral panels flank the grid — shop / acquisition panel left (or bottom on mobile), synergy / composition readout right (or collapsible drawer on mobile), HP / wave indicator top, round / meta controls bottom. Item-drag interactions operate on the grid region; tooltip previews render above the grid on hover. Combat / resolve phase (when applicable) typically shows two grids side-by-side (Backpack Battles pvp-auto-resolve pattern) or the grid with an overlay wave visualisation (GemCraft wave-defender pattern).
- **Nav pattern:** single-screen in-run. Between-runs menu (hero select → run-stage select → campaign-map when applicable) is a separate shell-level screen and may adopt `TabsBarShell` or `SingleColumnShell` as a partial-fit. Campaign-map view (when `prestigeMode === 'campaign'`) sits outside the in-run shell, reached via main menu.
- **Declared-invention notes:** the primary central-grid shell is declared-invention against *starter's 5 shells*, not against the audit corpus — Batch 8 (2026-04-20) added 5 sub-genre rows (auto-battler, tower-defense) that cover Packer lineage exemplars. The audit has no `packer` / `placement-puzzle` sub-genre row; Packer's shell prescription reads through the auto-battler sub-genre's commentary (which explicitly names the central-grid + peripheral-panel primitive) and the tower-defense sub-genre's handling of Gem TD (single-column with map-as-inventory). Graduation threshold: two independent Packer forks sharing grid-centric + peripheral-panel geometry. Forks may also converge on declared-invention `SingleColumnShell` extensions (1D-slot variants) or on hybrid `free-form` + multi-region layouts (gem-assignment variants with distinct tower / amplifier / trap zones); each graduation path is independent.

---

## 10. Predicted engine gaps

| Gap | Severity | Notes |
|-----|----------|-------|
| `grid-placement-auto-resolve` substrate (refused primitive; see § 3) | Medium | Per OL-568 decision, zero new primitives — `createSpatialGrid` + `createInventory` + `createSlot` cover the structural grid half, and synergy-scoring stays consumer-side per the Placement-Adjacency pattern's v1 shape. `TODO(expansion)` parked at two call-sites per OL-568 § 3.3. Severity upgrades to **High** if the first Packer fork *and* the first Auto-battler fork independently hand-roll the same wrapper around `createSpatialGrid` + modifier chain + round-phase hook; convergent-rule triggers extraction (filed as a follow-up to this archetype's graduation). |
| Grid-state swap-invalidation ergonomics | Medium | Moving / rotating an occupant requires invalidating the modifier chains of every cell in both the old and new Moore neighbourhoods. Today the consumer tracks this via explicit `createSpatialGrid` neighbourhood queries on each move. A `onOccupantChange({ oldCell, newCell })` convenience callback on `createSpatialGrid` that emits the union neighbourhood would compress the wiring; defer until the first Packer fork confirms the pattern is verbose. Not blocking — the explicit wiring works today. |
| Synergy-scoring function composition | Low | Consumer-side scoring today means each archetype writes its own `RecalculateAuras`-style function, which composes per-rule predicates, stacking rules (additive vs multiplicative), and max-neighbour caps. A declarative `defineSynergyRule({ predicate, bonus, stack })` helper could unify Packer's same-category / same-type / named-pair rules; risk is over-specialisation to Packer's shape (Auto-battler's trait-threshold scoring doesn't fit the same shape). First two converging consumers trigger graduation or refusal. |
| Combine-up recipe primitive | Medium | "N copies at grade K merge into one at grade K+1 with modifier chain transform" is the archetype's second-most-common ceremony after adjacency. Today this composes `createPurchasable` (for the input occupants) + consumer-side merge logic + `createModifierChain` dynamic composition. A `createCombineRecipe({ input, grade, output, chainTransform })` helper could compress; defer until the same shape surfaces in Auto-battler (where 3-star combines are also core, per SAP + DAC). Shared across OL-577 and OL-578 — strong candidate for graduation if both archetypes' first forks use matching wiring. |
| Item-footprint packing validator | Low | 2D-inventory variants need a cheap "does this rotated footprint fit here without collision?" predicate. `createInventory` + consumer-side geometry check handles this today; a `canPlace(footprint, anchor, rotation)` helper on `createSpatialGrid` would compress. Specific to `spatialMode === '2d-inventory'`; fork-level add, not skeleton. |
| Shop / drop-pool weighted sampling | Low | Pool-weighted sampling under hero-affinity filter + already-owned-state filter + pool-tier gating is consumer-side today. `createPurchasableCategory` + ad-hoc filtering works. A `createWeightedOffer(pool, filters, weighting)` helper would compress; same shape likely surfaces in Auto-battler's shared-pool draft (though with different filter semantics — pool-scarcity rather than filter-exclusion). Cross-archetype convergent candidate. |
| Named-adjacency chain visualisation | Low | The synergy-indicator widget (§ 9) needs to render which neighbour bonuses are firing in real time as the player hovers a placement target. This is a UI-layer concern today; no engine primitive missing. Noted because the ergonomics of reading `createSpatialGrid` neighbourhood state + `createModifierChain` intermediate state into a visualiser is verbose at the consumer layer — a `snapshotScore({ candidateCell, candidateOccupant })` helper would help the UI but isn't load-bearing for correctness. |

Convergent-gap rule: N/A — no live consumers yet. All gaps are hypotheses the first Packer fork confirms or rejects. When the first Packer fork *and* the first Auto-battler fork (OL-578) both land, the shared-substrate refused-primitive and the combine-up recipe gap are the two strongest candidates to upgrade to **High** per the convergent-gap rule across OL-577 + OL-578 — both are predicted Medium at authoring in anticipation.

---

## 11. Themes

### Theme A — Fantasy Adventurer (Backpack-shaped)

- **Hook:** An adventurer packs a bag of tetris-shape weapons, armor, potions, and trinkets; neighbour bonuses let the sword cut deeper when flanked by the right companions. Direct Backpack Battles lineage; the modern 2D-tetris flagship form.
- **Resource mapping:** currency = gold; meta-currency = trophy points; HP = adventurer vitality; items = [iron-sword, round-shield, crystal-gem, healing-potion, ruby-ring, leather-armor, composite-bow, enchantment-tome, stamina-flask, kite-shield, amulet-of-might, spiked-gauntlets]; opponents = [other-adventurer snapshots from a private ladder pool]; `spatialMode: '2d-inventory'`, `combatSubstrate: 'pvp-auto-resolve'`, `prestigeMode: 'run-reset'` by default.
- **Narrative framing:** light — hero-select flavour cards, item-tooltip lore snippets, trophy-ladder milestones.

### Theme B — Arcane Tower Mage (Gem-assignment / Defender-hybrid)

- **Hook:** A wizard crafts and combines gems of different colours and grades, then assigns them to towers, amplifiers, and traps arranged along an enemy path. Nine-colour gem-combining; amplifier adjacency surrounding towers; wave-defender substrate. Direct GemCraft / Gem TD lineage.
- **Resource mapping:** currency = mana; meta-currency = wizard levels; HP = shrine integrity (wave-defender loss condition); items = gems in 9 colours × 5 grades; structures = [tower-slot, amplifier-slot, trap-slot, pylon-slot]; enemies = waves per stage; `spatialMode: 'gem-assignment'`, `combatSubstrate: 'wave-defender'`, `prestigeMode: 'campaign'` by default.
- **Narrative framing:** medium — campaign-stage intro lore, boss-wave flavour text, chapter-progression arc.

### Theme C — Industrial Factory (Building-grid / Score-only)

- **Hook:** A factory grid where adjacent same-type buildings boost each other's output; no combat, score-based with stage-goal targets. Industry Idle lineage; the Placement-Adjacency pattern's Variation 1 at archetype scale.
- **Resource mapping:** currency = credits; meta-currency = research points; items = [mine, furnace, factory, warehouse, power-plant, refinery, assembler, laboratory, logistics-hub, quality-station, R&D-center, HQ]; `spatialMode: '2d-inventory'` (no rotation; footprints are 1×1 by default but forks may add 2×2 mega-buildings), `combatSubstrate: 'none'`, `prestigeMode: 'campaign'` by default.
- **Narrative framing:** minimal — stage-goal briefings, industrial-era progression flavour.

### Theme D — Spirit Companion (1D-slot / SAP-shape)

- **Hook:** A line of spirit companions in five ordered slots; front-to-back fights out auto-resolves; combine three copies of the same spirit into a stronger tier. Direct Super Auto Pets degenerate-case lineage, dual-cover with OL-578 Auto-battler Theme B.
- **Resource mapping:** currency = gold; meta-currency = trophies; HP = party vitality; items / spirits = [fox-pup, forest-owl, river-turtle, spark-salamander, iron-snail, singing-cricket, meadow-rabbit, shadow-cat, flame-moth, clever-raven, stone-toad, sun-dragon]; `spatialMode: '1d-slot'`, `combatSubstrate: 'pvp-auto-resolve'`, `prestigeMode: 'none'` by default.
- **Narrative framing:** light — companion pack-backstory flavour, trophy-ladder milestones. Explicit shared-theme note with OL-578: the 1D-slot + combine-up + auto-resolve triple lands in both archetypes, the framing distinguishes which commitment is load-bearing (here: slot-order + adjacency-relative abilities; OL-578's version emphasises the shared shop pool and interest economy).

### Theme E — Cybernetic Loadout (Grid-slot / Synthwave)

- **Hook:** A cyberpunk runner slots implant-modules into a bio-grid; modules produce effects that synergise with adjacent modules; missions resolve as auto-runs against corporate security waves. Hybrid form — 2D-inventory grid with wave-defender substrate, mixing Backpack Battles packing and GemCraft's wave-paced resolve.
- **Resource mapping:** currency = credits; meta-currency = reputation; HP = neural-integrity; items = [chaff-emitter, homing-worm, EMP-aura, drone-orbit, throwing-knife, plasma-arc, ricochet-blade, chain-lightning, stealth-field, regen-module, overclock-ring, adrenaline-shot]; enemies = [security-drone, ICE-wall, packet-grunt, daemon-runner, kernel-elite, black-ICE-boss]; `spatialMode: '2d-inventory'`, `combatSubstrate: 'wave-defender'`, `prestigeMode: 'run-reset'` by default.
- **Narrative framing:** medium — mission-brief radio chatter, between-run debrief logs, stage-progression reveals the shadowy megacorp arc.

---
