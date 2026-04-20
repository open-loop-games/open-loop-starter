# Archetype: Interlocker

> **One-line identity:** Wide multi-resource graph + multi-input/output Conversion Chains + building-to-building Synergy — the wide-not-deep resource-management incremental.
>
> **Status:** `canonical`

**Exemplars (validation, not clone targets):** [Kittens Game](../../open-loop-research/analyses/complete/kittens-game-analysis.md), [Evolve](../../open-loop-research/analyses/complete/evolve-analysis.md), [Industry Idle](../../open-loop-research/analyses/complete/industry-idle-analysis.md).

---

## 1. Player experience

Interlocker is the archetype where *you don't watch a number, you watch a system*. You start with one raw resource and one activity that produces it. Five minutes in you unlock a building that consumes that resource to produce a second — now you have an input and an output, a *ratio*, and a reason to care about rates. Ten minutes later a third building wants both previous resources at once; now you're balancing. By the time you have four or five buildings feeding each other, you've stopped thinking about any single resource and started thinking about the *graph* — which node is the bottleneck, which edge is starving, which pair of buildings multiplies each other when placed on the same tech tier.

A thirty-minute session in Interlocker is a sequence of structural moments: *"I finally unlocked Workshop,"* *"the refinery chain is making plastic,"* *"I don't have enough wood because my sawmills are feeding the carpentry but nothing is feeding the sawmills."* The long-term pull is completeness. You feel the shape of the graph fill in — each new tech reveals a new column of buildings, each new building reveals new edges, and the headline moment is not a big number but a wide one: a dashboard with eight resources, all positive per-second rates, all feeding something, no red arrows. There is no compression here; there is weaving.

---

## 2. Pattern composition

**Required patterns:**

- [Activity Systems (continuous multi-resource effects)](../../open-loop-research/patterns/tier-0-universal/activity-systems/) — the skeleton's load-bearing primitive. Resource conversion consolidated into Activity Systems (see `variations/resource-conversion-consolidation.md`): every building is an Activity whose `effects[]` array subtracts inputs and adds outputs. Interlocker is the archetype that lives entirely on the multi-input/multi-output variation.
- [Progression Systems](../../open-loop-research/patterns/tier-0-universal/progression-systems.md) — tech-tree-shaped gating. Each tech unlocks a new tier of buildings, which unlocks new resources, which unlocks the next tech. The gating is the pacing.
- [Achievement Systems](../../open-loop-research/patterns/tier-1-foundation/achievement-systems.md) — milestone multipliers keyed to graph-completeness (*"have five active conversions,"* *"produce every T1 resource once,"* *"run the full refinery chain for ten minutes"*). Mechanical, not cosmetic.

**Cross-pattern properties engaged:**

- [Synergy Systems](../../open-loop-research/patterns/cross-pattern-properties/synergy-systems.md) — the defining property for Interlocker. Non-linear bonuses when elements combine: Workshop multipliers (Kittens Game reaches 512× at max), Species-trait cross-building bonuses (Evolve's Entish → +10% knowledge from scientists), adjacency synergies (Industry Idle's tile-modifier system). 100% corpus prevalence per `patterns/cross-pattern-properties/synergy-systems.md` line 247.
- [Purchase Mechanics](../../open-loop-research/patterns/cross-pattern-properties/purchase-mechanics.md) — multi-resource cost requirements for buildings and techs. Unlike Producer's single-currency cost, every purchase here spends 2–5 resources at once.
- [Cost Scaling](../../open-loop-research/patterns/cross-pattern-properties/cost-scaling.md) — exponential per-building, but milder than Producer's curve. The wide-graph shape means you can't brute-force a single cost; you trade growth rate for breadth.
- [Modifier Chains](../../open-loop-research/patterns/cross-pattern-properties/modifier-chains.md) — moderate depth. Synergies × tech-bonuses × achievement multipliers. Five to seven named factors is a mature Interlocker chain, not the 10+ of Scaler.
- [Quantity Tracking](../../open-loop-research/patterns/cross-pattern-properties/quantity-tracking.md) — per-building counts drive synergy thresholds (*"every 10 engineer kittens gives +1% workshop effectiveness"*).
- [Scaling Formulas](../../open-loop-research/patterns/cross-pattern-properties/scaling-formulas.md) — mostly linear-by-building-count for conversion rates, exponential for costs.

**Optional modifiers (fork may add):**

