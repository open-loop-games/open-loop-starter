# Explorer — domain language

Zone as gameplay: a fogged map the huntsman uncovers one tile at a time, walking out on carried jerky and water and back to bank what he hunts and charts. Nothing resets; the reward is territory.

> Generated from code structure by `ol-domain-map` — do not edit by hand;
> regenerate with `pnpm domain-map`. The generated sections below re-derive
> from the source types every run, so they cannot drift. The curated
> disambiguators at the end are the only hand-authored part.

## Vocabulary

Enum / union membership is an is-a relation — each arm *is a* kind of its owner.

- **Currency** _(string-literal union)_ — `meat` · `hide` · `antler` · `wood` · `jerky`
- **GearId** _(string-literal union)_ — `waders` · `snowshoes` · `lantern` · `bow` · `frame` · `satchel` · `skin` · `hounds`
- **ProducerId** _(string-literal union)_ — `woodcutter` · `snare`
- **TrophyId** _(string-literal union)_ — `mattock` · `coracle` · `sledge`
- **Terrain** _(string-literal union)_ — `meadow` · `forest` · `marsh` · `snow` · `deepwood`
- **SpeciesId** _(string-literal union)_ — `hare` · `roe` · `boar` · `elk` · `wolf` · `ibex` · `bear` · `stag` · `aurochs` · `tusker` · `merewolf` · `whitebear` · `hart`
- **Feature** _(string-literal union)_ — `lodge` · `waystone` · `lookout` · `cache` · `lair` · `den`
- **Water** _(string-literal union)_ — `spring` · `river`

## Defs

`BeatPrediction`, `GearDef`, `ProducerDef`, `SpeciesDef`, `TerrainDef`, `TrophyDef`

## Relationships

Field-name reference edges: untyped ids in named fields that point at
another domain noun. These are name-encoded, not type-encoded, so
type-graph tools such as dependency-cruiser and findReferences miss them.

- **SpeciesDef** → `trophy`

## Thin spots

Defs with no structural signal (no vocabulary, no incident edge).
These are candidates for a curated note below — or for richer typing.

`GearDef`, `ProducerDef`, `BeatPrediction`, `TerrainDef`

## Disambiguators (curated)

Hand-authored: the game-level concepts no single type owns, which
structure cannot derive. Kept small and stored in the config, so
staleness stays visible against the generated sections above.

- **band** — A ring of terrain at a depth from the lodge: meadow, forest, fen, snowfield, deepwood. Each band past the forest needs a piece of terrain gear, and its quarry pays G× the band before.
- **tether** — The charted ground the huntsman can walk to and still get back from on what he carries: home on his jerky, and to water on his water. The chart fences it with the last light; a spring, a camp, a satchel or a skin moves it outward.
- **restock point** — The lodge or a camp: standing on one refills the satchel from the lodge store and banks the notes. The lodge banks the pack, and so does a camp once the sledge is taken.
- **notes** — The ground a trip has charted and not yet banked. Notes bank at the lodge or a camp; a fall loses them. Only banked ground counts toward Wayfinder.
- **water source** — Where the skin refills: the lodge well, a spring, the river, a tile beside a Fen mere, and a camp once the mattock is taken. Water in the Snowfield is frozen and refills nothing.
- **den** — One beast in the forest, the Fen and the Snowfield, an even fight for the next band's bow. It never regrows, and taking it pays a trophy that changes the ground from then on.
- **pack** — What the huntsman carries home: meat, hides and antler, under one total capacity. It banks only at the lodge (or any camp, once the sledge is taken), and a mauling or an empty satchel or skin loses it.
- **reference trip** — The spine's unit: walk to the middle of band k, hunt four times, walk back to where the haul banks, refilling water on the way. Every price is sized by what this trip earns per second.
- **Hart's trail** — The Pale Hart shows itself only after a stay of deepwood kills, so the last band is dwelt in, not walked through. Taking the Hart is the ending.
