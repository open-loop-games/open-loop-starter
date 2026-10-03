---
paths: ["src/showcase/archetypes/**"]
description: How an archetype is built — the canonical directory shape, the rate-function spine every archetype declares, the required identity doc, and where each balance surface lands on disk.
---

# Archetype authoring

Every archetype under `src/showcase/archetypes/<name>/` is a composition in research's
pattern language, carried by a rate-function spine that generates its balance.

**Balance methodology lives in the engine**, at
`open-loop-engine/docs/consumer-guide-balance.md` — the spine, the probe, the loop between
them, the engine surfaces that support each. Read it before a balance pass. This file owns
what is starter-specific: what an archetype declares, which directory each surface lands
in, and what the files are called. `prototypes/frontier/docs/balance-process.md` is the
worked example of the whole process on a real game.

## The spine

An archetype's numbers come from its spine. The spine is a falsifiable prediction; the
probes are what contradict it.

A spine declares its **coverage boundary** — three things:

1. **The bucket** — the named rate-function bucket the closed core lives in
   (`incremental-math/…/rate-functions/`).
2. **Where the closed form stops** — the part of the economy the bucket does not project.
3. **What measures the remainder** — the probe methodology that settles what projection
   leaves open: distribution statistics over repeated runs, sensitivity sweeps, survival
   rates.

Full coverage is the simple case — the bucket projects the whole economy and the probes
verify it. Partial coverage is ordinary, not a failure: an adversarial economy, a
discrete-event schedule, or a stochastic layer bounds where projection ends and
measurement begins. Declaring that boundary *is* the spine.

**"No bucket" is not an available answer.** Name the bucket the closed core lives in, then
name what measures the rest. An economy with no declared spine has no balance — it has
values.

Exemplar games validate that the composition ships in the wild. They are cited as a set,
crosses and all, and are never lift targets.

## Directory shape (canonical)

Every archetype is self-bootable and follows the same colocated layout. Layering is
strict, one-way: `data → modules → composables → ui`.