- **Paragon-style soft prestige** — Kittens Game's paragon-at-reset layer. A single-tier prestige over the graph that grants permanent multipliers. Keeps the spirit without turning into Scaler (which makes prestige the axis, not a layer).
- **Spatial placement** — Industry Idle's hex/square grid with tile modifiers and adjacency bonuses. Promotes Interlocker toward Explorer territory but stays Interlocker-shaped if the grid is decorative rather than the core lever.
- **Seasonal / cyclical modifiers** — Kittens Game's winter catnip penalty. A cyclical-phase modifier layer on top of the static graph; cheap to add, high flavour yield.

**Novel-patterns cluster alignment:** n/a — Interlocker is a baseline composition. It is the archetype cluster 4b (Variable Interaction Grids) and cluster 7 (Resource Graph Depth) describe deviations from. If the graph gains spatial placement as the core lever, it has become a Director / Explorer hybrid and should be reshaped rather than themed.

---

## 3. Engine surface

| Layer | Primitive | Role in this archetype |
|-------|-----------|------------------------|
| core | `createResource` | Many. 8 resources at baseline (3 raw, 3 basic, 2 advanced) plus one cumulative accumulator per resource for achievement thresholds. |
| core | `trackTotal` | Per-resource lifetime accumulator; feeds completeness achievements. |
| core | `createModifierChain` | One chain per output resource whose production is synergy-boosted. Named factor sources: tech bonuses, synergy bonuses, achievement bonuses. |
| core | `createMultiplicativeModifier` | Synergy multipliers (*"workshop bonus"*, *"species trait"*). |
| core | `createAdditiveModifier` | Tier-level additive bonuses from completed tech tiers. |
| core | `createCostRequirement` | Multi-resource costs. Every building and tech purchase is a vector of resource requirements, not a scalar. |
| core | `calculateMaxAffordable` | Scalar bulk-buy on single-cost purchases (rare in this archetype); used at the resource-trading UI boundary. |
| core | `runHeadless` | Beat-timing sim tests and Workbench probes. |
| systems | `createProducerCategory` | Buildings-as-producers. Each building's `tick` subtracts inputs from and adds outputs to resources — the Activity Systems continuous-conversion variation in direct form. |
| systems | `createPurchasableCategory` | Tech-tree entries. Tech purchases don't produce; they gate the next building tier and contribute multipliers to the modifier chain. |
| systems | `createScalingPurchasable` | Per-building cost curves (mild exponential). |
| systems | `createAchievementCategory` | Graph-completeness achievements. |
| systems | `createTieredAchievement` | Per-resource production-milestone ladders. |
| harness | `runMatrix` | Probe robustness across the vars space. |

**Engine systems explicitly not used (required):**

- `createReset` — Interlocker baseline has no prestige. A paragon-style soft prestige is a fork-level optional modifier, not part of the skeleton. If a consumer reaches for `createReset`, they are deliberately extending the skeleton with a Scaler-adjacent layer and inherit that layer's stress axes.
- `createLoop` — Interlocker is not cycle-paced. Progression is resource-threshold-gated, not loop-bounded. If a fork reaches for `createLoop`, it is building Looper.
- `createZoneSystem` — Interlocker baseline is not spatial. Industry-Idle-style grid placement is an optional modifier that carries zone-scoped primitives *with* it; baseline does not claim them.
- `createInventory` — resources are fungible and stackable. There is no item-identity layer. Recipe outputs are counted, not enumerated.
- `createSequencer` — no action queue. Players click on buildings and tech unlocks; there is no programmable or queued action shape.
- `createSkillCategory` — no per-character skills. Worker-type specialisation (kitten jobs in Kittens Game) is expressed as resource-producer composition, not as a skill system. If a fork wants skills, they are stepping into Looper territory.
- `createCumulativeConversion` / `createIndependentConversion` — the engine's `conversion.ts` primitives are prestige-shaped (one base resource → one prestige currency with a `createLogFormula`-style curve). They do not fit the N-input-M-output recipe shape that is Interlocker's dominant primitive. Consumers wire recipes via `createProducerCategory` tick effects instead. **This is the archetype's headline engine gap — see § 10.**

Naming what is absent is half the Interlocker contract: the archetype refuses prestige layering, loop time, and item identity, spending its surface budget on the resource graph's width and the synergy chain's naming. Every primitive named above resolves in `open-loop-engine/docs/api/INDEX.md`.

**Primary stress axes:**

