# Archetype: Looper

> **One-line identity:** Resource-gated Loop + Retention Policy + Two-tier Stat Mastery + Cursor-walked Plan with Prereq Web — the repetition-with-retention incremental.
>
> **Status:** `canonical`

**Exemplars (validation, not clone targets):** [Idle Loops](../../open-loop-research/analyses/complete/idle-loops-analysis.md), [Omsi Loops](../../open-loop-research/analyses/complete/omsi-loops-analysis.md), [Increlution](../../open-loop-research/analyses/complete/increlution-analysis.md), [Cavernous II](../../open-loop-research/analyses/complete/cavernous-ii-analysis.md), [Progress Knight 2](../../open-loop-research/analyses/complete/progress-knight-2-analysis.md).

**Live consumer references (engine-usage grounding):** `/work/studio/idle-loops-ng/` — composition ported from the Idle Loops mod lineage (vanilla → OMSI → Lloyd → Squirrel), demonstrates dual-queue active/edit planning and layered mod-content composition. `/work/studio/incloneution/` — decompiled from Increlution, demonstrates single-queue auto-repeat, gen/instinct dual-tier XP, manual reincarnation trigger. Both cite-worthy for "how a Looper actually wires up." The starter's looper demo is itself a first-arc vanilla idle-loops port — substrate (mechanics + UI) cloned 1:1 from `idle-loops-ng/src/`, content covering vanilla town 0 + town 1.

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
| systems | `createSkillCategory` | Used twice — `looper/stats` for two-tier Level + Talent stat XP, `looper/progress-vars` for persistent exploration tracks. Modifier-chain composition is internal to the category; raw `createModifierChain` is unused at this layer. |
| systems | `createSkill` | Talent tier of each stat, built inside `mapState` of the stat category. |
| systems | `createLoop` | Reset orchestration — `endCondition`, `thingsToReset`, `onBeforeRestart`, `onRestart`. |
| systems | `createRetentionPolicy` | Carries Talent XP, action `timesCompleted`, progressVar XP, and regularVar `total` (derived persistent) across the loop reset. NOT a cost-reduction curve. |
| systems | `createZoneSystem` | UI grouping only — registration-ordered ranking + `current`/`select(id)` for action-drawer tab focus. Does NOT gate content; per-action `prereqs` handle visibility. |
| harness | `runMatrix` | Probe robustness across vars space (used by `balance/solve.ts` Gauss-Seidel bisection). |

**Engine systems explicitly not used (required):**

- `createProducerCategory` / `createScalingPurchasable` — Loopers express production through actions, not producers. If you reach for producer-category in a Looper, you're building Producer or Interlocker, not Looper.
- `createAchievementCategory` — achievements are optional in Looper; the retention policy and arc-closure latch are the progression rewards. Forks may add them as a cosmetic layer.
- `createPurchasableCategory` — Looper shops are rare (Omsi has one); when present they're a specific optional modifier, not part of the skeleton.
- `createModifierChain` / `createMultiplicativeModifier` / `createSequentialModifier` (raw, outside `xCategorySystem`) — stat and progress-var categories carry modifier-chain machinery internally. Forks layering richer cross-skill bonus composition reach for the raw chain primitives at that point.
- `createCompositeStrategy` — automation strategies are fork-extension territory; the first-arc port's auto-repeat / pause-on-empty-plan is queue-internal, not a strategy fill.

**Primary stress axes:**

1. **Reset correctness.** The loop must zero per-loop refs (stat Level XP, action progress, mana, manaAdded, regularVar `checked`/`good`, gold, queue cursor + per-item `loopsLeft`), preserve persistent refs (stat Talent XP, action `timesCompleted`, progressVar XP, regularVar `total` derived state, queue plan, settings toggles), and survive hundreds of repeated resets without state drift. Snapshot/restore via `createRetentionPolicy` is the engine path.
2. **Queue re-planning UX.** Players edit the cursor-walked plan mid-run, between runs, and via saved loadouts. Sequencer reactivity must hold up under mutation; consumer-side `queueVersion` counter is the current Vue-reactivity workaround (see § 10).
3. **Cross-loop perceptibility — two axes.** The compounding rests on two distinct cross-loop signals: **(a)** persistent-progress → manapot pool → mana-pool extension (medium-pace; the manapot frame); **(b)** Talent → Level XP rate multiplier → cost reduction (slow-pace; the canonical role-split). Both axes are load-bearing for the archetype's identity — the demo collapses if either stops being perceptible across the arc.
4. **Zone-scoped content queries.** "Show only actions in current zone" is manual filtering at the consumer; engine has no helper. With zones being UI grouping only, the filter is naive — if three Loopers re-derive it, it graduates.

