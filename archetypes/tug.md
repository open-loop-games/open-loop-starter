# Archetype: Tug

> **One-line identity:** Adversarial Auto-Send Lane Push — Resource Accumulation + Auto-Production spine over a Routing-Traversal shared lane, with the opponent's economy as a live zero-sum pressure source.
>
> **Status:** `candidate`

**Exemplars (validation, not clone targets):** [Direct Strike](../../open-loop-research/analyses/complete/direct-strike-analysis.md), [Warfare 1917](../../open-loop-research/analyses/complete/warfare-1917-analysis.md), [Legion TD 2](../../open-loop-research/analyses/complete/legion-td-2-analysis.md).

Three independent platform-taxonomy lineages: SC2 Arcade (`{code:"TugOfWar"}` Blizzard-assigned platform category, Direct Strike ~58k lobbies/week 2026 snapshot), Armor Games Flash (Warfare 1917 + Warfare 1944 by ConArtist; Age of War + Army of Ages by Louissi — repeat devs confirming intentional genre commitment), Steam standalone (Legion TD 2 as the commercial crystallization of the WC3 Legion TD lineage). The taxonomy's cross-corpus evidence table totals ~24 games across 5 corpora; this Exemplars set covers one game per independent lineage. See `open-loop-research/reports/studies/arcade-market-archetypes/arcade-market-archetypes-taxonomy.md` § 2C for the full set.

---

## 1. Player experience

Tug is the archetype where you and the opponent feed the same lane. You spend income on unit production; the units auto-walk toward the opponent's base; theirs auto-walk toward yours; when the two streams meet somewhere in the middle they resolve combat without commands, and the survivors keep walking. The front-line position drifts toward whichever side is losing DPS races, and the match ends when one base's HP reaches zero. The player's decisions are composition (what unit types to buy), timing (send now or bank for a larger wave), counter-reading (opponent just massed light armor — pivot to splash damage), and upgrade allocation (income upgrades now delay presence now but pay off later). Moment-to-moment APM is low by design; strategic depth lives in the composition decision space and in reading the opponent's output, since every unit they send is visible evidence of their intentions.

A first 1–2 hours of play unfolds across 2–4 matches (each 15–30 minutes). First match is onboarding — learning the shop, the send affordance, what a winning front-line push looks like. Second match is where counter-picking shows up: the player starts losing a composition matchup and learns to pivot. Third match is where timing discipline emerges: income upgrades must be scheduled against opponent pressure, not in abstract. The long-term pull is the unbounded depth of the counter-type matrix and opponent variety — a fixed unit roster feels shallow after three matches against AI, but against a second live player the space becomes combinatorial because the opponent adapts. The archetype's signature pleasure is the moment after a bad early-game composition when a well-timed pivot reverses the front line in one send; the corresponding pain is the moment when your opponent recognizes your tank-heavy push and drops splash damage before your tanks arrive. Both are compositions of the same structural tension — you are authoring pressure against another agent authoring pressure in the same shared space.

---

## 2. Pattern composition

**Required patterns:**

- [Routing-Traversal](../../open-loop-research/patterns/tier-4-specialized/routing-traversal.md) — primary spatial pattern. Units auto-walk along a fixed lane; the meeting-point of opposing streams is the contested front. The "Adversarial shared topology (Tug variant)" sub-commitment in the pattern's Solution section is Tug's defining geometry.
- [Activity Systems (auto-production variation)](../../open-loop-research/patterns/tier-0-universal/activity-systems/) — continuous passive production from the player's spawn. Unit purchases feed an auto-send queue; combat and movement are command-free once a unit is dispatched.
- [Progression Systems](../../open-loop-research/patterns/tier-0-universal/progression-systems.md) — the match's internal progression (income tier → unit tier → upgrade tier) and, when `metaProgressionEnabled`, the cross-match meta layer (faction unlocks, ladder tiers, campaign missions).

**Cross-pattern properties engaged:**

- [Automation](../../open-loop-research/patterns/cross-pattern-properties/automation.md) — auto-income, auto-send, auto-combat. The player authors strategic intent; the simulation resolves it.
- [Cost Scaling](../../open-loop-research/patterns/cross-pattern-properties/cost-scaling.md) — unit tier costs and income upgrade costs. Tier-3 units cost multiples of tier-1s to express the density-vs-quality trade.
- [Modifier Chains](../../open-loop-research/patterns/cross-pattern-properties/modifier-chains.md) — counter-type matrix (damage multiplier per attacker-archetype × defender-archetype) + per-unit global upgrades. This is the archetype's depth generator.
- [Purchase Mechanics](../../open-loop-research/patterns/cross-pattern-properties/purchase-mechanics.md) — unit shop, income upgrades, spendable abilities (artillery, reinforcement) when `spendableAbilitiesEnabled`.

**Optional modifiers (fork may add):**

