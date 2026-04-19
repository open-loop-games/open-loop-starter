# Archetype: Ambient

> **One-line identity:** Idle Production + Auto-Production spine + Ambient-Progression engagement commitment — the companion-software incremental, defined as much by what's *absent* as by what's present.
>
> **Status:** `candidate`

**Exemplars (validation, not clone targets):** [Cookie Clicker](../../open-loop-research/analyses/complete/cookie-clicker-analysis.md), [Candy Box](../../open-loop-research/analyses/complete/candy-box-analysis.md), [A Dark Room](../../open-loop-research/analyses/complete/a-dark-room-analysis.md) (Phase 1 only — the full game is a Phase-shifter instance), [Trimps](../../open-loop-research/analyses/complete/trimps-analysis.md), [Realm Grinder](../../open-loop-research/analyses/complete/realm-grinder-analysis.md).

All five are web-formation-era (2009–2015). The 2024+ Steam resurgence cluster (Rusty's Retirement, Chillquarium, Chill with You, Tiny Pasture) is cited in § 1 and § 11 without `analyses/complete/` links — those titles have not been analyzed yet. The formation-era corpus is sufficient for validation; the resurgence cluster confirms the pattern's contemporary viability.

---

## 1. Player experience

Ambient is the archetype the player does not play so much as *keep*. You open it once in the morning, glance at it while a pot boils, check it on the way back from a meeting, let it run at the edge of a monitor for an afternoon. Resources accumulate whether you are watching or not. Nothing expires. No wave is about to overrun your defenses. No cooldown queue is about to waste. The game has committed mechanically to never punishing absence — Loop 9 (Enemy Scaling) and strict Loop 14 (Cooldown urgency) are deliberately missing, not merely absent. What remains is Loop 2 (Idle Production) and Loop 7 (Auto-Production), a slowly unfolding unlock tree, and optional softened prestige. The player's relationship to the game is *companionship*, not engagement: the game lives on the desktop the way a plant lives on a desk.

A thirty-minute session is actually seven three-minute glances distributed across the day. Each glance yields accumulated output, one or two affordable purchases, and occasionally a new visual element revealed (a building appears, an animal wanders in, a zone quietly unlocks). The long-term pull is not mastery or compound growth — it is the pleasant, legible, ongoing state of the game: *my thing is running, it is happy, it grew while I was away.* The design commitment is 17 years old (Anti-Idle, 2009) and re-emerged on Steam desktop in 2024 (Rusty's Retirement) after a mobile-F2P dormancy gap that made the no-anxiety engagement model commercially unviable. Both formation and resurgence clusters validate the same underlying shape — what changes across eras is the visual budget, not the engagement contract.

---

## 2. Pattern composition

**Required patterns:**

- [Ambient Progression](../../open-loop-research/patterns/tier-3-moderate/ambient-progression.md) — the engagement-model commitment itself: no pressure loops, glance-check cadence, idle-visual-state as reward.
- [Activity Systems (auto-production variation)](../../open-loop-research/patterns/tier-0-universal/activity-systems/) — continuous passive production chain. Manual clicking is a bonus, not a requirement.
- [Progression Systems](../../open-loop-research/patterns/tier-0-universal/progression-systems.md) — unlock tree paces visible change across the 1–2h arc without imposing urgency.

**Cross-pattern properties engaged:**

- [Automation](../../open-loop-research/patterns/cross-pattern-properties/automation.md) — auto-production available early; load-bearing for the companion-software contract.
- [Purchase Mechanics](../../open-loop-research/patterns/cross-pattern-properties/purchase-mechanics.md) — visibility unlocks + producer tier purchases + optional softened prestige purchase.
- [Cost Scaling](../../open-loop-research/patterns/cross-pattern-properties/cost-scaling.md) — gentler exponents than Producer (growth closer to 1.08 than 1.15). Scaling is pacing, not the headline reward.
- [Quantity Tracking](../../open-loop-research/patterns/cross-pattern-properties/quantity-tracking.md) — milestone thresholds gate visibility unlocks and low-urgency achievements.

**Optional modifiers (fork may add):**

- **Softened single-tier Prestige** — Cookie Clicker's Ascension and Realm Grinder's faction cycling demonstrate prestige can coexist with the Ambient contract when optimal-timing pressure is removed. The `prestigeEnabled` ArchetypeVar controls inclusion.
- **Seasonal cosmetic events** — structurally compatible; must be cosmetic, not time-limited-or-lose-it. Ambient's contract forbids FOMO structurally.
- **Challenge Systems** — only compatible as *optional harder variants* where non-completion has zero progression penalty. If the fork wires this, beat map tolerances must remain satisfied with all challenges disabled. Any mandatory-path Challenge Systems breaks the no-anxiety contract and changes the archetype.

**Cross-reference (adjacent-not-equivalent):** [Time Systems](../../open-loop-research/patterns/tier-1-foundation/time-systems.md) governs *mechanics* (what `offline.ts` does); Ambient Progression is the designer's commitment to *remove urgency*. A wave-scaling high-anxiety game can have excellent offline progress; it is not Ambient. A fully-Ambient game necessarily has offline progress but cannot be reduced to it. The two patterns sit at different abstraction levels; cite both, collapse neither.

**Novel-patterns cluster alignment:** n/a — Ambient is a baseline-composition archetype that novel clusters deviate *away* from. Confirmed absent from `novel-patterns-synthesis-v4.md` clusters.

**MDA note (divergent from four-aesthetic shortlist):** primary **Submission** (low-intensity, meditative). Secondary **Sensation** — the cozy visual state is a principal draw for the 2024+ resurgence cluster. Sensation sits outside the Challenge/Submission/Discovery/Completion shortlist used in the OL-558 arcade-market-archetypes survey; its appearance as load-bearing here is significant and deliberate. A text-only Ambient (formation-era faithful, à la A Dark Room Phase 1 or Anti-Idle) can succeed with Submission alone; a Steam-era Ambient without Sensation surrenders a principal draw of the contemporary cluster. Theme D documents this trade-off explicitly.

---

## 3. Engine surface

| Layer | Primitive | Role in this archetype |
|-------|-----------|------------------------|
| core | `createResource` | Primary accumulating currency; optional prestige token. |
| core | `runHeadless` | Beat-timing sim tests, offline-round-trip probes, no-pressure audit. |
| systems | `createProducerCategory` | Auto-production tiers — the positive loop spine. |
| systems | `createLoop` | Tick-driven per-second accumulation (Loop 2 / Loop 7 substrate). |
| systems | `createPurchasableCategory` | Visibility unlocks (progressive reveal) + optional global upgrades. |
| systems | `createAchievementCategory` | Low-urgency milestone markers; passive multipliers only when enabled. |
| systems | `createReset` | Optional softened prestige; caller's responsibility to omit optimal-timing mechanics. |
| harness | `runMatrix` | Probe robustness and offline round-trip across the vars space. |

**Engine systems explicitly not used (required):** `createChallengeCategory` — challenge/combat surface would mechanize Loop 9 (Enemy Scaling) and strict Loop 14 (cooldown urgency); both are structurally incompatible with the no-anxiety engagement commitment. `createZoneSystem` / `createWorker` / `createInventory` — not forbidden, but their presence typically implies structural depth (spatial progression, worker assignment, inventory management) that pulls the cognitive-load budget above the Ambient ceiling. A fork that wires them must revalidate § 4 beat timing against § 6 probe tolerances.

The absence is the contract. A reader inspecting an Ambient mod should see Loop 2 + Loop 7 + progression + optional softened reset, nothing else — and conclude the engine feels clean at ~25% surface use.

**Primary stress axes:**

1. **Offline-round-trip correctness.** Offline accumulation is the *mechanical prerequisite* for the engagement contract. If a 12-hour gap yields a different final resource value from 12 continuous hours of sim (beyond rounding), the contract is broken — the player returns to a game that "fell behind." Probe 3 exercises this at 4h / 12h / 24h gaps.
2. **Sparse-surface ergonomics.** Ambient exercises ~25% of the engine's systems surface. If writing an Ambient mod requires boilerplate from every layer or verbose category-options blocks, the engine has an ergonomics problem that Producer's analogous stress claim also surfaces.
3. **No-pressure invariant correctness.** The "explicitly not used" row is a *runtime* claim, not a documentation claim. Probe 5 asserts that no tick across a 24h sim causes resource cap-and-waste, negative state change, or a fail-state flag. Binary pass/fail. This is the archetype's signature probe and the one most likely to catch mod-author drift.

---

## 4. Beat map

Arc framing: **first session to first prestige-eligible state.** Ambient has no completion state by design; the skeleton's "you've seen the shape once" moment is the moment the player *could* prestige, whether they do or not. The arc target is 90–120 sim-minutes, cumulative — not continuous. Sessions in reality are distributed; the beat map measures accumulated sim-time regardless of wall-clock distribution.

| # | Beat | Target sim-time | Trigger condition | Player-visible signal | Why it matters |
|---|------|-----------------|-------------------|------------------------|-----------------|
| 1 | First passive production visible | 0:00–0:30 | `resource ≥ 1` without any clicks | Resource readout starts ticking; first building icon pulses | Onboarding — confirms the game produces *without* the player, establishing the Ambient contract in the first 30 seconds |
| 2 | First auto-producer purchased (T1) | 1:00–3:00 | `producers[0].count ≥ 1` | Building appears in the scene; per-second rate increments visibly | Validates cost onboarding + makes the passive-chain commitment physical |
| 3 | First visibility unlock revealed | 5:00–12:00 | `unlocks[0].visible` | Previously-hidden UI element or scene element becomes visible | Establishes the gentle unfold cadence — content arrives without urgency |
| 4 | Glance-check value proposition proven | 15:00–25:00 | return from backgrounded state with `Δresource ≥ meaningfulThreshold` AND ≥1 affordable purchase queued | Welcome-back summary: "accumulated X, Y affordable" | The archetype's signature moment — the first time the player leaves and returns *rewarded*; distinguishes Ambient from a foreground game with idle padding |
| 5 | Mid-arc scene diversification | 30:00–50:00 | `producers[mid].count ≥ 1` AND ≥1 idle-scene variant unlocked | New animation / creature / element appears in the idle scene | Sensation-aesthetic payoff — visual state confirms depth without demanding engagement |
| 6 | First low-urgency achievement multiplier | 50:00–70:00 | milestone-count achievement fires with passive-multiplier reward | Achievement toast (non-modal); multiplier applies quietly | Achievements as pacing markers, not pressure — fires at the player's cadence, not theirs |
| 7 | Prestige-eligible state reached (arc closure) | 80:00–110:00 | `resource ≥ prestigeThreshold` AND `unlockTrackDepth` reached | Prestige affordance unlocks *if enabled*; end-of-arc flavour event fires regardless | The "one-loop-seen" moment. Player may prestige or continue; skeleton's baseline story is complete either way |

**Arc closure beat:** #7.

The prework's "beat 8 if prestige enabled" option is deliberately omitted — the skeleton's arc ends at beat 7 whether the player prestiges or not. A fork that adds prestige and wants a distinct "first prestige completed" milestone should add it as a BalanceVar-tuned beat-8, not as a skeleton default. This keeps the no-prestige Ambient (Rusty's Retirement shape) a first-class default.

---

## 5. Vars schema

```ts
// archetype.ts — skeleton defaults
export interface AmbientArchetypeVars {
  // Structural fork decisions. Editing these constitutes forking the skeleton, not tuning.

  /** Whether softened prestige is available. Ambient contract: never mandatory-now. */
  prestigeEnabled: boolean;                   // default false
  /** Number of auto-production tiers (buildings / producers). */
  autoProductionTiers: number;                // default 5
  /** Total visibility-unlock nodes across the 1–2h arc. Paces content reveal. */
  unlockTrackDepth: number;                   // default 12
  /** Count of milestone / time-based achievements. */
  achievementCount: number;                   // default 20
  /** Target glance-check window in minutes — informs unlock pacing and probe tolerances. */
  glanceCheckWindowMinutes: [number, number]; // default [5, 20]
  /** Maximum offline accumulation window. Caps prevent meaningless multi-day gaps. */
  offlineCapHours: number;                    // default 12
  /** Optional Challenge Systems modifier — only compatible as opt-in cosmetic variants. */
  optionalChallengesEnabled: boolean;         // default false
}

// theme.ts — costume, no mechanical impact
export interface AmbientThemeVars {
  resourceName: { singular: string; plural: string };
  /** Length must equal AmbientArchetypeVars.autoProductionTiers. */
  producerNames: string[];
  /** Named visual states unlocked across the arc. Length ≥ 1; milestones reference by index. */
  idleSceneVariants: string[];
  unlockFlavour: Array<{ label: string; description: string }>;
  achievementFlavour: Array<{ label: string; description: string; hidden?: boolean }>;
  /** Fires at beat 7 (arc closure). */
  endOfArcMessage: string;
  /** Welcome-back copy template for beat 4 glance-check summary. */
  welcomeBackTemplate: string;                // e.g. "While you were away, {count} {resourcePlural} accumulated."
}

// balance.ts — mechanical overrides
export interface AmbientBalanceVars {
  tier1BaseRate: DecimalSource;               // per-second, e.g. "0.5"
  producerCostScaling: {
    baseCost: DecimalSource;                  // e.g. "10"
    growth: number;                           // gentler than Producer — default 1.08
  };
  /** Inter-tier cost multipliers. Length = autoProductionTiers. */
  tierCostRatios: number[];                   // default [1, 8, 6, 5, 4]
  /** Resource-total thresholds gating visibility unlocks. Length = unlockTrackDepth. */
  unlockThresholds: DecimalSource[];
  /** Offline efficiency factor — 1.0 full, 0.5 half, etc. */
  offlineEfficiency: number;                  // default 1.0
  /** Multiplier per achievement when passive rewards are enabled. */
  achievementMultiplier: number;              // default 1.02
  /** Softened prestige base multiplier; only consulted if prestigeEnabled. */
  prestigeMultiplierBase: number;             // default 1.2
  /** Resource threshold at which prestige becomes eligible (beat 7 trigger). */
  prestigeEligibleThreshold: DecimalSource;
}
```

**Override semantics:** deep-merge at load order `archetype → theme → balance`. Tests pass an override object to `runHeadless` via `runMatrix`.

**Codegen contract:** `pnpm codegen:archetype-vars ambient` (pending OL-546) reads this block and emits `src/modules/mods/<game>/vars/archetype.ts` / `theme.ts` / `balance.ts` with matching defaults wired up. Archetype-level shared types and defaults live at `src/archetypes/ambient/`.

---

## 6. Balance probes

| Probe | Perturbation | Target beat(s) | Tolerance | Rationale |
|-------|--------------|----------------|-----------|-----------|
| `production-rate-baseline` | `tier1BaseRate` ×[0.75, 1.25] | 1, 2 | Beat sim-time ±25% | Onboarding pacing — beats 1–2 feel broken if off |
| `cost-scaling-growth` | `producerCostScaling.growth` ×[0.93, 1.08] (≈±7% on 1.08 baseline) | 3, 5 | Beat sim-time ±20% | Ambient's gentle growth means this axis is *more* sensitive than Producer's — small shifts move mid-arc beats noticeably |
| `offline-round-trip-correctness` | Simulate 4h / 12h / 24h offline gaps vs. continuous equivalent | — (invariant, not a beat) | Resource delta ≤ 0.5% of continuous reference | The mechanical prerequisite for the Ambient contract; this probe is the only one measuring correctness over timing |
| `achievement-multiplier-density` | `achievementMultiplier` ×[0.98, 1.06] + `achievementCount` ×[0.5, 1.5] | 6 | Beat sim-time ±30% | Achievement pacing is the mid-arc acceleration axis; sparse-surface archetype needs this tuned |
| `no-pressure-audit` | Run 24h sim at default vars; assert no negative state transitions | — (invariant, binary) | Zero resource cap-and-waste events, zero fail-state flags, zero negative deltas on player-visible resources | The archetype's signature probe. Catches mod-author drift that introduces pressure loops by accident |

**Minimum probe count:** 5 (exceeds ≥4 requirement). Covers cost scaling, production rate, offline correctness, achievement density, and the Ambient-specific no-pressure audit. The fourth-axis "archetype-specific" slot is filled by two probes (offline round-trip + no-pressure audit) because both are structurally definitional for the archetype.

---

## 7. Sim assertions

```ts
import { describe, it, expect } from 'vitest';
import { runHeadless } from 'open-loop-engine';
import { runMatrix } from 'open-loop-engine/harness';
import { minutes, hours } from '@/test/time';
import { loadAmbientVars } from '../vars';
import { buildAmbientEngine } from '../engine';

describe('ambient — beat map', () => {
  const vars = loadAmbientVars();

  it('beat 1: passive production visible within 0–30 s (no clicks)', async () => {
    const result = runHeadless({
      engine: buildAmbientEngine(vars),
      until: (state) => state.resource.gte(1),
      maxSimTime: minutes(1),
      inputs: 'none', // no manual clicks; Ambient produces unattended
    });
    expect(result.simTime).toBeBetween(0, 30);
  });

  it('beat 4: glance-check proposition proven within 15–25 min', async () => {
    const result = runHeadless({
      engine: buildAmbientEngine(vars),
      until: (state) =>
        state.resource.gt(state.balance.meaningfulThreshold) &&
        state.affordable.count >= 1,
      maxSimTime: minutes(30),
    });
    expect(result.simTime).toBeBetween(minutes(15), minutes(25));
  });

  // one it() per beat — full enumeration in the checked-in test file
});

describe('ambient — balance robustness', () => {
  it('offline 12h gap matches continuous 12h sim within 0.5%', async () => {
    const continuous = runHeadless({
      engine: buildAmbientEngine(loadAmbientVars()),
      maxSimTime: hours(12),
    });
    const offline = runHeadless({
      engine: buildAmbientEngine(loadAmbientVars()),
      maxSimTime: minutes(1),
      postRun: { simulateOfflineGap: hours(12) },
    });
    const delta = continuous.state.resource.sub(offline.state.resource).abs();
    const tolerance = continuous.state.resource.mul(0.005);
    expect(delta.lte(tolerance)).toBe(true);
  });

  it('no-pressure audit: 24h sim produces zero pressure events', async () => {
    const result = runHeadless({
      engine: buildAmbientEngine(loadAmbientVars()),
      maxSimTime: hours(24),
      analyzers: ['resource-cap-waste', 'fail-state-flag', 'negative-delta'],
    });
    expect(result.analyzers.resourceCapWasteEvents).toBe(0);
    expect(result.analyzers.failStateFlagsRaised).toBe(0);
    expect(result.analyzers.negativeDeltasObserved).toBe(0);
  });

  // one it() per probe from § 6
});
```

**Required test count:** 7 beats + 5 probes = 12 tests minimum. Tests checked into `src/modules/mods/<game>/sim/ambient.sim.test.ts`.

**Representative-stubs escape hatch:** this doc shows 3 worked stubs (beat 1, beat 4, the two signature probes) and a `// one it() per beat` / `// one it() per probe` comment. Full enumeration lives in the test file.

---

## 8. Content sketch

- **Resources:** 1 primary accumulating currency (+1 prestige token if `prestigeEnabled`).
- **Producers / Activities:** 5 auto-producer tiers. Manual click affordance optional (theme-dependent); if present, clicks are a bonus, not required. Example naming (cozy-farm theme): planter, coop, pond, pasture, orchard.
- **Upgrades / Purchasables:** 12 visibility unlocks gating scene elements + UI affordances. Optional 4 global multiplier upgrades when `prestigeEnabled` (unlock in prestige tree).
- **Progression gates:** resource-threshold visibility unlocks — soft reveals, not hard blocks; player can ignore and progress continues. Prestige gate at beat 7 if enabled.
- **Achievements:** 20 — 10 milestone-count (own N of producer X, reach N/sec total rate), 10 time-based ("game running for 1 hour total," "returned after 12h absence," "collected 5 glance-checks in a day"). All passive — no achievement requires the player to *do* anything specific at a specific moment.
- **Idle scene variants:** 6 named visual states — default + 5 unlocked at milestone thresholds. Referenced by index from `AmbientThemeVars.idleSceneVariants`. These are the Sensation payload; a text-only theme supplies placeholder strings instead (see Theme D).

**Density target:** every beat in § 4 has ≥1 content entry mapped. Beat 1 → producer T1 + resource readout; beats 2–3 → producers[0..2] + first two visibility unlocks; beat 4 → welcome-back template + affordable-queue indicator; beat 5 → idle-scene-variant unlock + producer[mid]; beat 6 → achievement with passive multiplier; beat 7 → prestige affordance (if enabled) + end-of-arc flavour event + final idle-scene variant.

---

## 9. UI prescription

- **Primary shell:** `SingleColumnShell` — narrative-clicker strict majority per `subgenre-shell-mapping-2026.md` § "narrative clicker" (5/12 classifiable). Exemplar rows from `layout-audit-2026.md`: A Dark Room, Candy Box 2. The single-column form honors Ambient's reduced-chrome ethos: scene-dominant presentation, minimal navigation, legible at a glance.
- **Secondary shell:** `ThreePanelShell` — narrative-clicker secondary cluster (3/12 classifiable) per `subgenre-shell-mapping-2026.md`. Use when the fork surfaces auto-producer lists, upgrade trays, and achievement grids alongside the idle scene. Exemplar rows: Cookie Clicker, Universal Paperclips.
- **Form-factor intent:** `desktop` — narrative-clicker corpus is desktop-dominant per `layout-audit-2026.md` distribution. The 2024+ Steam resurgence persistent-strip form (Rusty's Retirement, Tiny Pasture, Chill with You) is `` `declared invention` `` against starter's shell set — no `AmbientStrip` / `CompanionFrame` shell ships in `src/lib/shells/*.vue` today. A fork claiming the persistent-strip commitment authors its own shell. See declared-invention notes below.
- **ARIA-aligned widgets (lift targets):**
  - `Tooltip` — producer rate / unlock threshold / achievement description on hover. Cites `widget-vocabulary.md` Layer 1 (frequency 5).
  - `Dialog` — achievement grid modal; settings modal; optional prestige confirmation. Cites `widget-vocabulary.md` Layer 1 (frequency 6).
  - `Progress` — per-producer auto-tick indicators; offline-accumulation gauge on session resume. Cites `widget-vocabulary.md` Layer 1 (highest frequency, 12).
  - `Toast` — achievement unlocks (beat 6 signal), welcome-back summary (beat 4). Non-modal, dismissable; the Ambient contract forbids modal pressure. Cites `widget-vocabulary.md` Layer 1 (frequency 3).

  Lift from `@/lib` / reka-ui primitives; forks do not reimplement focus, portal, or a11y.
- **Domain widgets (per-fork implementation):**
  - resource bar — primary currency + current rate, persistent. Cites `widget-vocabulary.md` Layer 2 (frequency 11; 9 distinct shapes across 3 games per OL-273 Phase 2 — no pre-abstraction).
  - idle-scene canvas — the game's visual centre; animated producers, creatures, scene elements. Per-fork implementation; this is where the Sensation budget lands. Cites `widget-vocabulary.md` Layer 2 (no corpus row — the canvas is declared-invention territory the Steam-era resurgence cluster pioneered).
  - action card / building card — per-producer row with icon, name, count, cost, per-second rate, buy-1 affordance. Cites `widget-vocabulary.md` Layer 2 (frequency 4).
  - welcome-back summary panel — appears on session resume with accumulated delta + affordable queue. Per-fork implementation; signature UI affordance for beat 4. No corpus widget row (declared invention against the audit).
- **Layout detail:** single-column region assignment — scene canvas dominates the upper viewport; resource readout + rate pinned top; producer list scrolls below; achievement toasts fire from bottom-right. Welcome-back summary overlays the scene on session resume and auto-dismisses after acknowledgment. Secondary three-panel form moves producer list to a left column and upgrade/achievement tray to the right, preserving the scene canvas as centre.
- **Nav pattern:** none at shell level — Ambient is single-screen by design. Optional internal tabs within the upgrade tray (visibility unlocks / prestige tree / settings) are widget-internal, not shell navigation. This honors the low-cognitive-load commitment.
- **Declared-invention notes:**
  - **Persistent-strip form** (Rusty's Retirement, Tiny Pasture): a narrow always-on-top window occupying a screen edge, dimensioned for companion-software co-residence with other applications. Zero cross-corpus rows in `layout-audit-2026.md` predate the 2024 Steam cluster. Starter ships no such shell; a fork claiming this commitment authors an `AmbientStrip` or `CompanionFrame` shell at `src/lib/shells/` and upgrades the `src/lib/` layer accordingly. `TODO(expansion)` in the LIBRARY pattern: promote the shell primitive when ≥2 independent Ambient consumers converge on the same shape.
  - **Idle-scene canvas** and **welcome-back summary panel** are declared-invention against the widget audit — no pre-abstraction. Rusty's Retirement's scene, Chillquarium's aquarium view, and Chill with You's vignette are each bespoke per-fork implementations. Graduate to `widget-vocabulary.md` Layer 2 when three independent canvas shapes converge.

---

## 10. Predicted engine gaps

Zero correctness gaps predicted — engine posture is settled (see LIBRARY pattern § Engine Posture and the taxonomy's `§ 2G`). All entries below are low-severity ergonomics hypotheses the first Ambient-archetype fork will confirm or reject.

| Gap | Severity | Notes |
|-----|----------|-------|
| No declarative "no-pressure invariant" test helper | Low | Probe 5 is a hand-written analyzer combination (`resource-cap-waste`, `fail-state-flag`, `negative-delta`). If a second Ambient consumer writes the same assertion, graduate a `runAmbientAudit()` harness helper. Measure first. |
| Offline accumulation cap is hand-wired | Low | `AmbientBalanceVars.offlineCapHours` is consumed by game code today; engine's `offline.ts` does not enforce caps. If three archetypes (Ambient, Scaler, Producer) want the same semantics, graduate a `createOfflineAccumulator({ capHours })` helper on top of existing primitives. |
| Achievement-firing-on-resume detection | Low | Time-based achievements ("returned after 12h absence") fire at session-resume rather than during sim. Harness concern — probably a `resume-analyzer` rather than an engine primitive. Defer. |
| Idle-scene animation orchestration | Low (starter, not engine) | Vue-component concern; flagged for clarity. Not an engine gap. Belongs in `src/lib/` or game-side. |
| Persistent-strip shell primitive | Low (starter, not engine) | See § 9 declared-invention note. `TODO(expansion)` in the LIBRARY pattern; promote on ≥2 converging consumers. Not an engine gap. |

The one-line rule for this section: **if implementing an Ambient fork requires an engine change, the gap is severity `high` and this table must be updated.** Current hypothesis is that no such gap exists — the first implementation will validate or falsify this.

---

## 11. Themes

### Theme A — Cozy Farm

- **Hook:** The canonical Steam-era Ambient costume. Crops grow, animals wander, seasons turn. The Rusty's Retirement / Tiny Pasture shape.
- **Resource mapping:** resource = harvest (singular: "sprout" / plural: "sprouts"); producers = [planter, coop, pond, pasture, orchard].
- **Narrative framing:** light — seasonal transitions as idle-scene-variant triggers; end-of-arc flavour event is a year-cycle completion.

### Theme B — Aquarium

- **Hook:** The Chillquarium shape. Fish accumulate, rarer breeds unlock over time, bubbles drift. Visual motion is continuous; pacing is slow.
- **Resource mapping:** resource = biomass (singular: "fry" / plural: "fry"); producers = [starter-tank, filter, reef-shelf, deep-pool, ocean-tank].
- **Narrative framing:** none — pure observational aesthetic; idle-scene variants are progressively rarer species.

### Theme C — Lo-Fi Companion

- **Hook:** The Chill with You shape. A character sits at a desk, drinks coffee, reads; the view updates subtly over the day. Sensation aesthetic as primary draw.
- **Resource mapping:** resource = focus (singular: "minute" / plural: "minutes"); producers = [notebook, playlist, window-view, coffee-press, lamp-library].
- **Narrative framing:** optional — unlocked idle-scene variants are small narrative vignettes (a visitor appears, rain starts, the cat comes out). No branching; the narrative is ambient.

### Theme D — Minimalist Text (formation-era faithful)

- **Hook:** The Anti-Idle / A Dark Room Phase 1 / Candy Box shape. Text-only, ASCII-art sparse. Submission-primary, Sensation explicitly surrendered. Documents the formation-era trade-off: the pattern works without visual budget, but the draw is different.
- **Resource mapping:** resource = warmth / candies / score (theme variable); producers = [kindling, fire-keeper, lamplighter, watchman, signal-tower] or theme equivalents.
- **Narrative framing:** prose — idle-scene variants are text scene-description blocks; end-of-arc flavour event is a single closing paragraph. This theme validates that the skeleton survives the absence of Sensation, at the cost of the contemporary cluster's principal draw. A deliberate choice, not an accident of budget.

---

## Vocabulary anchors

Every name cited in this doc must resolve to one of:

- **Pattern names** → `open-loop-research/LIBRARY.md` + linked pattern files
- **Cross-pattern properties** → `open-loop-research/patterns/cross-pattern-properties/*.md`
- **Novel-patterns clusters** → `open-loop-research/reports/novel-patterns/novel-patterns-synthesis-v4.md`
- **Engine primitives** → `open-loop-engine/docs/api/INDEX.md` + the four `*.api.md` files
- **Corpus games** → `open-loop-research/analyses/complete/*-analysis.md`
- **Layout shells** → `open-loop-starter/src/lib/shells/`
