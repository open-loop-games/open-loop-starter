# Archetype: Scaler

> **One-line identity:** Multi-layer nested Prestige + prestige-integrated Challenge layers + deep Modifier Chains at extreme scale — the layered-compression incremental.
>
> **Status:** `candidate`

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
- **Automation tier** — per-tier producer auto-buy + per-tier upgrade auto-buy + threshold-driven auto-prestige/auto-transcend + auto-attempt for transcend challenges. Canonical in every long-arc Scaler game (Synergism, Antimatter Dimensions); the slim port ships autobuyers as engine-module content under `src/archetypes/scaler/modules/autobuyers/` with player toggles and tier-presence unlock gates read from `Resource.cumulative`. Balance bot rides on top by flipping every toggle on at sim-start; the gates lift naturally as the sim crosses each tier.

**Cross-pattern properties engaged:**

- [Modifier Chains](../../open-loop-research/patterns/cross-pattern-properties/modifier-chains.md) — the most layered of any archetype. Per-tier rateChains carry achievements × per-tier upgrades × prestige-layer multipliers × challenge completions × milestone bonuses, composed across 3 layers. Evaluation-order-sensitive at modest depth (~5–6 named factors per layer in the slim slice); deep-prestige forks reaching 10+ factors per chain are fork-territory (see § 5 substrate divergences).
- [Cost Scaling](../../open-loop-research/patterns/cross-pattern-properties/cost-scaling.md) — exponential for base producers, piecewise-with-softcaps for prestige-layer purchases, polynomial/factorial in late-layer costs.
- [Scaling Formulas](../../open-loop-research/patterns/cross-pattern-properties/scaling-formulas.md) — every family is used. Exponential for costs, logarithmic/sqrt for prestige conversions, piecewise for softcaps, tetration in late-layer regimes.
- [Softcapping](../../open-loop-research/patterns/cross-pattern-properties/softcapping.md) — prestige formulas softcap at extreme values to keep the curve readable; challenge rewards softcap past N completions to bound Effective-Challenge-Completion stacks.
- [Purchase Mechanics](../../open-loop-research/patterns/cross-pattern-properties/purchase-mechanics.md) — producer tiers, per-layer upgrade trees, prestige-tier unlocks all flow through the same purchasable primitives.

**Optional modifiers (fork may add):**

- **Per-autobuyer unlock-purchasable economy** — Synergism's `player.upgrades[81..93]` shape, where each autobuyer is itself a purchase paid in the next-tier currency. Slim port deliberately ships without it (tier-presence gate via `Resource.cumulative` is sufficient at slim scale); forks wanting the late-game "save up to unlock the autobuyer" feel add the unlock-purchasable rows alongside the existing autobuyer modules.
- **Per-layer layout** — tabbed UI with one tab per prestige layer (Antimatter Dimensions shape) vs. all-in-one stacked panels. Cosmetic but costume-level consequential.
- **Meta-prestige / Singularity** — a 4th or 5th layer that resets the first three for a new currency family. Honours the "Scaler goes as deep as you want" spirit. Fork-side extension, not baseline.

**Novel-patterns cluster alignment:** n/a — Scaler is the canonical composition the novel-patterns clusters describe deviations from. Cluster 4 (Prestige Architecture Innovations), Cluster 3 (Mathematical & Scaling Innovations), and Cluster 11 (Challenge Innovations) all take Scaler as their baseline and measure departures from it.

---

## 3. Engine surface

