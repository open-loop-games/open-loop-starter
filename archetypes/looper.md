# Archetype: Looper

> **One-line identity:** Resource-gated Loop + Retention Policy + Skill-accumulator mastery + Zone-gated Action Queue — the repetition-with-retention incremental.
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
- **Dual-tier XP** — XP (loop-local) + Talent/Instinct (persistent with retention curve) + optional Soulstone (cross-prestige). idle-loops-ng ships all three; incloneution ships two.

**Novel-patterns cluster alignment:**

- **Cluster #2 (Mastery & Specialisation Architecture)** — Looper *requires* this cluster; it is the component that makes the loop worth repeating.
- **Cluster #1 (Programming-as-Gameplay)** — adjacent but distinct. Looper's queue is drag-drop/visual; the Scripter archetype covers code-as-gameplay. An action queue is not a program, even when it's programmable-feeling.
- **Cluster #5 (Time Management & Resource Constraints)** — Variation B Loopers use mana-as-time directly; Cluster #5 describes the constraint flavour.

---

## 3. Engine surface

| Layer | Primitive | Role in this archetype |
|-------|-----------|------------------------|
| core | `createResource` | Time-budget resource (mana/health/ticks) + persistent retention tracks (soulstones, instinct, talents). |
| core | `createModifierChain` | Skill-level cost divisors, retention bonuses, cross-skill synergies. |
| core | `createMultiplicativeModifier` | Per-skill bonus sources composed into the chain. |
| core | `createSequentialModifier` | Ordered modifier stacks where evaluation order matters (gen × instinct × tool × global). |
| core | `createSequencer` | The action queue. Single or dual (edit + active). |
| core | `createCompositeStrategy` | Automation fill — emergency resources, priority sweeps, idle-worker assignment. |
| core | `createTimedProgress` | Active + passive progress tracking per action; NG+ parallel ticking (incloneution). |
| core | `withChain` | Attributing XP/progress into specific modifier chains for trace-view readability. |
| core | `runHeadless` | Beat-timing sim tests. |
| systems | `createSkillCategory` | Skill registry — levels + XP per skill. |
| systems | `createLoop` | Reset orchestration — thingsToReset + onBeforeRestart + onRestart hooks. |
| systems | `createRetentionPolicy` | Declarative list of Persistent refs that survive the loop reset. |
| systems | `createZoneSystem` | Chapter/town gating — zone-completion unlocks next zone; per-zone content visibility. |
| systems | `createPersistentEffectSystem` | Buffs / debuffs / challenge-modifier effects with duration and stack semantics. |
| systems | `createContentRegistry` | Bare content registry when ActionCategory wrapper is too opinionated (idle-loops-ng uses this for action-type dispatch). |
| harness | `runMatrix` | Probe robustness across vars space. |

**Engine systems explicitly not used (required):**

- `createProducerCategory` / `createScalingPurchasable` — Loopers express production through actions, not producers. If you reach for producer-category in a Looper, you're building Producer or Interlocker, not Looper.
- `createAchievementCategory` — achievements are optional in Looper; the retention curve is the progression reward. Forks may add them as a cosmetic layer.
- `createPurchasableCategory` — Looper shops are rare (Omsi has one); when present they're a specific optional modifier, not part of the skeleton.

**Primary stress axes:**

1. **Reset correctness.** The loop must zero exactly the refs in `thingsToReset`, preserve exactly the refs in the retention policy, and survive hundreds of repeated resets without state drift. Incloneution's retention-as-flat-list and idle-loops-ng's snapshot/restore are two implementations; both must produce identical observable behaviour on edge cases (partial retention, mid-action resets, save/load across reset).
2. **Queue re-planning UX.** Players edit the queue mid-run, between runs, and via saved loadouts. The sequencer's reactivity and editability must hold up under the dual-queue pattern (one queue running, another being edited). idle-loops-ng's `activeLoopQueue`/`editLoopQueue` split is the canonical shape.
3. **Retention curve perceptibility.** The research-derived design assertion: *retention bonus must be perceptible in the first 10 actions of the next loop.* If it isn't, the archetype's core compulsion fails. This is a balance probe, not a code test.
4. **Zone-scoped content queries.** "Show only actions whose zone is unlocked AND visible" is manual filtering in both consumers today. If three Looper games re-derive this, it graduates to a helper.

