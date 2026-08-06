# Looper — archetype identity (idle-loops first-arc port)

> **Resource-gated Loop + Retention Policy + Skill-accumulator mastery +
> Zone-gated Action Queue** — the repetition-with-retention incremental.
> A run feels like a rehearsal; next run you do it faster and further.

**Subtractive clone** (see `../README.md` § Two honest ways to source numbers):
a direct lift of idle-loops vanilla via the `idle-loops-ng` TypeScript
modernization, cut down to the first arc. Per-action numbers (manaCost, weights,
rewardRatio, progressAmount) are carried 1:1 with `data/actions.ts` header
citations; the port's job is fidelity, not re-balance. Not the forward model —
the older direct-cut-down path. The only surface the solver perturbs is the
three cross-cutting `LooperTunableKey` scalars (§ Arc substitutions). Identity
line source: `archetypes/_identity.md` (Looper row).

## What this archetype is

You queue a sequence of actions inside a strictly limited time budget — a mana
pool that drains as each action ticks. When it's gone the run ends: most of what
you built resets, and a thin layer of permanent mastery (talents, town-progress
XP, loadouts) carries to the next run. The compulsion loop is *"next run I'll do
it faster and further,"* and over six or eight runs you reach things you couldn't
touch on run one.

A thirty-minute session is a sequence of queue edits. You notice a skill that's
now underpowered, or a zone you can just barely reach, and reorder your plan
accordingly — between runs you are never idle, you're reading the queue, the
skill readouts, the retention track, deciding what run N+1 buys you that run N
didn't. The long-term pull is *compounded efficiency*: a first-run player takes
ten minutes to reach the second zone; an experienced player reaches it in thirty
seconds and spends the remaining mana somewhere deeper. The game is the diff
between those two runs. Moment-to-moment input is low — the loop auto-restarts
and the retained state carries forward without a click; the depth lives in the
queue-authoring decision space.

## Rate-function spine / bucket

