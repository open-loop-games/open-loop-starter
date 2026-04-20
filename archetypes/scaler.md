# Archetype: Scaler

> **One-line identity:** Multi-layer nested Prestige + prestige-integrated Challenge layers + deep Modifier Chains at extreme scale — the layered-compression incremental.
>
> **Status:** `canonical`

**Exemplars (validation, not clone targets):** [Antimatter Dimensions](../../open-loop-research/analyses/complete/antimatter-dimensions-analysis.md), [Synergism](../../open-loop-research/analyses/complete/synergism-analysis.md), [NGU Idle](../../open-loop-research/analyses/complete/ngu-idle-analysis.md).

---

## 1. Player experience

Scaler is the archetype where *the game you played an hour ago becomes a footnote*. You buy producers, they produce, costs scale, a number climbs — familiar Producer shape. But then you hit a prestige threshold and ascend: everything you built resets, and in exchange you get a new currency, a new upgrade tree, and a multiplier that makes your next run minutes instead of hours. A few runs later there is a *second* layer on top of the first, with its own currency and its own reset scope that wipes the first layer's upgrades too. Eventually a third. Each layer compresses the one below it until what took you an hour takes seconds.

A thirty-minute session near the start is a prestige cycle: push the headline resource past a threshold, click the big button, watch the multipliers compound, out-perform your previous run within minutes. A thirty-minute session in the mid-game is a *challenge* run — you voluntarily take on a nerf ("production halved for Dimension 8," "can't buy upgrades") inside the outer prestige loop, grinding it out for a permanent stacking bonus. The long-term pull is watching the headline multiplier readout scroll past `1e12×`, then `1e120×`, then into tetration, knowing every one of those digits came from a deliberate composition of layers, challenges, and upgrades you designed yourself.

---

## 2. Pattern composition

**Required patterns:**

- [Prestige Systems](../../open-loop-research/patterns/tier-1-foundation/prestige-systems.md) — the headline mechanic. Multi-tier nested prestige (Variation B in the pattern doc) is non-negotiable: 2–5 layers, each with its own currency, each resetting the layers below it.
- [Challenge Systems](../../open-loop-research/patterns/tier-3-moderate/challenge-systems.md) — prestige-integrated challenges (Variation B — Production Modifiers in the pattern doc). Active *during* a prestige run, completion grants permanent stacking multipliers.
- [Activity Systems (A+C hybrid)](../../open-loop-research/patterns/tier-0-universal/activity-systems/) — producer hierarchy inside the innermost layer. Scaler starts as a Producer and grows prestige wings on top.
- [Progression Systems](../../open-loop-research/patterns/tier-0-universal/progression-systems.md) — each new prestige layer is a progression reveal; unlocking the next layer is the headline arc beat.

**Cross-pattern properties engaged:**

- [Modifier Chains](../../open-loop-research/patterns/cross-pattern-properties/modifier-chains.md) — the deepest of any archetype. Multi-layered: achievements × per-tier upgrades × prestige-layer multipliers × challenge completions × milestone bonuses. Evaluation-order-sensitive; stacks 10+ factors in mature play.
- [Cost Scaling](../../open-loop-research/patterns/cross-pattern-properties/cost-scaling.md) — exponential for base producers, piecewise-with-softcaps for prestige-layer purchases, polynomial/factorial in late-layer costs.
- [Scaling Formulas](../../open-loop-research/patterns/cross-pattern-properties/scaling-formulas.md) — every family is used. Exponential for costs, logarithmic/sqrt for prestige conversions, piecewise for softcaps, tetration in late-layer regimes.
- [Softcapping](../../open-loop-research/patterns/cross-pattern-properties/softcapping.md) — prestige formulas softcap at extreme values to keep the curve readable; challenge rewards softcap past N completions to bound Effective-Challenge-Completion stacks.
- [Purchase Mechanics](../../open-loop-research/patterns/cross-pattern-properties/purchase-mechanics.md) — producer tiers, per-layer upgrade trees, prestige-tier unlocks all flow through the same purchasable primitives.

**Optional modifiers (fork may add):**

