---
paths: ["src/showcase/archetypes/**"]
description: How an archetype is built — the canonical directory shape, the rate-function spine every archetype declares, the required identity doc, and where each balance surface goes on disk.
---

# Archetype authoring

Every archetype under `src/showcase/archetypes/<name>/` is a research composition. A
rate-function spine is under it and generates its balance.

**Balance methodology is in the engine**, at
`open-loop-engine/docs/consumer-guide-balance.md`. It covers the spine, the probe, the
loop between them, and the engine APIs that support each. Read it before a balance pass.
This file contains only what is starter-specific:

- what an archetype declares;
- which directory each surface goes in;
- what the files are called.

`prototypes/frontier/docs/balance-process.md` is the worked example of the whole process
on a real game.

## The spine

An archetype's numbers come from its spine. The spine is a falsifiable prediction; the
probes are what contradict it.

A spine declares its **coverage boundary** — three things:

1. **The bucket** — the named rate-function bucket the closed core is in
   (`incremental-math/…/rate-functions/`).
2. **Where the closed form stops** — the part of the economy the bucket does not project.
3. **What measures the remainder** — the probe methodology that settles what projection
   leaves open. Examples are distribution statistics over repeated runs, sensitivity
   sweeps and survival rates.

Full coverage is the simple case: the bucket projects the whole economy and the probes
verify it. Partial coverage is ordinary, not a failure. An adversarial economy, a
discrete-event schedule or a stochastic layer bounds where projection ends and
measurement begins. Declaring that boundary *is* the spine.

**"No bucket" is not an available answer.** Name the bucket the closed core is in, then
name what measures the rest. An economy with no declared spine has no balance — it has
values.

Exemplar games show that the research composition ships in real games. They are cited as
a set, crosses included, and are never lift targets.

## Directory shape (canonical)

Every archetype is self-bootable and follows the same colocated layout. Layering is
strict and one-way: `data → modules → composables → ui`.

