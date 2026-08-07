# Archetype balance logs

Per-archetype balance logs. The archetype *code*, its identity docs, and the identity
registry live under `src/showcase/archetypes/`.

- **`BALANCING-<name>.md`** — per-archetype balance log: what was *learned* across balance
  passes (instrument-earning moments, engine-surface gaps, drift signals). Not chosen
  values — those live at `tunable()` sites with their receipt.
- **Balance methodology** → `open-loop-engine/docs/consumer-guide-balance.md` — the spine,
  the probe, the loop between them, and the engine surfaces behind each. Read it before a
  balance pass.
- **Archetype authoring** → `.claude/rules/archetype-authoring.md` — the spine and its
  coverage boundary, directory shape, `IDENTITY.md` requirements, canonical `balance/`
  filenames, landing discipline.