---

## 4. Beat map

The 2h arc compresses the reference-game scope (Idle Loops' 4–8h time-to-first-prestige becomes Looper's ~12–22 min time-to-first-meaningful-retention). The arc is **continuous**, not cumulative: Looper's identity is *visible compounding within a session*, not "play forever." Forks extending past ~3h or compressing below ~90min are reshaping, not retuning. Forks that want longer pacing tune up the time-resource pool and retention-curve slope.

| # | Beat | Target sim-time | Trigger condition | Player-visible signal | Why it matters |
|---|------|-----------------|-------------------|------------------------|-----------------|
| 1 | First action ticking, time budget visibly draining | 0:00–0:30 | `queue.current !== null` AND `timeResource` below 95% | Action progress bar advances; time-budget gauge ticks down | Onboarding — confirms the core "actions cost time" feedback loop |
| 2 | First loop ends (budget depleted or death) | 2:00–6:00 | `loopCount >= 1` | Reset flash; queue re-readies; retention track gains a sliver | Introduces the reset cadence — most of what you built went away, a thin trace remains |
| 3 | First skill level within a run | 6:00–12:00 | any skill reaches level 1 within current loop | Skill row highlights; cost divisor visibly changes | The within-loop progression loop — runs get measurably faster *inside* a run, not just across them |
| 4 | First permanent retention visible between runs | 12:00–22:00 | first retention-track accumulator crosses first non-zero threshold | Cross-loop bonus readout shows a number > 1.00× | The archetype's core compulsion — *"next run I'll have this much more"* |
| 5 | First zone unlock | 18:00–32:00 | second zone becomes accessible | New zone tab/panel lights up; its actions appear in the action drawer | Spatial progression — content reveal through loop repetition |
| 6 | First action-queue reorder to exploit retention | 32:00–55:00 | player reorders queue between runs (heuristic: `queue-edit-count >= 3` between loops N and N+1) | Queue edit UI used; strategy note panel updates | Validates the *plan→run→observe→replan* meta-loop that distinguishes Looper from Producer |
| 7 | First automation tier unlock | 55:00–85:00 | automation condition met (usually: N loops completed, or specific skill threshold) | Automation toggle appears; auto-repeat/auto-queue becomes available | The idle graduation — player stops hand-tending every run |
| 8 | Arc closure: retention visibly compounding + final first-arc zone reachable | 85:00–120:00 | final zone's first action accessible AND retention track shows compound growth over ≥5 loops | End-of-arc flavour event; retention-over-time chart shows curve | The 1–2h showcase closure. Fork extends beyond here; skeleton stops |

**Arc closure beat:** #8.

---

## 5. Data shape

Per the data-first archetype convention (`open-loop-starter/CLAUDE.md` § Archetype convention), the demo's content lives flat in `src/archetypes/looper/data/*.ts` as plain typed arrays + balance constants. The skeleton/theme/balance lens lives as comment sections (`// ─── Skeleton ───`, `// ─── Balance ───`, `// ─── Costume ───`) inside each data file, not as a parallel filesystem layer. Mechanical fields and theme strings are co-located per def — what idle-loops-ng's `vanilla-actions.ts` and incloneution's `data/jobs.ts` already ship, what Producer's `data/producers.ts` and Ambient's `data/auto-producers.ts` formalize for the archetype demos. No `vars/` extraction layer, no codegen round-trip.

### File split