| Layer | Primitive | Role in this archetype |
|-------|-----------|------------------------|
| core | `createResource` | One base currency + one currency per prestige layer; slim port runs 5 (coins, prestigePoints, prestigeShards, transcendPoints, transcendShards). |
| core | `createMultiplicativeModifier` | Per-upgrade, per-achievement, per-crystal-level multipliers bound onto each tier's per-producer rateChain via `chain.bind`. |
| core | `createLogFormula` | Base→prestige and prestige→transcend conversion formulas (logarithmic family). Synergism uses log₁ₑ₂₅ for prestigePoints. |
| systems | `createProducerCategory` | Per-tier producer rows (5 per tier × 3 tiers = 15). Each producer's `rateChain` is the binding surface for tier-wide multipliers. |
| systems | `createPurchasableCategory` | Antimatter / Crystal / Transcend upgrade categories — every purchasable flows through `mapPurchasable`. Cumulative-buy with self-referencing cost closures (Antimatter Accelerator + Multiplier geometric, Crystal upgrades super-exponential) builds the cost as a `Formula` over an external amount mirror per `purchasable.ts`'s internal `createScalingPurchasable` shape, since geometric default doesn't fit super-exponential. |
| systems | `createCostRequirement` | Cost predicate inside purchasable `requirements` and inside `createConversion` `inputs`. Closure-friendly so the cost can read live state. |
| systems | `createAchievementCategory` | 35 milestone + hidden achievements; multiplicative grants feed the per-tier rateChains. |
| systems | `createChallengeCategory` | 5 transcend-tier challenges. Completion count feeds the modifier chain on each subsequent transcend run. |
| systems | `createReset` | One reset per layer, declared inside the owning tier's `connect()` phase via `resetModules: [...]` listing the tier-IDs in scope plus `keep: [...]` exempting the gain currency the conversion just produced. The engine's per-module persistent-ref registry resolves the union; the `keep:` set is the load-bearing decision per layer (without it, `afterConvert → reset.reset()` zeros the currency one step after writing it). |
| systems | `createConversion` | Multi-input/output conversion paired with the matching reset in the tier module's `connect()` phase. `inputs` consume the source currency via `createCostRequirement`; `outputs` produce the gain via `createLogFormula` (Synergism's log₁ₑ₂₅ for prestigePoints, log₁₀ for transcendPoints). `afterConvert: () => reset.reset()` chains the layer reset, which the gain currency's `keep:` exemption survives. |
| harness | `runArcProbe` / `runMatrix` | Beat-timing sim and parameter-grid robustness for the balance leaf. Not yet wired (smoke tests removed; balance lane files separately). |

**Engine systems explicitly not used (required):**

- `createLoop` — Scaler does not use loop-as-time; prestige is threshold-triggered and player-paced, not cycle-paced. If a fork reaches for `createLoop`, it is building Looper.
- `createZoneSystem` — Scaler progression is numeric and layer-gated, not spatial. No map, no zones.
- `createInventory` — Scaler has no items. Upgrades are purchasables; prestige currencies are resources; there is no item-identity layer.
- `createSequencer` — no action queue; players click upgrades and the prestige button.
- `createSkillCategory` — no skill-level gates; progression runs through resource thresholds and prestige layers.
- `createPersistentEffectSystem` — challenge-active effects (production nerfs, cost multipliers) are modeled as conditional grants on the existing rateChains (`active: () => challenge.isRunning`) rather than a separate effect system. The persistent-effect surface remains available for forks that want challenge effects to outlive the challenge run.

Naming what's *absent* is part of the Scaler contract: it refuses the spatial and queue-shaped primitives and spends its surface budget on modifier depth and reset coordination. Every primitive named above resolves in `open-loop-engine/docs/api/INDEX.md`.

**Primary stress axes:**

1. **Multi-layer reset coordination via `resetModules` by ID + `keep:` exemptions.** A 3-layer Scaler declares three `createReset({ resetModules: [...], keep: [...] })` instances inside the owning tier's `connect()` phase; the `resetModules` lists nest (Antimatter ⊂ Antimatter+Prestige ⊂ Antimatter+Prestige+Transcend) and the engine's per-module persistent-ref registry resolves the union. The `keep:` set exempts the gain currency the conversion just produced — without it, `afterConvert → reset.reset()` zeros the currency one step after writing it (`conversion.ts:204-211`). The slim port confirmed nested resets work without a hierarchy helper; the surviving stress the balance leaf will exercise is reset-correctness under repeated cycles, including which refs the `keep:` set should preserve beyond the gain currency. The load-bearing case is **challenge-completion stacking across transcend cycles**: completions persist via per-challenge `keep:` exemptions, accumulating across every transcension until each challenge hits `completionLimit`; the demo arc closes when `category.allMaxed` flips true. Canonical Synergism only zeroes `challengecompletions[1..5]` at the Reincarnation reset (`Reset.ts:577-594`, inside `input === 'reincarnation' || ...`), never at plain transcension — slim drops Reincarnation per § 5 substrate divergences, so completions persist across all slim resets.
2. **Modifier chain order-sensitivity at modest depth.** A 3-layer slim-port chain runs ~5–6 named factors per layer (per-tier producer rates + Accelerator/Multiplier/Crystal/Transcend-upgrade grants + challenge-completion stacks + achievement contributions). The `chain.bind` composition stacks multiplicative grants per layer; whether sequential-across-layers vs. layered-multiplicative produces the same result for pure-multiplicative grants is the surviving stress claim. Hepteract-class 10+-factor depth was demoted to fork-territory and is not in slim-port scope.
3. **Formula correctness across a wide dynamic range.** Prestige currencies cross `1e100` within the 1–2h arc (per `data/prestige.ts` baseCost ladder topping at `1e100` for the fifth diamond producer); the logarithmic conversion formula and the super-exponential Crystal cost (`10^(baseLogCost + costIncrement·((n-0.5)²/2 - 1/8))`, baseLogCost up to 1000) must remain correct across that range. Tetration-regime stress is fork-territory — the slim port exits well below it.
4. **Per-layer UI density.** 3 layers × (producers + upgrades + challenges + achievements) is the largest UI surface of any archetype. The shell choice and tab organisation are the difference between "comprehensible mid-game" and "players quit at layer 2."