- **Placement-Adjacency secondary axis** — [Placement-Adjacency](../../open-loop-research/patterns/tier-4-specialized/placement-adjacency.md) as a second spatial pattern, as in Legion TD 2's 4×9 fighter grid. Controlled by the `spatialMode: 'with-placement-grid'` ArchetypeVar. When enabled, fighters are placed per-cell before each send with adjacency auras and front/back-line geometry. The skeleton's default is `'pure-routing'` (Direct Strike / Age of War / Warfare 1917 shape); the hybrid is a structural fork, not a tune.
- **Defender hybrid (Hero Line Wars variant)** — a fork can layer Defender's authored-wave mechanic on top of Tug's adversarial topology, producing a Tug+Defender hybrid (tower placement + auto-send). Requires citing Defender (`archetypes/defender.md` when landed, OL-574) alongside Tug in § 2 of the fork's own skeleton documentation. The skeleton here does **not** carry the Defender axis; the fork does.
- **Deckbuilder send-queue (Minion Masters shape)** — replace the open shop with a card-draw send queue. **Theme-level variant, not a pattern modifier**: only one corpus consumer (Minion Masters), fails the two-consumer test for pattern promotion. Document as a theme hook (§ 11 Theme D) rather than a § 2 modifier; a fork claiming this layer specifies it in its own archetype vars override.
- **Meta-progression layer** — ranked ladder / campaign / faction unlocks. `metaProgressionEnabled` ArchetypeVar; Direct Strike shape (off) vs. Legion TD 2 shape (on). Meta-progression is a sibling Progression Systems layer on top of the match-scoped core, not an inner pattern change.

**Novel-patterns cluster alignment:** n/a — Tug is a baseline composition (Routing-Traversal + auto-production + adversarial zero-sum). Confirmed absent from `novel-patterns-synthesis-v4.md` clusters. Loop 15 (Adversarial/zero-sum) is the defining distinguisher from Defender but is not a novel-patterns cluster entry; it is a Loop Mechanics classification.

**Cross-reference (adjacent-not-equivalent):**

- **Director is adjacent, not a superset.** Director's commitment is *authoring or tuning adversarial pressure* at a meta-mechanic level; Tug's commitment is *competing in* adversarial pressure. A Director experience might tune a Tug-shaped topology (see the reframing in `archetypes/_director-prework.md` applied in the OL-567 batch), but Director never subsumes Tug's mechanics. Three independent platform taxonomies treat these as distinct. The taxonomy's § 3B pins the distinction; `patterns/tier-4-specialized/routing-traversal.md` § Resulting Context → "Director topology vocabulary" gives the precise relationship.
- **Defender shares Loop 9 but diverges at Loop 15.** Both archetypes carry Enemy Scaling (the threat escalates over the session). Tug's threat is a **live competitive opponent** whose production is a zero-sum response to the player's; Defender's threat is a **designer-authored wave schedule** that escalates predictably. The architectural test: in Tug, the opponent's next send is unpredictable until it arrives in the lane; in Defender, the next wave is designed into the game. Hero Line Wars is the canonical boundary case — a Tug+Defender hybrid — and lives in optional-modifier territory rather than as a canonical sub-variant of either archetype.

---

## 3. Engine surface