1. **Multi-resource cost requirements.** Every building and tech purchase has a 2–5-resource cost vector. `createCostRequirement` expresses the single-resource case cleanly; the ergonomics of composing five of them per purchase, evaluating affordability across the vector, and showing which resource is missing on hover, is the first friction point. If five consumer games hand-wire the same "compose five cost requirements and render an inline missing-resource tooltip" loop, the engine has a `createMultiResourceCost({ … })` helper to graduate.
2. **Conversion chain synergy.** A mature Interlocker game has synergies that reach across the graph — *"kitten engineers at Workshop give +1% crafting to every crafting recipe."* Wiring synergies as named modifier-chain factors per target resource is fine in the small; at graph scale (8+ resources, 15+ synergies) the wiring is O(edges) and verbose. Stress-tests `createModifierChain` + `withChain` naming discipline at that edge count.
3. **Crafting-recipe primitive gap.** The engine's `conversion.ts` is prestige-shaped. Interlocker wants *recipes* — `{ inputs: Record<resourceId, Decimal>, outputs: Record<resourceId, Decimal>, ratePerSec, conditions }` — and there is no primitive for this today. Consumers wire it via `createProducerCategory` tick effects, which works but is verbose and loses the ability for the engine to introspect the recipe graph (*"what does producing one Steel transitively cost?"* currently requires manual graph walk). Interlocker is the archetype that surfaces this gap concretely; § 10 sketches the proposed primitive.
4. **Resource-graph width ergonomics.** 8 resources × 5–8 buildings × 4–6 tech entries is the widest symbol surface of any archetype — noticeably wider than Scaler's three prestige layers because the nodes are all simultaneously live. The UI, the vars schema, and the sim-assertion coverage all have to scale linearly in the resource count. The archetype that will find "our module-registration flow is quadratic in something" if any archetype will.

---

## 4. Beat map

The 1–2h arc compresses Kittens Game's 100+-hour scope honestly. Eight resources at baseline; four conversion chains; two synergy reveals. The pacing inverts Scaler's "each beat reveals a new layer" rhythm — Interlocker's beats are structural moments *inside one layer*: a new edge in the graph, a new synergy multiplier, a new tech-gated column of buildings.

| # | Beat | Target sim-time | Trigger condition | Player-visible signal | Why it matters |
|---|------|-----------------|-------------------|------------------------|-----------------|
| 1 | First raw producer purchased | 0:00–1:00 | `resources.raw[0].count >= 1` AND `buildings.raw[0].count >= 1` | Auto-production starts; rate readout appears in the resource table | Onboarding — the familiar Producer footing before the graph branches |
| 2 | First conversion chain closed (first T1 resource produced) | 3:00–8:00 | `resources.basic[0].produced >= 1` | A T1 resource row appears in the always-visible table with a positive per-sec rate; the first "input → output" edge lights up | The archetype's first structural moment — the graph has an edge |
| 3 | First bottleneck felt | 12:00–20:00 | any basic resource's per-sec rate flips negative for ≥30 s OR affordability of the next building blocks on a second resource | Red per-sec indicator; missing-resource tooltip on the next building's cost | The first time the player cannot just *buy the next thing* — must balance inputs |
| 4 | First synergy effect visible | 25:00–40:00 | `modifierChain[someResource].namedFactors.includes('synergy:someSource')` | Tooltip on the affected resource shows a named synergy source contributing a multiplier | Synergy Systems integration — the first edge between two buildings that is *not* a raw input flow |
| 5 | First tech-gate opened; new building tier visible | 40:00–60:00 | `techs.completed.count >= 1` AND a new building tier's visibility flag is true | Tech-tree entry checks off; a new column of buildings appears as locked-then-purchasable | The Progression Systems spine. Tech unlocks more graph, not bigger numbers |
| 6 | First T2 resource produced | 65:00–85:00 | `resources.advanced[0].produced >= 1` | A T2 row enters the resource table; it requires two T1 resources as inputs; the full tier-ladder is now visible | Width progression — the graph has three tiers, the 1–2h arc's promised breadth |
| 7 | Second synergy chain activated (cross-tier bonus) | 85:00–105:00 | `modifierChain[someT2Resource].namedFactors.length >= 3` | Stat panel shows a T2 resource's production chain with 3+ named sources, at least one crossing a tier | The "wide-graph mature play" signal — synergies now reach across tiers, not just within them |
| 8 | Arc closure: complete-graph achievement AND every-resource-positive readout | 105:00–120:00 | `achievement('graph-complete').unlocked` AND `∀ resource: rate > 0 for 60 s` | Completion toast; resource table shows all 8 resources green; end-of-arc flavour event | The 1–2h showcase closure. The player sees the whole woven graph running. Fork extends beyond here; skeleton stops |

