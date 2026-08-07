# _blank — archetype identity (template)

> **The honest blank base.** No archetype composition, no exemplar, no lifted
> numbers — a single tracked number rising at a tunable rate, wired through the
> full canonical shape so a novel composition starts green and consistent.

This file is the template for a real archetype's `IDENTITY.md`. It carries every
section `.claude/rules/archetype-authoring.md` § IDENTITY.md — required sections
requires, filled in for
the neutral base. When you build on `pnpm eject --clean`, rewrite each section for
your game; when you author a *new* archetype in the gallery, replace the placeholder
content with the real composition. Keep it a single screen — push worked balance
detail into `archetypes/BALANCING-<name>.md`.

## What this archetype is

Nothing yet, deliberately. `_blank` is hoisted by `pnpm eject --clean` for a novel
composition that no validated archetype fits — the honest base, so there is no
archetype content to gut. It ships one example mechanic (a number that rises) purely
to demonstrate the canonical wiring; the game's real identity is the fork's to write.

## Rate-function spine / bucket

**Bucket: linear accumulation** — `count(t) = ratePerSecond · t`. The trivial base
case, and the load-bearing section of any real `IDENTITY.md`: a forward archetype
writes its closed-form spine here (a geometric crossing, a saturating ceiling, a
log-frontier), grounded in a named `incremental-math/…/rate-functions/` bucket; a
subtractive clone names the bucket its lifted numbers fall into, retro-fit. If a fork
can't write its spine on paper, the mechanic is mis-specified, not just untuned.

## The loop — beat map

None. A real archetype lists where the run turns (setup → comfortable → pressure →
payout), with windows **measured and recorded** by the balance probes, never authored.

## Growth ports

None committed — a fork defines how the archetype grows *up* (which `add*` ports feed
which spine term). A clone instead records its canonical exemplar, arc scope, and the
substitutions it made, honestly, as a port ledger.

## Engine fit (pattern → primitive)

The blank base uses only the substrate: a `persistent()` number, a per-tick accrual,
and the `tunable()` perturbation path. A real archetype maps each pattern in its
identity line to an engine primitive here, with candidate-primitive receipts where it
hand-rolls a gap (`candidate-primitives.md`).

## Balance model

Math first, one-way flow, one home per number (see
`.claude/rules/archetype-authoring.md` § Balance — where each surface lands):

```
data/game.ts ─── Balance ───  →  balance/game-projection.ts  →  balance/game-probe.ts
spine, as prose + math           runnable projection             probe (real engine)
```

1. **Spine** — `data/game.ts` `// ─── Balance ───`: the closed form that justifies
   `ratePerSecond`.
2. **Projection** — `balance/game-projection.ts`: pure math, no engine; predicts
   `count(t)`.
3. **Probe** — `balance/game-probe.ts`: drives the shipping `game/core` module on the
   real engine and prints the drift against the projection. It reports; it does not
   assert.

`sim/` is the separate behavioral surface — `sim/example.test.ts` specs *what the
mechanic does* (count rises), with no magnitudes, which is why it survives a retune.

The behavioral counterpart (`sim/example.test.ts`) specs *what the mechanic does*; the
lock pins *how much*. Keep them separate.
