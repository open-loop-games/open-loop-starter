# Interlocker — domain language

A wide production graph: raw buildings feed four workshops that turn stock into spars, aluminium, engines and aeroplanes, opened by patents, staffed by a fixed headcount of compagnons, fed with bread by the season, powered by steam and capped by bins. An Exposition turns what the works hold and what the Ministry has bought into a medal of renown, and clears the works.

> Generated from code structure by `ol-domain-map` — do not edit by hand;
> regenerate with `pnpm domain-map`. The generated sections below re-derive
> from the source types every run, so they cannot drift. The curated
> disambiguators at the end are the only hand-authored part.

## Vocabulary

Enum / union membership is an is-a relation — each arm *is a* kind of its owner.

- **ResourceId** _(string-literal union)_ — `bread` · `spruce` · `bauxite` · `coal` · `aluminium` · `spars` · `engines` · `aeroplanes`
- **RoleId** _(string-literal union)_ — `sawyer` · `smelter` · `machinist` · `rigger`
- **Season** _(string-literal union)_ — `spring` · `summer` · `autumn` · `winter`
- **CharterId** _(string-literal union)_ — `patronage` · `patents` · `credit` · `ecole`
- **BureauId** _(string-literal union)_ — `seating` · `estate` · `academie`
- **BuildingId** _(string-literal union)_ — `yard` · `farm` · `mine` · `pit` · `warehouse` · `cite` · `boiler`
- **ResearchId** _(string-literal union)_ — `sawpit` · `concession` · `cites` · `bonded` · `hall` · `coking` · `steam` · `rolling` · `monoplane`
- **SteamDraw** _(string-literal union)_ — `machinist` · `rigger` · `mill`

## Defs

`BuildPlan`, `BuildingDef`, `BureauDef`, `CharterDef`, `MedalDef`, `ResearchDef`, `ResourceDef`, `RoleDef`, `RunPrediction`

## Relationships

Field-name reference edges: untyped ids in named fields that point at
another domain noun. These are name-encoded, not type-encoded, so
type-graph tools such as dependency-cruiser and findReferences miss them.

- **Empire** → `charter`

## Thin spots

Defs with no structural signal (no vocabulary, no incident edge).
These are candidates for a curated note below — or for richer typing.

`BuildPlan`, `RunPrediction`, `ResourceDef`, `BuildingDef`, `ResearchDef`, `RoleDef`, `BureauDef`, `MedalDef`

## Disambiguators (curated)

Hand-authored: the game-level concepts no single type owns, which
structure cannot derive. Kept small and stored in the config, so
staleness stays visible against the generated sections above.

- **raw-equivalent** — The economy's unit of value: one raw building's second of output. A worked good is worth the raw units its recipe walks down to, steam at the coal it burns (spar 2, aluminium 3, engine 12, aeroplane 27.5); prices, bins, orders and the jury's score are sized in it.
- **trade** — One of the four workshops a compagnon can be seated at: sawyer, smelter, machinist, rigger. A trade opens with its patent and runs at its role rate per compagnon seated.
- **bin** — A stock's storage capacity. Overflow is lost; bonded warehouses and the Crédit Mobilier widen every bin. The hangar is the aeroplanes' bin, and the Exposition's throttle.
- **limit** — What held a workshop back on the last tick: locked, unstaffed, labour (crew-bound), an input it is short of, steam, storage (its output bin is full) or hunger. The Works schematic paints it.
- **Exposition** — The prestige: once the jury sits, staging it turns the score into a medal of renown and clears the works. It needs the threshold of aeroplanes in the hangar. A run is the time between two Expositions.
- **charter** — An imperial grant bought with renown, kept across every Exposition. The Patent Pool keeps the four founding patents through the reset.
- **medal** — The renown an Exposition pays: floor(2·√(score / SCORE_UNIT)), so each step costs more score than the last. The score is the raw-equivalent of the worked goods held, plus the dossier. The Grand Prix is the medal that ends the story.
- **order** — A Ministry of War order: one to three worked goods, all orders worth the same, filled in consignments before it lapses. A completed order goes into the dossier, which the jury scores and no bin caps.
- **season** — A quarter of the works' year on the play clock, one bin's fill long. The gardens yield by the season and its weather; winter is what the larder must carry.
- **steam** — What Boiler Houses raise from coal for the engine shop, the rigging hall and the rolling mill. When it falls short, the shed order says which draw goes without.
- **bureau** — One of the foreman's three offices, bought with renown once every charter is held. Each unlocks an automation tier: seating, the estate or the Académie.
