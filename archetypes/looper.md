# Archetype: Looper

> **One-line identity:** Resource-gated Loop + Retention Policy + Two-tier Capability Mastery + Cursor-walked Plan with Prereq Web — the repetition-with-retention incremental.
>
> **Status:** `canonical`

**Exemplars (validation, not clone targets):** [Idle Loops](../../open-loop-research/analyses/complete/idle-loops-analysis.md), [Omsi Loops](../../open-loop-research/analyses/complete/omsi-loops-analysis.md), [Increlution](../../open-loop-research/analyses/complete/increlution-analysis.md), [Cavernous II](../../open-loop-research/analyses/complete/cavernous-ii-analysis.md), [Progress Knight 2](../../open-loop-research/analyses/complete/progress-knight-2-analysis.md).

**Live consumer references (engine-usage grounding):** `/work/studio/idle-loops-ng/` — composition ported from the Idle Loops mod lineage (vanilla → OMSI → Lloyd → Squirrel), demonstrates dual-queue active/edit planning and layered mod-content composition. `/work/studio/incloneution/` — decompiled from Increlution, demonstrates single-queue auto-repeat, gen/instinct dual-tier XP, manual reincarnation trigger. Both cite-worthy for "how a Looper actually wires up."

---

## 1. Player experience

Looper is the archetype where *a run feels like a rehearsal*. You queue up a sequence of actions inside a strictly limited time budget (a mana pool, a health bar, a countdown), watch the budget drain as each action ticks, and when it's gone the run ends — most of what you built resets, and a thin layer of permanent mastery carries to the next run. The compulsion loop is: *"next run I'll do it faster and further,"* and over six or eight runs you start doing things you couldn't even reach on run one.

A thirty-minute session is a sequence of queue edits. You notice a skill that's now underpowered, or a new zone you can just barely reach, and reorder your plan accordingly. Between runs you are never idle — you're looking at the queue, at the skill readouts, at the retention track, deciding what run N+1 buys you that run N didn't. The long-term pull is *compounded efficiency*: a first-run player takes ten minutes to reach the second zone; an experienced player reaches it in thirty seconds and spends the remaining mana somewhere deeper. The game is the diff between those two runs.

---

## 2. Pattern composition

**Required patterns:**

- [Loop/Cycle Systems](../../open-loop-research/patterns/tier-4-specialized/loop-mechanics/) — the headline system. Canonical Variation B (resource-gated, mana-as-time) and Variation C (death-triggered) are Looper-signature; Variation D (manual/hybrid) appears in Cavernous II and Increlution.
- [Mastery Systems](../../open-loop-research/patterns/tier-3-moderate/mastery-systems.md) — cross-reset accumulator mode is non-negotiable. Every canonical Looper has a retention track (soulstones, instinct, talents) that persists across every reset tier.
- [Activity Systems (Variation B — Duration-Based)](../../open-loop-research/patterns/tier-0-universal/activity-systems/variations/) — the action substrate. Sequences of timed actions, each reducing the time budget, each granting XP.
- [Progression Systems](../../open-loop-research/patterns/tier-0-universal/progression-systems.md) — zone-gated content reveal; automation-tier unlocks; sometimes a prestige layer on top.

**Cross-pattern properties engaged:**

- [Automation](../../open-loop-research/patterns/cross-pattern-properties/automation.md) — auto-repeat action queues, unlock-gated automation tiers, fill strategies for idle workers.
- [Modifier Chains](../../open-loop-research/patterns/cross-pattern-properties/modifier-chains.md) — skill-level cost divisors, retention-curve bonuses, cross-skill synergies; multiplicative + sequential composition.
- [Quantity Tracking](../../open-loop-research/patterns/cross-pattern-properties/quantity-tracking.md) — per-action completion counts drive mastery thresholds and quantity-scaled bonuses.
- [Unlock Requirements](../../open-loop-research/patterns/cross-pattern-properties/unlock-requirements.md) — skill-level gates, zone-completion gates, action-count gates.

**Optional modifiers (fork may add):**

- **Prestige layer on top** — 100% of analyzed Loopers hybridize with prestige. Progress Knight 2's 5-layer soulstones is the heaviest example; Idle Loops opts out in favour of mastery-only retention. Either is viable.
- **Challenge Systems** — game-overrides registry pattern (see idle-loops-ng `game-overrides.ts`) allows challenge modes to shadow defaults at runtime.
- **Affected-by system** — actions whose bonuses scale with *other* action levels (idle-loops-ng `affected-by.ts`). A cross-action bonus mechanism not in the engine but reached for by at least one Looper consumer.
- **Tier-3+ extension** — Foundation ships two-tier (Level resets per loop, reduces cost; Talent persists, multiplies XP rate). Forks layer tier-3 on the canonical role split: idle-loops-ng ships soulstones; PK-2 ships multi-layer soulstones; Increlution ships reincarnation prestige.

**Novel-patterns cluster alignment:**

- **Cluster #2 (Mastery & Specialisation Architecture)** — Looper *requires* this cluster; it is the component that makes the loop worth repeating.
- **Cluster #1 (Programming-as-Gameplay)** — adjacent but distinct. Looper's queue is drag-drop/visual; the Scripter archetype covers code-as-gameplay. An action queue is not a program, even when it's programmable-feeling.
- **Cluster #5 (Time Management & Resource Constraints)** — Variation B Loopers use mana-as-time directly; Cluster #5 describes the constraint flavour.

---

## 3. Engine surface

| Layer | Primitive | Role in this archetype |
|-------|-----------|------------------------|
| core | `createResource` | Time-budget resource (mana, ticks-denominated) and gold currency (per-loop). |
| core | `createSequencer` | Cursor-walked plan via `mode: 'list'` — items persist across cursor advances; per-item `loopsLeft` decrements, `resetCursor()` is the restart hook. |
| core | `createTimeSystem` | Sim-time tracking (`elapsed` since `time.reset`, cumulative `totalPlayTime`); loop's own `loop.elapsed` covers within-loop time. |
| core | `createOverrideRegistry` + `tunable` | Balance-solver scope — `pushScope(...)` retunes `balance/initialMana`, `balance/costDivisor`, `balance/talentAccrualRatio`, `actions/<id>/manaCost` without rebooting. |
| core | `Formula` | XP-curve composition (vanilla canonical `floor(sqrt(xp)/2)` for both Level and Talent). |
| core | `persistent` / `withPersistentContext` | Per-action / per-progressVar / per-regularVar state scoping; save layout stable as defs are added. |
| core | `runHeadless` / `runUntil` | Beat-window verification in the balance lane (`balance/probes.ts`); never invoked from vitest suites. |
| systems | `createSkillCategory` | Used twice — `looper/capabilities` for two-tier Level + Talent capability XP, `looper/progress-vars` for persistent exploration tracks. Modifier-chain composition is internal to the category; raw `createModifierChain` is unused at this layer. |
| systems | `createSkill` | Talent tier of each capability, built inside `mapState` of the capability category. |
| systems | `createLoop` | Reset orchestration — `endCondition`, `thingsToReset`, `onBeforeRestart`, `onRestart`. |
| systems | `createRetentionPolicy` | Carries Talent XP, action `timesCompleted`, progressVar XP, and regularVar `total` (derived persistent) across the loop reset. NOT a cost-reduction curve. |
| systems | `createZoneSystem` | UI grouping only — registration-ordered ranking + `current`/`select(id)` for action-drawer tab focus. Does NOT gate content; per-action `prereqs` handle visibility. |
| harness | `runMatrix` | Probe robustness across vars space (used by `balance/solve.ts` Gauss-Seidel bisection). |

