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

**Optional modifiers (fork may add):**

- **Single-tier Prestige** — a simple ascension layer that resets the primary resource for a permanent multiplier. Keeps the archetype's spirit without turning into Scaler.
- **Time-limited seasonal content** — Cookie Clicker's Halloween/Christmas events. Achievement-system composition, low engine cost.
- **Soft-capped clicking** — to prevent click-macros from dominating the curve once producers are humming. [Softcapping](../../open-loop-research/patterns/cross-pattern-properties/softcapping.md) cross-property.

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

## 4. Beat map

| # | Beat | Target sim-time | Trigger condition | Player-visible signal | Why it matters |
|---|------|-----------------|-------------------|------------------------|-----------------|
| 1 | First click production visible | 0:00–0:30 | `resource ≥ 1` | Big number ticks up, click button animates | Onboarding — confirms core feedback loop |
| 2 | First producer purchased (T1) | 1:00–3:00 | `producers[0].count ≥ 1` | Auto-production indicator starts; rate readout appears | Transitions player from clicking to idling |
| 3 | Second-tier producer purchased (T2) | 5:00–10:00 | `producers[1].count ≥ 1` | Production rate jumps visibly; T2 row activates | Validates the inter-tier cost ratio and reveals pacing cadence |
| 4 | First multiplier upgrade | 12:00–20:00 | `upgrades[0].owned` | Headline multiplier increments; affected producer row shows boost | First exposure to the modifier chain that becomes the long-term pull |
| 5 | First achievement-driven multiplier | 25:00–40:00 | achievement with mechanical reward unlocks | Achievement toast; multiplier visibly ticks up in chain readout | Achievements as mechanics, not decoration — the archetype's signature |
| 6 | Bulk-buy becomes meaningful | 40:00–65:00 | `calculateMaxAffordable(producers[n]) ≥ 10` | "Buy 10 / Buy max" button becomes the dominant action | Stress-tests formula inversion under load; UX inflection |
| 7 | Deep modifier chain visible | 65:00–95:00 | headline multiplier ≥ 1e6× base | Chain expansion UI shows 8+ stacked factors with named sources | The moment the player *sees* the compounded stack that is the archetype's reward |
| 8 | Top producer tier owned + base arc closed | 95:00–120:00 | `producers[last].count ≥ 1` AND `upgradesArcComplete` | Top-tier row lights up; end-of-arc flavour event fires | The 1–2h arc closure. Fork extends beyond this; skeleton stops here |

**Arc closure beat:** #8.

---

## 5. Vars schema

```ts
// archetype.ts — skeleton defaults
export interface ProducerArchetypeVars {
  // Structural shape of the producer hierarchy — changing these is a fork-of-skeleton decision.
  producerTierCount: number;        // default 7
  upgradesPerProducer: number;      // default 3 (per-producer multiplier upgrades)
  globalUpgradeCount: number;       // default 6 (click & global multiplier upgrades)
  achievementCount: number;         // default 30 (10 production + 10 building-count + 10 hidden)
  bulkBuyEnabled: boolean;          // default true
  softCapClickContributionAt: number | null; // default null (no softcap); Decimal string if enabled
}

// theme.ts — costume, no mechanical impact
export interface ProducerThemeVars {
  resourceName: { singular: string; plural: string };
  producerNames: string[];          // length must equal ProducerArchetypeVars.producerTierCount
  upgradeFlavour: { label: string; description: string }[];
  achievementFlavour: { label: string; description: string; hidden?: boolean }[];
  clickButtonLabel: string;
  endOfArcMessage: string;          // fires at beat 8
}

// balance.ts — mechanical overrides; drives beat timing
export interface ProducerBalanceVars {
  clickBaseValue: string;           // Decimal — default "1"
  tier1BaseRate: string;            // Decimal/sec — default "0.1"
  tierCostRatios: number[];         // inter-tier cost multipliers; length = producerTierCount
  producerCostScaling: {            // per-producer exponential curve
    baseCost: string;               // Decimal — tier-1 first-unit cost, default "15"
    growth: number;                 // multiplier per purchase, default 1.15
  };
  upgradeMultiplier: number;        // default 2 (doubling per per-producer upgrade)
  globalUpgradeMultiplier: number;  // default 2
  achievementMultiplier: number;    // default 1.02 (per achievement)
  milestoneThresholds: number[];    // quantity-tracking thresholds per producer, default [1, 10, 25, 50, 100, 150, 200, 300, 400, 500]
  milestoneBonusPerTier: number;    // multiplicative bonus per threshold hit, default 2
}
```

**Override semantics:** deep-merge at load order `archetype → theme → balance`. Tests pass an override object to `runSim`.

**Codegen contract:** `pnpm codegen:archetype-vars producer` reads this block and emits `src/modules/<game>/vars/archetype.ts` / `theme.ts` / `balance.ts` with matching defaults wired up.

---

## 6. Balance probes

