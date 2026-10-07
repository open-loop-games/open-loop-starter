# Archetypes

Example games in the common subgenre expressions of incrementals. Each is a
composition of research patterns, and together they show how the engine is used
and what its surfaces do, while exercising the engine under real use. Each one is
self-bootable, forkable with `pnpm eject <name>`, built from the starter's
batteries, and carried by a rate-function spine that generates its balance.

Each archetype's `IDENTITY.md` is the single-screen answer to what it is: the
pattern-language identity line, the spine its economy lives on, the loop, and the
directions it grows through. Start there.

## The set

| Archetype  | Shape                                                                |
| ---------- | -------------------------------------------------------------------- |
| `ambient`  | Producer's composition at the slow end of its pacing                 |
| `cycler`   | Alternating build/defend phases on a hard-phase cycle                |
| `producer` | Geometric cost ladder under a compounding modifier stack             |
| `skirmish` | Adversarial real-time match with bilateral automation                |
| `survivor` | Run-scoped real-time survival against continuously escalating threat |
| `tug`      | Adversarial lane push with a shared contested lane                   |
| `_blank`   | Neutral skeleton — the starting point for a novel composition        |

`_identity.md` is the identity-line registry across the set. It carries more lines than
there are directories here — a line is a game shape the studio wants a story for: a
composition in research's pattern language with its exemplar set, a tier (core
incremental expression, or adjacent engine example) and a pattern-coverage grade saying how much
of it research patterns cover. A line exists independent of whether an archetype has
been built for it. Each line's explanation — player experience, the call on every
exemplar, lineage — is `_docs/<line>.md`.

## Where to look

- **What a line is, built or not** — `_docs/<line>.md`.
- **What an archetype is** — its `IDENTITY.md`.
- **What its domain language looks like** — its generated `domain-map.md`.
- **How its economy is checked** — its `balance/` (probes and projections) and `sim/`
  (behavioral suites).
- **How balance works in general** — `open-loop-engine/docs/consumer-guide-balance.md`.