**Engine systems explicitly not used (required):**

- `createProducerCategory` / `createScalingPurchasable` — Loopers express production through actions, not producers. If you reach for producer-category in a Looper, you're building Producer or Interlocker, not Looper.
- `createAchievementCategory` — achievements are optional in Looper; the retention policy and arc-closure latch are the progression rewards. Forks may add them as a cosmetic layer.
- `createPurchasableCategory` — Looper shops are rare (Omsi has one); when present they're a specific optional modifier, not part of the skeleton.
- `createModifierChain` / `createMultiplicativeModifier` / `createSequentialModifier` (raw, outside `xCategorySystem`) — capability and progress-var categories carry modifier-chain machinery internally. Forks layering richer cross-skill bonus composition reach for the raw chain primitives at that point.
- `createCompositeStrategy` — automation strategies are fork-extension territory; the slim demo's auto-repeat / pause-on-empty-plan is queue-internal, not a strategy fill.

**Primary stress axes:**

1. **Reset correctness.** The loop must zero per-loop refs (capability Level XP, action progress, mana, manaAdded, regularVar `checked`/`good`, gold, queue cursor + per-item `loopsLeft`), preserve persistent refs (capability Talent XP, action `timesCompleted`, progressVar XP, regularVar `total` derived state, queue plan, settings toggles), and survive hundreds of repeated resets without state drift. Snapshot/restore via `createRetentionPolicy` is the engine path.
2. **Queue re-planning UX.** Players edit the cursor-walked plan mid-run, between runs, and via saved loadouts. Sequencer reactivity must hold up under mutation; consumer-side `queueVersion` counter is the current Vue-reactivity workaround (see § 10).
3. **Cross-loop perceptibility — two axes.** The compounding rests on two distinct cross-loop signals: **(a)** persistent-progress → manapot pool → mana-pool extension (medium-pace; the manapot frame); **(b)** Talent → Level XP rate multiplier → cost reduction (slow-pace; the canonical role-split). Both must be perceptible by the windows fixed in § 4. Two probes in § 6 cover them distinctly.
4. **Zone-scoped content queries.** "Show only actions in current zone" is manual filtering at the consumer; engine has no helper. With zones being UI grouping only, the filter is naive — if three Loopers re-derive it, it graduates.

---

## 4. Beat map

The 2h arc anchors Looper's "visible compounding within a session" identity. Forks extending past ~3h or compressing below ~45min are reshaping, not retuning.

The 250-tick `initialMana` baseline at engine 20 TPS gives a fresh first loop ~12.5 sim-seconds of budget. Loops genuinely extend over time as **persistent exploration progress** (the manapot frame — § 5 / § 8) grows the per-loop mana-pool capacity, and **Talent** (slow-ramp XP rate multiplier) compounds Level training across loops. The arc rests on these two cross-loop axes plus the within-loop axis (capability Level → cost reduction during the current loop).

Automation has **no beat** in this archetype: queue auto-dispatch, plan-survives-reset, and pause-on-empty-plan are baked-in queue substrate from boot, not progression milestones. Forks extending into automation-tier territory (priority strategies, fill rules, auto-restart conditions) author their own beats on top of the canonical eight.

| # | Beat | Target sim-time | Trigger condition | Player-visible signal | Why it matters |
|---|------|-----------------|-------------------|------------------------|-----------------|
| 1 | First action ticking, mana visibly draining | 0:00–0:10 | `queue.current !== null` AND `mana < initialMana` | Action progress bar advances; mana gauge ticks down | Onboarding — confirms the core "actions cost time" feedback |
| 2 | First loop ends | 0:10–0:45 | `loopCount >= 1` | Reset flash; queue plan re-readies; capability Talent XP shows tiny non-zero | Introduces the reset cadence — Level XP cleared, Talent XP carries, plan survives |
| 3 | First persistent-progress tick | 0:30–2:00 | any progressVar `level >= 1` (e.g., 1% Roam) | Progress readout ticks past first whole percent; first regularVar pool unlocks (e.g., first cache available to crack) | Persistent track introduced — the cross-loop accumulator that drives manapot pool sizing |
| 4 | First manapot harvest | 1:00–4:00 | first "good" hit on a regular-pool action grants mana (every Nth check, vanilla `rewardRatio: 10`) | Mana pool extends mid-loop; gauge climbs above `initialMana`; `manaAdded` readout updates | The canonical mid-loop budget extension — turns the 12.5s fresh loop into a habitable arc |
| 5 | First gold→mana exchange used | 3:00–10:00 | basic exchange action completes with `gold > 0` consumed | Gold readout zeroes; mana extends in one burst rather than per-completion drip | Secondary budget-extension axis — gold accumulator from regular pool, basic action converts to mana |
| 6 | First Talent multiplier perceptible | 25:00–55:00 | any capability `talent.level >= 1` AND loop N+1's first-N actions complete in fewer ticks than loop N | Talent readout shows `1.20×` multiplier; same plan visibly faster across the reset | The slow-ramp cross-loop axis — the canonical role-split payoff (Talent → faster Level → cheaper actions) |
| 7 | Second zone content visible | 30:00–60:00 | cross-zone prereq satisfied (action-completion-count or progressVar level on a zone-1 action) | Zone-2 tab in the action drawer populates; first zone-2 action enters the visible set | Spatial expansion — content reveal through cumulative cross-loop work |
| 8 | Arc closure: multi-axis compounding visible | 60:00–120:00 | `loop.count >= 5` AND `avgTalentMult > 1.05` AND second zone reached | End-of-arc flavour event fires; both compounding axes (manapot pool + Talent multiplier) at meaningful levels | The 1–2h showcase closure. Fork extends beyond here; skeleton stops |

**Arc closure beat:** #8.

Beat ordering note: beats 6 (Talent perceptible) and 7 (zone-2 visible) cluster in the 25–60 min mid-late zone; the canonical ordering puts Talent perceptibility a touch earlier than zone-2 unlock. Player plan focus determines per-run ordering — Talent-grinder hits 6 first; explore-grinder hits 7 first. The windows above are **suggested initial targets**; the balance leaf's solver iterates within the arc-budget envelope.

---

## 5. Data shape

Per the data-first archetype convention (`open-loop-starter/CLAUDE.md` § Archetype convention), the demo's content lives flat in `src/archetypes/looper/data/*.ts` as plain typed arrays + balance constants. The skeleton/theme/balance lens lives as comment sections (`// ─── Skeleton ───`, `// ─── Balance ───`, `// ─── Costume ───`) inside each data file, not as a parallel filesystem layer. Mechanical fields and theme strings are co-located per def. No `vars/` extraction layer, no codegen round-trip.

> **Implementation status.** The rebuilt code shipped in OL-743/744 carries the **Capabilities + cursor-walked queue + loop + Talent retention** half of the canonical shape. The **manapot frame, gold currency, gold↔mana exchange, persistent progressVars, regularVar pools, zone consolidation (4 → 2 zones), and the discriminated `ActionDef` union** described below are the canonical shape the next code leaf will land alongside the data-shape evolution. The doc is forward-canonical; § 8 marks which content is currently encoded vs. pending.

