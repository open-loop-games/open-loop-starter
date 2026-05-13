# Archetype: Producer

> **One-line identity:** A+C Activity + Cost Scaling + Modifier Chains + Achievement multipliers — the classic big-number incremental.
>
> **Status:** `canonical`

**Exemplars (validation, not clone targets):** [Cookie Clicker](../../open-loop-research/analyses/complete/cookie-clicker-analysis.md), [AdVenture Capitalist](../../open-loop-research/analyses/complete/adventure-capitalist-analysis.md), [Derivative Clicker](../../open-loop-research/analyses/complete/derivative-clicker-analysis.md).

---

## 1. Player experience

Producer is the archetype every incremental player already understands within thirty seconds. You click a thing. A number goes up. You spend the number on something that increases the number by itself. Before long you stop clicking and watch the number grow, checking in to buy the next producer tier and the next multiplier upgrade. The texture of play is *pacing against a curve*: costs rise faster than production, so each tier feels unreachable until it isn't, and then it's trivial and you're already saving for the next one.

A thirty-minute session is a sequence of threshold moments — *"I can finally afford a farm"*, *"the cursor upgrade doubled my click value"*, *"the first achievement multiplier just kicked in"*. The long-term pull is modifier stacking: six hours in, a player watches their headline multiplier (base × upgrades × achievements × milestones × tier-bonuses) visibly compound into an unfathomable number, and that is the reward. There is no story; the curve is the content.

---

## 2. Pattern composition

**Required patterns:**

- [Activity Systems (A+C hybrid)](../../open-loop-research/patterns/tier-0-universal/activity-systems/) — instant clicks feed a continuous producer hierarchy.
- [Progression Systems](../../open-loop-research/patterns/tier-0-universal/progression-systems.md) — tiered producer unlocks gated by resource thresholds.
- [Achievement Systems](../../open-loop-research/patterns/tier-1-foundation/achievement-systems.md) — milestone-triggered, grant passive *mechanical* multipliers, not cosmetic badges.

**Cross-pattern properties engaged:**

- [Purchase Mechanics](../../open-loop-research/patterns/cross-pattern-properties/purchase-mechanics.md) — scaling-cost acquisition across producer tiers and upgrades.
- [Cost Scaling](../../open-loop-research/patterns/cross-pattern-properties/cost-scaling.md) — exponential per-producer, step-change between tiers. The real pacing lever.
- [Modifier Chains](../../open-loop-research/patterns/cross-pattern-properties/modifier-chains.md) — deep stacking: base × per-producer upgrades × global upgrades × achievement bonuses × milestone bonuses.
- [Quantity Tracking](../../open-loop-research/patterns/cross-pattern-properties/quantity-tracking.md) — per-producer count drives achievement thresholds and quantity-scaled bonuses.
- [Scaling Formulas](../../open-loop-research/patterns/cross-pattern-properties/scaling-formulas.md) — exponential cost curves, occasionally polynomial upgrade effects.
- [Automation](../../open-loop-research/patterns/cross-pattern-properties/automation.md) — producer auto-buy + upgrade auto-buy as canonical content. Producer ships these as engine modules under `src/archetypes/producer/modules/autobuyers/` with a master kill-switch + per-spec player toggles; the first-arc economy is single-category, so unlock gates ship `() => true` and forks introduce milestone gating through the spec's `isUnlocked` slot. Balance bot rides on top by flipping every toggle on at sim-start. Cookie Clicker vanilla ships without automation; the player-side mod ecosystem (Frozen Cookies, Cookie Monster) demonstrates that long-session Producer play converges on it — the first-arc port treats it as canonical content rather than a fork-only extension.

**Optional modifiers (fork may add):**

