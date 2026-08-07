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

1. **Identity line** — the pattern-language composition, sourced from `_identity.md`.
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

- **`sim/` is for behavioral suites** — what a mechanic *does*, driven tick by tick:
  counts, monotonic growth, a slot freeing, a wave completing. No magnitudes, which is why
  they survive retunes. Balance magnitudes do not belong here.

### Canonical `balance/` filenames

| Role | Canonical name |
|---|---|
| Runnable closed-form projection (no engine) | `<name>-projection.ts` |
| Probe driving shipping code | `<concern>-probe.ts` |
| Shipping-automation arc runner | `<name>-run.ts` |

`_blank` and cycler are what to copy from.

### The driver is shipping automation, not a bespoke bot

Per `/work/studio/CLAUDE.md` § "automation is game code, not a harness bot": a probe drives
the game's own `modules/automation.ts` (gated by `AutomationTiers`), with a thin runner
working only the manual openers a player works. Deliberately unrealistic drivers —
full-auto session runners, optimal-play enumeration — stay probe-side; they are tooling,
not mechanics.

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
