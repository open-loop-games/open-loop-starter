# Archetypes

Worked examples of validated game shapes, composed from the starter's batteries. Each one
is self-bootable, forkable with `pnpm eject <name>`, and is a composition in research's
pattern language carried by a rate-function spine that generates its balance.

Each archetype's `IDENTITY.md` is the single-screen answer to what it is: the
pattern-language identity line, the spine its economy lives on, the loop, and the
directions it grows through. Start there.

## The set

| Archetype  | Shape                                                                |
| ---------- | -------------------------------------------------------------------- |
| `ambient`  | Idle production with auto-producers and ambient progression          |
| `cycler`   | Alternating build/defend phases on a hard-phase cycle                |
| `skirmish` | Adversarial real-time match with bilateral automation                |
| `survivor` | Run-scoped real-time survival against continuously escalating threat |
| `tug`      | Adversarial lane push with a shared contested lane                   |
| `_blank`   | Neutral skeleton — the starting point for a novel composition        |

`_identity.md` is the identity-line registry across the set. It carries more lines than
there are directories here — an identity line is a composition the pattern language
validates, independent of whether an archetype has been built for it.

## Where to look

- **What an archetype is** — its `IDENTITY.md`.
- **What its domain language looks like** — its generated `domain-map.md`.
- **How its economy is checked** — its `balance/` (probes and projections) and `sim/`
  (behavioral suites).
- **How balance works in general** — `open-loop-engine/docs/consumer-guide-balance.md`.