**Arc closure beat:** #8.

---

## 5. Data shape

```ts
// archetype.ts — skeleton defaults
export interface InterlockerArchetypeVars {
  // Graph shape — changing these is a fork-of-skeleton decision.
  resourceTierCount: number;                 // default 3 (raw, basic, advanced)
  resourcesPerTier: number[];                // default [3, 3, 2] — length === resourceTierCount
  buildingCountPerTier: number[];            // default [3, 4, 2] — one building family per conversion chain
  conversionChainCount: number;              // default 4 — T0→T1 edges + T1→T2 edges
  synergyCount: number;                      // default 6 — cross-building multipliers
  techGateCount: number;                     // default 4 — tech-tree nodes gating tier transitions
  achievementCount: number;                  // default 24 — production + completeness + hidden
  allowNegativeRates: boolean;               // default true — bottlenecks are gameplay, not errors

  // Graph-width escape hatch for the "widest honest 1–2h arc" claim.
  arcClosureGraphCompletenessPolicy: 'every-resource-positive' | 'every-building-active' | 'both';
}

// theme.ts — costume, no mechanical impact
export interface InterlockerThemeVars {
  // Length of each per-tier name array must equal resourcesPerTier[tier].
  resourceNames: Array<Array<{ singular: string; plural: string }>>;
  buildingNames: string[];                   // flattened across tiers; length === sum(buildingCountPerTier)
  techNames: string[];                       // length === techGateCount
  synergyFlavour: Array<{ label: string; description: string; sourceBuilding: string; targetResource: string }>;
  recipeFlavour: Array<{ label: string; description: string }>;
  achievementFlavour: Array<{ label: string; description: string; hidden?: boolean }>;
  endOfArcMessage: string;                   // fires at beat 8
}

// balance.ts — mechanical overrides; drives beat timing
export interface InterlockerBalanceVars {
  // Per-building cost curve. Milder than Producer's 1.15 default — the graph-width lever replaces the cost-growth lever.
  buildingCostScaling: {
    baseCost: Record<string, DecimalSource>;   // keyed by resource id; first-unit cost per input resource
    perPurchaseGrowth: number;                 // default 1.10 (vs 1.15 for Producer)
  };

  // Recipes — the headline balance surface. One entry per conversion chain.
  recipes: Array<{
    id: string;
    buildingId: string;
    inputs: Record<string, DecimalSource>;     // per-sec consumption at one building
    outputs: Record<string, DecimalSource>;    // per-sec production at one building
    unlockedByTech: string | null;             // null means always unlocked
  }>;

  // Synergies — one entry per cross-building multiplier.
  synergies: Array<{
    id: string;
    sourceBuildingId: string;                  // the "from" side (every unit of this building contributes)
    targetResourceId: string;                  // affects this resource's production chain
    effect: 'multiplicative' | 'additive';
    perSourceUnitMagnitude: number;            // default 0.01 (1% per source unit, e.g. Kittens-Workshop shape)
    cap: number | null;                        // soft cap on total contribution; null = uncapped
  }>;

  // Tech-gate costs (multi-resource).
  techCosts: Array<{
    techId: string;
    requires: Record<string, DecimalSource>;   // vector of resource costs
    unlocksTier: number;                       // which resource/building tier this tech reveals
  }>;

  // Achievement threshold knobs.
  achievementMultiplier: number;               // default 1.03 — per-achievement contribution to modifier chains
  graphCompletenessAchievementThreshold: number; // default 1.0 — fraction of resources with positive rate for closure
}
```

**Override semantics:** deep-merge at load order `archetype → theme → balance`. Array fields (`recipes`, `synergies`, `techCosts`, `resourcesPerTier`) replace wholesale; forks that want partial array tuning rebuild the array explicitly.

**Codegen contract:** `pnpm codegen:archetype-vars interlocker` (pending) reads this section and emits `src/modules/mods/<game>/vars/{archetype,theme,balance}.ts` with matching defaults. Shared archetype-level types + defaults live at `src/archetypes/interlocker/`.

---

## 6. Balance probes