### Drain semantics

Mana drains `round(tickRate × dt)` per engine tick — at 20 TPS that's 1 mana per tick, the canonical "1 mana = 1 tick" coupling that makes `manaCost` directly comparable to the pool. Drain is gated on `loop.running` (`modules/loop.ts:141-147`): an empty queue with the loop paused (boot, post-restart) does NOT drain mana.

The loop is **paused at boot** (no auto-`run()`). The first `enqueue` triggers the queue's `'start'` event; the loop module's connect-phase subscription flips `loop.running` true. After a restart that lands on an empty plan, the loop pauses again until the next enqueue.

Per-loop budget: `INITIAL_MANA + manaAdded`, where `manaAdded` accumulates from action completions that grant mana (manapot harvests via regular-action `rewardEffects`, gold→mana exchanges via basic-action `completionEffects`). Both `mana` and `manaAdded` reset on `onRestart`; mana does NOT compound across loops — cross-loop persistence is on capabilities (Talent), progressVars, regularVar `total` (derived), and action `timesCompleted`.

### Queue-as-plan (cursor-walked, not pop-on-complete)

The queue is a **persistent plan**, not a FIFO. Items are NOT consumed on completion; a cursor walks through them, and the plan survives the loop reset. Per-item `loopsLeft` decrements per execution, the cursor advances when it hits zero, and `resetForLoop()` on loop end restores per-item `loopsLeft → loops` and resets the cursor → 0. Vanilla idle-loops shape (`actions.js:135-148`) implemented via `createSequencer({ id: 'looper/queue', mode: 'list' })`; `resetCursor()` is the restart hook.

Without this, the entire compulsion-loop premise ("optimize the sequence over runs") collapses — the sequence has to *survive* the run for the player to refine it.

The "Repeat Last Action" toggle (vanilla `actions.js:137-147` canonical UX) extends the last item by one when the cursor would walk off the end. Default off; persistent ref in the queue module.

### File split

| File | What it owns |
|---|---|
| `data/types.ts` | All `*Def` interfaces, the `LooperBalance` constants shape, the `LooperGameState` typed read-view interface, the `LooperData` barrel type. |
| `data/capabilities.ts` | `CAPABILITIES: CapabilityDef[]` — single-axis registry (4 caps: Vigor / Aether / Craft / Lore). Module-side `mapState` pairs each with a Talent tier (different role from Level). |
| `data/progress-vars.ts` | `PROGRESS_VARS: ProgressVarDef[]` — 4 persistent exploration tracks (2 per zone). Each carries a `scales` table — which regularVars its level-up callback re-totals, by what `perLevel` factor. |
| `data/regular-vars.ts` | `REGULAR_VARS: RegularVarDef[]` — per-loop pools sized via progressVar level-up (e.g., cache pool `total` = `roam.level × 5`). `total` is persistent (derived); per-loop `checked`/`good` clear via `thingsToReset`. |
| `data/zones.ts` | `ZONES: ZoneDef[]` — 2 zones (Hearth + Wilds), UI grouping only. No `requires` field — per-action `prereqs` handle gating. |
| `data/actions.ts` | `ACTIONS: ActionDef[]` — discriminated union (`type: 'progress' \| 'regular' \| 'basic'`). Each action carries `zoneId`, `manaCost` (ticks), `expMult`, `weights` (capability XP map), per-type fields, optional `prereqs` + `canStart`. |
| `data/balance.ts` | `LOOPER_BALANCE: LooperBalance` — solver-bisect targets. |
| `data/index.ts` | `DEFAULT_LOOPER_DATA` barrel + per-file re-exports. |
| `data/overrides.ts` | `LooperOverrides` flat-category override shape + `applyLooperOverrides(base, overrides)` (throws on unknown id; mirrors `applyProducerOverrides` / `applyAmbientOverrides`). |

### Definition shapes (TS-signature reference)

The interfaces below describe the canonical demo's data shape. Forks restructure freely as long as the layering rule (`data → modules → composables → ui`) and the engine-runtime-free invariant on `data/*.ts` are preserved.

```ts
// data/types.ts (illustrative)

export interface CapabilityDef {
  id: string;            // 'vigor' | 'aether' | 'craft' | 'lore'
  name: string;
  description: string;
}

export interface ZoneDef {
  id: string;            // 'hearth' | 'wilds'
  name: string;
  description: string;
}

/**
 * Persistent exploration track — Wander-shape. Survives the loop reset
 * (kept by the retention policy). Each level-up emits a callback that
 * re-totals one or more regularVars (the manapot frame's load-bearing
 * coupling). Reuses `createSkillCategory` engine primitive — same surface
 * as capabilities, different role.
 */
export interface ProgressVarDef {
  id: string;            // 'roam' | 'acquaint' | 'trail' | 'mark'
  name: string;
  description: string;
  zoneId: string;
  /** XP added per completion of any progress-type action targeting this var. */
  expMult: DecimalSource;
  /**
   * Level-up scaling table — which regularVars' totals re-derive on each
   * level gain, and by what additive contribution. Sums when multiple
   * progressVars contribute to the same regularVar (multi-axis scaling).
   */
  scales: Array<{
    regularVarId: string;
    /** Additive contribution = `level × perLevel`. Composes via sum across progressVars. */
    perLevel: DecimalSource;
  }>;
}

/**
 * Per-loop pool with persistent-derived total. `total` is set by progressVar
 * level-up callbacks (sum of all contributing `level × perLevel`); persists
 * across loops as a cached derived value. `checked` and `good` are per-loop
 * counters in `thingsToReset`.
 */
export interface RegularVarDef {
  id: string;            // 'cache' | 'latch' | 'errand' | 'wellspring' | 'forage'
  name: string;
  description: string;
  zoneId: string;
}

export type ActionPrereq =
  | { kind: 'action-completion-count'; actionId: string; value: number }
  | {
      kind: 'capability-tier-level';
      capabilityId: string;
      tier: 'level' | 'talent';
      value: number;
    }
  | { kind: 'progress-var-level'; progressVarId: string; value: number }
  | { kind: 'loop-count'; value: number }
  | { kind: 'always' };

interface ActionDefBase {
  id: string;
  name: string;
  description: string;
  zoneId: string;
  /**
   * Base cost denominated in ticks (1 mana = 1 tick). Adjusted at dispatch:
   *
   * ```
   * costMult = Σ(weights) weight / (1 + level / costDivisor)
   * adjustedTicks = ceil(manaCost × costMult)
   * ```
   */
  manaCost: DecimalSource;
  expMult: DecimalSource;
  /**
   * Capability weight map. Same weight controls capability XP gain AND cost
   * contribution. Per canonical (idle-loops-ng `action-formulas.ts:48-61`):
   *
   * ```
   * adjustedExp = expMult × (manaCost / adjustedTicks)
   * for each (capabilityId, weight) in weights:
   *   xpGain = weight × adjustedExp × talentMult(capabilityId)
   *   level.addXp(xpGain)
   *   talent.addXp(xpGain × talentAccrualRatio)
   * ```
   */
  weights: Record<string, DecimalSource>;
  prereqs?: ActionPrereq[];
  canStart?: (state: LooperGameState) => boolean;
}

/**
 * Discriminated action-type union. `type` controls the secondary effect on
 * completion; the capability-XP path is identical across types via `weights`.
 *
 * - `progress` — adds XP to a persistent progressVar (Wander-shape). Drives
 *   long-term content unlock + manapot pool sizing via the progressVar's
 *   level-up callback.
 *
 * - `regular` — checks one item against a per-loop pool (`regularVarId`).
 *   Every `rewardRatio`th check fires `rewardEffects` (typically `add-mana`
 *   or `add-gold`). Pool size derives from progressVar levels.
 *
 * - `basic` — applies `completionEffects` immediately on completion (one-shot
 *   resource manipulation: gold-spend → add-mana, gold-add, etc.). The
 *   gold↔mana exchange is the canonical basic-type frame.
 *
 * The trio is a labelling convention over existing engine primitives — no
 * new engine surface; modules wire each type's secondary path internally.
 */
export type ActionDef =
  | (ActionDefBase & { type: 'progress'; progressVarId: string })
  | (ActionDefBase & {
      type: 'regular';
      regularVarId: string;
      /** Every Nth check fires rewardEffects (idle-loops `rewardRatio`, vanilla 10). */
      rewardRatio: number;
      rewardEffects: RewardEffect[];
    })
  | (ActionDefBase & {
      type: 'basic';
      /** Optional. Applied on completion. Gold-spend → mana, gold-add, etc. */
      completionEffects?: CompletionEffect[];
    });

export type RewardEffect =
  | { kind: 'add-mana'; amount: DecimalSource }
  | { kind: 'add-gold'; amount: DecimalSource };

export type CompletionEffect =
  | { kind: 'add-mana'; amount: DecimalSource | ((state: LooperGameState) => DecimalSource) }
  | { kind: 'add-gold'; amount: DecimalSource }
  | { kind: 'spend-gold'; amount: DecimalSource | 'all' };

export interface LooperBalance {
  /** Mana pool size at loop start, denominated in ticks. Vanilla canonical 250 (~12.5s @ 20 TPS). */
  initialMana: DecimalSource;
  /** Cost-reduction divisor on capability Level. Vanilla canonical 100. */
  costDivisor: DecimalSource;
  /** Fraction of every Level XP gain that accrues to Talent XP. Vanilla canonical 0.01 (1%). */
  talentAccrualRatio: DecimalSource;
  /** Default true — the loop reset *is* the retention/prestige tier; toggling off makes the demo a one-loop game. */
  loopResetEnabled: boolean;
}
```

