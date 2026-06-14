# Defender — domain language

Bloons TD first arc: bloons walk a fixed path, towers auto-fire from a fixed roster, coverage composition under cost pressure.

> Generated from code structure by `ol-domain-map` — do not edit by hand;
> regenerate with `pnpm domain-map`. The generated sections below re-derive
> from the source types every run, so they cannot drift. The curated
> disambiguators at the end are the only hand-authored part.

## Vocabulary

Enum / union membership is an is-a relation — each arm *is a* kind of its owner.

- **TowerId** _(string-literal union)_ — `dart` · `tack` · `bomb` · `ice`
- **BloonId** _(string-literal union)_ — `red` · `blue` · `green` · `yellow`

## Definitions

`BloonDef`, `PathDef`, `TowerDef`, `WaveDef`, `WaveStreamSpec`

## Relationships

Field-name reference edges — untyped IDs in named fields that point at
another domain noun. (These are name-encoded, not type-encoded, so
type-graph tools like dependency-cruiser/findReferences miss them.)

- **WaveStreamSpec** → `bloon`
- **DefenderData** → `tower`, `bloon`, `wave`, `path`
- **BloonInstance** → `path`

## Disambiguators (curated)

Hand-authored. The module-level concepts no single type owns — the
relationships structure cannot derive. Kept small and co-located in the
config so staleness stays visible against the generated surface above.

- **wave vs wave-stream** — A WaveDef is a round; a WaveStreamSpec is the temporal spawn schedule of bloons within that round.
- **coverage, not adjacency** — Towers have area-of-effect but no neighbour-bonus structure — this is Threat-Range Coverage, NOT Placement-Adjacency.
