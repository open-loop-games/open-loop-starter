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
| `cycler`   | Day and night on one rock: build against the forecast gale, weather the storm, and close the career by holding the light through a final gale |
| `defender` | Maze tower defence: commit the planting by day, watch the night resolve |
| `explorer` | A fogged map uncovered on jerky and water; what a trip finds banks only at home |
| `interlocker` | A production graph drawn as a cyanotype: workshops, patents, a seated crew, steam, seasons and bins, with Ministry orders, a medal-paying Exposition and an ending |
| `looper`   | Authored plan run against a draining budget; mastery survives the reset |
| `packer`   | Three ships' hull lattices plated out section by section, each module's firepower from what sits beside it, against carriers whose conditions rewrite the board |
| `phase-shifter` | One-way doors: a reader, then an arranger, then a planner, each retiring the last |
| `producer` | Geometric cost ladder under a compounding multiplier stack           |
| `scaler`   | Three prestige layers over a hero ladder, each compressing the one below and opening its own chain |
| `scripter` | A scroll the player writes and a student performs; each challenger at the gate asks for words the scroll lacks |
| `skirmish` | Hustlers and ley taps feed training floors; squads ordered district by district take the sprawl, and an assault from a held one burns the rival's safehouse |
| `survivor` | Takes on a crowded soundstage that end on a lead to fell; rigs fire themselves, ratings stage harsher takes, and R's lead wraps the picture |
| `tug`      | Waves on alternating horns contest one causeway; a career marches across fifteen fields |
| `_blank`   | Neutral skeleton — the starting point for a novel research composition |

Each archetype is in one or more genres. The genre documents, with the games in each
genre, are in the studio's research library, under research's handles. This table maps
each archetype to its genres.

| Archetype | Genres |
| --- | --- |
| `cycler` | `build-and-defend`, `roguelike` |
| `defender` | `tower-defense` |
| `explorer` | `incremental` |
| `interlocker` | `civ-builder` |
| `looper` | `loops` |
| `packer` | `backpack-battler`, `incremental` |
| `phase-shifter` | `incremental` |
| `producer` | `incremental` |
| `scaler` | `layered-incremental` |
| `scripter` | `programming-game`, `incremental` |
| `skirmish` | `rts` |
| `survivor` | `survivors-like` |
| `tug` | lane push, which has no genre document |

## Where to look

- **What a genre is, and which games are in it** — its genre document, in the studio's
  research library.
- **What an archetype is** — its `IDENTITY.md`.
- **What its domain language looks like** — its generated `domain-map.md`.
- **How its economy is checked** — its `balance/` (probes and projections) and `sim/`
  (behavioral suites).
- **How balance works in general** — `open-loop-engine/docs/consumer-guide-balance.md`.