### Typed read view (predicate interface)

Per-action `prereqs` and `canStart` gates close over a `LooperGameState` typed-read-view. The interface is implemented by modules over live injection-key refs; `data/*.ts` never imports the engine runtime.

```ts
export interface LooperGameState {
  manaAtLeast(amount: DecimalSource): boolean;
  goldAtLeast(amount: DecimalSource): boolean;
  capabilityLevelAtLeast(capabilityId: string, tier: 'level' | 'talent', n: number): boolean;
  progressVarLevelAtLeast(progressVarId: string, n: number): boolean;
  actionCompletedAtLeast(actionId: string, count: number): boolean;
  loopCountAtLeast(n: number): boolean;
}
```

### Override surface

`createLooperEngine(overrides?)` accepts a flat-category `LooperOverrides`:

```ts
export interface LooperOverrides {
  capabilities?: Array<Partial<CapabilityDef>  & { id: string }>;
  zones?:        Array<Partial<ZoneDef>        & { id: string }>;
  progressVars?: Array<Partial<ProgressVarDef> & { id: string }>;
  regularVars?:  Array<Partial<RegularVarDef>  & { id: string }>;
  actions?:      Array<Partial<ActionDef>      & { id: string }>;
  balance?:      Partial<LooperBalance>;
}
```

`applyLooperOverrides` deep-merges `balance` and id-merges the array categories; unknown ids throw. Tunable balance constants and per-action `manaCost` knobs are wrapped via `tunable()` at consumer sites — push-scope keys: `balance/initialMana`, `balance/costDivisor`, `balance/talentAccrualRatio`, `actions/<id>/manaCost`.

### Mechanical-vs-costume separation

What's mechanical and lives in `data/balance.ts`: `initialMana`, `costDivisor`, `talentAccrualRatio`, `loopResetEnabled`. Per-progressVar `expMult` and `scales` table (the manapot coupling shape) are mechanical and live in `data/progress-vars.ts`. Per-action `manaCost`, `expMult`, `weights`, `rewardRatio`, and `rewardEffects` / `completionEffects` payloads are mechanical and live inline per def. What's costume: action / zone / progressVar / regularVar / capability `name` and `description`, the time-resource displayName ("mana"), the loop-completion verb ("reset"), the end-of-arc flavour string. Forks that want a different mood swap costume strings without touching anything else; forks reshaping the archetype touch balance constants, progressVar `scales` shapes, and possibly cardinality.

---

## 6. Balance probes

The Locator column splits the probe table per the Tier-A scaffold convention (`open-loop-starter/archetypes/BALANCING.md` § Scripts discover, tests lock + § Engine as oracle): math-only locks live in `sim/balance.probe.test.ts` (vitest, milliseconds, no `runHeadless`); sim-driven probes live in `balance/probes.ts` (vite-node script, tens of seconds, drives the engine through `runUntil`/`runMatrix`). Solver bisections themselves live in `balance/solve.ts` and don't appear in the probe table — they're the discovery tool, not a regression.

| Probe | Perturbation | Target beat(s) | Tolerance | Locator | Rationale |
|-------|--------------|----------------|-----------|---------|-----------|
| `initial-mana-baseline` | `balance.initialMana` ×[0.80, 1.20] | 1, 2 | Beat sim-time ±25% | `balance/solve.ts` (B2 bisect target) + `sim/balance.probe.test.ts` (math receipt) | Fresh-loop budget is the dominant onboarding-pacing lever — 250 ticks @ 20 TPS sets every fresh-loop ceiling. |
| `manapot-perceptibility` | `progressVars/<id>/scales[regularVarId].perLevel` ×[0.75, 1.25] | 3, 4 | Loop N+M's per-loop `manaAdded` ≥ X% larger than loop N's after M loops at canonical plan | `balance/probes.ts` (sim-driven; spans reset boundaries) | The manapot frame's load-bearing perceptibility — persistent-progress → mana-pool extension is the medium-pace cross-loop axis. Sim-shaped because pool growth requires reset boundaries to traverse. |
| `cost-reduction-perceptibility` | `balance.talentAccrualRatio` ×[0.5, 2.0] | 6 | Once any capability `talent.level >= 1`: loop N+1's first-N actions complete in fewer sim-ticks than loop N | `balance/probes.ts` (sim-driven; spans reset boundaries) | Per task §6 framing: the canonical role-separated tier perceptibility — Talent → faster Level → cheaper actions, the slow-pace cross-loop axis. |
| `gold-mana-exchange-correctness` | `weights` and `completionEffects.amount` formulas across the gold accumulator + the basic gold-spend exchange | 5 | Algebraic equality: `manaAdded = goldSpent × exchangeRate` per completion of the basic exchange | `sim/balance.probe.test.ts` (math) | Algebraic correctness of the gold↔mana coupling — the exchange path doesn't go through sim, it's a closed-form receipt. |
| `loop-reset-correctness` | run 5 consecutive loops; assert per-loop refs zero and persistent refs survive (Talent XP, progressVar XP, action `timesCompleted`, regularVar `total`, queue plan, `repeatLastAction` toggle) | every loop | Zero state drift over ≥5 loops | `balance/probes.ts` (sim-driven) | Structural reset invariant — `createLoop` + `createRetentionPolicy` must produce identical observable behaviour across resets. Sim-shaped because it spans reset boundaries. |
| `prereq-graph-shape` | enumerate all action prereqs | — (invariant) | All four `ActionPrereq` variants exercised; every reference resolves to a defined id | `sim/balance.probe.test.ts` (math) | Prereq-web sanity — typo-class regression catch. |
| `content-cardinality` | enumerate the data layer | — (invariant) | 2 zones, 4 progressVars (2 per zone), 4 capabilities, ≥5 regularVars, ≥1 action per capability per zone, ≥1 progress-type action per progressVar, ≥1 regular-type action per regularVar, ≥1 basic-type exchange action | `sim/balance.probe.test.ts` (math) | Content-cardinality minimum — keeps the demo from drifting below its frame-coverage floor. |

