# Archetype methodology

Read this before starting or extending an archetype under
`src/showcase/archetypes/<name>/`. It is the canonical port/build template: the
directory shape every archetype shares, the two honest ways an archetype sources
its numbers, the required identity doc, and the three-lane balance pipeline.

It is a router, not a methodology dump. Balance *depth* lives in
`archetypes/BALANCING.md` (the master, seven methodology buckets) and per-archetype
`archetypes/BALANCING-<name>.md` logs; the three-lane pipeline's canonical source is
`frontier/docs/balance-process.md`. Identity lines live in `archetypes/_identity.md`.

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
├── balance/            # vite-node discovery/verification scripts (Lane 1–2, below)
├── sim/                 # vitest behavioral + balance locks (Lane 3, below)
├── boot.ts              # createApp(overrides?) → { app, engine, mount }
├── domain-map.config.mjs + domain-map.md   # generated domain-language map (pnpm domain-map)
```

`data → modules` never reverses; composables and components never hold game logic.
`tuning.ts` (the `tunable()` key registry) is the one perturbation path — no parallel
`data/balance.ts` override file. Regenerate `domain-map.md` from the types; never edit it.

## Two honest ways to source numbers — both legitimate

An archetype's balance comes from one of two methods. The identity doc **states which**;
neither is a defect, and the choice is not something to "fix" by converting one to the
other. What must be consistent is the *surface* — doc shape, dir layout, balance-lane
naming — not the number source.

- **Forward spine** (the forward model; Cycler). State the pattern-language identity
  line, derive a closed-form **rate-function spine**, and let the spine *generate*
  balance. Exemplar games validate the composition ships in the wild; they are never
  lift targets. Grounded in a named rate-function bucket
  (`incremental-math/…/rate-functions/`) and, where possible, a real WIP game's data sweep.

- **Subtractive clone** (the older ports; Interlocker, looper, defender, scaler, producer).
  Pick one canonical exemplar, lift ids/names/numbers 1:1, honestly record every
  substitution and scope cut, then **measure-and-record** where beats land. The identity
  doc is a port ledger. This still works and expresses the concept — it is a valid path,
  not a deprecated one.

The clones predate the forward model and lifted numbers 1:1; their own docs record that as
dated fact. Forward archetypes are not built that way. But **both carry the same doc shape
and the same balance-lane pipeline** — that shared surface is what makes the set legible.

## IDENTITY.md — required sections

Filename is `IDENTITY.md` for every archetype (clone or forward). Single screen. Required:

1. **Identity line** — the pattern-language composition, sourced from `_identity.md`.
2. **What this archetype is** — the player experience in prose.
3. **Rate-function spine / bucket** — which closed-form or named-adjacent-math bucket the
   economy lives in. A forward archetype writes its spine here (the load-bearing section).
   A clone names the bucket its lifted numbers *fall into* retro-fit (e.g. geometric-crossing,
   Increlution-log, saturating) — even lifted numbers have a shape.
4. **The loop / beat map** — where the run turns; windows are measured, never authored.
5. **Growth ports** (forward) **or** exemplar + arc-scope + substitutions ledger (clone).
6. **Engine fit** — pattern → engine primitive, with candidate-primitive receipts.
7. **Balance model** — the three lanes (below), pointing at this archetype's `balance/` + `sim/`.

## Balance — three lanes

Numbers flow one way through three lanes. One home per number: reasoned once, swept once,
pinned once. This pipeline is method-agnostic — it works identically whether Lane 1
*predicts* the numbers (forward spine) or *describes* the measured window (clone).

```
data/*.ts  ─── Balance ───   →   balance/*.ts (vite-node)   →   sim/*.probe.test.ts
closed-form LENS                 discovery / verification        measured window LOCK
"what the math says"             "what shipping code does"       "what must stay true"
math first                       scripts discover                Vitest locks
```

- **Lane 1 — lens.** The `// ─── Balance ───` comment sections in `data/*.ts`: the
  closed-form expressions that *justify* a number before it is measured, each naming its
  coupling and re-tune targets. When the closed form is worth executing, add a runnable
  **projection** script (pure math, **no engine**) — the projection is the lens in
  executable form (predicts run length, sizes a parameter to a target). Lens and projection
  are the same math; "lens" is the prose-in-data form, "projection" the runnable form.

- **Lane 2 — probe.** vite-node scripts under `balance/` that drive **shipping code**
  headless — real engine, real modules, **real automation policies** — never a
  re-implementation. Discovery is exploratory; a probe that fails found something.

- **Lane 3 — lock.** `sim/*.probe.test.ts` pins the *measured* window with a tolerance
  band, run in `pnpm test`. A lock asserts a measured window, never an invented target.

### Canonical `balance/` + `sim/` filenames

New work uses **lane names**, not methodology-bucket names:

| Role | Canonical name | Lane |
|---|---|---|
| Runnable closed-form projection (no engine) | `<name>-projection.ts` | 1 |
| Probe driving shipping code | `<concern>-probe.ts` | 2 |
| Shipping-automation arc runner | `<name>-run.ts` | 2 |
| Regression lock | `sim/<concern>.probe.test.ts` | 3 |

The older ports name balance files by BALANCING.md's seven methodology buckets
(`solve.ts` = solver, `spec.ts` = engine-as-oracle, `verify.ts` = math-first-verify,
`bot.ts` = fixed-strategy driver). Those are not wrong — the three lanes *organize* the
buckets, they don't replace them — but they are the legacy naming. **Rename to lane names
when you next touch the file; do not churn a working port just to rename.**

### The driver is shipping automation, not a bespoke bot

Per `/work/studio/CLAUDE.md` § "automation is game code, not a harness bot": the probe lane
drives the game's own `modules/automation.ts` (gated by `AutomationTiers`), with a thin
runner working only the manual openers a player works. The retired pattern is a bespoke
`balance/bot.ts` that re-implements play — swap it for shipping-automation + runner when you
touch an archetype that still has one (Interlocker already did: `arc-bot.ts` → `arc-run.ts`).

## Landing discipline

- **Walkthrough gate.** A port is not "landed" until the arc *plays* — produces a beat
  sequence end-to-end headless under the shipping automation. Module-API unit tests validate
  contracts, not that the archetype plays; the first probe run is the first integration
  surface that walks rate-chain → resource → predicate → beat. Confirm the game plays before
  any methodology bucket-walk. (See `BALANCING-interlocker.md` § Methodology for the case
  that earned this rule.)
- **Phased landing.** Land a port in bounded phases — scaffold + locked data contracts →
  module bodies → integration glue → UI → balance. Numbers are frozen once the contract
  phase lands; later phases measure-and-record against them, never re-author them.
- **Doc-size discipline.** Read-first docs (this file, `IDENTITY.md`, the BALANCING logs)
  follow `/work/studio/CLAUDE.md` § Doc size — measured in bytes, ~20–30kb goal. Keep
  `IDENTITY.md` to a single screen; push worked balance detail into the BALANCING logs.

## Where things live

- `IDENTITY.md` (per archetype) — identity + spine + growth ports. Single screen.
- `archetypes/BALANCING.md` — master balance methodology (seven buckets, engine-as-oracle).
- `archetypes/BALANCING-<name>.md` — per-archetype balance log: what was *learned*
  (instrument-earning moments, engine-surface gaps, drift signals), not chosen values.
- `archetypes/_identity.md` — the identity-line registry for every archetype (built or not).
- `frontier/docs/balance-process.md` — canonical worked example of the three-lane pipeline.
</content>
