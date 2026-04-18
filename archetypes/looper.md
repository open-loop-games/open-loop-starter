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

The 1–2h arc compresses the reference-game scope (Idle Loops' 4–8h time-to-first-prestige becomes Looper's ~30–50 min time-to-first-meaningful-retention). Forks that want longer pacing tune up the time-resource pool and retention-curve slope.

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

## 5. Vars schema

```ts
// archetype.ts — skeleton defaults
export interface LooperArchetypeVars {
  // Loop mechanics — structural choices that distinguish sub-archetypes.
  loopTriggerMode: 'resource-depletion' | 'death' | 'manual' | 'hybrid';
  queueMode: 'single' | 'dual-edit-active';

  // Content shape.
  zoneCount: number;                // default 4
  skillCount: number;               // default 5
  actionCount: number;              // default 20 (across zones)

  // Retention architecture.
  retentionTrackCount: number;      // default 2 (loop-xp + permanent-xp; optionally + soulstones)
  automationUnlockTier: 'beat-6' | 'beat-7' | 'beat-8' | 'disabled';
}

// theme.ts — costume, no mechanical impact
export interface LooperThemeVars {
  timeResourceName: { singular: string; plural: string };     // 'mana' / 'mana' / 'heartbeat' / 'ticks'
  loopCompletionVerb: string;                                 // 'reset' / 'reincarnate' / 'wake up' / 'rewind'
  retentionTrackNames: string[];                              // ['soulstone', 'instinct', 'talent']
  zoneNames: string[];                                        // length = zoneCount
  skillNames: string[];                                       // length = skillCount
  actionFlavour: Array<{ label: string; description: string; zone: string }>;
  endOfArcMessage: string;                                    // fires at beat 8
}

// balance.ts — mechanical overrides; drives beat timing
export interface LooperBalanceVars {
  timeResourcePoolBase: DecimalSource;     // default '4000' (idle-loops-ng baseline)
  firstLoopTargetDuration: number;         // seconds sim-time, default 180

  actionCostScaling: {
    baseCost: DecimalSource;               // first-zone first-action base
    skillLevelDivisor: number;             // e.g. 100 (cost = base / (1 + level/100))
  };

  skillLeveling: {
    xpPerAction: DecimalSource;            // base XP rate
    xpToLevelFormula: 'sqrt' | 'log2' | 'linear';
    xpToLevelDivisor: number;              // formula parameter, default 100
  };

  retentionCurve: {
    // Canonical form: multiplier = 1 + (track^exponent) / divisor
    exponent: number;                      // default 0.8 (idle-loops-ng soulstones)
    divisor: number;                       // default 30
  };

  zoneUnlockThresholds: Array<{
    zone: string;
    trigger: 'action-completion-count' | 'skill-level' | 'loop-count';
    value: number;
  }>;

  automationUnlockLoop: number;            // loop N at which automation tier 1 appears, default 8
}
```

**Override semantics:** deep-merge at load order `archetype → theme → balance`. Tests pass an override object to `runSim`.

**Codegen contract:** `pnpm codegen:archetype-vars looper` (pending) reads this section and emits `src/modules/mods/<game>/vars/{archetype,theme,balance}.ts` with matching defaults. Shared archetype-level types + defaults live at `src/archetypes/looper/`.

---

## 6. Balance probes

| Probe | Perturbation | Target beat(s) | Tolerance | Rationale |
|-------|--------------|----------------|-----------|-----------|
| `time-pool-base` | `timeResourcePoolBase` ×[0.80, 1.20] | 1, 2, 8 | Beat sim-time ±25% | Time-budget shape is the dominant pacing lever — it sets every beat's ceiling. |
| `retention-curve-exponent` | `retentionCurve.exponent` ×[0.90, 1.10] (≈±10% on 0.8 baseline) | 4, 8 | Retention multiplier at beat 4 within [1.02×, 1.25×] | Enforces the design assertion: *retention must be perceptible in first 10 actions of next loop.* If this probe violates, the archetype's core compulsion is broken. |
| `skill-level-divisor` | `actionCostScaling.skillLevelDivisor` ×[0.80, 1.20] | 3, 6 | Beat sim-time ±20% | Cost-divisor shape governs within-loop speedup — if wrong, skills don't feel earned. |
| `zone-unlock-threshold-first` | first-zone unlock threshold ×[0.75, 1.25] | 5 | Beat sim-time ±30% | Mid-arc pacing — earliest zone unlock is the most visible pacing moment. |
| `queue-reorder-friction` | simulate auto-repeat vs. forced-replan between loops | 6, 7 | beat-6 lands with fewer reorders when auto-repeat enabled | Validates automation tier payoff — players should feel the automation unlock shorten their planning load. |

