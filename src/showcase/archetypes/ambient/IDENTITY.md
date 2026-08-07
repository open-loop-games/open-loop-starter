# Ambient — archetype identity

> **Idle Production + Auto-Production spine + Ambient-Progression engagement
> commitment** — the companion-software incremental, defined as much by what's
> *absent* as by what's present. The game you don't play so much as *keep*.

**Spine-formed.** The Cozy Farm content is declared invention — numbers are
perturbation surface generated against the closed-form spine by engine-as-oracle
bisection, never lifted from a single exemplar.
Anti-Idle (2009), Rusty's Retirement (2024), Chillquarium and Tiny Pasture are the
genre exemplars that validate the shape ships in the wild — cited as a set, never
lifted. Identity line source: `../_identity.md` (Ambient row).

## What this archetype is

You open it once in the morning, glance at it while a pot boils, check it on the
way back from a meeting, let it run at the edge of a monitor for an afternoon.
Resources accumulate whether you are watching or not. Nothing expires, no wave is
about to overrun you, no cooldown is about to waste. The game has committed
*mechanically* to never punishing absence — enemy-scaling and cooldown-urgency are
deliberately missing, not merely unbuilt. What remains is idle production,
auto-production, a slowly unfolding unlock tree, and optional softened prestige.
The relationship is **companionship, not engagement**: the game lives on the
desktop the way a plant lives on a desk.

A thirty-minute session is really seven three-minute glances across the day. Each
glance yields accumulated output, one or two affordable purchases, and
occasionally a new visual element revealed — a building appears, an animal wanders
in, a zone quietly unlocks. The long-term pull is not mastery or compound growth;
it is the pleasant, legible, ongoing state of the thing: *my thing is running, it
is happy, it grew while I was away.*

## Rate-function spine / bucket

**Bucket: geometric cost-scaling × achievement-modifier product, tuned gentle** —
the canonical **Cost-Scaling** family, but with a shallow
`costScaling = 1.08` (vs the genre-default 1.15). Each auto-producer is a geometric price
ladder (`cost = baseCost · 1.08^count`), so its count grows ~logarithmically in
accumulated primary; the shallow ladder is load-bearing — owned-count keeps
climbing for *hours* without a wall, which is what makes the arc multi-hour
cumulative rather than a steep session sprint. The headline rate is
`Σ_tiers (count · baseRate) × achievement-modifier product`. The one structural
departure from the family is the **zero-click contract**: there is no manual trigger,
so all income flows through `getTotalRate` — which lets the harness read the arc
through `stasis-aware-tick` (an economy with an out-of-band rate channel can't;
see `BALANCING.md` § Couplings).

**Where the closed form stops:** nowhere structural — one modeled subsystem
(continuous auto-producers), fully projectable. **What measures the remainder:**
per-beat `runUntil` bisection settles the constants the closed form leaves free,
and the offline round-trip is measured rather than derived. Full coverage, the
simple case.

## The loop — beat map

Six ordered player-experience phases against a 12-hour cumulative arc; the
**measured** windows + predicates live in `balance/beats.ts`, never authored:

1. **first-passive-production** — production visible *without* the player (the
   planter seeds at `initialAmount: 1`, so this fires on cold boot).
2. **first-auto-producer-purchased** — first cost paid; cost onboarding validated.
3. **first-visibility-unlock** — the gentle unfold cadence established.
4. **glance-check-payoff** — leave-and-return rewarded. **Resume-driven** — not
   testable in continuous headless sim (verified at runtime via
   `sessionClock.lastResumeGapSec`); its beat predicate is intentionally absent
   from `beats.ts` and its phase `currentBeatId` is null.
5. **mid-arc-scene-diversification** — the signature climax: visual depth without
   engagement demand (a mid-tier producer owned *and* the first scene-variant
   unlocked, together).
6. **first-low-urgency-achievement** — achievements felt as pacing markers, a
   gentle multiplier, never pressure.

The phase order and each phase's intent are **fixed identity** — a fork changing
them has forked into a sibling archetype. The arc budget is ~12h cumulative
(matches `OFFLINE_CAP_HOURS`); reshaping it past a single overnight session changes
the archetype.

## Engine fit (pattern → primitive)

| Pattern | Engine primitive | Note |
|---|---|---|
| Idle Production | continuous `Producer` (zero manual trigger) | no click affordance — deliberate absence |
| Cost Scaling (gentle) | `Producer.getCost(n)` geometric ladder | `cost = baseCost · 1.08^count` |
| Auto-Production | shipping autobuyers (`modules/autobuyers/`) | auto-buy IS the mechanic; the arc probe drives these |
| Automation progression | `AutomationTiers` (`modules/automation.ts`) | `manual → basic`; ladder currently open — see `BALANCING.md` § Known thin |
| Ambient-Progression | `Unlock` sweep + scene-variant watch bridge | soft-reveals unconditional (no-pressure contract) |
| Achievement multipliers | `AchievementCategory.registerTiered` | low-urgency pacing markers feed the rate chain |
| Offline/resume | `processOfflineTime` + `sessionClock` | glance-check payoff; round-trips within 0.5% |
| Perturbation | module `TuningRegistry` (`tunable()`) | constants via tuning (`AmbientTuningRegistryKey`) |

## Balance model

Math-first, engine-as-oracle. `BALANCING.md` beside this file is the working
guide — the knobs, what couples to what, and how to run a pass. In brief:

- **The spine, as prose + math** — `data/producers.ts` § Balance carries the
  geometric-cost and achievement-modifier closed forms and the gentle-ladder
  rationale, each constant naming its coupling.
- **The probes** — `balance/solve-probe.ts` bisects beats 2/3/5 against the real
  engine driven by the **shipping autobuyers**, under `stasis-aware-tick`;
  `balance/invariant-probe.ts` reports the offline round-trip (≤0.5%) and the
  no-pressure invariant. Both print; neither asserts.
- **The behavioral suite** — `sim/data-invariants.test.ts` holds the structural
  relationships that survive retuning: threshold parity and monotonic ordering.
  Magnitudes do not belong there, per
  `open-loop-engine/docs/consumer-guide-balance.md` § Why this isn't a test suite.

## Cross-references

- Genre exemplars (shape validation, not lift targets): Anti-Idle, Rusty's
  Retirement, Chillquarium, Tiny Pasture
- Working on the numbers: `BALANCING.md` (beside this file)
- Balance methodology: `open-loop-engine/docs/consumer-guide-balance.md`;
  archetype-specific authoring in `.claude/rules/archetype-authoring.md`
- Engine API: `open-loop-engine/docs/api/INDEX.md`, `consumer-guide.md`