- **Automation tier for prestige** — auto-prestige at threshold, auto-buy upgrades in priority order. Universal in late-game Scaler games; ships disabled on day one and unlocks with mid-arc progression.
- **Per-layer layout** — tabbed UI with one tab per prestige layer (Antimatter Dimensions shape) vs. all-in-one stacked panels. Cosmetic but costume-level consequential.
- **Meta-prestige / Singularity** — a 4th or 5th layer that resets the first three for a new currency family. Honours the "Scaler goes as deep as you want" spirit. Fork-side extension, not baseline.

**Novel-patterns cluster alignment:** n/a — Scaler is the canonical composition the novel-patterns clusters describe deviations from. Cluster 4 (Prestige Architecture Innovations), Cluster 3 (Mathematical & Scaling Innovations), and Cluster 11 (Challenge Innovations) all take Scaler as their baseline and measure departures from it.

---

## 3. Engine surface

| Layer | Primitive | Role in this archetype |
|-------|-----------|------------------------|
| core | `createResource` | One base currency + one currency per prestige layer (2–5 layers). |
| core | `trackTotal` / `trackBest` | Lifetime / best-run accumulators on each prestige currency; feed challenge thresholds and meta-layer bonuses. |
| core | `createModifierChain` | One chain per prestige layer. Layered composition is the archetype's signature. |
| core | `createMultiplicativeModifier` | Per-upgrade, per-achievement, per-challenge-completion multipliers. |
| core | `createAdditiveModifier` | Within-category addition (e.g. "Dimension 8 boosts 1–7 additively"). |
| core | `createSequentialModifier` | Order-dependent stacks across layers. Evaluation-order sensitivity is a stress axis. |
| core | `createExponentialModifier` | Exponent bumps on prestige formulas (e.g. Infinity-Dimension exponent upgrades). |
| core | `calculateMaxAffordable` | Bulk-buy and "next prestige threshold" inversions at `1e100`+ scales. |
| core | `runHeadless` | Beat-timing sim tests and Workbench probes. |
| systems | `createScalingPurchasable` | Producer tiers at the base layer + upgrade ladders on each prestige layer. |
| systems | `createPurchasableCategory` | Per-layer upgrade trees (typically 4–8 upgrades per prestige tier). |
| systems | `createAchievementCategory` | Milestone rewards that multiplicatively feed the chain, plus hidden achievements for challenge-specific accomplishments. |
| systems | `createTieredAchievement` | Production-tier and layer-completion ladders. |
| systems | `createChallengeCategory` | Prestige-integrated challenges. Completion count feeds the modifier chain on each outer prestige. |
| systems | `createReset` | One reset per prestige layer. Nested reset coordination is the archetype's dominant structural problem. |
| systems | `createPersistentEffectSystem` | Challenge-active effects (production nerfs, cost multipliers) applied for the challenge's duration. |
| systems | `createCumulativeConversion` | Base-resource-to-prestige-currency conversion (logarithmic / sqrt / polynomial families). |
| systems | `createLogFormula` / `createSqrtFormula` / `createPolynomialFormula` | Prestige-conversion formula families; different layers typically use different families. |
| harness | `runMatrix` | Probe robustness across the extreme-scale vars space. |

**Engine systems explicitly not used (required):**

- `createLoop` — Scaler does not use loop-as-time; prestige is threshold-triggered and player-paced, not cycle-paced. If a fork reaches for `createLoop`, it is building Looper.
- `createZoneSystem` — Scaler progression is numeric and layer-gated, not spatial. No map, no zones.
- `createInventory` — Scaler has no items. Upgrades are purchasables; prestige currencies are resources; there is no item-identity layer.
- `createSequencer` — no action queue; players click upgrades and the prestige button.
- `createSkillCategory` — no skill-level gates; progression runs through resource thresholds and prestige layers.

Naming what's *absent* is part of the Scaler contract: it refuses the spatial and queue-shaped primitives and spends its surface budget on modifier depth and reset coordination. Every primitive named above resolves in `open-loop-engine/docs/api/INDEX.md`.

**Primary stress axes:**