**Minimum probe count:** 7 (well above the ≥4 requirement). The two cross-loop perceptibility probes (`manapot-perceptibility` + `cost-reduction-perceptibility`) cover the two compounding axes distinctly — collapsing them would lose the ability to attribute pacing failures to the right axis.

**Probe-scope note for the balance leaf.** `manapot-perceptibility`, `cost-reduction-perceptibility`, and `loop-reset-correctness` are sim-driven — all three span reset boundaries and can't be expressed as math-only receipts. Math-only `sim/balance.probe.test.ts` pins the solver-converged constants (`initialMana`, `costDivisor`, `talentAccrualRatio`), the algebraic exchange identity, the prereq graph shape, and the content cardinality. Sim-driven `balance/probes.ts` runs the three reset-spanning probes as scripts; failures surface contract breakage.

---

## 7. Sim assertions

The vitest suite under `src/archetypes/looper/sim/` never calls `runHeadless` / `runUntil` / `runMatrix`. Beat verification — anything that requires running the engine forward through real sim-time — lives in the balance lane (`src/archetypes/looper/balance/`). Vitest holds two suites:

- `looper.sim.test.ts` — 8 beats as `it.todo()`. Each carries the beat id and target window from § 4, naming the predicate the balance lane verifies. The rebuild leaf ships `it.todo()`; the balance leaf converts to bisect-against-windows where window-driven verification fits.
- `balance.probe.test.ts` — math-only regression locks. Receipts on solver-converged knobs, structural invariants (prereq graph shape, content cardinality, action-type coverage), and the gold↔mana exchange algebra. Imports `DEFAULT_LOOPER_DATA` and asserts numeric / structural equality. Runs in milliseconds.

Sim-driven probes (`balance/probes.ts`) and the solver (`balance/solve.ts`) sit alongside, run via `pnpm balance:probes:looper` / `pnpm balance:solve:looper`. They drive the engine through `runUntil` and report findings; they don't run inside vitest.

### Vitest beat suite (illustrative)

```ts
// src/archetypes/looper/sim/looper.sim.test.ts
import { describe, it } from 'vitest';

describe('looper — beat map', () => {
  it.todo('beat 1: first action ticks and mana drains within 0–10 s');
  it.todo('beat 2: first loop ends within 10–45 s');
  it.todo('beat 3: first persistent-progress tick within 30 s – 2 min');
  it.todo('beat 4: first manapot harvest within 1–4 min');
  it.todo('beat 5: first gold→mana exchange used within 3–10 min');
  it.todo('beat 6: first Talent multiplier perceptible within 25–55 min');
  it.todo('beat 7: second zone content visible within 30–60 min');
  it.todo('beat 8: arc closure (multi-axis compounding visible) within 60–120 min');
});
```

### Math-only regression locks (illustrative)

```ts
// src/archetypes/looper/sim/balance.probe.test.ts
import { describe, it, expect } from 'vitest';
import { DEFAULT_LOOPER_DATA } from '../data';

const { balance, actions, zones, capabilities, progressVars, regularVars } = DEFAULT_LOOPER_DATA;

describe('balance probe — solver-knob receipts', () => {
  it('initialMana matches vanilla canonical 250-tick baseline', () => {
    expect(Number(balance.initialMana)).toBe(250);
  });

  it('costDivisor held at vanilla canonical 100', () => {
    expect(Number(balance.costDivisor)).toBe(100);
  });

  it('talentAccrualRatio held at 0.01 — vanilla canonical (1% Level → Talent)', () => {
    expect(Number(balance.talentAccrualRatio)).toBe(0.01);
  });

  it('loopResetEnabled defaults true', () => {
    expect(balance.loopResetEnabled).toBe(true);
  });
});

describe('balance probe — content cardinality minimums', () => {
  it('capability registry locked at 4 (single-axis canonical)', () => {
    expect(capabilities.length).toBe(4);
  });

  it('zone count locked at 2 (Hearth + Wilds — UI grouping only)', () => {
    expect(zones.length).toBe(2);
  });

  it('progressVar registry: 4 total, 2 per zone', () => {
    expect(progressVars.length).toBe(4);
    for (const zone of zones) {
      const inZone = progressVars.filter((p) => p.zoneId === zone.id);
      expect(inZone.length).toBe(2);
    }
  });

  it('regularVar registry: ≥1 per progressVar (some shared via multi-axis scaling)', () => {
    expect(regularVars.length).toBeGreaterThanOrEqual(progressVars.length);
  });

  it('action set covers every capability via `weights` at least once', () => {
    const capIds = new Set(capabilities.map((c) => c.id));
    const weighted = new Set(actions.flatMap((a) => Object.keys(a.weights)));
    for (const id of capIds) expect(weighted.has(id)).toBe(true);
  });

  it('every action-type variant is exercised', () => {
    const types = new Set(actions.map((a) => a.type));
    expect(types.has('progress')).toBe(true);
    expect(types.has('regular')).toBe(true);
    expect(types.has('basic')).toBe(true);
  });

  it('every progressVar has ≥1 progress-type action targeting it', () => {
    const targeted = new Set(
      actions.filter((a) => a.type === 'progress').map((a) => a.progressVarId),
    );
    for (const pv of progressVars) expect(targeted.has(pv.id)).toBe(true);
  });

  it('every regularVar has ≥1 regular-type action checking against it', () => {
    const checked = new Set(
      actions.filter((a) => a.type === 'regular').map((a) => a.regularVarId),
    );
    for (const rv of regularVars) expect(checked.has(rv.id)).toBe(true);
  });

  it('manapot frame: ≥1 regular action grants mana via rewardEffects', () => {
    const manaGranters = actions.filter(
      (a) => a.type === 'regular' && a.rewardEffects.some((e) => e.kind === 'add-mana'),
    );
    expect(manaGranters.length).toBeGreaterThanOrEqual(1);
  });

  it('gold↔mana exchange frame: ≥1 regular action grants gold AND ≥1 basic action spends gold for mana', () => {
    const goldGranters = actions.filter(
      (a) => a.type === 'regular' && a.rewardEffects.some((e) => e.kind === 'add-gold'),
    );
    const goldSpenders = actions.filter(
      (a) =>
        a.type === 'basic' &&
        a.completionEffects?.some((e) => e.kind === 'spend-gold') &&
        a.completionEffects?.some((e) => e.kind === 'add-mana'),
    );
    expect(goldGranters.length).toBeGreaterThanOrEqual(1);
    expect(goldSpenders.length).toBeGreaterThanOrEqual(1);
  });
});

describe('balance probe — prereq graph shape', () => {
  it('exercises all four ActionPrereq variants across the action set', () => {
    const variants = new Set<string>();
    for (const action of actions) {
      if (!action.prereqs) {
        variants.add('always-implicit');
        continue;
      }
      for (const prereq of action.prereqs) variants.add(prereq.kind);
    }
    expect(variants.has('always-implicit')).toBe(true);
    expect(variants.has('action-completion-count')).toBe(true);
    expect(variants.has('capability-tier-level')).toBe(true);
    expect(variants.has('progress-var-level')).toBe(true);
    expect(variants.has('loop-count')).toBe(true);
  });
});
```