| Layer | Primitive | Role in this archetype |
|-------|-----------|------------------------|
| core | `createResource` | Primary income currency (minerals). Mirrored per side via a `'player'`/`'ai'` parameter on the side-module factory. Fortress HP tracked as a bounded resource per side. |
| core | `applyModifiers` / `chain.bind` | **Global** unit and income upgrades only — bound conditionally via `chain.bind({active, modifier})` on shared `combat-output` / `income-rate` chains. **Not** the counter matrix; see § 8. |
| core | `calculateCost` | Unit cost scaling and income-upgrade tier cost lookup. |
| core | `createSequencer` | One sequencer per side. Player and AI both enqueue `{archetypeId}` send items; per-archetype cooldown is enforced via `canRun` returning `'notNow'` while the archetype's cooldown ref is positive (sequencer's hold-retry path waits and re-checks each tick). One sequencer-per-side, not one-per-archetype-per-side. |
| core | `runHeadless` | Beat-timing sim tests at `tickDelta: 1`. The harness `setup` returns the engine-build closure; analyzers reset between runs. |
| core | `withPersistentContext` + `createReset` | Match-scope boundary. All match-scoped refs (per-side resources, fortress HP, sequencer state, counter-pivot tracker) are created under a `tug/match` parent context. `createReset({ resetModules: ['tug/match'] })` resolves the context tree at match end. Persistent meta-progression state lives in `tug/meta` and is not touched by the match reset. |
| core | `tunable` + `createOverrideRegistry` | Solver perturbation surface. Income rate, AI income multiplier, unit costs, counter-matrix scalar multipliers wrapped via `tunable()` so leaf-6's tuner can `pushScope(...)` without rebuilding the engine. |
| systems | `createLoop` | Tick-driven income accrual + lane integration (per-tick: advance unit positions, resolve combat between adjacent unit pairs, decrement archetype cooldowns). |
| systems | `createPurchasableCategory` | Unit shop (per-archetype send affordance), income-upgrade tiers, spendable-ability purchases. The shop is shared between sides — both query the same `units` category for archetype defs. |
| systems | `createChallengeCategory` | Match / mission definitions when `matchMode` is `pve` or `campaign`; Co-Op difficulty tiers (Easy/Normal/Hard/Brutal per Direct Strike's Co-Op Classic shape). |
| harness | `runMatrixUntil` | **Tier-C distribution-statistic probes** — N seeds per cell, predicate-bounded termination, `aggregateUntilCell` exposes `terminationTime` distribution natively. The signature primitive for "across 20 matches, does player-win-rate land in [0.4, 0.6]?" Replaces the Tier-A `runUntil`-driven `solve.ts` flow. |

**Engine systems explicitly not used (required):** `createProducerCategory` — unit sends are discrete timed commitments via `createSequencer`, not a compounding producer tree; `createProducerCategory` would mis-shape the per-send-cost / per-archetype-cooldown semantics. `createAchievementCategory` — per Direct Strike's zero-meta-progression purity the skeleton default omits achievements; forks that enable `metaProgressionEnabled` may re-enable them but the no-meta shape must remain first-class. `createWorker` / `createInventory` — no per-worker assignment or inventory management; composition decisions feed the send queue directly. `createZoneSystem` — earlier drafts of this doc claimed ZoneSystem provided "lane topology" with "zone-scoped front-line queries"; that was structurally wrong. ZoneSystem is content-grouping with progressive unlock (Idle Loops zones, Increlution chapters, Ambient costume cycling), not a live spatial-state container. Tug's lane is hand-rolled in v1 — see § 8 and § 10.

**Spine reading:** a reader inspecting a Tug mod should see `createResource` + `createSequencer` + `createPurchasableCategory` + `createLoop` as the core spine, hand-rolled `units: Persistent<UnitInstance[]>` per side as the lane substrate, and `createChallengeCategory` + `chain.bind` (for global upgrades only) as the content layer. No `createProducerCategory`, no `createZoneSystem`, no compounding-resource tree. That sparseness is structurally meaningful — Tug's depth lives in the counter matrix (data-table lookup) and opponent adaptation (parallel module instance), not in resource-tree arithmetic.

**Primary stress axes:**

1. **Mirrored-instance ergonomics.** Every per-side primitive the player has is mirrored on the AI side: resource, sequencer, fortress HP, unit array, archetype-cooldown table. v1 hand-rolls by passing a `side: 'player' | 'ai'` parameter to each per-side module factory and namespacing persistent contexts as `tug/match/<side>/<module>`. Candidate for a `createSymmetricModuleSet({ sides, build })` helper if a second symmetric-state consumer (a Tug fork or Auto-battler PvP variant) hand-rolls the same shape; until then, lives in `candidate-primitives.md`.
2. **Lane state substrate.** The lane is a 1D continuous spatial axis; units have a `position: number` per instance. Front-line position per side is `Math.max(...units[side].map(u => u.position))`. Combat resolution per tick iterates both arrays. v1 hand-rolls as `Persistent<UnitInstance[]>` per side — `createSpatialGrid` is 2D-grid-with-FOV machinery, oversized for a 1D walking-positions axis, and ZoneSystem doesn't track moving entities. If a future Tug fork (deckbuilder-shape, multi-lane) finds the hand-roll growing, that's the convergence signal for a `createLane` / `create1DSpatialField` candidate.
3. **Counter-matrix expressiveness.** N×N damage-type multipliers are **not** a modifier chain — they're a 2D data-table lookup (`data.counterMatrix[attackerIdx][defenderIdx]: number`) read by the per-tick combat resolver. Modifier chains (`chain.bind`) are reserved for global per-archetype damage upgrades and global income multipliers. The Direct Strike analysis's damage-type-vs-armor-type observation (analysis lines 280–313) is data, not chain plumbing.
4. **Match-scoped vs. persistent state separation.** Match-scoped state (per-side resources, fortress HP, sequencer state, unit arrays, cooldown table, counter-pivot tracker) lives under the `tug/match` parent persistent context; `createReset({ resetModules: ['tug/match'] })` collects the context tree via `getModulePersistentRefs` at match boundary. Persistent meta-progression state (faction unlocks, ladder tier) lives in `tug/meta`. No new primitive needed — engine's existing context-tree + reset combo covers it cleanly.

---

## 4. Data shape

Per the post-2026-04-20 data-first convention (see Producer + Ambient `data/types.ts`), data lives in flat `data/*.ts` files inside the archetype directory. The skeleton/theme/balance lens lives as comment sections inside those files (`// ─── Skeleton ───`, `// ─── Balance ───`, `// ─── Costume ───`), not as separate vars/ files. The TS shapes below are reference prose — leaf 2 lifts them into `src/archetypes/tug/data/types.ts` directly, naming each interface and field as it lands.

**Skeleton (structural fork decisions; editing these forks the skeleton, not tunes it):**

- `spatialMode: 'pure-routing' | 'with-placement-grid'` (default `'pure-routing'`). Direct Strike / Age of War / Warfare 1917 shape vs Legion TD 2 hybrid. Flag toggles skeleton support; grid geometry lives in a companion fork config.
- `laneCount: number` (default `1`). 1 = Direct Strike / Age of War; 2–3 = Warfare 1944 flanks.
- `matchMode: 'pvp' | 'pve' | 'campaign'` (default `'pve'`).
- `opponentPersona: { player: PersonaKey; ai: PersonaKey }` where `PersonaKey = 'mass' | 'greed' | 'counter' | 'tech'` (default `{ player: 'counter', ai: 'counter' }`). Production reads only the `ai` slot; the `player` slot exists for sim/balance bilateral runs. PvP mode is expressed by not installing the bot module for that side, not by a sentinel value. Persona definitions in `src/archetypes/tug/data/personality.ts`; OL-721 game-AI variety study D7.
- `unitArchetypeCount: number` (default `6`). 4 = minimal; 6–8 = corpus-typical.
- `metaProgressionEnabled: boolean` (default `false`, Direct Strike posture).
- `spendableAbilitiesEnabled: boolean` (default `true`).
- `incomeUpgradeTiers: number` (default `3`).

**Per-archetype unit defs** (`data/units.ts`, length = `unitArchetypeCount`): each `UnitDef` carries `id`, `name` (costume), `role` (costume label), `archetypeTag` (matrix lookup key), `cost: DecimalSource`, `sendCooldownSec: number`, `damagePerHit: number`, `hp: number`, `walkSpeed: number`, optional `abilityRefs: string[]`. Diagonal of `counterMatrix[id][id]` is `1.0` by convention (unit vs. self).

**Counter matrix** (`data/counter-matrix.ts`, `number[][]` square `unitArchetypeCount × unitArchetypeCount`): `counterMatrix[attackerIdx][defenderIdx]` = damage multiplier applied at the data-lookup site inside the per-tick combat resolver. Strong counter = `1.75`; weak counter = `0.6`; neutral = `1.0`. Diagonal is `1.0`. **This is plain data, not a modifier chain** — see § 3 stress axis 3.

**Income & upgrades** (`data/income.ts`):
- `baseIncomeRate: DecimalSource` (per-second; default ~5 minerals/s, retuned by leaf 6).
- `incomeUpgradeMultipliers: number[]` (length = `incomeUpgradeTiers`; default `[1.5, 1.4, 1.3]`, applied sequentially).
- `incomeUpgradeCosts: DecimalSource[]` (length = `incomeUpgradeTiers`).

**Abilities** (`data/abilities.ts`, when `spendableAbilitiesEnabled`): `AbilityDef[]` carrying `id`, `label`, `cost: DecimalSource`, `effect` (artillery: AOE damage at lane-x; reinforcement: free-spawn N units of archetype X).

**Match balance** (`data/balance.ts`):
- `fortressHp: DecimalSource` (per-side starting HP; match ends when either side hits 0).
- `matchTimeLimitMinutes: number` (default `30`; `0` = no limit, score resolution at limit).
- `aiIncomeMultiplier: number` (default `1.0`). Side-symmetric default; AI-quirk knob (one-side throughput tax), not a balance lever.
- `believability: TugBelievability` (default `{ suboptimalityRate: 0, cadenceJitterScale: 0 }`). Calibration constraint on bot decision execution per `composition-cookbook/parameterized-personality.md` § Believability-calibration discipline. Suboptimality wraps the picker with a probability of swapping best→second-best; cadence jitter applies multiplicative ±noise to the persona-scaled cadence threshold. Production = 0/0 (deterministic, predictable for human player); sim default = 0.20/0.25 (set by `buildTugSimEngine`). Separate from `Persona` (different design semantics, different tuning timelines).
- `metaProgressionThresholds: number[]` (when `metaProgressionEnabled`).

**Predicate interface** (`data/types.ts` — `TugGameState`, mirrors Ambient's `AmbientGameState` pattern from consumer-guide § "Data and runtime separation"). Methods bridge data-side predicates to live engine state: `playerFortressHpAtLeast(amount)`, `aiFortressHpAtLeast(amount)`, `unitsSentByPlayerAtLeast(archetypeId, n)`, `counterPivotsThisMatchAtLeast(n)`, `factionsUnlockedAtLeast(n)`, `matchOutcomeIs('player-win' | 'ai-win' | 'time-limit' | null)`, `secondsSinceMatchStart()`, `secondsSinceArcStart()`. Modules implement the interface over live injection-key refs.

**Override surface** (`data/overrides.ts` — mirrors `applyAmbientOverrides` semantics): a flat-category `TugOverrides` shape with optional partials per category (`units`, `incomeUpgrades`, `abilities`, `balance`). `applyTugOverrides(base, overrides)` deep-merges category-by-category; entries merge by `id` and unknown ids throw. The factory `createTugEngine(overrides?)` runs `applyTugOverrides` before module composition; leaf 6's `buildTugSimEngine(overrides?)` is the same surface with the bot module appended.

**Theme (costume, zero mechanical impact)** lives inline in each data file as `// ─── Costume ───` comment sections. The skeleton ships with Theme C SciFi Armada baked in: `unitNames` for the 6 archetypes carry sci-fi labels (marine, vulture, siege-tank, wraith, battlecruiser, ghost), `factionNames = ['Terran', 'Protoss']`, `fortressName = 'Nexus'`, `resourceName = { singular: 'mineral', plural: 'minerals' }`. Forks override per-id via `applyTugOverrides({ units: [{id: 'marine', name: 'squire'}, ...] })` to swap to Theme A / B / D — see § 11.

---

## 5. Content sketch

- **Resources:** 1 primary match-scoped currency (gold / minerals / faith). Fortress HP as a bounded resource per side. Optional match-level score when `matchTimeLimitMinutes > 0` triggers score-based resolution.
- **Producers / Activities:** unit shop with 6 archetypes (default), each with a send cooldown. Income accrual is a `createLoop` ticker, not a producer tier. Optional: 2 spendable off-map abilities (artillery, reinforcement) when `spendableAbilitiesEnabled`.
- **Upgrades / Purchasables:** 3 income-upgrade tiers (default), 6 per-archetype unit upgrades (one global multiplier per unit archetype). Cost ratios lean into late-match compounding: early income upgrades are cheap and payoff fast; unit upgrades are expensive and payoff in specific compositions.
- **Progression gates:** match-scoped (no persistence by default — Direct Strike shape). Optional: campaign missions (when `matchMode === 'campaign'`) or faction/ladder unlocks (when `metaProgressionEnabled`). Gates between matches, not within them.
- **Counter matrix:** 6×6 (default `unitArchetypeCount = 6`) with a rock-paper-scissors+2-axis structure — two "primary" counter cycles (e.g. Light > Armored > Splash > Light and Melee > Air > Anti-Air > Melee) crossing to produce the 36-cell matrix. Diagonal = 1.0 (unit vs. self). Strong counter = 1.75; weak counter = 0.6.
- **Achievements:** 0 in skeleton default. When `metaProgressionEnabled` is true, forks may add match-win, counter-pivot-count, and faction-completion achievements — those are fork content, not skeleton content, per Direct Strike's zero-meta purity.

**Density target:** every beat in § 4 has ≥1 content entry mapped. Beat 1 → unit shop + income resource + first purchase; beat 2 → auto-send queue + lane zones + combat resolution; beat 3 → counter matrix + shop archetype swap; beat 4 → fortress HP + match-end UI; beat 5 → between-match composition memory (state handoff); beat 6 → per-match counter-pivot counter; beat 7 → meta-progression unlock path (if enabled) + counter-mastery flag (if not).

---

## 6. UI prescription

- **Form-factor (skeleton demo):** `desktop-first` — the demo defers the mobile-first claim explicitly. Theme C SciFi Armada (default skeleton bake — Direct Strike shape) is desktop-leaning in its corpus exemplar; matching the exemplar's form-factor for the demo lets leaf 5 ship a working skeleton without re-litigating shell affordances. The mobile-first declared-invention intent (below) survives in the doc as a forward-looking commitment for production-fork consumers, but the demo is desktop-only.
- **Primary shell (skeleton demo):** **inline desktop layout under `src/archetypes/tug/ui/`**, no `src/lib/shells/` addition for v1. Three-region layout authored as a single `TugAppRoot.vue` mounting `TugFrameLayout.vue` (archetype-local): persistent lane strip across the top ~30% of viewport (always visible, includes both fortresses + unit streams + front-line indicator), shop + counter-matrix in the centre-left ~50% (scrollable archetype grid + lookup panel), income / cooldown / match-stats column on the right ~20% (always visible). Match-end summary overlays the lane view via the modal stack. Inline-under-archetype is chosen over `src/lib/shells/LaneHudShell.vue` because (a) Tug is the only consumer and authoring it in `src/lib/` would pre-extract a shell against a single use-case, (b) `src/lib/` carries no engine imports and the lane strip's reactive bindings to per-side unit arrays are engine-aware, (c) graduation to `src/lib/shells/` happens at N=2 if a second Tug-shape consumer (deckbuilder fork, packing in a hybrid auto-battler) converges on the same layout.
- **Mobile-first declared-invention intent (forks only):** retained in the doc per `OL-559` Phase 1 evidence — triple-platform-taxonomy corroboration across SC2 Arcade (PC), Flash (browser + touch-compatible), and Steam (PC + mobile ports via Legion TD 2's touch-primary UI in informal reports). The archetype's low-APM decision surface (composition + timing, no per-unit commands) makes it structurally touch-friendly. A production fork claiming the mobile-first commitment authors a `LaneHudShell` at `src/lib/shells/` (or under their own fork's UI tree) with a top lane strip ~30% / shop centre ~50% / cooldown bottom ~20% layout. The audit has ~3 mobile-first rows and none with a Tug precedent, so the declared-invention tag applies. Cite: prework § "UI prescription hook (OL-582)".
- **ARIA-aligned widgets (lift targets):**
  - `Tooltip` — unit stat readouts on hover, counter-type explanation on matrix cells, upgrade descriptions. Cites `widget-vocabulary.md` Layer 1.
  - `Dialog` — match-end summary modal, settings modal, optional meta-progression unlock modal. Cites `widget-vocabulary.md` Layer 1.
  - `Progress` — income accrual visualization, fortress HP bars (both sides), send-cooldown progress per unit archetype. Cites `widget-vocabulary.md` Layer 1 (highest frequency).
  - `Toast` — send confirmation, counter-pivot detection, match-outcome notifications. Non-modal; keeps moment-to-moment pressure low. Cites `widget-vocabulary.md` Layer 1.

  Lift from `@/lib` / reka-ui primitives; forks do not reimplement focus, portal, or a11y.
- **Domain widgets (per-fork implementation):**
  - **Lane strip / front-line indicator** — the archetype's signature visual: persistent horizontal strip showing the lane, unit streams, and front-line position. No corpus widget row (declared invention against the audit). Rusty's Retirement-style persistent-strip UI is aesthetically adjacent but Ambient-scoped; Tug's strip is action-dense.
  - **Unit shop grid** — per-archetype card with icon, cost, role, cooldown, counter hints. Cites `widget-vocabulary.md` Layer 2 action-card shape.
  - **Counter-type matrix panel** — an N×N interactive matrix that reveals strong/weak/neutral relationships. Per-fork implementation; the corpus has wildly divergent shapes (Direct Strike's unit tier lists, Legion TD 2's fighter roster, Warfare 1917's inline tooltips) and the lift-first policy (OL-273 Phase 2) defers abstraction.
  - **Fortress HP bars** — per-side HP with damage animations. Cites `widget-vocabulary.md` Layer 2.
  - **Send-cooldown timer** — per-unit-archetype cooldown with ready/not-ready states. Per-fork implementation.
  - **Match-end summary panel** — stats breakdown (units sent, income earned, counter pivots, outcome). Per-fork; analogous to Ambient's welcome-back panel but match-scoped.
- **Layout detail (demo desktop):** lane strip top ~30% (both fortresses + unit streams + front-line indicator); shop + counter-matrix centre-left ~50% (6-archetype card grid + interactive matrix lookup); income/cooldown/match-stats column right ~20% (income accrual, per-archetype cooldown timers, match-time-elapsed, counter-pivot count). Match-end summary overlays the lane view on completion via `useModalStack`. Mobile-first reflow described above is fork-territory.
- **Nav pattern:** none at shell level within a match — Tug is single-screen-per-match by design. Between matches or in campaign mode, a mission-select or ladder-browse surface lives outside the match frame (sub-shell concern). This honors the low-cognitive-load commitment during play.
- **Declared-invention notes:**
  - **Lane strip / front-line indicator**: archetype-local in v1 (`src/archetypes/tug/ui/panels/LaneStrip.vue`). No cross-corpus starter shell precedent; zero rows in `layout-audit-2026.md` for Tug-shaped games. `TODO(expansion)` in the LIBRARY pattern (`routing-traversal.md`): promote to a `src/lib/shells/LaneHudShell.vue` when ≥2 independent Tug consumers converge.
  - **Mobile-first form-factor claim** (deferred for demo, retained for forks): grounded in OL-559 Phase 1 triple-platform evidence rather than `layout-audit-2026.md` (the audit has no Tug rows). Declared-invention form-factor intent; graduation to audit-cited happens when Tug games enter the audit corpus.
  - **Counter-type matrix panel**: archetype-local v1 (`src/archetypes/tug/ui/panels/CounterMatrixPanel.vue`). Widget shape varies substantially across the three exemplars; keep per-fork per lift-first policy. Graduate to `widget-vocabulary.md` Layer 2 when three independent Tug consumers converge on the same presentation.

---

## 7. Predicted engine gaps

Zero correctness gaps predicted — engine posture is settled per taxonomy § 2C. All entries below are ergonomics hypotheses post-OL-703 investigation. Severity column updated against engine source reads (sequencer, zone, modifier, persistence, override-registry, run-matrix-until).

| Gap | Severity | Status (post-OL-703) | Notes |
|-----|----------|----------------------|-------|
| Mirrored-instance ergonomics (player + AI state) | Medium | **Confirmed candidate** | v1 hand-rolls per-side modules with `side: 'player' \| 'ai'` parameter; persistent contexts namespace as `tug/match/<side>/<module>`. Each per-side module factory is called twice. The duplication is 4–5 modules × 2 sides; 8–10 factory call sites. Graduate to `createSymmetricModuleSet({ sides, build })` when a second symmetric-state consumer (Tug fork, PvP Auto-battler) hand-rolls the same shape. **Cross-reference: `candidate-primitives.md` entry filed by leaf 1 — see § Filing notes below.** Direct Strike, Warfare 1917, and Legion TD 2 all exhibit this shape at the consumer layer — high convergence likelihood. |
| ~~N×N counter-matrix as first-class primitive~~ | **Resolved (downgrade)** | **Removed as a gap** | Counter matrix is plain data-table lookup (`number[][]`), read directly by the per-tick combat resolver. Not a modifier-chain pattern. The earlier framing mistakenly suggested 36 `chain.bind` calls — that's the wrong primitive. Tug uses `chain.bind` only for **global** unit/income upgrades (variable count, not 36). No candidate-primitive entry; no engine ergonomics gap. |
| **1D lane spatial state substrate** | Low | **New gap (post-investigation)** | `createZoneSystem` is content-grouping/unlock (Idle Loops zones, Increlution chapters, Ambient costume cycling), not a live moving-entity spatial container. `createSpatialGrid` is 2D-grid-with-FOV machinery, oversized for a 1D walking-positions axis. Tug v1 hand-rolls a per-side `Persistent<UnitInstance[]>` with `position: number` per unit. If a future Tug fork (deckbuilder shape, multi-lane variants, Hero Line Wars hybrid) finds the hand-roll growing, that's the convergence signal for a `createLane` / `create1DSpatialField` candidate. **Defer pending second consumer.** |
| AI opponent mode implementation | Low | **Confirmed (consumer-layer)** | Parameterized-personality roster (`mass` / `greed` / `counter` / `tech`) drives the bot via `createOpponentBotModule(data, side)`, reading opponent composition + counter matrix only for the `counter` persona. OL-721 game-AI variety study adjudicated this as engine-empty per `parameterized-personality-extraction-sketch.md` §2.5 — composes over `persistent`, plain object roster, computed-active-key. Future auto-rotation across matches lands as `createSequencer` + `createRoundRobinStrategy` per §3.2; the match-driver seam is shaped to accept that drop-in. |
| ~~Match-scoped + persistent state separation~~ | **Resolved (no new primitive)** | **Removed as a gap** | Engine's existing `withPersistentContext` + `getModulePersistentRefs` + `createReset({ resetModules })` covers this cleanly. Per-match state lives under `tug/match` parent context (the context-tree walker collects nested category/sequencer/zone child contexts automatically); meta state lives under `tug/meta`; `createReset({ resetModules: ['tug/match'] })` resolves the match-scope on call. No `createMatchScope` candidate-primitive needed. |
| Spendable-ability cooldown coordination | Low | **Folded into sequencer hold-retry** | Per-archetype unit-send cooldown enforced via `canRun` returning `'notNow'` + `registerTick` retry on the same sequencer. Spendable abilities (artillery, reinforcement) when enabled use the same sequencer pattern (`canRun: () => abilityCooldownReady('artillery') ? 'now' : 'notNow'`). No `createCooldown` primitive needed for v1; engine's existing tri-state hold-retry path covers it. |
| `runMatrixUntil` distribution-statistic UX | Low | **Confirmed adequate** | Tier-C distribution probes (`ai-difficulty-symmetry`, `match-duration-bound`, `counter-matrix-sharpness`) read off `aggregateUntilCell.terminationTime.{avg,p50,p95}` and `terminationCounts.{predicate,maxSimTime}`. Win-rate is computed per-cell from analyzer-side metrics: `cell.aggregate.metrics['tug-outcome.playerScore'].avg` (the `OutcomeCapture` analyzer subscribes to `match.on('matchEnded', ...)` pre-reset to capture the outcome the engine clears synchronously on `match.end()`). `cell.runs[i]` has no `engine` field — the harness builds and discards engines per-run. If a future Tier-C archetype needs a richer aggregate (e.g. per-outcome bucket counts as first-class), file a candidate-primitive entry then. |

**Filing notes (post-OL-703):**

- `candidate-primitives.md` entry to file: `createSymmetricModuleSet({ sides, build })` — cross-reference Tug's mirrored-instance hand-roll site as the first receipt; cite Auto-battler PvP variant + future Tug forks as N=2 trigger.
- `candidate-primitives.md` entry **NOT** to file: counter-matrix-as-modifier-chain (the gap was a framing error) and `createMatchScope` (engine covers it).
- No `scope:engine` prerequisite leaves filed. Investigation showed every named primitive composes against engine current surface without correctness gaps. If leaf 3 / leaf 4 hits an unexpected gap during implementation, file then with concrete evidence.

The one-line rule for this section: **if implementing a Tug fork requires a correctness-level engine change, the gap is severity `high` and this table must be updated.** Current hypothesis confirmed by OL-703 investigation — no such gap exists.

---

## 8. Themes

### Theme C — SciFi Armada (skeleton default)

- **Hook:** The Direct Strike / Nexus Wars shape. Multiple alien races, symmetric economy, fortress = Nexus / Command Center / Hive. Deep counter-type matrix leveraging damage-type vs. armor-type conventions. **Skeleton default per OL-703 decision** — chosen over Theme A because Direct Strike is the canonical zero-meta-progression purity reference and `metaProgressionEnabled: false` is the skeleton default; Theme C and the meta-default are structurally consistent. Producer + Ambient defaulted to their Theme A; Tug defaults to Theme C because Theme A here (Fantasy Legion / Legion TD 2) is meta-progression-on by exemplar, which would create theme-vs-meta-default tension.
- **Resource mapping:** resource = minerals; factionNames = ["Terran", "Protoss"] (or three-faction pick in the shop); fortressName = "Nexus"; unitNames = ["marine", "vulture", "siege-tank", "wraith", "battlecruiser", "ghost"]; unitRoles = ["Light infantry", "Fast skirmish", "Siege artillery", "Air", "Capital ship", "Special ability"].
- **Narrative framing:** none — pure mechanical fidelity per Direct Strike. No narrative overlay; the theme relies on race fidelity as the aesthetic. Optional Co-Op PvE variant with AI difficulty tiers.

### Theme A — Fantasy Legion

- **Hook:** The Legion TD 2 shape. Mages, fighters, elementalists; a King anchors each side; mercenaries are the cross-lane pressure send. Fantasy unit roster with elemental counter relationships. Forks toggling `metaProgressionEnabled: true` (the Legion TD 2 ladder posture) typically swap to this theme.
- **Resource mapping:** resource = gold (singular: "gold", plural: "gold"); factionNames = ["Gold Legion", "Crimson Horde"]; fortressName = "King"; unitNames = ["squire", "pikeman", "mage", "archer", "knight", "dragon"]; unitRoles = ["Light melee", "Anti-cavalry", "Area damage", "Ranged", "Heavy armor", "Flying"].
- **Narrative framing:** light — between-match flavour events as King dialogue; campaign mode (when enabled) chains missions via a kingdom-conquest arc.

### Theme B — Historical Warfare (era-progression)

- **Hook:** The Warfare 1917 / Age of War shape. Infantry, machine gunners, tanks, artillery. Historical specificity (WW1, WW2, or era-spanning from stone-age to modern). Era-progression variant: unit-archetype unlocks gate by in-match milestones rather than arriving at match start.
- **Resource mapping:** resource = currency (singular: "soldier", plural: "soldiers" — the Warfare 1917 idiom); factionNames = ["Allied Forces", "German Empire"] (WW1) or ["Blue Coalition", "Red Coalition"] (generic); fortressName = "trench HQ"; unitNames = ["rifleman", "mg-gunner", "mortar", "sniper", "tank", "officer"]; unitRoles = ["Basic infantry", "Suppression", "Area indirect", "Precision", "Heavy armor", "Morale buff"].
- **Narrative framing:** prose — campaign missions as historical setpieces; spendable abilities (artillery, air support) framed as off-map commanders. Warfare 1917's campaign structure is the direct precedent.

### Theme D — Minimalist Abstract (declared invention, deckbuilder-compatible)

- **Hook:** Skeleton-survives-costume-stripping theme. Solid-colour unit tokens on a minimal lane strip; unit archetypes identified by shape and colour rather than flavour art; optional card-draw send queue (Minion Masters idiom) replaces the open shop. Proves the Tug archetype works at the structural level without representational budget, and documents the deckbuilder variant as a theme hook rather than a pattern modifier.
- **Resource mapping:** resource = energy (singular: "spark", plural: "sparks"); factionNames = ["Azure", "Amber"]; fortressName = "core"; unitNames = ["circle", "triangle", "square", "pentagon", "hexagon", "star"]; unitRoles = ["Fast", "Area", "Armor", "Ranged", "Siege", "Support"]. When configured with a card-draw send queue, `spendableAbilitiesEnabled` becomes the deckbuilder's spell-card axis; the fork adds card-draw state separately in its own vars.
- **Narrative framing:** none — abstract geometric aesthetic; the draw is reading opponent composition from shape patterns. A deliberate choice: validates that the skeleton's strategic depth survives representational abstraction and that the deckbuilder variant can be expressed without promoting it to a canonical sub-pattern.

---

## Vocabulary anchors

Every name cited in this doc must resolve to one of:

- **Pattern names** → `open-loop-research/LIBRARY.md` + linked pattern files
- **Cross-pattern properties** → `open-loop-research/patterns/cross-pattern-properties/*.md`
- **Novel-patterns clusters** → `open-loop-research/reports/novel-patterns/novel-patterns-synthesis-v4.md`
- **Engine primitives** → `open-loop-engine/docs/api/INDEX.md` (directory) + per-tier files (resources, mechanics, content, lifecycle, engine, advisors, spatial, harness)
- **Corpus games** → `open-loop-research/analyses/complete/*-analysis.md`
- **Layout shells** → `open-loop-starter/src/lib/shells/`