---

## 4. Data shape

The archetype's slim-port data lives at `src/archetypes/scaler/data/` as flat typed-array exports with comment-section lensing per `_template.md` § 4. The shape is per-tier vertical: shared interface and balance files plus one file per prestige tier.

```ts
// data/types.ts — shared interfaces

export type Tier = 'antimatter' | 'prestige' | 'transcend';

export interface ProducerDef {
  id: string;            // e.g. 'antimatter-1', 'prestige-1', 'transcend-1'
  name: string;
  tier: Tier;
  position: 1 | 2 | 3 | 4 | 5;
  baseCost: DecimalSource;
}

export interface AntimatterUpgradeDef {
  id: string; name: string; description: string;
  baseCost: DecimalSource;  // cumulative-buy initial cost
}

export interface CrystalUpgradeDef {
  id: string; name: string; description: string;
  position: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  baseLogCost: number;      // log10-scale base cost on prestigeShards
  costIncrement: number;    // quadratic coefficient
}

export interface TranscendUpgradeDef {
  id: string; name: string; description: string;
  baseCost: DecimalSource;
  costCurrency: 'prestigePoints' | 'transcendPoints';  // layered cost source
}

export interface ChallengeDef {
  id: string; name: string;
  position: 1 | 2 | 3 | 4 | 5;
  effect: string; reward: string;
}

export interface AchievementDef {
  id: string; name: string; description: string;
  tier: Tier; hidden?: boolean;
  requirement: (state: ScalerGameState) => boolean;
  rewardMultiplier?: DecimalSource;
}
```

**Canonical file split:**

| File | What it owns |
|------|-------------|
| `data/types.ts` | All `*Def` interfaces, the `ScalerBalance` shape, the `ScalerGameState` typed read-view |
| `data/balance.ts` | `SCALER_BALANCE` cross-tier numeric anchors (currency-conversion log bases, default achievement / challenge multipliers) |
| `data/antimatter.ts` | Antimatter tier (5 coin producers, Accelerator, Multiplier) — lifts `Buy.ts:336`, `Reset.ts:430-433` |
| `data/prestige.ts` | Prestige tier (5 diamond producers, 8 crystal upgrades) — lifts `Buy.ts:337`, `Synergism.ts:544`, `Variables.ts:32` |
| `data/transcend.ts` | Transcend tier (5 mythos producers, accelerator boost + 4 named upgrades, 5 challenges) — lifts `Buy.ts:338`, `Variables.ts:27`, `Challenges.ts:209-236, 541` |
| `data/achievements.ts` | ~35 cross-tier achievements (production/reset-count/challenge-completion/hidden ladders) — lifts `Achievements.ts:groupedAchievementData`, `ungroupedAchievementData` |
| `data/overrides.ts` | `ScalerOverrides` per-tier flat-category shape + `applyScalerOverrides(base, overrides)` (deep-merge per tier, throws on unknown id) |
| `data/index.ts` | `DEFAULT_SCALER_DATA` barrel + per-file re-exports |

**Override semantics:** `boot.ts` exports `createScalerEngine(overrides?)` that accepts a deep-partial over the archetype's data shape. Sim tests and workbench perturbation route through this factory — the addressable shape *is* the TypeScript type over the data, not a synthetic vars layer. Forks change behaviour by editing `data/*.ts` in place; they don't need a runtime override path.

