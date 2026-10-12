# Explorer — domain language

Zone as gameplay: a fogged map the huntsman uncovers one tile at a time, walking out on carried jerky and back to bank what he hunts. Nothing resets; the reward is territory.

> Generated from code structure by `ol-domain-map` — do not edit by hand;
> regenerate with `pnpm domain-map`. The generated sections below re-derive
> from the source types every run, so they cannot drift. The curated
> disambiguators at the end are the only hand-authored part.

## Vocabulary

Enum / union membership is an is-a relation — each arm *is a* kind of its owner.

- **Currency** _(string-literal union)_ — `meat` · `hide` · `antler` · `wood` · `jerky`
- **GearId** _(string-literal union)_ — `waders` · `snowshoes` · `lantern` · `bow` · `frame` · `satchel` · `hounds`
- **ProducerId** _(string-literal union)_ — `woodcutter` · `snare`
- **Terrain** _(string-literal union)_ — `meadow` · `forest` · `marsh` · `snow` · `deepwood`
- **SpeciesId** _(string-literal union)_ — `hare` · `roe` · `boar` · `elk` · `wolf` · `ibex` · `bear` · `stag` · `aurochs` · `hart`
- **Feature** _(string-literal union)_ — `lodge` · `waystone` · `lookout` · `cache` · `lair`

## Defs

`BeatPrediction`, `GearDef`, `ProducerDef`, `SpeciesDef`, `TerrainDef`

## Relationships

_(no field-name reference edges mined)_

## Thin spots

Defs with no structural signal (no vocabulary, no incident edge).
These are candidates for a curated note below — or for richer typing.

`GearDef`, `ProducerDef`, `BeatPrediction`, `TerrainDef`, `SpeciesDef`

## Disambiguators (curated)

Hand-authored: the game-level concepts no single type owns, which
structure cannot derive. Kept small and stored in the config, so
staleness stays visible against the generated sections above.

- **band** — A ring of terrain at a depth from the lodge: meadow, forest, fen, snowfield, deepwood. Each band past the forest needs a piece of terrain gear, and its quarry pays G× the band before.
- **tether** — The charted ground the huntsman can walk to and still get home from on the jerky he carries. The chart fences it with the last light; a camp or a satchel moves it outward.
- **restock point** — The lodge or a camp: standing on one refills the satchel from the lodge store. Only the lodge banks the pack.
- **pack** — What the huntsman carries home: meat, hides and antler, under one total capacity. It banks only at the lodge, and a mauling or an empty satchel loses it.
- **reference trip** — The spine's unit: walk from the lodge to the middle of band k, hunt four times, walk home and bank. Every price is sized by what this trip earns per second.
- **Hart's trail** — The Pale Hart shows itself only after a stay of deepwood kills, so the last band is dwelt in, not walked through. Taking the Hart is the ending.