---

## 4. Data shape

Per the data-first archetype convention (`open-loop-starter/CLAUDE.md` § Archetype convention), the demo's content lives flat in `src/archetypes/looper/data/*.ts` as plain typed arrays + balance constants. The skeleton/theme/balance lens lives as comment sections (`// ─── Skeleton ───`, `// ─── Balance ───`, `// ─── Costume ───`) inside each data file, not as a parallel filesystem layer. Mechanical fields and theme strings are co-located per def. No `vars/` extraction layer, no codegen round-trip.

### Drain semantics

Mana drains `round(tickRate × dt)` per engine tick — at 20 TPS that's 1 mana per tick, the canonical "1 mana = 1 tick" coupling that makes `manaCost` directly comparable to the pool. Drain is gated on `loop.running`: an empty queue with the loop paused (boot, post-restart) does NOT drain mana.

The loop is **paused at boot** (no auto-`run()`). The first `enqueue` triggers the queue's `'start'` event; the loop module's connect-phase subscription flips `loop.running` true. After a restart that lands on an empty plan, the loop pauses again until the next enqueue.

Per-loop budget: `INITIAL_MANA + manaAdded`, where `manaAdded` accumulates from action completions that grant mana (manapot harvests via regular-action `rewardEffects`, gold→mana exchanges via basic-action `completionEffects`). Both `mana` and `manaAdded` reset on `onRestart`; mana does NOT compound across loops — cross-loop persistence is on stats (Talent), progressVars, regularVar `total` (derived), and action `timesCompleted`.

### Queue-as-plan (cursor-walked, not pop-on-complete)

The queue is a **persistent plan**, not a FIFO. Items are NOT consumed on completion; a cursor walks through them, and the plan survives the loop reset. Per-item `loopsLeft` decrements per execution, the cursor advances when it hits zero, and `resetForLoop()` on loop end restores per-item `loopsLeft → loops` and resets the cursor → 0. Vanilla idle-loops shape, implemented via `createSequencer({ id: 'looper/queue', mode: 'list' })`; `resetCursor()` is the restart hook.

Without this, the entire compulsion-loop premise ("optimize the sequence over runs") collapses — the sequence has to *survive* the run for the player to refine it.

The "Repeat Last Action" toggle (vanilla canonical UX) extends the last item by one when the cursor would walk off the end. Default off; persistent ref in the queue module.

### File split

| File | What it owns |
|---|---|
| `data/types.ts` | All `*Def` interfaces, the `LooperBalance` constants shape, the `LooperGameState` typed read-view interface, the `LooperData` barrel type. |
| `data/stats.ts` | `STATS: StatDef[]` — single-axis 9-stat registry (Dex / Str / Con / Spd / Per / Cha / Int / Luck / Soul). Module-side `mapState` pairs each with a Talent tier (different role from Level). Ids carried 1:1 from `idle-loops-ng/src/data/stats.ts`. Exports the shared `levelFromXP` / `xpForLevel` / `calcTalentMult` formulas. |
| `data/zones.ts` | `ZONES: ZoneDef[]` — 2 zones (Beginnersville + Forest Path), UI grouping only. No `requires` field — per-action `prereqs` handle gating. |
| `data/progress-vars.ts` | `PROGRESS_VARS: ProgressVarDef[]` — 4 persistent exploration tracks (2 per zone). Each carries a `scales` table — which regularVars its level-up callback re-totals, by what `perLevel` factor. |
| `data/regular-vars.ts` | `REGULAR_VARS: RegularVarDef[]` — per-loop pools sized via progressVar level-up (e.g., Pots pool `total = wander.level × 5`). `total` is persistent (derived); per-loop `checked`/`good` clear via `thingsToReset`. |
| `data/actions.ts` | `ACTIONS: ActionDef[]` — discriminated union (`type: 'progress' \| 'regular' \| 'basic'`). Each action carries `zoneId`, `manaCost` (ticks), `expMult`, `weights` (stat XP map), per-type fields, optional `prereqs` + `canStart`. |
| `data/balance.ts` | `LOOPER_BALANCE: LooperBalance` — vanilla-canonical numeric constants. |
| `data/resources.ts` | `RESOURCE_DEFS: ResourceDef[]` — minimal resource set (gold only; mana lives in `modules/mana.ts`, not as a generic resource). |
| `data/index.ts` | `DEFAULT_LOOPER_DATA` barrel + per-file re-exports. |
| `data/overrides.ts` | `LooperOverrides` flat-category override shape + `applyLooperOverrides(base, overrides)` (throws on unknown id; mirrors `applyProducerOverrides` / `applyAmbientOverrides`). |

