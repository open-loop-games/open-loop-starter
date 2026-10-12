# Balance — Blank (template)

This file is the template for a real archetype's `BALANCING.md`. It carries every
section `.claude/rules/archetype-authoring.md` § BALANCING.md — required sections
asks for, filled in for the neutral base. Rewrite each one for your game.

**Who it is for.** `IDENTITY.md` says what the archetype *is*; this says how you
work on its numbers. Write it for whoever inherits the game after `pnpm eject` —
at that point the showcase is gone and this doc is all that stands between the
spine declaration and a wall of constants. Present tense, no pass history: it is
an operating guide, not a ledger of what a session learned. A finding that proves
general enough to apply to *any* economy leaves for the project's
balance-methodology record; findings ripen in § Couplings and § Known thin until
then.

The blank economy is one number rising at a fixed rate, so every section below is
close to empty. That is the point — the shape is here, and a real economy fills
it in.

## The knobs

Every `tunable()` key, its default, and **what it moves**. The effect, not the
declaration — that is what a reader cannot get by opening `data/`. Name what is
deliberately *not* perturbable too, and why, so nobody re-litigates it.

| Key | Default | What it moves |
|---|---|---|
| `game/ratePerSecond` | `1` | How fast the tracked number climbs. The whole economy, for now. |

`automationMultiplier` (`2`, in `data/game.ts`) is deliberately **not** on the
perturbation surface. It is a content decision about what unlocking automation
is worth, and the ladder ships locked, so it moves nothing until a fork opens
it. Wrap it in `tunable()` at its reader site the moment you have a probe that
wants to sweep it.

## Couplings

What is *not* independent, and what breaks **silently** when changed. This is the
highest-value section in a real archetype: it is where a structural assumption
the code never states gets written down, and it is what saves the next person a
day.

**Unlocking the automation ladder makes the spine piecewise.** `data/game.ts`
§ Balance carries the linear closed form *and* the branch that opens when the
`assisted` tier unlocks. `balance/game-projection.ts` only implements the linear
one, because the ladder ships locked — the probe reads 0.00% drift for exactly
that reason. Open the gate without growing the projection and the probe starts
reporting drift that is real but unexplained, which is the worst way to discover
you changed the economy.

In a real economy this is where
you record things like "these two ladders share a growth constant, so retune the
ratios rather than the shared term", or "the harness can only read the arc
because there is no click channel; add one and the solver reports wrong answers
rather than failing".

## Running a pass

Which probe answers which question, what it prints, and how to read it. Point at
the probe headers rather than restating them. Run from the repo root:

```
pnpm exec vite-node src/game/balance/game-projection.ts
pnpm exec vite-node src/game/balance/game-probe.ts
```

- **`game-projection.ts`** — the spine in runnable form. Pure math, no engine.
  Predicts; it does not discover.
- **`game-probe.ts`** — drives the shipping module on the real engine and prints
  the drift against the projection. It reports; it does not assert. A probe that
  surfaces something unexpected has done its job.
- **`sim/example.test.ts`** — the behavioral suite: what the mechanic *does*,
  tick by tick, with no magnitudes. Add per-module specs beside their modules as
  the game grows.

**When prediction and truth disagree**, the first question is not "which constant
do I change" but *which layer is wrong* — the implementation drifted, the
constant needs a retune, the content needs reshaping, the predicate measures the
wrong moment, or the spine's shape was the wrong family. The engine guide's
§ When prediction and truth disagree walks the full list. The probe surfaces the
choice; a human makes the call.

## Known thin

Where the balance is unsatisfying and what the probes already say about it.
Honest limits, not apologies — a fork reading this deserves to know what has
never been measured before it trusts a number.

- **Nothing here is balanced, because there is nothing to balance.** One rate,
  linear accumulation, no pressure and no choice. Every real economy has entries
  in this section; a `BALANCING.md` with an empty § Known thin usually means the
  probes have not been run, not that the balance is perfect.
