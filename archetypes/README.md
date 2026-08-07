# Archetypes — balance logs + identity registry

This directory holds the per-archetype balance logs and the identity registry. The
archetype *code* lives under `src/showcase/archetypes/<name>/`.

- **Balance methodology** → `open-loop-engine/docs/consumer-guide-balance.md` — the spine,
  the probe, the loop between them, and the engine surfaces behind each. Ecosystem-wide,
  not starter-specific. Read it before a balance pass.
- **Port/build methodology** → `src/showcase/archetypes/README.md` — canonical template:
  directory shape, how an archetype sources its numbers, `IDENTITY.md` requirements, which
  balance surface lands in which directory, canonical filenames, landing discipline. Read
  it before starting or extending an archetype.
- **`BALANCING-<name>.md`** — per-archetype balance log: what was *learned* across balance
  passes (instrument-earning moments, engine-surface gaps, drift signals). Not chosen
  values — those live at `tunable()` sites with their receipt.
- **`_identity.md`** — one-line identity registry + player-experience notes for every
  archetype (built or not yet).