### Definition shapes (TS-signature reference)

The interfaces below describe the canonical demo's data shape. Forks restructure freely as long as the layering rule (`data → modules → composables → ui`) and the engine-runtime-free invariant on `data/*.ts` are preserved.

```ts
// data/types.ts (illustrative)

export interface StatDef {
  id: string;            // 'Dex' | 'Str' | 'Con' | 'Spd' | 'Per' | 'Cha' | 'Int' | 'Luck' | 'Soul'
  name: string;
  description: string;
}

export interface ZoneDef {
  id: string;            // 'beginnersville' | 'forest-path'
  name: string;
  description: string;
}

/**
 * Persistent exploration track — Wander-shape. Survives the loop reset
 * (kept by the retention policy). Each level-up emits a callback that
 * re-totals one or more regularVars (the manapot frame's load-bearing
 * coupling). Reuses `createSkillCategory` engine primitive — same surface
 * as stats, different role.
 */
export interface ProgressVarDef {
  id: string;            // 'wander' | 'met' | 'forest' | 'shortcut'
  name: string;
  description: string;
  zoneId: string;
  /** XP added per completion of any progress-type action targeting this var. */
  expMult: DecimalSource;
  /**
   * Level-up scaling table — which regularVars' totals re-derive on each
   * level gain, and by what additive contribution. Sums when multiple
   * progressVars contribute to the same regularVar (multi-axis scaling:
   * `herbs.total = forest.level × 5 + shortcut.level × 2`).
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
  id: string;            // 'pots' | 'locks' | 'wild-mana' | 'herbs'
  name: string;
  description: string;
  zoneId: string;
}

export type ActionPrereq =
  | { kind: 'action-completion-count'; actionId: string; value: number }
  | {
      kind: 'stat-tier-level';
      statId: string;
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
   * Stat weight map. Same weight controls stat XP gain AND cost contribution.
   * Per canonical (`idle-loops-ng/src/modules/action-formulas.ts`):
   *
   * ```
   * adjustedExp = expMult × (manaCost / adjustedTicks)
   * for each (statId, weight) in weights:
   *   xpGain = weight × adjustedExp × talentMult(statId)
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
 * completion; the stat-XP path is identical across types via `weights`.
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
  | (ActionDefBase & {
      type: 'progress';
      progressVarId: string;
      /**
       * XP added to the target progressVar per completion. Decoupled from
       * `manaCost` by design — forks can retune cost without affecting
       * progression rate. Multiplied by `pvDef.expMult` at grant time.
       */
      progressAmount: DecimalSource;
    })
  | (ActionDefBase & {
      type: 'regular';
      regularVarId: string;
      /** Every Nth check fires rewardEffects (vanilla idle-loops `rewardRatio: 10`). */
      rewardRatio: number;
      rewardEffects: RewardEffect[];
    })
  | (ActionDefBase & {
      type: 'basic';
      /** Optional. Applied on completion. Gold-spend → mana, gold-add, etc. */
      completionEffects?: CompletionEffect[];
      /**
       * Multiplier consumed by `exchange-gold-to-mana` completion effects:
       * `manaAdded = preBatchGold × exchangeMult`. Vanilla `Buy Mana` uses 50.
       */
      exchangeMult?: DecimalSource;
    });

export type RewardEffect =
  | { kind: 'add-mana'; amount: DecimalSource }
  | { kind: 'add-gold'; amount: DecimalSource };

export type CompletionEffect =
  | { kind: 'add-mana'; amount: DecimalSource }
  | { kind: 'add-gold'; amount: DecimalSource }
  | { kind: 'spend-gold'; amount: DecimalSource | 'all' }
  | { kind: 'exchange-gold-to-mana' };