```
<name>/
├── IDENTITY.md          # single-screen identity: research composition + spine + growth ports
├── BALANCING.md         # the balance orientation a fork inherits — see below
├── data/                # pure config — typed defs + balance constants, with co-located
│                        #   `// ─── Skeleton ───` / `// ─── Balance ───` comment sections
├── modules/             # modules, factory-constructed over data (incl. tuning.ts, automation.ts)
├── composables/         # OPTIONAL — only when there's real Vue work (computed/watch/lifecycle)
├── ui/                  # archetype-colocated screens + panels + components
├── balance/             # vite-node scripts — the spine's runnable form and the probes
├── sim/                 # the test harness (harness.ts) + any suite spanning modules
├── boot.ts              # createApp(overrides?) → { app, engine, mount }
├── domain-map.config.mjs + domain-map.md   # generated domain-language map (pnpm domain-map)
```

`data → modules` never reverses. Composables and components never hold game logic.
`tuning.ts` (the `tunable()` key registry) is the one perturbation path. There is no
parallel `data/balance.ts` override file. Regenerate `domain-map.md` from the types; never
edit it.

## IDENTITY.md — required sections

The filename is `IDENTITY.md` for every archetype. It fits on a single screen. Required
sections:

1. **Identity line** — the research composition: the research patterns the story is
   built from, by handle, and any component no pattern names. Then the genres it is in,
   by handle. Name no path: a fork keeps this file.
   - A genre's document lists the games in it. This file cites its exemplars as a set,
     never as the games in a genre.
2. **What this archetype is** — the player experience in prose, as this build realizes
   it. A genre's general prose is in its genre document.
3. **Rate-function spine** — the bucket, where the closed form stops, and what measures the
   remainder. The rest of the archetype depends on this section.
4. **The arc / beat map** — where the run turns.
5. **Growth ports** — the validated-but-deferred directions the archetype grows through.
6. **Engine fit** — pattern → engine primitive, with drop-spot receipts.
7. **Balance model** — the spine and what checks it, pointing at this archetype's `balance/`.

## BALANCING.md — required sections

`IDENTITY.md` says what the archetype *is*. `BALANCING.md` is how you **work on its
numbers**. Its reader inherits this game after eject, when the showcase is gone. Then
this doc is all that stands between the spine declaration and a wall of constants. Write
it in the present tense, with no pass history. Required sections:

1. **Opening** — two or three sentences on what kind of economy this is. It points at
   `IDENTITY.md` § Rate-function spine for the bucket, and never restates it.
2. **The tunables** — every `tunable()` key, its default, and *what it moves*. State the
   effect, not the declaration, because a reader cannot get the effect from `data/`.
   Name what is deliberately **not** perturbable, and why.
3. **Couplings** — what is not independent, and what breaks *silently* if changed.
   It has the highest value: a structural assumption the code never states is written
   down here.
4. **Running a pass** — which probe answers which question, what it prints, how to
   read it. Point at probe headers rather than restating them.
5. **Known thin** — where the balance is unsatisfying now, and what the probes measure
   about it. Honest limits, not apologies. Delete a limit once a pass fixes it.

It describes the game as it stands, never how it got there. These do not belong in it:

- records of what an agent session learned;
- shapes a pass tried and retired, and why;
- convergence counts;
- promotion tracking.

History has two homes: the commit body, and the task thread the commit names.

A finding that proves general goes to the project's balance-methodology record. The
engine guide § When a balance pass finds an engine gap states the same rule for engine
gaps. Record the receipt by path and symbol, and let a later pass read it. Findings
mature in § Couplings and § Known thin until they are general enough to move out.

`_blank/BALANCING.md` is the template. It is filled in for the neutral base and
annotated with what each section is for. `looper` and `tug` are worked examples on
real economies. **§ Couplings matters most.** A structural assumption the code never
states is written down there, and a fork values that section most.

## Balance — where each surface goes

The process is the engine guide's; this is the disk layout it maps onto.

```
data/*.ts  ─── Balance ───   ⇄   balance/*.ts (vite-node)
the spine, as prose + math        the spine as a runnable function,
alongside the constants           and the probes that contradict it
```

- **The spine** starts as the `// ─── Balance ───` comment sections in `data/*.ts`.
  - They contain the closed-form expressions that justify each constant.
  - Each expression names its coupling and its re-tune targets, in plain arithmetic with
    no engine.
  - When the closed form is worth executing, it becomes a runnable projection under
    `balance/`. Same math, two forms.

- **The probes** are vite-node scripts under `balance/`. They drive **shipping code**
  headless: real engine, real modules, real automation policies, never a
  re-implementation. They print; they do not assert. A probe that finds something
  unexpected has done its job.

- **A probe a pass reruns finishes in about 20 s at most.** The engine guide's § Making a pass cheap says why, and how to find the cost when a probe grows slow.

- **The projection prints a landmark-on-schedule check:** each landmark's predicted time beside its schedule. `BALANCING.md` § Running a pass states the healthy arc's tolerance per zone or act, not one figure for the whole arc.

- **Behavioral suites are beside the module they spec**: `modules/<name>.test.ts`,
  importing `sim/harness.ts`. They spec what a mechanic *does*, driven tick by tick:
  counts, monotonic growth, a slot freeing, a wave completing. They contain no
  magnitudes, so they still hold after a retune.

- **`sim/` holds the test harness and nothing else by default.** `harness.ts` wraps
  `src/test/bootTestEngine.ts` into bare `boot()` / `tick()` / `tickUntil()` free
  functions over this archetype's module list.
  - A suite that spans several modules may go here under its own name.
  - A suite that specs one module goes beside that module.
  - Probes never go here; they are vite-node scripts under `balance/`.

  **`sim/harness.ts` and a `balance/` engine builder are not duplicates.** The test
  harness boots the module list on memory storage for tick-by-tick behavioral specs. A
  probe builder assembles whatever the probe measures. It may be driven by an automated
  player, bilateral, or instrumented with analyzers. Producer, skirmish and tug have
  both, and a header in each says what the other is for. A suite may import a probe
  builder when that measurement path is the thing under test, and says so.

### Canonical `balance/` filenames

| Role | Canonical name |
|---|---|
| Runnable closed-form projection (no engine) | `<name>-projection.ts` |
| Probe driving shipping code | `<concern>-probe.ts` |
| Shipping-automation arc runner | `arc-probe.ts` |
| Beat windows + predicates the probes import | `beats.ts` |
| Shared fixture the probes and suites both build on | `_<noun>.ts` |

An underscore prefix marks a file that is *not* runnable on its own. It is a fixture the
runnable ones import, like cycler's `_keeper.ts`. Every other file in `balance/` is
executable with `vite-node` and prints something.

`_blank` and cycler are what to copy from.

### The driver is shipping automation, not a bespoke bot

`/work/studio/CLAUDE.md` § "automation is game code, not a harness bot" sets this rule.
A probe drives the game's own `modules/automation.ts`, behind `AutomationTiers`. A thin
runner works only the manual openers a player works. Deliberately unrealistic drivers stay
probe-side: full-auto play-session runners and optimal-play enumeration. They are
tooling, not mechanics.

**Automation tiers are for player-facing automation only.**

- An AI *opponent* is not automation the player unlocks. Its install-presence blocks it,
  not an automation tier.
- Skirmish's rival seat runs the shared policy under no automation tier; the player's
  lieutenants run the same policy behind theirs.
- Automation tier ids are a typed union per archetype (skirmish's `CrewTier`,
  `ProducerAutomationTier`). So a policy that names an automation tier that does not
  exist fails at the call site. It does not silently never run.

**A ladder that is declared but never withholds anything is a divergence**, not an
adoption. Say so at the call site and in `BALANCING.md` § Known thin, with what the
honest rung would cost. Unlocking an automation tier changes the arc, so it is a spine
decision. Grow the projection's second branch in the same pass. Otherwise the probe
reports real drift with nothing to explain it.

## Conformance

The archetypes are the storybook for the engine's batteries. So readers take them as best
practice, whether or not they were written that way. Where two of them solve the same
problem differently, at least one teaches a fork the wrong thing. The reader has no way to
tell which. Uniformity here is the product, not tidiness.

Each axis has one canonical answer and one archetype to copy it from:

| Axis | Canon | Copy from |
|---|---|---|
| Perturbation path | `tunable()` at reader sites; registry created in `modules/tuning.ts` | `tug` |
| Automation driver | `modules/automation.ts` behind `AutomationTiers`; a thin runner works only the manual openers | `skirmish` |
| Automation ladder | player-facing automation runs behind `AutomationTiers`, automation tier ids a typed union, policies inert until the automation tier is reached | `_blank` |
| Behavioral suites | `modules/<name>.test.ts`, beside the module, importing `sim/harness.ts` | `skirmish` |
| Test harness | `sim/harness.ts` → bare `boot()` / `tick()` / `tickUntil()` over this archetype's modules | `_blank` |
| Runnable projection | `<name>-projection.ts` where the closed form is worth executing | `cycler` |
| Probes | `<concern>-probe.ts` under `balance/`; print, never assert | `cycler` |
| Balance orientation | `BALANCING.md` beside `IDENTITY.md`, five required sections, final state only | `looper` |
| Boot | `createApp(overrides?) → { app, engine, mount }` | any — all agree |

A deliberate divergence is allowed, and is worth writing down. Say so at the call site
and in that archetype's `BALANCING.md` § Known thin, with what the canon costs here.
Silent divergence is the failure: it looks identical to a house style a fork should
adopt.

**A new axis appears whenever a second archetype solves a solved problem differently.**
Add the row, and pick the reference before a third archetype invents a third answer.

## Completion discipline

- **Walkthrough check.** An archetype is not complete until the arc *plays*: it produces a
  beat sequence end-to-end, headless, under the shipping automation.
  - Module-API unit tests validate contracts, not that the archetype plays.
  - The first probe run is the first integration test that walks rate chain → resource
    → predicate → beat. Structural defects show there, rather than tuning ones.
  - Confirm the game plays before you treat anything as a balance question.
- **Phased completion.** Build an archetype in bounded phases:
  1. scaffold + locked data contracts;
  2. module bodies;
  3. integration glue;
  4. UI;
  5. balance.

  Declare the spine before the contract phase is complete. Later phases measure against
  it rather than re-deriving it.
- **Doc-size discipline.** Read-first docs follow `/work/studio/CLAUDE.md` § Doc size:
  measured in bytes, with a goal of about 20–30kb. Keep `IDENTITY.md` to a single screen.