**Lens discipline (comment sections inside each tier file):**

- *Skeleton* — structural counts and shape (producer count, upgrade count, challenge count). Editing these forks the archetype.
- *Balance* — numbers that drive arc pacing (per-tier baseCosts, cost-scaling exponents, conversion log bases, challenge effect coefficients). Workbench perturbation target — *but only on declared-invention surfaces*; values lifted 1:1 from Synergism source are not solver perturbation surface per `BALANCING.md § Canonical numbers are not tunable`.
- *Costume* — names and flavour. Producer display names (Worker, Compressor, Insight Engine, etc.) are placeholder slot fillers; forks override per theme.

**Archetype code lives in** `src/archetypes/scaler/` as its own colocated tree (`data/`, `modules/`, `composables/`, `ui/`, `sim/`, `boot.ts`). See `open-loop-starter/CLAUDE.md § Archetype convention` for the fork-workflow contract.

---

## 5. Content sketch

- **Resources:** 5. Base `coins` + per-tier pairs `prestigePoints` / `prestigeShards` (Prestige tier) and `transcendPoints` / `transcendShards` (Transcend tier). Cumulative-across-prestige currencies (`prestigePoints`, `transcendPoints`) survive the matching reset; per-prestige shards (`prestigeShards`, `transcendShards`) zero on each cycle.
- **Producers:** 15 — 5 per tier × 3 tiers. Antimatter (Worker → Refinery, costing coins), Prestige (Compressor → Cosmic Conduit, diamond producers costing prestigePoints, generating prestigeShards), Transcend (Insight Engine → Mythos Cradle, mythos producers costing transcendPoints, generating transcendShards). Each tier's costs lift from Synergism's `coinBuildingCosts` / `diamondBuildingCosts` / `mythosAndParticleBuildingCosts` arrays in `Buy.ts:336-338`.
- **Upgrades:** 15 — asymmetric per tier (mirrors Synergism's structure, not a uniform N-per-tier tree).
  - Antimatter: 2 cumulative-buy (Accelerator, Multiplier) with geometric cost ramps (lifts `Buy.ts:26, 156` formulas).
  - Prestige: 8 Crystal upgrades with super-exponential cost on `prestigeShards` (lifts `Synergism.ts:544` baseLogCosts and `Variables.ts:32` increments).
  - Transcend: 5 — Accelerator Boost (cross-currency cost paid in `prestigePoints`, lift `Reset.ts:498-499`) + 4 named upgrades (Mythos Production I, Transcend Points Efficiency, Shards Acceleration, Cascade Amplification) on `transcendPoints` (lifts `Variables.ts:27` indices 100-103).

  Crystal upgrade rate-effects ship as a uniform `CRYSTAL_PER_LEVEL_BONUS = 0.05` stub in `modules/prestige.ts`; per-upgrade Synergism formulas (Variables.ts:131+ — globalCoinMultiplier routes) are deferred to the balance leaf. Same posture for Transcend upgrades 1–4 — slot-filler effects awaiting balance-leaf refinement.
- **Challenges:** 5 — Transcend tier only (Synergism's `challengecompletions[1..5]`). In-challenge effects are production nerfs / cost multipliers / locked mechanics; per-completion rewards feed challenge-completion stacks via Synergism's `CalcECC` formula (`Challenges.ts:541-548`). Auto-completion goal: `coin >= 10^(baseRequirement × (1+completions)²)` per `Synergism.ts:3496-3500` + `Challenges.ts:457-459`. Threshold base is declared invention (canonical `[10, 20, 60, 100, 200]` from `Variables.ts:121` assumes the full Reincarnation+ multiplier stack absent in slim — sub-leaf E pins via closed-form sweep against the 6-12h arc target). Completions persist across transcensions; the only canonical zeroing site (`Reset.ts:577-594`) is the Reincarnation reset, dropped from slim. Demo arc closes when every challenge hits `completionLimit`. Antimatter and Prestige tiers carry no challenges in slim-port scope (Synergism gates Reincarnation / Ascension challenges behind dropped tiers).
- **Achievements:** 35 — production-milestone ladders for each tier's first producer (3×3 = 9), prestigePoints / transcendPoints amount ladders (3 each = 6), prestige-count and transcension-count ladders (3 each = 6), per-challenge first-completion (5), prestige and transcend producer-count ladders, plus a hidden "Challenge Master" entry. Ids reference `Achievements.ts:groupedAchievementData` (line 2479) and `ungroupedAchievementData` (line 2685).
- **Progression gates:** `coins ≥ 1e25` thresholds the first prestige; `prestigePoints ≥ ~1e6` opens transcend (per Synergism's transcension unlock condition); per-challenge completion gating runs through the engine's challenge-active state. Autobuyer unlock gates read tier-presence from `Resource.cumulative` (prestige autobuyers unlock once `prestigePoints.cumulative > 0`; transcend autobuyers once `transcendPoints.cumulative > 0`).
- **Autobuyers (9):** ship as engine-module content under `src/archetypes/scaler/modules/autobuyers/`, registered through a single `AutobuyerSpec` registry with one master kill-switch + per-spec player toggle. Lifts AD's class-hierarchy shape (`AutobuyerState` / `IntervaledAutobuyerState`) into engine-module idiom (`autobuyer.js:4-175`); collapses Synergism's per-currency-class `autoUpgrades` (`Automation.ts:73-125`) into per-tier sweeps. Set:
  - **Antimatter producer auto-buy** — `setupPolicyAutoPurchase` × tier.producers, `selectionHybridPayback`. Ungated.
  - **Antimatter upgrade auto-buy** — `setupSweepAutoPurchase` over Accelerator + Multiplier. Ungated.
  - **Diamond producer auto-buy** — same shape, prestige tier. Gated on `prestigePoints.cumulative > 0`.
  - **Crystal upgrade auto-buy** — same shape, prestige tier. Same gate.
  - **Auto-prestige** — bespoke `tick(dt)` body with mode-tunable policy (`amount` / `time` / `roi`). Ships `mode: 'never'`; sub-leaf D plugs in BALANCING.md § Theme 3 #5 ROI math. Modeled on AD's `BigCrunchAutobuyerState.mode`.
  - **Mythos producer auto-buy** — same shape, transcend tier. Gated on `transcendPoints.cumulative > 0`.
  - **Transcend upgrade auto-buy** — same shape, transcend tier. Same gate.
  - **Auto-transcend** — same threshold shape as auto-prestige, transcend tier.
  - **Auto-ECC challenge attempts** — bespoke `tick(dt)` body modeled on Synergism's `runChallengeSweep` (`Challenges.ts:595-680`) collapsed to "auto-attempt next-priority unfinished challenge with cooldown." Ships `mode: 'never'`; sub-leaf E swaps in the attempt rule.

**Density target:** the slim-port arc covers eight informal phase beats from § 1's player-experience prose, each mapped to at least one content entry. Beats 1–2 → Antimatter producer ladder + first Accelerator/Multiplier; beat 3 → coins-threshold prestige button; beat 4 → first prestigePoints + first Diamond producer; beat 5 → Crystal upgrades available; beat 6 → first Transcend → first transcend challenge; beat 7 → Transcend tab + first Mythos producer; beat 8 → cross-tier modifier-chain readout (achievements × crystals × challenges all stacking on the antimatter rateChain) + transcend-upgrade ladder. Concrete predicates and minute-windows for each beat live in `src/archetypes/scaler/balance/beats.ts` (filed under the balance leaf).

### Substrate divergences from vanilla, not applied in the slim demo

Synergism ships 6 prestige tiers (Prestige / Transcension / Reincarnation / Ascension / Singularity / Hepteracts) plus side systems (Cubes, Corruptions, Talismans, Runes, Research, Blueberry, RedAmbrosia). The slim demo declares the following dropped wholesale:

- **Reincarnate / Ascend / Singularity tiers** — out of scope for a 3-layer slim slice. Slim port stops at Transcend; forks adding deeper prestige extend from there. Side-effect: canonical Synergism zeroes `challengecompletions[1..5]` only at the Reincarnation reset (`Reset.ts:577-594`), never at plain transcension — so dropping Reincarnation collapses challenge-completion state into "persists across all slim resets." Completions accumulate across every transcend cycle until `completionLimit` per challenge; arc closure is driven by `category.allMaxed` rather than any reset boundary. Challenge `baseRequirement` thresholds become declared inventions for the same reason: canonical `[10, 20, 60, 100, 200]` (`Variables.ts:121`) is calibrated against the full Reincarnation+ multiplier stack, which slim doesn't have.
- **Hepteracts** — late-game prestige currency family with 10+-factor modifier chains. Out of scope; the order-sensitivity claim in § 3 stress axis 2 reframes around modest-depth chains the slim port actually reaches.
- **Cubes, Corruptions, Talismans, Runes** — meta-progression substrate that bridges Reincarnation and Ascension. No surface in slim port.
- **Research, Blueberry upgrades, RedAmbrosia** — orthogonal economy substrates. No surface in slim port.

These omissions are slim-port-substrate decisions, not declared inventions — Synergism's full economy stays canonical for any fork that wants to build it out. Per-row citations in `data/*.ts` track 1:1 to canonical Synergism source for the content the slim port keeps.

---

## 6. UI prescription

- **Primary shell:** `SidebarMainShell` — prestige-idle weak majority per `subgenre-shell-mapping-2026.md` § "prestige idle" (5/12 classifiable; Antimatter Dimensions is the cluster anchor). Shell matches Scaler's canonical exemplar. Exemplar rows from `layout-audit-2026.md`: Antimatter Dimensions, Advent Incremental, The Game Dev Tree.
- **Secondary shell:** `MultiColumnShell` — for forks that outgrow a single main column due to the 3-layer × (producers + upgrades + challenges + achievements) UI surface flagged as § 3 stress axis #4. Classifiable prestige-idle row per `subgenre-shell-mapping-2026.md`: Trimps (4 Bootstrap columns). Use when layer density demands parallel visibility rather than tabbed switching.
- **Form-factor intent:** `desktop` — prestige-idle corpus is desktop-dominant per `layout-audit-2026.md` distribution; Antimatter Dimensions and Trimps both desktop. The multi-tier rateChain attribution view and 3-layer layered UI do not shrink gracefully to mobile without a fork-level redesign.
- **ARIA-aligned widgets (lift targets):**
  - `Tooltip` — producer / upgrade / challenge tooltips. Producer-row tooltip carries the modifier-chain attribution (sources + multipliers) per the slim-port's per-row design — see Layout detail. Cites `widget-vocabulary.md` Layer 1 (frequency 5).
  - `Dialog` — achievement grid, challenge-entry confirmation, settings. Cites `widget-vocabulary.md` Layer 1 (frequency 6).
  - `Progress` — prestige-currency accumulation toward next-layer threshold, producer-affordability indicators. Cites `widget-vocabulary.md` Layer 1 (highest frequency, 12).
  - `Tabs` — per-prestige-layer navigation (signature layered-UI shape). Cites `widget-vocabulary.md` Layer 1.
- **Domain widgets (per-fork implementation):**
  - resource bar — persistent strip showing base currency + all active prestige currencies. Cites `widget-vocabulary.md` Layer 2 (frequency 11; 9 distinct shapes across 3 games per OL-273 — no pre-abstraction).
  - layer tree — visual node-and-branch graph for Time-Study-style upgrade trees (optional per fork; Antimatter Dimensions' Time Study is the canonical form). Cites `widget-vocabulary.md` Layer 2 (frequency 5; AD is the Scaler exemplar row for this widget).
  - action card / producer row — per-producer row with icon, amount, multiplier, cost, buy affordances; modifier-chain attribution surfaces on hover. Cites `widget-vocabulary.md` Layer 2 (frequency 4).
  - progress track — embedded prestige-threshold progress on the prestige button; embedded affordability on producer rows. Cites `widget-vocabulary.md` Layer 2 (frequency 7).
- **Layout detail:** sidebar-main region assignment — sidebar holds the resource list and achievements-button. Main column holds `Tabs` — one tab per prestige layer, each tab containing that layer's producers / upgrades / challenges. Modifier-chain attribution lives on the producer-row tooltip (lifted onto rows during slim-port implementation rather than carried as a sidebar panel — the per-row attribution surface kept the chain visible at the point of decision without requiring the player to track a separate readout). Modal (`Dialog`) hosts the achievement grid.
- **Nav pattern:** horizontal tab bar (prestige layers) with nested subtabs (per-layer content categories). Matches Antimatter Dimensions' "sidebar with icons, nested tabs" per `layout-audit-2026.md` row: Antimatter Dimensions.

---

## 7. Predicted engine gaps

Scaler is among the broader stress-test archetypes for the engine. Most pre-implementation predictions downgraded after leaf 2: the engine's modifier and reset surface absorbed the slim-port shape without help. The surviving rows are ergonomics, not correctness.

| Gap | Severity | Notes |
|-----|----------|-------|
| Self-referencing cost closures inside `mapPurchasable` | Low | Cumulative-buy upgrades whose cost reads the purchasable's own `amount.value` (Antimatter Accelerator/Multiplier, Crystal upgrades) need a `Formula.variable(amount)` mirror plus a `mapState` `watch` that flushes synchronously back into the mirror — the same internal pattern `createScalingPurchasable` uses (`purchasable.ts:672-728`). Works, but is mid-construction wiring. A `createCumulativePurchasable({ baseCost, costScaling, perLevelEffect })` helper covering the geometric/super-exponential cost-per-level-bought shape would graduate after a second consumer hand-rolls the same closure pattern. |
| `createPiecewiseFormula` for super-exponential / softcapped costs | Medium | Crystal upgrade cost (`10^(baseLogCost + costIncrement·((n-0.5)²/2 - 1/8))`, lift `Buy.ts:657-694`) is super-exponential in level — `createScalingPurchasable`'s geometric default doesn't fit, and `createLogFormula` / `createSqrtFormula` / `createPolynomialFormula` don't compose into the piecewise softcap shape canonical for the corpus. A `createPiecewiseFormula({ under: X, over: Y })` (or super-exponential family) helper would land after a second consumer derives the same shape. |
| Modifier chain evaluation-order contract | Medium | Whether layered-multiplicative `chain.bind` composition and a hypothetical sequential-across-layers composition produce the same result for pure-multiplicative grants is a documentation question the balance leaf will press on. If divergence surfaces under cross-tier challenge-completion stacks, document it explicitly in the modifier docs. |
| Challenge-completion-count contribution to modifier chain | Medium | Scaler wires challenge completions into the chain as a named source via consumer-side closures over `category.getChallenge(id)?.completions`. `createChallengeCategory` exposes the count; the chain wiring is hand-rolled. If three archetypes need this (Scaler, Looper-with-challenge-mods, Producer-with-challenge-layer), graduate a `createChallengeBonusModifier` helper. |
| Per-layer prestige-tier facade | Medium | Each tier-module wires currency + producer category + upgrade category + reset + conversion + rateChain composition independently — a 3-tier slim port runs ~700 lines of structurally repetitive setup across `modules/{antimatter,prestige,transcend}.ts`. No single primitive groups "a prestige layer's resources + reset + modifier chain + conversion." A `createPrestigeLayer({ ... })` facade could land after the second Scaler-shaped consumer proves the shape. |
| ECC-softcap arithmetic | Low | "Linear stacking until N, then softcap" is the dominant challenge-reward shape per `Challenges.ts:541-548` (Synergism's `CalcECC`) and across the research corpus. Consumers hand-wire it today; a `createSoftcappedAccumulator` helper would match the scaling-formulas property's shape. The balance leaf will write this hand-rolled in the first pass — convergence-promotion candidate. |
| `createAutoPurchaser` composition helper | Low | Scaler's autobuyer modules use the existing primitives directly — `setupPolicyAutoPurchase` for producer auto-buy, `setupSweepAutoPurchase` for upgrade auto-buy, bespoke `tick(dt)` bodies for threshold + ECC-sweep policies. AD's class hierarchy (`AutobuyerState` → `IntervaledAutobuyerState` → `UpgradeableAutobuyerState`) is the convergent shape; an engine-level facade could absorb the `AutobuyerSpec` interface + registry pattern after producer + ambient backport (OL-855). Currently N=1 — tracked in `open-loop-engine/docs/candidate-primitives.md`. |

**Removed pre-implementation predictions (leaf 2 evidence):**

- *Nested `createReset` coordination* (was High) — `createReset({ resetModules: [tier-id, ...], keep: [tier-currency] })` declared inside each owning tier's `connect()` phase resolves nested coordination cleanly. No hierarchy helper or separate resets module needed; tiers own their resets locally.
- *`calculateMaxAffordable` at tetration scales* (was High) — tetration was demoted to fork-extension; slim port exits well below `1e1000`. Falls out with the tetration claim in § 3 stress axis 3.
- *Modifier-chain debug/trace view for 10+ factors* (was Low) — slim port runs ~5–6 factors per layer, not 10+. `withChain` attribution suffices for slim-port scope; the 10+-factor view is fork-territory for deep-prestige extensions.

---

## 8. Themes

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