| File | What it owns |
|---|---|
| `data/types.ts` | All `*Def` interfaces, the `LooperBalance` constants shape, the `LooperGameState` typed read-view interface, the `LooperData` barrel type. |
| `data/skills.ts` | `SKILLS: SkillDef[]` — the gen+instinct two-tier skill registry (Combat / Magic / Practical / Alchemy / Crafting per Theme A). |
| `data/zones.ts` | `ZONES: ZoneDef[]` — ordered zone defs with per-zone unlock predicates (`requires: ZoneRequirement[]`). Zone 0 is `initiallyUnlocked`. |
| `data/actions.ts` | `ACTIONS: ActionDef[]` — flat array, each action carries its zone, its mana cost, and its XP-grant table (`xpGrants: { skillId, xp }[]`). |
| `data/balance.ts` | `LOOPER_BALANCE: LooperBalance` — the constants set the solver bisects against. |
| `data/index.ts` | `DEFAULT_LOOPER_DATA` barrel + per-file re-exports. |
| `data/overrides.ts` | `LooperOverrides` flat-category override shape + `applyLooperOverrides(base, overrides)` (throws on unknown id; mirrors `applyProducerOverrides` / `applyAmbientOverrides`). |

### Definition shapes (TS-signature reference)

The interfaces below describe the demo's data; they are not a contract for fork-day-one consumers. Forks restructure freely as long as the layering rule (`data → modules → composables → ui`) and the engine-runtime-free invariant on `data/*.ts` are preserved.

```ts
// data/types.ts (illustrative)

export interface SkillDef {
  id: string;            // 'combat' | 'magic' | 'practical' | 'alchemy' | 'crafting'
  name: string;
  description: string;
}

export type ZoneRequirement =
  | { trigger: 'action-completion-count'; actionId: string; value: number }
  | { trigger: 'skill-level'; skillId: string; tier: 'gen' | 'instinct'; value: number }
  | { trigger: 'loop-count'; value: number };

export interface ZoneDef {
  id: string;            // 'beginnersville' | 'forest-path' | 'merchanton' | 'ruined-keep'
  name: string;
  description: string;
  /** Zone 0 has empty requires; later zones list one or more. */
  requires: ZoneRequirement[];
}

export interface ActionDef {
  id: string;
  name: string;
  description: string;
  zoneId: string;
  /** Mana cost at skill level 0. Effective cost divides by (1 + skillLevel / skillLevelDivisor). */
  baseCost: DecimalSource;
  /** XP grants at completion. One entry per affected skill. */
  xpGrants: { skillId: string; xp: DecimalSource }[];
}

export interface LooperBalance {
  /** Time-budget pool size at loop start. Bisection target for beat-2. */
  timeResourcePoolBase: DecimalSource;
  /** cost = baseCost / (1 + skillLevel.gen / skillLevelDivisor). */
  skillLevelDivisor: DecimalSource;
  /** Instinct XP grant per gen XP earned. Default 0.01 (PK pattern). */
  instinctXpRatio: DecimalSource;
  /** Retention multiplier shape: 1 + (instinctLevel / retentionDivisor) ^ retentionExponent. */
  retentionDivisor: DecimalSource;
  retentionExponent: DecimalSource;
  /** Default `true` — the loop reset *is* the retention/prestige tier; toggling this off makes the demo a one-loop game. Documented in `balance/shape.ts`. */
  loopResetEnabled: boolean;
}
```

### Typed read view (predicate interface)

Achievement / unlock / arc predicates close over a `LooperGameState` typed-read-view (Ambient pattern). The interface is implemented by modules over live injection-key refs; `data/*.ts` never imports the engine runtime.

```ts
export interface LooperGameState {
  manaAtLeast(amount: DecimalSource): boolean;
  skillLevelAtLeast(skillId: string, tier: 'gen' | 'instinct', n: number): boolean;
  actionCompletedAtLeast(actionId: string, count: number): boolean;
  zoneUnlocked(zoneId: string): boolean;
  currentZoneIs(zoneId: string): boolean;
  loopCountAtLeast(n: number): boolean;
  /** Ratio of effective skill multiplier loop-N+1 vs loop-N at the same XP point. */
  retentionMultiplier(skillId: string): number;
  secondsSinceLoopStart(): number;
}
```

### Override surface

`createLooperEngine(overrides?)` accepts a flat-category `LooperOverrides`:

```ts
export interface LooperOverrides {
  skills?:  Array<Partial<SkillDef>  & { id: string }>;
  zones?:   Array<Partial<ZoneDef>   & { id: string }>;
  actions?: Array<Partial<ActionDef> & { id: string }>;
  balance?: Partial<LooperBalance>;
}
```

`applyLooperOverrides` deep-merges `balance` and id-merges the three array categories; unknown ids throw. To wholesale-replace a category, supply the full array. The override surface is what the balance solver perturbs via `pushScope`. Tunable balance constants and solver-bisected per-action / per-zone knobs are wrapped via `tunable()` at consumer sites.

### Mechanical-vs-costume separation

What's mechanical and lives in `data/balance.ts`: `timeResourcePoolBase`, `skillLevelDivisor`, `instinctXpRatio`, `retentionDivisor`, `retentionExponent`, `loopResetEnabled`. What's costume and lives co-located inline per def: action / zone / skill `name` and `description`, the time-resource displayName ("mana"), the loop-completion verb ("reset"), the end-of-arc flavour string. Forks that want a different mood swap costume strings without touching anything else; forks reshaping the archetype touch balance constants and possibly cardinality.

---

## 6. Balance probes

The Locator column splits the probe table per the Tier-A scaffold convention (`open-loop-starter/archetypes/BALANCING.md` § Scripts discover, tests lock + § Engine as oracle): math-only locks live in `sim/balance.probe.test.ts` (vitest, milliseconds, no `runHeadless`); sim-driven probes live in `balance/probes.ts` (vite-node script, tens of seconds, drives the engine through `runUntil`/`runMatrix`). Solver bisections themselves live in `balance/solve.ts` and don't appear in the probe table — they're the discovery tool, not a regression.