**Bucket: discrete planning / scheduling — no single closed form.** Looper's
economy is queue-of-queues hierarchical planning over deterministic transitions,
so its pacing is not a fire-time curve but a *trajectory* the solver constructs
under a parameter setting. The lifted numbers still fall into named shapes —
level-XP curve, adjusted-ticks (`ceil(manaCost × costMult)`), talent multiplier,
regular-var pool sizing, gold↔mana exchange — with closed-form receipts for each
subsystem at `open-loop-research/methodology/techniques/closed-form-progression/per-archetype/looper.md` (18
rows, source-line cited across the vanilla / dmchurch / omsi / lloyd / squirrel
variants). But the economy *as a whole* has no projectable closed form, which is
why balance here is **solver-driven** (methodology #7, engine-as-oracle) rather
than projected from a spine.

Two structural properties make it *this* archetype rather than a solo producer:

- **Mana is time, and the loop reset is the prestige tier.** The active loop
  drains mana per tick; mana drained equals action progress made, frame for
  frame. When mana depletes the loop restarts automatically — stat levels and
  per-loop pools reset, while talents, town-progress XP, and the loop counter
  survive along the retention channel. Cross-loop progression spends mana to grow
  state that makes future loops larger or unlocks content unreachable before.
- **Queue choice at loop N is coupled to expected state at loop N+1.** Greedy
  outer search (minimise per-loop time) over-spends mana on actions that don't
  compound and gets trapped behind unlock cliffs. Intermediate loops can be
  intentionally *sacrificial* — mana-negative runs spent purely growing a
  progress var that pays off next loop. This coupling is what the solver searches
  and the signature the harness measures.

## The loop — beat map

Six ordered player-experience phases across the first-arc budget (~25–45 min of
sim-time to `forest ≥ 1` under canonical settings); the phase order and each
phase's intent are **fixed identity**, but the concrete goal predicate expressing
a phase is measured (in `balance/goals.ts`, solver-reached), never authored:

1. **first-loop-completes** — onboarding: mana depletes, the loop restarts, state
   carries forward (the loop reset is the prestige tier).
2. **first-progress-level** — first persistent gain visible: wander reaches level
   1, the pots-pool grows for next loop.
3. **first-unlock-cliff** — first content unlock: `wander ≥ 5` reveals Forest Path
   and the Wild Mana action (goal `reach-forest-1`).
4. **first-burned-run** — the sacrificial loop discovered: a mana-negative loop
   spent purely growing wander pays off next loop.
5. **stat-tier-compound** — the two-axis stat split confirmed: Talent compounds
   via `Per ≥ 1` across loops, unlocking Gather Herbs (goal `stat-tier-compound`).
6. **first-arc-completion** — Forest Path meaningfully entered; wander has driven
   multiple unlock cliffs (goal `wander-time-bound`).

A fork changing the loop-reset-as-prestige structure or the queue-authoring
centerpiece has forked into a sibling archetype.

## Canonical exemplar + arc scope (the clone ledger)

**Canonical exemplar:** idle-loops vanilla, via the `idle-loops-ng` TypeScript
modernization — first arc only.

- **Arc scope:** Beginnersville + Forest Path zones; ~9 actions, 4 progress vars,
  4 regular vars, 9 stats. Out of scope: soulstones, dungeons, multi-part
  progress bars, multi-zone narrative arcs, the Practical/Combat/Dark skill axes,
  and the +50 later actions.
- **Auto-loop ships, not a bespoke bot.** The KS-style auto-restart + declarative
  carryover are shipping game code (`modules/loop.ts`: engine `createLoop` +
  `createRetentionPolicy`), with `pauseBeforeRestart` / `pauseOnFailedLoop` as the
  player-facing controls. The action queue is the player's strategy surface — the
  looper analogue of an automation profile. There is no separate
  `modules/automation.ts`: the loop *is* the automation.

## Arc substitutions (the perturbation surface)

Per-action numbers are vanilla canonical and carried 1:1 — perturbing them
deforms the canonical economy. Forks balance by perturbing the three
cross-cutting `LooperTunableKey` scalars and re-running the solver to verify
design intent stays reachable within the arc budget:

- **`balance/initialMana`** (250 canonical) — the per-loop time budget.
- **`balance/costDivisor`** (100 canonical) — stat-level cost-reduction divisor;
  live closure at `action-runner.ts`.
- **`balance/talentAccrualRatio`** (0.01 canonical) — talent-XP accrual fraction;
  the cross-loop compounding rate. Load-bearing only at hundreds-to-thousands of
  loops, past the first-arc trajectory.

See `LooperTunableKey` in `modules/tuning.ts`.

## Engine fit (pattern → primitive)

| Pattern | Engine primitive | Note |
|---|---|---|
| Resource-gated Loop | `createLoop` (endCondition, thingsToReset, counter, best time) | `mana ≤ 0 ∨ queue exhausted` ends the loop; auto-restarts |
| Retention Policy | `createRetentionPolicy` (`keep` list) | talents, town-progress XP, loadouts survive the reset |
| Skill-accumulator mastery | `SkillCategory` — level + talent tiers | level XP resets per loop; talent XP persists and compounds |
| Zone-gated Action Queue | Sequencer (`activeLoopQueue` / `editLoopQueue`) + zone unlock gates | `restartActionQueue` promotes edit → active on restart |
| Mana is time | per-tick drain `round(tickRate × dt)` | mana drained == action progress made |
| Perturbation | module `TuningRegistry` (`tunable()`) | only the three declared scalars |

## Balance model — three lanes

Solver-driven (methodology #7): the economy has no closed form, so the solver's
chosen trajectory *is* the canonical reference. See `../README.md` § Balance:

```
data/*.ts ─ Balance ─   →   balance/*.ts (vite-node solver family)         →   verify-probe.ts golden
idle-loops-ng lens          A*/beam search + sim substrate + sweeps            trajectory-waypoint lock
"what the canon says"       "what shipping code does under the solver"         "same settings → same trajectory"
```

1. **Lens** — the `// ─── Balance ───` sections in `data/*.ts` cite each lifted
   value's `idle-loops-ng` source; the algebra receipts live at
   `closed-form-progression/looper.md`.
2. **Probe** — the solver family, all reading cross-loop state through the same
   module-public accessors the UI reads (`getStatLevel`, `getProgressLevel`,
   `getLoopCount`), never re-implementing mechanics: `solver.ts` (A*(h=0) + beam
   search over the decision-point tree), `bot.ts` (the queue-executing sim engine
   the search drives via `importSave` + schedule injection — harness-side
   frontier tooling, not shipping play), `goals.ts` (goal predicates), and the
   runnable drivers `solve-probe.ts` (feasibility-frontier sweep over
   `LooperTunableKey`) and `algorithm-comparison-probe.ts` (the A*-vs-beam
   verdict regenerator).
3. **Lock** — `balance/verify-probe.ts` diffs the canonical A\* trajectory's
   cross-loop waypoints against a checked-in golden with per-field tolerance.
   There is **no `sim/*.probe.test.ts` vitest lock**: looper has no closed-form
   predictor to pin, so the vite-node waypoint regression is its equivalent —
   "same canonical settings → same trajectory → same per-step state arrival."

## Cross-references

- Progression appendix (solver + balance foundation): `PROGRESSION.md` —
  per-tick mechanics, state partition, queue-mutation taxonomy, XP accrual.
- Exemplar (shape validation, not a lift target): idle-loops vanilla via
  `idle-loops-ng`; closed-form receipts at
  `open-loop-research/methodology/techniques/closed-form-progression/per-archetype/looper.md`.
- Umbrella: `studio/open-loop-starter#9` (canonical-surface sweep); `#13` (this leaf).
- Sibling clones: `src/showcase/archetypes/scaler/`, `.../interlocker/`, `.../defender/`.
- Methodology + balance kit: `../README.md`, `archetypes/BALANCING.md`,
  `archetypes/BALANCING-looper.md`.
- Engine API: `open-loop-engine/docs/api/INDEX.md`, `consumer-guide.md`.