### Sim-driven probes — interface (illustrative)

```ts
// src/archetypes/looper/balance/probes.ts (vite-node script — `pnpm balance:probes:looper`)
import { Decimal, runUntil } from 'open-loop-engine';
import { buildLooperSimEngine } from './bot';

// Probe: manapot perceptibility (beats 3, 4)
function manapotPerceptibilityProbe(): { extensionPct: number; passed: boolean } {
  // Run M loops with a manapot-leaning plan; compare loop-N's manaAdded total
  // to loop-(N+M)'s; assert ≥ X% growth as progressVar accumulates.
}

// Probe: cost-reduction perceptibility (beat 6)
function costReductionPerceptibilityProbe(): { speedupPct: number; passed: boolean } {
  // Run loops until any capability talent.level >= 1; compare loop-N's
  // first-K action sim-ticks to loop-(N+1)'s; assert measurable speedup.
}

// Probe: loop-reset correctness
function loopResetCorrectnessProbe(): { driftDetected: boolean; loopCount: number } {
  // Run 5 consecutive loops; snapshot/restore consistency check.
}
```

### Bot + solver — interface (illustrative)

```ts
// src/archetypes/looper/balance/bot.ts (greedy-queue bot)
export function buildLooperSimEngine(overrides?: LooperOverrides): Engine {
  // Install a balance-bot module that fills the queue with a canonical plan
  // (manapot + gold + capability mix) at loop start and toggles auto-restart.
}

// src/archetypes/looper/balance/solve.ts (Gauss-Seidel bisection)
// Per-beat bisects on tunable() keys: balance/initialMana, balance/costDivisor,
// balance/talentAccrualRatio, actions/<id>/manaCost. Mirrors ambient/balance/solve.ts shape.
```

**Required test count:** 8 beat tests (as `it.todo()` after rebuild leaf; balance leaf converts to active assertions where window-driven verification fits) + ≥10 math-only regression locks (depending on action authoring). Tests live at `src/archetypes/looper/sim/{looper.sim.test.ts, balance.probe.test.ts}`.

---

## 8. Content sketch

The converged minimum across the in-studio Looper exemplars (`incloneution`, `idle-loops-ng`, `progress-knight-ng`) plus the canonical idle-loops vanilla shape:

> **Implementation status.** The rebuilt code (post-OL-743/744) ships **Capabilities + cursor-walked queue + loop + Talent retention + flat per-action `manaGrant` placeholder** with 4 zones and 16 actions. The canonical shape described below — **2 zones, 4 progressVars, 5 regularVars, discriminated `ActionDef` union, gold currency, manapot + gold↔mana frames** — is what the next code leaf lands. Zones consolidate (Market + Spire drop in favour of denser content in Hearth + Wilds), action set re-authors against the new types, manapot mechanics replace flat `manaGrant`, gold↔mana exchange enters.

### Resources & currencies

- **Mana** — primary loop time-budget resource, ticks-denominated, per-loop (resets to `initialMana = 250` ticks on `onRestart`). Extends mid-loop via manapot harvests (regular-pool `rewardEffects` → `add-mana`) and via the gold→mana exchange (basic `completionEffects`).
- **Gold** — secondary currency, per-loop (resets to 0 at `onRestart`, vanilla idle-loops shape). Accumulated via gold-pool regular-action `rewardEffects` (`add-gold`); spent via the basic exchange action for mana. Per-loop reset matches the within-loop strategic surface — gold doesn't compound across loops, only the persistent progressVars / Talent / `timesCompleted` axes do.

### Capabilities (4, single-axis registry)

Vigor / Aether / Craft / Lore. Each carries Level (resets per loop, reduces cost via `1 + level / costDivisor`) + Talent (persistent, multiplies XP-gain rate via `1 + sqrt(level) / 5`). Module-side via `createSkillCategory<CapabilityDef, LooperCapabilityState>` with two-tier role split inside `mapState`. Names theme-fresh, not lifted from any single exemplar.

### Zones (2, UI grouping only)

- **Hearth** — starting zone. Dense onboarding content covering all canonical frames (manapot, gold↔mana exchange, capability training).
- **Wilds** — second zone. Demonstrates the patterns are reusable shape, not specific to zone 1: alt-manapot via a different progressVar, multi-axis regularVar scaling. Cross-zone gating is a per-action prereq on a Hearth progressVar level or completion count, not a zone-level lock.

### ProgressVars (4, persistent — 2 per zone)

| Zone | ProgressVar | Scales (regularVar × perLevel) |
|---|---|---|
| Hearth | `roam` (the explore-equivalent) | `cache` × 5 (manapot pool); `latch` × 1 (gold pool) |
| Hearth | `acquaint` (the social-equivalent) | `errand` × 1 (gold pool from social work) |
| Wilds | `trail` (the explore-equivalent in Wilds) | `wellspring` × 5 (alt-manapot pool); `forage` × 5 |
| Wilds | `mark` (the leyline-equivalent) | `forage` × 2 (multi-axis: contributes additively alongside `trail`) |

The `roam` × 5 → `cache` mapping mirrors vanilla idle-loops' `Wander × 5 → Pots`. Multi-axis: `forage.total = trail.level × 5 + mark.level × 2` (mirrors vanilla's `Herbs = Forest × 5 + Shortcut × 2`). The `scales` table on `ProgressVarDef` carries this as data; modules wire the `skill.on('levelUp', ...)` listener to invoke `setRegularTotal(...)`.

### RegularVars (5, per-loop pools — `total` derived persistent, `checked`/`good` per-loop)

- **`cache`** (Hearth, manapot) — `rewardRatio: 10`, `rewardEffects: [{ kind: 'add-mana', amount: 100 }]`
- **`latch`** (Hearth, gold pool) — `rewardRatio: 10`, `rewardEffects: [{ kind: 'add-gold', amount: 10 }]`
- **`errand`** (Hearth, gold pool from social) — `rewardRatio: 5`, `rewardEffects: [{ kind: 'add-gold', amount: 20 }]`
- **`wellspring`** (Wilds, alt-manapot) — `rewardRatio: 10`, `rewardEffects: [{ kind: 'add-mana', amount: 250 }]`
- **`forage`** (Wilds, multi-axis pool) — `rewardRatio: 5`, `rewardEffects: [{ kind: 'add-mana', amount: 50 }, { kind: 'add-gold', amount: 5 }]`