| Probe | Perturbation | Target beat(s) | Tolerance | Rationale |
|-------|--------------|----------------|-----------|-----------|
| `conversion-ratio` | each recipe's `outputs / inputs` ratio ×[0.80, 1.20] | 2, 3, 6 | Beat sim-time ±20% | Recipe ratios are the archetype's dominant pacing lever; the wide-graph equivalent of Producer's cost-scaling growth |
| `building-cost-growth` | `buildingCostScaling.perPurchaseGrowth` ×[0.90, 1.10] | 1, 2, 5 | Beat sim-time ±20% | Cost curve governs onboarding and early-mid pacing. Milder than Producer's sensitivity because the graph-width lever competes |
| `synergy-strength` | every `synergies[i].perSourceUnitMagnitude` ×[0.70, 1.30] | 4, 7, 8 | Beat sim-time ±25%; headline modifier-chain depth at beat 7 stays within [3, 7] named factors | Synergy multipliers define mid-to-late pacing. Too weak → graph feels flat; too strong → one synergy dominates |
| `tech-gate-threshold` | every `techCosts[i].requires` ×[0.75, 1.25] | 5, 6 | Beat sim-time ±25% | Tech-gate costs control the gap between "first building tier saturated" and "next tier unlocked" — the rhythm of graph reveal |
| `bottleneck-severity` | one raw resource's base production rate ×[0.50, 2.00] | 3 | beat 3 trigger fires at least once within beat window under all perturbations | Bottleneck beat is designed to fire. The probe validates that this remains true when one node's rate is varied — i.e. the bottleneck isn't a balance accident |
| `graph-width-invariance` | `resourcesPerTier = [3,3,2]` baseline vs `[2,2,2]` narrow vs `[4,4,3]` wide | 8 | Arc-closure beat 8 sim-time within [90 min, 130 min] across all widths | Width is the archetype's structural axis. If the arc closes in 60 min at narrow width, the archetype is under-scoped; if it doesn't close in 2h at wide, the 1–2h honesty is broken |

**Minimum probe count:** 6 (meets ≥4 requirement; covers conversion ratios, cost scaling, synergy strength, tech gating, bottleneck severity, and graph-width scope).

---

## 7. Sim assertions

```ts
import { describe, it, expect } from 'vitest';
import { runHeadless } from 'open-loop-engine';
import { runMatrix } from 'open-loop-engine/harness';
import { minutes } from '@/test/time';
import { loadInterlockerVars } from '../vars';
import { buildInterlockerEngine } from '../engine';

describe('interlocker — beat map', () => {
  const vars = loadInterlockerVars();

  it('beat 1: first raw producer purchased within 0–60 s', () => {
    const result = runHeadless({
      engine: buildInterlockerEngine(vars),
      until: (state) => state.buildings.raw[0].count >= 1,
      maxSimTime: minutes(2),
    });
    expect(result.simTime).toBeBetween(0, 60);
  });

  it('beat 2: first conversion chain closed within 3–8 min', () => {
    const result = runHeadless({
      engine: buildInterlockerEngine(vars),
      until: (state) => state.resources.basic[0].produced.gte(1),
      maxSimTime: minutes(10),
    });
    expect(result.simTime).toBeBetween(minutes(3), minutes(8));
  });

  it('beat 3: first bottleneck fires within 12–20 min', () => {
    const result = runHeadless({
      engine: buildInterlockerEngine(vars),
      until: (state) => state.history.anyResourceWentNegativeFor(30).happened,
      maxSimTime: minutes(25),
    });
    expect(result.simTime).toBeBetween(minutes(12), minutes(20));
  });

  // ... one `it` per beat through beat 8 in the checked-in test file

  it('beat 8: arc closure within 105–120 min', () => {
    const result = runHeadless({
      engine: buildInterlockerEngine(vars),
      until: (state) => state.achievements.has('graph-complete') && state.everyResourceRateHasBeenPositiveFor(60),
      maxSimTime: minutes(130),
    });
    expect(result.simTime).toBeBetween(minutes(105), minutes(120));
  });
});

describe('interlocker — balance robustness', () => {
  it('graph-width invariance: arc closes within 90–130 min at narrow / baseline / wide', () => {
    const matrix = runMatrix({
      engine: (v) => buildInterlockerEngine(v),
      baseVars: loadInterlockerVars(),
      perturbations: [
        { path: 'archetype.resourcesPerTier', values: [[2, 2, 2], [3, 3, 2], [4, 4, 3]] },
      ],
      beats: ['beat-8'],
    });
    for (const cell of matrix.cells) {
      expect(cell.beat('beat-8').simTime).toBeBetween(minutes(90), minutes(130));
    }
  });

  it('synergy strength: chain depth at beat 7 stays within [3, 7] named factors', () => {
    const matrix = runMatrix({
      engine: (v) => buildInterlockerEngine(v),
      baseVars: loadInterlockerVars(),
      perturbations: [
        { path: 'balance.synergies.*.perSourceUnitMagnitude', multiplier: [0.70, 1.00, 1.30] },
      ],
      beats: ['beat-7'],
    });
    for (const cell of matrix.cells) {
      const depth = cell.beat('beat-7').modifierChainNamedFactorCount;
      expect(depth).toBeGreaterThanOrEqual(3);
      expect(depth).toBeLessThanOrEqual(7);
    }
  });

  // one `it` per probe from § 6 — full enumeration in the checked-in test file
});
```