| Probe | Perturbation | Target beat(s) | Tolerance | Rationale |
|-------|--------------|----------------|-----------|-----------|
| `cost-scaling-growth` | `producerCostScaling.growth` ×[0.85, 1.15] (≈±15% on 1.15 baseline) | 3, 6 | Beat sim-time ±20% | Inter-tier cost is the dominant pacing lever; most sensitive axis |
| `tier1-base-rate` | `tier1BaseRate` ×[0.75, 1.25] | 1, 2 | Beat sim-time ±25% | Onboarding pacing — beats 1–2 feel terrible if wrong |
| `modifier-stack-depth` | enable/disable every third upgrade | 7 | Headline-multiplier error ≤0.1% vs. ground truth | Modifier chain correctness — not timing, *arithmetic* |
| `achievement-density` | `achievementMultiplier` ×[0.95, 1.05] + count ×[0.5, 1.5] | 5, 7 | Beat sim-time ±30% | Achievement pacing drives mid-arc acceleration; high-sensitivity for this archetype |
| `bulk-buy-formula-scale` | run at resource magnitudes 1e50 / 1e200 / 1e500 | 6 | `calculateMaxAffordable` returns correct N for all scales | `break_eternity.js` tetration edge cases; correctness over timing |

**Minimum probe count:** 5 (meets ≥4 requirement; covers cost scaling, production rate, modifier chain, achievement density, and bulk-buy correctness).

---

## 7. Sim assertions

```ts
import { describe, it, expect } from 'vitest';
import { runHeadless } from 'open-loop-engine';
import { runMatrix } from 'open-loop-engine/harness';
import { minutes } from '@/test/time';
import { loadProducerVars } from '../vars';
import { buildProducerEngine } from '../engine';

describe('producer — beat map', () => {
  const vars = loadProducerVars();

  it('beat 1: first production visible within 0–30 s', async () => {
    const result = runHeadless({
      engine: buildProducerEngine(vars),
      until: (state) => state.resource.gte(1),
      maxSimTime: minutes(1),
    });
    expect(result.simTime).toBeBetween(0, 30);
  });

  it('beat 2: first T1 producer purchased within 1–3 min', async () => {
    const result = runHeadless({
      engine: buildProducerEngine(vars),
      until: (state) => state.producers[0].count >= 1,
      maxSimTime: minutes(5),
    });
    expect(result.simTime).toBeBetween(minutes(1), minutes(3));
  });

  // ... one `it` per beat through beat 8

  it('beat 8: arc closure within 95–120 min', async () => {
    const result = runHeadless({
      engine: buildProducerEngine(vars),
      until: (state) => state.producers.at(-1)!.count >= 1 && state.arcComplete,
      maxSimTime: minutes(150),
    });
    expect(result.simTime).toBeBetween(minutes(95), minutes(120));
  });
});

describe('producer — balance robustness', () => {
  it('beats 3 and 6 stay in tolerance under cost-scaling growth ±15%', async () => {
    const matrix = runMatrix({
      engine: (v) => buildProducerEngine(v),
      baseVars: loadProducerVars(),
      perturbations: [
        { path: 'balance.producerCostScaling.growth', values: [0.98, 1.15, 1.32] },
      ],
      beats: ['beat-3', 'beat-6'],
    });
    for (const beat of ['beat-3', 'beat-6']) {
      expect(matrix.tolerance(beat, '±20%')).toBe(true);
    }
  });

  // one `it` per probe from § 6
});
```

**Required test count:** 8 beats + 5 probes = 13 tests minimum. Tests checked into `src/modules/<game>/sim/producer.sim.test.ts`.

---

## 8. Content sketch

- **Resources:** 1 — the primary currency.
- **Producers / Activities:** 1 click activity + 7 producer tiers. Example naming scale (bakery theme): cursor, grandma, farm, mine, factory, bank, temple.
- **Upgrades / Purchasables:** 3 per producer × 7 = 21 producer-scoped multiplier upgrades; 6 global upgrades (click multipliers, cross-producer multipliers, bulk-buy unlocks). Total 27.
- **Progression gates:** resource-threshold unlocks for each producer tier (visibility gate, not hard block); upgrade visibility scoped by owning ≥1 of the relevant producer.
- **Achievements:** 30 — 10 production-milestone (reach N/sec), 10 building-count milestone (own N of producer X), 10 hidden (e.g. *first minute without clicking*, *bought all T1 upgrades*). All 30 grant `achievementMultiplier` contribution to the modifier chain.
- **UI layout:** `SidebarMainShell` from `src/lib/shells/`. Main column: big click target + producer list. Sidebar: upgrades tray + stats. Modal: achievements grid.

**Density target:** every beat in § 4 has at least one corresponding content entry above (beats 1–3 → producers; 4 → upgrades; 5 → achievements; 6 → bulk-buy affordance; 7 → modifier chain readout; 8 → top tier + flavour event).

---

## 9. Predicted engine gaps

| Gap | Severity | Notes |
|-----|----------|-------|
| Bulk-buy UI helper | Low | `calculateMaxAffordable` exists; "Buy 1 / 10 / 25 / Max" UI is game-side today. If three archetypes need the same pattern, graduate a `useBulkBuy()` composable. |
| Modifier-chain debug view | Low | A mature Producer run surfaces 10+ chain factors; developers need to introspect "where did this multiplier come from?" Could be a harness analyzer, not an engine primitive. |
| `break_eternity` tetration correctness | Unknown | Probe 5 is designed to find this. May be nothing; may be the headline defect. |
| Per-producer milestone bonus composition | Medium | Quantity-tracking milestone bonuses (beat 7's stacked factors) compose with modifier chains today via manual wiring. If Producer, Scaler, and Interlocker all hand-wire this, graduate a `createMilestoneBonus` helper. |
| Achievement category ergonomics at scale | Low | 30 achievements with mechanical rewards means 30 option blocks. If verbose, a `defineAchievement()` helper would help — but measure first, don't pre-abstract. |

---

## 10. Themes

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