Reward magnitudes are vanilla-canonical-shaped placeholders; OL-746 solver-converges them.

### Actions (~14 across 2 zones)

| Zone | Action | Type | Notes |
|---|---|---|---|
| Hearth | Stretch | basic | weights `{vigor: 1}`; entry training, no secondary effect |
| Hearth | Tend | basic | weights `{craft: 1}`; entry training |
| Hearth | Listen | basic | weights `{lore: 1}`; entry training |
| Hearth | Roam | progress | weights `{vigor: 0.4, lore: 0.4, aether: 0.2}`; targets `roam` progressVar |
| Hearth | Acquaint | progress | weights `{lore: 0.6, aether: 0.4}`; targets `acquaint` progressVar |
| Hearth | Crack | regular | weights `{craft: 0.5, vigor: 0.5}`; targets `cache`; manapot reward |
| Hearth | Slip | regular | weights `{craft: 0.7, lore: 0.3}`; targets `latch`; gold reward |
| Hearth | Run | regular | weights `{vigor: 0.5, lore: 0.5}`; targets `errand`; gold reward |
| Hearth | Trade | basic | weights `{lore: 1}`; `completionEffects: [{ spend-gold: 'all' }, { add-mana: gold × 50 }]`; prereq Roam ≥ level 3 |
| Wilds | Trek | basic | weights `{vigor: 0.6, lore: 0.4}`; bridge action; prereq Roam ≥ level 5 |
| Wilds | Trail | progress | weights `{vigor: 0.6, aether: 0.4}`; targets `trail` progressVar |
| Wilds | Mark | progress | weights `{aether: 0.6, lore: 0.4}`; targets `mark` progressVar; prereq Trail ≥ level 1 |
| Wilds | Drink | regular | weights `{aether: 1}`; targets `wellspring`; alt-manapot reward |
| Wilds | Gather | regular | weights `{craft: 0.5, lore: 0.5}`; targets `forage`; multi-axis-scaled pool |

Coverage:

- All four capabilities exercised in both zones.
- All three action types present in Hearth; progress + regular present in Wilds (basic Trek bridges).
- All four progressVars have a corresponding progress-type action targeting them.
- All five regularVars have a corresponding regular-type action.
- **Manapot frame:** Roam → `cache.total` grows → Crack harvests → mana extends.
- **Gold↔mana frame:** Roam → `latch.total` grows + Acquaint → `errand.total` grows → Slip / Run accumulate gold → Trade burns gold-for-mana.
- **Alt-manapot in zone 2:** Trail → `wellspring.total` grows → Drink harvests → mana extends. Same shape as Hearth's Roam→Crack, different progressVar.
- **Multi-axis scaling:** `forage.total = trail.level × 5 + mark.level × 2`; Gather harvests it. Demonstrates compositional progressVar coupling.
- All four `ActionPrereq` variants exercised (action-completion-count, capability-tier-level, progress-var-level, loop-count via late-game gating).

### Loop start trigger & restart

- Loop paused at boot. First enqueue → queue auto-dispatches → loop's `'start'` subscription flips `loop.running` true (`modules/loop.ts:152-167`).
- Empty queue mid-run → `shouldRestart` → loop ends → `onRestart` resets per-loop state, re-readies plan, pauses again if plan empty.
- `pauseBeforeRestart` toggle — INCLUDE (vanilla canonical UX).
- Manual restart button — INCLUDE.
- Game-speed multipliers — DEFER (fork-extension; idle-loops Lloyd-mod territory).

### Loop reset

`createLoop({ endCondition: () => mana.lte(0) || queue.shouldRestart, thingsToReset, onBeforeRestart, onRestart })` + `createRetentionPolicy({ keep: [...talent.xp refs, ...progressVar.xp refs, ...action.timesCompleted refs, ...regularVar.total refs] })`. Snapshot/restore around the reset:

- **Resets per loop:** capability Level XP, action progress, mana, manaAdded, queue cursor + per-item `loopsLeft`, regularVar `checked` and `good`, gold.
- **Persists:** capability Talent XP, action `timesCompleted`, progressVar XP, regularVar `total` (derived from progressVars; cached persistent), queue plan structure (items + declared loops), `repeatLastAction` setting, `pauseBeforeRestart` setting.

### No separate prestige tier

The loop *is* the retention-tier reset. Fork-extension territory: a Lloyd-shaped talent-tree (spendable points from Talent levels), a PK-2-shaped multi-layer soulstone tree, or an Increlution-shaped reincarnation prestige.

### Density target

- Beat 1 → Stretch / Tend / Listen entry training visible from loop 1.
- Beat 2 → first loop ends; reset cadence introduced.
- Beat 3 → first Roam completion brings `roam` progressVar to level 1 (1% Roam) → cache pool unlocks (`cache.total` jumps from 0 to 5).
- Beat 4 → repeated Crack completions hit the 10th-check threshold → first manapot harvest extends mana pool mid-loop.
- Beat 5 → repeated Slip / Run completions accumulate gold → Trade burns gold for mana in one burst.
- Beat 6 → Talent on at least one capability reaches level 1 → talentMult 1.20× → noticeable cost reduction in subsequent loops.
- Beat 7 → Roam (or Acquaint, depending on plan) crosses prereq threshold → Trek visible → Wilds tab populates → Trail / Drink / Gather authorable into the queue.
- Beat 8 → multi-axis compounding (Trail+Mark scaling on Forage, Talent across multiple capabilities, sustained mana-pool extension); arc-closure latch fires.

### Cardinality cross-check

The exemplar lineage operates at much higher cardinality (idle-loops-ng vanilla: 47 actions across 6 zones, 9 progressVars, 8+ regularVars; PK: ~40 jobs/skills across 4 lifetime tracks). The demo deliberately ships the converged floor — enough to exercise every canonical frame, not enough to be a real game. Forks raise cardinality in `data/actions.ts` / `data/progress-vars.ts` / `data/regular-vars.ts` / `data/zones.ts` without touching engine wiring.

---

## 9. UI prescription

- **Primary shell:** `ThreePanelShell` — time-loop weak majority per `subgenre-shell-mapping-2026.md` § "time-loop" (2/5 classifiable, at the 40% threshold). Shell matches both primary idle-loops-lineage exemplars. Exemplar rows from `layout-audit-2026.md`: Idle Loops, Omsi Loops.
- **Secondary shell:** `MultiColumnShell` — extension shape for Cavernous-style per-clone queue richness; one classifiable time-loop row per `subgenre-shell-mapping-2026.md`. Use when the fork adds parallel-clone or parallel-loop content that outgrows three columns. Exemplar row: Cavernous II.
- **Form-factor intent:** `desktop` — time-loop corpus is desktop-dominant per `layout-audit-2026.md` distribution (no mobile-aware majority in the sub-genre). Queue-editing interaction is pointer-primary; touch-first is a declared-invention territory Looper does not claim.
- **ARIA-aligned widgets (lift targets):**
  - `Tooltip` — skill-row breakdowns, action prereqs, retention-track explanations. Cites `widget-vocabulary.md` Layer 1 (frequency 5).
  - `Dialog` — automation config, prestige/soulstone tree, saved-loadout picker. Cites `widget-vocabulary.md` Layer 1 (frequency 6).
  - `Progress` — per-action completion ticks (beat 1 signal), loop time-budget gauge, skill-XP bars. Cites `widget-vocabulary.md` Layer 1 (highest frequency, 12).
  - `Tabs` — zone switching in the action drawer. Cites `widget-vocabulary.md` Layer 1 (≥30 corpus rows carry tab-nav).
  - `Accordion` — collapsible skill groupings / zone-completion detail. Cites `widget-vocabulary.md` Layer 1 (frequency 4).
