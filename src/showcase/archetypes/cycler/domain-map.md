# Cycler — domain language

Skerry Light: a keeper on a bare rock builds by day against the quarter tonight’s gale is forecast to come from; the storm grows each night until the tower falls, and the logbook buys knowledge that outlasts the watch.

> Generated from code structure by `ol-domain-map` — do not edit by hand;
> regenerate with `pnpm domain-map`. The generated sections below re-derive
> from the source types every run, so they cannot drift. The curated
> disambiguators at the end are the only hand-authored part.

## Vocabulary

Enum / union membership is an is-a relation — each arm *is a* kind of its owner.

- **PostingId** _(string-literal union)_ — `haven` · `skerry` · `wrath`
- **KnowledgeId** _(string-literal union)_ — `stone` · `tides` · `almanac` · `stores` · `charter-skerry` · `charter-wrath`
- **PieceKind** _(string-literal union)_ — `breakwater` · `net` · `buttress` · `winch`
- **Ground** _(string-literal union)_ — `shore` · `yard`
- **Quarter** _(string-literal union)_ — `N` · `E` · `S` · `W`
- **FindId** _(string-literal union)_ — `timbers` · `oakum` · `brass` · `cork` · `glass`
- **PricedPiece** _(string-literal union)_ — `breakwater` · `net` · `buttress` · `winch`

## Defs

`FindDef`, `KnowledgeDef`, `PieceDef`, `PostingDef`

## Relationships

_(no field-name reference edges mined)_

## Thin spots

Defs with no structural signal (no vocabulary, no incident edge).
These are candidates for a curated note below — or for richer typing.

`PostingDef`, `KnowledgeDef`, `PieceDef`, `FindDef`

## Disambiguators (curated)

Hand-authored: the game-level concepts no single type owns, which
structure cannot derive. Kept small and stored in the config, so
staleness stays visible against the generated sections above.

- **watch** — One run: from taking a posting to the light going out. The watch module’s whole context resets at its end.
- **day** — The calm phase: nets fill, and the keeper hauls, builds, takes pieces up, mends and takes a find.
- **night** — The pressure phase: the storm’s breakers land on the forecast quarter. Shoring up is the only verb.
- **quarter** — The side of the rock tonight’s gale comes from: north, east, south or west. Forecast at dawn.
- **ward** — Force a side turns aside per night: the sum of its five shore cells’ breakwaters, braced and buttressed.
- **storm** — Tonight’s total force, W₀·g^(night−1). Pegged at the watch’s start to the saturated ward of permanent power.
- **tideline** — The nets’ held catch: each net holds its own until hauled, and spills when full.
- **find** — What the tide leaves at dawn: three are offered, one is taken, the rest wash out at dusk.
- **posting** — The rock a watch is kept on, chosen between watches: storm growth, wind and wrack.
- **logbook entry** — The meta currency: a cube root of force weathered plus a cube root of salvage gathered, paid when the light goes out.