- **Single-tier Prestige** — a simple ascension layer that resets the primary resource for a permanent multiplier. Keeps the archetype's spirit without turning into Scaler.
- **Time-limited seasonal content** — Cookie Clicker's Halloween/Christmas events. Achievement-system composition, low engine cost.
- **Soft-capped clicking** — to prevent click-macros from dominating the curve once producers are humming. [Softcapping](../../open-loop-research/patterns/cross-pattern-properties/softcapping.md) cross-property.
- **Auto-clicker as content** — the first-arc port keeps the click-cadence taper bot-only (`balance/bot.ts`'s `expectedClicksAt`) because it models *player* clicking, not a player-facing automation. Forks that want a clicker-style auto-clicker should promote it into the autobuyer registry as a third spec.

**Novel-patterns cluster alignment:** n/a — Producer is the baseline; novel-patterns clusters describe deviations from it.

---

## 3. Engine surface

| Layer | Primitive | Role in this archetype |
|-------|-----------|------------------------|
| core | `createResource` | Single primary currency. |
| core | `createModifierChain` | Headline multiplier — the number players watch grow. |
| core | `calculateMaxAffordable` | Formula inversion for "buy max" at scale. |
| systems | `createProducerCategory` | The producer hierarchy (7 tiers by default). |
| systems | `createScalingPurchasable` | Per-producer exponential cost curves. |
| systems | `createPurchasableCategory` | One-shot multiplier upgrades (per-producer and global). |
| systems | `createAchievementCategory` | Milestone tracking + mechanical reward multipliers. |
| core | `runHeadless` | Beat-timing sim tests and Workbench probes. |
| harness | `runMatrix` | Probe robustness across the vars space. |

**Engine systems explicitly not used:** `createReset` / `createLoop` / `createZoneSystem` / `createInventory` / `createWorker` — all absent. Producer is deliberately the 30%-surface archetype; if the engine does not feel clean when only these primitives are wired, the engine has an ergonomics problem to fix.

**Primary stress axes:**
1. **Modifier chain depth.** A mature Producer game runs 10+ multipliers stacked (base × 7 upgrade tiers × achievement-count-bonus × global-click-multiplier × milestone-bonus × …). The chain must evaluate in one tick without performance degradation and produce correct results as Decimal values.
2. **Cost-formula inversion at scale.** `calculateMaxAffordable` must return correct results when resource counts and cost exponents push values past `1e100` — the regime where `break_eternity.js` transitions to tetration. Bulk-buy UX depends on this being correct.
3. **Ergonomic sparsity.** Producer uses ~30% of the engine's systems surface. If writing a Producer mod requires imports from every layer or verbose category-options blocks, the engine needs helpers.

---

## 4. Data shape

Producer's content lives under `src/archetypes/producer/data/` as three flat typed-array exports (`producers.ts`, `upgrades.ts`, `achievements.ts`) plus a `types.ts` that names the definition interfaces. Inline `effect` and `requirement` callbacks colocate the mechanics with the definition — no separate effect tables, no codegen. Lens discipline is enforced by comment sections inside each data file (`// ─── Skeleton ───`, `// ─── Balance ───`, `// ─── Costume ───`): skeleton counts (tier-count, upgrade-count, achievement-count) are a fork-of-skeleton decision; balance constants (cost-growth, tier-cost-ratios, base rates, multipliers) are the tuning surface sim tests probe; costumes (resource name, producer names, upgrade/achievement labels, end-of-arc message) are theme-scoped.

```ts
// data/types.ts — typed definitions

export interface ProducerDef {
  id: string;                      // stable; used as save key
  name: string;                    // display name (costume)
  trigger: 'continuous' | 'manual';
  baseRate: DecimalSource;         // per-second for continuous; per-activation for manual
  purchase?: {                     // absent on the click producer
    baseCost: DecimalSource;       // tier-1 first-unit cost
    costScaling: DecimalSource;    // per-purchase multiplier (default 1.15)
  };
}

export interface UpgradeDef {
  id: string;
  name: string;                    // display name (costume)
  description: string;
  cost: DecimalSource;
  /** Which producer this scopes to. Null → global upgrade (binds on headline chain). */
  targetProducerId: string | null;
  /** Multiplicative effect value (e.g. 2 for doubling). */
  multiplier: DecimalSource;
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  hidden?: boolean;
  /** State-predicate — true when the achievement's trigger condition is met. */
  requirement: (state: ProducerGameState) => boolean;
  /** Headline multiplicative reward. Default 1.02 per achievement. */
  rewardMultiplier?: DecimalSource;
}

```

**Override semantics:** `boot.ts` exports `createProducerEngine(overrides?)` that accepts a deep-partial over the archetype's data shape. Sim tests and workbench perturbation route through this factory — the addressable shape *is* the TypeScript type over the data, not a synthetic vars layer. Forks change behaviour by editing `data/*.ts` in place; they don't need a runtime override path.

**Eventual data-layer split** (phase 3 destinations; source ranges live in § 5):

| File | What it owns |
|------|-------------|
| `data/types.ts` | All `*Def` interfaces, the `ProducerBalance` shape, the `ProducerGameState` typed read-view |
| `data/producers.ts` | Click activity + building tier definitions per `main.js:7982` (Object constructor) + `main.js:8979–9302` (Cursor through final building tier) |
| `data/upgrades.ts` | Per-building tiered multiplier upgrades + global cross-building bonus series per `main.js:10145–10155` (`MakeTiered` / `TieredUpgrade` helpers) + `main.js:10236–10914` (pre-prestige upgrade definitions) |
| `data/achievements.ts` | Building-count thresholds per building callbacks (`main.js:9004+`); production-total milestones per `main.js:12994–13037` (`BankAchievement` helper + calls); CPS-rate milestones per `main.js:13005–13048` (`CpsAchievement` helper + calls); click-count milestones per `main.js:13058–13065` |
| `data/balance.ts` | `PRODUCER_BALANCE: ProducerBalance` — cost growth exponents, base rates, upgrade multipliers; canonical values lifted from Object + Upgrade definitions above; declared-invention rows for archetype-simplified mechanics (direct per-achievement multiplier in place of milk/kitten chain) |
| `data/overrides.ts` | `ProducerOverrides` flat-category shape + `applyProducerOverrides(base, overrides)` |
| `data/index.ts` | `DEFAULT_PRODUCER_DATA` barrel + per-file re-exports |

**Archetype code lives in** `src/archetypes/producer/` as its own colocated tree (`data/`, `modules/`, `composables/`, `ui/`, `sim/`, `boot.ts`). The layer split emerges through phase 3 integration as engine wiring lands; phase 2 stages canonical Cookie Clicker content at the archetype root using Cookie Clicker's source structure as the starting layout. See `open-loop-starter/CLAUDE.md § Archetype convention` for the fork-workflow contract and `src/archetypes/CLAUDE.md` for port methodology (phases, discipline).

---

## 5. Content scope

Each bullet names which canonical Cookie Clicker subsystems land in the first-arc port and where their source bytes live. The phase-2 snapshot lands those bytes locally per `src/archetypes/CLAUDE.md`; phase 3 integration applies engine substitutions and refactors toward the data-layer split named in § 4. Counts, names, thresholds, formulas, and reward values are not pinned in this doc — code is truth.

- **Resources:** Primary cookie currency, accumulated via clicks and building output across ticks. `Game.cookiesEarned` / `Game.cookiesReset` state fields per `main.js:2134`; prestige-currency state (`Game.prestige`, `Game.heavenlyChips`) declared at `main.js:2146–2149` appears at the ascension gate boundary but stays inert before first ascend.
- **Producers / Activities:** Click activity (big cookie → `Game.ClickCookie` per `main.js:4988–5057`) and building tier hierarchy (`Game.Object` constructor per `main.js:7982`; Cursor through final building tier per `main.js:8979–9302`). First-arc scope covers buildings accessible before first ascension.
- **Upgrades / Purchasables:** Per-building tiered multiplier upgrades (`Game.MakeTiered` / `Game.TieredUpgrade` helpers per `main.js:10145–10155`; cursor upgrade block per `main.js:10236–10244`; per-building tiered upgrade calls per `main.js:10246–10914`); global cross-building bonus series (Thousand fingers through Septillion fingers per `main.js:10239–10243`); achievement-gated kitten upgrade chain (milk system per `main.js:5240`; kitten CPS multipliers per `main.js:5256–5271`).
- **Achievements:** Building-count thresholds from within each building's callback (`Game.Win` calls per `main.js:9019+`); production-total milestones (`BankAchievement` helper + calls per `main.js:12994–13037`); CPS-rate milestones (`CpsAchievement` helper + calls per `main.js:13005–13048`); click-count milestones per `main.js:13058–13065`.
- **Progression gates:** Per-building visibility unlock (`Game.Unlock` calls within each building callback per `main.js:9004+`); per-building upgrade visibility from owned-count thresholds per building callbacks; first ascension as arc boundary (`Game.HowMuchPrestige` per `main.js:4186`; `Game.Ascend` per `main.js:4371`).

### Required structural properties

The mechanical relationships that must function in the running app for the demo arc beats below to walk end-to-end. Grouped by theme; each property names the relationship and cites the canonical Cookie Clicker site that establishes its shape.

**Production**

- **Big cookie click drives immediate cookie gain.** Click value = cursor CPS × upgrade chain × cross-building bonus (Thousand fingers series) per `Game.ClickCookie` (`main.js:4988`) and the cursor's cps function (`main.js:9001–9015`).
- **Per-building passive emission accumulates cookies per tick.** Each building's CPS = base CPS × upgrade multiplier grants × owned count; total ticks into `Game.cookies` each frame per `main.js:2982–3282`.

**Purchase and cost scaling**

- **Geometric per-unit building cost curve.** Each additional unit costs base × growth^owned; `priceFunc` closure on the `Game.Object` constructor (`main.js:7982`).
- **Tiered upgrade unlock gates from owned-count.** When `this.amount >= N`, the matching upgrade becomes available via `Game.Unlock`; threshold checks inside each building callback per `main.js:9004+` (Cursor's first unlock at amount = 1).

**Modifier chain composition**

- **Per-building tiered multiplier upgrades double the building's CPS.** `Game.MakeTiered` wires a ×2 CPS multiplier into the building's rate function on upgrade purchase per `main.js:10145–10155`.
- **Global cross-building bonus upgrades add a click + per-owned-building bonus.** The Thousand fingers series (`main.js:10239–10243`) contributes a flat per-click cookie bonus scaling with total non-cursor building count, composing multiplicatively with cursor CPS.
- **Achievement count compounds CPS via milk/kitten chain.** `Game.milkProgress = Game.AchievementsOwned / 25` per `main.js:5240`; kitten upgrades multiply total CPS by `(1 + milkProgress × factor)` per `main.js:5256–5271`. First-arc port uses a direct per-achievement multiplier as a declared-invention simplification; the milk/kitten chain is the canonical Cookie Clicker shape and the full chain lands if kitten upgrades are included in the first-arc upgrade scope.

**Achievements and accumulation**

- **Achievement requirements evaluate against live game state each tick.** Building-count predicates (`amount >= N`) and production-milestone predicates fire on threshold crossing; `Game.Win` stamps the achievement per each building callback (`main.js:9019+`) and via `CpsAchievements` / `BankAchievements` threshold sweeps (`main.js:5323–5325`).
- **Achievements persist across the run.** `AchievementsOwned` accumulates; milk progress and kitten multipliers carry forward.

**Progression gates and arc boundary**

- **Building visibility unlocks when the previous tier threshold is crossed.** Next-tier building row appears after `Game.Unlock` fires inside the prior building's owned-count callback per `main.js:9004+`.
- **Upgrade visibility unlocks from per-building owned-count.** Upgrade row appears after the matching `Game.Unlock` threshold triggers per building callbacks.
- **First ascension is the arc-close gate.** `Game.HowMuchPrestige(Game.cookiesReset + Game.cookiesEarned)` returns potential prestige gain per `main.js:4186`; `Game.Ascend` at `main.js:4371` closes the first-arc run. Demo arc beat 8 reaches this gate but does not cross it.

### Demo arc beats

The first arc walks player-observable milestones from § 1's player-experience prose, each mapped to at least one content entry. Every beat reachable in the running app on a fresh save.

1. **First click → first cookie.** Big cookie click fires; resource bar increments. Cursor in the store; clicking repeatedly is the only production source.
2. **First auto-producer purchased.** First passive building purchased; cookies tick upward continuously. Resource rate readout shows passive CPS.
3. **First tiered upgrade unlocks.** Owned-count threshold crossed; first per-building upgrade appears in the store. Purchase doubles building CPS; modifier chain now has two factors visible.
4. **Mid-tier buildings unlock sequentially.** Resource threshold crosses unlock next building tiers; bulk-buy affordance active for cheaper tiers.
5. **First global bonus upgrade fires.** Thousand fingers (or equivalent) cross-building bonus becomes purchasable; click value increases visibly from cross-building bonus composition.
6. **First achievement milestone fires.** Production-total or building-count threshold reached; achievement stamps and its multiplier composes into the headline CPS readout.
7. **Modifier chain stacking visible.** Multiple upgrade tiers × achievement count compounding; headline CPS grows faster than any individual factor. Kitten upgrades active if first-arc upgrade scope includes them.
8. **Top of first-arc building staircase + arc-close gate visible.** Upper building tiers accessible; ascension gate visible (prestige level readout and Ascend button appear). Demo arc closes without crossing the ascension gate.

### Later-arc systems (fork extension territory)

Cookie Clicker ships post-first-arc systems that extend the loop beyond the initial building staircase. The first arc covers the pre-ascension cookie economy; later arcs are fork extension territory:

- **Heavenly Chips / Prestige upgrade tree** — `Game.Ascend` at `main.js:4371`; prestige-pool upgrades at `main.js:10915+` (`pool='prestige'`). Each ascension resets buildings + non-prestige upgrades for permanent prestige multipliers; the heavenly upgrade tree (Starter kit, Five-finger discount, etc.) grows with repeated ascensions. Forks extending the prestige loop build on the existing cookie accumulation baseline.
- **Grandmapocalypse / Wrinklers** — `elderWrath` / `pledges` state at `main.js:2171–2180`; triggered by the Bingo center research upgrade at `main.js:10364`. Wrinklers suck CPS but return accumulated cookies with interest on pop; Elder Pledge temporarily halts the Grandmapocalypse. Fork extension from the research-unlock gate.
- **Seasonal events** — `Game.baseSeason` detection at `main.js:1387–1401` (Halloween, Christmas, Easter, Valentine's, April Fools); season-specific drops and seasonal upgrade pools. Fork extension layering on top of the standard upgrade economy.
- **Dragon (Krumblor)** — dragon management system unlocked via a prestige upgrade; auras compose into the CPS calculation. Fork extension from the prestige layer.
- **Minigames** — Garden (`minigameGarden.js`), Grimoire (`minigameGrimoire.js`), Stock Market (`minigameMarket.js`), Pantheon (`minigamePantheon.js`), Dungeons (`dungeons.js`); each unlocks at building level thresholds after first ascension. Orthogonal economy substrates; fork extension.
- **Golden cookies / Shimmers** — `Game.shimmer` at `main.js:5416`; timed click events granting temporary multiplicative bonuses (Frenzy, Lucky, etc.) or permanent upgrade reveals. Available from the start of a run with no prestige gate; first-arc inclusion is a fork-scope decision.
- **Sugar lumps** — accumulate over real time after first ascension; spent on building levels and minigame unlocks. Post-ascension; fork extension.

---

## 6. UI prescription

- **Primary shell:** `ThreePanelShell` — Producer's modifier-chain depth (§ 3 stress axis 1) and 7-tier producer hierarchy consume enough UI surface that the three-panel form is defensible over the narrative-clicker majority. Cites `subgenre-shell-mapping-2026.md` § "narrative clicker" (secondary cluster 3/12 classifiable). Exemplar rows from `layout-audit-2026.md`: Cookie Clicker, Universal Paperclips, A Dark Forest.
- **Secondary shell:** `SingleColumnShell` — narrative-clicker strict majority per `subgenre-shell-mapping-2026.md` (5/12 classifiable). Use for minimalist / mobile-leaning Producer forks. Exemplar rows: AdVenture Capitalist, A Dark Room, Candy Box 2.
- **Form-factor intent:** `desktop` — narrative-clicker corpus is desktop-dominant per `layout-audit-2026.md` distribution; AdVenture Capitalist (`mobile-aware: yes`) is the outlier, not the rule. Responsive is a fork-level choice, not a skeleton-level claim.
- **ARIA-aligned widgets (lift targets):**
  - `Tooltip` — modifier-chain factor breakdowns on hover; upgrade affordability previews. Cites `widget-vocabulary.md` Layer 1 (frequency 5).
  - `Dialog` — achievement grid modal; settings modal. Cites `widget-vocabulary.md` Layer 1 (frequency 6).
  - `Progress` — per-producer cooldown / auto-production tick indicators. Cites `widget-vocabulary.md` Layer 1 (highest frequency, 12).
  - `Toast` — achievement-unlock notifications (beat 5 signal). Cites `widget-vocabulary.md` Layer 1 (frequency 3).

  Lift from `@/lib` / reka-ui primitives; forks do not reimplement focus, portal, or a11y.
- **Domain widgets (per-fork implementation):**
  - resource bar — persistent top or sidebar strip showing the primary currency + current rate. Cites `widget-vocabulary.md` Layer 2 (frequency 11; 9 distinct shapes across 3 games per OL-273 Phase 2 — no pre-abstraction).
  - action card / building card — per-producer row with icon, name, count, cost, per-unit rate, buy-1/10/max affordances. Cites `widget-vocabulary.md` Layer 2 (frequency 4; AdVenture Capitalist and Fundamental exemplify the field set).
  - progress track — embedded per-row cooldown bars for auto-production visibility. Cites `widget-vocabulary.md` Layer 2 (frequency 7).
- **Layout detail:** three-panel region assignment — left column holds the producer list (7 tiers, scroll-as-needed), centre holds the primary click target + headline resource readout + modifier-chain expansion, right column holds upgrades tray + stats + achievement-button. Modal (`Dialog`) hosts the achievement grid per beat 5.
- **Nav pattern:** none at the shell level — Producer is single-screen. Expansion tabs for the modifier-chain readout (centre column) and achievement-category filters (right column) are widget-internal, not shell navigation.

---

## 7. Predicted engine gaps

| Gap | Severity | Notes |
|-----|----------|-------|
| Bulk-buy UI helper | Low | `calculateMaxAffordable` exists; "Buy 1 / 10 / 25 / Max" UI is game-side today. If three archetypes need the same pattern, graduate a `useBulkBuy()` composable. |
| Modifier-chain debug view | Low | A mature Producer run surfaces 10+ chain factors; developers need to introspect "where did this multiplier come from?" Could be a harness analyzer, not an engine primitive. |
| `break_eternity` tetration correctness | Unknown | Probe 5 is designed to find this. May be nothing; may be the headline defect. |
| Per-producer milestone bonus composition | Medium | Quantity-tracking milestone bonuses (beat 7's stacked factors) compose with modifier chains today via manual wiring. If Producer, Scaler, and Interlocker all hand-wire this, graduate a `createMilestoneBonus` helper. |
| Achievement category ergonomics at scale | Low | A large achievement set with mechanical rewards means many option blocks. If verbose, a `defineAchievement()` helper would help — but measure first, don't pre-abstract. |

---

## 8. Themes

### Theme A — Bakery

- **Hook:** The classic. Cookies, cursors, grandmas, farms, factories. Cultural shorthand — new players grok the archetype instantly when dressed this way.
- **Resource mapping:** resource = cookies; producers = [cursor, grandma, farm, mine, factory, bank, temple].
- **Narrative framing:** none — pure genre baseline.

### Theme B — Reef Reclamation

- **Hook:** You are seeding a dying reef. Coral polyps drift on currents; small things attract bigger things; eventually a kelp forest and a pod of whales have adopted your patch of ocean.
- **Resource mapping:** resource = biomass; producers = [polyp, sea-urchin, parrotfish, coral-head, kelp-stand, reef-shelf, whale-pod].
- **Narrative framing:** light — beat 8 flavour event shows the reef's water clarity before/after. Ecological reset as potential fork-added prestige.

### Theme C — Signal Farm

- **Hook:** Bits, antennas, relays, satellites, orbital arrays. The curve bakes into a cold computational aesthetic — fewer particles, more readouts.
- **Resource mapping:** resource = packets; producers = [listener, antenna, repeater, relay-tower, ground-station, comsat, constellation].
- **Narrative framing:** optional — first-contact signals at milestone thresholds as hidden-content hooks.

### Theme D — Paper Mill

- **Hook:** Material-flow aesthetic. Trees → pulp → reams → books. Production ratios are visible as flowing belts on the producer panel.
- **Resource mapping:** resource = reams; producers = [worker, sawmill, pulp-line, paper-machine, bindery, printshop, publisher].
- **Narrative framing:** none.

---

## Vocabulary anchors

Every name cited in this doc must resolve to one of:

- **Pattern names** → `open-loop-research/LIBRARY.md` + linked pattern files
- **Cross-pattern properties** → `open-loop-research/patterns/cross-pattern-properties/*.md`
- **Novel-patterns clusters** → `open-loop-research/reports/novel-patterns/novel-patterns-synthesis-v4.md`
- **Engine primitives** → `open-loop-engine/docs/api/INDEX.md` (directory) + per-tier files (resources, mechanics, content, lifecycle, engine, advisors, spatial, harness)
- **Corpus games** → `open-loop-research/analyses/complete/*-analysis.md`
- **Layout shells** → `open-loop-starter/src/lib/shells/`
