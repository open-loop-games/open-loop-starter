# Archetype methodology

Read this before starting or extending an archetype under
`src/showcase/archetypes/<name>/`. It is the canonical port/build template: the
directory shape every archetype shares, how an archetype sources its numbers, the
required identity doc, and where each balance surface lives on disk.

It is a router, not a methodology dump. **Balance methodology lives in the engine**, at
`open-loop-engine/docs/consumer-guide-balance.md` — the spine, the probe, the loop
between them, the engine surfaces that support each. Read it before a balance pass. This
file owns only what is starter-specific: which directory each surface lands in and what
the files are called. `prototypes/frontier/docs/balance-process.md` is the best worked
example of the whole process on a real game. Identity lines live in
`archetypes/_identity.md`; per-archetype balance logs in `archetypes/BALANCING-<name>.md`.

## Directory shape (canonical)

Every archetype is self-bootable and follows the same colocated layout. Layering is
strict, one-way: `data → modules → composables → ui`.

```
<name>/
├── IDENTITY.md          # single-screen identity: pattern-language line + spine + growth ports
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

## How an archetype sources its numbers

**Forward spine — the model.** State the pattern-language identity line, derive a
closed-form **rate-function spine**, and let the spine *generate* balance. Grounded in a
named rate-function bucket (`incremental-math/…/rate-functions/`) and, where possible, a
real WIP game's data sweep. Exemplar games validate that the composition ships in the
wild; they are cited as a set and are never lift targets. Cycler is the built reference.

**Subtractive clone — what the older ports did.** Interlocker, looper, defender, scaler
and producer predate the forward model: they picked one canonical exemplar, lifted
ids/names/numbers 1:1, recorded every substitution and scope cut, and then measured where
beats landed. Their own docs carry that as dated fact. It still works and it expresses the
concept honestly — but it is not how a new archetype is built, and a lifted economy has no
spine to perturb, so balance work has to route around the numbers rather than through them.

Whichever an archetype is, the identity doc **states which**, and both carry the same doc
shape and the same balance surfaces. That shared surface is what makes the set legible.

## IDENTITY.md — required sections

Filename is `IDENTITY.md` for every archetype. Single screen. Required:

1. **Identity line** — the pattern-language composition, sourced from `_identity.md`.
2. **What this archetype is** — the player experience in prose.
3. **Rate-function spine / bucket** — which closed-form or named-adjacent-math bucket the
   economy lives in. A forward archetype writes its spine here (the load-bearing section).
   A clone names the bucket its lifted numbers *fall into* retro-fit (e.g. geometric-crossing,
   Increlution-log, saturating) — even lifted numbers have a shape.
4. **The loop / beat map** — where the run turns.
5. **Growth ports** (forward) **or** exemplar + arc-scope + substitutions ledger (clone).
6. **Engine fit** — pattern → engine primitive, with candidate-primitive receipts.
7. **Balance model** — the spine and what checks it, pointing at this archetype's `balance/`.

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

Several archetypes still carry balance locks under `sim/` — `*.probe.test.ts` files
pinning a measured window with a tolerance band. That is the retired shape: a legitimate
retune reds them, the bound gets widened to restore green, and the file stops asserting
anything. Fold them into a probe that prints when you next touch the archetype; don't
churn a working archetype just to move them.

### Canonical `balance/` filenames

| Role | Canonical name |
|---|---|
| Runnable closed-form projection (no engine) | `<name>-projection.ts` |
| Probe driving shipping code | `<concern>-probe.ts` |
| Shipping-automation arc runner | `<name>-run.ts` |

The older ports name balance files after the methodology buckets the retired master doc
organised by (`solve.ts`, `spec.ts`, `predict.ts`, `verify-probe.ts`, `bot.ts`). Those
names aren't wrong about what the files do, but they are the legacy vocabulary. **Rename
when you next touch the file; do not churn a working port just to rename.** `_blank` and
cycler are fully current and are what to copy from.

### The driver is shipping automation, not a bespoke bot

Per `/work/studio/CLAUDE.md` § "automation is game code, not a harness bot": a probe drives
the game's own `modules/automation.ts` (gated by `AutomationTiers`), with a thin runner
working only the manual openers a player works. The retired pattern is a bespoke
`balance/bot.ts` that re-implements play — swap it for shipping-automation + runner when
you touch an archetype that still has one (Interlocker already did: `arc-bot.ts` →
`arc-run.ts`). Deliberately unrealistic drivers — full-auto session runners, optimal-play
enumeration — stay probe-side; they are tooling, not mechanics.

## Landing discipline

- **Walkthrough gate.** A port is not "landed" until the arc *plays* — produces a beat
  sequence end-to-end headless under the shipping automation. Module-API unit tests validate
  contracts, not that the archetype plays; the first probe run is the first integration
  surface that walks rate-chain → resource → predicate → beat, and it is where structural
  defects surface rather than tuning ones. Confirm the game plays before treating anything
  as a balance question. (See `BALANCING-interlocker.md` § Methodology for the case that
  earned this rule.)
- **Phased landing.** Land a port in bounded phases — scaffold + locked data contracts →
  module bodies → integration glue → UI → balance. Numbers are frozen once the contract
  phase lands; later phases measure against them rather than re-authoring them.
- **Doc-size discipline.** Read-first docs (this file, `IDENTITY.md`, the BALANCING logs)
  follow `/work/studio/CLAUDE.md` § Doc size — measured in bytes, ~20–30kb goal. Keep
  `IDENTITY.md` to a single screen; push worked balance detail into the BALANCING logs.

## Where things live

- `open-loop-engine/docs/consumer-guide-balance.md` — balance methodology. The spine, the
  probe, the loop, the engine surfaces. Read before a balance pass.
- `prototypes/frontier/docs/balance-process.md` — the best worked example of that process
  on a real game: the closed form named up front, the probe catalogue, the gotchas.
- `IDENTITY.md` (per archetype) — identity + spine + growth ports. Single screen.
- `archetypes/BALANCING-<name>.md` — per-archetype balance log: what was *learned*
  (instrument-earning moments, engine-surface gaps, drift signals), not chosen values.
- `archetypes/_identity.md` — the identity-line registry for every archetype (built or not).
