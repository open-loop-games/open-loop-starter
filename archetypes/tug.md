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
| core | `createResource` | Primary income currency (gold/minerals/faith). Mirrored instance for the AI/opponent side. Fortress HP tracked as a bounded resource. |
| core | `applyModifiers` | Counter-type matrix resolution (attacker-archetype × defender-archetype → damage multiplier); global-upgrade modifier application on unit stats. |
| core | `calculateCost` | Unit cost scaling and income-upgrade tier cost lookup. |
| core | `createSequencer` | Auto-send queues — timed unit production from the player's and opponent's spawns. Per-unit-archetype cooldowns. |
| core | `runHeadless` | Beat-timing sim tests, match-outcome probes, counter-matrix sensitivity sweeps. |
| systems | `createLoop` | Tick-driven income accrual and front-line position integration. |
| systems | `createZoneSystem` | Lane topology — zones for lane segments (spawn → front → target-fortress) and per-side fortress zones. Front-line position is a zone-scoped query. |
| systems | `createPurchasableCategory` | Unit shop (per-archetype purchases), income-upgrade tiers, spendable-ability purchases. |
| systems | `createChallengeCategory` | Match / mission definitions when `matchMode` is `pve` or `campaign`; Co-Op difficulty tiers (Easy/Normal/Hard/Brutal per Direct Strike's Co-Op Classic shape). |
| harness | `runMatrix` | Counter-matrix robustness sweeps, income/cost sensitivity, AI-difficulty tuning. |

**Engine systems explicitly not used (required):** `createProducerCategory` — unit production is a `createSequencer`-driven queue with per-archetype cooldowns, not a compounding-producer tree; using `createProducerCategory` would mis-shape the "each send is a discrete timed commitment" semantics. `createAchievementCategory` — per Direct Strike's zero-meta-progression purity the skeleton default omits achievements; forks that enable `metaProgressionEnabled` may re-enable them but the no-meta shape must remain first-class. `createWorker` / `createInventory` — no per-worker assignment or inventory management; composition decisions feed the send queue directly.

Naming what's absent is part of the contract: a reader inspecting a Tug mod should see `createResource` + `createSequencer` + `createZoneSystem` + `createLoop` as the core spine and `createPurchasableCategory` + `createChallengeCategory` + `applyModifiers` as the content layer. No `createProducerCategory`, no compounding-resource tree. That sparseness is structurally meaningful — Tug's depth lives in the counter matrix and opponent adaptation, not in resource-tree arithmetic.

**Primary stress axes:**

1. **Mirrored-instance ergonomics.** Every primitive the player side uses has a mirrored opponent-side instance: player resource + AI resource, player sequencer + AI sequencer, player fortress zone + AI fortress zone. If building the mirror requires more than a pattern-level mirror helper in the consumer, that's an ergonomics signal worth acting on. Measure on first implementation; candidate for a symmetric-game-state harness helper if convergent.
2. **Counter-matrix expressiveness.** Modifier chains must express N×N damage-type multipliers cleanly. If a 6-archetype counter matrix becomes a 36-line series of manually-registered modifiers, the engine has a data-shape gap that warrants either a new primitive or a consumer-level convention. The Direct Strike analysis's damage-type-vs-armor-type observation (analysis lines 280–313) is the real-world comparison point.
3. **Zone-scoped front-line queries.** The front-line position is a derived query: "in which zone are the frontmost units of each side?" If this requires iterating every unit on every tick, zone indexing has a performance gap. Batch this through `createZoneSystem` and measure; propose an indexed front-line query if convergent across forks.
4. **Match-scoped vs. persistent state separation.** The skeleton expects match-scoped state (resources reset per match) to coexist with optional persistent meta-progression state (faction unlocks carry across matches). The persistence seam is a place ergonomics can grow; watch for the first fork that needs both and name the gap if it surfaces.

---

## 4. Beat map

Arc framing: **cumulative across matches, not continuous within one.** A Tug match is 15–30 sim-minutes; the 1–2 hour beat-map arc covers 2–4 matches' worth of cumulative play. Beats 1–4 land within the first match (onboarding through first match completion); beats 5–7 land across matches 2–3+ (composition mastery, first meta-progression milestone when enabled). This mirrors the Ambient precedent of measuring cumulative sim-time regardless of within-session distribution. Forks that enable `metaProgressionEnabled` see beat 7 fire when the first cross-match unlock lands; forks that leave it off see beat 7 fire at the "counter-mastery demonstrated" invariant (2+ successful counter-pivots in a single match) without a persistence event.

| # | Beat | Target sim-time | Trigger condition | Player-visible signal | Why it matters |
|---|------|-----------------|-------------------|------------------------|-----------------|
| 1 | First unit purchased | 0:00–1:00 | `player.units.purchased ≥ 1` | Unit icon appears in the spawn queue; income ticks visibly | Onboarding — the shop → send loop becomes concrete in under a minute |
| 2 | First auto-resolve combat observed | 1:00–3:00 | Opposing unit streams meet in the lane for the first time | Combat animation + front-line position updates | The archetype's defining moment — validates "set composition, watch it play out" |
| 3 | First counter-pivot | 5:00–15:00 | Player switches to a unit archetype that counters the opponent's dominant unit for the first time | New unit icon first-appearance in the queue; front-line shifts toward opponent within next 90s | Introduces the counter-matrix depth — this is where the archetype stops being an auto-battler and starts being a strategy game |
| 4 | First match completion | 15:00–30:00 | One fortress HP reaches 0 (or match time-limit score resolution) | Victory / defeat screen; match stats (units sent, income earned, counter pivots) | Arc half-way point; proves the match-loop closes cleanly regardless of outcome |
| 5 | Second-match composition pivot | 30:00–50:00 | In match 2+, player opens with a different unit archetype than in match 1 (tracked in session state) | Shop selection reflects a deliberate posture (e.g. "early air" vs. match-1's "early ground") | Demonstrates that learning transfers across matches; a single-match skeleton would end here without this signal |
| 6 | Counter-type mastery demonstrated | 45:00–75:00 | 2+ successful counter-pivots within a single match AND that match won | Match-end stats highlight counter-pivot count; achievement/notification fires if achievements are enabled | Depth probe — the player has internalized at least two counter matchups |
| 7 | First meta-progression milestone OR counter-mastery invariant (arc closure) | 60:00–120:00 | **If `metaProgressionEnabled`:** first faction unlock / ladder tier advance. **If off:** 3+ successful counter-pivots across any single match | Meta-progression: unlock flavour event. No-meta: match-end "mastery demonstrated" flag | The "you've seen the shape once" moment. Skeleton supports both meta and no-meta arcs as first-class |

**Arc closure beat:** #7.

This beat is deliberately a **bimodal** arc closure — one branch for `metaProgressionEnabled: true` (Legion TD 2 / Warfare 1917 campaign shape), one for `metaProgressionEnabled: false` (Direct Strike shape, where the "arc closure" is purely in-session skill demonstration). Both paths fire within the 60–120 minute cumulative window. A fork that wants a cleaner, one-path arc closure picks one mode and treats the other's beat-7 invariant as out-of-scope.

---

## 5. Data shape

```ts
// archetype.ts — skeleton defaults
export interface TugArchetypeVars {
  // Structural fork decisions. Editing these constitutes forking the skeleton, not tuning.

  /**
   * Spatial composition:
   * - 'pure-routing' (default): Direct Strike / Age of War / Warfare 1917 — Routing-Traversal only.
   * - 'with-placement-grid': Legion TD 2 — adds Placement-Adjacency as a secondary spatial axis.
   *   Grid geometry lives in a companion fork config; this flag toggles skeleton support.
   */
  spatialMode: 'pure-routing' | 'with-placement-grid'; // default 'pure-routing'
  /** Number of parallel lanes. 1 = Direct Strike / Age of War default; 2–3 = Warfare 1944-style flanks. */
  laneCount: number;                                    // default 1
  /** Baseline match flow. Campaign implies a scripted mission sequence. */
  matchMode: 'pvp' | 'pve' | 'campaign';                // default 'pve'
  /**
   * AI opponent behaviour. 'off' is valid only when matchMode === 'pvp'.
   * 'symmetric-mirror' is the skeleton default — income, cooldowns, and unit distribution mirror player state.
   * 'counter-aware' is a fork extension: AI reads player composition and biases toward counters.
   */
  aiOpponentMode: 'symmetric-mirror' | 'counter-aware' | 'off'; // default 'symmetric-mirror'
  /** Number of unit archetypes participating in the counter matrix. 4 = minimal; 6–8 = corpus-typical. */
  unitArchetypeCount: number;                           // default 6
  /** Cross-match meta-progression (faction unlocks, ladder tiers, campaign missions). */
  metaProgressionEnabled: boolean;                      // default false
  /** Off-map spendable abilities (artillery, reinforcement, air support). */
  spendableAbilitiesEnabled: boolean;                   // default true
  /** Number of match-internal income upgrade tiers. */
  incomeUpgradeTiers: number;                           // default 3
}

// theme.ts — costume, no mechanical impact
export interface TugThemeVars {
  resourceName: { singular: string; plural: string };   // e.g. { singular: 'mineral', plural: 'minerals' }
  factionNames: [string, string];                       // player faction, opponent faction
  fortressName: string;                                 // e.g. 'Nexus', 'trench HQ', 'King'
  /** Length must equal TugArchetypeVars.unitArchetypeCount. */
  unitNames: string[];
  /** Counter-matrix role labels displayed in the shop UI (e.g. "Light infantry", "Heavy armor"). */
  unitRoles: string[];
  /** Optional ability labels when spendableAbilitiesEnabled. */
  abilityLabels: { artillery?: string; reinforcement?: string };
  matchEndMessage: { victory: string; defeat: string };
  /** Optional campaign-mission titles when matchMode === 'campaign'. */
  missionTitles?: string[];
}

// balance.ts — mechanical overrides
export interface TugBalanceVars {
  /** Per-second income rate in the player's currency. */
  baseIncomeRate: DecimalSource;                        // e.g. "5"
  /** Upgrade multipliers applied sequentially as each income tier is purchased. Length = incomeUpgradeTiers. */
  incomeUpgradeMultipliers: number[];                   // e.g. [1.5, 1.4, 1.3]
  /** Cost of each income upgrade tier. Length = incomeUpgradeTiers. */
  incomeUpgradeCosts: DecimalSource[];
  /** Per-unit-archetype purchase cost. Length = unitArchetypeCount. */
  unitCosts: DecimalSource[];
  /**
   * Counter matrix: counterMatrix[attackerIndex][defenderIndex] = damage multiplier.
   * Square, side length = unitArchetypeCount. Diagonal is 1.0 by convention (unit vs. self).
   * Strong counter = 1.5–2.0; weak = 0.5–0.7; neutral = 1.0.
   */
  counterMatrix: number[][];
  /** Fortress starting HP. Match ends when either side reaches 0. */
  fortressHp: DecimalSource;
  /** Seconds between consecutive sends of the same unit archetype (cooldown). */
  sendCooldownSeconds: number;                          // default 3
  /** Match time limit in minutes. 0 = no limit (Direct Strike); >0 triggers score-based resolution. */
  matchTimeLimitMinutes: number;                        // default 30
  /** AI income multiplier relative to player. 1.0 = symmetric; >1 scales AI difficulty. */
  aiIncomeMultiplier: number;                           // default 1.0
  /** Optional ability costs (artillery, reinforcement) when spendableAbilitiesEnabled. */
  abilityCosts?: { artillery?: DecimalSource; reinforcement?: DecimalSource };
  /** Meta-progression thresholds (e.g. matches-won-to-unlock-faction-2) when metaProgressionEnabled. */
  metaProgressionThresholds?: number[];
}
```

**Override semantics:** deep-merge at load order `archetype → theme → balance`. Tests pass an override object to `runMatrix`.

**Codegen contract:** `pnpm codegen:archetype-vars tug` (pending OL-546) reads this block and emits `src/modules/mods/<game>/vars/archetype.ts` / `theme.ts` / `balance.ts` with matching defaults. Archetype-level shared types and defaults live at `src/archetypes/tug/`.

---

## 6. Balance probes

| Probe | Perturbation | Target beat(s) | Tolerance | Rationale |
|-------|--------------|----------------|-----------|-----------|
| `income-rate-baseline` | `baseIncomeRate` ×[0.75, 1.25] | 1, 2, 4 | Beat sim-time ±20% | Onboarding and first-match length pivot off income; off-tune makes beat 1 feel instant or beat 4 feel endless |
| `unit-cost-scaling` | `unitCosts` ×[0.85, 1.15] (uniform across archetypes) | 2, 3, 5 | Beat sim-time ±25% | Cost scaling determines send cadence; too cheap collapses counter-reads; too expensive stalls the match |
| `counter-matrix-sharpness` | Strong-counter multiplier ×[0.75, 1.25], weak-counter divisor symmetric | 3, 6 | Beat sim-time ±30%; counter-pivot success-rate ≥ 55% | Modifier-chain depth probe — if counters are too shallow, beat 3 never fires; if too sharp, every match is decided in one pivot |
| `ai-difficulty-symmetry` | `aiIncomeMultiplier` ×[0.9, 1.1] | 4 | Player-win-rate in the 40–60% band across 20 sim matches | AI symmetry is the load-bearing fairness probe; drift here is how PvE becomes unplayable or trivially easy |
| `match-duration-bound` | Run 30-match sample at default vars; assert median match length ≤ `matchTimeLimitMinutes` | 4 | Median match length in [50%, 95%] of match time limit; zero time-limit-triggered scores | If matches routinely hit the time limit, the game's win condition is failing and the core loop is broken |

**Minimum probe count:** 5 (exceeds ≥4 requirement). Covers cost scaling (`unit-cost-scaling`), production rate (`income-rate-baseline`), modifier chain depth (`counter-matrix-sharpness`), and two archetype-specific axes (`ai-difficulty-symmetry`, `match-duration-bound`). The counter matrix is the archetype's signature depth generator; `counter-matrix-sharpness` is the signature probe and the one most likely to catch tuning drift across forks.

---

## 7. Sim assertions

```ts
import { describe, it, expect } from 'vitest';
import { runHeadless } from 'open-loop-engine';
import { runMatrix } from 'open-loop-engine/harness';
import { minutes } from '@/test/time';
import { loadTugVars } from '../vars';
import { buildTugEngine } from '../engine';

describe('tug — beat map', () => {
  const vars = loadTugVars();

  it('beat 1: first unit purchased within 0–1 min', async () => {
    const result = runHeadless({
      engine: buildTugEngine(vars),
      until: (state) => state.player.unitsPurchased >= 1,
      maxSimTime: minutes(2),
      inputs: 'auto-first-purchase',
    });
    expect(result.simTime).toBeBetween(0, minutes(1));
  });

  it('beat 3: first counter-pivot within 5–15 min', async () => {
    const result = runHeadless({
      engine: buildTugEngine(vars),
      until: (state) => state.player.counterPivotsThisMatch >= 1,
      maxSimTime: minutes(20),
    });
    expect(result.simTime).toBeBetween(minutes(5), minutes(15));
  });

  // one it() per beat — full enumeration in the checked-in test file
});

describe('tug — balance robustness', () => {
  it('ai-difficulty-symmetry: player-win-rate in 40–60% band at default vars', async () => {
    const matches = await runMatrix({
      engine: buildTugEngine(loadTugVars()),
      runs: 20,
      maxSimTime: minutes(30),
      until: (state) => state.match.outcome !== null,
    });
    const wins = matches.filter((m) => m.state.match.outcome === 'player-win').length;
    const winRate = wins / matches.length;
    expect(winRate).toBeGreaterThanOrEqual(0.4);
    expect(winRate).toBeLessThanOrEqual(0.6);
  });

  it('counter-matrix-sharpness: beat 3 lands within ±30% at strong-counter ×[0.75, 1.25]', async () => {
    // runMatrix over counterMatrix strong-counter multiplier range
    // assert beat 3 sim-time tolerance + counter-pivot success-rate threshold
  });

  // one it() per probe from § 6
});
```

**Required test count:** 7 beats + 5 probes = 12 tests minimum. Tests checked into `src/modules/mods/<game>/sim/tug.sim.test.ts`.

**Representative-stubs escape hatch:** this doc shows 3 worked stubs (beat 1, beat 3, the signature AI-symmetry probe) and a `// one it() per beat` / `// one it() per probe` comment. Full enumeration lives in the test file.

---

## 8. Content sketch

- **Resources:** 1 primary match-scoped currency (gold / minerals / faith). Fortress HP as a bounded resource per side. Optional match-level score when `matchTimeLimitMinutes > 0` triggers score-based resolution.
- **Producers / Activities:** unit shop with 6 archetypes (default), each with a send cooldown. Income accrual is a `createLoop` ticker, not a producer tier. Optional: 2 spendable off-map abilities (artillery, reinforcement) when `spendableAbilitiesEnabled`.
- **Upgrades / Purchasables:** 3 income-upgrade tiers (default), 6 per-archetype unit upgrades (one global multiplier per unit archetype). Cost ratios lean into late-match compounding: early income upgrades are cheap and payoff fast; unit upgrades are expensive and payoff in specific compositions.
- **Progression gates:** match-scoped (no persistence by default — Direct Strike shape). Optional: campaign missions (when `matchMode === 'campaign'`) or faction/ladder unlocks (when `metaProgressionEnabled`). Gates between matches, not within them.
- **Counter matrix:** 6×6 (default `unitArchetypeCount = 6`) with a rock-paper-scissors+2-axis structure — two "primary" counter cycles (e.g. Light > Armored > Splash > Light and Melee > Air > Anti-Air > Melee) crossing to produce the 36-cell matrix. Diagonal = 1.0 (unit vs. self). Strong counter = 1.75; weak counter = 0.6.
- **Achievements:** 0 in skeleton default. When `metaProgressionEnabled` is true, forks may add match-win, counter-pivot-count, and faction-completion achievements — those are fork content, not skeleton content, per Direct Strike's zero-meta purity.

**Density target:** every beat in § 4 has ≥1 content entry mapped. Beat 1 → unit shop + income resource + first purchase; beat 2 → auto-send queue + lane zones + combat resolution; beat 3 → counter matrix + shop archetype swap; beat 4 → fortress HP + match-end UI; beat 5 → between-match composition memory (state handoff); beat 6 → per-match counter-pivot counter; beat 7 → meta-progression unlock path (if enabled) + counter-mastery flag (if not).

---

## 9. UI prescription

- **Primary shell:** `` `declared invention` `` — compact HUD shell with a persistent push-pull lane indicator as the visual centre. No starter shell matches the layout requirements: `SidebarMainShell` / `ThreePanelShell` / `MultiColumnShell` / `SingleColumnShell` / `TabsBarShell` all prescribe document-style region hierarchies; Tug wants an always-visible lane strip above/below a shop panel with real-time front-line drift. Mobile-first layout is load-bearing per the triple-platform-taxonomy evidence (see Form-factor intent below). A fork claiming this commitment authors a `LaneHudShell` or `TugFrameShell` at `src/lib/shells/` and upgrades the `src/lib/` layer accordingly. Graduate to a canonical starter shell when ≥2 independent Tug consumers converge on the same layout. Cite: prework § "UI prescription hook (OL-582)" (OL-559 Phase 1 evidence base), which supersedes `layout-audit-2026.md` for Tug since the audit has no Tug rows.
- **Secondary shell:** `` `declared invention` `` — for desktop-standalone forks (Legion TD 2 shape), a `ThreePanelShell`-inspired layout with lane view centre, shop left, match-stats/counter-matrix right. Still declared invention because the audit doesn't cover standalone-Tug desktop games; `layout-audit-2026.md` general strategy-HUD observations are informative but not a direct match. Forks targeting Steam-desktop may fork `ThreePanelShell` as a base; forks targeting mobile fall back to the primary declared-invention shell. Cite: prework § "UI prescription hook (OL-582)".
- **Form-factor intent:** `mobile-first` — `` `declared invention` ``. OL-559 Phase 1 evidence: triple-platform-taxonomy corroboration across SC2 Arcade (PC), Flash (browser, mouse + touch compatible), and Steam (PC + mobile ports via Legion TD 2's touch-primary UI in informal reports). The archetype's low-APM decision surface (composition + timing, no per-unit commands) makes it structurally touch-friendly — this is the basis for the mobile-first claim. The audit has ~3 mobile-first rows and none with a Tug precedent, so the declared-invention tag applies. Cite: prework § "UI prescription hook (OL-582)".
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
- **Layout detail:** mobile-first primary form puts the lane strip across the top ~30% of the viewport (always visible), the unit shop in the middle ~50% (scrollable archetype grid), and the income/cooldown/ability bar across the bottom ~20% (always visible). Match-end summary overlays the lane view on completion and auto-dismisses. Desktop-secondary form uses three panels as in the Secondary shell description.
- **Nav pattern:** none at shell level within a match — Tug is single-screen-per-match by design. Between matches or in campaign mode, a mission-select or ladder-browse surface lives outside the match frame (sub-shell concern). This honors the low-cognitive-load commitment during play.
- **Declared-invention notes:**
  - **Lane-HUD shell**: no cross-corpus starter shell precedent. Zero rows in `layout-audit-2026.md` for Tug-shaped games. Starter ships no such shell; a fork claiming the mobile-first lane-HUD commitment authors it at `src/lib/shells/LaneHudShell.vue`. `TODO(expansion)` in the LIBRARY pattern (`routing-traversal.md`): promote the shell primitive when ≥2 independent Tug consumers converge.
  - **Mobile-first form-factor claim**: grounded in OL-559 Phase 1 triple-platform evidence rather than `layout-audit-2026.md` (the audit has no Tug rows). This is a declared-invention form-factor intent; graduation to audit-cited happens when Tug games enter the audit corpus.
  - **Counter-type matrix panel**: widget shape varies substantially across the three exemplars; keep as per-fork implementation per lift-first policy. Graduate to `widget-vocabulary.md` Layer 2 when three independent Tug consumers converge on the same presentation.

---

## 10. Predicted engine gaps

Zero correctness gaps predicted — engine posture is settled per taxonomy § 2C and the prework's "COPY AS-IS" directive (prework lines 247–268). All entries below are ergonomics hypotheses the first Tug-archetype fork will confirm or reject.

| Gap | Severity | Notes |
|-----|----------|-------|
| Mirrored-instance ergonomics (player + AI state) | Medium | Every player-side primitive is cloned for the AI: resource, sequencer, fortress-zone, upgrade state. If consumer code becomes repetitive symmetric-setup blocks, graduate a symmetric-game-state harness helper (working name; naming deferred to proposal). Direct Strike, Warfare 1917, and Legion TD 2 all exhibit this shape at the consumer layer — high convergence likelihood. |
| N×N counter-matrix as first-class primitive | Medium | The counter matrix is currently hand-registered as N² modifiers (attacker × defender → damage multiplier) via `applyModifiers`. If this becomes verbose or error-prone, propose a counter-matrix primitive that wraps the modifier-chain plumbing. Deferred until the first Tug consumer implementation measures the real ergonomics cost. |
| Zone-scoped front-line query performance | Low | The front-line position is derived per-tick by finding the frontmost units of each side within the lane zones. If this is O(units) per tick with no indexing, the performance budget at high unit counts may pressure the zone system. Likely fine for the 20–50 concurrent-unit counts corpus games exhibit; flag if a fork hits it. |
| AI opponent mode implementation | Low | `aiOpponentMode: 'counter-aware'` requires reading opponent composition and biasing sends toward counters. This is consumer-layer logic, not an engine primitive, but the pattern may want an `AIOpponentHarness` helper if multiple forks converge on the same "read opponent, pick counter" loop. Defer until second consumer. |
| Match-scoped + persistent state separation | Low | The skeleton assumes match-scoped state (reset per match) with optional persistent meta-progression state (carried across). The persistence seam is a consumer concern today; if two forks struggle with the same "which state resets when" boundary, a `createMatchScope()` or similar helper is a candidate. Measure first. |
| Spendable-ability cooldown coordination | Low | Artillery / reinforcement abilities have independent cooldowns separate from unit send cooldowns. These are `createSequencer` instances but with different semantics (one-shot activation vs. continuous queue). If coordination becomes tangled, propose a `createCooldown` primitive layered above `createSequencer`. Not urgent. |

The one-line rule for this section: **if implementing a Tug fork requires a correctness-level engine change, the gap is severity `high` and this table must be updated.** Current hypothesis is that no such gap exists — the taxonomy pins the engine posture as settled and the three exemplars validate it at the consumer layer.

---

## 11. Themes

### Theme A — Fantasy Legion

- **Hook:** The Legion TD 2 shape. Mages, fighters, elementalists; a King anchors each side; mercenaries are the cross-lane pressure send. Fantasy unit roster with elemental counter relationships.
- **Resource mapping:** resource = gold (singular: "gold", plural: "gold"); factionNames = ["Gold Legion", "Crimson Horde"]; fortressName = "King"; unitNames = ["squire", "pikeman", "mage", "archer", "knight", "dragon"]; unitRoles = ["Light melee", "Anti-cavalry", "Area damage", "Ranged", "Heavy armor", "Flying"].
- **Narrative framing:** light — between-match flavour events as King dialogue; campaign mode (when enabled) chains missions via a kingdom-conquest arc.

### Theme B — Historical Warfare (era-progression)

- **Hook:** The Warfare 1917 / Age of War shape. Infantry, machine gunners, tanks, artillery. Historical specificity (WW1, WW2, or era-spanning from stone-age to modern). Era-progression variant: unit-archetype unlocks gate by in-match milestones rather than arriving at match start.
- **Resource mapping:** resource = currency (singular: "soldier", plural: "soldiers" — the Warfare 1917 idiom); factionNames = ["Allied Forces", "German Empire"] (WW1) or ["Blue Coalition", "Red Coalition"] (generic); fortressName = "trench HQ"; unitNames = ["rifleman", "mg-gunner", "mortar", "sniper", "tank", "officer"]; unitRoles = ["Basic infantry", "Suppression", "Area indirect", "Precision", "Heavy armor", "Morale buff"].
- **Narrative framing:** prose — campaign missions as historical setpieces; spendable abilities (artillery, air support) framed as off-map commanders. Warfare 1917's campaign structure is the direct precedent.

### Theme C — SciFi Armada

- **Hook:** The Direct Strike / Nexus Wars shape. Multiple alien races, symmetric economy, fortress = Nexus / Command Center / Hive. Deep counter-type matrix leveraging damage-type vs. armor-type conventions.
- **Resource mapping:** resource = minerals; factionNames = ["Terran", "Protoss"] (or three-faction pick in the shop); fortressName = "Nexus"; unitNames = ["marine", "vulture", "siege-tank", "wraith", "battlecruiser", "ghost"]; unitRoles = ["Light infantry", "Fast skirmish", "Siege artillery", "Air", "Capital ship", "Special ability"].
- **Narrative framing:** none — pure mechanical fidelity per Direct Strike. No narrative overlay; the theme relies on race fidelity as the aesthetic. Optional Co-Op PvE variant with AI difficulty tiers.

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
- **Engine primitives** → `open-loop-engine/docs/api/INDEX.md` + the four `*.api.md` files
- **Corpus games** → `open-loop-research/analyses/complete/*-analysis.md`
- **Layout shells** → `open-loop-starter/src/lib/shells/`