- **Domain widgets (per-fork implementation):**
  - action queue — the Looper-signature widget. Drag-to-reorder list with per-item loop count + auto-repeat toggle. Cites `widget-vocabulary.md` Layer 2 (frequency 5; Idle Loops and Cavernous II exemplify drag-to-reorder).
  - resource bar — time-budget gauge (mana / health / ticks) as the always-visible pacing readout. Cites `widget-vocabulary.md` Layer 2 (frequency 11).
  - progress track — embedded per-queue-item progress bars for the currently-ticking action and look-ahead preview. Cites `widget-vocabulary.md` Layer 2 (frequency 7).
  - stat panel — right-column read-only display of skill levels + retention-track accumulators. Cites `widget-vocabulary.md` Layer 2 (frequency 6; right-column fixture in three-panel layouts).
- **Layout detail:** three-panel region assignment — left column holds the action drawer (zone-filtered, `Tabs`-gated by current zone), centre holds the queue editor + current-run readout (time-budget gauge, current action `Progress`), right column holds skills panel + retention tracks. Modal (`Dialog`) hosts automation config and loadout picker per beat 6 / beat 7.
- **Nav pattern:** horizontal tab bar for zones (within the left column, not at shell level). Matches idle-loops lineage per `layout-audit-2026.md` row: Idle Loops ("top tabs (town location switching)").

---

## 10. Predicted engine gaps

Both live consumers flag overlapping gaps; convergent TODOs get higher severity.

| Gap | Severity | Notes |
|-----|----------|-------|
| Multi-part action primitive | High (filed candidate-primitive) | idle-loops-ng `multi-part.ts` docstring: *"Engine has no first-class multi-segment action pattern. If second consumer needs it, extract a primitive."* Incloneution's construction-progress inlining is a different workaround for overlapping need. Filed as a candidate-primitive ticket alongside the OL-742 umbrella; demo defers cleanly without it. |
| Sequencer reactivity hack | Medium | incloneution wraps the sequencer `items` array with a manual `queueVersion` counter to force Vue reactivity (`actions.ts:78-80`). A reactive sequencer ref would eliminate this in every Vue-based consumer. |
| Cross-action affected-by / bonus composition | Medium | idle-loops-ng `affected-by.ts` — actions scaling by other action levels. Novel enough to note; file as research before extracting. If Scripter (cluster #1) needs a similar cross-reference mechanism, the primitive might serve both. |
| Mana-cost contribution registry | Medium | idle-loops-ng TODO(OL-246) — `view.adjustManaCost` wiring via contributor registry. A "modifier chain for action costs" could be the right shape. |
| Tick drift under variable dt | Medium | incloneution `main.ts:28-32` + OL-466 — fixed-step workaround. Loopers with speed multipliers > 1× diverge between `lifeTime` and `depth` unless forced to `tickMode: 'fixed'`. Engine default could change, or a speed-safe path could land. |
| Game-active gating via circular-injection callback | Low | incloneution `time.ts:21-24` — OL-63 deferred. Event-bus migration resolves this. Cosmetic. |
| Zone-scoped content queries | Low | "Show only actions in current zone" is manual filtering in both consumers. Producer doesn't need this; Looper, Explorer, and Interlocker all do. Graduate a helper after the third consumer. |
| Layered mod content composition | Unknown | idle-loops-ng mod lineage (OMSI → Lloyd → Squirrel) composes via dependency injection with ad-hoc `includes content-X` comments. If other archetypes want this (Scripter especially), the engine lacks a first-class content-overlay primitive. Prototype before graduating. |

---

## 11. Themes

### Theme A — Hearth & Wilds (the demo's costume)

- **Hook:** Theme-fresh classic-adventuring. Mana-as-time, capabilities as proficiencies, zones as the village edge and the wild trails beyond. Demonstrates the canonical shape without lifting names from any single exemplar.
- **Resource mapping:** time-budget = mana; secondary currency = gold (per-loop); retention tracks = capability Talent + progressVar XP (`roam`, `acquaint`, `trail`, `mark`); zones = [Hearth, Wilds]; capabilities = [Vigor, Aether, Craft, Lore].
- **Narrative framing:** light — flavour text on actions, end-of-arc line on the spire-falls-quiet shape (`modules/arc.ts:21-22`).

### Theme B — Dreaming lucidity

- **Hook:** Each run is a lucid dream. The dream fragments when you run out of lucidity (time budget); instinct compounds across waking cycles. Zones are dreamscapes — rooftops, a library, an ocean trench.
- **Resource mapping:** time-budget = lucidity; retention tracks = [instinct, dream-fragments]; zones = [four dreamscapes]; skills = [recall, shape-change, confront-fear, dream-logic, wake-control].
- **Narrative framing:** stronger — between runs, the character is "awake" briefly; dream-fragments imply dream-journal entries. Could support a narrative prestige layer (the dreamer becomes aware of the dream at high retention).

### Theme C — Reincarnation (Increlution-ish)

- **Hook:** Death-triggered Variation C. Health decays as you take actions in a hostile world; when you die, instinct carries to your next life.
- **Resource mapping:** time-budget = health; retention tracks = [instinct, artifact-discoveries]; zones = [eleven chapters of a journey]; skills = [survival, climb, swim, forage, fight, read].
- **Narrative framing:** the strongest of the four — each death is a beat, and the game is the biography of many lives overlaid. Incloneution sits in this theme natively.

### Theme D — Groundhog detective

- **Hook:** The same day repeats. You have sixteen hours to investigate a town that resets at midnight; deductions and learned routes carry over.
- **Resource mapping:** time-budget = hours-in-the-day; retention tracks = [deductions, memorised-routes]; zones = [town districts]; skills = [observation, persuasion, lockpick, research, bluff].
- **Narrative framing:** Groundhog Day meets investigation. A narrative prestige layer could reveal "breaking the loop" as endgame.

---

## Vocabulary anchors

Every name cited in this doc must resolve to one of:

- **Pattern names** → `open-loop-research/LIBRARY.md` + linked pattern files
- **Cross-pattern properties** → `open-loop-research/patterns/cross-pattern-properties/*.md`
- **Novel-patterns clusters** → `open-loop-research/reports/novel-patterns/novel-patterns-synthesis-v4.md`
- **Engine primitives** → `open-loop-engine/docs/api/INDEX.md` + the four `*.api.md` files
- **Corpus games** → `open-loop-research/analyses/complete/*-analysis.md`
- **Layout shells** → `open-loop-starter/src/lib/shells/`
- **Live consumers** → `/work/studio/idle-loops-ng/`, `/work/studio/incloneution/`
