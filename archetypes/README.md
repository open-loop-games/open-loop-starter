# Archetypes — balance kit + methodology index

This directory is the archetype **balance kit**: the master methodology, the
per-archetype balance logs, and the identity registry. The archetype *code* lives under
`src/showcase/archetypes/<name>/`.

- **Port/build methodology** → `src/showcase/archetypes/README.md` — canonical template:
  directory shape, the two number-sourcing methods, `IDENTITY.md` requirements, the
  three-lane balance pipeline, canonical `balance/` filenames, landing discipline. Read it
  before starting or extending an archetype.
- **`BALANCING.md`** — master balance methodology: seven methodology buckets,
  engine-as-oracle, where constants live, the lock discipline.
- **`BALANCING-<name>.md`** — per-archetype balance log: what was *learned* across balance
  passes (instrument-earning moments, engine-surface gaps, drift signals). Not chosen
  values (those live at `tunable()` sites), not beat windows (those live in `sim/` locks).
- **`_identity.md`** — one-line identity registry + player-experience notes for every
  archetype (built or not yet).