| Probe | Perturbation | Target beat(s) | Tolerance | Locator | Rationale |
|-------|--------------|----------------|-----------|---------|-----------|
| `time-pool-base` | `timeResourcePoolBase` ×[0.80, 1.20] | 1, 2, 8 | Beat sim-time ±25% | `balance/solve.ts` (B2 bisect target) + `sim/balance.probe.test.ts` (math-only receipt of solver-converged value) | Time-budget shape is the dominant pacing lever — it sets every beat's ceiling. |
| `retention-perceptibility` | `retentionExponent` ×[0.90, 1.10] (≈±10% on 0.8 baseline) | 4, 8 | At beat 4, retentionMultiplier(loop=2, first 10 actions) ≥ 1.02× | `balance/probes.ts` (sim-driven; runs loop N + loop N+1's first 10 actions, measures sim-time delta) | The archetype's design-assertion probe: *retention must be perceptible in first 10 actions of next loop.* Sim-shaped because it requires a full reset boundary. If this probe violates, the archetype's core compulsion is broken. |
| `skill-level-divisor` | `skillLevelDivisor` ×[0.80, 1.20] | 3, 6 | Beat sim-time ±20% | `balance/solve.ts` (verify-only, content-coupled) + `sim/balance.probe.test.ts` (math-only divisor receipt) | Cost-divisor shape governs within-loop speedup — if wrong, skills don't feel earned. |
| `zone-unlock-threshold-first` | first-zone unlock predicate value ×[0.75, 1.25] | 5 | Beat sim-time ±30% | `balance/solve.ts` (B5 bisect target via `tunable('zones/forest-path/threshold', ...)`) + `sim/balance.probe.test.ts` (receipt) | Mid-arc pacing — earliest zone unlock is the most visible pacing moment. |
| `loop-reset-correctness` | run 5 consecutive loops; assert `keep`-listed instinct refs survive and `thingsToReset` refs zero | every loop | Zero state drift over ≥5 loops | `balance/probes.ts` (sim-driven; mirrors Ambient probe-3's structural-invariant role) | The archetype's structural correctness probe — `createLoop` + `createRetentionPolicy` must produce identical observable behaviour across resets. Sim-shaped because it spans reset boundaries. |

**Minimum probe count:** 5 (meets ≥4 requirement; covers time pool, retention perceptibility, skill-level effect, zone pacing, and reset correctness).

**Probe-scope note for the balance leaf.** `retention-perceptibility` and `loop-reset-correctness` are sim-driven — both span reset boundaries and can't be expressed as math-only receipts. Math-only `sim/balance.probe.test.ts` pins the solver-converged constants (mana pool, skill divisor, zone-unlock thresholds, retention exponent/divisor). Sim-driven `balance/probes.ts` runs the two reset-spanning probes as scripts; failures surface contract breakage.

---

## 7. Sim assertions

The vitest suite under `src/archetypes/looper/sim/` never calls `runHeadless` / `runUntil` / `runMatrix`. Beat verification — anything that requires running the engine forward through real sim-time — lives in the balance lane (`src/archetypes/looper/balance/`). Vitest holds two suites:

- `looper.sim.test.ts` — 8 beats as `it.todo()`. Each `it.todo` carries the beat id and its target window from § 4, naming the predicate the balance lane verifies. Producer / Ambient precedent: the rebuild leaf ships `it.todo()`; the balance leaf converts to bisect-against-windows.
- `balance.probe.test.ts` — math-only regression locks. Receipts on solver-converged knobs and structural sanity checks (e.g. retention multiplier at convergence, content-cardinality minimums). Imports `DEFAULT_LOOPER_DATA` and asserts numeric equality. Runs in milliseconds.

Sim-driven probes (`balance/probes.ts`) and the solver (`balance/solve.ts`) sit alongside, run via `pnpm balance:probes:looper` / `pnpm balance:solve:looper`. They drive the engine through `runUntil` and report findings; they don't run inside vitest.

### Vitest beat suite (illustrative)

```ts
// src/archetypes/looper/sim/looper.sim.test.ts
import { describe, it } from 'vitest';

describe('looper — beat map', () => {
  it.todo('beat 1: first action ticks and budget drains within 0–30 s');
  it.todo('beat 2: first loop ends within 2–6 min');
  it.todo('beat 3: first skill level within a run, 6–12 min');
  it.todo('beat 4: first permanent retention visible, 12–22 min');
  it.todo('beat 5: first zone unlock, 18–32 min');
  it.todo('beat 6: first action-queue reorder to exploit retention, 32–55 min');
  it.todo('beat 7: first automation tier unlock, 55–85 min');
  it.todo('beat 8: arc closure (final zone reachable + retention compound visible), 85–120 min');
});
```

### Math-only regression locks (illustrative)

```ts
// src/archetypes/looper/sim/balance.probe.test.ts
import { describe, it, expect } from 'vitest';
import { DEFAULT_LOOPER_DATA } from '../data';

const { balance, actions, zones, skills } = DEFAULT_LOOPER_DATA;

describe('balance probe — solver-knob receipts', () => {
  it('timeResourcePoolBase matches beat-2 solver convergence', () => {
    expect(Number(balance.timeResourcePoolBase)).toBe(/* solver-pinned */ 4000);
  });

  it('skillLevelDivisor held at the locked value', () => {
    expect(Number(balance.skillLevelDivisor)).toBe(100);
  });

  it('instinctXpRatio held at 0.01 — PK/incloneution baseline', () => {
    expect(Number(balance.instinctXpRatio)).toBe(0.01);
  });

  it('retention curve constants pinned for design-assertion probe', () => {
    expect(Number(balance.retentionExponent)).toBeCloseTo(0.8);
    expect(Number(balance.retentionDivisor)).toBe(30);
  });
});

describe('balance probe — content cardinality minimums', () => {
  it('skill registry meets two-tier minimum (≥ 4 skills)', () => {
    expect(skills.length).toBeGreaterThanOrEqual(4);
  });
  it('zone ladder meets minimum (≥ 3 zones with at least one gated)', () => {
    expect(zones.length).toBeGreaterThanOrEqual(3);
    expect(zones.filter((z) => z.requires.length > 0).length).toBeGreaterThanOrEqual(2);
  });
  it('action set covers every skill at least once', () => {
    const skillIds = new Set(skills.map((s) => s.id));
    const granted = new Set(actions.flatMap((a) => a.xpGrants.map((g) => g.skillId)));
    for (const id of skillIds) expect(granted.has(id)).toBe(true);
  });
});
```

### Sim-driven probes — interface (illustrative)

```ts
// src/archetypes/looper/balance/probes.ts (vite-node script — `pnpm balance:probes:looper`)
import { Decimal, runUntil } from 'open-loop-engine';
import { LoopKey, ManaKey, SkillsKey } from '../modules';
import { buildLooperSimEngine } from './bot';

// Probe: retention perceptibility at beat 4
function retentionPerceptibilityProbe(): { gainPct: number; passed: boolean } {
  const engine = buildLooperSimEngine();
  // Run loop N to completion, snapshot, run loop N+1 for first 10 actions, compare sim-times
  // ... (sim-driven; spans a reset boundary)
}

// Probe: loop reset correctness
function loopResetCorrectnessProbe(): { driftDetected: boolean; loopCount: number } {
  // Run 5 consecutive loops; assert keep-listed instinct refs survive and thingsToReset zero
}
```

### Bot + solver — interface (illustrative)

```ts
// src/archetypes/looper/balance/bot.ts (greedy-queue bot)
export function buildLooperSimEngine(overrides?: LooperOverrides): Engine {
  // mirrors buildAmbientSimEngine; install a balance-bot module that fills
  // the queue with current-zone actions at loop start and toggles auto-restart.
}

// src/archetypes/looper/balance/solve.ts (Gauss-Seidel bisection)
// per-beat bisects on tunable() keys: timeResourcePoolBase, zone unlock thresholds,
// skillLevelDivisor. Mirrors ambient/balance/solve.ts shape exactly.
```

**Required test count:** 8 beat tests (as `it.todo()` after rebuild leaf; balance leaf converts to active assertions where window-driven verification fits) + 5+ math-only probe locks. Tests live at `src/archetypes/looper/sim/{looper.sim.test.ts, balance.probe.test.ts}`.

---

## 8. Content sketch

The converged minimum across the three in-studio Looper clones (`incloneution`, `idle-loops-ng`, `progress-knight-ng`):

- **Resources:** 1 primary time-budget resource (mana). Per-skill `instinct` XP retains across loops via `createRetentionPolicy` (the engine's reset primitive snapshot/restore mechanism — same pattern all three clones use). NO separate "soulstone" / "talent-point" resource in the demo; those are fork-extension territory.
- **Skills:** 5 — Combat, Magic, Practical, Alchemy, Crafting (idle-loops-ng vanilla shape; the Theme A bake). Each skill is two-tier (`gen` resets per loop, `instinct` persists) via `createSkillCategory<SkillDef>` with `mapSkill` building two `LevelDrivenSkill` instances + a composite modifier chain. Mirrors `incloneution/src/modules/skills.ts`.
- **Zones:** 4 — Beginnersville → Forest Path → Merchanton → Ruined Keep. Zone 0 `initiallyUnlocked`; zones 1–3 carry `requires: ZoneRequirement[]` predicates evaluated by a `modules/zones.ts` watch bridge over `createZoneSystem`. Each zone exposes 4–5 actions.
- **Actions:** 16–20 across zones. Each `ActionDef` carries `zoneId`, `baseCost` (mana), and `xpGrants: { skillId, xp }[]` (one or more skills granted XP at completion). Minimum cadence: every skill is granted XP by ≥1 action in every zone. Single-tick actions only; multi-part is filed as a high-severity engine gap (§ 10) and the demo doesn't exercise it.
- **Progression gates:** zone unlocks via `action-completion-count` (cumulative across loops) or `skill-level` (gen or instinct, threshold tier). `loop-count` is supported by the type but unused by the default zone ladder.
- **Queue:** single `Sequencer<ActionMeta>` via `createSequencer({ id: 'looper/queue' })`. Drag-drop reorder; per-item loop count; auto-repeat toggle. The dual-queue (edit-active separation) idle-loops-ng ships is a Lloyd-mod-era UX feature; documented as fork-extension territory but not in the demo.
- **Loop reset:** `createLoop({ endCondition: () => mana.lte(0), thingsToReset, onBeforeRestart, onRestart })` + `createRetentionPolicy({ keep: [...skills.getAll().map(s => s.instinct.xp)] })`. Snapshot/restore around the reset preserves instinct XP; gen XP, action progress, mana, and queue position zero. Mirrors `idle-loops-ng/src/modules/loop.ts` + `incloneution/src/modules/reincarnation.ts`.
- **No separate prestige tier.** The loop *is* the retention-tier reset. Fork-extension territory: a Lloyd-shaped talent-tree (spendable points from instinct levels) or a PK-2-shaped multi-layer soulstone tree.

**Density target:** beat 1 → queue + first action ticking; beats 2–3 → loop completes & within-loop progression (gen-XP gains visible); beat 4 → instinct-XP track readout shows numbers > 0 between loops; beat 5 → second zone unlock fires (Forest Path), its actions appear in the action drawer; beat 6 → between-loops queue reorder UX exercised (drag handles, loop-count inputs); beat 7 → automation tier 1 unlock (loop-count gate, default 8); beat 8 → final zone (Ruined Keep) reachable AND retention compound visible (≥ 5% sim-time delta over 5-loop window).

**Cardinality cross-check.** The three-clone reference lineage operates at much higher cardinality (idle-loops-ng vanilla = 11 progress-vars + 8 regular-vars per zone, ~30+ actions per arc; PK = ~40 jobs/skills across 4 lifetime tracks). The demo deliberately ships the converged floor — enough to exercise the engine surface and beat map, not enough to be a real game. Forks raise cardinality in `data/actions.ts` + `data/zones.ts` without touching the engine wiring.

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
| Multi-part action primitive absent | High | idle-loops-ng `multi-part.ts` docstring: *"Engine has no first-class multi-segment action pattern. If second consumer needs it, extract a primitive."* Incloneution's construction-progress inlining is a different workaround for overlapping need. Two consumers ≠ copy-paste; now is when a primitive earns its keep. |
| Sequencer reactivity hack | Medium | incloneution wraps the sequencer `items` array with a manual `queueVersion` counter to force Vue reactivity (`actions.ts:78-80`). A reactive sequencer ref would eliminate this in every Vue-based consumer. |
| Cross-action affected-by / bonus composition | Medium | idle-loops-ng `affected-by.ts` — actions scaling by other action levels. Novel enough to note; file as research before extracting. If Scripter (cluster #1) needs a similar cross-reference mechanism, the primitive might serve both. |
| Mana-cost contribution registry | Medium | idle-loops-ng TODO(OL-246) — `view.adjustManaCost` wiring via contributor registry. A "modifier chain for action costs" could be the right shape. |
| Tick drift under variable dt | Medium | incloneution `main.ts:28-32` + OL-466 — fixed-step workaround. Loopers with speed multipliers > 1× diverge between `lifeTime` and `depth` unless forced to `tickMode: 'fixed'`. Engine default could change, or a speed-safe path could land. |
| Game-active gating via circular-injection callback | Low | incloneution `time.ts:21-24` — OL-63 deferred. Event-bus migration resolves this. Cosmetic. |
| Zone-scoped content queries | Low | "Show only actions in current zone" is manual filtering in both consumers. Producer doesn't need this; Looper, Explorer, and Interlocker all do. Graduate a helper after the third consumer. |
| Layered mod content composition | Unknown | idle-loops-ng mod lineage (OMSI → Lloyd → Squirrel) composes via dependency injection with ad-hoc `includes content-X` comments. If other archetypes want this (Scripter especially), the engine lacks a first-class content-overlay primitive. Prototype before graduating. |

---

## 11. Themes

### Theme A — Classic adventuring

- **Hook:** The Idle Loops baseline. Mana-as-time, skills as proficiencies, zones as towns along a road. Cultural shorthand for the genre.
- **Resource mapping:** time-budget = mana; retention tracks = [soulstones, talents]; zones = [Beginnersville, Forest Path, Merchanton, Ruined Keep]; skills = [combat, magic, craft, diplomacy, survival].
- **Narrative framing:** light — flavour text on actions, "the sequence frays and you're back where you started" on reset.

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