export interface LooperBalance {
  /** Mana pool size at loop start, denominated in ticks. Vanilla canonical 250 (~12.5s @ 20 TPS). */
  initialMana: DecimalSource;
  /** Cost-reduction divisor on stat Level. Vanilla canonical 100. */
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
  statLevelAtLeast(statId: string, tier: 'level' | 'talent', n: number): boolean;
  progressVarLevelAtLeast(progressVarId: string, n: number): boolean;
  actionCompletedAtLeast(actionId: string, count: number): boolean;
  loopCountAtLeast(n: number): boolean;
}
```

### Override surface

`createLooperEngine(overrides?)` accepts a flat-category `LooperOverrides`:

```ts
export interface LooperOverrides {
  stats?:        Array<Partial<StatDef>        & { id: string }>;
  zones?:        Array<Partial<ZoneDef>        & { id: string }>;
  progressVars?: Array<Partial<ProgressVarDef> & { id: string }>;
  regularVars?:  Array<Partial<RegularVarDef>  & { id: string }>;
  actions?:      ActionOverride[]; // distributed Partial<ActionDef> & { id: string }
  balance?:      Partial<LooperBalance>;
}
```

`applyLooperOverrides` shallow-merges `balance` and id-merges the array categories; unknown ids throw. Action overrides preserve the existing entry's `type` discriminator unless explicitly restated; mismatched `type` throws.

### Mechanical-vs-costume separation

What's mechanical and lives in `data/balance.ts`: `initialMana`, `costDivisor`, `talentAccrualRatio`, `loopResetEnabled`. Per-progressVar `expMult` and `scales` table (the manapot coupling shape) are mechanical and live in `data/progress-vars.ts`. Per-action `manaCost`, `expMult`, `weights`, `progressAmount`, `rewardRatio`, `rewardEffects`, `completionEffects`, and `exchangeMult` payloads are mechanical and live inline per def. What's costume: action / zone / progressVar / regularVar / stat `name` and `description`, the time-resource displayName ("mana"), the loop-completion verb ("reset"), the end-of-arc flavour string. Forks that want a different mood swap costume strings without touching anything else; forks reshaping the archetype touch balance constants, progressVar `scales` shapes, and possibly cardinality.

---

## 5. Content sketch

The first-arc port carries vanilla idle-loops town 0 (Beginnersville) + town 1 (Forest Path) — substrate (mechanics + UI) cloned 1:1 from `idle-loops-ng/src/`. File-header citations in `data/*.ts` name the canonical idle-loops-ng source files (`src/data/vanilla-actions.ts`, `src/modules/zones.ts`) and line ranges. Forks rename for theme; the starter ships transparent first-arc ports.

### Resources & currencies

- **Mana** — primary loop time-budget resource, ticks-denominated, per-loop (resets to `initialMana = 250` ticks on `onRestart`). Extends mid-loop via manapot harvests (regular-pool `rewardEffects` → `add-mana`) and via the gold→mana exchange (basic `completionEffects` → `exchange-gold-to-mana`). Lives in `modules/mana.ts`, not as a generic resource.
- **Gold** — secondary currency, per-loop (resets to 0 at `onRestart`, vanilla idle-loops shape). Accumulated via gold-pool regular-action `rewardEffects` (`add-gold`); spent via the basic exchange action for mana. Per-loop reset matches the within-loop strategic surface — gold doesn't compound across loops, only the persistent progressVars / Talent / `timesCompleted` axes do.

### Stats (9, single-axis registry)

`Dex / Str / Con / Spd / Per / Cha / Int / Luck / Soul`. Each carries Level (resets per loop, reduces cost via `1 + level / costDivisor`) + Talent (persistent, multiplies XP-gain rate via `1 + sqrt(level) / 5`). Module-side via `createSkillCategory<StatDef, StatState>` with two-tier role split inside `mapState`. Ids are PascalCase 3-letter abbreviations carried 1:1 from `idle-loops-ng/src/data/stats.ts` — they double as engine-keyed identifiers and short display names.

### Zones (2, UI grouping only)

- **Beginnersville** — starting zone. Dense onboarding content covering all canonical frames (manapot, gold↔mana exchange, stat training via world-action `weights`).
- **Forest Path** — second zone. Demonstrates the patterns are reusable shape, not specific to zone 1: alt-manapot via a different progressVar, multi-axis regularVar scaling. Cross-zone gating is a per-action prereq on a Beginnersville progressVar level (`wander ≥ 5`), not a zone-level lock. Vanilla idle-loops ships a third zone (Merchanton) which the first-arc port doesn't carry.

### ProgressVars (4, persistent — 2 per zone)

| Zone | ProgressVar | Scales (regularVar × perLevel) |
|---|---|---|
| Beginnersville | `wander` | `pots × 5` (manapot pool); `locks × 1` (gold pool) |
| Beginnersville | `met` | (no scales — pool-less; vanilla Met sizes `sQuests = met × 1` fed by Short Quest, an action the first-arc port doesn't include) |
| Forest Path | `forest` | `wild-mana × 5` (alt-manapot pool); `herbs × 5` |
| Forest Path | `shortcut` | `herbs × 2` (multi-axis: contributes additively alongside `forest`) |

Pool-sizing magnitudes match `idle-loops-ng/src/modules/zones.ts` `setRegularTotal(...)` calls 1:1. Multi-axis: `herbs.total = forest.level × 5 + shortcut.level × 2` (mirrors vanilla's `Herbs = Forest × 5 + Shortcut × 2`, dropping the third `flowers × 13` contributor since the first-arc port doesn't model the herb inventory). The `scales` table on `ProgressVarDef` carries this as data; modules wire the `skill.on('levelUp', ...)` listener to invoke `setRegularTotal(...)`.

### RegularVars (4, per-loop pools — `total` derived persistent, `checked`/`good` per-loop)

- **`pots`** (Beginnersville, manapot) — `rewardRatio: 10`, `rewardEffects: [{ kind: 'add-mana', amount: 100 }]`. Vanilla Pots, drained by Smash Pots.
- **`locks`** (Beginnersville, gold pool) — `rewardRatio: 10`, `rewardEffects: [{ kind: 'add-gold', amount: 10 }]`. Vanilla Locks, drained by Pick Locks.
- **`wild-mana`** (Forest Path, alt-manapot) — `rewardRatio: 10`, `rewardEffects: [{ kind: 'add-mana', amount: 250 }]`. Vanilla Wild Mana, drained by the Wild Mana action.
- **`herbs`** (Forest Path, multi-axis pool) — `rewardRatio: 10`, `rewardEffects: [{ kind: 'add-mana', amount: 50 }, { kind: 'add-gold', amount: 5 }]`. Vanilla Herbs, drained by Gather Herbs. Multi-axis reward (mana + gold) is a declared invention since the first-arc port doesn't model the inventory `herbs` resource vanilla grants per reward; the multi-axis pool slot is repurposed as a multi-axis reward.

Reward magnitudes are vanilla canonical; not perturbation targets — they carry the canonical economy.

### Actions (9 across 2 zones)

| Zone | Action | Type | Notes |
|---|---|---|---|
| Beginnersville | Wander | progress | manaCost 250, weights `{Per: 0.2, Con: 0.2, Cha: 0.2, Spd: 0.3, Luck: 0.1}`; targets `wander`; progressAmount 200 |
| Beginnersville | Meet People | progress | manaCost 800, weights `{Int: 0.1, Cha: 0.8, Soul: 0.1}`; targets `met`; progressAmount 200; prereq `wander ≥ 10` |
| Beginnersville | Smash Pots | regular | manaCost 50, weights `{Str: 0.2, Per: 0.2, Spd: 0.6}`; targets `pots`; manapot reward |
| Beginnersville | Pick Locks | regular | manaCost 400, weights `{Dex: 0.5, Per: 0.3, Spd: 0.1, Luck: 0.1}`; targets `locks`; gold reward; prereq `wander ≥ 3` |
| Beginnersville | Buy Mana | basic | manaCost 100, weights `{Cha: 0.7, Int: 0.2, Luck: 0.1}`; `completionEffects: [spend-gold:'all', exchange-gold-to-mana]`; `exchangeMult: 50`; prereq `wander ≥ 3` |
| Forest Path | Explore Forest | progress | manaCost 400, weights `{Per: 0.4, Con: 0.2, Spd: 0.2, Luck: 0.2}`; targets `forest`; progressAmount 100; prereq `wander ≥ 5` |
| Forest Path | Old Shortcut | progress | manaCost 1200, weights `{Per: 0.3, Con: 0.4, Spd: 0.2, Luck: 0.1}`; targets `shortcut`; progressAmount 100; prereq `wander ≥ 5 + forest ≥ 1` |
| Forest Path | Wild Mana | regular | manaCost 150, weights `{Con: 0.2, Int: 0.6, Soul: 0.2}`; targets `wild-mana`; alt-manapot reward; prereq `wander ≥ 5` |
| Forest Path | Gather Herbs | regular | manaCost 200, weights `{Str: 0.4, Dex: 0.3, Int: 0.3}`; targets `herbs`; multi-axis reward; prereq `wander ≥ 5 + Per.Talent ≥ 1 + loops ≥ 3` |

`expMult: 1` uniform across the entire action set — matches vanilla town 0 / town 1 baselines (vanilla reserves `expMult > 1` for explicit stat-trainer actions like Train Strength, which the first-arc port doesn't include). Stat-trainer basics are deliberately absent — stat XP comes from world-action `weights`, matching vanilla town 0.

Coverage:

- All 9 stats appear in `weights` of at least one action; Cha is restricted to Beginnersville (vanilla town 1 doesn't carry social actions).
- All three action types present in Beginnersville (progress, regular, basic); progress + regular present in Forest Path (no basic action — vanilla town 1 has no equivalent of Buy Mana).
- All four progressVars have a corresponding progress-type action targeting them.
- All four regularVars have a corresponding regular-type action draining them.
- **Manapot frame:** Wander → `pots.total` grows → Smash Pots harvests → mana extends.
- **Gold↔mana frame:** Wander → `locks.total` grows → Pick Locks accumulates gold → Buy Mana burns gold-for-mana in one burst.
- **Alt-manapot in Forest Path:** Explore Forest → `wild-mana.total` grows → Wild Mana harvests → mana extends. Same shape as Beginnersville's Wander → Smash Pots, different progressVar.
- **Multi-axis scaling:** `herbs.total = forest.level × 5 + shortcut.level × 2`; Gather Herbs harvests it. Demonstrates compositional progressVar coupling.
- Four of five `ActionPrereq` variants exercised: always-implicit (Wander, Smash Pots), progress-var-level (most prereqs), stat-tier-level (Gather Herbs), loop-count (Gather Herbs). The `action-completion-count` variant is engine-supported but unexercised in the first-arc port — forks adding content can use it.

### Required structural properties

<!-- TODO(structural-properties): fill in when next touched. -->

### Later-arc systems (fork extension territory)

Vanilla idle-loops ships subsystems the first-arc port doesn't carry — skills, inventory, multi-part actions, additional zones. The first arc covers zones 0–1 with the queue+drain+pool primitives; forks extending the demo build the rest on top:

- **Practical skill** — vanilla `practicalDiscount(50)` on Smash Pots / `practicalDiscount(150)` on Wild Mana / `practicalScaledGold(10)` on Pick Locks gold reward. The first arc uses base values; forks adding the skills system layer the discount/scaling on top.
- **Hermit progress** — vanilla `levelDiscount(200, 'Hermit')` on Gather Herbs. The first arc uses the base value; forks adding Hermit progress route the discount.
- **Herb inventory** — vanilla Gather Herbs `+1 herb` reward feeds a herbs inventory resource. The first arc uses a multi-axis `+50 mana / +5 gold` reward (declared invention) since the inventory subsystem is fork-extension territory.
- **Multi-part actions** — vanilla zone-bridge actions (Buy Supplies + Travel from Beginnersville to Forest Path) require the multi-part subsystem. The first arc gates Forest Path entries via a simple `wander ≥ 5` prereq (declared invention); forks adding multi-part actions wire the canonical bridge.
- **Additional zones** — vanilla idle-loops ships zone 2 (Merchanton) and beyond. The first arc stops at Forest Path; forks extending the world add zones via the existing zone-module shape.

### Loop start trigger & restart

- Loop paused at boot. First enqueue → queue auto-dispatches → loop's `'start'` subscription flips `loop.running` true.
- Empty queue mid-run → `shouldRestart` → loop ends → `onRestart` resets per-loop state, re-readies plan, pauses again if plan empty.
- `pauseBeforeRestart` toggle — INCLUDE (vanilla canonical UX).
- Manual restart button — INCLUDE.
- Game-speed multipliers — INCLUDE (`SPEED_OPTIONS` exposed via the loop module). Forks can disable by binding speed to 1×.

### Loop reset

`createLoop({ endCondition: () => mana.lte(0) || queue.shouldRestart, thingsToReset, onBeforeRestart, onRestart })` + `createRetentionPolicy({ keep: [...talent.xp refs, ...progressVar.xp refs, ...action.timesCompleted refs, ...regularVar.total refs] })`. Snapshot/restore around the reset:

- **Resets per loop:** stat Level XP, action progress, mana, manaAdded, queue cursor + per-item `loopsLeft`, regularVar `checked` and `good`, gold.
- **Persists:** stat Talent XP, action `timesCompleted`, progressVar XP, regularVar `total` (derived from progressVars; cached persistent), queue plan structure (items + declared loops), `repeatLastAction` setting, `pauseBeforeRestart` setting.

### No separate prestige tier

The loop *is* the retention-tier reset. Fork-extension territory: a Lloyd-shaped talent-tree (spendable points from Talent levels), a PK-2-shaped multi-layer soulstone tree, or an Increlution-shaped reincarnation prestige.

### Cardinality cross-check

The exemplar lineage operates at much higher cardinality (vanilla idle-loops-ng: ~50 actions across 6 zones, 9 progressVars, 8+ regularVars; PK: ~40 jobs/skills across 4 lifetime tracks). The first-arc port deliberately ships the converged floor — enough to exercise every canonical frame, not enough to be a real game. Forks raise cardinality in `data/actions.ts` / `data/progress-vars.ts` / `data/regular-vars.ts` / `data/zones.ts` without touching engine wiring.

---

## 6. UI prescription

- **Primary shell:** `ThreePanelShell` — time-loop weak majority per `subgenre-shell-mapping-2026.md` § "time-loop" (2/5 classifiable, at the 40% threshold). Shell matches both primary idle-loops-lineage exemplars. Exemplar rows from `layout-audit-2026.md`: Idle Loops, Omsi Loops.
- **Secondary shell:** `MultiColumnShell` — extension shape for Cavernous-style per-clone queue richness; one classifiable time-loop row per `subgenre-shell-mapping-2026.md`. Use when the fork adds parallel-clone or parallel-loop content that outgrows three columns. Exemplar row: Cavernous II.
- **Form-factor intent:** `desktop` — time-loop corpus is desktop-dominant per `layout-audit-2026.md` distribution (no mobile-aware majority in the sub-genre). Queue-editing interaction is pointer-primary; touch-first is a declared-invention territory Looper does not claim.
- **ARIA-aligned widgets (lift targets):**
  - `Tooltip` — action / stat / progressVar tooltips with segmented XP + cost breakdowns (`AppTooltip.vue` + `composables/tooltips/actionTooltips.ts`). Cites `widget-vocabulary.md` Layer 1 (frequency 5).
  - `Dialog` — settings, save-slot picker, fork-extension automation / loadout pickers. Cites `widget-vocabulary.md` Layer 1 (frequency 6).
  - `Progress` — current-action completion bar, mana gauge, segmented stat-XP / progressVar-XP bars (Level + Talent layers via `--progress-exp` / `--progress-talent` tokens). Cites `widget-vocabulary.md` Layer 1 (highest frequency, 12).
  - `Tabs` — zone switching inside the town column (one tab per zone). Cites `widget-vocabulary.md` Layer 1 (≥30 corpus rows carry tab-nav).
- **Domain widgets (archetype-colocated under `ui/components/`):**
  - **action queue** — Looper-signature widget. `NextActionList` + `NextActionRow` deliver drag-to-reorder with per-item loop count and auto-repeat toggle; `next-action-drag.ts` carries the drag impl. Cites `widget-vocabulary.md` Layer 2 (frequency 5; Idle Loops and Cavernous II exemplify drag-to-reorder).
  - **resource bar** — `HeaderBand` is the always-visible pacing strip: mana gauge, gold readout, loop count, current-talent-multiplier digest. Cites `widget-vocabulary.md` Layer 2 (frequency 11).
  - **progress track** — `CurrentActionList` + `CurrentActionDetail` render the currently-ticking action with embedded progress and look-ahead preview. Cites `widget-vocabulary.md` Layer 2 (frequency 7).
  - **stat panel** — `StatsPanel` renders the 9-stat grid with a radar-chart toggle (hand-rolled SVG; mode toggle persists per slot). Cites `widget-vocabulary.md` Layer 2 (frequency 6).
  - **town column** — `TownColumn` holds the zone-tabbed action drawer with prereq-driven action visibility and inline progressVar readouts.
- **Layout detail:** three-panel region assignment — **left** holds `StatsPanel`; **centre** holds `TownColumn` (zone tabs + action drawer); **right** stacks `HeaderBand` over `ActionColumn` (which composes `NextActionList` + `CurrentActionList` + `CurrentActionDetail`). Modals (`Dialog`) host save-slot picker and settings via the `AppFrame`-level modal stack.
- **Nav pattern:** horizontal tab bar for zones inside `TownColumn`, not at shell level. Matches idle-loops lineage per `layout-audit-2026.md` row: Idle Loops ("top tabs (town location switching)").

---

## 7. Predicted engine gaps

Both live consumers flag overlapping gaps; convergent TODOs get higher severity.

| Gap | Severity | Notes |
|-----|----------|-------|
| Multi-part action primitive | High (filed candidate-primitive) | idle-loops-ng `multi-part.ts` docstring: *"Engine has no first-class multi-segment action pattern. If second consumer needs it, extract a primitive."* Incloneution's construction-progress inlining is a different workaround for overlapping need. Filed as a candidate-primitive ticket alongside the OL-742 umbrella; demo defers cleanly without it. |
| Sequencer reactivity hack | Medium | incloneution wraps the sequencer `items` array with a manual `queueVersion` counter to force Vue reactivity (`actions.ts:78-80`). A reactive sequencer ref would eliminate this in every Vue-based consumer. |
| Cross-action affected-by / bonus composition | Low | idle-loops-ng `affected-by.ts` — actions scaling by other action levels. First-arc port has no entry vector (canonical sources are skills/buffs/inventory items, all out of scope here); the gap re-asserts when a fork pulls those subsystems in. If Scripter (cluster #1) needs a similar cross-reference mechanism, the primitive might serve both. |
| Mana-cost contribution registry | Medium | idle-loops-ng TODO(OL-246) — `view.adjustManaCost` wiring via contributor registry. A "modifier chain for action costs" could be the right shape. |
| Tick drift under variable dt | Medium | incloneution `main.ts:28-32` + OL-466 — fixed-step workaround. Loopers with speed multipliers > 1× diverge between `lifeTime` and `depth` unless forced to `tickMode: 'fixed'`. Engine default could change, or a speed-safe path could land. |
| Game-active gating via circular-injection callback | Low | incloneution `time.ts:21-24` — OL-63 deferred. Event-bus migration resolves this. Cosmetic. |
| Zone-scoped content queries | Low | "Show only actions in current zone" is manual filtering in both consumers. Producer doesn't need this; Looper, Explorer, and Interlocker all do. Graduate a helper after the third consumer. |
| Layered mod content composition | Unknown | idle-loops-ng mod lineage (OMSI → Lloyd → Squirrel) composes via dependency injection with ad-hoc `includes content-X` comments. If other archetypes want this (Scripter especially), the engine lacks a first-class content-overlay primitive. Prototype before graduating. |

---

## 8. Themes

### Theme A — Vanilla idle-loops (the demo's costume)

- **Hook:** Classic-adventuring port. The starter ships transparently as a first arc of vanilla idle-loops — Beginnersville and Forest Path, mana-as-time, the 9-stat palette as proficiencies. No rename pass; ids and numbers come from `idle-loops-ng/src/`. Forks rename for theme; the demo doesn't.
- **Resource mapping:** time-budget = mana; secondary currency = gold (per-loop); retention tracks = stat Talent + progressVar XP (`wander`, `met`, `forest`, `shortcut`); zones = [Beginnersville, Forest Path]; stats = [Dex, Str, Con, Spd, Per, Cha, Int, Luck, Soul].
- **Narrative framing:** light — flavour text on actions, no scripted arc-closure event.

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
- **Engine primitives** → `open-loop-engine/docs/api/INDEX.md` (directory) + per-tier files (resources, mechanics, content, lifecycle, engine, advisors, spatial, harness)
- **Corpus games** → `open-loop-research/analyses/complete/*-analysis.md`
- **Layout shells** → `open-loop-starter/src/lib/shells/`
- **Live consumers** → `/work/studio/idle-loops-ng/`, `/work/studio/incloneution/`