**Required test count:** 8 beats + 6 probes = 14 tests minimum. Tests checked into `src/modules/mods/<game>/sim/interlocker.sim.test.ts`.

---

## 8. Content sketch

- **Resources:** 8 at baseline. 3 raw (e.g. catnip, wood, minerals) + 3 basic (e.g. planks, beams, iron) + 2 advanced (e.g. machines, science). Each resource carries a `trackTotal` accumulator for achievements.
- **Producers / Buildings:** 3 raw (hut, sawpit, minepit) + 4 basic (lumber mill, smelter, workshop, library) + 2 advanced (factory, academy) = 9 total. Each consumes 0–3 input resources per tick and produces 1–2 output resources per tick. Multiple buildings share resources — the graph's interlock.
- **Tech gates:** 4 — (T1-unlock, T2-unlock, synergy-unlock-A, synergy-unlock-B). Each has a multi-resource cost. T1 unlocks the basic building tier; T2 unlocks advanced; synergy gates unlock named cross-building multipliers.
- **Conversion chains:** 4 distinct recipes across the graph (for example: *wood + minerals → beams*; *beams + iron → machines*; *planks + beams → science*; *machines + science → T3 capstone*). Each is one entry in `balance.recipes`.
- **Synergies:** 6 cross-building multipliers. Examples: workshop units multiply lumber-mill output; library units multiply every research rate; smelter units multiply factory output.
- **Achievements:** 24 — 8 production-milestone (reach N/sec on each resource), 8 graph-completeness (own every T0 building, run every T1 recipe simultaneously, complete every tech, etc.), 8 hidden (first bottleneck resolved without buying the bottlenecked building, every resource positive for 5 minutes straight, etc.). All contribute multiplicatively at `achievementMultiplier`.
- **Progression gates:** tech-tree nodes gate building-tier visibility; individual recipes unlock via tech.

**Density target:** every beat in § 4 maps to at least one content entry. Beat 1 → raw buildings; beat 2 → first recipe; beat 3 → cost requirement on second building surfaces bottleneck; beat 4 → first synergy entry; beat 5 → first tech; beats 6–7 → T2 recipes + cross-tier synergies; beat 8 → graph-complete achievement.

---

## 9. UI prescription

- **Primary shell:** `ThreePanelShell` — anchored by Kittens Game's three-panel shell row in `layout-audit-2026.md` (L100: `#leftColumn` resource table + tab buttons / `#midColumn` content / `#rightColumn` log). Sub-genre `village-management` is N=1 per `subgenre-shell-mapping-2026.md` § "village-management" (2026-04 audit), so the sub-genre itself does not earn a majority; the shell choice is `declared invention` for the Interlocker archetype, anchored to Kittens Game's mature three-column shape as the single canonical exemplar. Exemplar rows: Kittens Game. Industry Idle and Evolve are `free-form`/unaudited and do not generalise into a starter shell.
- **Secondary shell:** `MultiColumnShell` — `declared invention`. For forks whose graph grows past 8 resources or whose recipe count exceeds 4, the three-panel ceiling on parallel visibility breaks down and Trimps-style four-Bootstrap-columns becomes defensible. Cites the multi-column-dashboard cluster flagged in `subgenre-shell-mapping-2026.md` line 211 (N=3: Trimps, Arcanum, Cavernous II). No Interlocker-specific corpus row; hence the declared-invention tag.
- **Form-factor intent:** `desktop` — `declared invention`. Kittens Game is desktop per `layout-audit-2026.md` L100 (`platform: desktop`, `mobile-aware: yes` for a DOM-reflow variant, but the canonical shape is desktop). Industry Idle's canvas-based mobile experience does not generalise to a starter shell. The always-visible 8-resource table, the 9-building column, and the synergy stat panel do not shrink to mobile without a fork-level redesign.
- **ARIA-aligned widgets (lift targets):**
  - `Tooltip` — missing-resource tooltips on building/tech purchase buttons (beat 3 signal); per-resource rate breakdowns on hover. Cites `widget-vocabulary.md` Layer 1 (frequency 5; Kittens Game is a canonical example row).
  - `Tabs` — per-tier or per-subsystem navigation in the content column (buildings / tech / science / religion-style subsystems). Cites `widget-vocabulary.md` Layer 1 (frequency 6 as notable widget).
  - `Dialog` — achievement grid modal; tech-tree detail modal. Cites `widget-vocabulary.md` Layer 1 (frequency 6).
  - `Accordion` — collapsible per-subsystem sections in the stat panel; collapsible recipe-detail rows when the building list gets long. Cites `widget-vocabulary.md` Layer 1 (frequency 4).
  - `Progress` — per-building tick progress (especially for long-duration recipes); per-tech research progress. Cites `widget-vocabulary.md` Layer 1 (highest frequency, 12).

  Lift from `@/lib` / reka-ui primitives; forks do not reimplement focus, portal, or a11y.