1. **Multi-layer reset coordination.** A 3-layer Scaler has three `createReset`s with overlapping-but-not-identical `thingsToReset` sets. Reset(L2) must wipe every L1 producer and upgrade, preserve every L1-and-L2 currency, and not clobber L3 state. Reset correctness under repeated ascensions is *the* correctness test for this archetype — one off-by-one in a retention list corrupts save state for every future run.
2. **Modifier chain ordering.** A mature Scaler evaluates 10+ factors per tick per dimension. Multiplicative-within-category + additive-across-category + sequential-across-layers is the default composition, and the results diverge meaningfully when the order shifts. Scaler is the archetype that forces `createSequentialModifier` to carry weight.
3. **Formula correctness at extreme scale.** Prestige currencies cross `1e100` within the 1–2h arc; `calculateMaxAffordable` and the logarithmic prestige formulas must remain correct as `break_eternity.js` crosses into tetration. Scaler is the archetype that will find the tetration-regime defect if one exists.
4. **Per-layer UI density.** 3 layers × (producers + upgrades + challenges + achievements) is the largest UI surface of any archetype. The shell choice and tab organisation are the difference between "comprehensible mid-game" and "players quit at layer 2."

---

## 4. Beat map

The 1–2h arc compresses the reference-game scopes (Antimatter Dimensions' ~8h time-to-Infinity, Synergism's ~1h time-to-Transcension, NGU Idle's ~2h time-to-Rebirth) into a single showcase. First prestige lands around 20 min; second layer unlocks around the one-hour mark; third layer is teased but not required for arc closure.

| # | Beat | Target sim-time | Trigger condition | Player-visible signal | Why it matters |
|---|------|-----------------|-------------------|------------------------|-----------------|
| 1 | First producer purchased (Dimension 1) | 0:00–1:00 | `dimensions[0].count >= 1` | Auto-production starts; rate readout appears | Onboarding — Scaler's base layer is Producer-shaped, players need the familiar footing |
| 2 | Higher-tier dimension owned (first cascading production) | 3:00–8:00 | `dimensions[2].count >= 1` | Mid-tier row lights up; tier-over-tier production chain visible | Validates the core producer-cascade — production of tier N boosts tier N-1 |
| 3 | First prestige threshold reached (Layer-1 button lights up) | 12:00–20:00 | `primaryResource >= tier1PrestigeThreshold` | Big prestige button becomes active; projected reward shown | The archetype's signature moment — the promise of compression appears |
| 4 | First prestige executed (Layer-1 reset) | 18:00–25:00 | `layer1Currency >= 1 after reset` | Full reset flash; new currency counter appears; first multiplier ticks in | Introduces the headline loop — build up, ascend, restart faster |
| 5 | First Layer-1 upgrade purchased; second prestige visibly faster than first | 30:00–45:00 | `layer1Upgrades.owned >= 1 AND loopCount >= 2 AND loop[2].simTime < loop[1].simTime * 0.6` | Upgrade tree visible; next run reaches beat 3 in ≤60% of first-run time | Validates the compression claim — *this time it was faster* |
| 6 | First challenge completed; permanent multiplier earned | 45:00–70:00 | `challenges.completedCount >= 1` | Challenge toast; headline multiplier ticks up with a named "Challenge Completions" source | Challenge Systems integration — challenges are not a side mode, they feed the chain |
| 7 | Second prestige layer unlocked | 70:00–95:00 | `layer2Currency is visible AND >= 1` | New tab/panel appears; second currency begins accumulating; layer-1 progress feels small | The "there was a whole other game on top" reveal that defines Scaler |
| 8 | Arc closure: modifier chain shows 8+ named factors AND Layer-3 preview visible | 95:00–120:00 | `modifierChain.visibleFactors.length >= 8 AND layer3.teased` | Expanded chain readout; third-layer panel hints at content behind an L2-currency gate | The 1–2h showcase closure. The player sees the compounded stack and knows there is further depth. Fork extends beyond here; skeleton stops |

**Arc closure beat:** #8.

---

## 5. Data shape

```ts
// archetype.ts — skeleton defaults
export interface ScalerArchetypeVars {
  // Structural shape of the prestige stack — changing these is a fork-of-skeleton decision.
  prestigeLayerCount: number;          // default 3 (AD-like); range 2–5
  dimensionCount: number;              // default 8 (base-layer producer tiers)
  upgradesPerLayer: number;            // default 6 (per-layer upgrade-tree size)
  challengesPerLayer: number;          // default 8 (challenges attached to each prestige tier)
  achievementCount: number;            // default 40 (production + layer-completion + hidden)
  modifierEvaluationOrder: 'layered-multiplicative' | 'sequential-layered';

  // Challenge composition.
  challengeRewardShape: 'linear-stack' | 'ecc-softcap';  // ECC = Effective Challenge Completions

  // Automation tier (disabled by default; unlocks in mid-arc).
  autoPrestigeUnlockLayer: 1 | 2 | 3 | 'disabled';      // at what layer auto-prestige becomes available
}

// theme.ts — costume, no mechanical impact
export interface ScalerThemeVars {
  baseResourceName: { singular: string; plural: string };
  /** Length must equal ScalerArchetypeVars.prestigeLayerCount. */
  layerCurrencyNames: Array<{ singular: string; plural: string }>;
  /** Length must equal ScalerArchetypeVars.prestigeLayerCount. */
  prestigeButtonLabels: string[];                         // e.g. ['Big Crunch', 'Eternity', 'Reality']
  dimensionNames: string[];                               // length = dimensionCount
  upgradeFlavour: Array<{ label: string; description: string; layer: number }>;
  challengeFlavour: Array<{ label: string; description: string; layer: number }>;
  endOfArcMessage: string;                                // fires at beat 8
}

// balance.ts — mechanical overrides; drives beat timing
export interface ScalerBalanceVars {
  // Base-layer producer cost curve (Producer-shaped).
  baseDimensionCost: {
    firstTierBaseCost: DecimalSource;                     // default '10'
    interTierMultiplier: DecimalSource;                   // inter-tier cost jump, default '1000'
    perPurchaseGrowth: number;                            // exponential per purchase, default 1.15
  };

  // Prestige-currency conversion formulas, one per layer.
  prestigeConversions: Array<{
    layer: number;
    family: 'log' | 'sqrt' | 'polynomial';
    /** For 'log' / 'polynomial' families. */
    scale: DecimalSource;
    /** For 'polynomial' family. */
    exponent?: number;
    /** The base-resource value at which the conversion yields currency = 1. */
    threshold: DecimalSource;
  }>;

  // Piecewise softcap thresholds on the prestige formulas.
  softcapThresholds: Array<{
    layer: number;
    /** Currency value above which the formula softens. */
    at: DecimalSource;
    /** Softening shape after threshold. */
    afterShape: 'sqrt' | 'log' | 'linear-slow';
  }>;

  // Per-layer upgrade multiplier step.
  layerUpgradeMultiplier: number;                         // default 2 (upgrades double something)
  challengeCompletionMultiplier: number;                  // per-completion multiplier, default 1.02
  eccSoftcapAt: number;                                   // ECC stops stacking linearly after N completions, default 8

  // Inter-layer unlock thresholds.
  layerUnlockThresholds: Array<{
    layer: number;                                        // which layer unlocks
    requires: 'layer-n-currency' | 'challenges-completed' | 'layer-n-total';
    value: DecimalSource;
  }>;

  autoPrestigeUnlockLoopCount: number;                    // default 5 (after 5 layer-1 prestiges)
}
```

**Override semantics:** deep-merge at load order `archetype → theme → balance`. Tests pass an override object to `runSim`.

**Codegen contract:** `pnpm codegen:archetype-vars scaler` (pending) reads this section and emits `src/modules/mods/<game>/vars/{archetype,theme,balance}.ts` with matching defaults. Shared archetype-level types + defaults live at `src/archetypes/scaler/`.

---

## 6. Balance probes

| Probe | Perturbation | Target beat(s) | Tolerance | Rationale |
|-------|--------------|----------------|-----------|-----------|
| `prestige-formula-scale` | `prestigeConversions[0].scale` ×[0.80, 1.20] | 3, 4, 7 | Beat sim-time ±25% | First-prestige pacing is the archetype's dominant lever; if it misses, the whole arc mistimes |
| `softcap-threshold` | `softcapThresholds[0].at` ×[0.5, 2.0] | 5, 7, 8 | Headline multiplier at beat 7 within [8×, 40×] | Softcap placement governs whether mid-arc feels compressive or stalling |
| `modifier-order-invariance` | swap `modifierEvaluationOrder` between the two allowed shapes | 8 | Headline-multiplier delta ≤0.5% at beat 7 | The chain arithmetic must produce the same (or near-same) value regardless of order, modulo sequential-only multipliers. If violated, chain composition has a semantic bug |
| `cost-growth-rate` | `baseDimensionCost.perPurchaseGrowth` ×[0.90, 1.10] | 1, 2, 3 | Beat sim-time ±20% | Producer-layer pacing; controls time-to-first-prestige |
| `extreme-scale-inversion` | run beats 6–8 at `prestigeConversions` scales that push layer-2 currency to `1e200`, `1e500`, `1e1500` | 6, 7, 8 | `calculateMaxAffordable` returns correct integer N at every scale; no `NaN` / `Infinity` | `break_eternity.js` tetration-regime correctness; the defect-hunting probe |
| `challenge-reward-stack` | `challengeCompletionMultiplier` ×[0.98, 1.05] AND `eccSoftcapAt` ×[0.5, 1.5] | 6, 8 | Beat-8 headline multiplier stays within [1e6×, 1e12×] band | ECC-softcap shape governs whether challenge grinding is rewarding or runaway |

**Minimum probe count:** 6 (meets ≥4 requirement; covers prestige formula, softcap, modifier order, cost growth, extreme-scale inversion, and challenge-reward stacking).

---

## 7. Sim assertions

```ts
import { describe, it, expect } from 'vitest';
import { runHeadless } from 'open-loop-engine';
import { runMatrix } from 'open-loop-engine/harness';
import { minutes } from '@/test/time';
import { loadScalerVars } from '../vars';
import { buildScalerEngine } from '../engine';

describe('scaler — beat map', () => {
  const vars = loadScalerVars();

  it('beat 1: first dimension purchased within 0–60 s', async () => {
    const result = runHeadless({
      engine: buildScalerEngine(vars),
      until: (state) => state.dimensions[0].count.gte(1),
      maxSimTime: minutes(2),
    });
    expect(result.simTime).toBeBetween(0, 60);
  });

  it('beat 4: first prestige executed within 18–25 min', async () => {
    const result = runHeadless({
      engine: buildScalerEngine(vars),
      until: (state) => state.prestigeCount >= 1 && state.layer1Currency.gte(1),
      maxSimTime: minutes(30),
    });
    expect(result.simTime).toBeBetween(minutes(18), minutes(25));
  });

  it('beat 5: second prestige is ≥40% faster than first', async () => {
    const result = runHeadless({
      engine: buildScalerEngine(vars),
      until: (state) => state.prestigeCount >= 2,
      maxSimTime: minutes(60),
      capture: ['prestigeTimestamps'],
    });
    const [first, second] = result.prestigeTimestamps;
    expect(second - first).toBeLessThan(first * 0.60);
  });

  // one `it` per beat — full enumeration in the checked-in test file
});

describe('scaler — balance robustness', () => {
  it('modifier-chain order invariance: layered vs sequential differ by ≤0.5%', async () => {
    const layered = runHeadless({
      engine: buildScalerEngine(loadScalerVars({ archetype: { modifierEvaluationOrder: 'layered-multiplicative' } })),
      until: (state) => state.simTime >= minutes(95),
      maxSimTime: minutes(100),
    });
    const sequential = runHeadless({
      engine: buildScalerEngine(loadScalerVars({ archetype: { modifierEvaluationOrder: 'sequential-layered' } })),
      until: (state) => state.simTime >= minutes(95),
      maxSimTime: minutes(100),
    });
    const delta = Math.abs(layered.headlineMultiplier.log10().toNumber() - sequential.headlineMultiplier.log10().toNumber());
    expect(delta / layered.headlineMultiplier.log10().toNumber()).toBeLessThan(0.005);
  });

  it('extreme-scale inversion: calculateMaxAffordable holds at 1e500+', async () => {
    const matrix = runMatrix({
      engine: (v) => buildScalerEngine(v),
      baseVars: loadScalerVars(),
      perturbations: [
        { path: 'balance.prestigeConversions.0.scale', values: ['1', '1e200', '1e1000'] },
      ],
      beats: ['beat-6', 'beat-7', 'beat-8'],
    });
    for (const cell of matrix.cells) {
      expect(Number.isFinite(cell.bulkBuyN)).toBe(true);
      expect(cell.bulkBuyN).toBeGreaterThan(0);
    }
  });

  // one `it` per probe from § 6
});
```

**Required test count:** 8 beats + 6 probes = 14 tests minimum. Tests checked into `src/modules/mods/<game>/sim/scaler.sim.test.ts`.

---

## 8. Content sketch

- **Resources:** 1 base currency + 1 currency per prestige layer. Default 3 layers → 4 total resources. Plus `trackTotal` / `trackBest` accumulators on each.
- **Producers / Dimensions:** 8 base-layer dimension tiers in a cascading production chain (tier N produces tier N-1). Example naming scale (antimatter theme): 1st Dimension through 8th Dimension.
- **Upgrades:** 6 per prestige layer × 3 layers = 18 prestige-layer upgrades, plus 8 base-layer dimension upgrades and 4 global early-game upgrades. Total ~30 purchasables at arc closure.
- **Challenges:** 8 per prestige tier × 3 tiers = 24. Each nerfs production or caps something (e.g. *"8th Dimension disabled," "cost multiplier doubled," "no purchase of upgrade X"*); completion grants a stacking multiplier feeding the chain.
- **Achievements:** 40 — 15 production-milestone (reach N/sec in layer X), 15 layer-progress (complete N challenges in layer X, reach layer X), 10 hidden (e.g. *first prestige within 10 min*, *complete a challenge without buying upgrade Y*).
- **Progression gates:** resource-threshold unlocks for each layer; per-layer challenge availability gated by the layer's currency; auto-prestige automation tier unlocks after 5 layer-1 prestiges.

**Density target:** every beat in § 4 maps to at least one content entry. Beats 1–2 → base dimensions; beat 3 → primary-resource threshold + layer-1 prestige button; beat 4 → first prestige currency; beat 5 → layer-1 upgrade tree; beat 6 → layer-1 challenge; beat 7 → layer-2 tab + layer-2 currency; beat 8 → modifier-chain expansion view + layer-3 teaser tab.

---

## 9. UI prescription

- **Primary shell:** `SidebarMainShell` — prestige-idle weak majority per `subgenre-shell-mapping-2026.md` § "prestige idle" (5/12 classifiable; Antimatter Dimensions is the cluster anchor). Shell matches Scaler's canonical exemplar. Exemplar rows from `layout-audit-2026.md`: Antimatter Dimensions, Advent Incremental, The Game Dev Tree.
- **Secondary shell:** `MultiColumnShell` — for forks that outgrow a single main column due to the 3-layer × (producers + upgrades + challenges + achievements) UI surface flagged as § 3 stress axis #4. Classifiable prestige-idle row per `subgenre-shell-mapping-2026.md`: Trimps (4 Bootstrap columns). Use when layer density demands parallel visibility rather than tabbed switching.
- **Form-factor intent:** `desktop` — prestige-idle corpus is desktop-dominant per `layout-audit-2026.md` distribution; Antimatter Dimensions and Trimps both desktop. The 10+-factor modifier chain readout and 3-layer layered UI do not shrink gracefully to mobile without a fork-level redesign.
- **ARIA-aligned widgets (lift targets):**
  - `Tooltip` — dimension / upgrade / challenge tooltips + modifier-factor attribution on hover. Cites `widget-vocabulary.md` Layer 1 (frequency 5).
  - `Dialog` — achievement grid, challenge-entry confirmation, settings. Cites `widget-vocabulary.md` Layer 1 (frequency 6).
  - `Progress` — prestige-currency accumulation toward next-layer threshold, dimension-affordability indicators. Cites `widget-vocabulary.md` Layer 1 (highest frequency, 12).
  - `Tabs` — per-prestige-layer navigation (signature layered-UI shape). Cites `widget-vocabulary.md` Layer 1.
  - `Accordion` — expand/collapse the 10+-factor modifier-chain readout with named sources (beat 8 signal). Cites `widget-vocabulary.md` Layer 1 (frequency 4).
- **Domain widgets (per-fork implementation):**
  - resource bar — persistent strip showing base currency + all active prestige currencies. Cites `widget-vocabulary.md` Layer 2 (frequency 11; 9 distinct shapes across 3 games per OL-273 — no pre-abstraction).
  - layer tree — visual node-and-branch graph for Time-Study-style upgrade trees (optional per fork; Antimatter Dimensions' Time Study is the canonical form). Cites `widget-vocabulary.md` Layer 2 (frequency 5; AD is the Scaler exemplar row for this widget).
  - action card / dimension row — per-dimension row with icon, amount, multiplier, cost, buy affordances. Cites `widget-vocabulary.md` Layer 2 (frequency 4).
  - stat panel — sidebar-column modifier-chain readout with named factor sources + resource totals. Cites `widget-vocabulary.md` Layer 2 (frequency 6).
  - progress track — embedded prestige-threshold progress on the prestige button; embedded affordability on dimension rows. Cites `widget-vocabulary.md` Layer 2 (frequency 7).
- **Layout detail:** sidebar-main region assignment — sidebar holds the modifier-chain readout (expandable `Accordion` when chain grows past ~5 factors), resource list, achievements-button. Main column holds `Tabs` — one tab per prestige layer, each tab containing that layer's dimensions / upgrades / challenges. Modal (`Dialog`) hosts the achievement grid.
- **Nav pattern:** horizontal tab bar (prestige layers) with nested subtabs (per-layer content categories). Matches Antimatter Dimensions' "sidebar with icons, nested tabs" per `layout-audit-2026.md` row: Antimatter Dimensions.

---

## 10. Predicted engine gaps

Scaler is the archetype that stress-tests the engine hardest. Expected friction is broader than any other archetype because of the reset × modifier × formula interactions.

| Gap | Severity | Notes |
|-----|----------|-------|
| Nested `createReset` coordination | High | A 3-layer Scaler defines three resets whose `thingsToReset` sets overlap. No helper today composes them correctly (e.g. "reset layer 2 implies first resetting layer 1 plus its state"). If three consumers hand-wire this identically, graduate a `createNestedResetHierarchy` helper. |
| Modifier chain evaluation-order contract | High | `createSequentialModifier` exists; what's less clear is whether "layered multiplicative" and "sequential layered" are equivalent for pure-multiplicative stacks. Scaler's probe 3 is designed to find divergence. If divergence is a bug, fix; if it is a feature, document it explicitly in the modifier docs. |
| `calculateMaxAffordable` at tetration scales | High | Probe 5 is designed to find this. `break_eternity.js` has formal tetration support; the engine's inversion helpers may or may not route through it correctly for all formula families. This is the headline correctness test for Scaler. |
| Prestige-formula family composition | Medium | `createLogFormula` / `createSqrtFormula` / `createPolynomialFormula` are present but composing them into a piecewise softcap is manual. A `createPiecewiseFormula({ under: X, over: Y })` helper would save every Scaler consumer from re-deriving it. |
| Challenge-completion-count contribution to modifier chain | Medium | Scaler wires challenge completions into the chain as a named source. `createChallengeCategory` exposes the count; the chain wiring is consumer-side today. If three archetypes need this (Scaler, Looper-with-challenge-mods, Producer-with-challenge-layer), graduate a `createChallengeBonusModifier` helper. |
| Per-layer currency registry | Medium | Three parallel prestige currencies + their `trackTotal`/`trackBest` accumulators means 6–9 persistent refs just for currencies. No single primitive groups "a prestige layer's resources + reset + modifier chain"; each is wired individually. A `createPrestigeLayer({ ... })` facade could land here after the second Scaler consumer proves the shape. |
| Modifier-chain debug/trace view for 10+ factors | Low | A mature Scaler surfaces 10+ named factors in its headline chain. `withChain` exists for attribution; an end-user-visible "where did this multiplier come from" panel is consumer-UI territory but benefits from a canonical harness analyzer. |
| ECC-softcap arithmetic | Low | "Linear stacking until N, then softcap" is the dominant challenge-reward shape in the research corpus. Consumers hand-wire it today; a `createSoftcappedAccumulator` helper would match the scaling-formulas property's shape. |

---

## 11. Themes

### Theme A — Antimatter physics

- **Hook:** The Antimatter Dimensions baseline. Antimatter is the base currency; Infinity Points unlock on first ascension; Eternity Points unlock on second. Cultural shorthand for the archetype.
- **Resource mapping:** base = antimatter; layer currencies = [Infinity Points, Eternity Points, Reality Machines]; dimensions = [1st, 2nd, …, 8th Dimension]; prestige verbs = ["Big Crunch", "Eternity", "Reality"].
- **Narrative framing:** none — the curve is the content, physics terminology is the flavour.

### Theme B — Dreaming lucidity (multi-layer)

- **Hook:** Each prestige layer is a *deeper level of dreaming*. Base: the normal world. Layer 1: lucid dreaming. Layer 2: the dreamscape's dreamscape. Layer 3: waking up into a meta-awareness where you realise the whole stack is one dream.
- **Resource mapping:** base = thoughts; layer currencies = [lucidity, dream-fragments, awakened-insight]; dimensions = [eight senses/faculties]; prestige verbs = ["Lucid Shift", "Dream Within", "Awaken"].
- **Narrative framing:** medium — end-of-arc flavour event at beat 8 has the dreamer realising they're in a third layer and choosing whether to keep going.

### Theme C — Civilisation collapse and rebuilding

- **Hook:** Each prestige is a civilisational collapse-and-rebuild. You build a society from the base currency (citizens), the society ascends to a second tier (knowledge), then a third (wisdom). Challenges are dark ages: "fire lost," "crops failing," "plague." Completion is the stacking lesson a civilisation learns.
- **Resource mapping:** base = citizens; layer currencies = [knowledge, wisdom, transcendence]; dimensions = [workers, farmers, artisans, soldiers, scribes, merchants, scholars, sages]; prestige verbs = ["Collapse", "Enlighten", "Transcend"].
- **Narrative framing:** strong — each layer's upgrades are flavoured as cultural achievements; arc closure is the civilisation glimpsing a post-human horizon.

### Theme D — Signal depth (cold computational)

- **Hook:** Stripped-down readout-heavy aesthetic. Base: packets. Layer 1: compressed-packet multipliers (encoding efficiency). Layer 2: protocol-level gains. Layer 3: substrate (quantum coherence). Pure readout, pure numbers, minimalist UI.
- **Resource mapping:** base = packets; layer currencies = [encoding-efficiency, protocol-gain, coherence]; dimensions = [bit, byte, kilobyte, ..., petabyte]; prestige verbs = ["Compress", "Re-protocol", "Re-substrate"].
- **Narrative framing:** none — the chain readout is the game; players are tuning a signal.

---

## Vocabulary anchors

Every name cited in this doc must resolve to one of:

- **Pattern names** → `open-loop-research/LIBRARY.md` + linked pattern files
- **Cross-pattern properties** → `open-loop-research/patterns/cross-pattern-properties/*.md`
- **Novel-patterns clusters** → `open-loop-research/reports/novel-patterns/novel-patterns-synthesis-v4.md`
- **Engine primitives** → `open-loop-engine/docs/api/INDEX.md` + the four `*.api.md` files
- **Corpus games** → `open-loop-research/analyses/complete/*-analysis.md`
- **Layout shells** → `open-loop-starter/src/lib/shells/`
