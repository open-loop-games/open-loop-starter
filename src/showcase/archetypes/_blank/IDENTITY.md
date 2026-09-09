# _blank — archetype identity (template)

## Identity line

> **The honest blank base.** No archetype composition, no exemplar, no lifted
> numbers — a single tracked number rising at a tunable rate, wired through the
> full canonical shape so a novel composition starts green and consistent.

**Grounding: unregistered.** `_blank` names no region research has a story for, so
it holds none of the three addresses `../_identity.md` records and carries no
grounding class. That is a different case from `neither`, which is a starter design
claim about a real market region; a novel composition simply has no registry row
until someone writes one.

A real archetype replaces both lines. Source the identity line from `../_identity.md`
and carry the grounding class that registry gives it — the class fixes what the line
may cite: rows by handle only where a sourced exemplar carries them, a design claim
said as one, and no rows at all in the `neither` class. Register the line there
before writing it here; a line that exists only in this file is ungrounded by
construction.

This file is the template for a real archetype's `IDENTITY.md`. It carries every
section `.claude/rules/archetype-authoring.md` § IDENTITY.md — required sections
requires, filled in for
the neutral base. When you build on `pnpm eject --clean`, rewrite each section for
your game; when you author a *new* archetype in the gallery, replace the placeholder
content with the real composition. Keep it a single screen — worked balance
detail belongs in `BALANCING.md` beside this file, per
`.claude/rules/archetype-authoring.md` § BALANCING.md — required sections.

## What this archetype is

Nothing yet, deliberately. `_blank` is hoisted by `pnpm eject --clean` for a novel
composition that no validated archetype fits — the honest base, so there is no
archetype content to gut. It ships one example mechanic (a number that rises) purely
to demonstrate the canonical wiring; the game's real identity is the fork's to write.

## Rate-function spine / bucket

**Bucket: linear accumulation** — `count(t) = ratePerSecond · t`.

This is the load-bearing section of any real `IDENTITY.md`, and it declares a
**coverage boundary** — three things:

1. **The bucket** the closed core lives in, named from
   `incremental-math/…/rate-functions/` (a geometric crossing, a saturating
   ceiling, a log-frontier).
2. **Where the closed form stops** — the part of the economy the bucket does not
   project.
3. **What measures the remainder** — the probe methodology that settles what
   projection leaves open.

For the blank base: linear accumulation projects the whole economy, so nothing
is left over and the probe simply confirms it. That is full coverage, the simple
case. Partial coverage is ordinary, not a failure — an adversarial economy or a
stochastic layer bounds where projection ends and measurement begins, and
declaring that boundary *is* the spine. "No bucket" is not an available answer:
if a fork can't write its spine on paper, the mechanic is mis-specified, not
just untuned.

## The loop — beat map

None. A real archetype lists where the run turns (setup → comfortable → pressure →
payout), with windows **measured and recorded** by the balance probes, never authored.

## Growth ports

None committed — a fork defines how the archetype grows *up*: which validated-but-
deferred directions it would grow through, and which spine term each one feeds.
Exemplar games belong here too, cited as a set that validates the shape ships in
the wild — never as lift targets.

## Engine fit (pattern → primitive)

The blank base uses only the substrate: a `persistent()` number, a per-tick accrual,
the `tunable()` perturbation path, and an `AutomationTiers` ladder
(`modules/automation.ts`) holding one example policy behind a `manual → assisted`
gate. The ladder ships locked, so it costs the default arc nothing; it is here so a
fork inherits the canonical shape for player-facing automation rather than inventing
one. A real archetype maps each pattern in its identity line to an engine primitive
here, with candidate-primitive receipts where it hand-rolls a gap
(`candidate-primitives.md`).

## Balance model

Math first, one-way flow, one home per number (see
`.claude/rules/archetype-authoring.md` § Balance — where each surface lands):

```
data/game.ts ─── Balance ───  →  balance/game-projection.ts  →  balance/game-probe.ts
spine, as prose + math           runnable projection             probe (real engine)
```

- **Spine** — `data/game.ts` `// ─── Balance ───`: the closed form that justifies
  `ratePerSecond`.
- **Projection** — `balance/game-projection.ts`: pure math, no engine; predicts
  `count(t)`.
- **Probe** — `balance/game-probe.ts`: drives the shipping `game/core` module on
  the real engine and prints the drift against the projection. It reports; it
  does not assert.
- **Behavioral suite** — `sim/example.test.ts` specs *what the mechanic does*
  (the count rises), carrying no magnitudes, which is why it survives a retune.

Magnitudes never become assertions. A measured value with a tolerance band
around it reds on every legitimate retune, the band gets widened to restore
green, and it then asserts nothing while still looking like a passing test. Put
it in a probe report a human reads instead.

`BALANCING.md` beside this file is the working guide — the knobs, their
couplings, and how to run a pass.