```
<name>/
├── IDENTITY.md          # single-screen identity: pattern-language line + spine + growth ports
├── BALANCING.md         # the balance orientation a fork inherits — see below
├── data/                # pure config — typed defs + balance constants, with co-located
│                        #   `// ─── Skeleton ───` / `// ─── Balance ───` comment sections
├── modules/             # engine modules, factory-constructed over data (incl. tuning.ts, automation.ts)
├── composables/         # OPTIONAL — only when there's real Vue work (computed/watch/lifecycle)
├── ui/                  # archetype-colocated screens + panels + components
├── balance/             # vite-node scripts — the spine's runnable form and the probes
├── sim/                 # vitest behavioral suites
├── boot.ts              # createApp(overrides?) → { app, engine, mount }
├── domain-map.config.mjs + domain-map.md   # generated domain-language map (pnpm domain-map)
```

`data → modules` never reverses; composables and components never hold game logic.
`tuning.ts` (the `tunable()` key registry) is the one perturbation path — no parallel
`data/balance.ts` override file. Regenerate `domain-map.md` from the types; never edit it.

## IDENTITY.md — required sections

Filename is `IDENTITY.md` for every archetype. Single screen. Required:

1. **Identity line** — the pattern-language composition, sourced from `_identity.md`,
   with the grounding class that registry gives it — rows are cited by handle only
   where a sourced exemplar carries them, and a design claim says it is one.
2. **What this archetype is** — the player experience in prose.
3. **Rate-function spine** — the bucket, where the closed form stops, and what measures the
   remainder. The load-bearing section.
4. **The loop / beat map** — where the run turns.
5. **Growth ports** — the validated-but-deferred directions the archetype grows through.
6. **Engine fit** — pattern → engine primitive, with candidate-primitive receipts.
7. **Balance model** — the spine and what checks it, pointing at this archetype's `balance/`.

## BALANCING.md — required sections

`IDENTITY.md` says what the archetype *is*. `BALANCING.md` is how you **work on
its numbers** — written for whoever inherits this game after eject, when the
showcase is gone and this doc is all that stands between the spine declaration
and a wall of constants. Present tense, no pass history. Required:

1. **Opening** — two or three sentences on what kind of economy this is. Points at
   `IDENTITY.md` § Rate-function spine for the bucket; never restates it.
2. **The knobs** — every `tunable()` key, its default, and *what it moves*. The
   effect, not the declaration — that is what a reader cannot get from `data/`.
   Name what is deliberately **not** perturbable, and why.
3. **Couplings** — what is not independent, and what breaks *silently* if changed.
   The highest-value section: it is where a structural assumption the code never
   states gets written down.
4. **Running a pass** — which probe answers which question, what it prints, how to
   read it. Point at probe headers rather than restating them.
5. **Known thin** — where the balance is unsatisfying and what the probes already
   say about it. Honest limits, not apologies.

It is not a pass ledger. Records of what a session learned, convergence counts,
and promotion tracking do not belong — a finding that proves general leaves for
the project's balance-methodology record (per the engine guide § When a balance
pass finds an engine gap, which states the same rule for engine gaps: record the
receipt by path and symbol, and let a later pass read it). Findings ripen in
§ Couplings and § Known thin until they are general enough to leave.

`_blank/BALANCING.md` is the template, filled in for the neutral base and
annotated with what each section is for; `ambient` and `tug` are worked examples
on real economies. **§ Couplings carries the most weight** — it is where a
structural assumption the code never states gets written down, and it is the
section a fork will thank you for.

## Balance — where each surface lands

The process is the engine guide's; this is the disk layout it maps onto.

```
data/*.ts  ─── Balance ───   ⇄   balance/*.ts (vite-node)
the spine, as prose + math        the spine as a runnable function,
alongside the constants           and the probes that contradict it
```

- **The spine** starts as the `// ─── Balance ───` comment sections in `data/*.ts` — the
  closed-form expressions that justify each constant, each naming its coupling and its
  re-tune targets, in plain arithmetic with no engine. When the closed form is worth
  executing, it graduates to a runnable projection under `balance/`. Same math, two forms.

- **The probes** are vite-node scripts under `balance/` that drive **shipping code**
  headless — real engine, real modules, real automation policies, never a
  re-implementation. They print; they do not assert. A probe that surfaces something
  unexpected has done its job.

- **Behavioral suites sit beside the module they spec** — `modules/<name>.test.ts`,
  importing `sim/harness.ts`. What a mechanic *does*, driven tick by tick: counts,
  monotonic growth, a slot freeing, a wave completing. No magnitudes, which is why they
  survive retunes.

- **`sim/` holds the harness and nothing else by default** — `harness.ts` wrapping
  `src/test/bootTestEngine.ts` into bare `boot()` / `tick()` / `tickUntil()` free
  functions over this archetype's module list. A suite genuinely spanning several
  modules can live here under its own name; a suite that specs one module belongs
  beside it. Probes never live here — they are vite-node scripts under `balance/`.

  **`sim/harness.ts` and a `balance/` engine builder are not duplicates.** The
  harness boots the module list on memory storage for tick-by-tick behavioral
  specs; a probe builder assembles whatever the probe measures — bot-driven,
  bilateral, instrumented with analyzers. Ambient and tug carry both, and each
  one's header says what the other is for. A suite may import a probe builder
  when that measurement path is the thing under test — tug's
  `instrumentation.test.ts` does, deliberately, and says so.

### Canonical `balance/` filenames

| Role | Canonical name |
|---|---|
| Runnable closed-form projection (no engine) | `<name>-projection.ts` |
| Probe driving shipping code | `<concern>-probe.ts` |
| Shipping-automation arc runner | `<name>-run.ts` |
| Beat windows + predicates the probes import | `beats.ts` |
| Shared fixture the probes and suites both build on | `_<noun>.ts` |

An underscore prefix marks a file that is *not* runnable on its own — a fixture the
runnable ones import, like cycler's `_board.ts`. Everything else in `balance/` should be
executable with `vite-node` and print something.

`_blank` and cycler are what to copy from.

### The driver is shipping automation, not a bespoke bot

Per `/work/studio/CLAUDE.md` § "automation is game code, not a harness bot": a probe drives
the game's own `modules/automation.ts` (gated by `AutomationTiers`), with a thin runner
working only the manual openers a player works. Deliberately unrealistic drivers —
full-auto session runners, optimal-play enumeration — stay probe-side; they are tooling,
not mechanics.

**The gate is for player-facing automation only.** An AI *opponent* is not automation
the player unlocks, so it is gated by install-presence rather than a tier — skirmish's
opponent seats pass no tier, and its `AutomationOptions.tier` is what a player seat
would pass. Tier ids are a typed union per archetype (`SkirmishAutomationTier`,
`AmbientAutomationTier`), so a policy naming a tier that does not exist fails at the
call site instead of silently never running.

**A ladder that is declared but never withholds anything is a divergence**, not an
adoption — say so at the call site and in `BALANCING.md` § Known thin, with what the
honest rung would cost. Opening a gate changes the arc, so it is a spine decision:
grow the projection's second branch in the same pass, or the probe reports real drift
with nothing to explain it.

## Conformance

The archetypes are the storybook for the engine's batteries, so they are read as
best practice whether or not they were written that way. Where two of them solve the
same problem differently, at least one is teaching a fork the wrong thing — and the
reader has no way to tell which. Uniformity here is the product, not tidiness.

Each axis has one canonical answer and one archetype to copy it from:

| Axis | Canon | Copy from |
|---|---|---|
| Perturbation path | `tunable()` at reader sites; registry created in `modules/tuning.ts` | `tug` |
| Automation driver | `modules/automation.ts` gated by `AutomationTiers`; a thin runner works only the manual openers | `skirmish` |
| Automation ladder | player-facing automation runs behind an `AutomationTiers` gate, tier ids a typed union, policies inert until the tier is reached | `_blank` |
| Behavioral suites | `modules/<name>.test.ts`, beside the module, importing `sim/harness.ts` | `skirmish` |
| Test harness | `sim/harness.ts` → bare `boot()` / `tick()` / `tickUntil()` over this archetype's modules | `_blank` |
| Runnable projection | `<name>-projection.ts` where the closed form is worth executing | `cycler` |
| Probes | `<concern>-probe.ts` under `balance/`; print, never assert | `cycler` |
| Balance orientation | `BALANCING.md` beside `IDENTITY.md`, four required sections | `ambient` |
| Boot | `createApp(overrides?) → { app, engine, mount }` | any — all agree |

A deliberate divergence is allowed and is worth writing down: say so at the call site
and in that archetype's `BALANCING.md` § Known thin, with what the canon costs here.
Silent divergence is the failure — it reads identically to a house style a fork should
adopt.

**A new axis appears whenever a second archetype solves a solved problem differently.**
Add the row and pick the reference before the third one invents a third answer.

## Landing discipline

- **Walkthrough gate.** An archetype is not "landed" until the arc *plays* — produces a
  beat sequence end-to-end headless under the shipping automation. Module-API unit tests
  validate contracts, not that the archetype plays; the first probe run is the first
  integration surface that walks rate-chain → resource → predicate → beat, and it is where
  structural defects surface rather than tuning ones. Confirm the game plays before
  treating anything as a balance question.
- **Phased landing.** Land an archetype in bounded phases — scaffold + locked data
  contracts → module bodies → integration glue → UI → balance. The spine is declared before
  the contract phase lands; later phases measure against it rather than re-deriving it.
- **Doc-size discipline.** Read-first docs follow `/work/studio/CLAUDE.md` § Doc size —
  measured in bytes, ~20–30kb goal. Keep `IDENTITY.md` to a single screen.
