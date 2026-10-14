# Archetypes

Example games in the common subgenre expressions of incrementals. Each is a
research composition, and together they show how the engine is used
and what its API surfaces do, while exercising the engine under real use. Each one is
self-bootable, forkable with `pnpm eject <name>`, built from the starter's
batteries, and carried by a rate-function spine that generates its balance.

Each archetype's `IDENTITY.md` is the single-screen answer to what it is: the
pattern-language identity line, the spine its economy lives on, the arc, and the
directions it grows through. Start there.

## The set

| Archetype  | Shape                                                                |
| ---------- | -------------------------------------------------------------------- |
| `cycler`   | Day and night on one rock: build against the forecast quarter, weather the storm, pegged so power adds reach, not nights |
| `defender` | Maze tower defence: commit the planting by day, watch the night resolve |
| `explorer` | A fogged map uncovered on jerky and water; what a trip finds banks only at home |
| `looper`   | Authored plan run against a draining budget; mastery survives the reset |
| `phase-shifter` | One-way doors: a reader, then an arranger, then a planner, each retiring the last |
| `producer` | Geometric cost ladder under a compounding multiplier stack           |
| `scaler`   | Three prestige layers over a hero ladder, each compressing the one below and opening its own chain |
| `scripter` | A scroll the player writes and a student performs; each challenger at the gate asks for words the scroll lacks |
| `skirmish` | Adversarial real-time match with bilateral automation                |
| `survivor` | Run-scoped real-time survival against continuously escalating threat |
| `tug`      | Adversarial lane push with a shared contested lane                   |
| `_blank`   | Neutral skeleton — the starting point for a novel research composition |

`_identity.md` is the identity-line registry across the set. It carries more lines than
there are directories here — a line is a game shape the studio wants a story for: a
research composition with its exemplar set, a tier (core
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