**Minimum probe count:** 5 (meets ≥4 requirement; covers time pool, retention curve, skill-level effect, zone pacing, and automation payoff).

---

## 7. Sim assertions

```ts
import { describe, it, expect } from 'vitest';
import { runHeadless } from 'open-loop-engine';
import { runMatrix } from 'open-loop-engine/harness';
import { minutes, seconds } from '@/test/time';
import { loadLooperVars } from '../vars';
import { buildLooperEngine } from '../engine';

describe('looper — beat map', () => {
  const vars = loadLooperVars();

  it('beat 1: first action ticks and budget drains within 0–30 s', async () => {
    const result = runHeadless({
      engine: buildLooperEngine(vars),
      until: (state) => state.queue.current !== null && state.timeResource.lt(state.timeResourceMax.mul(0.95)),
      maxSimTime: minutes(1),
    });
    expect(result.simTime).toBeBetween(seconds(0), seconds(30));
  });

  it('beat 2: first loop ends within 2–6 min', async () => {
    const result = runHeadless({
      engine: buildLooperEngine(vars),
      until: (state) => state.loopCount >= 1,
      maxSimTime: minutes(10),
    });
    expect(result.simTime).toBeBetween(minutes(2), minutes(6));
  });

  it('beat 4: first permanent retention visible within 12–22 min', async () => {
    const result = runHeadless({
      engine: buildLooperEngine(vars),
      until: (state) => state.retentionTracks[0].gt(0),
      maxSimTime: minutes(30),
    });
    expect(result.simTime).toBeBetween(minutes(12), minutes(22));
  });

  // one it() per beat — full enumeration in the checked-in test file
});

describe('looper — balance robustness', () => {
  it('retention is perceptible in first 10 actions of next loop', async () => {
    // The design-assertion probe. Runs loop N to completion, starts loop N+1,
    // measures cost/speed of first 10 actions. Retention bonus must yield
    // a ≥2% improvement over loop N's first 10 actions.
    const matrix = runMatrix({
      engine: (v) => buildLooperEngine(v),
      baseVars: loadLooperVars(),
      perturbations: [
        { path: 'balance.retentionCurve.exponent', values: [0.72, 0.80, 0.88] },
      ],
      beats: ['retention-perceptibility'],
    });
    for (const cell of matrix.cells) {
      expect(cell.retentionGainAtLoop2FirstTen).toBeGreaterThan(0.02);
    }
  });

  // one it() per probe from § 6
});
```

**Required test count:** 8 beats + 5 probes = 13 tests minimum. Tests checked into `src/modules/mods/<game>/sim/looper.sim.test.ts`.

---

## 8. Content sketch

- **Resources:** 1 primary time-budget resource (mana/health/ticks) + 1–3 retention tracks (soulstones, instinct, optional talents).
- **Zones:** 4 — progressively unlocked. Example naming scale: starting-town, wilderness-path, second-town, threshold-region. Each zone exposes 4–6 actions.
- **Skills:** 5 — cover distinct action families (combat, magic, craft, diplomacy, exploration).
- **Actions:** 20 across zones. Minimum cadence: each zone has ≥1 action that grants each skill's XP.
- **Progression gates:** zone unlocks via action-completion count or skill threshold; automation tier 1 via loop count.
- **Queue:** single or dual (edit + active); drag-drop reorder; per-item loop count; auto-repeat toggle.
- **UI layout:** `ThreePanelShell` from `src/lib/shells/` — left: action drawer (zone-filtered); centre: queue editor + current-run readout; right: skills panel + retention tracks.

**Density target:** beat 1 → queue + first action ticking; beats 2–3 → loop & within-loop progression (actions + skills); beat 4 → retention-track readout; beat 5 → second zone + its actions; beat 6 → queue re-editing affordance (drag handles, loop-count inputs); beat 7 → automation toggle; beat 8 → final zone + end-of-arc flavour event.

---

## 9. Predicted engine gaps

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

## 10. Themes

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
