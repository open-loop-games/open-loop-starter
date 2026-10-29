# _blank — archetype identity (template)

## Identity line

> **The honest blank base.** No archetype composition, no exemplar, no lifted
> numbers — a single tracked number rising at a tunable rate, wired through the
> full canonical shape so a novel composition starts green and consistent.

**No research composition.** `_blank` names no game shape, so it has no research
composition. That is a different case from a **design claim**, a story whose shape
cites no research pattern; a novel composition simply has none until someone writes one.

A real archetype replaces both paragraphs. State its research composition in the
quote: the research patterns it is built from, by handle, and any component no pattern
names. Below it, name the genres it is in, by their handles in the studio's research
library. A genre's document lists the games in it, so a story cites its exemplars as a
set and never as a list of the games in a genre.

This file is the template for a real archetype's `IDENTITY.md`. It has every
required section, filled in for the neutral base. When you build on `pnpm eject --clean`, rewrite each section for
your game; when you author a *new* archetype in starter, replace the placeholder
content with the real composition. Keep it a single screen — worked balance
detail belongs in `BALANCING.md` beside this file.

## What this archetype is

Nothing yet, deliberately. `_blank` is hoisted by `pnpm eject --clean` for a novel
composition that no registered archetype fits — the honest base, so there is no
archetype content to gut. It ships one example mechanic (a number that rises) purely
to demonstrate the canonical wiring; the game's real identity is the fork's to write.

## Rate-function spine / bucket

**Bucket: linear accumulation** — `amount(t) = ratePerSecond · t`.

This is the load-bearing section of any real `IDENTITY.md`, and it declares a
**coverage boundary** — three things:

1. **The bucket** the closed core lives in, named from
   [rate functions](https://open-loop-games.github.io/incremental-math/rate-functions/) (a geometric crossing, a saturating
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

## The arc — beat map

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
(`modules/automation.ts`) holding one example policy that stays blocked until the
`assisted` automation tier unlocks. The ladder ships locked, so it costs the default arc nothing; it is here so a
fork inherits the canonical shape for player-facing automation rather than inventing
one. A real archetype maps each pattern in its identity line to an engine primitive
here, with a `TODO(expansion)` marker where it hand-rolls a gap.

## Balance model

Math first, one-way flow, one home per number:

```
data/game.ts ─── Balance ───  →  balance/game-projection.ts  →  balance/game-probe.ts
spine, as prose + math           runnable projection             probe (real engine)
```

- **Spine** — `data/game.ts` `// ─── Balance ───`: the closed form that justifies
  `ratePerSecond`.
- **Projection** — `balance/game-projection.ts`: pure math, no engine; predicts
  `amount(t)`.
- **Probe** — `balance/game-probe.ts`: drives the shipping `game/core` module on
  the real engine and prints the drift against the projection. It reports; it
  does not assert.
- **Behavioral suite** — `sim/example.test.ts` specs *what the mechanic does*
  (the amount rises), carrying no magnitudes, which is why it survives a retune.

Magnitudes never become assertions. A measured value with a tolerance band
around it reds on every legitimate retune, the band gets widened to restore
green, and it then asserts nothing while still looking like a passing test. Put
it in a probe report a human reads instead.

`BALANCING.md` beside this file is the working guide — the tunables, their
couplings, and how to run a pass.
