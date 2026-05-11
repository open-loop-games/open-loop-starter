# Archetype: Ambient

> **One-line identity:** Idle Production + Auto-Production spine + Ambient-Progression engagement commitment — the companion-software incremental, defined as much by what's *absent* as by what's present.
>
> **Status:** `candidate`

**Exemplars (validation, not clone targets):** [Cookie Clicker](../../open-loop-research/analyses/complete/cookie-clicker-analysis.md), [Candy Box](../../open-loop-research/analyses/complete/candy-box-analysis.md), [A Dark Room](../../open-loop-research/analyses/complete/a-dark-room-analysis.md) (Phase 1 only — the full game is a Phase-shifter instance), [Trimps](../../open-loop-research/analyses/complete/trimps-analysis.md), [Realm Grinder](../../open-loop-research/analyses/complete/realm-grinder-analysis.md), [Rusty's Retirement](../../open-loop-research/analyses/complete/rustys-retirement-analysis.md), [Chillquarium](../../open-loop-research/analyses/complete/chillquarium-analysis.md), [Tiny Pasture](../../open-loop-research/analyses/complete/tiny-pasture-analysis.md), [Chill with You](../../open-loop-research/analyses/complete/chill-with-you-lo-fi-story-analysis.md).

The first five are web-formation-era (2009–2015); the latter four are the 2024+ Steam resurgence cluster. The formation-era corpus established the pattern; the resurgence cluster confirms its contemporary viability.

---

## 1. Player experience

Ambient is the archetype the player does not play so much as *keep*. You open it once in the morning, glance at it while a pot boils, check it on the way back from a meeting, let it run at the edge of a monitor for an afternoon. Resources accumulate whether you are watching or not. Nothing expires. No wave is about to overrun your defenses. No cooldown queue is about to waste. The game has committed mechanically to never punishing absence — Loop 9 (Enemy Scaling) and strict Loop 14 (Cooldown urgency) are deliberately missing, not merely absent. What remains is Loop 2 (Idle Production) and Loop 7 (Auto-Production), a slowly unfolding unlock tree, and optional softened prestige. The player's relationship to the game is *companionship*, not engagement: the game lives on the desktop the way a plant lives on a desk.

A thirty-minute session is actually seven three-minute glances distributed across the day. Each glance yields accumulated output, one or two affordable purchases, and occasionally a new visual element revealed (a building appears, an animal wanders in, a zone quietly unlocks). The long-term pull is not mastery or compound growth — it is the pleasant, legible, ongoing state of the game: *my thing is running, it is happy, it grew while I was away.* The design commitment is 17 years old (Anti-Idle, 2009) and re-emerged on Steam desktop in 2024 (Rusty's Retirement) after a mobile-F2P dormancy gap that made the no-anxiety engagement model commercially unviable. Both formation and resurgence clusters validate the same underlying shape — what changes across eras is the visual budget, not the engagement contract.

---

## 2. Pattern composition

**Required patterns:**

- [Ambient Progression](../../open-loop-research/patterns/tier-3-moderate/ambient-progression.md) — the engagement-model commitment itself: no pressure loops, glance-check cadence, idle-visual-state as reward.
- [Activity Systems (auto-production variation)](../../open-loop-research/patterns/tier-0-universal/activity-systems/) — continuous passive production chain. Manual clicking is a bonus, not a requirement.
- [Progression Systems](../../open-loop-research/patterns/tier-0-universal/progression-systems.md) — unlock tree paces visible change across the 8–12h cumulative arc without imposing urgency.

**Cross-pattern properties engaged:**

- [Automation](../../open-loop-research/patterns/cross-pattern-properties/automation.md) — auto-production available early; load-bearing for the companion-software contract. Producer auto-buy ships as a canonical autobuyer module under `src/archetypes/ambient/modules/autobuyers/` with a master kill-switch + per-spec player toggle (the "Tending" button in the header). Visibility unlocks (`modules/unlocks.ts`) deliberately stay out of the registry — soft reveals fire unconditionally on threshold cross via `setupSweepAutoPurchase`, since the contract forbids player-pausable content reveals.
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

**Engine systems explicitly not used (required):** `createChallengeCategory` — challenge/combat surface would mechanize Loop 9 (Enemy Scaling) and strict Loop 14 (cooldown urgency); both are structurally incompatible with the no-anxiety engagement commitment. `createZoneSystem` / `createWorker` / `createInventory` — not forbidden, but their presence typically implies structural depth (spatial progression, worker assignment, inventory management) that pulls the cognitive-load budget above the Ambient ceiling. A fork that wires them must revalidate § 4 beat timing against § 6 probe tolerances. Exception for `createZoneSystem`: using it as a named-current-variant state machine for costume cycling (no spatial gating, no per-zone content, no picker UI) — as the skeleton's `modules/scene.ts` does — stays within the Ambient ceiling and does not trigger revalidation.

The absence is the contract. A reader inspecting an Ambient mod should see Loop 2 + Loop 7 + progression + optional softened reset, nothing else — and conclude the engine feels clean at ~25% surface use.

**Primary stress axes:**

1. **Offline-round-trip correctness.** Offline accumulation is the *mechanical prerequisite* for the engagement contract. If a 12-hour gap yields a different final resource value from 12 continuous hours of sim (beyond rounding), the contract is broken — the player returns to a game that "fell behind." Probe 3 exercises this at 4h / 12h / 24h gaps.
2. **Sparse-surface ergonomics.** Ambient exercises ~25% of the engine's systems surface. If writing an Ambient mod requires boilerplate from every layer or verbose category-options blocks, the engine has an ergonomics problem that Producer's analogous stress claim also surfaces.
3. **No-pressure invariant correctness.** The "explicitly not used" row is a *runtime* claim, not a documentation claim. Probe 5 asserts that no tick across a 24h sim causes resource cap-and-waste, negative state change, or a fail-state flag. Binary pass/fail. This is the archetype's signature probe and the one most likely to catch mod-author drift.

---

## 4. Data shape

Ambient's content lives under `src/archetypes/ambient/data/` as four flat typed-array exports (`producers.ts`, `unlocks.ts`, `achievements.ts`, `scene-variants.ts`) plus a `types.ts` that names the definition interfaces. Inline `requirement` callbacks colocate the mechanics with the definition — no separate effect tables, no codegen. Lens discipline is enforced by comment sections inside each data file (`// ─── Skeleton ───`, `// ─── Balance ───`, `// ─── Costume ───`): skeleton counts (tier-count, unlock-count, achievement-count, scene-variant-count) are a fork-of-skeleton decision; balance constants (cost growth, tier-cost ratios, base rates, multipliers, prestige threshold, offline cap) are the tuning surface sim tests probe; costumes (resource name, producer names, unlock labels, achievement labels, scene-variant labels, welcome-back template, end-of-arc message) are theme-scoped.

```ts
// data/types.ts — typed definitions

export interface AutoProducerDef {
  id: string;                      // stable; used as save key
  name: string;                    // display name (costume)
  baseRate: DecimalSource;         // per-second; all auto-producers are continuous
  purchase: {
    baseCost: DecimalSource;       // tier-1 first-unit cost
    costScaling: DecimalSource;    // per-purchase multiplier (default 1.08 — gentler than Producer)
  };
}

export interface UnlockDef {
  id: string;
  label: string;                   // display name (costume)
  description: string;
  /** Resource-total threshold gating this visibility flip. Soft reveal — non-blocking. */
  threshold: DecimalSource;
  /** What this unlock reveals. Discriminated by `kind`. */
  reveals:
    | { kind: 'producer'; producerId: string }
    | { kind: 'scene-variant'; variantId: string }
    | { kind: 'ui'; affordance: 'achievement-grid' | 'prestige' | 'welcome-back' };
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  hidden?: boolean;
  /** State-predicate — true when the trigger condition is met. */
  requirement: (state: AmbientGameState) => boolean;
  /**
   * When true, the predicate is evaluated at session-resume only (e.g.
   * "returned after 12h absence"), not on every tick. Default tick-time.
   */
  triggeredOnResume?: boolean;
  /** Headline multiplicative reward. Defaults to `balance.achievementMultiplier`. */
  rewardMultiplier?: DecimalSource;
}

export interface SceneVariantDef {
  id: string;                      // stable id; referenced by `UnlockDef.reveals` and modules/scene
  label: string;                   // display name (costume)
  /** Resource threshold gating variant unlock. Default variant has threshold 0. */
  threshold: DecimalSource;
  /** Rendering cue — paint the canvas differently. Per-fork visual contract. */
  visualKey: string;
}

export interface AmbientBalance {
  tier1BaseRate: DecimalSource;            // default 0.5 — per-second on the lowest tier
  producerCostGrowth: DecimalSource;       // default 1.08 — gentler than Producer's 1.15
  tierCostRatios: DecimalSource[];         // length = AUTO_PRODUCERS.length; inter-tier step multipliers
  achievementMultiplier: DecimalSource;    // default 1.02 — per-unlock headline contribution
  offlineEfficiency: DecimalSource;        // default 1.0 — full offline accumulation; 0.5 = half
  offlineCapHours: DecimalSource;          // default 12 — caps `processOfflineTime` window
  prestigeEnabled: boolean;                // default false — gates `modules/prestige.ts` registration
  prestigeMultiplierBase: DecimalSource;   // default 1.2 — only consulted when prestigeEnabled
  prestigeEligibleThreshold: DecimalSource;// resource threshold gating beat-7 closure
}

/**
 * Typed read view of module state, exposed to achievement predicates.
 * Methods encapsulate Decimal comparisons so `data/*.ts` never imports
 * the engine runtime.
 */
export interface AmbientGameState {
  primaryAtLeast: (amount: DecimalSource) => boolean;
  primaryLifetimeAtLeast: (amount: DecimalSource) => boolean;
  perSecondAtLeast: (amount: DecimalSource) => boolean;
  producerCountAtLeast: (id: string, count: number) => boolean;
  unlockVisible: (id: string) => boolean;
  sceneVariantUnlocked: (id: string) => boolean;
  ownsEveryProducer: () => boolean;
  /** Sim-clock seconds since the last `loadSave`/resume. Zero during a continuous session. */
  secondsSinceLastResume: () => number;
  /** Wall-clock seconds since the save was first created. Used by long-tail time-based achievements. */
  secondsSinceCreation: () => number;
}
```

**Override semantics:** `boot.ts` exports `createAmbientEngine(overrides?, options?)` that accepts a flat-category deep-partial — `{ producers?, unlocks?, achievements?, balance? }` — with per-entity replacement keyed by `id` and deep-merge over balance. Sim tests and balance scripts route through this factory. The addressable shape *is* the TypeScript type over the data; there is no synthetic vars layer and no codegen round-trip. `applyAmbientOverrides` throws on unknown ids so typos surface fast (mirror `applyProducerOverrides`). Scene-variant labels are pure costume and not addressable through the override surface — perturbing the Sensation payload requires editing the data file directly. `prestigeEnabled` lives on `balance` — toggling it gates `modules/prestige.ts` at engine-construction time, so default ships zero prestige code paths active.

---

## 5. Content sketch

- **Resources:** 1 primary accumulating currency (+1 prestige token if `prestigeEnabled`).
- **Producers / Activities:** 5 auto-producer tiers. Manual click affordance optional (theme-dependent); if present, clicks are a bonus, not required. Example naming (cozy-farm theme): planter, coop, pond, pasture, orchard.
- **Upgrades / Purchasables:** 12 visibility unlocks gating scene elements + UI affordances. Optional 4 global multiplier upgrades when `prestigeEnabled` (unlock in prestige tree).
- **Progression gates:** resource-threshold visibility unlocks — soft reveals, not hard blocks; player can ignore and progress continues. Prestige gate at beat 7 if enabled.
- **Achievements:** 20 — 10 milestone-count (own N of producer X, reach N/sec total rate), 10 time-based ("returned after 12h absence," "save persisted across a real-time week," "cumulative sim-time ≥ 1 day"). The time-based ones carry `triggeredOnResume?: boolean` and fire at session-resume rather than during ticks. All 20 are passive — no achievement requires the player to *do* anything specific at a specific moment.
- **Idle scene variants:** 6 named visual states — default + 5 unlocked at resource thresholds. Defined in `data/scene-variants.ts` as `SceneVariantDef[]`; revealed by `UnlockDef` entries with `reveals: { kind: 'scene-variant', variantId }`. These are the Sensation payload; a text-only theme supplies placeholder `visualKey` strings instead (see Theme D).

**Density target:** every beat in § 4 has ≥1 content entry mapped. Beat 1 → producer T1 + resource readout; beats 2–3 → producers[0..2] + first two visibility unlocks; beat 4 → welcome-back template + affordable-queue indicator; beat 5 → idle-scene-variant unlock + producer[mid]; beat 6 → achievement with passive multiplier; beat 7 → prestige affordance (if enabled) + end-of-arc flavour event + final idle-scene variant.

---

## 6. UI prescription

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

## 7. Predicted engine gaps

Zero correctness gaps predicted — engine posture is settled (see LIBRARY pattern § Engine Posture and the taxonomy's `§ 2G`). All entries below are low-severity ergonomics hypotheses the first Ambient-archetype fork will confirm or reject.

| Gap | Severity | Notes |
|-----|----------|-------|
| No declarative "no-pressure invariant" test helper | Low | Probe 5 is a hand-written analyzer combination (`resource-cap-waste`, `fail-state-flag`, `negative-delta`). If a second Ambient consumer writes the same assertion, graduate a `runAmbientAudit()` harness helper. Measure first. |
| Offline accumulation cap is hand-wired | Low | `balance.offlineCapHours` is consumed by game code today; engine's `processOfflineTime` exposes `maxOfflineSeconds` per call but no per-engine policy. If three archetypes (Ambient, Scaler, Producer) want the same semantics, graduate a `createOfflineAccumulator({ capHours })` helper on top of existing primitives. |
| Achievement-firing-on-resume detection | Low | Time-based achievements ("returned after 12h absence") fire at session-resume rather than during ticks. The first-consumer pattern is an optional `triggeredOnResume?: boolean` flag on `AchievementDef` — `modules/achievements.ts` walks resume-flagged predicates at session-resume, others tick-time. Engine-side `resume-analyzer` graduation deferred to ≥2-archetype convergence. |
| Idle-scene animation orchestration | Low (starter, not engine) | Vue-component concern; flagged for clarity. Not an engine gap. Belongs in `src/lib/` or game-side. |
| Persistent-strip shell primitive | Low (starter, not engine) | See § 9 declared-invention note. `TODO(expansion)` in the LIBRARY pattern; promote on ≥2 converging consumers. Not an engine gap. |

The one-line rule for this section: **if implementing an Ambient fork requires an engine change, the gap is severity `high` and this table must be updated.** Current hypothesis is that no such gap exists — the first implementation will validate or falsify this.

---

## 8. Themes

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
- **Engine primitives** → `open-loop-engine/docs/api/INDEX.md` (directory) + per-tier files (resources, mechanics, content, lifecycle, engine, advisors, spatial, harness)
- **Corpus games** → `open-loop-research/analyses/complete/*-analysis.md`
- **Layout shells** → `open-loop-starter/src/lib/shells/`
