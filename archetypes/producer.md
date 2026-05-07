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

export interface ProducerBalance {
  clickBaseValue: DecimalSource;           // default 1
  tier1BaseRate: DecimalSource;            // default 0.1
  producerCostGrowth: DecimalSource;       // default 1.15
  tierCostRatios: DecimalSource[];         // inter-tier step multipliers
  upgradeMultiplier: DecimalSource;        // default 2
  globalUpgradeMultiplier: DecimalSource;  // default 2
  achievementMultiplier: DecimalSource;    // default 1.02
  milestoneThresholds: number[];           // default [1, 10, 25, 50, 100, 150, 200, 300, 400, 500]
  milestoneBonusPerTier: DecimalSource;    // default 2
}
```

**Override semantics:** `boot.ts` exports `createProducerEngine(overrides?)` that accepts a flat-category deep-partial — `{ producers?, upgrades?, achievements?, balance? }` — with per-entity replacement keyed by `id` and deep-merge over balance. Sim tests and workbench perturbation route through this factory. The addressable shape *is* the TypeScript type over the data; there is no synthetic vars layer and no codegen round-trip.

**Balance methodology:** Producer's `balance/` directory is the in-tree reference for methodology #1 (`solve.ts`: spec/calibrate/lock via Gauss-Seidel bisection) and methodology #2 (`predict.ts` + `spec.ts`: triangular multi-resource walker over engine-as-oracle queries; `verify.ts`: predictor-vs-sim diff for engine-side primitive drift detection). See `archetypes/BALANCING.md § Theme 3` for the full methodology kit and `§ Engine as oracle` for the unifying primitive that ties #1 and #2. Subsystem classification: Pure closed-form, triangular composition row — `balance/shape.ts § PRODUCER_SUBSYSTEMS`.

---

## 5. Content sketch

- **Resources:** 1 — the primary currency.
- **Producers / Activities:** 1 click activity + 7 producer tiers. Example naming scale (bakery theme): cursor, grandma, farm, mine, factory, bank, temple.
- **Upgrades / Purchasables:** 3 per producer × 7 = 21 producer-scoped multiplier upgrades; 6 global upgrades (click multipliers, cross-producer multipliers, bulk-buy unlocks). Total 27.
- **Progression gates:** resource-threshold unlocks for each producer tier (visibility gate, not hard block); upgrade visibility scoped by owning ≥1 of the relevant producer.
- **Achievements:** 30 — 10 production-milestone (reach N/sec), 10 building-count milestone (own N of producer X), 10 hidden (e.g. *first minute without clicking*, *bought all T1 upgrades*). All 30 grant `achievementMultiplier` contribution to the modifier chain.

**Density target:** every beat in § 4 has at least one corresponding content entry above (beats 1–3 → producers; 4 → upgrades; 5 → achievements; 6 → bulk-buy affordance; 7 → modifier chain readout; 8 → top tier + flavour event).

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
| Achievement category ergonomics at scale | Low | 30 achievements with mechanical rewards means 30 option blocks. If verbose, a `defineAchievement()` helper would help — but measure first, don't pre-abstract. |

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
- **Engine primitives** → `open-loop-engine/docs/api/INDEX.md` + the four `*.api.md` files
- **Corpus games** → `open-loop-research/analyses/complete/*-analysis.md`
- **Layout shells** → `open-loop-starter/src/lib/shells/`
