# Interlocker — domain language

A wide production graph: raw buildings feed four workshops that turn stock into spars, aluminium, engines and aeroplanes, opened by patents, staffed by a fixed headcount of compagnons, fed with bread and capped by bins. An Exposition turns the hangar into renown and clears the works.

> Generated from code structure by `ol-domain-map` — do not edit by hand;
> regenerate with `pnpm domain-map`. The generated sections below re-derive
> from the source types every run, so they cannot drift. The curated
> disambiguators at the end are the only hand-authored part.

## Vocabulary

Enum / union membership is an is-a relation — each arm *is a* kind of its owner.

- **ResourceId** _(string-literal union)_ — `bread` · `spruce` · `bauxite` · `coal` · `aluminium` · `spars` · `engines` · `aeroplanes`
- **RoleId** _(string-literal union)_ — `sawyer` · `smelter` · `machinist` · `rigger`
- **CharterId** _(string-literal union)_ — `patronage` · `patents` · `credit` · `ecole`
- **BuildingId** _(string-literal union)_ — `yard` · `farm` · `mine` · `pit` · `warehouse` · `cite`
- **ResearchId** _(string-literal union)_ — `sawpit` · `concession` · `cites` · `bonded` · `hall` · `coking` · `steam` · `rolling` · `monoplane`

## Defs

`BuildPlan`, `BuildingDef`, `CharterDef`, `ResearchDef`, `ResourceDef`, `RoleDef`, `RunPrediction`

## Relationships

Field-name reference edges: untyped ids in named fields that point at
another domain noun. These are name-encoded, not type-encoded, so
type-graph tools such as dependency-cruiser and findReferences miss them.

- **Empire** → `charter`

## Thin spots

Defs with no structural signal (no vocabulary, no incident edge).
These are candidates for a curated note below — or for richer typing.

`BuildPlan`, `RunPrediction`, `ResourceDef`, `BuildingDef`, `ResearchDef`, `RoleDef`

## Disambiguators (curated)

Hand-authored: the game-level concepts no single type owns, which
structure cannot derive. Kept small and stored in the config, so
staleness stays visible against the generated sections above.

- **raw-equivalent** — The economy's unit of value: one raw building's second of output. A worked good is worth the raw units its recipe walks down to (spar 2, aluminium 3, engine 11, aeroplane 25); prices and bins are sized in it.
- **trade** — One of the four workshops a compagnon can be seated at: sawyer, smelter, machinist, rigger. A trade opens with its patent and runs at its role rate per compagnon seated.
- **bin** — A stock's storage capacity. Overflow is lost; bonded warehouses and the Crédit Mobilier widen every bin. The hangar is the aeroplanes' bin, and the Exposition's throttle.
- **limit** — What held a workshop back on the last tick: locked, unstaffed, labour (crew-bound), an input it is short of, storage (its output bin is full) or hunger. The Works schematic paints it.
- **Exposition** — The prestige: staging it turns the aeroplanes in the hangar into renown and clears the works. A run is the time between two Expositions.
- **charter** — An imperial grant bought with renown, kept across every Exposition. The Patent Pool keeps the four founding patents through the reset.