- **Domain widgets (per-fork implementation):**
  - resource table — always-visible grid of all resources with amount, per-sec rate, and colour-coded bottleneck indicator. The signature Interlocker widget. Cites `widget-vocabulary.md` Layer 2 (frequency 4; Kittens Game, Multiversal Warrior, A Dark Room, Trimps — Kittens' "always-visible resource table" is the canonical form).
  - action card / building card — per-building row/card with name, count, cost (multi-resource), input/output rates, buy affordance. Cites `widget-vocabulary.md` Layer 2 (frequency 4).
  - stat panel — per-resource modifier-chain readout with named factor sources (synergy: X from Y, tech: Z). Sidebar-column fixture. Cites `widget-vocabulary.md` Layer 2 (frequency 6).
  - progress track — embedded per-building tick progress and per-tech research bars. Cites `widget-vocabulary.md` Layer 2 (frequency 7).

  Per-fork implementation — no pre-abstraction (OL-273 Phase 2: 9 distinct ResourceBar layouts across 3 games proved no generalisable shape; the same rule applies to the resource table widget family).
- **Layout detail:** three-panel region assignment — left column holds the always-visible resource table (8+ rows) with per-tier grouping. Centre column holds `Tabs` switching between Buildings / Tech / Synergies; inside each tab is the building-list or tech-tree view. Right column holds the stat panel (per-resource modifier-chain readouts) plus a compact event log. Modal (`Dialog`) hosts the achievement grid and the tech-tree detail.
- **Nav pattern:** horizontal tab bar in the centre column (Buildings / Tech / Synergies / Achievements). Matches Kittens Game's "horizontal tab bar" nav-pattern row per `layout-audit-2026.md` L100.
- **Declared-invention notes:** the three `declared invention` tags above all stem from the same root: the village-management sub-genre is N=1 and the corpus's other Interlocker-shaped games (Evolve, Industry Idle) use shells (web-app, free-form canvas) that do not translate into starter's five shells. Interlocker's UI prescription leans on Kittens Game as a single-corpus-row anchor and claims the three-panel shape on the strength of its fit to the always-visible-resource-graph pattern, not on sub-genre majority.

---

## 10. Predicted engine gaps

| Gap | Severity | Notes |
|-----|----------|-------|
| Recipe primitive (N inputs → M outputs) | High | `conversion.ts` is prestige-shaped. Interlocker wants `createRecipe({ inputs: Record<resourceId, DecimalSource>, outputs: Record<resourceId, DecimalSource>, ratePerSec, conditions? })`. Consumers wire recipes via `createProducerCategory` tick effects today; verbose, and the engine loses the ability to introspect the recipe graph. If Kittens-Interlocker, Industry-Interlocker, and Evolve-Interlocker all hand-wire the same tick-effects dance, graduate the primitive after the second consumer. |
| Multi-resource cost helper | Medium | `createCostRequirement` handles single-resource. A purchase that costs 5 resources composes 5 requirements manually and then must render "which one is missing?" separately. A `createMultiResourceCost({ costs: Record<resourceId, DecimalSource> })` that yields both the requirement and a missing-resource query would save every Interlocker consumer. |
| Recipe-graph analyzer | Medium | Given a resource graph, "what does producing one unit of X transitively cost?" is a reasonable Workbench question. Consumers walk the graph manually today. Benefits from the recipe primitive landing first. Harness analyzer, not engine primitive — candidate `createRecipeGraphAnalyzer()` under `src/harness/analyzers/`. |
| Synergy modifier-chain ergonomics at edge scale | Medium | 6 synergies × up to 8 target resources = up to 48 modifier-chain wires. Each is a one-liner, but the registration boilerplate is O(edges). A `createSynergyMatrix({ from: buildingId, to: resourceId, magnitude })` helper that generates the multiplier and wires it into the target's chain in one call would compress this. |
| Bottleneck detection helper | Low | Beat 3 needs to detect "any resource's per-sec rate flipped negative for ≥30 s." Consumers wire this via `watchEffect` + a timer; not hard, but repeated. A `useNegativeRateWindow(resource, windowMs)` composable would be worth lifting if three consumers need it. |
| Graph-completeness achievement primitive | Low | "Own every T0 building," "run every T1 recipe simultaneously," etc. are Quantity-Tracking achievements over a *set* of ids. `createTieredAchievement` handles scalar thresholds; a `createSetCompletionAchievement({ ids, predicate })` would match the graph-completeness shape. |
| Resource registration ergonomics at 8+ count | Low | `createResource` is clean at low counts. An `interlocker`-sized graph registers 8 resources + 8 `trackTotal` accumulators in a row. If this reads as verbose in practice, a `defineResourceTier({ ids, initial, trackTotal: true })` helper could help. Measure first — don't pre-abstract. |

---

## 11. Themes

### Theme A — Kitten village (the Kittens Game baseline)

- **Hook:** The canonical. Catnip, wood, minerals, kittens-as-workers, science, culture, religion. Cultural shorthand for the archetype.
- **Resource mapping:** raw = [catnip, wood, minerals]; basic = [planks, beams, iron]; advanced = [gears, science]. Buildings = [hut, catnip-field, lumber-mill, mine, workshop, library, smelter, factory, academy].
- **Narrative framing:** light — seasonal flavour events (winter catnip penalty) at tech unlocks.

### Theme B — Evolutionary species (Evolve-shaped)

- **Hook:** Each raw resource is a biological substrate. You start as simple life and interlock metabolisms into multicellular, then into technological, species. Species-trait synergies (Entish → +10% knowledge from scientists) drive cross-building multipliers.
- **Resource mapping:** raw = [hydrogen, carbon, phosphorus]; basic = [amino-acid, lipid, nucleic-acid]; advanced = [cell, gene-expression]. Buildings = [accretion, mineral-bed, deep-vent, reaction-pool, ribosome, organelle, mitochondrion, nucleus, colony].
- **Narrative framing:** strong — each tech gate is a named evolutionary transition (prokaryotic → eukaryotic → multicellular); arc closure is the first multicellular cooperation.

### Theme C — Industrial supply chain (Industry-Idle-shaped, no spatial layer)

- **Hook:** Raw mines feed smelters feed factories feed assembly. The canonical supply-chain aesthetic stripped of Industry Idle's grid placement — the graph is the game, not the map.
- **Resource mapping:** raw = [iron-ore, coal, oil]; basic = [steel, plastic, wire]; advanced = [engine, circuit]. Buildings = [iron-mine, coal-mine, oil-well, steel-mill, plastic-plant, wire-plant, engine-plant, circuit-plant, assembly].
- **Narrative framing:** none — the flow rates are the content.

### Theme D — Colony bootstrap (cold-start)

- **Hook:** You are bootstrapping a colony from nothing. Harvest ice, split hydrogen from water, grow oxygen from hydroponics, weave atmosphere into habitat. The graph literally keeps your colonists alive.
- **Resource mapping:** raw = [ice, regolith, solar]; basic = [water, oxygen, metal]; advanced = [habitat, atmosphere]. Buildings = [harvester, digger, panel, electrolysis, hydroponics, refinery, assembler, terraformer, colony-core].
- **Narrative framing:** medium — beat 3's first bottleneck is framed as *"oxygen reserves depleting"*; beat 8 closure is *"self-sustaining"*.

---

## Vocabulary anchors

Every name cited in this doc must resolve to one of:

- **Pattern names** → `open-loop-research/LIBRARY.md` + linked pattern files
- **Cross-pattern properties** → `open-loop-research/patterns/cross-pattern-properties/*.md`
- **Novel-patterns clusters** → `open-loop-research/reports/novel-patterns/novel-patterns-synthesis-v4.md`
- **Engine primitives** → `open-loop-engine/docs/api/INDEX.md` + the four `*.api.md` files
- **Corpus games** → `open-loop-research/analyses/complete/*-analysis.md`
- **Layout shells** → `open-loop-starter/src/lib/shells/`
