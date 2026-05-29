# Interlocker — domain language

Kittens Game first arc: a wide multi-resource graph with multi-input conversion chains and building-to-building synergy.

> Generated from code structure by `ol-domain-map` — do not edit by hand;
> regenerate with `pnpm domain-map`. The generated sections below re-derive
> from the source types every run, so they cannot drift. The curated
> disambiguators at the end are the only hand-authored part.

## Vocabulary

Enum / union membership is an is-a relation — each arm *is a* kind of its owner.

- **ResourceId** _(string-literal union)_ — `catnip` · `wood` · `minerals` · `iron` · `science` · `kittens` · `beam` · `slab` · `plate` · `scaffold` · `megalith`
- **BuildingId** _(string-literal union)_ — `field` · `pasture` · `hut` · `library` · `mine` · `quarry` · `smelter` · `workshop` · `barn` · `warehouse` · `lumberMill`
- **JobId** _(string-literal union)_ — `woodcutter` · `farmer` · `scholar` · `miner`
- **ScienceId** _(string-literal union)_ — `calendar` · `agriculture` · `mining` · `metal` · `construction` · `architecture`
- **CraftId** _(string-literal union)_ — `wood` · `beam` · `slab` · `plate` · `scaffold` · `megalith`

## Definitions

`BuildingSpec`, `CraftSpec`, `JobSpec`, `ResourceSpec`, `ScienceSpec`

## Relationships

Field-name reference edges — untyped IDs in named fields that point at
another domain noun. (These are name-encoded, not type-encoded, so
type-graph tools like dependency-cruiser/findReferences miss them.)

- **BuildingPrice** → `resource`
- **BuildingSpec** → `science`
- **JobSpec** → `resource`, `science`, `building`
- **CraftInput** → `resource`
- **CraftSpec** → `resource`, `science`
- **InterlockerData** → `resource`, `building`, `job`, `science`, `craft`
- **KittenDiedEvent** → `job`
- **BuildingPurchasedEvent** → `building`
- **JobCountChangedEvent** → `job`
- **ScienceCompletedEvent** → `science`
- **CraftedEvent** → `craft`, `resource`

## Disambiguators (curated)

Hand-authored. The module-level concepts no single type owns — the
relationships structure cannot derive. Kept small and co-located in the
config so staleness stays visible against the generated surface above.

- **the resource graph** — Resources flow through crafts (multi-input recipes), gated by sciences, produced/consumed by buildings staffed by jobs. Megalith is the canonical multi-input craft.
- **Spec, not Def** — Interlocker's domain definitions use the -Spec suffix (ResourceSpec, BuildingSpec, JobSpec, ScienceSpec, CraftSpec).
